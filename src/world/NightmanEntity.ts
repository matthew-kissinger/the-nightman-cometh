import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetPath } from '../utils/assetPath';

/**
 * NightmanEntity - Stalking creature with basic behavior
 *
 * Behaviors:
 * - IDLE: Standing still, occasionally fidgeting
 * - STALKING: Slowly following player from a distance
 * - FLEEING: Running away when player gets too close
 */

type NightmanState = 'idle' | 'stalking' | 'fleeing';

interface AnimationSet {
  idle: THREE.AnimationAction[];
  walk: THREE.AnimationAction[];
  run: THREE.AnimationAction[];
}

export class NightmanEntity {
  private scene: THREE.Scene;
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: AnimationSet = { idle: [], walk: [], run: [] };
  private currentAction: THREE.AnimationAction | null = null;

  // State machine
  private state: NightmanState = 'idle';
  private stateTimer = 0;
  private stateDuration = 0;

  // Movement
  private position = new THREE.Vector3(15, 0, 15);
  private targetPosition = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private facingAngle = 0;

  // Player tracking
  private playerPosition = new THREE.Vector3();
  private distanceToPlayer = 0;

  // Behavior parameters
  private readonly STALK_DISTANCE = 12;      // Preferred distance from player
  private readonly FLEE_DISTANCE = 6;        // Run away if closer than this
  private readonly COMFORT_DISTANCE = 18;    // Stop fleeing at this distance
  private readonly WALK_SPEED = 2.5;
  private readonly RUN_SPEED = 6.0;

  // Model settings
  private modelScale = 1.5;
  private modelYOffset = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public async initialize(): Promise<void> {
    console.log('👹 Loading Nightman model...');

    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        assetPath('assets/models/creatures/nightman.glb'),
        (gltf) => {
          this.model = gltf.scene;
          this.model.scale.setScalar(this.modelScale);

          // Setup materials - NO glow, he should be dark and scary
          this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Setup animation mixer and actions
          this.mixer = new THREE.AnimationMixer(this.model);
          this.setupAnimations(gltf.animations);

          // Initial position
          this.model.position.copy(this.position);
          this.scene.add(this.model);

          // Start in idle state
          this.setState('idle');

          console.log('✅ Nightman loaded with animations');
          console.log(`   Idle: ${this.animations.idle.length}, Walk: ${this.animations.walk.length}, Run: ${this.animations.run.length}`);
          resolve();
        },
        undefined,
        (error) => {
          console.error('❌ Failed to load Nightman model:', error);
          reject(error);
        }
      );
    });
  }

  private setupAnimations(clips: THREE.AnimationClip[]): void {
    if (!this.mixer) return;

    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);

      const name = clip.name.toLowerCase();

      if (name.includes('idle') || name.includes('breath') || name.includes('fidget') || name.includes('weight')) {
        this.animations.idle.push(action);
      } else if (name.includes('walk')) {
        this.animations.walk.push(action);
      } else if (name.includes('run')) {
        this.animations.run.push(action);
      }
    }
  }

  private playAnimation(category: keyof AnimationSet, crossfadeDuration = 0.3): void {
    const actions = this.animations[category];
    if (actions.length === 0) return;

    // Pick random animation from category
    const newAction = actions[Math.floor(Math.random() * actions.length)];

    if (this.currentAction === newAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(crossfadeDuration);
    }

    newAction.reset();
    newAction.fadeIn(crossfadeDuration);
    newAction.play();

    this.currentAction = newAction;
  }

  private setState(newState: NightmanState): void {
    if (this.state === newState) return;

    this.state = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'idle':
        this.playAnimation('idle');
        this.stateDuration = 3 + Math.random() * 4; // 3-7 seconds
        break;

      case 'stalking':
        this.playAnimation('walk');
        this.stateDuration = 5 + Math.random() * 5; // 5-10 seconds
        break;

      case 'fleeing':
        this.playAnimation('run');
        this.stateDuration = 3 + Math.random() * 2; // 3-5 seconds
        break;
    }

    console.log(`👹 Nightman: ${newState}`);
  }

  public update(deltaTime: number, playerPos?: THREE.Vector3): void {
    if (!this.model || !this.mixer) return;

    // Update animation
    this.mixer.update(deltaTime);

    // Update player tracking
    if (playerPos) {
      this.playerPosition.copy(playerPos);
      this.distanceToPlayer = this.position.distanceTo(this.playerPosition);
    }

    // State timer
    this.stateTimer += deltaTime;

    // State machine
    this.updateStateMachine(deltaTime);

    // Apply movement
    this.updateMovement(deltaTime);

    // Update model position and rotation
    this.model.position.copy(this.position);
    this.model.position.y = this.modelYOffset;
    this.model.rotation.y = this.facingAngle;
  }

  private updateStateMachine(deltaTime: number): void {
    // Priority checks (can interrupt current state)

    // If player is very close, FLEE!
    if (this.distanceToPlayer < this.FLEE_DISTANCE && this.state !== 'fleeing') {
      this.setState('fleeing');
      return;
    }

    // State-specific behavior
    switch (this.state) {
      case 'idle':
        if (this.stateTimer >= this.stateDuration) {
          // Decide next action
          if (this.distanceToPlayer > this.STALK_DISTANCE + 5) {
            this.setState('stalking');
          } else if (Math.random() < 0.3) {
            this.setState('stalking');
          } else {
            // Stay idle but pick new animation
            this.playAnimation('idle');
            this.stateTimer = 0;
            this.stateDuration = 3 + Math.random() * 4;
          }
        }
        break;

      case 'stalking':
        // Calculate target position (maintain STALK_DISTANCE from player)
        const dirToPlayer = new THREE.Vector3()
          .subVectors(this.playerPosition, this.position)
          .normalize();

        // Target is STALK_DISTANCE away from player, towards nightman's current side
        const angleToPlayer = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        const orbitOffset = Math.sin(this.stateTimer * 0.5) * 0.5; // Slight orbit
        const targetAngle = angleToPlayer + Math.PI + orbitOffset;

        this.targetPosition.set(
          this.playerPosition.x + Math.sin(targetAngle) * this.STALK_DISTANCE,
          0,
          this.playerPosition.z + Math.cos(targetAngle) * this.STALK_DISTANCE
        );

        if (this.stateTimer >= this.stateDuration) {
          this.setState('idle');
        }
        break;

      case 'fleeing':
        // Run directly away from player
        const awayFromPlayer = new THREE.Vector3()
          .subVectors(this.position, this.playerPosition)
          .normalize();

        this.targetPosition.copy(this.position).add(
          awayFromPlayer.multiplyScalar(10)
        );

        // Stop fleeing once far enough
        if (this.distanceToPlayer > this.COMFORT_DISTANCE || this.stateTimer >= this.stateDuration) {
          this.setState('idle');
        }
        break;
    }
  }

  private updateMovement(deltaTime: number): void {
    // Only move during stalking or fleeing
    if (this.state !== 'stalking' && this.state !== 'fleeing') {
      // When idle, just face the player
      const toPlayer = new THREE.Vector3()
        .subVectors(this.playerPosition, this.position);
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.facingAngle = this.lerpAngle(this.facingAngle, targetAngle, deltaTime * 2);
      return;
    }

    const speed = this.state === 'fleeing' ? this.RUN_SPEED : this.WALK_SPEED;

    // Direction to target
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.position);
    direction.y = 0;

    const distance = direction.length();

    if (distance > 0.5) {
      direction.normalize();

      // Update velocity
      this.velocity.lerp(direction.multiplyScalar(speed), deltaTime * 3);

      // Apply movement
      this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

      // Face movement direction
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.facingAngle = this.lerpAngle(this.facingAngle, targetAngle, deltaTime * 5);
    } else {
      // Slow down when near target
      this.velocity.multiplyScalar(0.9);
    }

    // Keep on ground (simple Y constraint)
    this.position.y = 0;
  }

  private lerpAngle(from: number, to: number, t: number): number {
    // Normalize angles
    while (to - from > Math.PI) to -= Math.PI * 2;
    while (to - from < -Math.PI) to += Math.PI * 2;
    return from + (to - from) * Math.min(t, 1);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getState(): NightmanState {
    return this.state;
  }

  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  }
}
