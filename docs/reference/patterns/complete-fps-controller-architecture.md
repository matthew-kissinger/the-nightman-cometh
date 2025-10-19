# Complete FPS Controller Architecture - Integration Guide

**Purpose**: Master reference combining all patterns into a cohesive FPS controller architecture
**Date**: 2024
**Stack**:
- Three.js: r180
- Rapier3D: 0.14.0
- TypeScript: 5.6.2

## Architecture Overview

This document synthesizes patterns from multiple sources into a complete, production-ready FPS controller for horror games.

```
┌─────────────────────────────────────────────────┐
│           Game (Main Loop)                      │
│  - Animation loop                               │
│  - Delta time management                        │
│  - Orchestrates all systems                     │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼─────────┐   ┌──────▼──────────┐
│  Input System   │   │  Physics World  │
│  - Keyboard     │   │  - Rapier       │
│  - Mouse        │   │  - Collision    │
│  - PointerLock  │   │  - Stepping     │
└───────┬─────────┘   └──────┬──────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────┐
        │  Player Controller          │
        │  - Character controller     │
        │  - Movement                 │
        │  - Stamina                  │
        │  - Camera sync              │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Camera Effects     │
        │  - Head bob         │
        │  - Breathing        │
        │  - Fear effects     │
        └─────────────────────┘
```

## Complete Type Definitions

```typescript
// Core interfaces
interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  interact: boolean;
}

interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  stamina: number;
  isGrounded: boolean;
  isSprinting: boolean;
  isMoving: boolean;
  fearLevel: number;
}

interface ControllerConfig {
  // Movement
  baseSpeed: number;
  sprintMultiplier: number;
  jumpForce: number;
  acceleration: number;
  deceleration: number;

  // Stamina
  maxStamina: number;
  sprintDrainRate: number;
  staminaRegenRate: number;
  minStaminaToSprint: number;

  // Camera
  eyeHeight: number;
  mouseSensitivity: number;

  // Physics
  characterRadius: number;
  characterHeight: number;
  characterMass: number;
}

interface CameraEffectsConfig {
  // Head bob
  headBobEnabled: boolean;
  walkBobSpeed: number;
  walkBobAmount: number;
  sprintBobSpeed: number;
  sprintBobAmount: number;

  // Breathing
  breathingEnabled: boolean;
  breathingSpeed: number;
  breathingAmount: number;

  // Fear effects
  fearEffectsEnabled: boolean;
  fearShakeThreshold: number;
  fearShakeAmount: number;
}
```

## Layer 1: Input System

```typescript
import { KeyboardState } from './KeyboardState';

export class InputManager {
  private keyboard: KeyboardState;
  private controls: PointerLockControls;
  private isLocked: boolean = false;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.keyboard = new KeyboardState();
    this.controls = new PointerLockControls(camera, domElement);

    this.setupPointerLock();
  }

  private setupPointerLock(): void {
    document.addEventListener('click', () => {
      this.controls.lock();
    });

    this.controls.addEventListener('lock', () => {
      this.isLocked = true;
    });

    this.controls.addEventListener('unlock', () => {
      this.isLocked = false;
    });
  }

  getInput(): PlayerInput {
    return {
      forward: this.keyboard.pressed('KeyW'),
      backward: this.keyboard.pressed('KeyS'),
      left: this.keyboard.pressed('KeyA'),
      right: this.keyboard.pressed('KeyD'),
      jump: this.keyboard.pressed('Space'),
      sprint: this.keyboard.pressed('ShiftLeft'),
      interact: this.keyboard.pressed('KeyE'),
    };
  }

  getControls(): PointerLockControls {
    return this.controls;
  }

  isPointerLocked(): boolean {
    return this.isLocked;
  }

  destroy(): void {
    this.keyboard.destroy();
    this.controls.dispose();
  }
}
```

## Layer 2: Physics Integration

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  private world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;

  async init(): Promise<void> {
    this.rapier = await RAPIER.init();

    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new this.rapier.World(gravity);
  }

  step(): void {
    if (this.world) {
      this.world.step();
    }
  }

  getWorld(): RAPIER.World {
    if (!this.world) throw new Error('Physics world not initialized');
    return this.world;
  }

  getRapier(): typeof RAPIER {
    if (!this.rapier) throw new Error('Rapier not initialized');
    return this.rapier;
  }

  createCharacterController(offset: number = 0.01): RAPIER.KinematicCharacterController {
    const controller = this.getWorld().createCharacterController(offset);

    // Enable auto-stepping (climb stairs)
    controller.enableAutostep(0.5, 0.2, true);

    // Enable snap to ground (stay grounded on slopes)
    controller.enableSnapToGround(0.5);

    return controller;
  }
}
```

## Layer 3: Player Controller

```typescript
export class PlayerController {
  private config: ControllerConfig;
  private state: PlayerState;

  private characterController: RAPIER.KinematicCharacterController;
  private rigidBody: RAPIER.RigidBody;
  private collider: RAPIER.Collider;

  private cameraGroup: THREE.Group;
  private direction: THREE.Vector3 = new THREE.Vector3();

  constructor(
    physics: PhysicsWorld,
    camera: THREE.Camera,
    config: Partial<ControllerConfig> = {}
  ) {
    this.config = this.getDefaultConfig(config);
    this.state = this.getInitialState();

    // Create camera group (PointerLockControls will control this)
    this.cameraGroup = new THREE.Group();
    this.cameraGroup.add(camera);
    this.cameraGroup.position.y = this.config.eyeHeight;

    // Create physics character
    const rapier = physics.getRapier();
    const world = physics.getWorld();

    // Kinematic rigid body
    const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, this.config.eyeHeight, 0);
    this.rigidBody = world.createRigidBody(bodyDesc);

    // Capsule collider (good for characters)
    const colliderDesc = rapier.ColliderDesc.capsule(
      this.config.characterHeight / 2,
      this.config.characterRadius
    );
    this.collider = world.createCollider(colliderDesc, this.rigidBody);

    // Character controller
    this.characterController = physics.createCharacterController();
  }

  update(
    deltaTime: number,
    input: PlayerInput,
    controls: PointerLockControls,
    physics: PhysicsWorld
  ): void {
    // Update stamina
    this.updateStamina(deltaTime, input);

    // Calculate movement
    const movement = this.calculateMovement(deltaTime, input, controls);

    // Apply physics
    this.applyMovement(movement, physics);

    // Sync camera position
    this.syncCamera(controls);

    // Update state
    this.updateState(input, movement);
  }

  private calculateMovement(
    deltaTime: number,
    input: PlayerInput,
    controls: PointerLockControls
  ): THREE.Vector3 {
    // Get camera direction
    controls.getDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();

    // Calculate right vector
    const right = new THREE.Vector3();
    right.crossVectors(this.direction, new THREE.Vector3(0, 1, 0));

    // Input vector
    const inputX = Number(input.right) - Number(input.left);
    const inputZ = Number(input.forward) - Number(input.backward);

    // Camera-relative movement
    const movement = new THREE.Vector3();
    movement.addScaledVector(this.direction, inputZ);
    movement.addScaledVector(right, inputX);

    // Normalize diagonal movement
    if (movement.length() > 0) {
      movement.normalize();
    }

    // Determine speed
    const canSprint = this.state.stamina >= this.config.minStaminaToSprint
      && (input.forward || input.backward || input.left || input.right);
    const isSprinting = input.sprint && canSprint;

    const speed = isSprinting
      ? this.config.baseSpeed * this.config.sprintMultiplier
      : this.config.baseSpeed;

    // Scale by speed and deltaTime
    movement.multiplyScalar(speed * deltaTime);

    // Jump
    if (input.jump && this.state.isGrounded) {
      movement.y = this.config.jumpForce;
    }

    return movement;
  }

  private applyMovement(movement: THREE.Vector3, physics: PhysicsWorld): void {
    const world = physics.getWorld();

    // Compute character controller movement (handles collisions)
    this.characterController.computeColliderMovement(
      this.collider,
      { x: movement.x, y: movement.y, z: movement.z }
    );

    // Get corrected movement
    const correctedMovement = this.characterController.computedMovement();

    // Apply to rigid body
    const currentPos = this.rigidBody.translation();
    this.rigidBody.setNextKinematicTranslation({
      x: currentPos.x + correctedMovement.x,
      y: currentPos.y + correctedMovement.y,
      z: currentPos.z + correctedMovement.z
    });

    // Update velocity for camera effects
    this.state.velocity.set(
      correctedMovement.x,
      correctedMovement.y,
      correctedMovement.z
    );
  }

  private syncCamera(controls: PointerLockControls): void {
    const position = this.rigidBody.translation();
    controls.getObject().position.set(
      position.x,
      position.y,
      position.z
    );
  }

  private updateStamina(deltaTime: number, input: PlayerInput): void {
    const isMoving = input.forward || input.backward || input.left || input.right;
    const canSprint = this.state.stamina >= this.config.minStaminaToSprint;
    const isSprinting = input.sprint && isMoving && canSprint;

    if (isSprinting) {
      this.state.stamina -= this.config.sprintDrainRate * deltaTime;
      this.state.stamina = Math.max(0, this.state.stamina);
      this.state.isSprinting = true;
    } else if (!input.sprint) {
      this.state.stamina += this.config.staminaRegenRate * deltaTime;
      this.state.stamina = Math.min(this.config.maxStamina, this.state.stamina);
      this.state.isSprinting = false;
    }
  }

  private updateState(input: PlayerInput, movement: THREE.Vector3): void {
    const position = this.rigidBody.translation();
    this.state.position.set(position.x, position.y, position.z);

    this.state.isGrounded = this.characterController.computedGrounded();

    const horizontalSpeed = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
    this.state.isMoving = horizontalSpeed > 0.01;
  }

  private getDefaultConfig(overrides: Partial<ControllerConfig>): ControllerConfig {
    return {
      baseSpeed: 5.0,
      sprintMultiplier: 1.8,
      jumpForce: 5.0,
      acceleration: 20.0,
      deceleration: 10.0,
      maxStamina: 100,
      sprintDrainRate: 20,
      staminaRegenRate: 10,
      minStaminaToSprint: 10,
      eyeHeight: 1.6,
      mouseSensitivity: 0.002,
      characterRadius: 0.3,
      characterHeight: 1.8,
      characterMass: 80,
      ...overrides
    };
  }

  private getInitialState(): PlayerState {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      stamina: 100,
      isGrounded: false,
      isSprinting: false,
      isMoving: false,
      fearLevel: 0
    };
  }

  getState(): PlayerState {
    return this.state;
  }

  getCameraGroup(): THREE.Group {
    return this.cameraGroup;
  }
}
```

## Layer 4: Camera Effects

```typescript
export class CameraEffects {
  private config: CameraEffectsConfig;
  private headBobTimer: number = 0;
  private breathingTimer: number = 0;
  private defaultCameraY: number;

  constructor(camera: THREE.Camera, config: Partial<CameraEffectsConfig> = {}) {
    this.config = this.getDefaultConfig(config);
    this.defaultCameraY = camera.position.y;
  }

  update(deltaTime: number, state: PlayerState, camera: THREE.Camera): void {
    // Reset to default
    camera.position.y = this.defaultCameraY;

    // Head bob
    if (this.config.headBobEnabled && state.isMoving) {
      const bobOffset = this.calculateHeadBob(deltaTime, state);
      camera.position.y += bobOffset;
    }

    // Breathing
    if (this.config.breathingEnabled) {
      const breathOffset = this.calculateBreathing(deltaTime, state);
      camera.position.y += breathOffset;
    }

    // Fear effects
    if (this.config.fearEffectsEnabled && state.fearLevel > this.config.fearShakeThreshold) {
      const shakeOffset = this.calculateFearShake(state);
      camera.position.x += shakeOffset.x;
      camera.position.z += shakeOffset.z;
    }
  }

  private calculateHeadBob(deltaTime: number, state: PlayerState): number {
    const bobSpeed = state.isSprinting
      ? this.config.sprintBobSpeed
      : this.config.walkBobSpeed;

    const bobAmount = state.isSprinting
      ? this.config.sprintBobAmount
      : this.config.walkBobAmount;

    this.headBobTimer += deltaTime * bobSpeed;
    return Math.sin(this.headBobTimer) * bobAmount;
  }

  private calculateBreathing(deltaTime: number, state: PlayerState): number {
    const breathSpeed = this.config.breathingSpeed * (1 + state.fearLevel * 2);
    const breathAmount = this.config.breathingAmount * (1 + state.fearLevel);

    this.breathingTimer += deltaTime * breathSpeed;
    return Math.sin(this.breathingTimer) * breathAmount;
  }

  private calculateFearShake(state: PlayerState): { x: number; z: number } {
    const intensity = (state.fearLevel - this.config.fearShakeThreshold)
      * this.config.fearShakeAmount;

    return {
      x: (Math.random() - 0.5) * intensity,
      z: (Math.random() - 0.5) * intensity
    };
  }

  private getDefaultConfig(overrides: Partial<CameraEffectsConfig>): CameraEffectsConfig {
    return {
      headBobEnabled: true,
      walkBobSpeed: 8,
      walkBobAmount: 0.04,
      sprintBobSpeed: 12,
      sprintBobAmount: 0.08,
      breathingEnabled: true,
      breathingSpeed: 1.5,
      breathingAmount: 0.02,
      fearEffectsEnabled: true,
      fearShakeThreshold: 0.5,
      fearShakeAmount: 0.01,
      ...overrides
    };
  }
}
```

## Layer 5: Main Game Loop

```typescript
export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private physics!: PhysicsWorld;
  private input!: InputManager;
  private player!: PlayerController;
  private cameraEffects!: CameraEffects;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();

    this.setupRenderer();
  }

  async init(): Promise<void> {
    // Initialize physics
    this.physics = new PhysicsWorld();
    await this.physics.init();

    // Initialize input
    this.input = new InputManager(this.camera, this.renderer.domElement);

    // Initialize player
    this.player = new PlayerController(this.physics, this.camera);

    // Initialize camera effects
    this.cameraEffects = new CameraEffects(this.camera);

    // Add player camera to scene
    this.scene.add(this.input.getControls().getObject());

    // Create environment
    this.createEnvironment();

    // Start game loop
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    // Only update if pointer is locked
    if (this.input.isPointerLocked()) {
      // Get input
      const input = this.input.getInput();

      // Update player
      this.player.update(
        deltaTime,
        input,
        this.input.getControls(),
        this.physics
      );

      // Update camera effects
      this.cameraEffects.update(
        deltaTime,
        this.player.getState(),
        this.camera
      );
    }

    // Step physics
    this.physics.step();

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private createEnvironment(): void {
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.BoxGeometry(50, 0.1, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Ground physics
    const rapier = this.physics.getRapier();
    const world = this.physics.getWorld();

    const groundBody = world.createRigidBody(
      rapier.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0)
    );
    const groundCollider = rapier.ColliderDesc.cuboid(25, 0.05, 25);
    world.createCollider(groundCollider, groundBody);
  }
}

// Entry point
async function main() {
  const game = new Game();
  await game.init();
}

main();
```

## File Structure

```
src/
├── core/
│   ├── Game.ts                 # Main game loop
│   └── PhysicsWorld.ts         # Rapier physics wrapper
├── player/
│   ├── PlayerController.ts     # Character controller
│   ├── CameraEffects.ts        # Head bob, breathing, etc.
│   └── InputManager.ts         # Keyboard + PointerLock
├── utils/
│   └── KeyboardState.ts        # Keyboard state tracking
└── main.ts                     # Entry point
```

## Implementation Checklist

- [ ] Set up project structure
- [ ] Implement KeyboardState class
- [ ] Implement InputManager with PointerLockControls
- [ ] Create PhysicsWorld wrapper
- [ ] Implement PlayerController with Rapier CharacterController
- [ ] Add stamina system to PlayerController
- [ ] Implement CameraEffects (head bob + breathing)
- [ ] Create main Game loop
- [ ] Add environment with static physics bodies
- [ ] Test movement and collision
- [ ] Fine-tune movement speeds and stamina rates
- [ ] Fine-tune camera effect intensities
- [ ] Add UI for stamina display
- [ ] Implement fear system for horror effects

## Performance Considerations

1. **Physics**: Fixed timestep at 60 FPS for stability
2. **Input**: State-based checks avoid event overhead
3. **Camera Effects**: Simple sine calculations (negligible cost)
4. **Memory**: Reuse Vector3 objects instead of creating new ones
5. **Colliders**: Use simple shapes (capsule for player)

## Accessibility Features

- Toggle for head bob (motion sickness)
- Toggle for breathing effects
- Toggle for fear camera shake
- Configurable movement speeds
- Configurable mouse sensitivity

## Next Steps

1. Implement PSX shader effects (see psx-horror-shaders.md)
2. Add footstep audio system (trigger on head bob peaks)
3. Implement interaction system (raycast from camera)
4. Add inventory system
5. Create enemy AI with fear level integration
6. Implement save/load system

## References

- See individual pattern documents in this directory
- Three.js r180 documentation
- Rapier3D JavaScript guide
- Community examples on GitHub
