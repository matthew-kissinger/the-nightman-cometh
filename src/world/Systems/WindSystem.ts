import * as THREE from 'three';

/**
 * WindSystem - Creates realistic wind effects for vegetation
 *
 * Features:
 * - Perlin-noise-like wind simulation using multiple sine waves
 * - Random gusts and variations
 * - Shader-based tree sway animation
 * - Audio-reactive wind intensity
 */

export interface WindGustEvent {
  strength: number;
  time: number;
  isActive: boolean;
}

export class WindSystem {
  // Wind parameters
  private windDirection: THREE.Vector2 = new THREE.Vector2(1, 0.3).normalize();
  private windStrength: number = 0.3;
  private gustStrength: number = 0.0;
  private time: number = 0;

  // Wind variation parameters
  private baseWindSpeed: number = 0.5;
  private gustFrequency: number = 0.5; // How often gusts occur (increased)

  // Audio integration
  private audioIntensity: number = 0.0;

  // Gust tracking for audio triggers
  private gustThreshold: number = 0.5; // Threshold to trigger wind audio (lowered for more frequent gusts)
  private isGusting: boolean = false;
  public onGustStart: ((strength: number) => void) | null = null;
  public onGustEnd: (() => void) | null = null;

  constructor() {
    // Randomize initial wind direction
    const angle = Math.random() * Math.PI * 2;
    this.windDirection.set(Math.cos(angle), Math.sin(angle));
  }

  /**
   * Update wind simulation
   */
  update(deltaTime: number): void {
    this.time += deltaTime;

    // Simulate wind gusts using multiple sine waves (Perlin-noise approximation)
    const baseWind = Math.sin(this.time * this.baseWindSpeed) * 0.5 + 0.5;
    const gust1 = Math.sin(this.time * this.gustFrequency * 2.3) * 0.3;
    const gust2 = Math.sin(this.time * this.gustFrequency * 1.7) * 0.2;

    this.gustStrength = (baseWind + gust1 + gust2) * 0.5;

    // Combine base wind with gusts
    this.windStrength = 0.3 + this.gustStrength * 0.4;

    // Detect gust start/end for audio triggering
    const currentGustActive = this.gustStrength > this.gustThreshold;

    if (currentGustActive && !this.isGusting) {
      // Gust started
      this.isGusting = true;
      if (this.onGustStart) {
        this.onGustStart(this.gustStrength);
      }
    } else if (!currentGustActive && this.isGusting) {
      // Gust ended
      this.isGusting = false;
      if (this.onGustEnd) {
        this.onGustEnd();
      }
    }

    // Slowly rotate wind direction over time
    const directionShift = Math.sin(this.time * 0.1) * 0.2;
    const angle = Math.atan2(this.windDirection.y, this.windDirection.x) + directionShift * deltaTime;
    this.windDirection.set(Math.cos(angle), Math.sin(angle));
  }

  /**
   * Set audio intensity to influence wind
   */
  setAudioIntensity(intensity: number): void {
    this.audioIntensity = THREE.MathUtils.clamp(intensity, 0, 1);
  }

  /**
   * Get current wind strength (0-1)
   */
  getWindStrength(): number {
    return this.windStrength + this.audioIntensity * 0.2;
  }

  /**
   * Get wind direction
   */
  getWindDirection(): THREE.Vector2 {
    return this.windDirection.clone();
  }

  /**
   * Get wind time (for shader uniforms)
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Apply wind effect to instanced meshes using matrix manipulation
   * This creates a sway effect by modifying instance transforms
   */
  applyWindToInstancedMesh(
    instancedMesh: THREE.InstancedMesh,
    instances: Array<{ position: THREE.Vector3; rotation: number; scale: number }>,
    swayAmount: number = 0.05
  ): void {
    const dummy = new THREE.Object3D();

    instances.forEach((instance, i) => {
      // Calculate wind effect for this tree based on position (creates variation)
      const positionVariation = (instance.position.x * 0.1 + instance.position.z * 0.1);
      const windPhase = this.time + positionVariation;

      // Sway calculation
      const swayX = Math.sin(windPhase * 2.0) * this.windDirection.x * swayAmount * this.windStrength;
      const swayZ = Math.sin(windPhase * 2.0) * this.windDirection.y * swayAmount * this.windStrength;

      // Additional high-frequency sway for leaves/branches
      const leafSway = Math.sin(windPhase * 5.0) * swayAmount * 0.3 * this.windStrength;

      // Set position with sway offset at the top (pivot at base)
      dummy.position.copy(instance.position);
      dummy.rotation.set(swayX + leafSway, instance.rotation, swayZ);
      dummy.scale.setScalar(instance.scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get shader uniforms for wind (for custom shaders)
   */
  getShaderUniforms(): { [key: string]: THREE.IUniform } {
    return {
      uWindTime: { value: this.time },
      uWindStrength: { value: this.getWindStrength() },
      uWindDirection: { value: this.windDirection },
      uGustStrength: { value: this.gustStrength }
    };
  }
}
