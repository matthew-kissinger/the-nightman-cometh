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
  flashlight: boolean;

  // Weapon Switching
  weapon1: boolean; // Flashlight only
  weapon2: boolean; // Hatchet
  weapon3: boolean; // Shotgun

  // Mouse
  leftClick: boolean;
  rightClick: boolean;

  // Helper
  isAnyMovementKey?: boolean;
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  public state: InputState;
  private interactPressed = false;
  private flashlightTogglePressed = false;

  private weapon1Pressed = false;
  private weapon2Pressed = false;
  private weapon3Pressed = false;

  private leftClickPressed = false;
  private rightClickPressed = false;

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
      flashlight: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      leftClick: false,
      rightClick: false,
      isAnyMovementKey: false
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // Left click
      this.leftClickPressed = true;
      this.state.leftClick = true;
    } else if (event.button === 2) { // Right click
      this.rightClickPressed = true;
      this.state.rightClick = true;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.state.leftClick = false;
    } else if (event.button === 2) {
      this.state.rightClick = false;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Prevent key repeat
    if (event.repeat) return;

    this.keys.set(event.code, true);
    if (event.code === 'KeyE') {
      this.interactPressed = true;
    }
    if (event.code === 'KeyF') {
      this.flashlightTogglePressed = true;
    }
    if (event.code === 'Digit1') this.weapon1Pressed = true;
    if (event.code === 'Digit2') this.weapon2Pressed = true;
    if (event.code === 'Digit3') this.weapon3Pressed = true;
    
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
    this.state.crouch = this.keys.get('Space') || false;
    this.state.jump = this.keys.get('ControlLeft') || this.keys.get('ControlRight') || false;
    this.state.interact = this.keys.get('KeyE') || false;
    this.state.flashlight = this.keys.get('KeyF') || false;
    this.state.weapon1 = this.keys.get('Digit1') || false;
    this.state.weapon2 = this.keys.get('Digit2') || false;
    this.state.weapon3 = this.keys.get('Digit3') || false;

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
   * Returns true once when left click is pressed
   */
  public consumeLeftClick(): boolean {
    const wasPressed = this.leftClickPressed;
    this.leftClickPressed = false;
    return wasPressed;
  }

  /**
   * Returns true once when right click is pressed
   */
  public consumeRightClick(): boolean {
    const wasPressed = this.rightClickPressed;
    this.rightClickPressed = false;
    if (wasPressed) {
      console.log('🖱️ Right-click consumed');
    }
    return wasPressed;
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Returns true once when the interact key is pressed.
   */
  public consumeInteractPress(): boolean {
    const wasPressed = this.interactPressed;
    this.interactPressed = false;
    return wasPressed;
  }

  /**
   * Check if interact was pressed this frame without consuming it.
   */
  public hasInteractPress(): boolean {
    return this.interactPressed;
  }

  /**
   * Returns true once when the flashlight toggle key (F) is pressed.
   */
  public consumeFlashlightToggle(): boolean {
    const wasPressed = this.flashlightTogglePressed;
    this.flashlightTogglePressed = false;
    return wasPressed;
  }

  public consumeWeaponSwitch(): number | null {
    if (this.weapon1Pressed) {
      this.weapon1Pressed = false;
      return 1;
    }
    if (this.weapon2Pressed) {
      this.weapon2Pressed = false;
      return 2;
    }
    if (this.weapon3Pressed) {
      this.weapon3Pressed = false;
      return 3;
    }
    return null;
  }
}
