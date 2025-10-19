import * as THREE from 'three';

/**
 * SoundBus - Centralized audio management system
 * TODO: Integrate with Three.js AudioListener and spatial audio
 */
export class SoundBus {
  private listener: THREE.AudioListener;
  private sounds: Map<string, THREE.Audio | THREE.PositionalAudio>;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.sounds = new Map();
  }

  /**
   * Play a 2D sound (UI, music)
   */
  play2D(id: string, buffer: AudioBuffer, volume = 1.0, loop = false): void {
    const sound = new THREE.Audio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume(volume);
    sound.setLoop(loop);
    sound.play();
    this.sounds.set(id, sound);
  }

  /**
   * Play a 3D spatial sound (footsteps, door creaks, enemy sounds)
   */
  play3D(
    id: string,
    buffer: AudioBuffer,
    position: THREE.Vector3,
    volume = 1.0,
    refDistance = 1.0
  ): THREE.PositionalAudio {
    const sound = new THREE.PositionalAudio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume(volume);
    sound.setRefDistance(refDistance);
    sound.position.copy(position);
    sound.play();
    this.sounds.set(id, sound);
    return sound;
  }

  /**
   * Stop a sound by ID
   */
  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
    this.sounds.delete(id);
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.sounds.forEach((sound) => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
    this.sounds.clear();
  }
}
