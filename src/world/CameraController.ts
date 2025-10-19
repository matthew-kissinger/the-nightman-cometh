/**
 * CameraController - PointerLock first-person camera with horror effects
 * Manages camera rotation, head bob, and atmospheric effects
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export interface CameraConfig {
  fov: number;
  mouseSensitivity: number;
  headBobEnabled: boolean;
  headBobAmplitude: number;
  headBobFrequency: number;
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public controls: PointerLockControls;

  private config: CameraConfig;
  private headBobPhase = 0;
  private isLocked = false;

  // Callbacks
  public onLock?: () => void;
  public onUnlock?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, config?: Partial<CameraConfig>) {
    this.camera = camera;

    // Default horror configuration
    this.config = {
      fov: 65,                    // Narrow FOV for claustrophobia
      mouseSensitivity: 0.002,
      headBobEnabled: true,
      headBobAmplitude: 0.03,     // Subtle bob
      headBobFrequency: 2.0,      // Cycles per second
      ...config
    };

    // Set camera FOV
    this.camera.fov = this.config.fov;
    this.camera.updateProjectionMatrix();

    // Create PointerLockControls (Three.js r180 requires domElement parameter)
    this.controls = new PointerLockControls(this.camera, domElement);

    // Set up pointer lock events
    this.setupPointerLock(domElement);

    console.log('✅ Camera controller created');
    console.log(`   FOV: ${this.config.fov}° (horror claustrophobia)`);
    console.log(`   Head bob: ${this.config.headBobEnabled ? 'enabled' : 'disabled'}`);
  }

  private setupPointerLock(domElement: HTMLElement): void {
    // Lock pointer on click
    domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.controls.lock();
      }
    });

    // Handle lock events
    this.controls.addEventListener('lock', () => {
      this.isLocked = true;
      console.log('🔒 Pointer locked');
      if (this.onLock) this.onLock();
    });

    this.controls.addEventListener('unlock', () => {
      this.isLocked = false;
      console.log('🔓 Pointer unlocked');
      if (this.onUnlock) this.onUnlock();
    });
  }

  /**
   * Update camera position and effects
   */
  public update(
    targetPosition: THREE.Vector3,
    deltaTime: number,
    isMoving: boolean,
    movementSpeed: number
  ): void {
    // Update camera position (controls handle rotation)
    this.camera.position.copy(targetPosition);

    // Apply head bob if enabled and moving
    if (this.config.headBobEnabled && isMoving) {
      this.applyHeadBob(deltaTime, movementSpeed);
    } else {
      // Reset head bob phase when not moving
      this.headBobPhase = 0;
    }
  }

  /**
   * Apply subtle head bob effect during movement
   */
  private applyHeadBob(deltaTime: number, movementSpeed: number): void {
    // Increment bob phase based on movement speed
    this.headBobPhase += deltaTime * this.config.headBobFrequency * (movementSpeed / 1.5);

    // Calculate bob offsets
    const bobY = Math.abs(Math.sin(this.headBobPhase)) * this.config.headBobAmplitude;
    const bobX = Math.cos(this.headBobPhase * 0.5) * this.config.headBobAmplitude * 0.5;

    // Apply to camera (additive to base position)
    this.camera.position.y += bobY;
    this.camera.position.x += bobX;
  }

  /**
   * Enable or disable head bob
   */
  public setHeadBobEnabled(enabled: boolean): void {
    this.config.headBobEnabled = enabled;
    if (!enabled) {
      this.headBobPhase = 0;
    }
  }

  /**
   * Check if pointer is locked
   */
  public get locked(): boolean {
    return this.isLocked;
  }

  /**
   * Manually lock pointer
   */
  public lock(): void {
    this.controls.lock();
  }

  /**
   * Manually unlock pointer
   */
  public unlock(): void {
    this.controls.unlock();
  }

  /**
   * Clean up
   */
  public dispose(): void {
    this.controls.dispose();
  }
}
