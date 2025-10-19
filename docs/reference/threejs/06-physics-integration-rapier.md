# PointerLockControls + Rapier Physics Integration (r180)

**Three.js Version**: r180 / 0.180.0
**Rapier Version**: 0.14.0+
**Date**: 2024-2025
**Language**: TypeScript

## Overview

This guide demonstrates how to integrate PointerLockControls with Rapier physics engine for production-quality first-person games. Rapier provides realistic physics simulation while maintaining high performance.

## Why Rapier?

| Feature | Rapier | Cannon.js | Ammo.js |
|---------|--------|-----------|---------|
| **Performance** | Excellent (Rust/WASM) | Good | Good |
| **Bundle Size** | Small (~500KB) | Medium | Large (>1MB) |
| **Active Development** | ✅ Active | ⚠️ Maintenance | ⚠️ Slow |
| **TypeScript Support** | ✅ Native | ⚠️ Types available | ⚠️ Limited |
| **Character Controllers** | ✅ Built-in | ❌ Manual | ❌ Manual |
| **Documentation** | ✅ Excellent | ⚠️ Good | ⚠️ Limited |

## Installation

```bash
npm install @dimforge/rapier3d-compat
npm install three@^0.180.0
```

**Note**: Use `rapier3d-compat` for better browser compatibility.

## Complete Implementation

```typescript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Configuration for physics-based FPS controller
 */
interface PhysicsControllerConfig {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  world: RAPIER.World;

  // Player settings
  playerHeight?: number;
  playerRadius?: number;
  playerMass?: number;

  // Movement settings
  moveSpeed?: number;
  sprintMultiplier?: number;
  jumpVelocity?: number;

  // Physics settings
  characterOffset?: number;
  minSlopeSlideAngle?: number;
  maxSlopeClimbAngle?: number;

  // Mouse settings
  mouseSensitivity?: number;
}

/**
 * First-person controller with Rapier physics integration
 */
export class RapierFPSController {
  // Three.js
  private camera: THREE.PerspectiveCamera;
  public controls: PointerLockControls;

  // Rapier physics
  private world: RAPIER.World;
  private characterController: RAPIER.KinematicCharacterController;
  private characterBody: RAPIER.RigidBody;
  private characterCollider: RAPIER.Collider;

  // Configuration
  private readonly playerHeight: number;
  private readonly playerRadius: number;
  private readonly moveSpeed: number;
  private readonly sprintMultiplier: number;
  private readonly jumpVelocity: number;

  // Movement state
  private movement = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  };

  // Physics state
  private velocity = new THREE.Vector3();
  private isGrounded = false;

  // Helpers
  private direction = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();

  // Event handlers
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;

  constructor(config: PhysicsControllerConfig) {
    // Store references
    this.camera = config.camera;
    this.world = config.world;

    // Initialize controls
    this.controls = new PointerLockControls(config.camera, config.domElement);
    this.controls.pointerSpeed = config.mouseSensitivity ?? 1.0;

    // Configuration
    this.playerHeight = config.playerHeight ?? 1.8;
    this.playerRadius = config.playerRadius ?? 0.35;
    this.moveSpeed = config.moveSpeed ?? 8.0;
    this.sprintMultiplier = config.sprintMultiplier ?? 1.6;
    this.jumpVelocity = config.jumpVelocity ?? 8.0;

    // Create physics character
    this.createCharacter(config);

    // Set up event listeners
    this.keydownHandler = (e) => this.onKeyDown(e);
    this.keyupHandler = (e) => this.onKeyUp(e);
    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
  }

  /**
   * Create Rapier character controller and rigid body
   */
  private createCharacter(config: PhysicsControllerConfig): void {
    // Create kinematic rigid body for the character
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, this.playerHeight / 2, 0);

    this.characterBody = this.world.createRigidBody(rigidBodyDesc);

    // Create capsule collider
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      this.playerHeight / 2 - this.playerRadius,
      this.playerRadius
    )
      .setTranslation(0, this.playerHeight / 2, 0)
      .setFriction(0.0)
      .setRestitution(0.0);

    this.characterCollider = this.world.createCollider(
      colliderDesc,
      this.characterBody
    );

    // Create character controller
    this.characterController = this.world.createCharacterController(
      config.characterOffset ?? 0.01
    );

    // Configure character controller
    this.characterController.enableAutostep(
      0.5, // Max step height
      0.2, // Min step width
      true // Enable step over dynamic bodies
    );

    this.characterController.enableSnapToGround(0.5);

    this.characterController.setMinSlopeSlideAngle(
      config.minSlopeSlideAngle ?? 45 * (Math.PI / 180)
    );

    this.characterController.setMaxSlopeClimbAngle(
      config.maxSlopeClimbAngle ?? 45 * (Math.PI / 180)
    );

    // Apply slide only on steep slopes
    this.characterController.setSlideEnabled(true);
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.movement.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.movement.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.movement.left = true;
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

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.movement.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.movement.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.movement.left = false;
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
   * Update controller (call in animation loop before physics step)
   */
  public update(deltaTime: number): void {
    if (!this.controls.isLocked) return;

    // Calculate movement vectors from camera orientation
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();

    this.right.crossVectors(this.forward, this.camera.up);
    this.right.normalize();

    // Calculate desired velocity
    this.direction.set(0, 0, 0);

    if (this.movement.forward) this.direction.add(this.forward);
    if (this.movement.backward) this.direction.sub(this.forward);
    if (this.movement.right) this.direction.add(this.right);
    if (this.movement.left) this.direction.sub(this.right);

    // Normalize to prevent faster diagonal movement
    if (this.direction.length() > 0) {
      this.direction.normalize();
    }

    // Apply speed
    const speed = this.moveSpeed * (this.movement.sprint ? this.sprintMultiplier : 1.0);
    this.velocity.x = this.direction.x * speed;
    this.velocity.z = this.direction.z * speed;

    // Handle jumping
    if (this.movement.jump && this.isGrounded) {
      this.velocity.y = this.jumpVelocity;
    }

    // Apply gravity if not grounded
    if (!this.isGrounded) {
      this.velocity.y -= 25.0 * deltaTime; // Gravity
    }

    // Calculate desired movement
    const desiredMovement = {
      x: this.velocity.x * deltaTime,
      y: this.velocity.y * deltaTime,
      z: this.velocity.z * deltaTime,
    };

    // Compute collider movement with Rapier
    this.characterController.computeColliderMovement(
      this.characterCollider,
      desiredMovement
    );

    // Get the corrected movement
    const correctedMovement = this.characterController.computedMovement();

    // Get current position
    const currentPos = this.characterBody.translation();

    // Apply corrected movement
    this.characterBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z,
    });

    // Check if grounded
    this.isGrounded = this.characterController.computedGrounded();

    // If grounded, reset vertical velocity
    if (this.isGrounded && this.velocity.y < 0) {
      this.velocity.y = 0;
    }
  }

  /**
   * Sync camera position with physics body (call after physics step)
   */
  public syncCamera(): void {
    const translation = this.characterBody.translation();

    // Position camera at eye level
    this.camera.position.set(
      translation.x,
      translation.y + this.playerHeight * 0.8, // Eye level
      translation.z
    );
  }

  /**
   * Set player spawn position
   */
  public setPosition(x: number, y: number, z: number): void {
    this.characterBody.setTranslation({ x, y, z }, true);
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  /**
   * Get player position
   */
  public getPosition(): THREE.Vector3 {
    const pos = this.characterBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  /**
   * Get player velocity
   */
  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  /**
   * Check if player is grounded
   */
  public get grounded(): boolean {
    return this.isGrounded;
  }

  /**
   * Lock controls
   */
  public lock(): void {
    this.controls.lock();
  }

  /**
   * Unlock controls
   */
  public unlock(): void {
    this.controls.unlock();
  }

  /**
   * Get lock state
   */
  public get isLocked(): boolean {
    return this.controls.isLocked;
  }

  /**
   * Clean up
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
    this.controls.dispose();

    // Clean up Rapier objects
    this.world.removeRigidBody(this.characterBody);
    this.world.removeCharacterController(this.characterController);
  }
}
```

## Usage Example

```typescript
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierFPSController } from './RapierFPSController';

// Wait for Rapier to initialize
await RAPIER.init();

// Create physics world
const gravity = { x: 0.0, y: -9.81, z: 0.0 };
const world = new RAPIER.World(gravity);

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
const controller = new RapierFPSController({
  camera,
  domElement: document.body,
  world,
  playerHeight: 1.8,
  playerRadius: 0.35,
  moveSpeed: 8.0,
  sprintMultiplier: 1.6,
  jumpVelocity: 8.0,
});

// Create ground
const groundGeometry = new THREE.BoxGeometry(100, 1, 100);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

// Create physics ground
const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
  .setTranslation(0, -0.5, 0);
const groundBody = world.createRigidBody(groundBodyDesc);

const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
world.createCollider(groundColliderDesc, groundBody);

// Create some boxes
const boxes: Array<{ mesh: THREE.Mesh; body: RAPIER.RigidBody }> = [];

for (let i = 0; i < 10; i++) {
  const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: Math.random() * 0xffffff,
  });
  const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;

  const x = (Math.random() - 0.5) * 20;
  const y = 5 + i * 3;
  const z = (Math.random() - 0.5) * 20;

  boxMesh.position.set(x, y, z);
  scene.add(boxMesh);

  // Create physics body
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z);
  const body = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1)
    .setRestitution(0.3)
    .setFriction(0.8);
  world.createCollider(colliderDesc, body);

  boxes.push({ mesh: boxMesh, body });
}

// Set spawn position
controller.setPosition(0, 5, 10);

// UI
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

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  // Update controller BEFORE physics step
  controller.update(delta);

  // Step physics simulation
  world.step();

  // Sync camera AFTER physics step
  controller.syncCamera();

  // Sync dynamic objects
  boxes.forEach(({ mesh, body }) => {
    const position = body.translation();
    const rotation = body.rotation();

    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  });

  renderer.render(scene, camera);
}

animate();
```

## Advanced Features

### 1. Custom Collision Handling

```typescript
/**
 * Extended controller with collision events
 */
export class AdvancedRapierController extends RapierFPSController {
  private collisionEvents: Array<{ entity: RAPIER.Collider; started: boolean }> = [];

  public override update(deltaTime: number): void {
    super.update(deltaTime);

    // Check for collisions
    this.world.contactPairsWith(this.characterCollider, (otherCollider) => {
      console.log('Collision with:', otherCollider.parent()?.userData);

      // Handle collision
      this.onCollision(otherCollider);
    });
  }

  private onCollision(collider: RAPIER.Collider): void {
    // Custom collision logic
    const userData = collider.parent()?.userData;

    if (userData?.type === 'pickup') {
      // Collect item
    } else if (userData?.type === 'damage') {
      // Take damage
    }
  }
}
```

### 2. Slope Handling

```typescript
/**
 * Configure slope climbing behavior
 */
controller.characterController.setMaxSlopeClimbAngle(45 * (Math.PI / 180));
controller.characterController.setMinSlopeSlideAngle(50 * (Math.PI / 180));

// Enable/disable sliding on slopes
controller.characterController.setSlideEnabled(true);
```

### 3. Step Over Objects

```typescript
/**
 * Configure automatic step-over for stairs/curbs
 */
controller.characterController.enableAutostep(
  0.5,  // Max height to step over
  0.2,  // Min width of step
  true  // Enable step over dynamic bodies
);
```

### 4. Snap to Ground

```typescript
/**
 * Keep character snapped to ground on slopes
 */
controller.characterController.enableSnapToGround(0.5);
```

### 5. Custom Gravity

```typescript
/**
 * Apply custom gravity or zero-gravity zones
 */
class ZeroGravityController extends RapierFPSController {
  private inZeroGravity = false;

  public setZeroGravity(enabled: boolean): void {
    this.inZeroGravity = enabled;
  }

  public override update(deltaTime: number): void {
    // Custom gravity logic
    if (this.inZeroGravity) {
      // No gravity, allow flying
      if (this.movement.jump) {
        this.velocity.y = 5.0;
      } else if (this.movement.sprint) {
        this.velocity.y = -5.0;
      } else {
        this.velocity.y *= 0.9; // Damping
      }
    }

    super.update(deltaTime);
  }
}
```

## Performance Optimization

### 1. Fixed Timestep

```typescript
const FIXED_TIMESTEP = 1 / 60;
let accumulator = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  accumulator += delta;

  // Fixed timestep for physics
  while (accumulator >= FIXED_TIMESTEP) {
    controller.update(FIXED_TIMESTEP);
    world.step();
    accumulator -= FIXED_TIMESTEP;
  }

  // Sync camera
  controller.syncCamera();

  renderer.render(scene, camera);
}
```

### 2. Sleep Inactive Bodies

```typescript
// Enable sleeping for better performance
const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setCanSleep(true)
  .setTranslation(x, y, z);
```

### 3. Collision Groups

```typescript
// Define collision groups
const PLAYER_GROUP = 0x0001;
const ENVIRONMENT_GROUP = 0x0002;
const ENEMY_GROUP = 0x0004;

// Set collision groups for player
const playerColliderDesc = RAPIER.ColliderDesc.capsule(height, radius)
  .setCollisionGroups(PLAYER_GROUP | ENVIRONMENT_GROUP | ENEMY_GROUP);

// Environment only collides with player
const environmentColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.5, 50)
  .setCollisionGroups(ENVIRONMENT_GROUP | PLAYER_GROUP);
```

## Debugging

### Visualize Physics Bodies

```typescript
import { RapierDebugRenderer } from './RapierDebugRenderer';

const debugRenderer = new RapierDebugRenderer(scene, world);

function animate() {
  // ... physics update ...

  debugRenderer.update();

  renderer.render(scene, camera);
}
```

### Debug Renderer Implementation

```typescript
export class RapierDebugRenderer {
  private debugMesh: THREE.LineSegments;

  constructor(
    private scene: THREE.Scene,
    private world: RAPIER.World
  ) {
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 1,
    });

    this.debugMesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      material
    );

    this.scene.add(this.debugMesh);
  }

  update(): void {
    const buffers = this.world.debugRender();

    this.debugMesh.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(buffers.vertices, 3)
    );

    this.debugMesh.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(buffers.colors, 4)
    );
  }

  dispose(): void {
    this.scene.remove(this.debugMesh);
    this.debugMesh.geometry.dispose();
  }
}
```

## Common Issues

**Issue**: Character falls through floor
- **Solution**: Ensure physics bodies are created before character, use fixed timestep

**Issue**: Jittery movement
- **Solution**: Use fixed timestep, clamp delta time, increase substeps

**Issue**: Character gets stuck
- **Solution**: Adjust character offset, check collision groups, enable autostep

**Issue**: Can't climb slopes
- **Solution**: Increase `maxSlopeClimbAngle`, enable autostep

## Best Practices

1. **Fixed timestep** for deterministic physics
2. **Collision groups** to filter unnecessary collision checks
3. **Sleep inactive bodies** for better performance
4. **Character controller** instead of manual kinematic movement
5. **Separate update and sync** - update before physics step, sync after

## Related Resources

- Rapier Docs: https://rapier.rs/docs/
- Character Controller: https://rapier.rs/docs/user_guides/javascript/character_controller
- three-rapier: https://github.com/pmndrs/three-rapier (React)
