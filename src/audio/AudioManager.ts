import * as THREE from 'three';

/**
 * AudioManager - Centralized audio management for the game
 * Handles ambient loops, 3D positional audio, and background music
 */
export class AudioManager {
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sounds: Map<string, THREE.Audio | THREE.PositionalAudio> = new Map();

  // Ambient audio
  private ambientSound: THREE.Audio | null = null;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();
  }

  /**
   * Load and play ambient background loop
   */
  async loadAmbient(path: string, volume = 0.3): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          if (this.ambientSound) {
            this.ambientSound.stop();
          }

          this.ambientSound = new THREE.Audio(this.listener);
          this.ambientSound.setBuffer(buffer);
          this.ambientSound.setLoop(true);
          this.ambientSound.setVolume(volume);

          // Try to play, handle autoplay policy
          try {
            this.ambientSound.play();
            console.log(`✅ Ambient audio loaded and playing: ${path} (volume: ${volume})`);
            console.log(`   Audio context state: ${this.listener.context.state}`);
          } catch (error) {
            console.warn(`⚠️ Audio autoplay blocked, will start on user interaction`, error);
          }

          resolve();
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading audio: ${percent.toFixed(0)}%`);
        },
        (error) => {
          console.error(`❌ Failed to load ambient audio: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Play a one-shot 2D sound (UI, effects)
   */
  async play2D(id: string, path: string, volume = 1.0, loop = false): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          const sound = new THREE.Audio(this.listener);
          sound.setBuffer(buffer);
          sound.setVolume(volume);
          sound.setLoop(loop);
          sound.play();
          this.sounds.set(id, sound);
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Play a 3D spatial sound at a specific position
   */
  async play3D(
    id: string,
    path: string,
    position: THREE.Vector3,
    volume = 1.0,
    refDistance = 5.0,
    loop = false
  ): Promise<THREE.PositionalAudio> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          const sound = new THREE.PositionalAudio(this.listener);
          sound.setBuffer(buffer);
          sound.setVolume(volume);
          sound.setRefDistance(refDistance);
          sound.setLoop(loop);
          sound.position.copy(position);
          sound.play();
          this.sounds.set(id, sound);
          resolve(sound);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Stop a specific sound by ID
   */
  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
    this.sounds.delete(id);
  }

  /**
   * Stop all sounds (including ambient)
   */
  stopAll(): void {
    if (this.ambientSound && this.ambientSound.isPlaying) {
      this.ambientSound.stop();
    }

    this.sounds.forEach((sound) => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
    this.sounds.clear();
  }

  /**
   * Set ambient volume
   */
  setAmbientVolume(volume: number): void {
    if (this.ambientSound) {
      this.ambientSound.setVolume(volume);
    }
  }

  /**
   * Dispose of all audio resources
   */
  dispose(): void {
    this.stopAll();
  }
}
