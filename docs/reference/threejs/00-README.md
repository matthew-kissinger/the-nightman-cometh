# Three.js r180 PointerLockControls Reference Documentation

**Version**: Three.js r180 (0.180.0)
**Date**: 2024-2025
**Language**: TypeScript

## Overview

This reference documentation provides comprehensive guides for implementing first-person controls in Three.js r180 using PointerLockControls. All examples are compatible with Three.js r180 and use modern TypeScript patterns.

## Documents

### 1. [Official PointerLockControls Example](./01-official-pointerlockcontrols-example.md)

**What it covers:**
- Official Three.js r180 implementation
- Complete TypeScript code example
- WASD movement with velocity-based physics
- Raycasting collision detection
- Jump and gravity mechanics
- Event handling patterns

**Best for:**
- Understanding the official implementation
- Learning basic PointerLockControls setup
- Simple games with basic collision needs
- Quick prototyping

**Key features:**
- ✅ Official Three.js patterns
- ✅ Simple raycasting collision
- ✅ Velocity-based movement
- ✅ Ready-to-use code
- ⚠️ O(n) collision performance

---

### 2. [PointerLockControls API Reference](./02-pointerlockcontrols-api-reference.md)

**What it covers:**
- Complete API documentation for r180
- Constructor, methods, properties, events
- TypeScript type definitions
- Usage patterns and examples
- Migration guide from previous versions
- Browser compatibility notes

**Best for:**
- API reference lookup
- Understanding all available methods
- Type-safe implementations
- Troubleshooting

**Key features:**
- ✅ Complete API coverage
- ✅ TypeScript definitions
- ✅ Code examples for each method
- ✅ Browser compatibility notes
- ✅ Breaking changes documented

---

### 3. [TypeScript Production Patterns](./03-typescript-production-patterns.md)

**What it covers:**
- Production-ready controller class
- Type-safe event systems
- ECS (Entity Component System) integration
- State machine patterns
- Performance monitoring
- Advanced architecture patterns

**Best for:**
- Production applications
- Complex game mechanics
- Type-safe development
- Scalable architecture
- Team projects

**Key features:**
- ✅ Reusable controller class
- ✅ Type-safe events
- ✅ State machine support
- ✅ Performance monitoring
- ✅ ECS integration patterns

---

### 4. [Advanced Collision Detection with Octree](./04-advanced-collision-octree.md)

**What it covers:**
- Octree spatial partitioning
- Capsule collision for player
- three-mesh-bvh integration
- Complex geometry collision
- Performance optimization
- Official games_fps.html example

**Best for:**
- Complex 3D environments
- Many objects in scene
- Realistic character collision
- Production FPS games
- Large-scale projects

**Key features:**
- ✅ O(log n) collision performance
- ✅ Capsule-based collision
- ✅ Handles complex geometry
- ✅ Continuous collision detection
- ✅ Volume-based collision

---

### 5. [Migration Guide - r180](./05-migration-guide-r180.md)

**What it covers:**
- Breaking changes in r180
- Mandatory domElement parameter
- Deprecated getObject() method
- Import path changes
- Automated migration scripts
- Testing checklist

**Best for:**
- Upgrading from r179 or earlier
- Understanding breaking changes
- Automated migration
- Compatibility issues

**Key features:**
- ✅ Complete breaking change list
- ✅ Migration scripts
- ✅ Before/after examples
- ✅ Testing checklist
- ✅ Common error solutions

---

### 6. [Physics Integration - Rapier](./06-physics-integration-rapier.md)

**What it covers:**
- Rapier 3D physics integration
- Character controller setup
- Kinematic character movement
- Slope handling and auto-step
- Advanced collision features
- Performance optimization

**Best for:**
- Realistic physics simulation
- Advanced character movement
- Slope and stair handling
- Production games
- Complex interactions

**Key features:**
- ✅ Built-in character controller
- ✅ Realistic physics
- ✅ Auto-step over obstacles
- ✅ Slope handling
- ✅ High performance (WASM)

---

## Quick Start Guide

### 1. Basic Setup (Simple Projects)

For simple projects with basic collision needs:

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const controls = new PointerLockControls(camera, document.body);
```

**See**: [Document 1 - Official Example](./01-official-pointerlockcontrols-example.md)

---

### 2. Production Setup (Type-Safe)

For production applications with type safety:

```typescript
import { FirstPersonController } from './FirstPersonController';

const controller = new FirstPersonController({
  camera,
  domElement: document.body,
  moveSpeed: 400,
  jumpVelocity: 350,
});
```

**See**: [Document 3 - Production Patterns](./03-typescript-production-patterns.md)

---

### 3. Complex Geometry (Octree)

For games with complex 3D environments:

```typescript
import { OctreeFPSController } from './OctreeFPSController';

const controller = new OctreeFPSController(camera, document.body);
await controller.loadWorldFromGLTF('/models/level.glb');
```

**See**: [Document 4 - Octree Collision](./04-advanced-collision-octree.md)

---

### 4. Physics-Based (Rapier)

For realistic physics simulation:

```typescript
import { RapierFPSController } from './RapierFPSController';

const controller = new RapierFPSController({
  camera,
  domElement: document.body,
  world: rapierWorld,
  playerHeight: 1.8,
});
```

**See**: [Document 6 - Rapier Integration](./06-physics-integration-rapier.md)

---

## Choosing the Right Approach

| Requirement | Recommended Document |
|-------------|---------------------|
| Learning the basics | [Document 1 - Official Example](./01-official-pointerlockcontrols-example.md) |
| API reference lookup | [Document 2 - API Reference](./02-pointerlockcontrols-api-reference.md) |
| Production application | [Document 3 - Production Patterns](./03-typescript-production-patterns.md) |
| Complex 3D environment | [Document 4 - Octree Collision](./04-advanced-collision-octree.md) |
| Upgrading to r180 | [Document 5 - Migration Guide](./05-migration-guide-r180.md) |
| Realistic physics | [Document 6 - Rapier Integration](./06-physics-integration-rapier.md) |

---

## Collision Detection Comparison

| Method | Performance | Complexity | Best For |
|--------|-------------|------------|----------|
| **Raycasting** (Doc 1) | O(n) | Low | Simple scenes, few objects |
| **Octree** (Doc 4) | O(log n) | Medium | Complex geometry, many triangles |
| **Rapier Physics** (Doc 6) | High | Medium-High | Realistic physics, advanced features |

---

## Breaking Changes in r180

⚠️ **Important**: Three.js r180 introduced breaking changes:

1. **Mandatory domElement**: The second parameter is now required
   ```typescript
   // ✅ r180
   new PointerLockControls(camera, document.body)

   // ❌ r179 (no longer works)
   new PointerLockControls(camera)
   ```

2. **Deprecated getObject()**: Use `.object` property instead
   ```typescript
   // ✅ r180
   controls.object.position.y += 10

   // ⚠️ Deprecated (still works but will be removed)
   controls.getObject().position.y += 10
   ```

3. **Import path**: Use `three/addons/` not `three/examples/jsm/`
   ```typescript
   // ✅ r180
   import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

   // ❌ Old (deprecated)
   import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
   ```

**See**: [Document 5 - Migration Guide](./05-migration-guide-r180.md) for complete details.

---

## Installation

```bash
# Three.js r180
npm install three@^0.180.0

# TypeScript types
npm install -D @types/three@^0.180.0

# Optional: Rapier physics
npm install @dimforge/rapier3d-compat@^0.14.0

# Optional: three-mesh-bvh for Octree
npm install three-mesh-bvh@^0.8.0
```

---

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## Project Setup (Vite)

This project uses Vite for development:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## Code Examples

All code examples in these documents:
- ✅ Are compatible with Three.js r180
- ✅ Use TypeScript with strict typing
- ✅ Follow modern ES6+ patterns
- ✅ Include complete, runnable code
- ✅ Are production-ready
- ✅ Include error handling
- ✅ Follow Three.js best practices

---

## Common Patterns

### Movement State Management

```typescript
interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}
```

**Used in**: Documents 1, 3, 4, 6

---

### Physics Update Loop

```typescript
function animate() {
  const delta = clock.getDelta();

  if (controls.isLocked) {
    controller.update(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

**Used in**: All documents

---

### UI Lock/Unlock Pattern

```typescript
instructions.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  hideUI();
});

controls.addEventListener('unlock', () => {
  showUI();
});
```

**Used in**: Documents 1, 3, 4, 6

---

## Performance Best Practices

1. **Delta Time**: Always use delta time for frame-rate independent movement
2. **isLocked Check**: Only update physics when controls are locked
3. **Object Reuse**: Reuse Vector3 instances instead of creating new ones
4. **Collision Optimization**: Choose appropriate collision method for scene complexity
5. **Fixed Timestep**: Use fixed timestep for deterministic physics (Rapier)

---

## Browser Compatibility

PointerLockControls requires:
- Modern browsers (Chrome 37+, Firefox 41+, Safari 10.1+, Edge 13+)
- HTTPS in production (or localhost for development)
- User interaction to activate (security requirement)

---

## Additional Resources

### Official Three.js
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Documentation](https://threejs.org/docs/)
- [GitHub Repository](https://github.com/mrdoob/three.js)

### Physics Engines
- [Rapier Documentation](https://rapier.rs/docs/)
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)

### Community
- [Three.js Discourse](https://discourse.threejs.org/)
- [Three.js Discord](https://discord.gg/56GBJwAnUS)

---

## License

All code examples in these documents are provided under the MIT License, following Three.js licensing.

---

## Contributing

These documents are based on:
- Official Three.js r180 examples and documentation
- Production patterns from 2024-2025
- Community best practices
- Real-world testing

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-2025 | Initial documentation for Three.js r180 |

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| 00-README.md | ✅ Complete | 2024-2025 |
| 01-official-pointerlockcontrols-example.md | ✅ Complete | 2024-2025 |
| 02-pointerlockcontrols-api-reference.md | ✅ Complete | 2024-2025 |
| 03-typescript-production-patterns.md | ✅ Complete | 2024-2025 |
| 04-advanced-collision-octree.md | ✅ Complete | 2024-2025 |
| 05-migration-guide-r180.md | ✅ Complete | 2024-2025 |
| 06-physics-integration-rapier.md | ✅ Complete | 2024-2025 |

---

**Note**: All examples are verified to work with Three.js r180 and use the latest import paths and API methods. The project's current setup already uses Three.js 0.180.0 as specified in package.json.
