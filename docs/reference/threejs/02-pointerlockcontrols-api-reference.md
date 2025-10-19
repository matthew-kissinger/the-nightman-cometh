# PointerLockControls API Reference (r180)

**Source URL**: https://threejs.org/docs/#examples/en/controls/PointerLockControls
**Three.js Version**: r180 / 0.180.0
**Date**: 2024-2025
**License**: MIT License

## Overview

Implementation of the Pointer Lock API for first-person camera controls in Three.js. This control enables mouse-look functionality commonly used in 3D games where the mouse cursor is hidden and movement is unrestricted.

## Import

```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
```

**Note**: The import path changed from `three/examples/jsm/` to `three/addons/` in recent versions. Use `three/addons/` for r180.

## Constructor

```typescript
new PointerLockControls(camera: Camera, domElement: HTMLElement)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `camera` | `Camera` | Yes | The camera to be controlled. Usually a `PerspectiveCamera`. |
| `domElement` | `HTMLElement` | **Yes (r180)** | The HTML element used for event listeners. Commonly `document.body`. **This parameter became mandatory in r180.** |

### Example

```typescript
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new PointerLockControls(camera, document.body);
```

## Properties

### .camera : Camera

The camera being controlled.

```typescript
const currentCamera = controls.camera;
```

### .domElement : HTMLElement

The HTML element used for event listeners.

```typescript
console.log(controls.domElement); // document.body
```

### .isLocked : boolean (read-only)

Whether the controls are currently locked (pointer lock is active).

```typescript
if (controls.isLocked) {
  // Update player movement
}
```

### .minPolarAngle : number

The minimum vertical rotation angle in radians. Default is `0` (can look straight down).

```typescript
controls.minPolarAngle = Math.PI / 4; // Limit looking down to 45 degrees
```

### .maxPolarAngle : number

The maximum vertical rotation angle in radians. Default is `Math.PI` (can look straight up).

```typescript
controls.maxPolarAngle = (Math.PI * 3) / 4; // Limit looking up to 135 degrees
```

### .pointerSpeed : number

The speed/sensitivity of mouse movement. Default is `1.0`.

```typescript
controls.pointerSpeed = 0.5; // Reduce sensitivity by half
```

### .object : Camera

**New in r180**: Direct access to the controlled camera object. Replaces the deprecated `getObject()` method.

```typescript
// r180 and newer (recommended)
const cameraPosition = controls.object.position;

// Older versions (deprecated)
const cameraPosition = controls.getObject().position;
```

## Methods

### .connect() : void

Connects the event listeners. Called automatically in the constructor.

```typescript
controls.connect();
```

### .disconnect() : void

Disconnects the event listeners. Useful when temporarily disabling controls.

```typescript
// Disable controls
controls.disconnect();

// Re-enable controls
controls.connect();
```

### .dispose() : void

Removes all event listeners and cleans up resources. Call this when you're done with the controls.

```typescript
// Clean up when changing scenes
controls.dispose();
```

### .getObject() : Camera

**DEPRECATED in r180**: Returns the camera object. Use the `.object` property instead.

```typescript
// ❌ Deprecated (still works but will be removed)
const camera = controls.getObject();

// ✅ Recommended for r180
const camera = controls.object;
```

### .lock() : void

Requests pointer lock. Must be called in response to a user interaction (e.g., click event) due to browser security requirements.

```typescript
document.getElementById('startButton').addEventListener('click', () => {
  controls.lock();
});
```

### .unlock() : void

Exits pointer lock.

```typescript
// Exit pointer lock (e.g., pause menu)
controls.unlock();
```

### .moveForward(distance: number) : void

Moves the camera forward or backward along its local Z-axis.

```typescript
// Move forward 5 units
controls.moveForward(5);

// Move backward 3 units
controls.moveForward(-3);
```

**Note**: Distance should typically be multiplied by delta time for frame-rate independent movement:

```typescript
const delta = clock.getDelta();
controls.moveForward(playerSpeed * delta);
```

### .moveRight(distance: number) : void

Moves the camera left or right along its local X-axis.

```typescript
// Move right 5 units
controls.moveRight(5);

// Move left 3 units
controls.moveRight(-3);
```

**Note**: Distance should typically be multiplied by delta time:

```typescript
const delta = clock.getDelta();
controls.moveRight(strafeSpeed * delta);
```

## Events

PointerLockControls extends `EventDispatcher` and emits the following events:

### 'lock'

Fired when pointer lock is successfully acquired.

```typescript
controls.addEventListener('lock', () => {
  console.log('Controls locked - game active');
  hideMenu();
  startGameLoop();
});
```

### 'unlock'

Fired when pointer lock is released (user presses ESC or programmatically).

```typescript
controls.addEventListener('unlock', () => {
  console.log('Controls unlocked - game paused');
  showMenu();
  pauseGameLoop();
});
```

### 'change'

Fired when the camera orientation changes due to mouse movement.

```typescript
controls.addEventListener('change', () => {
  console.log('Camera orientation changed');
  // Useful for updating audio listener orientation, etc.
});
```

## Complete TypeScript Type Definitions

```typescript
import { Camera, EventDispatcher } from 'three';

export class PointerLockControls extends EventDispatcher {
  constructor(camera: Camera, domElement: HTMLElement);

  // Properties
  camera: Camera;
  domElement: HTMLElement;
  isLocked: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  pointerSpeed: number;
  object: Camera; // New in r180

  // Methods
  connect(): void;
  disconnect(): void;
  dispose(): void;
  getObject(): Camera; // Deprecated in r180
  lock(): void;
  unlock(): void;
  moveForward(distance: number): void;
  moveRight(distance: number): void;

  // Event handlers
  addEventListener(type: 'lock', listener: (event: Event) => void): void;
  addEventListener(type: 'unlock', listener: (event: Event) => void): void;
  addEventListener(type: 'change', listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}
```

## Usage Patterns

### Basic Setup with UI

```typescript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new PointerLockControls(camera, document.body);

// UI elements
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

// Lock on click
instructions.addEventListener('click', () => {
  controls.lock();
});

// Hide menu when locked
controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
  blocker.style.display = 'none';
});

// Show menu when unlocked
controls.addEventListener('unlock', () => {
  blocker.style.display = 'block';
  instructions.style.display = '';
});
```

### WASD Movement Pattern

```typescript
// Movement state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// Keyboard handlers
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyD': moveRight = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyD': moveRight = false; break;
  }
});

// Animation loop
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (controls.isLocked) {
    // Reset velocity with damping
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // Calculate direction
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Apply movement
    if (moveForward || moveBackward) {
      velocity.z -= direction.z * 400.0 * delta;
    }
    if (moveLeft || moveRight) {
      velocity.x -= direction.x * 400.0 * delta;
    }

    // Move camera
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  prevTime = time;
  renderer.render(scene, camera);
}

animate();
```

### With Jump and Gravity

```typescript
const velocity = new THREE.Vector3();
let canJump = false;

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && canJump) {
    velocity.y += 350;
    canJump = false;
  }
});

function animate() {
  const delta = clock.getDelta();

  if (controls.isLocked) {
    // Apply gravity
    velocity.y -= 9.8 * 100.0 * delta;

    // Apply movement (horizontal)
    // ... WASD movement code ...

    // Apply vertical movement
    controls.object.position.y += velocity.y * delta;

    // Floor collision
    if (controls.object.position.y < 10) {
      velocity.y = 0;
      controls.object.position.y = 10;
      canJump = true;
    }
  }

  renderer.render(scene, camera);
}
```

### Adjusting Sensitivity

```typescript
// Lower sensitivity
controls.pointerSpeed = 0.5;

// Higher sensitivity
controls.pointerSpeed = 2.0;

// Dynamic sensitivity based on user settings
const sensitivitySlider = document.getElementById('sensitivity');
sensitivitySlider.addEventListener('input', (e) => {
  controls.pointerSpeed = parseFloat(e.target.value);
});
```

### Limiting Vertical Rotation

```typescript
// Prevent looking straight up or down (prevent disorientation)
controls.minPolarAngle = Math.PI / 6; // 30 degrees from straight down
controls.maxPolarAngle = (Math.PI * 5) / 6; // 150 degrees (30 degrees from straight up)

// Only allow looking horizontally (no vertical rotation)
controls.minPolarAngle = Math.PI / 2;
controls.maxPolarAngle = Math.PI / 2;
```

## Migration from Previous Versions

### r179 → r180

**Breaking Change: Mandatory domElement**

```typescript
// ❌ Old (r179 and earlier) - domElement was optional
const controls = new PointerLockControls(camera);

// ✅ New (r180) - domElement is required
const controls = new PointerLockControls(camera, document.body);
```

**Deprecated: getObject() method**

```typescript
// ❌ Deprecated (still works in r180 but will be removed)
const camera = controls.getObject();
camera.position.y += 10;

// ✅ Recommended
const camera = controls.object;
camera.position.y += 10;
```

**Import Path Change** (earlier versions)

```typescript
// ❌ Old path (may still work but deprecated)
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ✅ New path (r160+)
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
```

## Browser Compatibility

The Pointer Lock API requires:
- User interaction to activate (security requirement)
- HTTPS in production (or localhost for development)
- Modern browsers (Chrome 37+, Firefox 41+, Safari 10.1+, Edge 13+)

### Checking for Pointer Lock Support

```typescript
if ('pointerLockElement' in document) {
  // Pointer Lock API is supported
  controls.lock();
} else {
  console.error('Pointer Lock API not supported');
  // Provide fallback controls or error message
}
```

## Common Integration Patterns

### With Physics Engine (Rapier)

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

const characterController = world.createCharacterController(0.01);
const characterBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());

function animate() {
  if (controls.isLocked) {
    // Calculate movement
    const movement = {
      x: velocity.x * delta,
      y: velocity.y * delta,
      z: velocity.z * delta,
    };

    // Update physics
    characterController.computeColliderMovement(
      characterCollider,
      movement
    );

    const correctedMovement = characterController.computedMovement();

    // Sync camera with physics body
    const newPos = characterBody.translation();
    controls.object.position.set(newPos.x, newPos.y + 1.7, newPos.z);
  }
}
```

### With Audio Listener

```typescript
const listener = new THREE.AudioListener();
controls.object.add(listener);

// Audio listener orientation updates automatically with camera
controls.addEventListener('change', () => {
  // Listener orientation is updated because it's a child of the camera
});
```

## Performance Considerations

1. **Event Throttling**: The `change` event fires frequently. Throttle expensive operations:

```typescript
let lastUpdate = 0;
controls.addEventListener('change', () => {
  const now = performance.now();
  if (now - lastUpdate > 100) { // Update at most every 100ms
    updateExpensiveOperation();
    lastUpdate = now;
  }
});
```

2. **Movement Calculations**: Perform movement calculations only when `isLocked` is true:

```typescript
if (controls.isLocked) {
  // Perform expensive physics calculations
}
```

3. **Dispose Properly**: Always call `dispose()` when removing controls:

```typescript
function cleanup() {
  controls.dispose();
  renderer.dispose();
  // ... other cleanup
}
```

## Security and User Experience

1. **Always require user interaction** to call `lock()`:

```typescript
// ✅ Good - triggered by user click
button.addEventListener('click', () => controls.lock());

// ❌ Bad - will fail due to browser security
window.addEventListener('load', () => controls.lock());
```

2. **Provide clear instructions** to users:

```html
<div id="instructions">
  <p>Click to play</p>
  <p>Move: WASD | Jump: SPACE | Look: MOUSE</p>
  <p>Press ESC to exit</p>
</div>
```

3. **Handle unlock gracefully**:

```typescript
controls.addEventListener('unlock', () => {
  // Pause game
  // Show menu
  // Save state
});
```

## Debugging Tips

```typescript
// Check if controls are locked
console.log('Is locked:', controls.isLocked);

// Monitor camera position
controls.addEventListener('change', () => {
  console.log('Camera position:', controls.object.position);
  console.log('Camera rotation:', controls.object.rotation);
});

// Verify pointer lock capability
document.addEventListener('pointerlockchange', () => {
  console.log('Pointer lock element:', document.pointerLockElement);
});

document.addEventListener('pointerlockerror', () => {
  console.error('Pointer lock error');
});
```
