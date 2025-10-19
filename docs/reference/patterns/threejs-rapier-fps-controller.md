# Three.js + Rapier FPS Character Controller

**Source URL**: https://github.com/icurtis1/fps-sample-project
**Date**: 2024
**Stack**:
- Three.js: Latest (React Three Fiber)
- Rapier: Latest
- TypeScript: Yes

**License**: Not specified in search results (check repository)

## What This Example Demonstrates

A modern first-person shooter character controller built with React Three Fiber and Rapier physics. This is one of the most complete, modern examples combining:
- Smooth movement mechanics
- Gamepad support
- Interactive physics-based gameplay
- Character controller using Rapier's built-in CharacterController API

## Key Implementation Patterns

### Rapier Character Controller API

Rapier provides a dedicated CharacterController class specifically designed for game characters. Unlike regular rigid bodies, character controllers are AI tools that handle complex calculations for character movement and interactions.

**Key difference**: A character controller is NOT a rigid body, but uses raycasting and collision detection to provide smooth, controlled movement.

### WASD Movement with Rapier

According to the Medium tutorial (Nov 2024), the implementation uses:

```typescript
// Character controller provides methods for movement
characterController.computeColliderMovement(
  collider,
  desiredMovement,
  filterGroups,
  filterPredicate
);

// Apply forces for physics-based movement
rigidBody.addForce({ x: force.x, y: 0, z: force.z });

// Or use impulses for instant velocity changes
rigidBody.applyImpulse({ x: impulse.x, y: 0, z: impulse.z });
```

### Physics Integration Approach

1. Create character controller instance
2. Update controller in animation loop
3. Use controller's `computeColliderMovement()` to handle collisions
4. Apply resulting movement to the character's position

## Implementation Notes

- The project demonstrates interactive physics-based gameplay
- Uses React Three Fiber (R3F) wrapper around Three.js
- Gamepad support is built-in (useful reference for future input systems)
- Smooth movement mechanics implemented using Rapier's physics calculations

## Gotchas

- Character controllers in Rapier are separate from rigid bodies
- Need to properly filter collisions to avoid character getting stuck
- Movement should be camera-relative for FPS feel

## Performance Tips

- Use Rapier's built-in character controller rather than rolling your own physics
- Character controllers are optimized for game characters vs. generic rigid bodies
- Rapier can calculate forces, velocities, contacts, and constraints efficiently

## Relevance to Our Project

**Direct Applications**:
- Modern example using latest Rapier API (we're using @dimforge/rapier3d-compat ^0.14.0)
- Shows proper integration of physics with Three.js
- Demonstrates smooth FPS movement mechanics

**Adaptation Notes**:
- This example uses React Three Fiber, we use vanilla Three.js
- Need to extract core physics logic from R3F wrapper
- Character controller pattern is framework-agnostic

**Related Projects by Same Author**:
- character-controller-sample-project: Third-person variant with mobile support
