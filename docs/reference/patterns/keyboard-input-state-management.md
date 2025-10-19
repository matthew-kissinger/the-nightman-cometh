# Keyboard Input State Management for Three.js Games

**Source URL**: https://github.com/jeromeetienne/threex.keyboardstate
**Additional**: https://www.shanebrumback.com/blog/programming-keyboard-inputs-for-threejs-first-person-3d-games.html
**Date**: 2024 best practices
**Stack**:
- Three.js: Framework agnostic
- TypeScript: Adaptable

**License**: MIT (threex.keyboardstate)

## What This Example Demonstrates

Proper keyboard input handling for games requires state management rather than just event listeners. The threex.keyboardstate library provides a clean pattern for tracking which keys are currently pressed, making movement logic simpler and more reliable.

## Key Implementation Patterns

### Basic State Management Class

```typescript
// Based on threex.keyboardstate pattern
class KeyboardState {
  private keyCodes: { [key: string]: boolean } = {};
  private modifiers: string[] = ['shift', 'ctrl', 'alt', 'meta'];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Bind to document to capture all keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);

    // Reset on window blur (prevent stuck keys)
    window.addEventListener('blur', this.onBlur.bind(this), false);
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keyCodes[event.code] = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keyCodes[event.code] = false;
  }

  private onBlur(): void {
    // Reset all keys when window loses focus
    this.keyCodes = {};
  }

  // Check if a key is currently pressed
  public pressed(keyCode: string): boolean {
    return this.keyCodes[keyCode] || false;
  }

  // Destroy event listeners
  public destroy(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('blur', this.onBlur.bind(this));
  }
}
```

### Usage in Game Loop

```typescript
// Initialize once
const keyboard = new KeyboardState();

// Use in animation loop
function animate() {
  requestAnimationFrame(animate);

  // Simple and clean checks
  if (keyboard.pressed('KeyW')) {
    moveForward();
  }
  if (keyboard.pressed('KeyS')) {
    moveBackward();
  }
  if (keyboard.pressed('KeyA')) {
    strafeLeft();
  }
  if (keyboard.pressed('KeyD')) {
    strafeRight();
  }
  if (keyboard.pressed('Space')) {
    jump();
  }
  if (keyboard.pressed('ShiftLeft')) {
    sprint();
  }

  renderer.render(scene, camera);
}
```

### Advanced Pattern - Input Manager

```typescript
// More sophisticated pattern for complex games
class InputManager {
  private keyboard: KeyboardState;
  private bindings: Map<string, string> = new Map();

  constructor() {
    this.keyboard = new KeyboardState();
    this.setupDefaultBindings();
  }

  private setupDefaultBindings(): void {
    // Map actions to keys
    this.bindings.set('forward', 'KeyW');
    this.bindings.set('backward', 'KeyS');
    this.bindings.set('left', 'KeyA');
    this.bindings.set('right', 'KeyD');
    this.bindings.set('jump', 'Space');
    this.bindings.set('sprint', 'ShiftLeft');
    this.bindings.set('crouch', 'KeyC');
    this.bindings.set('interact', 'KeyE');
  }

  public isActionActive(action: string): boolean {
    const keyCode = this.bindings.get(action);
    if (!keyCode) return false;
    return this.keyboard.pressed(keyCode);
  }

  public rebindAction(action: string, newKeyCode: string): void {
    this.bindings.set(action, newKeyCode);
  }

  public getMovementVector(): { x: number, z: number } {
    const movement = { x: 0, z: 0 };

    if (this.isActionActive('forward')) movement.z += 1;
    if (this.isActionActive('backward')) movement.z -= 1;
    if (this.isActionActive('left')) movement.x -= 1;
    if (this.isActionActive('right')) movement.x += 1;

    // Normalize diagonal movement
    if (movement.x !== 0 && movement.z !== 0) {
      const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
      movement.x /= length;
      movement.z /= length;
    }

    return movement;
  }
}
```

### Integration with Sprint/Stamina System

```typescript
class PlayerController {
  private input: InputManager;
  private stamina: number = 100;
  private maxStamina: number = 100;
  private sprintDrainRate: number = 20; // per second
  private staminaRegenRate: number = 10; // per second
  private minStaminaToSprint: number = 10;

  private baseSpeed: number = 5;
  private sprintMultiplier: number = 1.8;

  constructor() {
    this.input = new InputManager();
  }

  public update(deltaTime: number): void {
    const movement = this.input.getMovementVector();
    const wantsToSprint = this.input.isActionActive('sprint');
    const isMoving = movement.x !== 0 || movement.z !== 0;

    // Sprint logic
    const canSprint = this.stamina >= this.minStaminaToSprint && isMoving;
    const isSprinting = wantsToSprint && canSprint;

    // Update stamina
    if (isSprinting) {
      this.stamina -= this.sprintDrainRate * deltaTime;
      this.stamina = Math.max(0, this.stamina);
    } else if (!wantsToSprint) {
      // Regenerate when not trying to sprint
      this.stamina += this.staminaRegenRate * deltaTime;
      this.stamina = Math.min(this.maxStamina, this.stamina);
    }

    // Calculate final speed
    const speed = isSprinting
      ? this.baseSpeed * this.sprintMultiplier
      : this.baseSpeed;

    // Apply movement (integrate with physics/camera)
    this.applyMovement(movement, speed, deltaTime);
  }

  private applyMovement(
    movement: { x: number, z: number },
    speed: number,
    deltaTime: number
  ): void {
    // Implementation depends on physics system
    // See other pattern documents for physics integration
  }
}
```

## Implementation Notes

- **State vs Events**: Store key state rather than reacting to events in game loop
- **Window Blur**: Always reset keys when window loses focus to prevent "stuck" keys
- **Normalization**: Diagonal movement needs normalization to prevent faster speed
- **Action Mapping**: Use action names instead of key codes for rebindable controls

## Gotchas

- **Event.code vs Event.key**: Use `event.code` for physical key position, `event.key` for character produced
  - `event.code = 'KeyW'` (physical W key, regardless of keyboard layout)
  - `event.key = 'w'` or 'W' (affected by Shift, Caps Lock, keyboard layout)
- **Stuck Keys**: Window blur events are essential - without them, keys can stay "pressed" when window loses focus
- **Multiple Keys**: Some keyboards have limitations on simultaneous key presses (n-key rollover)
- **Input Delay**: State-based approach removes input lag from event processing

## Performance Tips

- Object lookup is O(1) for key state checks
- Avoid creating new objects in the game loop (movement vectors)
- Event listeners on `document` level catch all keys
- Single blur event handler prevents many edge cases

## Best Practices from Shane Brumback Tutorial

1. **Event Handling is Key**: The key to adding keyboard inputs is proper event handling
2. **Common Bindings**:
   - W, A, S, D: Character movement
   - Space: Jump/Actions
   - Shift: Sprint
   - Arrow Keys: Alternative movement or camera control
3. **Respond Accordingly**: Listen for specific keypress events and update game state
4. **FPS-Specific**: First-person games need camera-relative movement calculations

## Relevance to Our Project

**Critical Foundation**:
- State-based input is essential for smooth FPS controls
- Sprint/stamina system builds directly on this pattern
- Clean separation of input from game logic

**Direct Applications**:
- WASD movement state tracking
- Sprint key detection for stamina system
- Jump, crouch, interact keys for gameplay
- Foundation for rebindable controls (future feature)

**TypeScript Implementation**:
```typescript
// Type-safe input manager for our project
export class GameInput {
  private state: KeyboardState;

  constructor() {
    this.state = new KeyboardState();
  }

  public getPlayerInput(): PlayerInput {
    return {
      forward: this.state.pressed('KeyW'),
      backward: this.state.pressed('KeyS'),
      left: this.state.pressed('KeyA'),
      right: this.state.pressed('KeyD'),
      jump: this.state.pressed('Space'),
      sprint: this.state.pressed('ShiftLeft'),
      interact: this.state.pressed('KeyE'),
    };
  }

  public destroy(): void {
    this.state.destroy();
  }
}

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  interact: boolean;
}
```

## Resources

- threex.keyboardstate: https://github.com/jeromeetienne/threex.keyboardstate
- Shane Brumback FPS Tutorial: https://www.shanebrumback.com/blog/programming-keyboard-inputs-for-threejs-first-person-3d-games.html
- Three.js Forum discussions on keyboard input patterns
