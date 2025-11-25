import * as THREE from 'three';
import { InputManager } from '../../utils/InputManager';
import { CombatSystem, AMMO_CONFIG } from './CombatSystem';

/**
 * Ammo Pickup System - Spawns and manages shotgun shell pickups
 *
 * Design:
 * - Shells spawn in predetermined locations (cabin + forest)
 * - Each pickup gives 2-4 shells
 * - Press E to pick up when nearby
 * - Pickups respawn after X minutes (optional)
 */

export interface AmmoPickup {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  isActive: boolean;
  shellCount: number;
  respawnTime?: number; // Optional: respawn after this many seconds
}

export class AmmoPickupSystem {
  private pickups: Map<string, AmmoPickup> = new Map();
  private interactionRadius: number = 2.0; // Can pick up within 2m
  private promptElement: HTMLElement | null = null;

  // Predefined spawn locations (cabin interior + forest)
  private static SPAWN_LOCATIONS: THREE.Vector3[] = [
    // CABIN INTERIOR (5 locations)
    new THREE.Vector3(-2.5, 0.8, -2.0),  // Near fireplace
    new THREE.Vector3(1.5, 0.8, 1.5),    // Bedroom corner
    new THREE.Vector3(-1.0, 0.8, 2.0),   // Near front door
    new THREE.Vector3(2.0, 0.8, -1.5),   // Kitchen area
    new THREE.Vector3(0.5, 0.8, -2.5),   // Back corner

    // FOREST (5 locations - risky to get!)
    new THREE.Vector3(8.0, 0.2, 8.0),    // Near tree cluster
    new THREE.Vector3(-10.0, 0.2, 6.0),  // Far left
    new THREE.Vector3(12.0, 0.2, -5.0),  // Far right
    new THREE.Vector3(-6.0, 0.2, -8.0),  // Behind cabin
    new THREE.Vector3(0.0, 0.2, 15.0),   // Path forward
  ];

  constructor(
    private scene: THREE.Scene,
    private inputManager: InputManager,
    private combatSystem: CombatSystem
  ) {
    this.promptElement = document.getElementById('interaction-prompt');
    this.spawnInitialPickups();
  }

  /**
   * Spawn initial ammo pickups at predefined locations
   */
  private spawnInitialPickups(): void {
    AmmoPickupSystem.SPAWN_LOCATIONS.forEach((position, index) => {
      const shellCount = THREE.MathUtils.randInt(
        AMMO_CONFIG.shotgun.pickupMin,
        AMMO_CONFIG.shotgun.pickupMax
      );

      this.createPickup(
        `ammo_${index}`,
        position.clone(),
        shellCount
      );
    });

    console.log(`📦 Spawned ${this.pickups.size} ammo pickups`);
  }

  /**
   * Create a single ammo pickup
   */
  private createPickup(id: string, position: THREE.Vector3, shellCount: number): void {
    // Create mesh (simple box for now, can be replaced with model)
    const geometry = new THREE.BoxGeometry(0.15, 0.1, 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4400,      // Bright orange/red
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff2200,   // Glow slightly
      emissiveIntensity: 0.5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add glow effect (point light)
    const light = new THREE.PointLight(0xff4400, 0.5, 3.0);
    light.position.copy(position);
    this.scene.add(light);
    mesh.userData.light = light;

    // Add to scene
    this.scene.add(mesh);

    // Store pickup data
    const pickup: AmmoPickup = {
      id,
      position: position.clone(),
      mesh,
      isActive: true,
      shellCount
    };

    this.pickups.set(id, pickup);
  }

  /**
   * Update - check for player nearby and handle pickup
   */
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    let nearestPickup: AmmoPickup | null = null;
    let nearestDistance = Infinity;

    // Find nearest active pickup
    for (const pickup of this.pickups.values()) {
      if (!pickup.isActive) continue;

      const distance = playerPosition.distanceTo(pickup.position);
      if (distance < this.interactionRadius && distance < nearestDistance) {
        nearestPickup = pickup;
        nearestDistance = distance;
      }
    }

    // Show prompt if near pickup
    if (nearestPickup && this.promptElement) {
      this.promptElement.textContent = `Pick Up Ammo (${nearestPickup.shellCount} shells) [E]`;
      this.promptElement.style.display = 'block';

      // Check for pickup input
      if (this.inputManager.consumeInteractPress()) {
        this.pickupAmmo(nearestPickup);
      }
    } else if (this.promptElement) {
      // Hide prompt
      this.promptElement.style.display = 'none';
    }

    // Animate pickups (bob up/down)
    for (const pickup of this.pickups.values()) {
      if (!pickup.isActive) continue;

      const time = Date.now() / 1000;
      pickup.mesh.position.y = pickup.position.y + Math.sin(time * 2) * 0.05;
      pickup.mesh.rotation.y += deltaTime * 0.5; // Rotate slowly
    }
  }

  /**
   * Player picks up ammo
   */
  private pickupAmmo(pickup: AmmoPickup): void {
    // Try to add ammo to player
    const success = this.combatSystem.addAmmo(pickup.shellCount);

    if (success) {
      console.log(`📦 Picked up ${pickup.shellCount} shells from ${pickup.id}`);

      // Deactivate pickup
      pickup.isActive = false;
      pickup.mesh.visible = false;

      // Remove glow light
      if (pickup.mesh.userData.light) {
        this.scene.remove(pickup.mesh.userData.light);
      }

      // Optional: Respawn after 5 minutes
      // setTimeout(() => this.respawnPickup(pickup.id), 300000);
    } else {
      console.log('📦 Ammo full! Cannot pick up.');
    }
  }

  /**
   * Respawn a pickup (optional feature)
   */
  private respawnPickup(id: string): void {
    const pickup = this.pickups.get(id);
    if (!pickup) return;

    pickup.isActive = true;
    pickup.mesh.visible = true;

    // Restore glow light
    const light = new THREE.PointLight(0xff4400, 0.5, 3.0);
    light.position.copy(pickup.position);
    this.scene.add(light);
    pickup.mesh.userData.light = light;

    console.log(`📦 Ammo pickup ${id} respawned`);
  }

  /**
   * Add a custom pickup location (for dynamic spawning)
   */
  public addPickup(position: THREE.Vector3, shellCount?: number): string {
    const id = `ammo_custom_${Date.now()}`;
    const count = shellCount || THREE.MathUtils.randInt(
      AMMO_CONFIG.shotgun.pickupMin,
      AMMO_CONFIG.shotgun.pickupMax
    );

    this.createPickup(id, position, count);
    return id;
  }

  /**
   * Remove all pickups (cleanup)
   */
  public dispose(): void {
    for (const pickup of this.pickups.values()) {
      this.scene.remove(pickup.mesh);
      pickup.mesh.geometry.dispose();
      (pickup.mesh.material as THREE.Material).dispose();

      if (pickup.mesh.userData.light) {
        this.scene.remove(pickup.mesh.userData.light);
      }
    }

    this.pickups.clear();
  }
}
