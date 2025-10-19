# Rapier3D Character Controller Reference Documentation

**Last Updated**: October 2024
**Rapier Version**: v0.14.0 (compatible with 0.14.x - 0.19.x)
**Three.js Version**: r180 (0.180.0)

## Overview

This reference documentation provides comprehensive, up-to-date examples and guides for implementing character controllers with Rapier3D physics engine and Three.js. All examples are confirmed to work with the specified versions and include only 2024-2025 code patterns.

## Document Index

### 1. [Official Three.js Character Controller Example](./01_official_threejs_character_controller.md)
**Source**: Three.js official examples (r180)

Complete implementation guide for the official Three.js physics example using RapierPhysics helper and KinematicCharacterController.

**Key Topics**:
- RapierPhysics helper integration
- Character controller setup and configuration
- Movement computation and collision handling
- Complete working code example
- Best practices and common pitfalls

**Best For**: Getting started with official Three.js integration

---

### 2. [Rapier Official API Documentation](./02_rapier_official_api_documentation.md)
**Source**: Official Rapier documentation (rapier.rs)

Deep dive into the KinematicCharacterController API with all methods, properties, and usage patterns directly from Rapier's official documentation.

**Key Topics**:
- Complete API reference for KinematicCharacterController
- Configuration methods (slopes, autostep, snap-to-ground)
- Movement computation with `computeColliderMovement()`
- Collision detection and filtering
- Query flags and custom predicates
- Full code examples for each feature

**Best For**: Understanding the Rapier API in depth

---

### 3. [Community Examples 2024-2025](./03_community_examples_2024.md)
**Source**: Recent GitHub repositories and community projects

Real-world implementations from active open-source projects showing different approaches and architectures.

**Featured Examples**:
- **doppl3r/kinematic-character-controller-example**: Entity-component architecture with interpolation
- **icurtis1/fps-sample-project**: React Three Fiber FPS controller with gamepad support
- **viridia/demo-rapier-three**: TypeScript implementation with clean architecture

**Key Topics**:
- Different architectural patterns
- Fixed timestep with interpolation
- React Three Fiber integration
- TypeScript best practices
- Comparison of approaches

**Best For**: Learning from production-ready code and different architectural styles

---

### 4. [Migration Guide and Breaking Changes](./04_migration_guide_and_breaking_changes.md)
**Source**: Rapier and Three.js changelogs

Complete migration guide covering version upgrades and API changes from older versions to current stable releases.

**Key Topics**:
- Breaking changes by version (0.11.x → 0.14.0 → 0.19.x)
- Three.js r160 → r180 migration
- API renaming and deprecations
- Common migration scenarios with before/after code
- Package version compatibility matrix
- Troubleshooting common upgrade issues

**Best For**: Upgrading existing projects or understanding version differences

---

## Quick Start

### Installation

**For Vanilla Three.js**:
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

### Minimal Example

```typescript
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

async function init() {
  // 1. Initialize Rapier
  await RAPIER.init();

  // 2. Create physics world
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // 3. Create character controller
  const controller = world.createCharacterController(0.01);
  controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
  controller.enableAutostep(0.5, 0.2, true);

  // 4. Create kinematic rigid body
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, 5, 0);
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  // 5. Create capsule collider
  const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.3);
  const collider = world.createCollider(colliderDesc, rigidBody);

  // 6. Update loop
  function update(delta) {
    // Calculate movement
    const desiredMovement = { x: 0, y: -0.1, z: 0.5 };

    // Compute collision-aware movement
    controller.computeColliderMovement(collider, desiredMovement);
    const corrected = controller.computedMovement();

    // Apply to rigid body
    const pos = rigidBody.translation();
    rigidBody.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z
    });

    // Step physics
    world.step();
  }
}

init();
```

## Common Use Cases

### First-Person Character
See: [Official Three.js Example](./01_official_threejs_character_controller.md)
- Kinematic rigid body with capsule collider
- WASD movement with camera follow
- Jump mechanics with ground detection

### Third-Person Character
See: [Community Examples - icurtis1](./03_community_examples_2024.md)
- Character controller with camera orbit
- Character rotation based on movement direction
- Animation integration

### Platformer Character
See: [Community Examples - doppl3r](./03_community_examples_2024.md)
- Precise collision detection
- Stair climbing and slope handling
- Moving platform support

### Multiplayer Character
See: [Rapier API Documentation](./02_rapier_official_api_documentation.md)
- Deterministic physics simulation
- State serialization
- Interpolation and prediction

## Key Concepts

### Kinematic vs Dynamic

**Kinematic** (for character controllers):
- Position-based control
- Not affected by forces
- Precise movement control
- Required for character controllers

**Dynamic** (for physics objects):
- Force-based control
- Affected by gravity, collisions
- Realistic physics behavior
- Not compatible with character controllers

### Character Controller Benefits

- Automatic collision sliding
- Slope and stair handling
- Ground detection
- Precise control over movement
- Built-in edge climbing

### Best Practices

1. **Always use capsule colliders** for characters
2. **Configure controller** after creation (slopes, autostep)
3. **Handle gravity manually** in your update loop
4. **Use fixed timestep** for consistent physics
5. **Check `computedGrounded()`** before allowing jumps
6. **Enable CCD** for fast-moving characters
7. **Filter sensors** to avoid unwanted collisions

## Version Compatibility

| Component | Version | Status |
|-----------|---------|--------|
| Rapier | 0.14.0 | ✅ Tested |
| Rapier | 0.15.x - 0.19.x | ✅ Compatible |
| Three.js | r180 | ✅ Tested |
| @react-three/fiber | 8.15.0+ | ✅ Compatible |
| @react-three/rapier | 1.3.0+ | ✅ Compatible |

## Documentation Sources

All examples in this reference are sourced from:

1. **Official Three.js Repository**
   - URL: https://github.com/mrdoob/three.js
   - Examples: https://threejs.org/examples/
   - License: MIT

2. **Official Rapier Documentation**
   - URL: https://rapier.rs/docs/
   - API Docs: https://rapier.rs/javascript3d/
   - License: Apache-2.0

3. **Community Projects** (2024-2025)
   - doppl3r/kinematic-character-controller-example (MIT)
   - icurtis1/fps-sample-project (MIT)
   - viridia/demo-rapier-three (MIT)

## Additional Resources

### Official Documentation
- Rapier Main Site: https://rapier.rs/
- Rapier JavaScript Guide: https://rapier.rs/docs/user_guides/javascript/
- Three.js Documentation: https://threejs.org/docs/
- Three.js Manual: https://threejs.org/manual/

### Community Resources
- Rapier Discord: https://discord.gg/vt9DJSW
- Three.js Forum: https://discourse.threejs.org/
- React Three Fiber Docs: https://docs.pmnd.rs/react-three-fiber/

### Tutorials and Articles
- Physics with Rapier (SB Code): https://sbcode.net/threejs/physics-rapier/
- Three.js Journey: https://threejs-journey.com/
- React Three Fiber Physics: https://docs.pmnd.rs/react-three-fiber/tutorials/physics

### GitHub Repositories
- Rapier Physics Engine: https://github.com/dimforge/rapier
- Three.js: https://github.com/mrdoob/three.js
- React Three Rapier: https://github.com/pmndrs/react-three-rapier

## Contributing

This documentation is based on publicly available sources as of October 2024. If you find outdated information or have suggestions:

1. Verify the information against official sources
2. Check the version compatibility
3. Test with the specified versions
4. Document your findings

## License

This documentation compiles information from various open-source projects:
- Three.js examples: MIT License
- Rapier documentation: Apache-2.0 License
- Community examples: Various (see individual project licenses)

All code examples are provided for educational purposes.

---

**Last Updated**: October 2024
**Next Review**: December 2024 (or when Rapier 1.0 is released)
