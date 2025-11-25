import * as THREE from 'three';
import { InputManager } from '../../utils/InputManager';
import { WeaponManager } from '../WeaponManager';
import { CombatSystem } from './CombatSystem';

/**
 * CombatController - Wires up weapon inputs to combat actions
 *
 * Handles:
 * - Right-click to shoot shotgun
 * - Audio triggers
 * - Visual feedback (muzzle flash)
 */

export class CombatController {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private inputManager: InputManager;
  private weaponManager: WeaponManager;
  private combatSystem: CombatSystem;


  // Cooldowns
  private shotgunCooldown = 0;
  private readonly shotgunCooldownTime = 0.5; // 500ms between shots

  // Audio callback (will be set by SceneManager)
  public onPlaySound?: (soundKey: string, position?: THREE.Vector3) => void;

  // Muzzle flash components
  private muzzleFlashLight: THREE.PointLight | null = null;
  private muzzleFlashSprite: THREE.Sprite | null = null;
  private muzzleFlashTimer = 0;
  private readonly muzzleFlashDuration = 0.08; // 80ms flash

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    inputManager: InputManager,
    weaponManager: WeaponManager,
    combatSystem: CombatSystem
  ) {
    this.camera = camera;
    this.scene = scene;
    this.inputManager = inputManager;
    this.weaponManager = weaponManager;
    this.combatSystem = combatSystem;

    // Create reusable muzzle flash components
    this.createMuzzleFlashComponents();

    console.log('⚔️ CombatController initialized');
  }

  /**
   * Create reusable muzzle flash light and sprite
   */
  private createMuzzleFlashComponents(): void {
    // Point light for illumination
    this.muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 8, 2);
    this.muzzleFlashLight.visible = false;
    this.scene.add(this.muzzleFlashLight);

    // Sprite for visual flash
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Draw starburst pattern for muzzle flash
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 128, 128);

    // Radial gradient core
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
    gradient.addColorStop(0.15, 'rgba(255, 220, 150, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 150, 50, 0.8)');
    gradient.addColorStop(0.7, 'rgba(255, 80, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Add some spikes/rays
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(64 + Math.cos(angle) * 20, 64 + Math.sin(angle) * 20);
      ctx.lineTo(64 + Math.cos(angle) * 55, 64 + Math.sin(angle) * 55);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.muzzleFlashSprite = new THREE.Sprite(spriteMaterial);
    this.muzzleFlashSprite.scale.set(0.6, 0.6, 1);
    this.muzzleFlashSprite.visible = false;
    this.scene.add(this.muzzleFlashSprite);
  }

  public update(deltaTime: number): void {
    // Update cooldowns
    this.shotgunCooldown = Math.max(0, this.shotgunCooldown - deltaTime);

    // Update muzzle flash
    this.updateMuzzleFlash(deltaTime);

    // Left-click: Shoot shotgun (when shotgun equipped)
    if (this.inputManager.consumeLeftClick() && this.weaponManager.getCurrentWeapon() === 'shotgun') {
      this.handleShotgunFire();
    }
  }

  private handleShotgunFire(): void {
    // Check cooldown
    if (this.shotgunCooldown > 0) {
      return;
    }

    // Check if we have ammo
    const ammo = this.combatSystem.getShotgunAmmo();

    if (ammo <= 0) {
      // Empty click
      if (this.onPlaySound) {
        this.onPlaySound('shotgun_empty');
      }
      console.log('🔫 *CLICK* - Out of ammo!');
      return;
    }

    // Fire! Consume ammo
    this.combatSystem.setShotgunAmmo(ammo - 1);
    console.log(`🔫 Shotgun fired! Ammo: ${ammo - 1}/${this.combatSystem.getMaxShotgunAmmo()}`);

    // Trigger visual recoil on weapon
    this.weaponManager.triggerShotgunFire();

    // Play shotgun fire sound
    if (this.onPlaySound) {
      this.onPlaySound('shotgun_fire');
    }

    // Trigger muzzle flash effect
    this.triggerMuzzleFlash();

    // Set cooldown
    this.shotgunCooldown = this.shotgunCooldownTime;
  }

  /**
   * Trigger the muzzle flash effect
   */
  private triggerMuzzleFlash(): void {
    this.muzzleFlashTimer = this.muzzleFlashDuration;

    if (this.muzzleFlashLight && this.muzzleFlashSprite) {
      // Calculate initial position immediately so it appears on first frame
      const flashPos = this.calculateMuzzlePosition();

      this.muzzleFlashLight.visible = true;
      this.muzzleFlashLight.intensity = 4;
      this.muzzleFlashLight.position.copy(flashPos);

      this.muzzleFlashSprite.visible = true;
      this.muzzleFlashSprite.position.copy(flashPos);
      (this.muzzleFlashSprite.material as THREE.SpriteMaterial).opacity = 1;
      this.muzzleFlashSprite.scale.set(0.6, 0.6, 1);

      // Random rotation for variety
      this.muzzleFlashSprite.material.rotation = Math.random() * Math.PI * 2;
    }
  }

  /**
   * Calculate muzzle flash position based on camera
   */
  private calculateMuzzlePosition(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    this.camera.getWorldDirection(direction);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);

    return this.camera.position.clone()
      .add(direction.clone().multiplyScalar(1.0))  // Forward
      .add(right.multiplyScalar(0.15))              // Right offset for gun
      .add(new THREE.Vector3(0, -0.15, 0));         // Down slightly
  }

  /**
   * Update muzzle flash animation
   */
  private updateMuzzleFlash(deltaTime: number): void {
    if (this.muzzleFlashTimer <= 0) return;

    this.muzzleFlashTimer -= deltaTime;
    const t = 1 - (this.muzzleFlashTimer / this.muzzleFlashDuration);

    // Update position to follow camera
    const flashPos = this.calculateMuzzlePosition();

    if (this.muzzleFlashLight) {
      this.muzzleFlashLight.position.copy(flashPos);
      // Fast fade out with initial brightness
      this.muzzleFlashLight.intensity = 4 * Math.pow(1 - t, 2);
    }

    if (this.muzzleFlashSprite) {
      this.muzzleFlashSprite.position.copy(flashPos);
      (this.muzzleFlashSprite.material as THREE.SpriteMaterial).opacity = Math.pow(1 - t, 1.5);
      // Scale down slightly as it fades
      const scale = 0.6 * (1 - t * 0.3);
      this.muzzleFlashSprite.scale.set(scale, scale, 1);
    }

    // Hide when done
    if (this.muzzleFlashTimer <= 0) {
      if (this.muzzleFlashLight) this.muzzleFlashLight.visible = false;
      if (this.muzzleFlashSprite) this.muzzleFlashSprite.visible = false;
    }
  }

  public dispose(): void {
    if (this.muzzleFlashLight) {
      this.scene.remove(this.muzzleFlashLight);
      this.muzzleFlashLight.dispose();
    }
    if (this.muzzleFlashSprite) {
      this.scene.remove(this.muzzleFlashSprite);
      (this.muzzleFlashSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.muzzleFlashSprite.material as THREE.SpriteMaterial).dispose();
    }
  }
}
