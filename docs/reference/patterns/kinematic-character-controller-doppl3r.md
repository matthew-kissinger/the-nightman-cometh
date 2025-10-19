# Kinematic Character Controller - Rapier + Three.js

**Source URL**: https://github.com/doppl3r/kinematic-character-controller-example
**Date**: 2024
**Stack**:
- Three.js: r170+
- Rapier.js: Latest
- TypeScript: No (vanilla JS)

**License**: Check repository - Assets by doppl3r (Jacob DeBenedetto)

## What This Example Demonstrates

A complete implementation showing how to create a Kinematic Character Controller (KCC) using Rapier.js and Three.js. This is a vanilla Three.js implementation (not React), making it directly applicable to our project.

**Key Features**:
- Asset loading system
- Entity factory pattern
- Entity controller with user input
- Collision event system
- Kinematic rigid body control

## Key Code Patterns

### Entity Architecture

The implementation uses a clean entity-component architecture:

```javascript
// Entity.js - Base class for all game entities
class Entity {
  constructor() {
    this.mesh = null;      // Three.js 3D mesh
    this.rigidBody = null; // Rapier rigid body
    this.collider = null;  // Rapier collider
    // ... other components
  }
}

// EntityFactory.js - Creates entities with all components
class EntityFactory {
  createPlayer(position) {
    const entity = new Entity();
    entity.mesh = this.createMesh();
    entity.rigidBody = this.createKinematicRigidBody();
    entity.collider = this.createCollider();
    return entity;
  }
}
```

### Kinematic Character Controller

```javascript
// EntityControllerKinematic.js
class EntityControllerKinematic {
  constructor(entity) {
    this.entity = entity;
    this.velocity = new Vector3();
  }

  update(deltaTime, input) {
    // Handle input
    const movement = this.calculateMovement(input);

    // Apply to kinematic rigid body
    const rigidBody = this.entity.rigidBody;
    rigidBody.setNextKinematicTranslation({
      x: position.x + movement.x * deltaTime,
      y: position.y + movement.y * deltaTime,
      z: position.z + movement.z * deltaTime
    });
  }
}
```

### Input Controller Pattern

```javascript
class InputController {
  constructor() {
    this.keys = {};
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  isKeyPressed(keyCode) {
    return this.keys[keyCode] || false;
  }
}
```

### Game Loop Integration

```javascript
// Game.js - Singleton game manager
class Game {
  constructor() {
    this.entities = [];
    this.clock = new Clock();
  }

  update() {
    const deltaTime = this.clock.getDelta();

    // Update all entities
    this.entities.forEach(entity => {
      if (entity.controller) {
        entity.controller.update(deltaTime, this.input);
      }
    });

    // Step physics
    this.world.step();

    // Sync Three.js with Rapier
    this.syncPhysics();
  }
}
```

## Implementation Notes

- **Kinematic vs Dynamic**: Uses kinematic rigid bodies for player control (not affected by forces, but triggers collision events)
- **Entity Templates**: Factory pattern makes it easy to spawn different entity types
- **Resource Management**: Includes asset loading system for 3D models and textures
- **Collision Events**: System for handling collision callbacks

## Gotchas

- Kinematic bodies don't respond to forces - position must be set directly
- Need to manually sync Three.js mesh positions with Rapier bodies
- Character controller is separate from the rigid body itself
- Must use `setNextKinematicTranslation()` for kinematic bodies, not `setTranslation()`

## Performance Tips

- Kinematic bodies are more performant for player characters than dynamic bodies
- Use entity factory to pool and reuse entities
- Collision events can be expensive - filter what you listen to

## Relevance to Our Project

**Highly Relevant - Vanilla Three.js**:
- Pure Three.js implementation (no React wrapper)
- Shows proper entity architecture for game development
- Demonstrates clean separation of concerns (Entity, Factory, Controller)

**Direct Applications**:
- Entity factory pattern for spawning game objects
- Input controller pattern for keyboard state management
- Game loop structure with physics stepping
- Collision event system for game logic

**Code to Study**:
- EntityControllerKinematic.js - Player movement implementation
- EntityFactory.js - How to create entities with all components
- Game.js - Game loop and state management
- Entity.js - Base entity structure

**Adaptation Strategy**:
1. Study the entity architecture
2. Adapt input controller for our needs (add sprint/stamina)
3. Use factory pattern for spawning interactive objects
4. Implement similar game loop structure
