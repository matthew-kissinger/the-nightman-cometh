# Community Rapier Character Controller Examples (2024-2025)

**Date**: 2024-2025 (Latest community examples)
**Rapier Version**: 0.13.x - 0.19.x (0.14.0 compatible)
**Three.js Version**: r150 - r180
**License**: Various (see individual projects)

## Overview

This document compiles recent community examples of Rapier3D character controllers with Three.js. These examples demonstrate real-world implementations and advanced techniques.

---

## Example 1: doppl3r/kinematic-character-controller-example

**Source URL**: https://github.com/doppl3r/kinematic-character-controller-example
**Date**: 2024 (Actively maintained)
**Rapier Version**: @dimforge/rapier3d-compat compatible
**Three.js Version**: Compatible with modern Three.js versions
**License**: MIT (requires attribution for 3D assets)

### Overview

A complete example demonstrating kinematic character controllers for players, NPCs, elevators, and moving platforms. Features interpolation between physics and graphics loops for smooth rendering.

### Key Implementation Patterns

#### 1. **Entity-Based Architecture**

```typescript
// EntityControllerKinematic.js - Input controller for kinematic bodies
class EntityControllerKinematic {
  constructor(entity, speed = 5.0) {
    this.entity = entity;
    this.speed = speed;
    this.moveDirection = new THREE.Vector3();
    this.characterController = null;
  }

  init(world) {
    // Create character controller
    this.characterController = world.createCharacterController(0.01);

    // Configure for player
    this.characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    this.characterController.enableAutostep(0.5, 0.2, true);
    this.characterController.enableSnapToGround(0.5);
  }

  update(delta, input) {
    // Process input
    this.moveDirection.set(0, 0, 0);

    if (input.keys.w) this.moveDirection.z -= 1;
    if (input.keys.s) this.moveDirection.z += 1;
    if (input.keys.a) this.moveDirection.x -= 1;
    if (input.keys.d) this.moveDirection.x += 1;

    // Normalize
    if (this.moveDirection.length() > 0) {
      this.moveDirection.normalize();
    }

    // Apply to entity
    this.entity.velocity.x = this.moveDirection.x * this.speed;
    this.entity.velocity.z = this.moveDirection.z * this.speed;

    // Compute movement with character controller
    this.computeMovement(delta);
  }

  computeMovement(delta) {
    const desiredMovement = {
      x: this.entity.velocity.x * delta,
      y: this.entity.velocity.y * delta,
      z: this.entity.velocity.z * delta
    };

    this.characterController.computeColliderMovement(
      this.entity.collider,
      desiredMovement
    );

    const correctedMovement = this.characterController.computedMovement();

    // Apply to rigid body
    const pos = this.entity.rigidBody.translation();
    this.entity.rigidBody.setNextKinematicTranslation({
      x: pos.x + correctedMovement.x,
      y: pos.y + correctedMovement.y,
      z: pos.z + correctedMovement.z
    });
  }
}
```

#### 2. **Entity Factory Pattern**

```typescript
// EntityFactory.js - Creates entities with physics and rendering
class EntityFactory {
  static createPlayer(world, scene, position) {
    // Create rigid body
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    const rigidBody = world.createRigidBody(rigidBodyDesc);

    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3)
      .setFriction(0.5);
    const collider = world.createCollider(colliderDesc, rigidBody);

    // Create visual mesh
    const geometry = new THREE.CapsuleGeometry(0.3, 1.0);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    // Create entity
    const entity = {
      rigidBody,
      collider,
      mesh,
      velocity: new THREE.Vector3(0, 0, 0),
      controller: null
    };

    // Add controller
    entity.controller = new EntityControllerKinematic(entity);
    entity.controller.init(world);

    return entity;
  }

  static createMovingPlatform(world, scene, position, path) {
    // Create kinematic platform that follows a path
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
      .setTranslation(position.x, position.y, position.z);
    const rigidBody = world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(2, 0.2, 2);
    const collider = world.createCollider(colliderDesc, rigidBody);

    const geometry = new THREE.BoxGeometry(4, 0.4, 4);
    const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);

    return { rigidBody, collider, mesh, path, pathIndex: 0 };
  }
}
```

#### 3. **Interpolation for Smooth Rendering**

```typescript
// Game.js - Main game loop with physics/render separation
class Game {
  constructor() {
    this.physicsTimeStep = 1 / 60; // 60 FPS physics
    this.accumulator = 0;
    this.entities = [];
  }

  update(deltaTime) {
    this.accumulator += deltaTime;

    // Fixed timestep physics updates
    while (this.accumulator >= this.physicsTimeStep) {
      this.updatePhysics(this.physicsTimeStep);
      this.accumulator -= this.physicsTimeStep;
    }

    // Interpolate for smooth rendering
    const alpha = this.accumulator / this.physicsTimeStep;
    this.interpolateEntities(alpha);
  }

  updatePhysics(delta) {
    // Update controllers
    this.entities.forEach(entity => {
      if (entity.controller) {
        entity.controller.update(delta, this.input);
      }
    });

    // Step physics world
    this.world.step();
  }

  interpolateEntities(alpha) {
    this.entities.forEach(entity => {
      // Get current and previous positions
      const currentPos = entity.rigidBody.translation();
      const prevPos = entity.previousPosition || currentPos;

      // Interpolate
      entity.mesh.position.lerpVectors(
        new THREE.Vector3(prevPos.x, prevPos.y, prevPos.z),
        new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
        alpha
      );

      // Store for next frame
      entity.previousPosition = { ...currentPos };
    });
  }
}
```

### Key Features

- **Component-based architecture**: Entities have separate physics, rendering, and controller components
- **Fixed timestep physics**: Physics runs at constant 60 FPS, rendering interpolates
- **Moving platforms**: Demonstrates platforms that carry the player
- **Asset management**: Includes system for loading and managing 3D models
- **Collision events**: System for detecting and handling collisions

---

## Example 2: icurtis1/fps-sample-project

**Source URL**: https://github.com/icurtis1/fps-sample-project
**Date**: 2024 (Active development)
**Rapier Version**: @dimforge/rapier3d-compat (latest)
**Three.js Version**: r150+
**License**: MIT

### Overview

A modern first-person shooter character controller using React Three Fiber and Rapier physics. Features smooth movement, gamepad support, and physics-based projectiles.

### Key Implementation Patterns

#### 1. **React Three Fiber Integration**

```typescript
// Player.tsx - First-person character controller
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';

export function Player() {
  const playerRef = useRef<RigidBody>(null);
  const [, getKeys] = useKeyboardControls();

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    const { forward, backward, left, right, jump } = getKeys();

    // Calculate movement direction
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(backward) - Number(forward));
    const sideVector = new THREE.Vector3(Number(left) - Number(right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(5.0);

    // Apply movement
    const velocity = playerRef.current.linvel();
    playerRef.current.setLinvel({
      x: direction.x,
      y: velocity.y,
      z: direction.z
    }, true);

    // Jump
    if (jump && Math.abs(velocity.y) < 0.1) {
      playerRef.current.setLinvel({
        x: velocity.x,
        y: 5.0,
        z: velocity.z
      }, true);
    }

    // Update camera position
    const position = playerRef.current.translation();
    state.camera.position.set(position.x, position.y + 0.5, position.z);
  });

  return (
    <RigidBody
      ref={playerRef}
      type="dynamic"
      position={[0, 5, 0]}
      enabledRotations={[false, true, false]} // Only rotate around Y axis
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.5, 0.3]} />
    </RigidBody>
  );
}
```

#### 2. **Physics-Based Projectiles**

```typescript
// Ball.tsx - Physics projectile
import { useRef } from 'react';
import { RigidBody, BallCollider } from '@react-three/rapier';

export function Ball({ position, velocity }) {
  const ballRef = useRef<RigidBody>(null);

  return (
    <RigidBody
      ref={ballRef}
      position={position}
      linearVelocity={velocity}
      mass={1.0}
    >
      <BallCollider args={[0.2]} />
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </RigidBody>
  );
}
```

#### 3. **Gamepad Support**

```typescript
// useGamepad.ts - Gamepad input hook
import { useEffect, useState } from 'react';

export function useGamepad() {
  const [gamepad, setGamepad] = useState<Gamepad | null>(null);

  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      setGamepad(e.gamepad);
    };

    const handleGamepadDisconnected = () => {
      setGamepad(null);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  return gamepad;
}

// In Player component
const gamepad = useGamepad();

useFrame(() => {
  if (gamepad) {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[gamepad.index];

    if (gp) {
      const leftStickX = gp.axes[0];
      const leftStickY = gp.axes[1];

      // Apply movement from gamepad
      direction.set(leftStickX, 0, leftStickY);
    }
  }
});
```

### Key Features

- **React Three Fiber**: Declarative 3D with React
- **Gamepad support**: Full controller support for FPS controls
- **Dynamic rigid body**: Uses dynamic instead of kinematic for more realistic physics
- **Linear damping**: Provides smooth deceleration
- **Rotation locking**: Prevents character from tipping over

---

## Example 3: viridia/demo-rapier-three

**Source URL**: https://github.com/viridia/demo-rapier-three
**Date**: 2024
**Rapier Version**: @dimforge/rapier3d-compat 0.13+
**Three.js Version**: r160+
**License**: MIT

### Overview

Clean demonstration of Rapier physics with Three.js, written in TypeScript with Vite. Shows best practices for integrating physics with rendering.

### Key Implementation Patterns

#### 1. **TypeScript Setup**

```typescript
// types.ts - Type definitions for physics objects
import type * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';

export interface PhysicsObject {
  mesh: THREE.Mesh;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

export interface CharacterState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  grounded: boolean;
  jumping: boolean;
}
```

#### 2. **Physics Manager Class**

```typescript
// PhysicsManager.ts
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class PhysicsManager {
  world: RAPIER.World;
  objects: PhysicsObject[] = [];
  characterController: RAPIER.KinematicCharacterController | null = null;

  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  createCharacterController(): RAPIER.KinematicCharacterController {
    const controller = this.world.createCharacterController(0.01);
    controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    controller.enableAutostep(0.5, 0.2, true);
    controller.enableSnapToGround(0.5);
    this.characterController = controller;
    return controller;
  }

  createDynamicBox(
    position: THREE.Vector3,
    size: THREE.Vector3,
    mesh: THREE.Mesh
  ): PhysicsObject {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z);
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      size.x / 2,
      size.y / 2,
      size.z / 2
    );
    const collider = this.world.createCollider(colliderDesc, rigidBody);

    const obj: PhysicsObject = { mesh, rigidBody, collider };
    this.objects.push(obj);
    return obj;
  }

  step(deltaTime: number) {
    this.world.step();

    // Sync meshes with physics
    this.objects.forEach(obj => {
      const pos = obj.rigidBody.translation();
      const rot = obj.rigidBody.rotation();

      obj.mesh.position.set(pos.x, pos.y, pos.z);
      obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });
  }

  cleanup() {
    this.world.free();
  }
}
```

#### 3. **Character Controller Integration**

```typescript
// Character.ts
export class Character {
  physics: PhysicsManager;
  mesh: THREE.Mesh;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  state: CharacterState;

  constructor(physics: PhysicsManager, scene: THREE.Scene) {
    this.physics = physics;
    this.state = {
      position: new THREE.Vector3(0, 5, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      grounded: false,
      jumping: false
    };

    this.createMesh(scene);
    this.createPhysics();
  }

  createMesh(scene: THREE.Scene) {
    const geometry = new THREE.CapsuleGeometry(0.3, 1.0);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  createPhysics() {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(
        this.state.position.x,
        this.state.position.y,
        this.state.position.z
      );
    this.rigidBody = this.physics.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3);
    this.collider = this.physics.world.createCollider(
      colliderDesc,
      this.rigidBody
    );

    this.controller = this.physics.createCharacterController();
  }

  update(deltaTime: number, input: { x: number; z: number }) {
    // Apply gravity
    this.state.velocity.y += -9.81 * deltaTime;

    // Calculate movement
    const moveX = input.x * 5.0 * deltaTime;
    const moveZ = input.z * 5.0 * deltaTime;
    const moveY = this.state.velocity.y * deltaTime;

    // Compute with controller
    const desiredMovement = { x: moveX, y: moveY, z: moveZ };

    this.controller.computeColliderMovement(
      this.collider,
      desiredMovement
    );

    const correctedMovement = this.controller.computedMovement();
    const currentPos = this.rigidBody.translation();

    this.rigidBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    });

    // Update state
    this.state.grounded = this.controller.computedGrounded();
    if (this.state.grounded) {
      this.state.velocity.y = 0;
    }

    // Sync mesh
    const newPos = this.rigidBody.translation();
    this.mesh.position.set(newPos.x, newPos.y, newPos.z);
  }

  jump(force: number = 5.0) {
    if (this.state.grounded && !this.state.jumping) {
      this.state.velocity.y = force;
      this.state.jumping = true;

      // Reset jump flag after delay
      setTimeout(() => {
        this.state.jumping = false;
      }, 200);
    }
  }
}
```

### Key Features

- **TypeScript throughout**: Full type safety
- **Clean separation**: Physics manager handles all Rapier interactions
- **Proper cleanup**: Memory management with `world.free()`
- **State management**: Explicit character state tracking
- **Vite bundler**: Fast development with HMR

---

## Comparison Table

| Feature | doppl3r | icurtis1 | viridia |
|---------|---------|----------|---------|
| Architecture | Entity-Component | React Hooks | Class-based |
| Renderer | Vanilla Three.js | React Three Fiber | Vanilla Three.js |
| Physics Body | Kinematic | Dynamic | Kinematic |
| Timestep | Fixed with interpolation | Variable | Variable |
| Language | JavaScript | TypeScript/JSX | TypeScript |
| Complexity | Medium | Low | Low |
| Best For | Games with many entities | React projects | Learning/Prototyping |

## Common Patterns Across Examples

### 1. **Initialization Pattern**

```typescript
// All examples follow this initialization order:
async function init() {
  // 1. Initialize Rapier
  await RAPIER.init();

  // 2. Create world
  const world = new RAPIER.World(gravity);

  // 3. Create character controller
  const controller = world.createCharacterController(offset);

  // 4. Configure controller
  controller.setMaxSlopeClimbAngle(angle);
  controller.enableAutostep(height, width, dynamic);

  // 5. Create rigid bodies and colliders
  // ...
}
```

### 2. **Update Pattern**

```typescript
// Standard update loop:
function update(delta) {
  // 1. Process input
  const input = getInput();

  // 2. Calculate desired movement
  const desiredMovement = calculateMovement(input, delta);

  // 3. Compute collision-aware movement
  controller.computeColliderMovement(collider, desiredMovement);
  const corrected = controller.computedMovement();

  // 4. Apply to rigid body
  applyMovement(rigidBody, corrected);

  // 5. Step physics world
  world.step();

  // 6. Sync visuals with physics
  syncMeshes();
}
```

### 3. **Capsule Collider Pattern**

```typescript
// All examples use capsule colliders for characters:
const colliderDesc = RAPIER.ColliderDesc.capsule(
  halfHeight,  // 0.5 - height from center to top/bottom (excluding caps)
  radius       // 0.3 - radius of the caps
);
```

## Version Compatibility Notes

### Rapier 0.14.0 Specific

- All examples are compatible with 0.14.0
- No breaking changes from 0.11 to 0.19
- Character controller API is stable

### Three.js r180 Compatibility

- All patterns work with r180
- Use `three/addons/*` imports (not `three/examples/jsm/*`)
- React Three Fiber uses Three.js r180 by default in latest versions

### Package Recommendations

For maximum compatibility with these examples:

```json
{
  "dependencies": {
    "three": "^0.180.0",
    "@dimforge/rapier3d-compat": "^0.14.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/rapier": "^1.3.0"
  }
}
```

## Additional Resources

- doppl3r repository: https://github.com/doppl3r/kinematic-character-controller-example
- icurtis1 FPS project: https://github.com/icurtis1/fps-sample-project
- icurtis1 3rd-person project: https://github.com/icurtis1/character-controller-sample-project
- viridia demo: https://github.com/viridia/demo-rapier-three
- react-three-rapier: https://github.com/pmndrs/react-three-rapier
