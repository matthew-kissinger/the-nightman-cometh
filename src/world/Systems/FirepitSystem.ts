import * as THREE from 'three';
import { InputManager } from '../../utils/InputManager';
import { InventorySystem } from './InventorySystem';
import { interactionPrompt } from '../../ui/InteractionPrompt';

/**
 * FirepitSystem - Manages firepit that keeps Nightman away
 *
 * Features:
 * - Burn wood to increase fire intensity
 * - Fire decays over time
 * - Higher intensity = keeps Nightman farther away
 * - Visual fire effects (particles, light)
 */

export class FirepitSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private inputManager: InputManager;
  private inventory: InventorySystem;

  // Firepit state
  private firepitPosition: THREE.Vector3;
  private fireIntensity: number = 0; // 0-100
  private maxIntensity: number = 100;

  // Fire mechanics
  private burnRate: number = 2.0; // Intensity lost per second (slower burn)
  private woodBurnValue: number = 25.0; // Intensity gained per wood

  // Visual elements
  private fireLight: THREE.PointLight | null = null;
  private fireMesh: THREE.Mesh | null = null;
  private particleSystem: THREE.Points | null = null;
  private readonly flameOffset = new THREE.Vector3(0, 0.05, -0.1);
  private readonly lightOffset = new THREE.Vector3(0, 0.35, -0.05);

  // Interaction
  private interactionRadius: number = 2.4;
  private facingThreshold: number = 0.45; // Require looking roughly at the fire to show the prompt
  private promptElement: HTMLElement | null = null;
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpForward = new THREE.Vector3();

  // Callbacks
  public onIntensityChange?: (intensity: number) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    inputManager: InputManager,
    inventory: InventorySystem,
    firepitPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;
    this.inventory = inventory;
    this.firepitPosition = firepitPosition.clone();

    this.promptElement = document.getElementById('interaction-prompt');
    interactionPrompt.attach(this.promptElement);

    this.createFirepit();
  }

  /**
   * Move the firepit to a new world position (used when reading cabin markers)
   */
  public setPosition(position: THREE.Vector3): void {
    this.firepitPosition.copy(position);

    if (this.fireMesh) {
      this.fireMesh.position.copy(position).add(this.flameOffset);
    }
    if (this.fireLight) {
      this.fireLight.position.copy(position).add(this.lightOffset);
    }
  }

  /**
   * Create firepit visual elements
   */
  private createFirepit(): void {
    // Create fire mesh (cone of flames)
    const fireGeometry = new THREE.ConeGeometry(0.35, 0.6, 8);
    const fireMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });
    this.fireMesh = new THREE.Mesh(fireGeometry, fireMaterial);
    this.fireMesh.position.copy(this.firepitPosition).add(this.flameOffset);
    this.fireMesh.visible = false; // Hidden until fire starts
    this.scene.add(this.fireMesh);

    // Create fire light
    this.fireLight = new THREE.PointLight(0xff6600, 0, 20);
    this.fireLight.position.copy(this.firepitPosition).add(this.lightOffset);
    this.fireLight.castShadow = true;
    this.fireLight.shadow.mapSize.width = 512;
    this.fireLight.shadow.mapSize.height = 512;
    this.scene.add(this.fireLight);

    console.log(`🔥 Firepit created at (${this.firepitPosition.x}, ${this.firepitPosition.z})`);
  }

  /**
   * Update fire system
   */
  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    // Decay fire intensity over time
    if (this.fireIntensity > 0) {
      this.fireIntensity = Math.max(0, this.fireIntensity - this.burnRate * deltaTime);

      // Update visuals based on intensity
      this.updateFireVisuals();

      if (this.onIntensityChange) {
        this.onIntensityChange(this.fireIntensity);
      }
    }

    // Check if player is near firepit
    const horizontalDistance = Math.hypot(
      playerPosition.x - this.firepitPosition.x,
      playerPosition.z - this.firepitPosition.z
    );
    const verticalDelta = Math.abs(playerPosition.y - this.firepitPosition.y);

    if (horizontalDistance <= this.interactionRadius && verticalDelta <= 1.6) {
      this.tmpDir.subVectors(this.firepitPosition, this.camera.position).setY(0).normalize();
      this.camera.getWorldDirection(this.tmpForward);
      this.tmpForward.setY(0).normalize();

      const isLookingAtFire = this.tmpForward.lengthSq() > 0 && this.tmpDir.lengthSq() > 0
        ? this.tmpForward.dot(this.tmpDir) >= this.facingThreshold
        : false;

      if (!isLookingAtFire) {
        this.clearPrompt();
        return;
      }

      const woodCount = this.inventory.getInventory().wood;

      if (woodCount > 0) {
        this.showPrompt(`Add Wood to Fire [E] (${woodCount} wood available)`);

        // Check for interact input
        if (this.inputManager.consumeInteractPress()) {
          this.addWoodToFire();
        }
      } else {
        this.showPrompt('No wood to burn');
      }
    } else {
      this.clearPrompt();
    }
  }

  /**
   * Add wood to fire
   */
  private addWoodToFire(): void {
    if (this.inventory.removeWood(1)) {
      this.fireIntensity = Math.min(this.maxIntensity, this.fireIntensity + this.woodBurnValue);
      console.log(`🔥 Added wood to fire! Intensity: ${this.fireIntensity.toFixed(1)}%`);

      // TODO: Play wood crackling sound
      // TODO: Particle burst effect
    }
  }

  /**
   * Update fire visuals based on intensity
   */
  private updateFireVisuals(): void {
    if (!this.fireLight || !this.fireMesh) return;

    const normalizedIntensity = this.fireIntensity / this.maxIntensity;

    if (this.fireIntensity > 0) {
      // Show fire
      this.fireMesh.visible = true;
      this.fireLight.visible = true;

      // Scale fire mesh with intensity
      const scale = 0.3 + normalizedIntensity * 0.6; // contained flame
      this.fireMesh.scale.set(scale, scale, scale);

      // Adjust light intensity
      this.fireLight.intensity = normalizedIntensity * 10.0;

      // Flicker effect
      const flicker = 1.0 + Math.sin(Date.now() * 0.01) * 0.1;
      this.fireLight.intensity *= flicker;

      // Color shift (orange -> red as it dies)
      const hue = 0.05 + normalizedIntensity * 0.05; // 0.05 (red) to 0.1 (orange)
      this.fireLight.color.setHSL(hue, 1.0, 0.5);
    } else {
      // Hide fire when intensity = 0
      this.fireMesh.visible = false;
      this.fireLight.visible = false;
    }
  }

  /**
   * Get current fire intensity (used by Nightman AI)
   */
  public getIntensity(): number {
    return this.fireIntensity;
  }

  /**
   * Check if fire is currently lit
   */
  public isLit(): boolean {
    return this.fireIntensity > 0;
  }

  /**
   * Get firepit position
   */
  public getPosition(): THREE.Vector3 {
    return this.firepitPosition.clone();
  }

  /**
   * Get fear radius based on fire intensity
   * Higher intensity = larger fear radius
   */
  public getFearRadius(): number {
    const normalizedIntensity = this.fireIntensity / this.maxIntensity;
    return 5.0 + normalizedIntensity * 15.0; // 5m to 20m fear radius
  }

  private showPrompt(text: string): void {
    interactionPrompt.show('firepit', text, this.promptElement);
  }

  private clearPrompt(): void {
    interactionPrompt.hide('firepit');
  }

  public dispose(): void {
    if (this.fireLight) {
      this.scene.remove(this.fireLight);
    }
    if (this.fireMesh) {
      this.scene.remove(this.fireMesh);
      this.fireMesh.geometry.dispose();
      (this.fireMesh.material as THREE.Material).dispose();
    }
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
    }
  }
}
