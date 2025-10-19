/**
 * PlayerController - First-person character controller powered by Rapier's KinematicCharacterController.
 * Handles input-driven locomotion, stamina, crouch/sprint states, and produces camera-ready position data.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from './PhysicsWorld';
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
  public readonly body: RAPIER.RigidBody;
  public readonly collider: RAPIER.Collider;
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();

  public stamina: number;
  public isCrouching = false;
  public isGrounded = false;

  private readonly physicsWorld: PhysicsWorld;
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

  constructor(physicsWorld: PhysicsWorld, config?: Partial<PlayerConfig>) {
    this.physicsWorld = physicsWorld;

    const defaults: PlayerConfig = {
      walkSpeed: 12.9,
      sprintSpeed: 21.0,
      crouchSpeed: 6.0,
      maxFallSpeed: 40,
      groundStickForce: 0.1,
      acceleration: 36,
      deceleration: 18,
      staminaMax: 100,
      sprintDrain: 12,
      sprintRecover: 18,
      capsuleRadius: 0.2,
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

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      this.config.startPosition.x,
      this.config.startPosition.y,
      this.config.startPosition.z
    );
    this.body = physicsWorld.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.capsule(
      this.config.capsuleHalfHeight,
      this.config.capsuleRadius
    )
      .setTranslation(0, 0, 0)
      .setFriction(0)
      .setRestitution(0);

    this.collider = physicsWorld.world.createCollider(colliderDesc, this.body);

    const translation = this.body.translation();
    this.position.set(translation.x, translation.y, translation.z);
    this.previousPosition.copy(this.position);

    console.log('✅ Player controller created (kinematic body + character controller)');
    console.log(
      `   Capsule height: ${(this.config.capsuleHalfHeight * 2 + this.config.capsuleRadius * 2).toFixed(2)}m, radius: ${this.config.capsuleRadius}`
    );
  }

  /**
   * Pre-physics update: computes the desired translation, resolves it through Rapier's character controller,
   * and queues the resulting transform on the kinematic rigid body.
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

    this.applyVerticalForces(deltaTime, wasGrounded);

    this.displacement.copy(this.horizontalVelocity).multiplyScalar(deltaTime);
    this.displacement.y = this.verticalVelocity * deltaTime;

    const desiredTranslation = new RAPIER.Vector3(
      this.displacement.x,
      this.displacement.y,
      this.displacement.z
    );

    this.physicsWorld.characterController.computeColliderMovement(
      this.collider,
      desiredTranslation,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      (other: RAPIER.Collider) => other !== this.collider
    );

    const corrected = this.physicsWorld.characterController.computedMovement();
    this.correctedMovement.set(corrected.x, corrected.y, corrected.z);

    const currentPos = this.body.translation();
    const nextPos = {
      x: currentPos.x + this.correctedMovement.x,
      y: currentPos.y + this.correctedMovement.y,
      z: currentPos.z + this.correctedMovement.z,
    };
    this.body.setNextKinematicTranslation(nextPos);

    this.isGrounded = this.physicsWorld.characterController.computedGrounded();

    if (this.isGrounded) {
      this.verticalVelocity = -this.config.groundStickForce;
    }

    if (deltaTime > 0) {
      this.currentHorizontalSpeed = Math.sqrt(
        this.correctedMovement.x * this.correctedMovement.x +
          this.correctedMovement.z * this.correctedMovement.z
      ) / deltaTime;
    } else {
      this.currentHorizontalSpeed = 0;
    }

    this.isCrouching = input.crouch;
  }

  /**
   * Post-physics update: reads back the simulated rigid body and exposes smoothed velocity values.
   */
  public postPhysics(deltaTime: number): void {
    const translation = this.body.translation();
    this.position.set(translation.x, translation.y, translation.z);

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
    if (this.collider && this.physicsWorld.world) {
      this.physicsWorld.world.removeCollider(this.collider, true);
    }
    if (this.body && this.physicsWorld.world) {
      this.physicsWorld.world.removeRigidBody(this.body);
    }
  }

  private applyVerticalForces(deltaTime: number, wasGrounded: boolean): void {
    const gravity = this.physicsWorld.getGravity().y; // Negative value.

    if (wasGrounded) {
      this.verticalVelocity = -this.config.groundStickForce;
    } else {
      this.verticalVelocity += gravity * deltaTime;
      this.verticalVelocity = Math.max(this.verticalVelocity, -this.config.maxFallSpeed);
    }
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
