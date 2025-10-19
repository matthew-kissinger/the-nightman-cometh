# Official Three.js Rapier Character Controller Example

**Source URL**: https://threejs.org/examples/physics_rapier_character_controller.html
**GitHub Source**: https://github.com/mrdoob/three.js/tree/dev/examples
**Date**: 2024 (Part of Three.js r180 release - December 2024)
**Rapier Version**: Compatible with @dimforge/rapier3d-compat 0.14.x - 0.19.x
**Three.js Version**: r180 (0.180.0)
**License**: MIT License

## Overview

Three.js includes an official character controller example using Rapier3D physics. This example demonstrates a kinematic character controller with WASD/Arrow key movement and proper collision handling.

## Key Implementation Patterns

### 1. **RapierPhysics Helper Integration**

Three.js provides a `RapierPhysics.js` helper module located at:
- `three/addons/physics/RapierPhysics.js`
- `examples/jsm/physics/RapierPhysics.js`

This helper wraps the Rapier WASM physics engine and provides:
- Automatic physics world initialization
- Mesh-to-collider mapping
- Simplified API for common physics operations

### 2. **Character Controller Setup**

The character controller uses Rapier's `KinematicCharacterController` class:

```typescript
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

// Initialize Rapier
await RAPIER.init();
const physics = await RapierPhysics();

// Create character controller
const characterController = physics.world.createCharacterController(0.01);

// Configure controller properties
characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180); // 45 degrees
characterController.setMinSlopeSlideAngle(30 * Math.PI / 180); // 30 degrees
characterController.enableAutostep(0.5, 0.2, true); // maxStepHeight, minWidth, includeDynamicBodies
characterController.enableSnapToGround(0.5); // distance
```

### 3. **Movement Computation**

The core movement loop uses `computeColliderMovement()`:

```typescript
function updateCharacterMovement(delta: number) {
  // Calculate desired movement based on input
  const desiredMovement = new RAPIER.Vector3(
    moveX * speed * delta,
    velocityY * delta,
    moveZ * speed * delta
  );

  // Compute collision-aware movement
  characterController.computeColliderMovement(
    characterCollider, // The character's collider
    desiredMovement,   // Desired translation
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, // Optional filter flags
    null,              // Optional collision groups
    null               // Optional filter predicate
  );

  // Get the corrected movement
  const correctedMovement = characterController.computedMovement();

  // Apply movement to character
  const currentPos = characterRigidBody.translation();
  characterRigidBody.setNextKinematicTranslation({
    x: currentPos.x + correctedMovement.x,
    y: currentPos.y + correctedMovement.y,
    z: currentPos.z + correctedMovement.z
  });
}
```

### 4. **Collision Detection**

After computing movement, check for collisions:

```typescript
// Check if grounded
const isGrounded = characterController.computedGrounded();

// Get number of collisions
const numCollisions = characterController.numComputedCollisions();

// Iterate through collisions
for (let i = 0; i < numCollisions; i++) {
  const collision = characterController.computedCollision(i);
  // Handle collision...
}
```

### 5. **Rigid Body Setup**

Character uses a kinematic rigid body:

```typescript
// Create rigid body descriptor
const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
  .setTranslation(0, 10, 0);

const characterRigidBody = physics.world.createRigidBody(rigidBodyDesc);

// Create capsule collider for character
const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3) // halfHeight, radius
  .setTranslation(0, 1.0, 0)
  .setFriction(0.5)
  .setRestitution(0.0);

const characterCollider = physics.world.createCollider(
  colliderDesc,
  characterRigidBody
);
```

## Complete Code Example

```typescript
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

// Game state
let physics, characterController, characterRigidBody, characterCollider;
let characterMesh;
let velocityY = 0;
const gravity = -9.81;
const jumpForce = 5.0;
const moveSpeed = 5.0;

// Input state
const keys = { w: false, a: false, s: false, d: false, space: false };

async function init() {
  // Initialize Rapier physics
  await RAPIER.init();
  physics = await RapierPhysics();

  // Create character controller
  characterController = physics.world.createCharacterController(0.01);
  characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180);
  characterController.setMinSlopeSlideAngle(30 * Math.PI / 180);
  characterController.enableAutostep(0.5, 0.2, true);
  characterController.enableSnapToGround(0.5);

  // Create character rigid body (kinematic)
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, 10, 0);
  characterRigidBody = physics.world.createRigidBody(rigidBodyDesc);

  // Create character collider (capsule)
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3)
    .setTranslation(0, 1.0, 0)
    .setFriction(0.5);
  characterCollider = physics.world.createCollider(colliderDesc, characterRigidBody);

  // Create visual mesh
  const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  characterMesh = new THREE.Mesh(geometry, material);
  scene.add(characterMesh);

  // Create ground
  const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(50, 1, 50),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  );
  groundMesh.position.y = -0.5;
  scene.add(groundMesh);
  physics.addMesh(groundMesh); // Auto-creates static rigid body

  // Input listeners
  window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
  });
}

function updateCharacter(delta) {
  // Calculate movement direction
  let moveX = 0, moveZ = 0;
  if (keys.w || keys.ArrowUp) moveZ -= 1;
  if (keys.s || keys.ArrowDown) moveZ += 1;
  if (keys.a || keys.ArrowLeft) moveX -= 1;
  if (keys.d || keys.ArrowRight) moveX += 1;

  // Normalize diagonal movement
  const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (length > 0) {
    moveX /= length;
    moveZ /= length;
  }

  // Apply gravity
  velocityY += gravity * delta;

  // Jump
  if (keys.space && characterController.computedGrounded()) {
    velocityY = jumpForce;
  }

  // Compute desired movement
  const desiredMovement = new RAPIER.Vector3(
    moveX * moveSpeed * delta,
    velocityY * delta,
    moveZ * moveSpeed * delta
  );

  // Compute collision-aware movement
  characterController.computeColliderMovement(
    characterCollider,
    desiredMovement,
    RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
  );

  // Apply corrected movement
  const correctedMovement = characterController.computedMovement();
  const currentPos = characterRigidBody.translation();

  characterRigidBody.setNextKinematicTranslation({
    x: currentPos.x + correctedMovement.x,
    y: currentPos.y + correctedMovement.y,
    z: currentPos.z + correctedMovement.z
  });

  // Reset vertical velocity if grounded
  if (characterController.computedGrounded()) {
    velocityY = 0;
  }

  // Sync visual mesh with physics
  const newPos = characterRigidBody.translation();
  characterMesh.position.set(newPos.x, newPos.y, newPos.z);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update physics
  physics.world.step();

  // Update character
  updateCharacter(delta);

  renderer.render(scene, camera);
}

init().then(() => animate());
```

## Important Notes

### Version Compatibility

- **Rapier 0.14.0**: Fully compatible. All KinematicCharacterController APIs are stable.
- **Three.js r180**: The RapierPhysics helper is included and maintained in the examples.
- **@dimforge/rapier3d-compat**: Use the `-compat` variant for broader browser compatibility (includes base64-encoded WASM).

### Gotchas and Best Practices

1. **Initialization Order**: Always call `RAPIER.init()` before creating physics world or controllers.

2. **Kinematic vs Dynamic**: Character controllers require **kinematic** rigid bodies, not dynamic ones:
   ```typescript
   // Correct
   RAPIER.RigidBodyDesc.kinematicPositionBased()

   // Wrong - don't use dynamic for character controllers
   RAPIER.RigidBodyDesc.dynamic()
   ```

3. **Offset Parameter**: The character controller constructor takes an offset parameter (typically 0.01) which prevents numerical precision issues:
   ```typescript
   const characterController = world.createCharacterController(0.01);
   ```

4. **Autostep Parameters**:
   ```typescript
   enableAutostep(maxStepHeight, minStepWidth, includeDynamicBodies)
   // maxStepHeight: Maximum step height to climb (e.g., 0.5)
   // minStepWidth: Minimum step width (e.g., 0.2)
   // includeDynamicBodies: Whether to step over dynamic objects
   ```

5. **Gravity Handling**: Character controllers don't automatically apply gravity - you must implement it manually:
   ```typescript
   velocityY += gravity * delta;
   desiredMovement.y = velocityY * delta;
   ```

6. **Ground Detection**: Use `computedGrounded()` to check if the character is on the ground:
   ```typescript
   if (characterController.computedGrounded()) {
     // Character is on ground - can jump
   }
   ```

7. **Collision Filtering**: Use QueryFilterFlags to exclude certain colliders:
   ```typescript
   RAPIER.QueryFilterFlags.EXCLUDE_SENSORS      // Ignore sensors
   RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC      // Ignore dynamic bodies
   RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC    // Ignore kinematic bodies
   RAPIER.QueryFilterFlags.EXCLUDE_FIXED        // Ignore fixed bodies
   ```

8. **Performance**: For games with many characters, consider using instancing and batching:
   ```typescript
   // The physics_rapier_instancing.html example shows this approach
   ```

### Breaking Changes from Older Versions

If migrating from pre-0.14 versions:

- **API Naming**: `BodyStatus` was renamed to `RigidBodyType` in 0.11+
- **Initialization**: Newer versions require `await RAPIER.init()` before use
- **Character Controller**: The API has been stable since 0.11, no breaking changes in 0.14

### Common Issues

**Issue**: Character falls through ground
**Solution**: Ensure physics world is stepped before character update, and check collider sizes

**Issue**: Character stutters or gets stuck
**Solution**: Increase the offset parameter or adjust step height settings

**Issue**: Character can't climb slopes
**Solution**: Adjust `setMaxSlopeClimbAngle()` to allow steeper slopes

## Related Examples

- `physics_rapier_instancing.html` - Shows how to create many physics objects efficiently
- `physics_rapier_vehicle_controller.html` - Vehicle physics with Rapier
- `physics_rapier_joints.html` - Joint constraints
- `physics_rapier_terrain.html` - Heightfield terrain collision

## Additional Resources

- Three.js RapierPhysics source: https://github.com/mrdoob/three.js/tree/dev/examples/jsm/physics
- Official Rapier docs: https://rapier.rs/docs/user_guides/javascript/character_controller/
- Three.js examples: https://threejs.org/examples/
