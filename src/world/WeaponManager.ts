import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { InputManager } from '../utils/InputManager';

// Weapon types
export type WeaponType = 'none' | 'flashlight' | 'hatchet' | 'shotgun';

export class WeaponManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private inputManager: InputManager;
  private gltfLoader: GLTFLoader;
  
  // Viewmodel setup
  private viewmodelScene: THREE.Scene;
  private viewmodelCamera: THREE.PerspectiveCamera;
  private weaponGroup: THREE.Group;
  
  // Weapon models
  private models: Record<string, THREE.Group> = {};
  private modelBaseTransforms: Record<string, { position: THREE.Vector3; rotation: THREE.Euler; scale: number }> = {};
  private currentWeapon: WeaponType = 'flashlight'; // Default start
  private hatchetSwingTimer = 0;
  private readonly hatchetSwingDuration = 0.4; // 400ms for full chop cycle

  // Shotgun state
  private shotgunRecoilTimer = 0;
  private readonly shotgunRecoilDuration = 0.3;
  private readonly shotgunRecoilIntensity = 0.15;

  // Sway state
  private swayPosition = new THREE.Vector2(0, 0);
  private swayTarget = new THREE.Vector2(0, 0);
  private bobTimer = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, inputManager: InputManager) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;
    this.gltfLoader = new GLTFLoader();

    // Initialize viewmodel scene (rendered on top)
    this.viewmodelScene = new THREE.Scene();
    
    // Match FOV but use a dedicated camera for weapons to avoid clipping
    this.viewmodelCamera = new THREE.PerspectiveCamera(
      60, // Tighter FOV for weapons looks better
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    
    // Container for all weapons
    this.weaponGroup = new THREE.Group();
    this.viewmodelScene.add(this.weaponGroup);

    // Add lights to viewmodel scene so weapons aren't pitch black
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.viewmodelScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    this.viewmodelScene.add(directionalLight);
  }

  public async loadWeapons(): Promise<void> {
    console.log('🔫 Loading weapons...');
    
    // Load Flashlight
    await this.loadModel('flashlight', '/assets/models/weapons/flashlight.glb', {
      pos: new THREE.Vector3(-0.2, -0.3, -0.5), // Left hand
      rot: new THREE.Euler(0, Math.PI, 0),
      scale: 1.0
    });

    // Load Hatchet
    await this.loadModel('hatchet', '/assets/models/weapons/hatchet.glb', {
      pos: new THREE.Vector3(0.3, -0.4, -0.6), // Right hand
      rot: new THREE.Euler(0, Math.PI, 0.2), // Blade facing forward (was PI/2, rotated 90 more)
      scale: 1.0
    });

    // Load Shotgun
    await this.loadModel('shotgun', '/assets/models/weapons/shotgun.glb', {
      pos: new THREE.Vector3(0.25, -0.35, -0.7), // Right hand
      rot: new THREE.Euler(0, Math.PI, 0), // Facing forward
      scale: 1.0
    });

    // Set initial state
    this.equipWeapon('flashlight');
    
    console.log('✅ Weapons loaded');
  }

  private async loadModel(name: string, path: string, transform: { pos: THREE.Vector3, rot: THREE.Euler, scale: number }): Promise<void> {
    return new Promise((resolve) => {
      this.gltfLoader.load(path, (gltf) => {
        const model = gltf.scene;
        
        // Apply transforms
        model.position.copy(transform.pos);
        model.rotation.copy(transform.rot);
        model.scale.setScalar(transform.scale);
        this.modelBaseTransforms[name] = {
          position: transform.pos.clone(),
          rotation: transform.rot.clone(),
          scale: transform.scale
        };
        
        // Enable shadows and fix materials
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.depthTest = true; // Always draw on top
                child.material.depthWrite = true;
            }
          }
        });

        this.models[name] = model;
        this.weaponGroup.add(model);
        model.visible = false; // Hide initially
        resolve();
      }, undefined, (err) => {
        console.error(`❌ Failed to load weapon: ${name}`, err);
        resolve(); // Don't block
      });
    });
  }

  public equipWeapon(type: WeaponType): void {
    this.currentWeapon = type;
    
    // Hide all first
    Object.values(this.models).forEach(m => m.visible = false);

    // Show logic
    if (type === 'flashlight') {
        if (this.models['flashlight']) this.models['flashlight'].visible = true;
    } else if (type === 'hatchet') {
        // Keep flashlight visible in left hand? For now, yes.
        if (this.models['flashlight']) this.models['flashlight'].visible = true;
        if (this.models['hatchet']) this.models['hatchet'].visible = true;
    } else if (type === 'shotgun') {
        // Keep flashlight visible in left hand? For now, yes.
        if (this.models['flashlight']) this.models['flashlight'].visible = true;
        if (this.models['shotgun']) this.models['shotgun'].visible = true;
    }
    
    console.log(`⚔️ Equipped: ${type}`);
  }

  public update(deltaTime: number): void {
    // Input handling
    const switchInput = this.inputManager.consumeWeaponSwitch();
    if (switchInput === 1) this.equipWeapon('flashlight');
    if (switchInput === 2) this.equipWeapon('hatchet');
    if (switchInput === 3) this.equipWeapon('shotgun');

    // Procedural Sway (Lag behind camera movement)
    // We'll need mouse delta from somewhere, but for now let's use time-based bob
    
    // Bobbing when moving
    const isMoving = this.inputManager.state.isAnyMovementKey;
    if (isMoving) {
        this.bobTimer += deltaTime * 10;
        const bobY = Math.sin(this.bobTimer) * 0.005;
        const bobX = Math.cos(this.bobTimer * 0.5) * 0.005;
        this.weaponGroup.position.y = bobY;
        this.weaponGroup.position.x = bobX;
    } else {
        // Return to center
        this.weaponGroup.position.lerp(new THREE.Vector3(0, 0, 0), deltaTime * 5);
    }

    this.applyHatchetSwing(deltaTime);
    this.applyShotgunRecoil(deltaTime);
  }

  // Call this from SceneManager render loop, AFTER main render
  public render(renderer: THREE.WebGLRenderer): void {
    // Clear depth buffer so weapons render on top of the world
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.viewmodelScene, this.viewmodelCamera);
    renderer.autoClear = true;
  }
  
  public onResize(width: number, height: number): void {
      this.viewmodelCamera.aspect = width / height;
      this.viewmodelCamera.updateProjectionMatrix();
  }

  public getCurrentWeapon(): WeaponType {
    return this.currentWeapon;
  }

  public triggerHatchetSwing(): void {
    this.hatchetSwingTimer = this.hatchetSwingDuration;
  }

  /**
   * Trigger shotgun fire (visual recoil animation)
   */
  public triggerShotgunFire(): void {
    this.shotgunRecoilTimer = this.shotgunRecoilDuration;
    console.log(`🔫 Shotgun recoil triggered! Timer: ${this.shotgunRecoilTimer}s`);

    // Debug: Check if shotgun is visible
    if (this.models['shotgun']) {
      console.log(`🔫 Shotgun model visible: ${this.models['shotgun'].visible}`);
    }
  }

  private applyHatchetSwing(deltaTime: number): void {
    const hatchet = this.models['hatchet'];
    const base = this.modelBaseTransforms['hatchet'];
    if (!hatchet || !base) return;

    // Only animate when hatchet is visible
    if (!hatchet.visible) {
      hatchet.position.copy(base.position);
      hatchet.rotation.copy(base.rotation);
      return;
    }

    if (this.hatchetSwingTimer > 0) {
      this.hatchetSwingTimer = Math.max(0, this.hatchetSwingTimer - deltaTime);
      const t = 1 - this.hatchetSwingTimer / this.hatchetSwingDuration;

      // Chopping animation phases:
      // Phase 1 (0-0.15): Quick wind-up - raise hatchet HEAD up and back
      // Phase 2 (0.15-0.45): Power swing - chop forward/down (head leads)
      // Phase 3 (0.45-0.65): Impact hold - embedded in tree
      // Phase 4 (0.65-1.0): Pull back - return to neutral

      let chopAngle = 0;    // Rotation around X - NEGATIVE = head tips forward/down
      let liftY = 0;        // Vertical position offset
      let forwardZ = 0;     // Forward position offset (negative = forward)
      let twistRoll = 0;    // Wrist twist

      if (t < 0.15) {
        // Wind-up: raise hatchet HEAD back (rotate positive = head tips back)
        const phase = t / 0.15;
        const easeOut = 1 - Math.pow(1 - phase, 2);
        chopAngle = easeOut * 0.9;   // Rotate head BACK (positive rotation)
        liftY = easeOut * 0.15;      // Raise up
        forwardZ = easeOut * 0.05;   // Pull back slightly
        twistRoll = easeOut * 0.1;   // Slight wrist cock
      } else if (t < 0.45) {
        // Power swing: chop forward and down - HEAD swings DOWN
        const phase = (t - 0.15) / 0.30;
        const easeIn = phase * phase * phase; // Cubic ease for acceleration
        chopAngle = THREE.MathUtils.lerp(0.9, -1.2, easeIn);  // Swing head DOWN (negative)
        liftY = THREE.MathUtils.lerp(0.15, -0.12, easeIn);    // Drop down
        forwardZ = THREE.MathUtils.lerp(0.05, -0.3, easeIn);  // Thrust forward
        twistRoll = THREE.MathUtils.lerp(0.1, -0.15, easeIn); // Follow through twist
      } else if (t < 0.65) {
        // Impact hold: embedded in tree, slight vibration
        const phase = (t - 0.45) / 0.20;
        const vibrate = Math.sin(phase * Math.PI * 6) * 0.02 * (1 - phase); // Dampened shake
        chopAngle = -1.2 + vibrate;
        liftY = -0.12;
        forwardZ = -0.3;
        twistRoll = -0.15;
      } else {
        // Pull back: return to neutral
        const phase = (t - 0.65) / 0.35;
        const easeOut = 1 - Math.pow(1 - phase, 2);
        chopAngle = THREE.MathUtils.lerp(-1.2, 0, easeOut);
        liftY = THREE.MathUtils.lerp(-0.12, 0, easeOut);
        forwardZ = THREE.MathUtils.lerp(-0.3, 0, easeOut);
        twistRoll = THREE.MathUtils.lerp(-0.15, 0, easeOut);
      }

      // Apply transforms
      hatchet.position.copy(base.position);
      hatchet.position.y += liftY;
      hatchet.position.z += forwardZ;

      hatchet.rotation.copy(base.rotation);
      hatchet.rotation.x += chopAngle;  // Main chop rotation (negative = head forward)
      hatchet.rotation.z += twistRoll;  // Wrist twist
    } else {
      // Ease back to base transform
      hatchet.position.lerp(base.position, deltaTime * 10);
      hatchet.rotation.x = THREE.MathUtils.lerp(hatchet.rotation.x, base.rotation.x, deltaTime * 12);
      hatchet.rotation.y = THREE.MathUtils.lerp(hatchet.rotation.y, base.rotation.y, deltaTime * 12);
      hatchet.rotation.z = THREE.MathUtils.lerp(hatchet.rotation.z, base.rotation.z, deltaTime * 12);
    }
  }

  private applyShotgunRecoil(deltaTime: number): void {
    const shotgun = this.models['shotgun'];
    const base = this.modelBaseTransforms['shotgun'];
    if (!shotgun || !base) return;

    // Only animate when shotgun is visible
    if (!shotgun.visible) {
      shotgun.position.copy(base.position);
      shotgun.rotation.copy(base.rotation);
      return;
    }

    if (this.shotgunRecoilTimer > 0) {
      this.shotgunRecoilTimer = Math.max(0, this.shotgunRecoilTimer - deltaTime);
      const t = 1 - this.shotgunRecoilTimer / this.shotgunRecoilDuration;

      // Sharp recoil, smooth return
      const recoilCurve = t < 0.2 ? t / 0.2 : 1 - ((t - 0.2) / 0.8);

      // Position: kick back and up
      const kickBack = THREE.MathUtils.lerp(0, this.shotgunRecoilIntensity, recoilCurve);
      const kickUp = THREE.MathUtils.lerp(0, this.shotgunRecoilIntensity * 0.5, recoilCurve);

      shotgun.position.copy(base.position);
      shotgun.position.z += kickBack; // Pull back
      shotgun.position.y += kickUp; // Lift up

      // Rotation: muzzle climb
      const muzzleClimb = THREE.MathUtils.lerp(0, 0.2, recoilCurve);
      shotgun.rotation.copy(base.rotation);
      shotgun.rotation.x -= muzzleClimb; // Pitch up

      // Debug first frame
      if (t < 0.1) {
        console.log(`🔫 Recoil frame: kickBack=${kickBack.toFixed(3)}, kickUp=${kickUp.toFixed(3)}`);
      }
    } else {
      // Smooth return to base
      shotgun.position.lerp(base.position, deltaTime * 15);
      shotgun.rotation.x = THREE.MathUtils.lerp(shotgun.rotation.x, base.rotation.x, deltaTime * 15);
      shotgun.rotation.y = THREE.MathUtils.lerp(shotgun.rotation.y, base.rotation.y, deltaTime * 15);
      shotgun.rotation.z = THREE.MathUtils.lerp(shotgun.rotation.z, base.rotation.z, deltaTime * 15);
    }
  }
}
