import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer, EffectPass, RenderPass, NoiseEffect, VignetteEffect } from 'postprocessing';
import { PhysicsWorld } from './PhysicsWorld';
import { PSXEffect } from '../rendering/effects/PSXEffect';
import { ChromaticAberrationEffect } from '../rendering/effects/ChromaticAberrationEffect';
import { ColorGradingEffect } from '../rendering/effects/ColorGradingEffect';
import { DepthFogEffect } from '../rendering/effects/DepthFogEffect';
import { PlayerController } from './PlayerController';
import { CameraController } from './CameraController';
import { InputManager } from '../utils/InputManager';
import { loadTexture } from '../utils/loaders';
import { world as ecsWorld } from './ECS';
import {
  initPlayerMovementSystem,
  createPlayerEntity,
  PlayerMovementPrePhysicsSystem,
  PlayerMovementPostPhysicsSystem
} from './Systems/PlayerMovementSystem';
import {
  initDoorSystem,
  registerDoorMesh,
  DoorSystem as DoorInteractionSystem
} from './Systems/DoorSystem';
import { TreeManager } from './TreeManager';
import { PropManager } from './PropManager';
import { BushManager } from './BushManager';
import { AudioManager } from '../audio/AudioManager';
import { FootstepSystem } from './Systems/FootstepSystem';
import { FoliagePlacementCoordinator } from './Systems/FoliagePlacementCoordinator';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public flashlight: THREE.SpotLight;
  private composer: EffectComposer;
  private gltfLoader: GLTFLoader;

  // Physics and player systems
  private physicsWorld!: PhysicsWorld;
  private playerController!: PlayerController;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private treeManager!: TreeManager;
  private propManager!: PropManager;
  private bushManager!: BushManager;
  private audioManager!: AudioManager;
  private footstepSystem!: FootstepSystem;
  private foliageCoordinator!: FoliagePlacementCoordinator;
  private initialized = false;

  // Wind audio
  private windAudioSources: THREE.PositionalAudio[] = [];
  private activeWindSounds: Set<THREE.PositionalAudio> = new Set();
  private psxEffect!: PSXEffect;
  private readonly basePSXResolution = new THREE.Vector2(320, 240);

  // Cabin reference for physics
  private cabinMeshes: THREE.Mesh[] = [];
  private pendingDoorMeshes: THREE.Mesh[] = [];
  private interactionPrompt: HTMLElement | null = null;
  private readonly validDoorNames = new Set(['Geo_Door_Front', 'Geo_Door_Back', 'Geo_Door_Bedroom']);
  private readonly doorOverrides: Record<string, Partial<{ openDirection: number; hinge: 'min' | 'max' }>> = {
    Geo_Door_Front: { openDirection: -1, hinge: 'min' },
    Geo_Door_Back: { openDirection: -1, hinge: 'min' },
    Geo_Door_Bedroom: { openDirection: 1, hinge: 'min' }
  };

  constructor(renderer: THREE.WebGLRenderer) {

    // Initialize scene
    this.scene = new THREE.Scene();

    // Enhanced fog system (2025 techniques)
    // Using exponential fog for realistic atmospheric scattering
    // Density tuned for horror atmosphere - creates depth without obscuring nearby objects
    const fogColor = 0x050508; // Very dark blue-gray for depth perception
    this.scene.background = new THREE.Color(fogColor); // Match background to fog for seamless fade
    this.scene.fog = new THREE.FogExp2(
      fogColor,  // Color matches background
      0.035      // Increased density for more atmospheric, claustrophobic feel
    );

    // Initialize camera (will be controlled by PointerLockControls)
    this.camera = new THREE.PerspectiveCamera(
      75, // Wider FOV for better spatial awareness
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.5, 0); // Start at cabin center

    // Initialize flashlight (spotlight attached to camera)
    // Modern 2025 best practices:
    // - Higher intensity (4.5) for dramatic horror lighting
    // - Quadratic decay (2) for realistic physical falloff
    // - Tighter angle (π/7 ~25.7°) for focused beam
    // - Higher penumbra (0.7) for softer, more atmospheric edges
    // - 1024x1024 shadows (2025 standard compromise between quality and performance)
    this.flashlight = new THREE.SpotLight(
      0xffddaa,        // Warm color
      4.5,             // Intensity (2025: 3-5 range for dramatic effect)
      25,              // Distance (extended for better range)
      Math.PI / 7,     // Angle (~25.7° - tighter, more focused)
      0.7,             // Penumbra (softer edges for realism)
      2                // Decay (quadratic - physically accurate)
    );
    this.flashlight.position.copy(this.camera.position);
    this.flashlight.target.position.set(0, 0, -1);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024; // 2025 standard (quality/performance balance)
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.5;
    this.flashlight.shadow.camera.far = 25;
    this.flashlight.shadow.bias = -0.0001; // Prevent shadow acne
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Add ambient light (very dim)
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.1);
    this.scene.add(ambientLight);

    // Initialize GLTF loader
    this.gltfLoader = new GLTFLoader();

    // Initialize post-processing
    const composer = new EffectComposer(renderer);
    composer.inputBuffer.texture.minFilter = THREE.NearestFilter;
    composer.inputBuffer.texture.magFilter = THREE.NearestFilter;
    composer.outputBuffer.texture.minFilter = THREE.NearestFilter;
    composer.outputBuffer.texture.magFilter = THREE.NearestFilter;
    this.composer = composer;

    // Add render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // PSX Effect (dithering, posterization)
    // NOTE: Pixelation is handled by render target downscaling in updateComposerResolution()
    this.psxEffect = new PSXEffect({
      resolution: this.basePSXResolution.clone(), // Authentic PSX resolution seed
      colorDepth: 32.0, // Color levels per channel (PSX used 15-32)
      ditherStrength: 0.08, // Dithering intensity for horror grittiness
      pixelationAmount: 1.0 // Disabled - using render target method instead
    });

    // Color Grading (horror atmosphere)
    const colorGradingEffect = new ColorGradingEffect({
      saturation: 0.7, // Desaturated for bleak atmosphere
      contrast: 1.2, // High contrast for dramatic shadows
      brightness: 0.85, // Darker overall
      tint: new THREE.Color(0.75, 0.8, 1.15), // Cool blue-purple tint
      tintStrength: 0.2 // Subtle color shift
    });

    // Chromatic Aberration (subtle lens distortion)
    const chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.001, 0.001), // Very subtle
      strength: 0.5
    });

    // Add noise effect (film grain)
    const noiseEffect = new NoiseEffect({
      premultiply: true
    });
    noiseEffect.blendMode.opacity.value = 0.2; // Increased for PSX grittiness

    // Depth-based fog effect (2025 modern technique)
    // Post-processing fog using depth buffer for enhanced atmospheric scattering
    const depthFogEffect = new DepthFogEffect({
      fogColor: new THREE.Color(fogColor),
      fogDensity: 0.4, // Subtle post-process fog
      useLinear: false // Exponential fog for realistic scattering
    });

    // Add vignette effect
    const vignetteEffect = new VignetteEffect({
      darkness: 0.65, // Slightly darker for horror
      offset: 0.25 // Tighter vignette
    });

    // Combine all effects (order matters!)
    // 1. PSX dithering/posterization (base PSX look)
    // 2. Color grading (mood adjustment)
    // 3. Depth fog (enhanced atmospheric depth)
    // 4. Chromatic aberration (lens distortion)
    // 5. Noise (film grain on top)
    // 6. Vignette (final framing)
    const effectPass = new EffectPass(
      this.camera,
      this.psxEffect,
      colorGradingEffect,
      depthFogEffect,
      chromaticAberrationEffect,
      noiseEffect,
      vignetteEffect
    );
    this.composer.addPass(effectPass);
    this.updateComposerResolution(window.innerWidth, window.innerHeight);

    // Initialize audio system
    this.audioManager = new AudioManager(this.camera);

    // Initialize footstep system
    this.footstepSystem = new FootstepSystem(this.audioManager);

    // Initialize physics and player systems (async)
    this.initializeSystems(renderer.domElement);

    // Load cabin model
    this.loadCabinModel();

    // Load and setup ground textures
    this.setupGroundPlanes();

    // Initialize foliage coordinator for collision-free placement
    this.foliageCoordinator = new FoliagePlacementCoordinator();

    // Initialize foliage systems in order (trees first, then bushes, then rocks)
    // This ensures proper spacing between all objects
    this.initializeTreeSystem();
    this.initializeBushSystem();
    this.initializePropSystem();

    this.interactionPrompt = document.getElementById('interaction-prompt');

    // Set fixed PSX resolution (1.5x = 360p for smoother PSX aesthetic)
    this.setFixedPSXResolution(1.5);
  }

  /**
   * Set fixed PSX resolution multiplier
   * 1.5x = 360p (smoother PSX aesthetic)
   */
  private setFixedPSXResolution(multiplier: number): void {
    const height = Math.round(this.basePSXResolution.y * multiplier);
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const width = Math.round(height * aspect);

    // Set INTERNAL render size (low res) but DISPLAY size stays full screen
    this.composer.setSize(width, height, false); // false = don't update display size
    this.psxEffect.resolution.set(width, height);

    // Set canvas display size to full screen (stretched from low-res render)
    const renderer = (this.composer as any).renderer || (this.composer as any)._renderer;
    if (renderer?.domElement) {
      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }

    console.log(`✅ PSX Resolution locked: ${width}x${height} (${multiplier}x multiplier)`);
  }

  private async initializeSystems(domElement: HTMLElement): Promise<void> {
    console.log('🔧 Initializing player systems...');

    // Create physics world
    this.physicsWorld = new PhysicsWorld();
    await this.physicsWorld.init();

    // Create ground plane collision
    this.physicsWorld.createGroundPlane(50, 50, 0);

    // Create input manager
    this.inputManager = new InputManager();

    // Create camera controller with PointerLock
    this.cameraController = new CameraController(this.camera, domElement);

    // Add UI feedback for pointer lock
    this.cameraController.onLock = () => {
      const instructions = document.getElementById('instructions');
      if (instructions) instructions.style.display = 'none';

      // Resume audio context on user interaction (browser autoplay policy)
      if (this.audioManager && this.audioManager['listener']) {
        const context = this.audioManager['listener'].context;
        if (context.state === 'suspended') {
          context.resume().then(() => {
            console.log('🔊 Audio context resumed after user interaction');
          });
        }
      }
    };
    this.cameraController.onUnlock = () => {
      const instructions = document.getElementById('instructions');
      if (instructions) instructions.style.display = 'flex';
    };

    // Add click handler to instructions screen to start game
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.addEventListener('click', () => {
        this.cameraController.lock();
      });
      console.log('✅ Click handler attached to instructions screen');
    }

    // Create player controller (starts at cabin center)
    this.playerController = new PlayerController(this.physicsWorld, {
      startPosition: new THREE.Vector3(0, 1.0, 0)
    });

    // Initialize player movement system
    initPlayerMovementSystem(this.inputManager, this.playerController, this.cameraController);

    // Create player entity in ECS
    createPlayerEntity(ecsWorld);

    const promptElement = this.interactionPrompt ?? document.getElementById('interaction-prompt');
    this.interactionPrompt = promptElement;
    initDoorSystem({
      inputManager: this.inputManager,
      camera: this.camera,
      playerController: this.playerController,
      physicsWorld: this.physicsWorld,
      cameraController: this.cameraController,
      promptElement: promptElement ?? null,
      audioManager: this.audioManager
    });

    this.initialized = true;
    console.log('✅ All player systems initialized');
    console.log('   Click to lock pointer and start playing!');

    // Load ambient forest audio and footstep sounds
    this.loadAmbientAudio();
    this.loadFootstepSounds();
  }

  private loadCabinModel(): void {
    this.gltfLoader.load(
      '/assets/models/cabin.glb',
      (gltf) => {
        const cabin = gltf.scene;

        // Enable shadows and collect meshes
        cabin.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.applyPSXAestheticToMesh(child);
            child.castShadow = true;
            child.receiveShadow = true;

            const lowerName = child.name.toLowerCase();
            const isDoor = this.validDoorNames.has(child.name);

            if (isDoor) {
              this.pendingDoorMeshes.push(child);
              console.log(`🚪 Door found: ${child.name} at`, child.position);
            } else {
              this.cabinMeshes.push(child);
            }

            if (lowerName.includes('window')) {
              console.log(`🪟 Window found: ${child.name} at`, child.position);
            }
          }
        });

        // Add cabin to scene
        this.scene.add(cabin);

        for (const doorMesh of this.pendingDoorMeshes) {
          registerDoorMesh(doorMesh, {
            interactLabel: this.formatDoorLabel(doorMesh.name),
            ...this.doorOverrides[doorMesh.name]
          });
        }
        this.pendingDoorMeshes = [];

        // Add cabin collision to physics world
        this.addCabinPhysics();

        // Set cabin bounds for footstep detection
        this.setupCabinFootstepBounds(cabin);

        console.log('✅ Cabin model loaded successfully');
        console.log('   📏 Dimensions: 6.6m wide x 3.8m tall x 7.4m deep');
        console.log('   🚪 Front door at: x=-0.4, z=2.425');
        console.log('   🚪 Back door at: x=-0.53, z=-2.478');
        console.log('   🚪 Bedroom door at: x=0.448, z=-0.475');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading cabin: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.warn('⚠️ Cabin model not found. Place cabin.glb in /public/assets/models/');
        console.error(error);
      }
    );
  }

  private formatDoorLabel(name: string): string {
    const cleaned = name.replace(/geo_/i, '').replace(/_/g, ' ').trim();
    if (!cleaned) {
      return 'Door';
    }
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private async setupGroundPlanes(): Promise<void> {
    try {
      // Load textures
      const grassTexture = await loadTexture('/assets/textures/ground/grass001.png');
      const dirtTexture = await loadTexture('/assets/textures/ground/ground015.png');

      // Configure textures for PSX aesthetic
      [grassTexture, dirtTexture].forEach(texture => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        texture.anisotropy = 1; // No filtering
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
      });

      // Grass base (200x200m to cover large area)
      grassTexture.repeat.set(40, 40); // Tile 40x40 times
      const grassGeometry = new THREE.PlaneGeometry(200, 200);
      const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.9
      });
      const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
      grassPlane.rotation.x = -Math.PI / 2;
      grassPlane.receiveShadow = true;
      this.scene.add(grassPlane);

      // Dirt path from front door (cabin front door at z=2.425)
      // Path: 2m wide x 100m long, starts at door and extends forward (+z direction)
      dirtTexture.repeat.set(2, 50); // Tile lengthwise
      const pathGeometry = new THREE.PlaneGeometry(2, 100);
      const pathMaterial = new THREE.MeshStandardMaterial({
        map: dirtTexture,
        roughness: 0.95
      });
      const pathPlane = new THREE.Mesh(pathGeometry, pathMaterial);
      pathPlane.rotation.x = -Math.PI / 2;
      pathPlane.position.set(0, 0.01, 52.425); // Slightly above grass, centered on door, extends 50m forward
      pathPlane.receiveShadow = true;
      this.scene.add(pathPlane);

      console.log('✅ Ground textures loaded (grass base + dirt path)');
    } catch (error) {
      console.warn('⚠️ Failed to load ground textures, using fallback');
      console.error(error);

      // Fallback: simple gray ground
      const fallbackGeometry = new THREE.PlaneGeometry(200, 200);
      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9
      });
      const fallbackGround = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      fallbackGround.rotation.x = -Math.PI / 2;
      fallbackGround.receiveShadow = true;
      this.scene.add(fallbackGround);
    }
  }

  private addCabinPhysics(): void {
    if (!this.physicsWorld || !this.physicsWorld.isReady()) {
      console.warn('Physics world not ready, cabin collision skipped');
      return;
    }

    // Add trimesh colliders for each cabin mesh
    for (const mesh of this.cabinMeshes) {
      const geometry = mesh.geometry;

      // Extract vertices
      const vertices = geometry.getAttribute('position').array as Float32Array;

      // Extract or generate indices
      let indices: Uint32Array;
      if (geometry.index) {
        indices = geometry.index.array as Uint32Array;
      } else {
        // Unindexed geometry - generate sequential indices
        indices = new Uint32Array(vertices.length / 3);
        for (let i = 0; i < indices.length; i++) {
          indices[i] = i;
        }
      }

      // Get world transform
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      mesh.getWorldPosition(position);
      mesh.getWorldQuaternion(quaternion);
      mesh.getWorldScale(scale);

      // Create trimesh collider (Rapier doesn't support scale on trimesh, must bake into vertices)
      this.physicsWorld.createTrimeshCollider(
        vertices,
        indices,
        { x: position.x, y: position.y, z: position.z },
        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
      );
    }

    console.log(`✅ Cabin physics collision added (${this.cabinMeshes.length} meshes)`);
  }

  private async initializeTreeSystem(): Promise<void> {
    // Wait for physics to be ready
    while (!this.physicsWorld || !this.physicsWorld.isReady()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🌲 Initializing forest...');

    // Create tree manager with foliage coordinator
    this.treeManager = new TreeManager(this.scene, this.camera, this.physicsWorld, this.foliageCoordinator);

    // Initialize trees (load models, generate placement, create instances)
    await this.treeManager.initialize();

    console.log('✅ Forest initialized');
    console.log(`   Trees registered in coordinator: ${this.foliageCoordinator.getCountByType('tree')}`);
  }

  private async initializePropSystem(): Promise<void> {
    // Wait for physics to be ready
    while (!this.physicsWorld || !this.physicsWorld.isReady()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🪨 Initializing environmental props...');

    // Create prop manager with foliage coordinator
    this.propManager = new PropManager(this.scene, this.physicsWorld, this.foliageCoordinator);

    // Initialize props (load models, generate placement, create instances)
    await this.propManager.initialize();

    console.log('✅ Environmental props initialized');
    console.log(`   Rocks registered in coordinator: ${this.foliageCoordinator.getCountByType('rock')}`);
  }

  private async initializeBushSystem(): Promise<void> {
    // Wait for physics to be ready
    while (!this.physicsWorld || !this.physicsWorld.isReady()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🌿 Initializing bushes...');

    // Create bush manager with foliage coordinator
    this.bushManager = new BushManager(this.scene, this.physicsWorld, this.foliageCoordinator);

    // Initialize bushes (load models, generate placement, create instances)
    await this.bushManager.initialize();

    console.log('✅ Bushes initialized');
    console.log(`   Bushes registered in coordinator: ${this.foliageCoordinator.getCountByType('bush')}`);
  }

  private async loadAmbientAudio(): Promise<void> {
    try {
      console.log('🔊 Loading ambient forest audio...');
      await this.audioManager.loadAmbient('/assets/audio/forest_night_loop.ogg', 0.6);
      console.log('✅ Ambient audio loaded and playing at volume 0.6');

      // Setup wind audio triggers
      this.setupWindAudio();
    } catch (error) {
      console.warn('⚠️ Failed to load ambient audio', error);
    }
  }

  private async loadFootstepSounds(): Promise<void> {
    try {
      console.log('👣 Loading footstep sounds...');
      await this.footstepSystem.loadSounds();
    } catch (error) {
      console.warn('⚠️ Failed to load footstep sounds', error);
    }
  }

  private setupCabinFootstepBounds(cabin: THREE.Group): void {
    // Calculate cabin bounds for footstep surface detection
    const box = new THREE.Box3().setFromObject(cabin);

    // Expand bounds slightly to include doorway transitions
    box.expandByScalar(0.5);

    this.footstepSystem.setCabinBounds(box);
  }

  private async setupWindAudio(): Promise<void> {
    if (!this.treeManager) {
      console.warn('⚠️ TreeManager not ready, wind audio setup skipped');
      return;
    }

    const windSystem = this.treeManager.getWindSystem();

    // Pre-create positional wind audio sources around the player
    const numWindSources = 6; // 6 sources around the player
    const windRadius = 15; // 15m radius

    for (let i = 0; i < numWindSources; i++) {
      const angle = (i / numWindSources) * Math.PI * 2;
      const x = Math.cos(angle) * windRadius;
      const z = Math.sin(angle) * windRadius;

      try {
        const windSound = await this.audioManager.play3D(
          `wind_${i}`,
          '/assets/audio/wind_trees.ogg',
          new THREE.Vector3(x, 2, z),
          0.0, // Start at 0 volume
          12.0, // Reference distance
          true // Loop
        );

        // Keep playing at 0 volume (will increase during gusts)
        windSound.setVolume(0);
        this.windAudioSources.push(windSound);
        this.scene.add(windSound); // Add to scene so it follows world space
      } catch (error) {
        console.warn(`⚠️ Failed to load wind audio source ${i}`, error);
      }
    }

    console.log(`✅ Created ${this.windAudioSources.length} wind audio sources`);

    // Hook up wind gust callbacks
    windSystem.onGustStart = (strength: number) => {
      this.onWindGustStart(strength);
    };

    windSystem.onGustEnd = () => {
      this.onWindGustEnd();
    };
  }

  private onWindGustStart(strength: number): void {
    console.log(`💨 Wind gust started (strength: ${strength.toFixed(2)})`);

    // Play wind sounds with volume based on gust strength
    const volume = Math.min(strength * 1.2, 1.0);

    this.windAudioSources.forEach(sound => {
      sound.setVolume(volume);

      if (!sound.isPlaying) {
        sound.play();
      }

      this.activeWindSounds.add(sound);
    });
  }

  private onWindGustEnd(): void {
    console.log('💨 Wind gust ended');

    // Fade out wind sounds
    this.activeWindSounds.forEach(sound => {
      // Fade out over 1.5 seconds
      const fadeOutDuration = 1500;
      const fadeSteps = 30;
      const fadeInterval = fadeOutDuration / fadeSteps;
      const initialVolume = sound.getVolume();
      const volumeStep = initialVolume / fadeSteps;

      let currentStep = 0;
      const fadeOut = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, initialVolume - (volumeStep * currentStep));
        sound.setVolume(newVolume);

        if (currentStep >= fadeSteps) {
          clearInterval(fadeOut);
          sound.setVolume(0); // Ensure it's at 0 but keep playing (looping)
          this.activeWindSounds.delete(sound);
          console.log('   Wind audio faded out');
        }
      }, fadeInterval);
    });
  }

  public update(deltaTime: number): void {
    if (!this.initialized) return;

    PlayerMovementPrePhysicsSystem(ecsWorld, deltaTime);
    this.physicsWorld.step(deltaTime);
    PlayerMovementPostPhysicsSystem(ecsWorld, deltaTime);
    DoorInteractionSystem(ecsWorld, deltaTime);

    // Update tree wind animation
    if (this.treeManager) {
      this.treeManager.update(this.camera, deltaTime);
    }

    // Update wind audio positions to follow player
    this.updateWindAudioPositions();

    // Update footstep audio
    this.updateFootsteps(deltaTime);

    // Update flashlight position and target to follow camera
    this.flashlight.position.copy(this.camera.position);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    this.flashlight.target.position.copy(this.camera.position).add(forward);
  }

  private updateFootsteps(deltaTime: number): void {
    if (!this.footstepSystem || !this.playerController || !this.inputManager) return;

    const moveSpeed = this.playerController.getMoveSpeed();
    const isMoving = moveSpeed > 0.1; // Threshold to detect movement
    const isRunning = this.inputManager.state.sprint && isMoving;

    this.footstepSystem.update(
      deltaTime,
      this.playerController.position,
      isMoving,
      isRunning
    );
  }

  private updateWindAudioPositions(): void {
    if (this.windAudioSources.length === 0) return;

    const playerPos = this.camera.position;
    const numSources = this.windAudioSources.length;
    const windRadius = 15;

    this.windAudioSources.forEach((sound, i) => {
      const angle = (i / numSources) * Math.PI * 2;
      const x = playerPos.x + Math.cos(angle) * windRadius;
      const z = playerPos.z + Math.sin(angle) * windRadius;

      sound.position.set(x, 2, z);
    });
  }

  public render(): void {
    this.composer.render();
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateComposerResolution(width, height);
  }

  public dispose(): void {
    if (this.inputManager) this.inputManager.dispose();
    if (this.cameraController) this.cameraController.dispose();
    if (this.playerController) this.playerController.dispose();
    if (this.treeManager) this.treeManager.dispose();
    if (this.propManager) this.propManager.dispose();
    if (this.bushManager) this.bushManager.dispose();
    if (this.audioManager) this.audioManager.dispose();
    if (this.physicsWorld) this.physicsWorld.dispose();
  }

  private applyPSXAestheticToMesh(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      this.applyPSXFilteringToMaterial(material);
    }
  }

  private applyPSXFilteringToMaterial(material: THREE.Material): void {
    const textureSlots = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'alphaMap',
      'bumpMap',
      'specularMap',
      'lightMap'
    ] as const;

    for (const slot of textureSlots) {
      const texture = (material as any)[slot] as THREE.Texture | null | undefined;
      this.applyPSXFilteringToTexture(texture);
    }
  }

  private applyPSXFilteringToTexture(texture: THREE.Texture | null | undefined): void {
    if (!texture) return;

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
    texture.needsUpdate = true;
  }

  private updateComposerResolution(width: number, height: number): void {
    if (!this.composer || !this.psxEffect) {
      return;
    }

    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const aspect = safeWidth / safeHeight;
    const baseAspect = this.basePSXResolution.x / this.basePSXResolution.y;

    let targetWidth = this.basePSXResolution.x;
    let targetHeight = this.basePSXResolution.y;

    if (Math.abs(aspect - baseAspect) > 0.001) {
      if (aspect > baseAspect) {
        targetWidth = Math.max(1, Math.round(this.basePSXResolution.y * aspect));
        targetHeight = this.basePSXResolution.y;
      } else {
        targetWidth = this.basePSXResolution.x;
        targetHeight = Math.max(1, Math.round(this.basePSXResolution.x / aspect));
      }
    }

    this.composer.setSize(safeWidth, safeHeight);
    this.psxEffect.resolution.set(targetWidth, targetHeight);
    this.psxEffect.pixelationAmount = 1.0;
  }
}
