/**
 * PlayerController - Lightweight character controller (no Rapier).
 * Handles input-driven locomotion, stamina, crouch/sprint states, and produces camera-ready position data.
 */

import * as THREE from 'three';
import { CollisionWorld } from './CollisionWorld';
import { InputState } from '../utils/InputManager';

export interface PlayerConfig {
  // Movement speeds (meters/second)
  walkSpeed: number;
  sprintSpeed: number;
  crouchSpeed: number;

  // Gravity
  maxFallSpeed: number;
  groundStickForce: number;
  acceleration: number;
  deceleration: number;

  // Stamina
  staminaMax: number;
  sprintDrain: number;
  sprintRecover: number;

  // Physics
  capsuleRadius: number;
  capsuleHalfHeight: number;
  eyeHeight: number;

  // Start position
  startPosition: THREE.Vector3;
}

export class PlayerController {
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();

  public stamina: number;
  public isCrouching = false;
  public isGrounded = false;

  private readonly collisionWorld: CollisionWorld;
  private readonly config: PlayerConfig;

  // Movement bookkeeping
  private readonly previousPosition = new THREE.Vector3();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly horizontalVelocity = new THREE.Vector3();
  private readonly desiredDirection = new THREE.Vector3();
  private readonly displacement = new THREE.Vector3();
  private readonly tmpForward = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3(0, 1, 0);
  private readonly tmpDelta = new THREE.Vector3();
  private readonly correctedMovement = new THREE.Vector3();

  private verticalVelocity = 0;
  private currentHorizontalSpeed = 0;

  constructor(collisionWorld: CollisionWorld, config?: Partial<PlayerConfig>) {
    this.collisionWorld = collisionWorld;

    const defaults: PlayerConfig = {
      walkSpeed: 3.9,
      sprintSpeed: 8.0,
      crouchSpeed: 2.6,
      maxFallSpeed: 40,
      groundStickForce: 0.1,
      acceleration: 14,
      deceleration: 10,
      staminaMax: 100,
      sprintDrain: 12,
      sprintRecover: 18,
      capsuleRadius: 0.18,
      capsuleHalfHeight: 0.58,
      eyeHeight: 0.52,
      startPosition: new THREE.Vector3(0, 1.0, 0),
    };

    this.config = {
      ...defaults,
      ...config,
      startPosition: (config?.startPosition ?? defaults.startPosition).clone(),
    };

    this.stamina = this.config.staminaMax;

    this.position.copy(this.config.startPosition);
    this.previousPosition.copy(this.config.startPosition);

    console.log('✅ Player controller created (lightweight collision)');
    console.log(`   Capsule height: ${(this.config.capsuleHalfHeight * 2 + this.config.capsuleRadius * 2).toFixed(2)}m, radius: ${this.config.capsuleRadius}`);
  }

  /**
   * Update: computes desired translation and resolves against the collision world.
   */
  public updatePrePhysics(deltaTime: number, input: InputState, camera: THREE.Camera): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.updateStamina(deltaTime, input);

    const wasGrounded = this.isGrounded;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);

    // Compute camera-relative movement direction on the XZ plane.
    if (moveX !== 0 || moveZ !== 0) {
      this.tmpForward.copy(camera.getWorldDirection(this.tmpForward));
      this.tmpForward.y = 0;
      if (this.tmpForward.lengthSq() < 1e-5) {
        this.tmpForward.set(0, 0, -1);
      } else {
        this.tmpForward.normalize();
      }

      this.tmpRight.crossVectors(this.tmpForward, this.tmpUp).normalize();

      this.desiredDirection.set(0, 0, 0);
      this.desiredDirection.addScaledVector(this.tmpRight, moveX);
      this.desiredDirection.addScaledVector(this.tmpForward, moveZ);
      this.desiredDirection.normalize();
    } else {
      this.desiredDirection.set(0, 0, 0);
    }

    const targetSpeed = this.getCurrentSpeed(input);

    if (this.desiredDirection.lengthSq() > 0) {
      const targetVelocity = this.tmpDelta.copy(this.desiredDirection).multiplyScalar(targetSpeed);
      const lerpFactor = THREE.MathUtils.clamp(this.config.acceleration * deltaTime, 0, 1);
      this.horizontalVelocity.lerp(targetVelocity, lerpFactor);
    } else {
      const decay = Math.max(0, 1 - this.config.deceleration * deltaTime);
      this.horizontalVelocity.multiplyScalar(decay);
      if (this.horizontalVelocity.lengthSq() < 1e-4) {
        this.horizontalVelocity.set(0, 0, 0);
      }
    }

    this.displacement.copy(this.horizontalVelocity).multiplyScalar(deltaTime);
    this.displacement.y = 0;

    // Resolve collisions (horizontal only)
    const bottomY = this.config.startPosition.y - this.config.capsuleHalfHeight;
    const topY = this.config.startPosition.y + this.config.capsuleHalfHeight;
    const resolvedPosition = this.collisionWorld.resolveHorizontal(
      this.position,
      this.displacement,
      this.config.capsuleRadius,
      bottomY,
      topY
    );

    this.correctedMovement.copy(resolvedPosition).sub(this.position);
    this.position.copy(resolvedPosition);

    // Keep on the nominal ground plane (prevents slow sinking)
    this.position.y = this.config.startPosition.y;

    this.isGrounded = true;
    this.verticalVelocity = -this.config.groundStickForce;

    this.currentHorizontalSpeed = deltaTime > 0
      ? this.correctedMovement.length() / deltaTime
      : 0;

    this.isCrouching = input.crouch;
  }

  /**
   * Post-physics update: reads back the simulated rigid body and exposes smoothed velocity values.
   */
  public postPhysics(deltaTime: number): void {
    if (Number.isFinite(deltaTime) && deltaTime > 0) {
      this.velocity.set(
        (this.position.x - this.previousPosition.x) / deltaTime,
        (this.position.y - this.previousPosition.y) / deltaTime,
        (this.position.z - this.previousPosition.z) / deltaTime
      );
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.previousPosition.copy(this.position);

    this.horizontalVelocity.set(this.velocity.x, 0, this.velocity.z);
    this.currentHorizontalSpeed = this.horizontalVelocity.length();

    this.verticalVelocity = this.isGrounded ? -this.config.groundStickForce : this.velocity.y;
  }

  /**
   * Get camera position (at eye height)
   */
  public getCameraPosition(): THREE.Vector3 {
    const eyeOffset = this.isCrouching ? this.config.eyeHeight * 0.6 : this.config.eyeHeight;
    return this.cameraPosition.set(
      this.position.x,
      this.position.y + eyeOffset,
      this.position.z
    );
  }

  public getMoveSpeed(): number {
    return this.currentHorizontalSpeed;
  }

  public getStaminaPercent(): number {
    return this.stamina / this.config.staminaMax;
  }

  public dispose(): void {
  }

  private updateStamina(deltaTime: number, input: InputState): void {
    const isTryingToSprint = input.sprint && input.isAnyMovementKey && this.stamina > 0 && !input.crouch;

    if (isTryingToSprint) {
      this.stamina = Math.max(0, this.stamina - this.config.sprintDrain * deltaTime);
    } else {
      this.stamina = Math.min(this.config.staminaMax, this.stamina + this.config.sprintRecover * deltaTime);
    }
  }

  private getCurrentSpeed(input: InputState): number {
    if (input.crouch) {
      return this.config.crouchSpeed;
    }

    if (input.sprint && input.isAnyMovementKey && this.stamina > 0) {
      return this.config.sprintSpeed;
    }

    return this.config.walkSpeed;
  }
}
