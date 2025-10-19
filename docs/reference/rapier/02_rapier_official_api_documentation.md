# Rapier Official API Documentation - KinematicCharacterController

**Source URL**: https://rapier.rs/javascript3d/classes/KinematicCharacterController.html
**Documentation**: https://rapier.rs/docs/user_guides/javascript/character_controller/
**Date**: 2024 (Latest documentation for Rapier JavaScript bindings)
**Rapier Version**: v0.14.0 compatible (documentation applies to 0.11.x - 0.19.x)
**Three.js Version**: Framework-agnostic (works with any 3D renderer)
**License**: Apache-2.0

## Overview

The `KinematicCharacterController` is Rapier's official solution for character movement. It handles collision detection, sliding, stair climbing, and slope handling automatically.

## Key Implementation Patterns

### 1. **Character Controller Creation**

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

// Initialize Rapier
await RAPIER.init();

// Create physics world
const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

// Create character controller with offset
const offset = 0.01; // Small gap for numerical stability
const characterController = world.createCharacterController(offset);
```

**Offset Parameter**: The offset creates a small gap between the character and obstacles. This prevents numerical instability but shouldn't be too large (0.01 is recommended).

### 2. **Configuration Methods**

#### Slope Climbing
```typescript
// Set maximum slope angle the character can climb (in radians)
const maxAngle = 45 * Math.PI / 180; // 45 degrees
characterController.setMaxSlopeClimbAngle(maxAngle);

// Set minimum slope angle before character slides (in radians)
const minAngle = 30 * Math.PI / 180; // 30 degrees
characterController.setMinSlopeSlideAngle(minAngle);
```

#### Auto-stepping (Stair Climbing)
```typescript
// Enable automatic stair climbing
characterController.enableAutostep(
  maxStepHeight,         // Maximum step height (e.g., 0.5)
  minStepWidth,          // Minimum step width (e.g., 0.2)
  includeDynamicBodies   // Whether to step over dynamic objects (true/false)
);

// Disable auto-stepping
characterController.disableAutostep();
```

#### Snap to Ground
```typescript
// Enable snapping to ground when going down slopes/stairs
const snapDistance = 0.5; // Maximum distance to snap
characterController.enableSnapToGround(snapDistance);

// Disable snap to ground
characterController.disableSnapToGround();
```

#### Up Vector
```typescript
// Set the "up" direction (default is positive Y)
characterController.setUp({ x: 0.0, y: 1.0, z: 0.0 });
```

#### Character Mass (for impulse resolution)
```typescript
// Set character mass for physics interactions
const mass = 60.0; // kg
characterController.setCharacterMass(mass);
```

### 3. **Movement Computation**

The core method for character movement:

```typescript
// Define desired movement
const desiredMovement = { x: 0.0, y: -0.1, z: 0.5 };

// Compute actual movement considering collisions
characterController.computeColliderMovement(
  collider,              // The character's collider
  desiredMovement,       // Desired translation vector
  filterFlags,           // Optional: QueryFilterFlags
  filterGroups,          // Optional: Collision groups filter
  filterPredicate        // Optional: Custom filter function
);

// Get the corrected movement
const correctedMovement = characterController.computedMovement();

// Apply to rigid body
const currentPos = rigidBody.translation();
rigidBody.setNextKinematicTranslation({
  x: currentPos.x + correctedMovement.x,
  y: currentPos.y + correctedMovement.y,
  z: currentPos.z + correctedMovement.z
});
```

### 4. **Collision Information**

After calling `computeColliderMovement()`, query collision data:

```typescript
// Check if character is on the ground
const isGrounded = characterController.computedGrounded();

// Get number of collisions during last movement
const numCollisions = characterController.numComputedCollisions();

// Iterate through collisions
for (let i = 0; i < numCollisions; i++) {
  const collision = characterController.computedCollision(i);

  // Collision contains:
  // - collision.collider: The collider we hit
  // - collision.normal: Contact normal
  // - collision.toi: Time of impact
  // Use collision data for gameplay logic...
}
```

### 5. **Query Filtering**

Filter which colliders the character interacts with:

```typescript
// Import query filter flags
const { QueryFilterFlags } = RAPIER;

// Exclude sensors (triggers) from collision
characterController.computeColliderMovement(
  collider,
  desiredMovement,
  QueryFilterFlags.EXCLUDE_SENSORS
);

// Exclude dynamic bodies
characterController.computeColliderMovement(
  collider,
  desiredMovement,
  QueryFilterFlags.EXCLUDE_DYNAMIC
);

// Exclude multiple types (bitwise OR)
characterController.computeColliderMovement(
  collider,
  desiredMovement,
  QueryFilterFlags.EXCLUDE_SENSORS | QueryFilterFlags.EXCLUDE_DYNAMIC
);

// Custom filter predicate
const filterPredicate = (collider) => {
  // Return true to include, false to exclude
  const userData = collider.userData;
  return userData.type !== 'platform';
};

characterController.computeColliderMovement(
  collider,
  desiredMovement,
  null,              // No filter flags
  null,              // No filter groups
  filterPredicate    // Custom filter
);
```

## Complete Code Example

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

class CharacterController {
  world: RAPIER.World;
  characterController: RAPIER.KinematicCharacterController;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  velocity: { x: number, y: number, z: number };

  constructor() {
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  async init() {
    // Initialize Rapier
    await RAPIER.init();

    // Create world with gravity
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

    // Create character controller
    this.characterController = this.world.createCharacterController(0.01);

    // Configure controller
    this.characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    this.characterController.setMinSlopeSlideAngle(30 * Math.PI / 180);
    this.characterController.enableAutostep(0.5, 0.2, true);
    this.characterController.enableSnapToGround(0.5);
    this.characterController.setCharacterMass(60.0);

    // Create character rigid body (kinematic)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, 5, 0);
    this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Create character collider (capsule)
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3)
      .setFriction(0.5)
      .setRestitution(0.0);
    this.collider = this.world.createCollider(colliderDesc, this.rigidBody);

    // Create ground
    const groundDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, -1, 0);
    const groundBody = this.world.createRigidBody(groundDesc);

    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
    this.world.createCollider(groundColliderDesc, groundBody);
  }

  update(deltaTime: number, inputDirection: { x: number, z: number }) {
    // Apply gravity to vertical velocity
    this.velocity.y += -9.81 * deltaTime;

    // Calculate horizontal movement
    const speed = 5.0;
    const moveX = inputDirection.x * speed * deltaTime;
    const moveZ = inputDirection.z * speed * deltaTime;

    // Combine horizontal and vertical movement
    const desiredMovement = {
      x: moveX,
      y: this.velocity.y * deltaTime,
      z: moveZ
    };

    // Compute collision-aware movement
    this.characterController.computeColliderMovement(
      this.collider,
      desiredMovement,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS
    );

    // Get corrected movement
    const correctedMovement = this.characterController.computedMovement();

    // Apply movement to rigid body
    const currentPos = this.rigidBody.translation();
    this.rigidBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    });

    // Check if grounded
    if (this.characterController.computedGrounded()) {
      this.velocity.y = 0;
    }

    // Handle collisions
    const numCollisions = this.characterController.numComputedCollisions();
    for (let i = 0; i < numCollisions; i++) {
      const collision = this.characterController.computedCollision(i);
      // Process collision for gameplay logic
      console.log('Hit collider:', collision.collider.handle);
    }
  }

  jump(jumpForce: number = 5.0) {
    if (this.characterController.computedGrounded()) {
      this.velocity.y = jumpForce;
    }
  }

  step() {
    // Step the physics world
    this.world.step();
  }

  getPosition() {
    return this.rigidBody.translation();
  }

  getRotation() {
    return this.rigidBody.rotation();
  }
}

// Usage
async function main() {
  const character = new CharacterController();
  await character.init();

  // Game loop
  let lastTime = performance.now();

  function gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    // Get input (example)
    const input = {
      x: 0,  // -1 to 1
      z: -1  // -1 to 1 (moving forward)
    };

    // Update physics world
    character.step();

    // Update character
    character.update(deltaTime, input);

    // Get character position for rendering
    const position = character.getPosition();
    console.log('Character position:', position);

    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}

main();
```

## API Reference

### Constructor

```typescript
world.createCharacterController(offset: number): KinematicCharacterController
```

Creates a character controller with a small offset for numerical stability.

### Configuration Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `setMaxSlopeClimbAngle(angle)` | `angle: number` (radians) | Maximum climbable slope angle |
| `setMinSlopeSlideAngle(angle)` | `angle: number` (radians) | Minimum angle before sliding |
| `enableAutostep(maxHeight, minWidth, includeDynamic)` | `maxHeight: number`<br>`minWidth: number`<br>`includeDynamic: boolean` | Enable stair climbing |
| `disableAutostep()` | - | Disable stair climbing |
| `enableSnapToGround(distance)` | `distance: number` | Enable ground snapping |
| `disableSnapToGround()` | - | Disable ground snapping |
| `setUp(vector)` | `vector: {x, y, z}` | Set up direction |
| `setCharacterMass(mass)` | `mass: number` | Set character mass |

### Movement Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `computeColliderMovement(collider, movement, flags?, groups?, predicate?)` | `void` | Compute collision-aware movement |
| `computedMovement()` | `{x, y, z}` | Get corrected movement vector |
| `computedGrounded()` | `boolean` | Check if on ground |
| `numComputedCollisions()` | `number` | Number of collisions |
| `computedCollision(index)` | `Collision` | Get collision at index |

### Query Filter Flags

```typescript
RAPIER.QueryFilterFlags.EXCLUDE_SENSORS     // Ignore sensor colliders
RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC     // Ignore dynamic rigid bodies
RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC   // Ignore kinematic rigid bodies
RAPIER.QueryFilterFlags.EXCLUDE_FIXED       // Ignore fixed rigid bodies
RAPIER.QueryFilterFlags.ONLY_FIXED          // Only fixed rigid bodies
RAPIER.QueryFilterFlags.ONLY_KINEMATIC      // Only kinematic rigid bodies
RAPIER.QueryFilterFlags.ONLY_DYNAMIC        // Only dynamic rigid bodies
```

## Important Notes

### Version-Specific Details

**Rapier 0.14.0 Compatibility**:
- All character controller APIs are stable and unchanged from 0.11.x
- The API has been consistent since its introduction in Rapier 0.11
- No breaking changes between 0.11 - 0.19

**Three.js Integration**:
- Rapier is renderer-agnostic - works with Three.js, Babylon.js, or any 3D engine
- Only physics simulation, rendering is separate
- Use Rapier coordinates directly or convert to Three.js coordinates

### Gotchas

1. **Must Use Kinematic Bodies**: Character controllers only work with kinematic rigid bodies, not dynamic ones.

2. **Manual Gravity**: Character controllers don't apply gravity automatically - you must implement it:
   ```typescript
   velocityY += gravity * deltaTime;
   ```

3. **Offset Too Large**: If offset is too large, character will float above ground. Keep it small (0.01 - 0.1).

4. **Offset Too Small**: If offset is too small (or 0), you may experience numerical instability and jitter.

5. **Update Order**: Always call `world.step()` before character controller updates.

6. **Ground Detection**: `computedGrounded()` only returns valid data AFTER calling `computeColliderMovement()`.

7. **Collider Shape**: Use capsule colliders for best results. Box colliders can catch on edges.

8. **Slope Angles**: Angles are in radians, not degrees. Convert: `degrees * Math.PI / 180`.

### Best Practices

1. **Capsule Collider**: Use a capsule shape for the character - it prevents catching on edges:
   ```typescript
   RAPIER.ColliderDesc.capsule(halfHeight, radius)
   ```

2. **Separate Movement and Rotation**: Handle rotation separately from movement:
   ```typescript
   rigidBody.setNextKinematicTranslation(newPosition);
   rigidBody.setNextKinematicRotation(newRotation);
   ```

3. **Smooth Movement**: Interpolate between physics positions for smooth rendering:
   ```typescript
   renderPosition.lerp(physicsPosition, alpha);
   ```

4. **Velocity Clamping**: Prevent excessive falling speed:
   ```typescript
   velocityY = Math.max(velocityY, -maxFallSpeed);
   ```

5. **Input Buffering**: Buffer jump inputs to feel more responsive:
   ```typescript
   if (jumpPressed) {
     jumpBufferTime = 0.1; // 100ms buffer
   }
   ```

### Common Issues and Solutions

**Issue**: Character slides on slopes
**Solution**: Reduce `setMinSlopeSlideAngle()` or increase friction on collider

**Issue**: Character gets stuck on edges
**Solution**: Use capsule collider instead of box, or enable autostep

**Issue**: Character passes through thin walls
**Solution**: Enable CCD (Continuous Collision Detection) on collider:
```typescript
colliderDesc.setCcdEnabled(true);
```

**Issue**: Jittery movement
**Solution**: Increase offset parameter or use fixed timestep for physics

## Additional Resources

- Official Rapier Character Controller Guide: https://rapier.rs/docs/user_guides/javascript/character_controller/
- Rapier JavaScript 3D API Docs: https://rapier.rs/javascript3d/
- Rapier GitHub Repository: https://github.com/dimforge/rapier
- Rapier Discord Community: https://discord.gg/vt9DJSW
