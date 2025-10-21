import { Effect } from 'postprocessing';
import { Uniform, Color } from 'three';

/**
 * Depth-Based Fog Effect
 * Post-processing fog that uses scene depth for more realistic atmospheric scattering
 * Complements Three.js built-in fog with enhanced depth perception
 * Based on modern 2025 techniques for horror atmosphere
 */

const fragmentShader = `
  uniform vec3 fogColor;
  uniform float fogDensity;
  uniform float fogNear;
  uniform float fogFar;
  uniform bool useLinear;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Sample the depth buffer
    float depth = texture2D(depthBuffer, uv).r;

    // Convert depth to view space distance
    float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    float distance = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);

    // Calculate fog factor based on mode
    float fogFactor;
    if (useLinear) {
      // Linear fog (distance-based fade)
      fogFactor = smoothstep(fogNear, fogFar, distance);
    } else {
      // Exponential fog (more realistic atmospheric scattering)
      float fogDistance = distance * (cameraFar - cameraNear);
      fogFactor = 1.0 - exp(-fogDensity * fogDensity * fogDistance * fogDistance);
    }

    // Clamp fog factor
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    // Mix scene color with fog color based on fog factor
    vec3 color = mix(inputColor.rgb, fogColor, fogFactor);

    outputColor = vec4(color, inputColor.a);
  }
`;

export interface DepthFogEffectOptions {
  /** Fog color (default: dark blue-gray for horror) */
  fogColor?: Color | number;
  /** Fog density for exponential mode (default: 0.5) */
  fogDensity?: number;
  /** Near distance for linear mode (default: 0.1) */
  fogNear?: number;
  /** Far distance for linear mode (default: 0.9) */
  fogFar?: number;
  /** Use linear fog instead of exponential (default: false) */
  useLinear?: boolean;
}

export class DepthFogEffect extends Effect {
  /**
   * @param options - Depth fog options
   */
  constructor(options: DepthFogEffectOptions = {}) {
    const uniforms = new Map<string, Uniform>();

    const fogColor = options.fogColor instanceof Color
      ? options.fogColor
      : new Color(options.fogColor ?? 0x050508);

    uniforms.set('fogColor', new Uniform(fogColor));
    uniforms.set('fogDensity', new Uniform(options.fogDensity ?? 0.5));
    uniforms.set('fogNear', new Uniform(options.fogNear ?? 0.1));
    uniforms.set('fogFar', new Uniform(options.fogFar ?? 0.9));
    uniforms.set('useLinear', new Uniform(options.useLinear ?? false));

    super('DepthFogEffect', fragmentShader, {
      uniforms
    });
  }

  /**
   * Get the fog color
   */
  get fogColor(): Color {
    return (this.uniforms.get('fogColor') as Uniform).value;
  }

  /**
   * Set the fog color
   */
  set fogColor(value: Color) {
    (this.uniforms.get('fogColor') as Uniform).value = value;
  }

  /**
   * Get the fog density
   */
  get fogDensity(): number {
    return (this.uniforms.get('fogDensity') as Uniform).value;
  }

  /**
   * Set the fog density
   */
  set fogDensity(value: number) {
    (this.uniforms.get('fogDensity') as Uniform).value = value;
  }

  /**
   * Get the near distance
   */
  get fogNear(): number {
    return (this.uniforms.get('fogNear') as Uniform).value;
  }

  /**
   * Set the near distance
   */
  set fogNear(value: number) {
    (this.uniforms.get('fogNear') as Uniform).value = value;
  }

  /**
   * Get the far distance
   */
  get fogFar(): number {
    return (this.uniforms.get('fogFar') as Uniform).value;
  }

  /**
   * Set the far distance
   */
  set fogFar(value: number) {
    (this.uniforms.get('fogFar') as Uniform).value = value;
  }

  /**
   * Get whether using linear fog
   */
  get useLinear(): boolean {
    return (this.uniforms.get('useLinear') as Uniform).value;
  }

  /**
   * Set whether to use linear fog
   */
  set useLinear(value: boolean) {
    (this.uniforms.get('useLinear') as Uniform).value = value;
  }
}
