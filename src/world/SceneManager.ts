import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer, EffectPass, RenderPass, NoiseEffect, VignetteEffect } from 'postprocessing';
import { CollisionWorld } from './CollisionWorld';
import { PSXEffect } from '../rendering/effects/PSXEffect';
import { ChromaticAberrationEffect } from '../rendering/effects/ChromaticAberrationEffect';
import { ColorGradingEffect } from '../rendering/effects/ColorGradingEffect';
import { DepthFogEffect } from '../rendering/effects/DepthFogEffect';
import { VolumetricSpotlight } from '../rendering/effects/VolumetricSpotlight';
import { PlayerController } from './PlayerController';
import { CameraController } from './CameraController';
import { InputManager } from '../utils/InputManager';
import { loadTexture } from '../utils/loaders';
import { assetPath } from '../utils/assetPath';
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
import { WeaponManager } from './WeaponManager';
import { AudioManager } from '../audio/AudioManager';
import { EnhancedAudioManager } from '../audio/EnhancedAudioManager';
import { FootstepSystem } from './Systems/FootstepSystem';
import { FoliagePlacementCoordinator } from './Systems/FoliagePlacementCoordinator';
import { InventorySystem } from './Systems/InventorySystem';
import { TreeChoppingSystem } from './Systems/TreeChoppingSystem';
import { FirepitSystem } from './Systems/FirepitSystem';
import { BoardingSystem } from './Systems/BoardingSystem';
import { CombatSystem } from './Systems/CombatSystem';
import { CombatController } from './Systems/CombatController';
import { GameUI } from '../ui/GameUI';
import { NightmanEntity } from './NightmanEntity';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public flashlight: THREE.SpotLight;
  private composer: EffectComposer;
  private gltfLoader: GLTFLoader;

  // Physics and player systems
  private collisionWorld!: CollisionWorld;
  private playerController!: PlayerController;
  private cameraController!: CameraController;
  private inputManager!: InputManager;
  private treeManager!: TreeManager;
  private propManager!: PropManager;
  private bushManager!: BushManager;
  private weaponManager!: WeaponManager;
  private audioManager!: AudioManager;
  private enhancedAudioManager!: EnhancedAudioManager;
  private footstepSystem!: FootstepSystem;
  private foliageCoordinator!: FoliagePlacementCoordinator;

  // Combat systems
  private combatSystem!: CombatSystem;
  private combatController!: CombatController;

  // Survival systems
  private inventorySystem!: InventorySystem;
  private treeChoppingSystem!: TreeChoppingSystem;
  private firepitSystem!: FirepitSystem;
  private boardingSystem!: BoardingSystem;
  private gameUI!: GameUI;
  private nightman: NightmanEntity | null = null;
  private suppressInstructions = false;

  private initialized = false;
  private treesRegisteredForChopping = false;
  private volumetricFlashlight: VolumetricSpotlight | null = null;
  private flashlightMesh: THREE.Mesh | null = null;
  private flashlightEnabled = true;
  private flashlightBaseIntensity = 1;

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
  private windowAnchorPositions: THREE.Vector3[] = [];
  private fireMarker: THREE.Vector3 | null = null;

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
      0xffddaa, // Warm color
      5.75,     // Brighter beam
      30,       // Extended reach
      0.58,     // Slightly wider cone (~33°)
      0.65,     // Softer edge
      2         // Quadratic falloff
    );
    this.flashlightBaseIntensity = this.flashlight.intensity;
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

    this.createFlashlightPlaceholder();

    // Volumetric beam for flashlight (visible god rays)
    const volumetricLight = new VolumetricSpotlight({
      color: this.flashlight.color,
      angle: this.flashlight.angle || 0.58,
      distance: this.flashlight.distance > 0 ? this.flashlight.distance : 30,
      opacity: 0.65,
      attenuation: 0.018,
      anglePower: 2.25,
      noisiness: 0.42,
      noiseSpeed: 0.65,
      intensity: 1.85,
      widthMultiplier: 1.75,
      lengthMultiplier: 1.4
    });
    volumetricLight.syncWithFog(this.scene.fog);
    volumetricLight.syncWithSpotLight(this.flashlight);
    this.scene.add(volumetricLight);
    this.volumetricFlashlight = volumetricLight;
    this.setFlashlightEnabled(true);

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

    // Create collision world
    this.collisionWorld = new CollisionWorld();

    // Create input manager
    this.inputManager = new InputManager();

    // Initialize Weapon System (needs input manager) - MUST await before survival systems
    await this.initializeWeaponSystem();

    // Initialize survival systems (needs input manager AND weapon manager AND combat system)
    this.initializeSurvivalSystems();

    // Create camera controller with PointerLock
    this.cameraController = new CameraController(this.camera, domElement);

    // Add UI feedback for pointer lock
    this.cameraController.onLock = () => {
      const instructions = document.getElementById('instructions');
      if (instructions) instructions.style.display = 'none';
      this.setCursorVisible(false);
      this.suppressInstructions = false;

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
      if (instructions && !this.suppressInstructions) instructions.style.display = 'flex';
      this.setCursorVisible(true);
    };

    // Add click handler to instructions screen to start game
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.addEventListener('click', () => {
        this.cameraController.lock();
      });
      console.log('✅ Click handler attached to instructions screen');
    }

    // Hook inventory UI to pointer lock so crafting can use the cursor
    if (this.gameUI) {
      this.gameUI.setInventoryToggleHandlers(
        () => {
          this.suppressInstructions = true;
          this.cameraController.unlock();
          this.setCursorVisible(true);
        },
        () => {
          this.suppressInstructions = false;
          this.cameraController.lock();
          this.setCursorVisible(false);
        }
      );
    }

    // Create player controller (starts at cabin center)
    this.playerController = new PlayerController(this.collisionWorld, {
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
      cameraController: this.cameraController,
      promptElement: promptElement ?? null,
      audioManager: this.audioManager,
      collisionWorld: this.collisionWorld
    });

    this.initialized = true;
    console.log('✅ All player systems initialized');
    console.log('   Click to lock pointer and start playing!');

    // Load ambient forest audio and footstep sounds
    this.loadAmbientAudio();
    this.loadFootstepSounds();
  }

  private processWindowMeshes(meshes: THREE.Mesh[]): void {
    if (meshes.length === 0) return;

    const groups: THREE.Mesh[][] = [];
    const THRESHOLD = 1.5; // Meters

    // Grouping logic
    for (const mesh of meshes) {
      const center = this.getWindowAnchor(mesh);
      if (!center) continue;

      let added = false;
      for (const group of groups) {
        const groupCenter = this.getWindowAnchor(group[0]);
        if (groupCenter && center.distanceTo(groupCenter) < THRESHOLD) {
          group.push(mesh);
          added = true;
          break;
        }
      }
      if (!added) groups.push([mesh]);
    }

    // Process groups
    for (const group of groups) {
      if (group.length === 0) continue;

      // 1. Determine rotation from the first mesh
      const rotation = new THREE.Quaternion();
      group[0].getWorldQuaternion(rotation);

      // 2. Compute combined OBB in the local space defined by that rotation
      const inverseRotation = rotation.clone().invert();
      
      const min = new THREE.Vector3(Infinity, Infinity, Infinity);
      const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

      for (const mesh of group) {
        // Get local bounds
        mesh.updateMatrixWorld(true);
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const localBox = mesh.geometry.boundingBox || new THREE.Box3();
        
        if (localBox.isEmpty()) {
            // Fallback to position if no geometry bounds
            const pos = new THREE.Vector3();
            mesh.getWorldPosition(pos);
            pos.applyQuaternion(inverseRotation);
            min.min(pos);
            max.max(pos);
            continue;
        }

        const corners = [
            new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.min.z),
            new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.max.z),
            new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.min.z),
            new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.max.z),
            new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.min.z),
            new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.max.z),
            new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.min.z),
            new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.max.z)
        ];

        // Transform local corners to world then to un-rotated space
        for (const p of corners) {
            p.applyMatrix4(mesh.matrixWorld); // To World
            p.applyQuaternion(inverseRotation); // To Un-rotated
            min.min(p);
            max.max(p);
        }
      }

      const size = new THREE.Vector3().subVectors(max, min);
      const localCenter = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
      
      // Transform center back to world space
      const worldCenter = localCenter.clone().applyQuaternion(rotation);

      // Use the mesh with the largest volume as the 'target' reference
      let bestMesh = group[0];
      let maxVol = -1;
      for(const m of group){
          const b = new THREE.Box3().setFromObject(m);
          const v = (b.max.x-b.min.x)*(b.max.y-b.min.y)*(b.max.z-b.min.z);
          if(v > maxVol) { maxVol = v; bestMesh = m; }
      }

      // Check duplicates (using existing global anchor check)
       if (!this.hasWindowAnchorNearby(worldCenter)) {
          this.windowAnchorPositions.push(worldCenter.clone());
          console.log(`🪟 Window registered (group of ${group.length}): ${bestMesh.name} at`, worldCenter);
          console.log(`   Size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
          
          if (this.boardingSystem) {
             this.boardingSystem.registerWindow(bestMesh, {
                 anchor: worldCenter,
                 size: size,
                 rotation: rotation
             });
          }
       }
    }
  }

  private loadCabinModel(): void {
    this.gltfLoader.load(
      assetPath('assets/models/cabin.glb'),
      (gltf) => {
        const cabin = gltf.scene;
        this.windowAnchorPositions.length = 0;
        const rawWindowMeshes: THREE.Mesh[] = [];

        // Enable shadows and collect meshes
        cabin.traverse((child) => {
          // Capture fire marker even if it's not a mesh
          if (child.name === 'marker.fx.fire') {
            const markerPos = new THREE.Vector3();
            child.getWorldPosition(markerPos);
            this.fireMarker = markerPos.clone();
            console.log('🔥 Found cabin fire marker at', markerPos);
          }

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

            if (this.isWindowMesh(child)) {
              rawWindowMeshes.push(child);
            }
          }
        });

        // Add cabin to scene
        this.scene.add(cabin);
        
        // Process grouped window meshes
        this.processWindowMeshes(rawWindowMeshes);

        for (const doorMesh of this.pendingDoorMeshes) {
          registerDoorMesh(doorMesh, {
            interactLabel: this.formatDoorLabel(doorMesh.name),
            ...this.doorOverrides[doorMesh.name]
          });

          // NOTE: Doors NOT registered for boarding - using existing door system instead
          // Boarding is for windows only
        }
        this.pendingDoorMeshes = [];

        // Add cabin collision to physics world
        this.addCabinPhysics();

        // Set cabin bounds for footstep detection
        this.setupCabinFootstepBounds(cabin);

        // Ensure firepit ends up at cabin marker (fallback to fireplace spot if marker missing)
        if (this.firepitSystem) {
          if (this.fireMarker) {
            this.firepitSystem.setPosition(this.fireMarker);
          } else {
            // Fallback: center of fireplace from GLB data
            this.firepitSystem.setPosition(new THREE.Vector3(-1.25, 0.58, -2.18));
          }
        }

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

  private isWindowMesh(mesh: THREE.Mesh): boolean {
    const name = mesh.name;
    
    // Strict allowlist based on model analysis
    const windowParts = [
        // Front Window
        'Geo_FrontWindowBase',
        'Geo_FrontWindowTop',
        'Geo_FrontWindowJambA',
        'Geo_FrontWindowJambB',
        
        // Left Windows (2 windows)
        'Geo_LeftJambA_0', 'Geo_LeftJambB_0', // Front-most left window
        'Geo_LeftJambA_1', 'Geo_LeftJambB_1', // Back-most left window
        
        // Right Window
        'Geo_RightJambA', 'Geo_RightJambB',

        // Back Window (if any, based on analysis 'Geo_BackJambLeft'/'Geo_BackJambRight' exist)
        'Geo_BackJambLeft', 'Geo_BackJambRight'
    ];

    return windowParts.includes(name);
  }

  private getWindowAnchor(mesh: THREE.Mesh): THREE.Vector3 | null {
    const box = new THREE.Box3().setFromObject(mesh);
    if (!box.isEmpty()) {
      return box.getCenter(new THREE.Vector3());
    }
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position);
    return position;
  }

  private hasWindowAnchorNearby(position: THREE.Vector3, threshold = 0.6): boolean {
    return this.windowAnchorPositions.some(anchor => {
      const dx = anchor.x - position.x;
      const dz = anchor.z - position.z;
      const dist = Math.hypot(dx, dz);
      return dist < threshold;
    });
  }

  private createFlashlightPlaceholder(): void {
    if (this.flashlightMesh) {
      this.camera.remove(this.flashlightMesh);
      this.disposeFlashlightMesh(this.flashlightMesh);
      this.flashlightMesh = null;
    }

    const bodyGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.26, 16, 1, false);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.35,
      roughness: 0.4,
      emissive: new THREE.Color(0x111111),
      emissiveIntensity: 0.25
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.rotation.x = -Math.PI / 2; // Align along -Z (camera forward)
    bodyMesh.position.set(0.18, -0.12, -0.35);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = false;

    const bezelGeometry = new THREE.RingGeometry(0.045, 0.065, 16);
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.8,
      roughness: 0.2
    });
    const bezelMesh = new THREE.Mesh(bezelGeometry, bezelMaterial);
    bezelMesh.position.z = -0.13;
    bodyMesh.add(bezelMesh);

    const lensGeometry = new THREE.CircleGeometry(0.044, 16);
    const lensMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe3b5,
      transparent: true,
      opacity: 0.85
    });
    const lensMesh = new THREE.Mesh(lensGeometry, lensMaterial);
    lensMesh.position.z = -0.131;
    bodyMesh.add(lensMesh);

    bodyMesh.frustumCulled = false;

    this.camera.add(bodyMesh);
    this.flashlightMesh = bodyMesh;
  }

  private disposeFlashlightMesh(mesh: THREE.Mesh): void {
    mesh.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const meshChild = child as THREE.Mesh;
        if (meshChild.geometry) {
          meshChild.geometry.dispose();
        }
        const mat = meshChild.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          (mat as THREE.Material).dispose();
        }
      }
    });
  }

  private setFlashlightEnabled(enabled: boolean): void {
    this.flashlightEnabled = enabled;
    this.flashlight.visible = enabled;
    this.flashlight.intensity = enabled ? this.flashlightBaseIntensity : 0;

    if (this.volumetricFlashlight) {
      this.volumetricFlashlight.visible = enabled;
    }

    if (this.flashlightMesh) {
      const bodyMaterial = this.flashlightMesh.material as THREE.MeshStandardMaterial;
      bodyMaterial.emissiveIntensity = enabled ? 0.6 : 0.1;

      this.flashlightMesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material;
          if (Array.isArray(mat)) return;
          if (mat instanceof THREE.MeshBasicMaterial) {
            mat.opacity = enabled ? 0.85 : 0.2;
          } else if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissiveIntensity = enabled ? 0.4 : 0.06;
          }
        }
      });
    }
  }

  private async setupGroundPlanes(): Promise<void> {
    try {
      // Load textures
      const grassTexture = await loadTexture(assetPath('assets/textures/ground/grass001.png'));
      const dirtTexture = await loadTexture(assetPath('assets/textures/ground/ground015.png'));

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
    if (!this.collisionWorld) {
      console.warn('Collision world not ready, cabin collision skipped');
      return;
    }

    let count = 0;
    for (const mesh of this.cabinMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (!box.isEmpty()) {
        const height = box.max.y - box.min.y;
        // Skip flat floor/trim meshes so the player can step up onto the cabin floor
        if (height < 0.4) {
          continue;
        }
        // Slightly shrink XZ to ease doorway clearance without big gaps
        const margin = 0.05;
        if ((box.max.x - box.min.x) > margin * 2) {
          box.min.x += margin;
          box.max.x -= margin;
        }
        if ((box.max.z - box.min.z) > margin * 2) {
          box.min.z += margin;
          box.max.z -= margin;
        }
        this.collisionWorld.addBox(box);
        count++;
      }
    }

    console.log(`✅ Cabin collision boxes added (${count} meshes)`);
  }

  private async initializeTreeSystem(): Promise<void> {
    console.log('🌲 Initializing forest...');

    // Create tree manager with foliage coordinator
    this.treeManager = new TreeManager(this.scene, this.camera, this.collisionWorld, this.foliageCoordinator);

    // Initialize trees (load models, generate placement, create instances)
    await this.treeManager.initialize();

    // Note: Tree registration for chopping happens in registerTreesForChopping()
    // which is called after survival systems are initialized

    console.log('✅ Forest initialized');
    console.log(`   Trees registered in coordinator: ${this.foliageCoordinator.getCountByType('tree')}`);
  }

  /**
   * Register trees as choppable - must be called AFTER treeChoppingSystem is created
   * Returns true if registration was successful
   */
  private registerTreesForChopping(): boolean {
    if (this.treesRegisteredForChopping) {
      return true; // Already done
    }

    if (!this.treeChoppingSystem || !this.treeManager) {
      // Not ready yet, will retry in update loop
      return false;
    }

    const entries = this.treeManager.getInstancedEntries();
    if (entries.length === 0) {
      // Trees might still be loading
      return false;
    }

    // Sort by distance to player spawn (0,0) so we prioritize nearby trees
    const origin = new THREE.Vector3(0, 0, 0);
    entries.sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));

    const maxChoppable = 120;
    console.log(`🪓 Registering ${Math.min(entries.length, maxChoppable)} nearby trees as choppable...`);

    entries.slice(0, maxChoppable).forEach((entry) => {
      if (!entry.meshes || entry.meshes.length === 0) {
        return;
      }
      // Use the first mesh in the set as the reference for chopping visuals
      const firstMesh = entry.meshes[0];
      this.treeChoppingSystem.registerTree(
        firstMesh,
        entry.position,
        entry.index,
        entry.meshes,
        entry.colliderId
      );
    });

    console.log(`✅ ${Math.min(entries.length, maxChoppable)} trees registered for chopping`);
    this.treesRegisteredForChopping = true;
    return true;
  }

  private async initializePropSystem(): Promise<void> {
    console.log('🪨 Initializing environmental props...');

    // Create prop manager with foliage coordinator
    this.propManager = new PropManager(this.scene, this.collisionWorld, this.foliageCoordinator);

    // Initialize props (load models, generate placement, create instances)
    await this.propManager.initialize();

    console.log('✅ Environmental props initialized');
    console.log(`   Rocks registered in coordinator: ${this.foliageCoordinator.getCountByType('rock')}`);
  }

  private async initializeBushSystem(): Promise<void> {
    console.log('🌿 Initializing bushes...');

    // Create bush manager with foliage coordinator
    this.bushManager = new BushManager(this.scene, this.collisionWorld, this.foliageCoordinator);

    // Initialize bushes (load models, generate placement, create instances)
    await this.bushManager.initialize();

    console.log('✅ Bushes initialized');
    console.log(`   Bushes registered in coordinator: ${this.foliageCoordinator.getCountByType('bush')}`);
  }

  private async initializeWeaponSystem(): Promise<void> {
    console.log('🔫 Initializing Weapon System...');
    this.weaponManager = new WeaponManager(this.scene, this.camera, this.inputManager);
    await this.weaponManager.loadWeapons();

    // Initialize Enhanced Audio Manager (replaces old AudioManager for new features)
    console.log('🔊 Initializing Enhanced Audio System...');
    this.enhancedAudioManager = new EnhancedAudioManager(this.camera);

    // Initialize Combat System
    console.log('⚔️ Initializing Combat System...');
    this.combatSystem = new CombatSystem();

    // Initialize Combat Controller (wires inputs → weapons → combat)
    this.combatController = new CombatController(
      this.camera,
      this.scene,
      this.inputManager,
      this.weaponManager,
      this.combatSystem
    );

    // Hook up audio callback
    this.combatController.onPlaySound = (soundKey: string, position?: THREE.Vector3) => {
      if (position) {
        this.enhancedAudioManager.play3D(soundKey, position, { volume: 0.8 });
      } else {
        this.enhancedAudioManager.play2D(soundKey, { volume: 0.8 });
      }
    };

    console.log('✅ Weapon and Combat systems ready');
  }

  private initializeSurvivalSystems(): void {
    console.log('🏕️ Initializing survival systems...');

    // Create inventory system
    this.inventorySystem = new InventorySystem();

    // Create GameUI (depends on inventory)
    this.gameUI = new GameUI(this.inventorySystem);

    // Sync CombatSystem ammo with InventorySystem/UI
    this.combatSystem.onAmmoChanged = (current: number) => {
      // Update InventorySystem shells to match CombatSystem
      const inv = this.inventorySystem.getInventory();
      const diff = current - inv.shells;
      if (diff > 0) {
        this.inventorySystem.addShells(diff);
      } else if (diff < 0) {
        // Remove shells (fired)
        for (let i = 0; i < Math.abs(diff); i++) {
          this.inventorySystem.useShell();
        }
      }
      this.gameUI.update();
    };

    // Create tree chopping system (will be connected to TreeManager later)
    this.treeChoppingSystem = new TreeChoppingSystem(
      this.scene,
      this.camera,
      this.inputManager,
      this.weaponManager,
      this.collisionWorld
    );

    // Wire up tree chopping audio
    this.treeChoppingSystem.onPlaySound = (key, position) => {
      if (this.enhancedAudioManager && position) {
        this.enhancedAudioManager.play3D(key, position, { volume: 0.8 });
      }
    };

    // Create firepit system (position: near cabin front door)
    const firepitPosition = new THREE.Vector3(2, 0, 4); // 2m to the right of front door
    this.firepitSystem = new FirepitSystem(
      this.scene,
      this.camera,
      this.inputManager,
      this.inventorySystem,
      firepitPosition
    );

    // Create boarding system
    this.boardingSystem = new BoardingSystem(
      this.scene,
      this.camera,
      this.inputManager,
      this.inventorySystem
    );

    // Now that treeChoppingSystem exists, register trees for chopping
    // (TreeManager may not be ready yet if tree loading is still in progress)
    this.registerTreesForChopping();

    // Initialize Nightman (lurking around cabin for vibe assessment)
    this.initializeNightman();

    console.log('✅ Survival systems initialized');
  }

  private async initializeNightman(): Promise<void> {
    try {
      this.nightman = new NightmanEntity(this.scene);
      await this.nightman.initialize();
      console.log('👹 Nightman is stalking...');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Nightman:', error);
    }
  }

  private async loadAmbientAudio(): Promise<void> {
    try {
      console.log('🔊 Loading ambient forest audio...');

      // Use old audio manager for now (if it exists)
      if (this.audioManager) {
        await this.audioManager.loadAmbient(assetPath('assets/audio/optimized/ambient/forest_night_loop.ogg'), 0.6);
        this.setupWindAudio();
      }

      // Also start ambient loop with new enhanced audio manager
      if (this.enhancedAudioManager) {
        this.enhancedAudioManager.startAmbientLoop();
        console.log('✅ Enhanced ambient audio started');
      }
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
          assetPath('assets/audio/optimized/ambient/wind_trees.ogg'),
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

    if (this.inputManager && this.inputManager.consumeFlashlightToggle()) {
      this.setFlashlightEnabled(!this.flashlightEnabled);
    }

    PlayerMovementPrePhysicsSystem(ecsWorld, deltaTime);
    PlayerMovementPostPhysicsSystem(ecsWorld, deltaTime);
    DoorInteractionSystem(ecsWorld, deltaTime);

    // Update tree wind animation
    if (this.treeManager) {
      this.treeManager.update(this.camera, deltaTime);
    }

    // Update Weapons
    if (this.weaponManager && this.inputManager) {
      this.weaponManager.update(deltaTime);

      // Update UI with current weapon
      if (this.gameUI) {
        this.gameUI.setCurrentWeapon(this.weaponManager.getCurrentWeapon());
      }
    }

    // Update Combat Controller (handles weapon inputs → combat actions)
    if (this.combatController) {
      this.combatController.update(deltaTime);
    }

    // Update Nightman (stalking behavior)
    if (this.nightman && this.playerController) {
      this.nightman.update(deltaTime, this.playerController.position);
    }

    // Try to register trees for chopping if not done yet (deferred registration)
    if (!this.treesRegisteredForChopping) {
      this.registerTreesForChopping();
    }

    // Update survival systems
    if (this.treeChoppingSystem) {
      this.treeChoppingSystem.update(deltaTime);

      // Check for wood pickup
      this.treeChoppingSystem.checkWoodPickup(this.playerController.position, (amount) => {
        this.inventorySystem.addWood(amount);
        this.gameUI.update();
      });
    }

    if (this.firepitSystem) {
      this.firepitSystem.update(deltaTime, this.playerController.position);
    }

    if (this.boardingSystem) {
      this.boardingSystem.update(deltaTime);
    }

    // Update UI with player stats
    if (this.gameUI && this.playerController) {
      // TODO: Get actual stamina from player entity
      this.gameUI.setPlayerStamina(100); // Placeholder
      this.gameUI.update();
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

    if (this.volumetricFlashlight) {
      this.volumetricFlashlight.syncWithSpotLight(this.flashlight);
      this.volumetricFlashlight.syncWithFog(this.scene.fog);
      this.volumetricFlashlight.update(deltaTime);
    }
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
    if (this.weaponManager) {
      const renderer = (this.composer as any).renderer || (this.composer as any)._renderer;
      this.weaponManager.render(renderer);
    }
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateComposerResolution(width, height);
    if (this.weaponManager) {
        this.weaponManager.onResize(width, height);
    }
  }

  private setCursorVisible(visible: boolean): void {
    if (visible) {
      document.body.classList.add('ui-cursor');
    } else {
      document.body.classList.remove('ui-cursor');
    }
  }

  public dispose(): void {
    if (this.inputManager) this.inputManager.dispose();
    if (this.cameraController) this.cameraController.dispose();
    if (this.playerController) this.playerController.dispose();
    if (this.treeManager) this.treeManager.dispose();
    if (this.propManager) this.propManager.dispose();
    if (this.bushManager) this.bushManager.dispose();
    if (this.audioManager) this.audioManager.dispose();

    // Dispose survival systems
    if (this.inventorySystem) this.inventorySystem.dispose();
    if (this.treeChoppingSystem) this.treeChoppingSystem.dispose();
    if (this.firepitSystem) this.firepitSystem.dispose();
    if (this.boardingSystem) this.boardingSystem.dispose();
    if (this.gameUI) this.gameUI.dispose();
    if (this.nightman) this.nightman.dispose();

    if (this.volumetricFlashlight) {
      this.scene.remove(this.volumetricFlashlight);
      this.volumetricFlashlight.geometry.dispose();
      (this.volumetricFlashlight.material as THREE.Material).dispose();
      this.volumetricFlashlight = null;
    }
    if (this.flashlightMesh) {
      this.camera.remove(this.flashlightMesh);
      this.disposeFlashlightMesh(this.flashlightMesh);
      this.flashlightMesh = null;
    }
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
