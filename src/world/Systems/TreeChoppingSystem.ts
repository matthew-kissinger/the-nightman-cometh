import * as THREE from 'three';
import { InputManager } from '../../utils/InputManager';
import { WeaponManager } from '../WeaponManager';
import { interactionPrompt } from '../../ui/InteractionPrompt';
import { CollisionWorld } from '../CollisionWorld';

/**
 * TreeChoppingSystem - Handles chopping trees with hatchet
 *
 * Features:
 * - Raycast detection for trees in range
 * - Tree health/damage system
 * - Wood drops when tree breaks
 * - Swing animation trigger
 */

export interface ChoppableTree {
  id: string;
  mesh: THREE.Mesh | THREE.InstancedMesh;
  meshes?: THREE.InstancedMesh[];
  instanceId?: number; // For InstancedMesh
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  collider?: any; // Rapier collider reference
  colliderId?: number; // CollisionWorld id
}

export interface WoodDrop {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  amount: number; // How many wood pieces
  angularSpeed: number;
  bobPhase: number;
}

export class TreeChoppingSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private inputManager: InputManager;
  private weaponManager: WeaponManager;
  private collisionWorld: CollisionWorld | null;

  // Tree tracking
  private choppableTrees: Map<string, ChoppableTree> = new Map();
  private woodDrops: WoodDrop[] = [];
  private removedInstances: Array<{ meshes: THREE.InstancedMesh[]; index: number; key: string }> = [];
  private removedInstanceKeys: Set<string> = new Set();

  // Raycast
  private raycaster: THREE.Raycaster;
  private maxChopDistance = 4.0; // Slightly more forgiving reach

  // Swing cooldown
  private swingCooldown = 0;
  private swingCooldownTime = 0.8; // 0.8 seconds between swings

  // Audio (TODO: integrate with AudioManager)
  private chopSoundCooldown = 0;

  // UI prompt
  private promptElement: HTMLElement | null = null;
  private targetTree: ChoppableTree | null = null;
  private lastTargetId: string | null = null;
  private targetFocusTime = 0;

  // Audio callback (will be set by SceneManager)
  public onPlaySound?: (soundKey: string, position?: THREE.Vector3) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    inputManager: InputManager,
    weaponManager: WeaponManager,
    collisionWorld?: CollisionWorld | null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;
    this.weaponManager = weaponManager;
    this.collisionWorld = collisionWorld ?? null;
    this.raycaster = new THREE.Raycaster();

    this.promptElement = document.getElementById('interaction-prompt');
    interactionPrompt.attach(this.promptElement);
  }

  /**
   * Register a tree as choppable
   */
  public registerTree(
    mesh: THREE.Mesh | THREE.InstancedMesh | null,
    position: THREE.Vector3,
    instanceId?: number,
    meshes?: THREE.InstancedMesh[],
    colliderId?: number
  ): void {
    // Use position-based ID if mesh is null
    const id = mesh && instanceId !== undefined
      ? `${mesh.uuid}_${instanceId}`
      : mesh
      ? mesh.uuid
      : `tree_${position.x.toFixed(2)}_${position.z.toFixed(2)}`;

    this.choppableTrees.set(id, {
      id,
      mesh: mesh as any, // Will be null for position-based trees
      meshes,
      instanceId,
      position: position.clone(),
      health: 100,
      maxHealth: 100,
      collider: null,
      colliderId
    });
  }

  /**
   * Update system - check for chop input, raycast detection, etc.
   */
  public update(deltaTime: number): void {
    // Re-apply hidden transforms for removed instances so wind sway doesn't resurrect them
    if (this.removedInstances.length > 0) {
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      this.removedInstances.forEach(entry => {
        entry.meshes.forEach(mesh => {
          if (entry.index < mesh.count) {
            mesh.setMatrixAt(entry.index, zero);
            mesh.instanceMatrix.needsUpdate = true;
          }
        });
      });
    }

    // Update cooldowns
    this.swingCooldown = Math.max(0, this.swingCooldown - deltaTime);
    this.chopSoundCooldown = Math.max(0, this.chopSoundCooldown - deltaTime);

    const currentWeapon = this.weaponManager.getCurrentWeapon();
    const hasHatchetEquipped = currentWeapon === 'hatchet';

    // Raycast from camera to find tree in crosshair
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const cameraPos = this.camera.position;

    // Find closest tree in range
    let closestTree: ChoppableTree | null = null;
    let closestDistance = Infinity;

    for (const tree of this.choppableTrees.values()) {
      const distance = cameraPos.distanceTo(tree.position);

      if (distance <= this.maxChopDistance && distance < closestDistance) {
        // Check if looking at the tree (simple angle check)
        const direction = new THREE.Vector3().subVectors(tree.position, cameraPos).normalize();
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        const angle = direction.dot(cameraDirection);
        if (angle > 0.55) { // Within ~56 degree cone
          closestTree = tree;
          closestDistance = distance;
        }
      }
    }

    // Track target focus to ignore stale clicks when switching targets
    if (!closestTree) {
      this.targetTree = null;
      this.lastTargetId = null;
      this.targetFocusTime = 0;
    } else {
      if (closestTree.id !== this.lastTargetId) {
        this.lastTargetId = closestTree.id;
        this.targetFocusTime = 0;
        // Clear any stale click from before we looked at this tree
        this.inputManager.consumeRightClick();
      } else {
        this.targetFocusTime += deltaTime;
      }
      this.targetTree = closestTree;
    }

    // Show prompt if tree in range
    if (closestTree) {
      const promptText = hasHatchetEquipped
        ? `🪓 Chop Tree (${Math.round(closestTree.health)}% HP) - Right Click`
        : 'Equip hatchet (press 2) to chop tree';
      this.showPrompt(promptText);

      // Check for swing input (right mouse button - left click is for shotgun)
      const canSwing = this.targetFocusTime > 0.12; // brief debounce after acquiring target
      if (hasHatchetEquipped && canSwing && this.inputManager.consumeRightClick() && this.swingCooldown <= 0) {
        this.chopTree(closestTree);
      }
    } else {
      this.clearPrompt();
    }

    this.updateWoodDrops(deltaTime);
  }

  /**
   * Chop the tree - deal damage
   */
  private chopTree(tree: ChoppableTree): void {
    const damage = 20; // 20 damage per swing (5 swings to fell a tree)
    tree.health -= damage;

    this.swingCooldown = this.swingCooldownTime;
    this.weaponManager.triggerHatchetSwing();

    console.log(`🪓 Chopped tree! HP: ${tree.health}/${tree.maxHealth}`);

    // Play chop sound
    if (this.onPlaySound) {
      this.onPlaySound('hatchet_swing', tree.position);
    }

    // TODO: Particle effects (wood chips)

    // Tree is destroyed
    if (tree.health <= 0) {
      this.destroyTree(tree);
    }
  }

  /**
   * Destroy tree and spawn wood drops
   */
  private destroyTree(tree: ChoppableTree): void {
    console.log('🌲 Tree destroyed! Spawning wood drops...');

    // Remove tree from scene
    if (tree.mesh instanceof THREE.InstancedMesh && tree.instanceId !== undefined) {
      const meshesToHide = tree.meshes && tree.meshes.length > 0 ? tree.meshes : [tree.mesh];
      const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);

      meshesToHide.forEach(mesh => {
        mesh.setMatrixAt(tree.instanceId!, zeroScale);
        mesh.instanceMatrix.needsUpdate = true;
      });

      // Track removal so we keep them hidden even after wind updates
      const key = `${tree.mesh.uuid}_${tree.instanceId}`;
      if (!this.removedInstanceKeys.has(key)) {
        this.removedInstanceKeys.add(key);
        this.removedInstances.push({ meshes: meshesToHide, index: tree.instanceId!, key });
      }
    } else if (tree.mesh instanceof THREE.Mesh) {
      this.scene.remove(tree.mesh);
    }

    // Spawn 3 wood pieces around the tree base
    const woodCount = 3;
    for (let i = 0; i < woodCount; i++) {
      const angle = (i / woodCount) * Math.PI * 2;
      const radius = 1.0;
      const dropPosition = new THREE.Vector3(
        tree.position.x + Math.cos(angle) * radius,
        tree.position.y + 0.5, // Spawn at ground level
        tree.position.z + Math.sin(angle) * radius
      );

      this.spawnWoodDrop(dropPosition);
    }

    // Remove from tracking
    this.choppableTrees.delete(tree.id);

    // Remove collision obstacle if exists
    if (this.collisionWorld && tree.colliderId !== undefined) {
      this.collisionWorld.remove(tree.colliderId);
    }

    // Play tree fall sound
    if (this.onPlaySound) {
      this.onPlaySound('tree_fall', tree.position);
    }
    // TODO: Tree fall animation
  }

  /**
   * Spawn a wood drop pickup
   */
  private spawnWoodDrop(position: THREE.Vector3): void {
    // Create simple wood log mesh
    const geometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.z = Math.PI / 2; // Lay it on its side
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);

    const woodDrop: WoodDrop = {
      mesh,
      position: position.clone(),
      amount: 1, // Each log = 1 wood
      angularSpeed: (Math.random() * 0.8 + 0.4) * (Math.random() < 0.5 ? -1 : 1),
      bobPhase: Math.random() * Math.PI * 2
    };

    this.woodDrops.push(woodDrop);
    console.log(`📦 Wood drop spawned at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
  }

  /**
   * Check if player is near wood drop and pick it up
   */
  public checkWoodPickup(playerPosition: THREE.Vector3, onPickup: (amount: number) => void): void {
    const pickupRadius = 2.0; // Can pick up wood from 2m away

    for (let i = this.woodDrops.length - 1; i >= 0; i--) {
      const drop = this.woodDrops[i];
      const distance = playerPosition.distanceTo(drop.position);

      if (distance <= pickupRadius) {
        // Pick up the wood
        console.log(`📦 Picked up ${drop.amount} wood`);
        onPickup(drop.amount);

        // Remove from scene
        this.scene.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        (drop.mesh.material as THREE.Material).dispose();

        this.woodDrops.splice(i, 1);
      }
    }
  }

  private showPrompt(text: string): void {
    interactionPrompt.show('tree', text, this.promptElement);
  }

  private clearPrompt(): void {
    interactionPrompt.hide('tree');
  }

  private updateWoodDrops(deltaTime: number): void {
    const bobSpeed = 1.5;
    const bobHeight = 0.05;

    this.woodDrops.forEach(drop => {
      drop.mesh.rotation.y += drop.angularSpeed * deltaTime;
      drop.bobPhase += bobSpeed * deltaTime;
      const baseY = drop.position.y;
      drop.mesh.position.y = baseY + Math.sin(drop.bobPhase) * bobHeight;
    });
  }

  public dispose(): void {
    // Clean up wood drops
    for (const drop of this.woodDrops) {
      this.scene.remove(drop.mesh);
      drop.mesh.geometry.dispose();
      (drop.mesh.material as THREE.Material).dispose();
    }
    this.woodDrops = [];
    this.choppableTrees.clear();
  }
}
