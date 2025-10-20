import { Effect, BlendFunction } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

/**
 * Chromatic Aberration Effect
 * Separates RGB channels for dreamy/unsettling horror aesthetic
 * Simulates lens distortion where different wavelengths focus at different distances
 */

const fragmentShader = `
  uniform vec2 offset;
  uniform float strength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Calculate offset based on distance from center
    vec2 dir = uv - vec2(0.5);
    float dist = length(dir);

    // Apply radial chromatic aberration
    vec2 offsetR = dir * (offset * strength * 1.0);
    vec2 offsetG = dir * (offset * strength * 0.0); // Green stays centered
    vec2 offsetB = dir * (offset * strength * -1.0);

    // Sample each channel with different offsets
    float r = texture2D(inputBuffer, uv + offsetR).r;
    float g = texture2D(inputBuffer, uv + offsetG).g;
    float b = texture2D(inputBuffer, uv + offsetB).b;

    outputColor = vec4(r, g, b, inputColor.a);
  }
`;

export class ChromaticAberrationEffect extends Effect {
  /**
   * @param options - Chromatic aberration options
   * @param options.offset - Base offset for channel separation (default: 0.002)
   * @param options.strength - Overall effect strength (default: 1.0)
   */
  constructor(options: {
    offset?: Vector2;
    strength?: number;
  } = {}) {
    const uniforms = new Map<string, Uniform>();
    uniforms.set('offset', new Uniform(options.offset || new Vector2(0.002, 0.002)));
    uniforms.set('strength', new Uniform(options.strength ?? 1.0));

    super('ChromaticAberrationEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms
    });
  }

  /**
   * Get the offset
   */
  get offset(): Vector2 {
    return (this.uniforms.get('offset') as Uniform).value;
  }

  /**
   * Set the offset
   */
  set offset(value: Vector2) {
    (this.uniforms.get('offset') as Uniform).value = value;
  }

  /**
   * Get the strength
   */
  get strength(): number {
    return (this.uniforms.get('strength') as Uniform).value;
  }

  /**
   * Set the strength
   */
  set strength(value: number) {
    (this.uniforms.get('strength') as Uniform).value = value;
  }
}
