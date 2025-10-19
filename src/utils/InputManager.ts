/**
 * InputManager - State-based keyboard input tracking
 * Tracks key states for smooth, responsive movement controls
 */

export interface InputState {
  // Movement
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;

  // Actions
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  interact: boolean;

  // Utility
  isAnyMovementKey: boolean;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  public state: InputState;
  private interactPressed = false;

  constructor() {
    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      crouch: false,
      jump: false,
      interact: false,
      isAnyMovementKey: false
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Prevent key repeat
    if (event.repeat) return;

    this.keys.set(event.code, true);
    if (event.code === 'KeyE') {
      this.interactPressed = true;
    }
    this.updateState();
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.code, false);
    this.updateState();
  }

  private updateState(): void {
    // Movement keys (WASD)
    this.state.forward = this.keys.get('KeyW') || false;
    this.state.backward = this.keys.get('KeyS') || false;
    this.state.left = this.keys.get('KeyA') || false;
    this.state.right = this.keys.get('KeyD') || false;

    // Actions
    this.state.sprint = this.keys.get('ShiftLeft') || this.keys.get('ShiftRight') || false;
    this.state.crouch = this.keys.get('ControlLeft') || this.keys.get('ControlRight') || false;
    this.state.jump = this.keys.get('Space') || false;
    this.state.interact = this.keys.get('KeyE') || false;

    // Check if any movement key is pressed
    this.state.isAnyMovementKey =
      this.state.forward ||
      this.state.backward ||
      this.state.left ||
      this.state.right;
  }

  /**
   * Get normalized movement direction vector
   * Returns {x: -1 to 1, z: -1 to 1}
   */
  public getMovementVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.state.forward) z -= 1;
    if (this.state.backward) z += 1;
    if (this.state.left) x -= 1;
    if (this.state.right) x += 1;

    // Normalize diagonal movement (prevent faster diagonal speed)
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    return { x, z };
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /**
   * Returns true once when the interact key is pressed.
   */
  public consumeInteractPress(): boolean {
    const wasPressed = this.interactPressed;
    this.interactPressed = false;
    return wasPressed;
  }
}
