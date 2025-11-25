import * as THREE from 'three';
import { AUDIO_MAP, AudioCategory, getAudioPath, getAudiosByCategory } from './AudioMap';

/**
 * Enhanced Audio Manager for The Nightman Cometh
 * Features:
 * - Spatial 3D audio with HRTF
 * - Audio pooling for performance
 * - Dynamic mixing and ducking
 * - Horror-specific effects (heartbeat, reverb, distortion)
 * - Audio sprites for multiple short sounds
 */

interface AudioPoolEntry {
  audio: THREE.PositionalAudio | THREE.Audio;
  inUse: boolean;
  category: AudioCategory;
  key: string;
}

interface AudioConfig {
  volume?: number;
  loop?: boolean;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  fadeIn?: number;
  fadeOut?: number;
  randomPitch?: boolean;
}

export class EnhancedAudioManager {
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private _camera: THREE.Camera;

  // Audio pools
  private pool3D: AudioPoolEntry[] = [];
  private pool2D: AudioPoolEntry[] = [];
  private readonly poolSize = 20; // Max concurrent sounds

  // Cached buffers
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  // Active sounds tracking
  private activeSounds: Map<string, THREE.PositionalAudio | THREE.Audio> = new Map();

  // Ambient loops
  private ambientLoop: THREE.Audio | null = null;
  private heartbeatLoop: THREE.Audio | null = null;

  // Master volumes
  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private _musicVolume = 0.5;
  private ambientVolume = 0.3;

  // Horror effects
  private isLowHealth = false;

  constructor(camera: THREE.Camera) {
    this._camera = camera;
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();

    console.log('[EnhancedAudioManager] Initialized');
    console.log(`[AudioContext] State: ${this.listener.context.state}`);

    // Initialize pools
    this.initializePools();

    // Handle browser autoplay policy
    this.setupAutoplayUnlock();
  }

  /**
   * Initialize audio pools for performance
   */
  private initializePools(): void {
    for (let i = 0; i < this.poolSize / 2; i++) {
      // 3D audio pool
      const audio3D = new THREE.PositionalAudio(this.listener);
      audio3D.setRefDistance(5);
      audio3D.setMaxDistance(50);
      audio3D.setRolloffFactor(1);

      this.pool3D.push({
        audio: audio3D,
        inUse: false,
        category: 'ambient',
        key: ''
      });

      // 2D audio pool
      const audio2D = new THREE.Audio(this.listener);
      this.pool2D.push({
        audio: audio2D,
        inUse: false,
        category: 'ambient',
        key: ''
      });
    }
  }

  /**
   * Setup autoplay unlock on first user interaction
   */
  private setupAutoplayUnlock(): void {
    const unlock = () => {
      if (this.listener.context.state === 'suspended') {
        this.listener.context.resume().then(() => {
          console.log('[AudioContext] Resumed after user interaction');
        });
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
  }

  /**
   * Preload audio buffer
   */
  public async preload(key: string): Promise<AudioBuffer | null> {
    // Check cache first
    if (this.bufferCache.has(key)) {
      return this.bufferCache.get(key)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const path = getAudioPath(key);
    if (!path) {
      console.warn(`[Audio] No audio file found for key: ${key}`);
      return null;
    }

    const promise = new Promise<AudioBuffer>((resolve, reject) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          this.bufferCache.set(key, buffer);
          this.loadingPromises.delete(key);
          resolve(buffer);
        },
        undefined,
        (error) => {
          console.error(`[Audio] Failed to load: ${key}`, error);
          this.loadingPromises.delete(key);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Preload entire category of sounds
   */
  public async preloadCategory(category: AudioCategory): Promise<void> {
    const files = getAudiosByCategory(category);
    console.log(`[Audio] Preloading ${files.length} files from category: ${category}`);

    const promises = Object.keys(AUDIO_MAP)
      .filter(key => AUDIO_MAP[key]?.category === category)
      .map(key => this.preload(key));

    await Promise.all(promises);
    console.log(`[Audio] Category loaded: ${category}`);
  }

  /**
   * Play 3D spatial audio
   */
  public async play3D(
    key: string,
    position: THREE.Vector3,
    config: AudioConfig = {}
  ): Promise<THREE.PositionalAudio | null> {
    const buffer = await this.preload(key);
    if (!buffer) return null;

    // Get audio from pool
    const entry = this.pool3D.find(e => !e.inUse);
    if (!entry) {
      console.warn('[Audio] No available 3D audio slots');
      return null;
    }

    const audio = entry.audio as THREE.PositionalAudio;
    entry.inUse = true;
    entry.key = key;
    entry.category = AUDIO_MAP[key]?.category || 'ambient';

    // Configure audio
    audio.setBuffer(buffer);
    audio.position.copy(position);
    audio.setVolume((config.volume ?? 1.0) * this.sfxVolume * this.masterVolume);
    audio.setLoop(config.loop ?? false);

    if (config.refDistance) audio.setRefDistance(config.refDistance);
    if (config.maxDistance) audio.setMaxDistance(config.maxDistance);
    if (config.rolloffFactor) audio.setRolloffFactor(config.rolloffFactor);

    // Random pitch variation for realism
    if (config.randomPitch) {
      audio.setPlaybackRate(0.95 + Math.random() * 0.1);
    }

    // Fade in
    if (config.fadeIn) {
      audio.setVolume(0);
      audio.play();
      this.fadeVolume(audio, (config.volume ?? 1.0) * this.sfxVolume * this.masterVolume, config.fadeIn);
    } else {
      audio.play();
    }

    // Auto-release when done
    if (!config.loop) {
      audio.onEnded = () => {
        entry.inUse = false;
        entry.key = '';
      };
    }

    this.activeSounds.set(key, audio);
    return audio;
  }

  /**
   * Play 2D audio (UI, music)
   */
  public async play2D(
    key: string,
    config: AudioConfig = {}
  ): Promise<THREE.Audio | null> {
    const buffer = await this.preload(key);
    if (!buffer) return null;

    const entry = this.pool2D.find(e => !e.inUse);
    if (!entry) {
      console.warn('[Audio] No available 2D audio slots');
      return null;
    }

    const audio = entry.audio as THREE.Audio;
    entry.inUse = true;
    entry.key = key;
    entry.category = AUDIO_MAP[key]?.category || 'ambient';

    audio.setBuffer(buffer);
    audio.setVolume((config.volume ?? 1.0) * this.sfxVolume * this.masterVolume);
    audio.setLoop(config.loop ?? false);

    if (config.randomPitch) {
      audio.setPlaybackRate(0.95 + Math.random() * 0.1);
    }

    if (config.fadeIn) {
      audio.setVolume(0);
      audio.play();
      this.fadeVolume(audio, (config.volume ?? 1.0) * this.sfxVolume * this.masterVolume, config.fadeIn);
    } else {
      audio.play();
    }

    if (!config.loop) {
      audio.onEnded = () => {
        entry.inUse = false;
        entry.key = '';
      };
    }

    this.activeSounds.set(key, audio);
    return audio;
  }

  /**
   * Fade volume over time
   */
  private fadeVolume(audio: THREE.Audio | THREE.PositionalAudio, targetVolume: number, duration: number): void {
    const startVolume = audio.getVolume();
    const startTime = Date.now();

    const fade = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const volume = startVolume + (targetVolume - startVolume) * progress;
      audio.setVolume(volume);

      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };

    fade();
  }

  /**
   * Start ambient forest loop
   */
  public async startAmbientLoop(): Promise<void> {
    if (this.ambientLoop && this.ambientLoop.isPlaying) {
      return;
    }

    await this.play2D('forest_night_loop', {
      volume: this.ambientVolume,
      loop: true,
      fadeIn: 2.0
    });
  }

  /**
   * Start heartbeat loop (low health)
   */
  public async startHeartbeat(): Promise<void> {
    if (this.heartbeatLoop && this.heartbeatLoop.isPlaying) {
      return;
    }

    this.heartbeatLoop = await this.play2D('player_heartbeat', {
      volume: 0.6,
      loop: true,
      fadeIn: 1.0
    });

    this.isLowHealth = true;
  }

  /**
   * Stop heartbeat loop
   */
  public stopHeartbeat(): void {
    if (this.heartbeatLoop && this.heartbeatLoop.isPlaying) {
      this.fadeVolume(this.heartbeatLoop, 0, 1.0);
      setTimeout(() => {
        this.heartbeatLoop?.stop();
        this.heartbeatLoop = null;
      }, 1000);
    }
    this.isLowHealth = false;
  }

  /**
   * Play combat sound with spatial audio
   */
  public async playCombatSound(type: 'shotgun' | 'shotgun_empty' | 'hatchet' | 'reload', position?: THREE.Vector3): Promise<void> {
    const soundMap: Record<string, string> = {
      'shotgun': 'shotgun_fire',
      'shotgun_empty': 'shotgun_empty',
      'hatchet': 'hatchet_swing',
      'reload': 'shotgun_reload'
    };

    const key = soundMap[type];
    if (!key) return;

    if (position) {
      await this.play3D(key, position, {
        volume: 1.0,
        refDistance: 10,
        maxDistance: 100,
        randomPitch: type === 'hatchet'
      });
    } else {
      await this.play2D(key, { volume: 1.0 });
    }
  }

  /**
   * Play environment sound (doors, windows)
   */
  public async playEnvironmentSound(type: string, position: THREE.Vector3): Promise<void> {
    // Map type names to AudioMap keys
    const soundMap: Record<string, string> = {
      'door_open': 'door_open',
      'door_close': 'door_close',
      'door_rattle': 'door_rattle',
      'door_bang': 'door_massive_impact',
      'door_pound': 'door_pound',
      'door_tap': 'door_tap',
      'door_splinter': 'door_splinter',
      'door_scratch': 'door_scratch',
      'board_shatter': 'board_shatter'
    };

    const key = soundMap[type] || type; // Allow direct key pass-through
    await this.play3D(key, position, {
      volume: 0.8,
      refDistance: 10,
      maxDistance: 50
    });
  }

  /**
   * Play player damage sound
   */
  public async playPlayerDamage(heavy: boolean): Promise<void> {
    const key = heavy ? 'player_hurt_heavy' : 'player_hurt_light';
    await this.play2D(key, { volume: 1.0 });
  }

  /**
   * Play player death
   */
  public async playPlayerDeath(): Promise<void> {
    await this.play2D('player_death', { volume: 1.0 });
  }

  /**
   * Play item pickup
   */
  public async playItemPickup(type: 'ammo' | 'wood'): Promise<void> {
    const key = type === 'ammo' ? 'pickup_ammo' : 'pickup_wood';
    await this.play2D(key, { volume: 0.7 });
  }

  /**
   * Play tree fall sound
   */
  public async playTreeFall(position: THREE.Vector3): Promise<void> {
    await this.play3D('tree_fall', position, {
      volume: 1.0,
      refDistance: 15,
      maxDistance: 80
    });
  }

  /**
   * Play board hammer sound
   */
  public async playBoardHammer(position: THREE.Vector3): Promise<void> {
    await this.play3D('board_hammer', position, {
      volume: 0.8,
      refDistance: 8,
      maxDistance: 40
    });
  }

  /**
   * Play footstep (player)
   */
  public async playFootstep(position: THREE.Vector3, surface: 'wood' | 'dirt'): Promise<void> {
    const sounds: string[] = surface === 'wood'
      ? ['stepwood_1', 'stepwood_2']
      : ['stepdirt_1', 'stepdirt_2'];

    const key = sounds[Math.floor(Math.random() * sounds.length)]!;

    await this.play3D(key, position, {
      volume: 0.3,
      refDistance: 2,
      maxDistance: 10,
      randomPitch: true
    });
  }

  /**
   * Set master volumes
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  public setMusicVolume(volume: number): void {
    this._musicVolume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = THREE.MathUtils.clamp(volume, 0, 1);
    if (this.ambientLoop) {
      this.ambientLoop.setVolume(this.ambientVolume * this.masterVolume);
    }
  }

  /**
   * Stop all audio
   */
  public stopAll(): void {
    this.pool3D.forEach(entry => {
      if (entry.audio.isPlaying) {
        entry.audio.stop();
      }
      entry.inUse = false;
      entry.key = '';
    });

    this.pool2D.forEach(entry => {
      if (entry.audio.isPlaying) {
        entry.audio.stop();
      }
      entry.inUse = false;
      entry.key = '';
    });

    this.activeSounds.clear();
  }

  /**
   * Update (call in game loop)
   */
  public update(_deltaTime: number): void {
    // Update heartbeat intensity based on health
    if (this.isLowHealth && this.heartbeatLoop) {
      // Pulsate heartbeat volume
      const pulse = Math.sin(Date.now() / 400) * 0.2 + 0.6;
      this.heartbeatLoop.setVolume(pulse * this.masterVolume);
    }
  }

  /**
   * Dispose
   */
  public dispose(): void {
    this.stopAll();
    this.bufferCache.clear();
    this.loadingPromises.clear();
  }

}
