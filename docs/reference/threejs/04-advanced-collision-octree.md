# Advanced Collision Detection with Octree (r180)

**Source URL**: https://github.com/mrdoob/three.js/blob/r180/examples/games_fps.html
**Official Demo**: https://threejs.org/examples/games_fps.html
**Date**: 2024-2025
**Three.js Version**: r180 / 0.180.0
**License**: MIT License

## Overview

The official Three.js FPS example (`games_fps.html`) demonstrates advanced collision detection using Octree spatial partitioning for better performance with complex geometry. This is the recommended approach for production FPS games.

## Why Octree Over Raycasting?

| Feature | Raycasting | Octree |
|---------|-----------|--------|
| **Performance** | O(n) - checks all objects | O(log n) - spatial partitioning |
| **Collision Type** | Point/ray based | Volume based (capsule, sphere) |
| **Complex Geometry** | Slow with many triangles | Fast with any geometry |
| **Best For** | Simple scenes, few objects | Complex scenes, many triangles |
| **Setup Complexity** | Simple | Moderate |

## Implementation Pattern

The Octree approach uses:
1. **three-mesh-bvh** library for spatial partitioning
2. **Capsule collision** for the player (more realistic than point-based)
3. **Triangle mesh collision** with the environment
4. **Continuous collision detection** (swept collision)

## Installation

```bash
npm install three-mesh-bvh
```

## Complete TypeScript Implementation

```typescript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

/**
 * Advanced FPS controller using Octree collision detection
 */
export class OctreeFPSController {
  // Three.js core
  private camera: THREE.PerspectiveCamera;
  private controls: PointerLockControls;

  // Collision detection
  private worldOctree: Octree;
  private playerCollider: Capsule;

  // Physics
  private playerVelocity: THREE.Vector3;
  private playerDirection: THREE.Vector3;
  private playerOnFloor: boolean;

  // Movement state
  private moveForward: boolean;
  private moveBackward: boolean;
  private moveLeft: boolean;
  private moveRight: boolean;

  // Configuration
  private readonly GRAVITY = 30;
  private readonly STEPS_PER_FRAME = 5;
  private readonly PLAYER_HEIGHT = 1.7;
  private readonly PLAYER_RADIUS = 0.35;
  private readonly JUMP_VELOCITY = 15;
  private readonly WALK_SPEED = 10;
  private readonly RUN_SPEED = 20;

  private keyStates: Record<string, boolean> = {};

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);

    // Initialize collision system
    this.worldOctree = new Octree();

    // Player is a capsule (cylinder with rounded ends)
    this.playerCollider = new Capsule(
      new THREE.Vector3(0, this.PLAYER_RADIUS, 0),
      new THREE.Vector3(0, this.PLAYER_HEIGHT, 0),
      this.PLAYER_RADIUS
    );

    // Physics
    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3();
    this.playerOnFloor = false;

    // Movement
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.setupEventListeners();
  }

  /**
   * Build octree from scene geometry
   */
  public buildOctreeFromMesh(mesh: THREE.Mesh): void {
    this.worldOctree.fromGraphNode(mesh);
  }

  /**
   * Build octree from GLTF model
   */
  public async loadWorldFromGLTF(url: string): Promise<void> {
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;

          // Traverse and add all meshes to octree
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Ensure geometry is indexed for better performance
              if (!child.geometry.index) {
                child.geometry = child.geometry.toNonIndexed();
              }

              child.geometry.computeBoundsTree();
            }
          });

          this.worldOctree.fromGraphNode(scene);
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));

    // Pointer lock events
    this.controls.addEventListener('lock', () => {
      console.log('Controls locked');
    });

    this.controls.addEventListener('unlock', () => {
      console.log('Controls unlocked');
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keyStates[event.code] = true;

    switch (event.code) {
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'Space':
        if (this.playerOnFloor) {
          this.playerVelocity.y = this.JUMP_VELOCITY;
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keyStates[event.code] = false;

    switch (event.code) {
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'KeyD':
        this.moveRight = false;
        break;
    }
  }

  /**
   * Get player movement input
   */
  private getForwardVector(): THREE.Vector3 {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();

    return this.playerDirection;
  }

  private getSideVector(): THREE.Vector3 {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();
    this.playerDirection.cross(this.camera.up);

    return this.playerDirection;
  }

  /**
   * Apply player controls
   */
  private controls(deltaTime: number): void {
    // Damping factor
    const damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.playerOnFloor) {
      this.playerVelocity.x -= this.playerVelocity.x * damping;
      this.playerVelocity.z -= this.playerVelocity.z * damping;
    } else {
      const speedDelta = deltaTime * (this.keyStates['ShiftLeft'] ? this.RUN_SPEED : this.WALK_SPEED);

      if (this.moveForward) {
        this.playerVelocity.add(this.getForwardVector().multiplyScalar(speedDelta));
      }

      if (this.moveBackward) {
        this.playerVelocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
      }

      if (this.moveLeft) {
        this.playerVelocity.add(this.getSideVector().multiplyScalar(-speedDelta));
      }

      if (this.moveRight) {
        this.playerVelocity.add(this.getSideVector().multiplyScalar(speedDelta));
      }

      // Apply damping when on floor
      this.playerVelocity.x -= this.playerVelocity.x * 10 * deltaTime;
      this.playerVelocity.z -= this.playerVelocity.z * 10 * deltaTime;
    }
  }

  /**
   * Update player position with collision detection
   */
  private updatePlayer(deltaTime: number): void {
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.playerOnFloor) {
      this.playerVelocity.y -= this.GRAVITY * deltaTime;

      // Small air resistance
      damping *= 0.1;
    }

    this.playerVelocity.y += damping * this.playerVelocity.y;

    const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
    this.playerCollider.translate(deltaPosition);

    this.playerOnFloor = false;

    const result = this.worldOctree.capsuleIntersect(this.playerCollider);

    if (result) {
      this.playerOnFloor = result.normal.y > 0;

      if (!this.playerOnFloor) {
        this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));
      }

      this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  /**
   * Teleport player to a position
   */
  public teleportPlayerIfOob(): void {
    if (this.camera.position.y <= -25) {
      this.playerCollider.start.set(0, 0.35, 0);
      this.playerCollider.end.set(0, 1.7, 0);
      this.playerCollider.radius = 0.35;
      this.camera.position.copy(this.playerCollider.end);
      this.camera.rotation.set(0, 0, 0);
    }
  }

  /**
   * Set player spawn position
   */
  public setPlayerPosition(x: number, y: number, z: number): void {
    this.playerCollider.start.set(x, y + this.PLAYER_RADIUS, z);
    this.playerCollider.end.set(x, y + this.PLAYER_HEIGHT, z);
    this.camera.position.copy(this.playerCollider.end);
  }

  /**
   * Main update loop (call this in your animation loop)
   */
  public update(deltaTime: number): void {
    if (!this.controls.isLocked) return;

    const steps = this.STEPS_PER_FRAME;

    for (let i = 0; i < steps; i++) {
      this.controls(deltaTime / steps);
      this.updatePlayer(deltaTime / steps);
    }

    // Update camera position to match player capsule
    this.camera.position.copy(this.playerCollider.end);

    // Check if player fell out of bounds
    this.teleportPlayerIfOob();
  }

  /**
   * Get current player velocity
   */
  public getVelocity(): THREE.Vector3 {
    return this.playerVelocity.clone();
  }

  /**
   * Get player position
   */
  public getPosition(): THREE.Vector3 {
    return this.playerCollider.end.clone();
  }

  /**
   * Check if player is on floor
   */
  public isOnFloor(): boolean {
    return this.playerOnFloor;
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
   * Check if controls are locked
   */
  public get isLocked(): boolean {
    return this.controls.isLocked;
  }

  /**
   * Clean up
   */
  public dispose(): void {
    this.controls.dispose();
  }
}
```

## Usage Example

```typescript
import * as THREE from 'three';
import { OctreeFPSController } from './OctreeFPSController';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x88ccee, 0, 50);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
fillLight1.position.set(2, 1, 1);
scene.add(fillLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(-5, 25, -1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00006;
scene.add(directionalLight);

// Create controller
const controller = new OctreeFPSController(camera, document.body);

// UI setup
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

// Load world geometry
async function loadWorld() {
  // Option 1: Load from GLTF
  await controller.loadWorldFromGLTF('/models/collision-world.glb');

  // Option 2: Build from scene geometry
  // const geometry = new THREE.BoxGeometry(100, 1, 100);
  // const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
  // const ground = new THREE.Mesh(geometry, material);
  // ground.receiveShadow = true;
  // scene.add(ground);
  // controller.buildOctreeFromMesh(ground);

  // Set spawn position
  controller.setPlayerPosition(0, 5, 0);

  // Start animation loop
  animate();
}

loadWorld();

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(0.05, clock.getDelta());

  controller.update(delta);

  renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## Performance Optimization

### 1. Geometry Preparation

```typescript
/**
 * Optimize mesh geometry for collision detection
 */
function optimizeMeshForCollision(mesh: THREE.Mesh): void {
  // Ensure geometry is indexed
  if (!mesh.geometry.index) {
    mesh.geometry = mesh.geometry.toNonIndexed();
  }

  // Compute bounds tree for faster collision detection
  mesh.geometry.computeBoundsTree();

  // Compute vertex normals for smooth collisions
  mesh.geometry.computeVertexNormals();

  // Freeze geometry if it won't change
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}
```

### 2. LOD for Collision Meshes

```typescript
/**
 * Use simplified collision meshes for better performance
 */
function createCollisionMesh(visualMesh: THREE.Mesh): THREE.Mesh {
  // Create simplified geometry for collision
  const geometry = visualMesh.geometry.clone();

  // Simplify geometry (requires a simplification library)
  // geometry.simplify(0.1); // Reduce to 10% of original triangles

  const collisionMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ visible: false })
  );

  collisionMesh.position.copy(visualMesh.position);
  collisionMesh.rotation.copy(visualMesh.rotation);
  collisionMesh.scale.copy(visualMesh.scale);

  return collisionMesh;
}
```

### 3. Static vs Dynamic Objects

```typescript
/**
 * Separate static and dynamic collision handling
 */
class HybridCollisionSystem {
  private staticOctree: Octree;
  private dynamicObjects: THREE.Mesh[];

  constructor() {
    this.staticOctree = new Octree();
    this.dynamicObjects = [];
  }

  addStaticMesh(mesh: THREE.Mesh): void {
    this.staticOctree.fromGraphNode(mesh);
  }

  addDynamicMesh(mesh: THREE.Mesh): void {
    this.dynamicObjects.push(mesh);
  }

  checkCollision(capsule: Capsule): boolean {
    // Check static geometry (fast)
    const staticResult = this.staticOctree.capsuleIntersect(capsule);
    if (staticResult) return true;

    // Check dynamic objects (slower, but fewer objects)
    for (const obj of this.dynamicObjects) {
      // Implement dynamic collision check
      // ...
    }

    return false;
  }
}
```

## Integration with three-mesh-bvh

For even better performance, use the `three-mesh-bvh` library:

```typescript
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Add extension methods to THREE.BufferGeometry
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Use in your geometry
const geometry = new THREE.BoxGeometry(10, 10, 10);
geometry.computeBoundsTree();

// Dispose when done
geometry.disposeBoundsTree();
```

## Debugging Collision

```typescript
/**
 * Visualize the player capsule for debugging
 */
function createCapsuleHelper(capsule: Capsule): THREE.Group {
  const group = new THREE.Group();

  // Cylinder body
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(
      capsule.radius,
      capsule.radius,
      capsule.start.distanceTo(capsule.end),
      16
    ),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
  );

  // Top sphere
  const topSphere = new THREE.Mesh(
    new THREE.SphereGeometry(capsule.radius, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
  );
  topSphere.position.copy(capsule.end);

  // Bottom sphere
  const bottomSphere = new THREE.Mesh(
    new THREE.SphereGeometry(capsule.radius, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
  );
  bottomSphere.position.copy(capsule.start);

  group.add(cylinder, topSphere, bottomSphere);

  return group;
}

// Usage
const capsuleHelper = createCapsuleHelper(controller.playerCollider);
scene.add(capsuleHelper);

// Update in animation loop
function animate() {
  // Update capsule helper position
  capsuleHelper.position.copy(controller.getPosition());
  // ...
}
```

## Comparison: Raycasting vs Octree

```typescript
// Raycasting approach (from basic example)
const raycaster = new THREE.Raycaster();
raycaster.ray.origin.copy(playerPosition);
const intersections = raycaster.intersectObjects(objects); // O(n)

// Octree approach (this example)
const result = worldOctree.capsuleIntersect(playerCollider); // O(log n)
```

## Best Practices

1. **Pre-build Octree**: Build the octree once during scene loading, not every frame
2. **Simplify Collision Meshes**: Use lower-poly collision meshes separate from visual meshes
3. **Sub-stepping**: Use multiple physics steps per frame for stability (`STEPS_PER_FRAME`)
4. **Capsule Over Box**: Capsule colliders are smoother and more realistic for characters
5. **Bounds Tree**: Use `computeBoundsTree()` on geometry for faster collision checks
6. **Static vs Dynamic**: Separate static world geometry from dynamic objects

## Common Issues

**Issue**: Player falls through floor
- **Solution**: Increase `STEPS_PER_FRAME` for more accurate collision detection

**Issue**: Player gets stuck in walls
- **Solution**: Check capsule radius, ensure geometry has no holes or inverted normals

**Issue**: Poor performance
- **Solution**: Simplify collision meshes, use separate low-poly collision geometry

**Issue**: Jittery movement
- **Solution**: Use damping, clamp delta time, increase sub-steps

## Related Resources

- Official example: `examples/games_fps.html`
- three-mesh-bvh: https://github.com/gkjohnson/three-mesh-bvh
- Octree documentation: Three.js addons/math/Octree.js
- Capsule documentation: Three.js addons/math/Capsule.js
