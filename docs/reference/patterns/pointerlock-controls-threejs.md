# PointerLockControls - Three.js FPS Camera Control

**Source URL**: https://threejs.org/docs/examples/en/controls/PointerLockControls.html
**Official Example**: https://threejs.org/examples/misc_controls_pointerlock.html
**Date**: Official Three.js API (current)
**Stack**:
- Three.js: r170+
- TypeScript: Type definitions available

**License**: MIT (Three.js)

## What This Example Demonstrates

PointerLockControls is the official Three.js solution for first-person camera control. It locks the mouse cursor and provides unrestricted camera rotation, making it "a perfect choice for first person 3D games."

## Key Implementation Patterns

### Basic Setup

```typescript
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
// For r180:
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Create controls
const controls = new PointerLockControls(camera, document.body);

// Lock on click
document.addEventListener('click', () => {
  controls.lock();
});

// Listen for lock/unlock events
controls.addEventListener('lock', () => {
  console.log('Pointer locked');
});

controls.addEventListener('unlock', () => {
  console.log('Pointer unlocked');
});

// Add controls object to scene (controls contain a group)
scene.add(controls.getObject());
```

### Mouse Look Implementation

```typescript
// PointerLockControls handles mouse movement internally
// No manual mouse event handling needed!

// Camera rotation happens automatically when locked
// Horizontal rotation: Yaw (Y-axis)
// Vertical rotation: Pitch (X-axis) - automatically clamped
```

### Integration with Movement

```typescript
// Official example pattern
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const moveForward = false;
const moveBackward = false;
const moveLeft = false;
const moveRight = false;

// Keyboard events
const onKeyDown = (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyD': moveRight = true; break;
  }
};

const onKeyUp = (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyD': moveRight = false; break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
```

### Camera-Relative Movement

```typescript
function animate() {
  requestAnimationFrame(animate);

  if (controls.isLocked) {
    const delta = clock.getDelta();

    // Damping
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // Calculate direction based on camera
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // Ensures consistent speed in all directions

    // Apply movement relative to camera direction
    if (moveForward || moveBackward) {
      velocity.z -= direction.z * 400.0 * delta;
    }
    if (moveLeft || moveRight) {
      velocity.x -= direction.x * 400.0 * delta;
    }

    // Move the controls (and camera)
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }

  renderer.render(scene, camera);
}
```

### UI Integration

```typescript
// Typical UI pattern from official example
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  blocker.style.display = 'block';
});
```

## Implementation Notes

- **Automatic Pitch Clamping**: PointerLockControls automatically prevents camera from rotating beyond vertical limits (no upside-down camera)
- **Built-in Movement Methods**: Provides `moveForward()`, `moveRight()` methods for camera-relative movement
- **Event System**: Emits 'lock', 'unlock', and 'change' events
- **Escape Key**: Browser automatically unlocks pointer when ESC is pressed

## Gotchas

- Must be activated by user interaction (click event) - browser security requirement
- `controls.getObject()` returns a Group containing the camera, not the camera itself
- Movement happens on the controls object, not the camera directly
- Controls don't handle physics - you need to integrate with Rapier separately

## Performance Tips

- PointerLockControls is lightweight and performant
- No need to manually handle mouse movement events
- Use `controls.isLocked` to check state before processing movement

## Relevance to Our Project

**Critical Component - Official Solution**:
- Standard way to implement FPS camera in Three.js
- Well-tested and maintained by Three.js team
- Integrates cleanly with our Three.js r180 setup

**Direct Applications**:
- Mouse look for first-person camera
- Camera-relative WASD movement
- UI for lock/unlock states
- Basis for our FPS controller

**Integration with Rapier**:
```typescript
// Pattern for integrating with physics
const controls = new PointerLockControls(camera, document.body);

// Camera follows physics body position
function syncCameraToPhysics(rigidBody) {
  const position = rigidBody.translation();
  controls.getObject().position.copy(position);
  // Add camera height offset
  controls.getObject().position.y += 1.6; // Eye level
}

// Apply camera direction to physics movement
function getMovementDirection() {
  const direction = new THREE.Vector3();
  controls.getDirection(direction);
  direction.y = 0; // Remove vertical component
  direction.normalize();
  return direction;
}
```

**TypeScript Support**:
```typescript
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const controls: PointerLockControls = new PointerLockControls(
  camera,
  renderer.domElement
);

// Type-safe event handling
controls.addEventListener('lock', () => {
  // locked
});
```

## Community Resources

- **Simple FP Controls**: https://github.com/jsantell/three-simple-fp-controls
- **FPS Controls**: https://github.com/JamesLMilner/threejs-fps-controls
- **Official Example**: Check Three.js examples folder for misc_controls_pointerlock.html

## Next Steps for Implementation

1. Set up PointerLockControls with our camera
2. Implement keyboard state management
3. Create camera-relative movement vectors
4. Integrate with Rapier character controller
5. Add sprint/stamina system to movement calculations
6. Implement head bob based on movement velocity
