import * as THREE from 'three';
import { AudioManager } from '../../audio/AudioManager';

/**
 * FootstepSystem - Handles footstep audio with:
 * - Left/right foot alternation (1-2 cadence)
 * - Surface detection (dirt vs wood)
 * - Walk/run speed variation
 * - Spatial positioning at player feet
 */

export type SurfaceType = 'dirt' | 'wood';

export class FootstepSystem {
  private audioManager: AudioManager;

  // Footstep state
  private isLeftFoot: boolean = true;
  private lastStepTime: number = 0;
  private walkCadence: number = 0.5; // Time between steps when walking (500ms)
  private runCadence: number = 0.3; // Time between steps when running (300ms)

  // Audio buffers (cached)
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isLoaded: boolean = false;

  // Surface detection
  private currentSurface: SurfaceType = 'dirt';
  private cabinBounds: THREE.Box3 | null = null;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
  }

  /**
   * Load all footstep sounds
   */
  async loadSounds(): Promise<void> {
    const sounds = [
      'stepdirt_1.wav',
      'stepdirt_2.wav',
      'stepwood_1.wav',
      'stepwood_2.wav'
    ];

    const loader = new THREE.AudioLoader();

    const loadPromises = sounds.map(sound => {
      return new Promise<void>((resolve, reject) => {
        loader.load(
          `/assets/audio/${sound}`,
          (buffer) => {
            this.audioBuffers.set(sound, buffer);
            resolve();
          },
          undefined,
          reject
        );
      });
    });

    try {
      await Promise.all(loadPromises);
      this.isLoaded = true;
      console.log('✅ Footstep sounds loaded');
    } catch (error) {
      console.error('❌ Failed to load footstep sounds', error);
    }
  }

  /**
   * Set cabin bounds for wood surface detection
   */
  setCabinBounds(bounds: THREE.Box3): void {
    this.cabinBounds = bounds;
    console.log('🏠 Cabin bounds set for footstep detection');
  }

  /**
   * Update footstep system
   * Call this every frame with player position and movement state
   */
  update(
    _deltaTime: number,
    playerPosition: THREE.Vector3,
    isMoving: boolean,
    isRunning: boolean
  ): void {
    if (!this.isLoaded || !isMoving) return;

    const currentTime = performance.now() / 1000;
    const cadence = isRunning ? this.runCadence : this.walkCadence;

    // Check if it's time for next step
    if (currentTime - this.lastStepTime >= cadence) {
      this.playFootstep(playerPosition, isRunning);
      this.lastStepTime = currentTime;
    }
  }

  /**
   * Play footstep sound
   */
  private playFootstep(position: THREE.Vector3, isRunning: boolean): void {
    // Detect surface type
    this.detectSurface(position);

    // Determine which sound to play (alternating left/right)
    const footNumber = this.isLeftFoot ? 1 : 2;
    const soundName = `step${this.currentSurface}_${footNumber}.wav`;

    const buffer = this.audioBuffers.get(soundName);
    if (!buffer) {
      console.warn(`Footstep sound not found: ${soundName}`);
      return;
    }

    // Create non-positional audio (plays at listener position, no trailing)
    const listener = this.audioManager['listener'];
    const sound = new THREE.Audio(listener);
    sound.setBuffer(buffer);
    sound.setVolume(isRunning ? 0.3 : 0.18); // Even quieter volumes

    // Slightly vary playback rate for running (sounds faster/more urgent)
    if (isRunning) {
      sound.setPlaybackRate(1.1 + Math.random() * 0.1); // 1.1 to 1.2x speed
    } else {
      sound.setPlaybackRate(0.95 + Math.random() * 0.1); // Slight variation for realism
    }

    sound.play();

    // Disconnect after playing
    sound.onEnded = () => {
      sound.disconnect();
    };

    // Alternate feet
    this.isLeftFoot = !this.isLeftFoot;
  }

  /**
   * Detect surface type based on player position
   */
  private detectSurface(position: THREE.Vector3): void {
    // Check if player is inside cabin bounds
    if (this.cabinBounds && this.cabinBounds.containsPoint(position)) {
      this.currentSurface = 'wood';
    } else {
      this.currentSurface = 'dirt';
    }
  }

  /**
   * Force a specific surface type (for testing)
   */
  setSurface(surface: SurfaceType): void {
    this.currentSurface = surface;
  }

  /**
   * Get current surface type
   */
  getCurrentSurface(): SurfaceType {
    return this.currentSurface;
  }

  /**
   * Reset footstep timing (useful when player stops/starts)
   */
  reset(): void {
    this.lastStepTime = 0;
    this.isLeftFoot = true;
  }
}
