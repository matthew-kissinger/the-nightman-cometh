# Three.js + Rapier Physics Integration Patterns

**Source URLs**:
- https://sbcode.net/threejs/physics-rapier/
- https://github.com/viridia/demo-rapier-three
- https://rapier.rs/docs/user_guides/javascript/character_controller/
**Date**: 2024
**Stack**:
- Three.js: r170+
- Rapier3D: 0.14.0
- TypeScript: Yes

**License**: MIT (examples)

## What This Example Demonstrates

Best practices for integrating Rapier physics engine with Three.js. Covers initialization, world setup, rigid body creation, and syncing physics simulation with Three.js rendering.

## Key Implementation Patterns

### Initialization and World Setup

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

class PhysicsWorld {
  private world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;

  async init(): Promise<void> {
    // Initialize Rapier (loads WASM)
    this.rapier = await RAPIER.init();

    // Create world with gravity
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new this.rapier.World(gravity);

    console.log('Physics world initialized');
  }

  step(deltaTime: number): void {
    if (this.world) {
      // Clamp deltaTime to prevent physics instability
      const dt = Math.min(deltaTime, 0.1);
      this.world.step();
    }
  }

  getWorld(): RAPIER.World | null {
    return this.world;
  }

  getRapier(): typeof RAPIER | null {
    return this.rapier;
  }
}
```

### Rigid Body Creation Pattern

```typescript
interface PhysicsBodyOptions {
  bodyType: 'dynamic' | 'kinematic' | 'fixed';
  position: THREE.Vector3;
  rotation?: THREE.Quaternion;
  mass?: number;
  restitution?: number;
  friction?: number;
}

class PhysicsEntity {
  mesh: THREE.Mesh;
  rigidBody: RAPIER.RigidBody;
  collider: RAPIER.Collider;

  constructor(
    mesh: THREE.Mesh,
    world: RAPIER.World,
    rapier: typeof RAPIER,
    options: PhysicsBodyOptions
  ) {
    this.mesh = mesh;

    // Create rigid body description
    let rigidBodyDesc;
    switch (options.bodyType) {
      case 'dynamic':
        rigidBodyDesc = rapier.RigidBodyDesc.dynamic();
        break;
      case 'kinematic':
        rigidBodyDesc = rapier.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'fixed':
        rigidBodyDesc = rapier.RigidBodyDesc.fixed();
        break;
    }

    // Set position and rotation
    rigidBodyDesc.setTranslation(
      options.position.x,
      options.position.y,
      options.position.z
    );

    if (options.rotation) {
      rigidBodyDesc.setRotation({
        x: options.rotation.x,
        y: options.rotation.y,
        z: options.rotation.z,
        w: options.rotation.w
      });
    }

    // Create rigid body
    this.rigidBody = world.createRigidBody(rigidBodyDesc);

    // Create collider from mesh geometry
    const colliderDesc = this.createColliderFromMesh(mesh, rapier);

    // Set physics properties
    if (options.restitution !== undefined) {
      colliderDesc.setRestitution(options.restitution);
    }
    if (options.friction !== undefined) {
      colliderDesc.setFriction(options.friction);
    }
    if (options.mass !== undefined) {
      colliderDesc.setDensity(options.mass);
    }

    // Attach collider to rigid body
    this.collider = world.createCollider(colliderDesc, this.rigidBody);
  }

  private createColliderFromMesh(
    mesh: THREE.Mesh,
    rapier: typeof RAPIER
  ): RAPIER.ColliderDesc {
    const geometry = mesh.geometry;

    if (geometry instanceof THREE.BoxGeometry) {
      // Box collider
      const params = geometry.parameters;
      return rapier.ColliderDesc.cuboid(
        params.width / 2,
        params.height / 2,
        params.depth / 2
      );
    } else if (geometry instanceof THREE.SphereGeometry) {
      // Sphere collider
      const radius = geometry.parameters.radius;
      return rapier.ColliderDesc.ball(radius);
    } else if (geometry instanceof THREE.CylinderGeometry) {
      // Cylinder collider
      const params = geometry.parameters;
      return rapier.ColliderDesc.cylinder(
        params.height / 2,
        params.radiusTop
      );
    } else {
      // Convex hull or trimesh for complex shapes
      return this.createConvexHullCollider(geometry, rapier);
    }
  }

  private createConvexHullCollider(
    geometry: THREE.BufferGeometry,
    rapier: typeof RAPIER
  ): RAPIER.ColliderDesc {
    const positions = geometry.attributes.position.array as Float32Array;
    const vertices = new Float32Array(positions);
    return rapier.ColliderDesc.convexHull(vertices)!;
  }

  // Sync Three.js mesh with physics body
  syncToPhysics(): void {
    const position = this.rigidBody.translation();
    this.mesh.position.set(position.x, position.y, position.z);

    const rotation = this.rigidBody.rotation();
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  // Sync physics body with Three.js mesh (for kinematic bodies)
  syncFromMesh(): void {
    this.rigidBody.setTranslation(
      {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z
      },
      true
    );

    this.rigidBody.setRotation(
      {
        x: this.mesh.quaternion.x,
        y: this.mesh.quaternion.y,
        z: this.mesh.quaternion.z,
        w: this.mesh.quaternion.w
      },
      true
    );
  }
}
```

### Character Controller Integration

```typescript
class CharacterController {
  private controller: RAPIER.KinematicCharacterController;
  private characterBody: RAPIER.RigidBody;
  private characterCollider: RAPIER.Collider;
  private camera: THREE.Camera;

  constructor(
    world: RAPIER.World,
    rapier: typeof RAPIER,
    camera: THREE.Camera,
    position: THREE.Vector3
  ) {
    this.camera = camera;

    // Create character controller
    this.controller = world.createCharacterController(0.01);
    this.controller.enableAutostep(0.5, 0.2, true);
    this.controller.enableSnapToGround(0.5);

    // Create kinematic rigid body for character
    const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    this.characterBody = world.createRigidBody(bodyDesc);

    // Create capsule collider for character
    const colliderDesc = rapier.ColliderDesc.capsule(0.5, 0.3);
    this.characterCollider = world.createCollider(
      colliderDesc,
      this.characterBody
    );
  }

  update(
    world: RAPIER.World,
    deltaTime: number,
    movement: THREE.Vector3
  ): void {
    // Calculate desired movement
    const desiredMovement = {
      x: movement.x * deltaTime,
      y: movement.y * deltaTime,
      z: movement.z * deltaTime
    };

    // Compute collider movement with character controller
    this.controller.computeColliderMovement(
      this.characterCollider,
      desiredMovement
    );

    // Get corrected movement (after collision resolution)
    const correctedMovement = this.controller.computedMovement();

    // Apply movement to rigid body
    const currentPos = this.characterBody.translation();
    this.characterBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    });

    // Update camera position to follow character
    const newPos = this.characterBody.translation();
    this.camera.position.set(
      newPos.x,
      newPos.y + 1.6, // Eye height
      newPos.z
    );
  }

  isGrounded(): boolean {
    return this.controller.computedGrounded();
  }

  getPosition(): THREE.Vector3 {
    const pos = this.characterBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }
}
```

### Game Loop Integration

```typescript
class Game {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private physics: PhysicsWorld;
  private clock: THREE.Clock;
  private entities: PhysicsEntity[] = [];
  private characterController?: CharacterController;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.physics = new PhysicsWorld();
    this.clock = new THREE.Clock();
  }

  async init(): Promise<void> {
    // Initialize physics
    await this.physics.init();

    // Create character controller
    const world = this.physics.getWorld()!;
    const rapier = this.physics.getRapier()!;
    this.characterController = new CharacterController(
      world,
      rapier,
      this.camera,
      new THREE.Vector3(0, 2, 0)
    );

    // Start game loop
    this.animate();
  }

  animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    // Update physics
    this.physics.step(deltaTime);

    // Sync all physics entities to Three.js
    this.entities.forEach(entity => {
      if (entity.rigidBody.bodyType() === RAPIER.RigidBodyType.Dynamic) {
        entity.syncToPhysics();
      }
    });

    // Update character controller
    if (this.characterController) {
      const movement = this.getMovementFromInput();
      this.characterController.update(
        this.physics.getWorld()!,
        deltaTime,
        movement
      );
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private getMovementFromInput(): THREE.Vector3 {
    // Implement input handling
    return new THREE.Vector3(0, 0, 0);
  }
}
```

### Collision Event Handling

```typescript
class CollisionHandler {
  private eventQueue: RAPIER.EventQueue;

  constructor(world: RAPIER.World) {
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  update(world: RAPIER.World): void {
    world.contactsWith(this.eventQueue, (handle1, handle2, started) => {
      if (started) {
        console.log('Collision started between', handle1, handle2);
        this.onCollisionStart(handle1, handle2);
      } else {
        console.log('Collision ended between', handle1, handle2);
        this.onCollisionEnd(handle1, handle2);
      }
    });
  }

  private onCollisionStart(handle1: number, handle2: number): void {
    // Handle collision logic
  }

  private onCollisionEnd(handle1: number, handle2: number): void {
    // Handle separation logic
  }
}
```

### Static Environment Setup

```typescript
function createStaticEnvironment(
  scene: THREE.Scene,
  world: RAPIER.World,
  rapier: typeof RAPIER
): void {
  // Ground plane
  const groundGeometry = new THREE.BoxGeometry(50, 0.1, 50);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.position.y = -0.05;
  scene.add(groundMesh);

  // Create static physics body for ground
  const groundBody = world.createRigidBody(
    rapier.RigidBodyDesc.fixed()
      .setTranslation(0, -0.05, 0)
  );

  const groundCollider = rapier.ColliderDesc.cuboid(25, 0.05, 25);
  world.createCollider(groundCollider, groundBody);

  // Walls, obstacles, etc.
  // ...
}
```

## Implementation Notes

- **WASM Initialization**: Rapier requires async initialization, handle this before creating physics world
- **Fixed Timestep**: For deterministic physics, use fixed timestep instead of variable deltaTime
- **Sync Direction**: Dynamic bodies sync physics → Three.js, Kinematic bodies sync Three.js → physics
- **Collider Types**: Use simple shapes (box, sphere, capsule) when possible for performance

## Gotchas

- **Async Init**: Must await `RAPIER.init()` before using any Rapier features
- **Body Types**: Dynamic (affected by forces), Kinematic (controlled by code), Fixed (static)
- **Collider Attachment**: Colliders must be attached to rigid bodies
- **Scale**: Rapier uses meters - ensure Three.js units match
- **Sleeping Bodies**: Bodies that don't move get put to sleep, wake them with `wakeUp()`

## Performance Tips

- Use simple collider shapes (spheres, boxes, capsules) instead of convex hulls
- Static bodies are free - use them for environment
- Limit number of active dynamic bodies
- Use collision layers to filter unnecessary collision checks
- Fixed timestep physics (e.g., 60 FPS) can be more stable than variable

## Relevance to Our Project

**Critical Integration**:
- We're using @dimforge/rapier3d-compat ^0.14.0
- Need this pattern for character controller + environment
- TypeScript examples directly applicable

**Direct Applications**:
1. Character controller for player movement
2. Static colliders for cabin interior
3. Dynamic objects for interactive elements
4. Collision events for game logic (pickup items, triggers)

**Implementation Checklist**:
- [x] We have Rapier installed
- [ ] Create PhysicsWorld singleton
- [ ] Implement CharacterController class
- [ ] Create static environment colliders
- [ ] Set up game loop with physics stepping
- [ ] Sync Three.js objects with Rapier bodies

**TypeScript Benefits**:
```typescript
// Type-safe physics entity creation
interface RigidBodyHandle {
  handle: number;
  entity: PhysicsEntity;
}

class PhysicsManager {
  private bodies: Map<number, PhysicsEntity> = new Map();

  addBody(entity: PhysicsEntity): void {
    const handle = entity.rigidBody.handle;
    this.bodies.set(handle, entity);
  }

  getEntityByHandle(handle: number): PhysicsEntity | undefined {
    return this.bodies.get(handle);
  }
}
```

## Resources

- Rapier Character Controller Docs: https://rapier.rs/docs/user_guides/javascript/character_controller/
- SB Code Tutorial: https://sbcode.net/threejs/physics-rapier/
- Viridia Demo: https://github.com/viridia/demo-rapier-three
- Official Rapier Examples: https://rapier.rs/demos3d/
