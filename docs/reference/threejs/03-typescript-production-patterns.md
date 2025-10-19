# TypeScript Production Patterns for PointerLockControls (r180)

**Date**: 2024-2025
**Three.js Version**: r180 / 0.180.0
**Language**: TypeScript

## Overview

This document provides production-ready TypeScript patterns for implementing PointerLockControls in Three.js r180 games with proper type safety, error handling, and architecture.

## Type-Safe Controller Class

```typescript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * Configuration options for the FirstPersonController
 */
interface ControllerConfig {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  moveSpeed?: number;
  sprintMultiplier?: number;
  jumpVelocity?: number;
  gravity?: number;
  playerHeight?: number;
  mouseSensitivity?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}

/**
 * Movement state tracking
 */
interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

/**
 * Physics state
 */
interface PhysicsState {
  velocity: THREE.Vector3;
  canJump: boolean;
  onGround: boolean;
}

/**
 * First-person controller wrapping PointerLockControls with movement logic
 */
export class FirstPersonController {
  public controls: PointerLockControls;

  private moveSpeed: number;
  private sprintMultiplier: number;
  private jumpVelocity: number;
  private gravity: number;
  private playerHeight: number;

  private movement: MovementState;
  private physics: PhysicsState;
  private direction: THREE.Vector3;
  private prevTime: number;

  private raycaster: THREE.Raycaster;
  private collisionObjects: THREE.Object3D[];

  private keydownHandler: (event: KeyboardEvent) => void;
  private keyupHandler: (event: KeyboardEvent) => void;

  constructor(config: ControllerConfig) {
    // Initialize controls
    this.controls = new PointerLockControls(config.camera, config.domElement);

    // Configuration
    this.moveSpeed = config.moveSpeed ?? 400.0;
    this.sprintMultiplier = config.sprintMultiplier ?? 1.5;
    this.jumpVelocity = config.jumpVelocity ?? 350;
    this.gravity = config.gravity ?? 9.8 * 100.0;
    this.playerHeight = config.playerHeight ?? 10;

    // Set mouse sensitivity
    this.controls.pointerSpeed = config.mouseSensitivity ?? 1.0;

    // Set polar angle limits if provided
    if (config.minPolarAngle !== undefined) {
      this.controls.minPolarAngle = config.minPolarAngle;
    }
    if (config.maxPolarAngle !== undefined) {
      this.controls.maxPolarAngle = config.maxPolarAngle;
    }

    // Movement state
    this.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };

    // Physics state
    this.physics = {
      velocity: new THREE.Vector3(),
      canJump: false,
      onGround: false,
    };

    this.direction = new THREE.Vector3();
    this.prevTime = performance.now();

    // Collision detection
    this.raycaster = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
      0,
      this.playerHeight
    );
    this.collisionObjects = [];

    // Bind keyboard handlers
    this.keydownHandler = this.onKeyDown.bind(this);
    this.keyupHandler = this.onKeyUp.bind(this);

    this.setupEventListeners();
  }

  /**
   * Set up keyboard event listeners
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
  }

  /**
   * Handle keydown events
   */
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.movement.forward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.movement.left = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.movement.backward = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.movement.right = true;
        break;
      case 'Space':
        this.movement.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.movement.sprint = true;
        break;
    }
  }

  /**
   * Handle keyup events
   */
  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.movement.forward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.movement.left = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.movement.backward = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.movement.right = false;
        break;
      case 'Space':
        this.movement.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.movement.sprint = false;
        break;
    }
  }

  /**
   * Set objects for collision detection
   */
  public setCollisionObjects(objects: THREE.Object3D[]): void {
    this.collisionObjects = objects;
  }

  /**
   * Add a collision object
   */
  public addCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.push(object);
  }

  /**
   * Remove a collision object
   */
  public removeCollisionObject(object: THREE.Object3D): void {
    const index = this.collisionObjects.indexOf(object);
    if (index > -1) {
      this.collisionObjects.splice(index, 1);
    }
  }

  /**
   * Update controller state (call in animation loop)
   */
  public update(deltaTime?: number): void {
    if (!this.controls.isLocked) return;

    const time = performance.now();
    const delta = deltaTime ?? (time - this.prevTime) / 1000;

    // Check ground collision
    this.raycaster.ray.origin.copy(this.controls.object.position);
    this.raycaster.ray.origin.y -= this.playerHeight;

    const intersections = this.raycaster.intersectObjects(this.collisionObjects, false);
    this.physics.onGround = intersections.length > 0;

    // Apply damping to horizontal velocity
    this.physics.velocity.x -= this.physics.velocity.x * 10.0 * delta;
    this.physics.velocity.z -= this.physics.velocity.z * 10.0 * delta;

    // Apply gravity
    this.physics.velocity.y -= this.gravity * delta;

    // Calculate movement direction
    this.direction.z = Number(this.movement.forward) - Number(this.movement.backward);
    this.direction.x = Number(this.movement.right) - Number(this.movement.left);
    this.direction.normalize();

    // Calculate effective speed (with sprint)
    const speed = this.moveSpeed * (this.movement.sprint ? this.sprintMultiplier : 1.0);

    // Apply horizontal movement
    if (this.movement.forward || this.movement.backward) {
      this.physics.velocity.z -= this.direction.z * speed * delta;
    }
    if (this.movement.left || this.movement.right) {
      this.physics.velocity.x -= this.direction.x * speed * delta;
    }

    // Apply jump
    if (this.movement.jump && this.physics.canJump) {
      this.physics.velocity.y = this.jumpVelocity;
      this.physics.canJump = false;
    }

    // Ground collision
    if (this.physics.onGround) {
      this.physics.velocity.y = Math.max(0, this.physics.velocity.y);
      this.physics.canJump = true;
    }

    // Apply velocity to position
    this.controls.moveRight(-this.physics.velocity.x * delta);
    this.controls.moveForward(-this.physics.velocity.z * delta);
    this.controls.object.position.y += this.physics.velocity.y * delta;

    // Floor constraint
    if (this.controls.object.position.y < this.playerHeight) {
      this.physics.velocity.y = 0;
      this.controls.object.position.y = this.playerHeight;
      this.physics.canJump = true;
    }

    this.prevTime = time;
  }

  /**
   * Lock the pointer (request pointer lock)
   */
  public lock(): void {
    this.controls.lock();
  }

  /**
   * Unlock the pointer (exit pointer lock)
   */
  public unlock(): void {
    this.controls.unlock();
  }

  /**
   * Check if controls are currently locked
   */
  public get isLocked(): boolean {
    return this.controls.isLocked;
  }

  /**
   * Get the controlled camera
   */
  public get camera(): THREE.Camera {
    return this.controls.object;
  }

  /**
   * Get current velocity (read-only)
   */
  public getVelocity(): Readonly<THREE.Vector3> {
    return this.physics.velocity;
  }

  /**
   * Set player position
   */
  public setPosition(x: number, y: number, z: number): void {
    this.controls.object.position.set(x, y, z);
  }

  /**
   * Reset velocity (e.g., on respawn)
   */
  public resetVelocity(): void {
    this.physics.velocity.set(0, 0, 0);
  }

  /**
   * Clean up event listeners and resources
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
    this.controls.dispose();
  }
}
```

## Usage Example

```typescript
import * as THREE from 'three';
import { FirstPersonController } from './FirstPersonController';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create controller
const controller = new FirstPersonController({
  camera,
  domElement: document.body,
  moveSpeed: 400,
  sprintMultiplier: 1.8,
  jumpVelocity: 350,
  mouseSensitivity: 0.8,
  minPolarAngle: Math.PI / 6,
  maxPolarAngle: (Math.PI * 5) / 6,
});

// Set up UI
const blocker = document.getElementById('blocker')!;
const instructions = document.getElementById('instructions')!;

instructions.addEventListener('click', () => {
  controller.lock();
});

controller.controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
  blocker.style.display = 'none';
});

controller.controls.addEventListener('unlock', () => {
  blocker.style.display = 'block';
  instructions.style.display = '';
});

// Create collision objects
const objects: THREE.Object3D[] = [];

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshStandardMaterial({ color: 0x808080 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
objects.push(ground);

// Add some boxes
for (let i = 0; i < 50; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
  );
  box.position.set(
    Math.random() * 400 - 200,
    10,
    Math.random() * 400 - 200
  );
  scene.add(box);
  objects.push(box);
}

controller.setCollisionObjects(objects);

// Set initial position
controller.setPosition(0, 10, 0);

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  controller.update();

  renderer.render(scene, camera);
}

animate();

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  controller.dispose();
});
```

## Advanced Pattern: ECS Integration

```typescript
import { World, defineComponent, Types } from 'bitecs';

// Define components
const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

const Player = defineComponent({
  moveSpeed: Types.f32,
  jumpVelocity: Types.f32,
});

/**
 * Player controller system for ECS
 */
export class PlayerControllerSystem {
  private controller: FirstPersonController;
  private playerEntity: number;

  constructor(
    controller: FirstPersonController,
    playerEntity: number
  ) {
    this.controller = controller;
    this.playerEntity = playerEntity;
  }

  public update(world: World, delta: number): void {
    // Update controller
    this.controller.update(delta);

    // Sync ECS components with controller state
    const velocity = this.controller.getVelocity();
    Velocity.x[this.playerEntity] = velocity.x;
    Velocity.y[this.playerEntity] = velocity.y;
    Velocity.z[this.playerEntity] = velocity.z;

    const position = this.controller.camera.position;
    Transform.x[this.playerEntity] = position.x;
    Transform.y[this.playerEntity] = position.y;
    Transform.z[this.playerEntity] = position.z;
  }
}
```

## Type-Safe Event System

```typescript
/**
 * Type-safe event emitter for controller events
 */
type ControllerEventMap = {
  lock: void;
  unlock: void;
  jump: void;
  land: void;
  collision: { object: THREE.Object3D; normal: THREE.Vector3 };
  sprint: { active: boolean };
};

export class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<(data: any) => void>> = new Map();

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as any);
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    this.listeners.get(event)?.delete(callback as any);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Enhanced controller with custom events
 */
export class EnhancedFirstPersonController extends FirstPersonController {
  public events = new EventEmitter<ControllerEventMap>();

  private wasOnGround = false;

  public update(deltaTime?: number): void {
    const wasLocked = this.isLocked;

    super.update(deltaTime);

    // Emit custom events based on state changes

    // Jump event
    if (this.movement.jump && this.physics.canJump) {
      this.events.emit('jump', undefined);
    }

    // Land event
    if (!this.wasOnGround && this.physics.onGround) {
      this.events.emit('land', undefined);
    }
    this.wasOnGround = this.physics.onGround;

    // Sprint event
    if (this.movement.sprint) {
      this.events.emit('sprint', { active: true });
    }

    // Lock/unlock events
    if (this.isLocked && !wasLocked) {
      this.events.emit('lock', undefined);
    } else if (!this.isLocked && wasLocked) {
      this.events.emit('unlock', undefined);
    }
  }

  public override dispose(): void {
    super.dispose();
    this.events.clear();
  }
}

// Usage
const controller = new EnhancedFirstPersonController({
  camera,
  domElement: document.body,
});

controller.events.on('jump', () => {
  console.log('Player jumped!');
  playJumpSound();
});

controller.events.on('land', () => {
  console.log('Player landed!');
  playLandSound();
});

controller.events.on('sprint', ({ active }) => {
  if (active) {
    applySprintFOVEffect();
  }
});
```

## Performance Monitoring

```typescript
/**
 * Performance-monitored controller
 */
export class MonitoredFirstPersonController extends FirstPersonController {
  private updateTimes: number[] = [];
  private maxSamples = 60;

  public override update(deltaTime?: number): void {
    const start = performance.now();

    super.update(deltaTime);

    const end = performance.now();
    this.updateTimes.push(end - start);

    if (this.updateTimes.length > this.maxSamples) {
      this.updateTimes.shift();
    }
  }

  public getAverageUpdateTime(): number {
    if (this.updateTimes.length === 0) return 0;
    const sum = this.updateTimes.reduce((a, b) => a + b, 0);
    return sum / this.updateTimes.length;
  }

  public getMaxUpdateTime(): number {
    return Math.max(...this.updateTimes, 0);
  }

  public resetMetrics(): void {
    this.updateTimes = [];
  }
}
```

## State Machine Pattern

```typescript
enum PlayerState {
  Idle,
  Walking,
  Sprinting,
  Jumping,
  Falling,
  Landing,
}

export class StateMachineController extends FirstPersonController {
  private state: PlayerState = PlayerState.Idle;
  private stateTime = 0;

  public override update(deltaTime?: number): void {
    super.update(deltaTime);

    this.updateState(deltaTime ?? 0.016);
  }

  private updateState(delta: number): void {
    this.stateTime += delta;

    const isMoving =
      this.movement.forward ||
      this.movement.backward ||
      this.movement.left ||
      this.movement.right;

    const velocity = this.getVelocity();

    // State transitions
    switch (this.state) {
      case PlayerState.Idle:
        if (!this.physics.onGround && velocity.y < -0.1) {
          this.setState(PlayerState.Falling);
        } else if (isMoving) {
          this.setState(this.movement.sprint ? PlayerState.Sprinting : PlayerState.Walking);
        } else if (velocity.y > 0.1) {
          this.setState(PlayerState.Jumping);
        }
        break;

      case PlayerState.Walking:
        if (!isMoving) {
          this.setState(PlayerState.Idle);
        } else if (this.movement.sprint) {
          this.setState(PlayerState.Sprinting);
        } else if (velocity.y > 0.1) {
          this.setState(PlayerState.Jumping);
        }
        break;

      case PlayerState.Sprinting:
        if (!isMoving) {
          this.setState(PlayerState.Idle);
        } else if (!this.movement.sprint) {
          this.setState(PlayerState.Walking);
        } else if (velocity.y > 0.1) {
          this.setState(PlayerState.Jumping);
        }
        break;

      case PlayerState.Jumping:
        if (velocity.y < -0.1) {
          this.setState(PlayerState.Falling);
        }
        break;

      case PlayerState.Falling:
        if (this.physics.onGround) {
          this.setState(PlayerState.Landing);
        }
        break;

      case PlayerState.Landing:
        if (this.stateTime > 0.2) {
          this.setState(isMoving ? PlayerState.Walking : PlayerState.Idle);
        }
        break;
    }
  }

  private setState(newState: PlayerState): void {
    if (this.state === newState) return;

    console.log(`State transition: ${PlayerState[this.state]} -> ${PlayerState[newState]}`);
    this.state = newState;
    this.stateTime = 0;

    // Trigger state-specific effects
    this.onStateEnter(newState);
  }

  private onStateEnter(state: PlayerState): void {
    switch (state) {
      case PlayerState.Jumping:
        // Play jump sound
        break;
      case PlayerState.Landing:
        // Play land sound
        // Camera shake
        break;
      case PlayerState.Sprinting:
        // Increase FOV
        break;
    }
  }

  public getState(): PlayerState {
    return this.state;
  }

  public getStateTime(): number {
    return this.stateTime;
  }
}
```

## Integration Notes

### With Rapier Physics

```typescript
import type { World as RapierWorld, CharacterController } from '@dimforge/rapier3d-compat';

export class PhysicsFirstPersonController extends FirstPersonController {
  private characterController: CharacterController;
  private physicsWorld: RapierWorld;

  constructor(
    config: ControllerConfig,
    physicsWorld: RapierWorld,
    characterController: CharacterController
  ) {
    super(config);
    this.physicsWorld = physicsWorld;
    this.characterController = characterController;
  }

  public override update(deltaTime?: number): void {
    if (!this.controls.isLocked) return;

    // Calculate movement from input
    // ... (same as base class)

    // Use physics engine for movement
    const movement = {
      x: this.physics.velocity.x * delta,
      y: this.physics.velocity.y * delta,
      z: this.physics.velocity.z * delta,
    };

    this.characterController.computeColliderMovement(
      this.characterCollider,
      movement
    );

    const correctedMovement = this.characterController.computedMovement();

    // Apply corrected movement to camera
    this.controls.object.position.x += correctedMovement.x;
    this.controls.object.position.y += correctedMovement.y;
    this.controls.object.position.z += correctedMovement.z;
  }
}
```

## Best Practices

1. **Always use TypeScript strict mode** for better type safety
2. **Dispose controllers** when changing scenes or on cleanup
3. **Use delta time** for frame-rate independent movement
4. **Separate concerns**: Keep input handling, physics, and rendering separate
5. **Use events** for loose coupling between systems
6. **Performance monitoring** in development builds
7. **State machines** for complex character behavior
8. **Type-safe events** for better developer experience

## Common Pitfalls

1. **Forgetting to call `update()`** in the animation loop
2. **Not checking `isLocked`** before applying movement
3. **Creating new Vector3 instances** every frame (reuse them)
4. **Not disposing** the controller on cleanup
5. **Hardcoded delta time** instead of using actual frame delta
6. **Missing domElement parameter** in r180 (will throw error)
