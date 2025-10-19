# Rapier Version Migration Guide and Breaking Changes

**Date**: 2024-2025
**Rapier Versions Covered**: 0.11.x → 0.14.0 → 0.19.x
**Three.js Versions**: r160 → r180
**Source**: https://github.com/dimforge/rapier/blob/master/CHANGELOG.md

## Overview

This guide covers migration from older Rapier versions to 0.14.0 and newer, as well as Three.js compatibility updates through r180.

---

## Rapier Version History

### Version Timeline

- **0.11.x** (2022) - Character controller introduced
- **0.12.x** (2023) - Stability improvements
- **0.13.x** (2024) - Performance optimizations
- **0.14.0** (2024) - Enhanced character controller features
- **0.15.x** (2024) - Latest stable with bug fixes
- **0.16.x - 0.19.x** (2024-2025) - Current releases

### Recommended Version

For projects starting in 2024-2025:
- **Use 0.14.0 or newer** for best stability
- **Consider 0.19.x** for latest features and bug fixes
- All character controller APIs are stable from 0.11+

---

## Breaking Changes by Version

### Rapier 0.11.x → 0.12.x

#### API Renaming

**BREAKING**: `BodyStatus` renamed to `RigidBodyType`

```typescript
// OLD (0.10.x and earlier)
import RAPIER from '@dimforge/rapier3d-compat';

const bodyDesc = RAPIER.RigidBodyDesc.new(RAPIER.BodyStatus.Dynamic);

// NEW (0.11.x+)
const bodyDesc = RAPIER.RigidBodyDesc.dynamic();
```

**Migration**: Replace all `BodyStatus` references:
- `BodyStatus.Dynamic` → `RigidBodyDesc.dynamic()`
- `BodyStatus.Fixed` → `RigidBodyDesc.fixed()`
- `BodyStatus.KinematicPositionBased` → `RigidBodyDesc.kinematicPositionBased()`
- `BodyStatus.KinematicVelocityBased` → `RigidBodyDesc.kinematicVelocityBased()`

#### Initialization Changes

**BREAKING**: Async initialization required

```typescript
// OLD (0.10.x)
import RAPIER from '@dimforge/rapier3d';
const world = new RAPIER.World(...); // Immediate

// NEW (0.11.x+)
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init(); // Required!
const world = new RAPIER.World(...);
```

**Migration**: Always call `await RAPIER.init()` before using Rapier APIs.

### Rapier 0.12.x → 0.13.x

No breaking changes for character controller APIs.

**New Features**:
- Performance improvements in collision detection
- Better heightfield support
- Enhanced debug rendering

### Rapier 0.13.x → 0.14.0

No breaking changes for character controller APIs.

**New Features**:
- Improved character controller stability
- Better slope handling
- Enhanced collision filtering

**Character Controller Enhancements**:
```typescript
// New in 0.14: Better control over snap-to-ground behavior
controller.enableSnapToGround(distance);
controller.disableSnapToGround();

// Improved autostep detection
controller.enableAutostep(maxHeight, minWidth, includeDynamicBodies);
```

### Rapier 0.14.x → 0.15.x+

No breaking changes for character controller APIs.

**New Features** (0.15+):
- Additional joint types
- Improved performance for large scenes
- Better CCD (Continuous Collision Detection)

**Bug Fixes**:
- Fixed edge cases in character controller ground detection
- Improved stability on moving platforms
- Better handling of thin walls

---

## Three.js Version Compatibility

### Three.js r160 → r170

**Import Path Changes**:

```typescript
// OLD (r160 and earlier)
import { RapierPhysics } from 'three/examples/jsm/physics/RapierPhysics.js';

// NEW (r170+)
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
```

**Migration**: Update all `examples/jsm/*` imports to `addons/*`.

### Three.js r170 → r180

No breaking changes for Rapier integration.

**New in r180**:
- Updated RapierPhysics helper
- Additional physics examples
- Performance improvements

The RapierPhysics helper in Three.js r180 is fully compatible with Rapier 0.14.0+.

---

## Common Migration Scenarios

### Scenario 1: Upgrading from 0.10.x to 0.14.0

**Before** (0.10.x):
```typescript
import RAPIER from '@dimforge/rapier3d';

// Old initialization
const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

// Old body creation
const bodyDesc = RAPIER.RigidBodyDesc.new(RAPIER.BodyStatus.Dynamic);
bodyDesc.setTranslation(0, 5, 0);
const rigidBody = world.createRigidBody(bodyDesc);

// Old collider creation
const colliderDesc = RAPIER.ColliderDesc.ball(0.5);
world.createCollider(colliderDesc, rigidBody.handle);
```

**After** (0.14.0):
```typescript
import RAPIER from '@dimforge/rapier3d-compat';

// New initialization (MUST await)
await RAPIER.init();
const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

// New body creation (builder pattern)
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 5, 0);
const rigidBody = world.createRigidBody(rigidBodyDesc);

// New collider creation (direct reference)
const colliderDesc = RAPIER.ColliderDesc.ball(0.5);
world.createCollider(colliderDesc, rigidBody);
```

### Scenario 2: Adding Character Controller (New Feature)

**If you're coming from pre-0.11**:

Character controllers didn't exist. You were likely using dynamic bodies or manual kinematic control.

**Before** (manual kinematic control):
```typescript
const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
const body = world.createRigidBody(bodyDesc);

// Manual movement without collision handling
function update(delta) {
  const newPos = calculateNewPosition(delta);
  body.setNextKinematicTranslation(newPos);
}
```

**After** (with character controller):
```typescript
const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
const body = world.createRigidBody(bodyDesc);

const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3);
const collider = world.createCollider(colliderDesc, body);

// Create character controller
const controller = world.createCharacterController(0.01);
controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
controller.enableAutostep(0.5, 0.2, true);

// Automatic collision handling
function update(delta) {
  const desiredMovement = calculateMovement(delta);

  controller.computeColliderMovement(collider, desiredMovement);
  const corrected = controller.computedMovement();

  const pos = body.translation();
  body.setNextKinematicTranslation({
    x: pos.x + corrected.x,
    y: pos.y + corrected.y,
    z: pos.z + corrected.z
  });
}
```

### Scenario 3: React Three Fiber Migration

**@react-three/rapier 0.14.x → 1.x+**

The @react-three/rapier library versions don't directly correspond to Rapier versions.

**Before** (older @react-three/rapier):
```tsx
import { Physics, RigidBody } from '@react-three/rapier';

<Physics>
  <RigidBody type="dynamic">
    <mesh>
      <boxGeometry />
    </mesh>
  </RigidBody>
</Physics>
```

**After** (current @react-three/rapier):
```tsx
import { Physics, RigidBody, CapsuleCollider } from '@react-three/rapier';

<Physics>
  <RigidBody type="kinematicPosition">
    <CapsuleCollider args={[0.5, 0.3]} />
    <mesh>
      <capsuleGeometry args={[0.3, 1.0]} />
    </mesh>
  </RigidBody>
</Physics>
```

**Note**: For character controllers in React Three Fiber, use the `useRapier()` hook to access the raw Rapier world and create character controllers manually.

```tsx
import { useRapier } from '@react-three/rapier';

function Character() {
  const { world } = useRapier();
  const controllerRef = useRef<RAPIER.KinematicCharacterController>();

  useEffect(() => {
    controllerRef.current = world.createCharacterController(0.01);
    // Configure...

    return () => {
      if (controllerRef.current) {
        world.removeCharacterController(controllerRef.current);
      }
    };
  }, [world]);

  // Use controller in useFrame...
}
```

---

## Package Version Matrix

### Recommended Combinations for 2024-2025

| Rapier | Three.js | @react-three/fiber | @react-three/rapier | Status |
|--------|----------|-------------------|---------------------|--------|
| 0.14.0 | r180 | 8.15+ | 1.3+ | ✅ Recommended |
| 0.15.x | r180 | 8.15+ | 1.3+ | ✅ Latest Stable |
| 0.19.x | r180 | 8.15+ | 1.4+ | ✅ Bleeding Edge |
| 0.13.x | r170-r180 | 8.10+ | 1.2+ | ⚠️ Older, but stable |
| 0.12.x | r160-r170 | 8.0+ | 1.0+ | ⚠️ Outdated |
| 0.11.x | r150-r160 | 8.0+ | 0.14+ | ❌ Not recommended |

### Installation Commands

**For Vanilla Three.js (Recommended for 2024-2025)**:
```bash
npm install three@0.180.0 @dimforge/rapier3d-compat@0.14.0
```

**For React Three Fiber**:
```bash
npm install three@0.180.0 \
  @react-three/fiber@8.15.0 \
  @react-three/rapier@1.3.0 \
  @dimforge/rapier3d-compat@0.14.0
```

**For Latest/Bleeding Edge**:
```bash
npm install three@latest @dimforge/rapier3d-compat@latest
```

---

## Deprecation Warnings

### Already Deprecated

1. **`BodyStatus` enum** (deprecated in 0.11, removed in 0.12)
   - Use builder methods instead: `.dynamic()`, `.fixed()`, etc.

2. **Synchronous initialization** (deprecated in 0.11)
   - Always use `await RAPIER.init()`

3. **Handle-based collider creation** (soft deprecated in 0.12)
   - Pass rigid body reference directly, not handle

### Potentially Deprecated in Future

1. **Manual kinematic control without character controller**
   - Character controller is now the recommended approach
   - Manual control still works but is more error-prone

2. **`@dimforge/rapier3d` (non-compat version)**
   - Use `@dimforge/rapier3d-compat` for better browser compatibility
   - The non-compat version requires explicit WASM file loading

---

## Migration Checklist

### Upgrading to Rapier 0.14.0

- [ ] Update package: `npm install @dimforge/rapier3d-compat@0.14.0`
- [ ] Add `await RAPIER.init()` before world creation
- [ ] Replace `BodyStatus` with builder methods
- [ ] Update collider creation to pass rigid body reference
- [ ] Test character controller features
- [ ] Update Three.js to r170+ if needed
- [ ] Change imports from `examples/jsm/*` to `addons/*`

### Adding Character Controller

- [ ] Create kinematic rigid body
- [ ] Add capsule collider to character
- [ ] Create character controller with `world.createCharacterController(0.01)`
- [ ] Configure slope angles and autostep
- [ ] Implement movement with `computeColliderMovement()`
- [ ] Check ground state with `computedGrounded()`
- [ ] Handle gravity manually
- [ ] Test on slopes, stairs, and edges

### Updating Three.js to r180

- [ ] Update package: `npm install three@0.180.0`
- [ ] Change all `three/examples/jsm/*` to `three/addons/*`
- [ ] Update RapierPhysics import path
- [ ] Test all examples and demos
- [ ] Check for any renderer changes
- [ ] Update build configuration if needed

---

## Common Issues During Migration

### Issue: "RAPIER is not initialized"

**Cause**: Forgot to call `RAPIER.init()` or not awaiting it.

**Solution**:
```typescript
// Wrong
import RAPIER from '@dimforge/rapier3d-compat';
const world = new RAPIER.World(...); // Error!

// Correct
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();
const world = new RAPIER.World(...);
```

### Issue: "BodyStatus is not defined"

**Cause**: Using old API from 0.10.x or earlier.

**Solution**: Use builder pattern:
```typescript
// Wrong (old API)
RAPIER.RigidBodyDesc.new(RAPIER.BodyStatus.Dynamic)

// Correct (new API)
RAPIER.RigidBodyDesc.dynamic()
```

### Issue: "Cannot find module 'three/examples/jsm/...'"

**Cause**: Three.js r170+ moved examples to addons.

**Solution**: Update import path:
```typescript
// Wrong (r160-r169)
import { RapierPhysics } from 'three/examples/jsm/physics/RapierPhysics.js';

// Correct (r170+)
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';
```

### Issue: Character falls through ground after migration

**Cause**: Timestep or update order changed.

**Solution**: Ensure physics steps before character update:
```typescript
function update(delta) {
  world.step(); // Step physics first

  // Then update character
  updateCharacter(delta);
}
```

### Issue: Character controller not working after upgrade

**Cause**: Controller configuration not called after creation.

**Solution**: Always configure controller after creation:
```typescript
const controller = world.createCharacterController(0.01);

// Must configure!
controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
controller.enableAutostep(0.5, 0.2, true);
```

---

## Version-Specific Best Practices

### For Rapier 0.14.0 Specifically

1. **Use compat variant**: Always use `@dimforge/rapier3d-compat` for easier setup
2. **Enable snap-to-ground**: This feature is stable in 0.14
3. **Test slope handling**: 0.14 improved slope detection
4. **Check collision counts**: Use `numComputedCollisions()` for debugging

### For Three.js r180

1. **Use addons path**: Always import from `three/addons/*`
2. **Leverage RapierPhysics helper**: It's well-maintained and up-to-date
3. **Check examples**: r180 has updated Rapier examples
4. **Use official types**: @types/three is updated for r180

---

## Additional Resources

- Rapier Changelog: https://github.com/dimforge/rapier/blob/master/CHANGELOG.md
- Rapier.js Changelog: https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md
- Three.js Release Notes: https://github.com/mrdoob/three.js/releases
- React Three Rapier Migration Guide: https://github.com/pmndrs/react-three-rapier/wiki/0.14.x-to-0.15.x-Migration-Guide
- Rapier Discord: https://discord.gg/vt9DJSW

---

## Future-Proofing Your Code

To minimize future migration work:

1. **Always use latest stable versions**
   ```json
   {
     "dependencies": {
       "@dimforge/rapier3d-compat": "^0.14.0",
       "three": "^0.180.0"
     }
   }
   ```

2. **Avoid deprecated APIs**: Check documentation before using any API

3. **Use TypeScript**: Type errors will catch breaking changes early

4. **Follow official examples**: They're updated with each release

5. **Subscribe to release notes**: Watch GitHub repos for updates

6. **Test regularly**: Run tests after any dependency update

7. **Pin versions in production**: Use exact versions for production builds
   ```json
   {
     "dependencies": {
       "@dimforge/rapier3d-compat": "0.14.0",
       "three": "0.180.0"
     }
   }
   ```
