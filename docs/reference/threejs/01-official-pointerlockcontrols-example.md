# Official Three.js PointerLockControls Example (r180)

**Source URL**: https://github.com/mrdoob/three.js/blob/r180/examples/misc_controls_pointerlock.html
**Official Demo**: https://threejs.org/examples/misc_controls_pointerlock.html
**Date**: 2024-2025
**Three.js Version**: r180 / 0.180.0
**License**: MIT License

## Overview

This is the official Three.js example demonstrating PointerLockControls with full first-person game mechanics including WASD movement, jumping, gravity, and collision detection using raycasting.

## Implementation Pattern

The official example follows this architecture:
1. **Controls Setup**: Initialize PointerLockControls with camera and DOM element
2. **Event Listeners**: Handle pointer lock events and keyboard input separately
3. **Movement State**: Track movement directions via boolean flags
4. **Physics Loop**: Apply velocity, gravity, and collision detection in the animation loop
5. **Raycasting**: Use rays to detect collisions with scene objects

## Import Statement (r180)

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
```

**Important**: In r180, the import path uses `three/addons/` not `three/examples/jsm/`

## Complete TypeScript Implementation

```typescript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.Fog(0xffffff, 0, 750);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.y = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
light.position.set(0.5, 1, 0.75);
scene.add(light);

// Initialize PointerLockControls
// IMPORTANT: In r180, the domElement parameter is MANDATORY
const controls = new PointerLockControls(camera, document.body);

// Create blocker and instructions overlay
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
  blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  blocker.style.display = 'block';
  instructions.style.display = '';
});

scene.add(controls.getObject()); // Deprecated! Use controls.object in r180+

// Movement state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

// Velocity and direction
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Raycaster for collision detection
const raycaster = new THREE.Raycaster(
  new THREE.Vector3(),
  new THREE.Vector3(0, -1, 0),
  0,
  10
);

// Objects array for collision detection
const objects: THREE.Object3D[] = [];

// Keyboard event handlers
const onKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (canJump) velocity.y += 350;
      canJump = false;
      break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Create ground
const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
floorGeometry.rotateX(-Math.PI / 2);

// Vertex displacement for terrain variation
const position = floorGeometry.attributes.position;
for (let i = 0, l = position.count; i < l; i++) {
  const vertex = new THREE.Vector3();
  vertex.fromBufferAttribute(position, i);
  vertex.x += Math.random() * 20 - 10;
  vertex.y += Math.random() * 2;
  vertex.z += Math.random() * 20 - 10;
  position.setXYZ(i, vertex.x, vertex.y, vertex.z);
}

floorGeometry.computeVertexNormals();

const floorMaterial = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa,
  wireframe: false
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
scene.add(floor);

// Create boxes for collision testing
const boxGeometry = new THREE.BoxGeometry(20, 20, 20);
const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

for (let i = 0; i < 500; i++) {
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
  box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
  box.position.z = Math.floor(Math.random() * 20 - 10) * 20;
  scene.add(box);
  objects.push(box);
}

// Animation loop
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();

  // Only update physics when controls are locked
  if (controls.isLocked) {
    // Raycast downward to check if player is on ground
    raycaster.ray.origin.copy(controls.object.position); // Use controls.object not getObject()
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);
    const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    // Apply damping to velocity
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // Apply gravity
    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    // Calculate movement direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Ensures consistent movement in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    // Ground collision
    if (onObject) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }

    // Apply velocity to camera position
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.object.position.y += velocity.y * delta;

    // Floor collision
    if (controls.object.position.y < 10) {
      velocity.y = 0;
      controls.object.position.y = 10;
      canJump = true;
    }
  }

  prevTime = time;

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Three.js PointerLockControls</title>
  <style>
    body {
      margin: 0;
      overflow: hidden;
    }

    #blocker {
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }

    #instructions {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      font-size: 14px;
      cursor: pointer;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div id="blocker">
    <div id="instructions">
      <p style="font-size: 36px">
        Click to play
      </p>
      <p>
        Move: WASD<br/>
        Jump: SPACE<br/>
        Look: MOUSE
      </p>
    </div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

## API Reference (r180)

### Constructor

```typescript
new PointerLockControls(camera: Camera, domElement: HTMLElement)
```

**Parameters:**
- `camera`: The camera to control (typically PerspectiveCamera)
- `domElement`: The HTML element to bind pointer lock events to (MANDATORY in r180)

### Properties

- `camera`: Camera - The camera being controlled
- `domElement`: HTMLElement - The DOM element for event binding
- `isLocked`: boolean - Whether pointer lock is currently active
- `minPolarAngle`: number - Minimum vertical rotation angle (default: 0)
- `maxPolarAngle`: number - Maximum vertical rotation angle (default: Math.PI)
- `pointerSpeed`: number - Mouse sensitivity multiplier (default: 1.0)

### Methods

- `connect()`: void - Connect event handlers
- `disconnect()`: void - Disconnect event handlers
- `dispose()`: void - Clean up event listeners
- `getObject()`: Camera - **DEPRECATED in r180** - Use `controls.object` instead
- `lock()`: void - Request pointer lock
- `unlock()`: void - Exit pointer lock
- `moveForward(distance: number)`: void - Move camera forward/backward
- `moveRight(distance: number)`: void - Move camera left/right

### Events

```typescript
controls.addEventListener('lock', () => {
  console.log('Pointer locked');
});

controls.addEventListener('unlock', () => {
  console.log('Pointer unlocked');
});

controls.addEventListener('change', () => {
  console.log('Camera orientation changed');
});
```

## Integration Notes

### Movement Implementation

- **Separate Concerns**: PointerLockControls only handles mouse look. You must implement keyboard movement separately.
- **Movement State**: Use boolean flags for each direction (forward, backward, left, right).
- **Velocity-Based**: Apply velocity and damping for smooth, physics-based movement.
- **Delta Time**: Always use delta time for frame-rate independent movement.

### Collision Detection

The official example uses raycasting for collision detection:

```typescript
const raycaster = new THREE.Raycaster(
  new THREE.Vector3(),
  new THREE.Vector3(0, -1, 0),
  0,
  10
);

// In animation loop:
raycaster.ray.origin.copy(controls.object.position);
const intersections = raycaster.intersectObjects(objects, false);
const onObject = intersections.length > 0;
```

### Best Practices

1. **Check isLocked**: Only update physics when `controls.isLocked === true`
2. **Normalize Direction**: Always normalize the direction vector for consistent movement speed
3. **Use controls.object**: Access the camera via `controls.object` not `getObject()` (deprecated in r180)
4. **Mandatory domElement**: Always provide the domElement parameter in the constructor (required in r180)
5. **Event Handling**: Set up lock/unlock event listeners for UI state management

### Common Issues and Solutions

**Issue**: Movement is too fast or too slow
- **Solution**: Adjust the velocity multiplier (e.g., `400.0 * delta`) in the movement calculations

**Issue**: Diagonal movement is faster than straight movement
- **Solution**: Normalize the direction vector: `direction.normalize()`

**Issue**: Controls don't work after setup
- **Solution**: Make sure you're calling `controls.lock()` to request pointer lock, usually on a user interaction (click)

**Issue**: Camera position doesn't update
- **Solution**: Ensure you're checking `controls.isLocked` before applying movement in the animation loop

**Issue**: TypeScript errors about getObject()
- **Solution**: Use `controls.object` instead of `controls.getObject()` (deprecated in r180)

### Performance Tips

- Use a single raycaster instance, don't create new ones each frame
- Limit collision objects with spatial partitioning for large scenes
- Consider using Octree collision (see `examples/games_fps.html`) for better performance with complex geometry
- Throttle raycasting if needed (not every frame for distant objects)

## Breaking Changes in r180

1. **Mandatory domElement**: The second constructor parameter is now required
2. **getObject() deprecated**: Use `controls.object` property instead
3. **Import path**: Use `three/addons/` not `three/examples/jsm/`

## Related Examples

- `examples/games_fps.html` - FPS example with Octree collision detection (more advanced)
- `examples/misc_controls_pointerlock.html` - Basic PointerLockControls with raycasting
