import { Effect } from 'postprocessing';
import { Uniform, Color } from 'three';

/**
 * Color Grading Effect for Horror Atmosphere
 * Adjusts saturation, contrast, brightness, and color tint
 * Optimized for dark, moody horror game aesthetic
 */

const fragmentShader = `
  uniform float saturation;
  uniform float contrast;
  uniform float brightness;
  uniform vec3 tint;
  uniform float tintStrength;

  // Convert RGB to luminance (grayscale)
  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  // Adjust saturation
  vec3 adjustSaturation(vec3 color, float amount) {
    float luma = getLuminance(color);
    return mix(vec3(luma), color, amount);
  }

  // Adjust contrast
  vec3 adjustContrast(vec3 color, float amount) {
    return ((color - 0.5) * amount) + 0.5;
  }

  // Adjust brightness
  vec3 adjustBrightness(vec3 color, float amount) {
    return color * amount;
  }

  // Apply color tint
  vec3 applyTint(vec3 color, vec3 tintColor, float strength) {
    return mix(color, color * tintColor, strength);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;

    // Apply adjustments in order
    color = adjustBrightness(color, brightness);
    color = adjustContrast(color, contrast);
    color = adjustSaturation(color, saturation);
    color = applyTint(color, tint, tintStrength);

    outputColor = vec4(color, inputColor.a);
  }
`;

export class ColorGradingEffect extends Effect {
  /**
   * @param options - Color grading options
   * @param options.saturation - Saturation level (0.0 = grayscale, 1.0 = normal, >1.0 = oversaturated)
   * @param options.contrast - Contrast level (1.0 = normal, >1.0 = more contrast)
   * @param options.brightness - Brightness level (1.0 = normal, <1.0 = darker)
   * @param options.tint - Color tint (default: slight blue for horror)
   * @param options.tintStrength - Tint strength (0.0 = none, 1.0 = full)
   */
  constructor(options: {
    saturation?: number;
    contrast?: number;
    brightness?: number;
    tint?: Color;
    tintStrength?: number;
  } = {}) {
    // Horror defaults: desaturated, high contrast, dark, blue-purple tint
    const uniforms = new Map<string, Uniform>();
    uniforms.set('saturation', new Uniform(options.saturation ?? 0.75)); // Slightly desaturated
    uniforms.set('contrast', new Uniform(options.contrast ?? 1.15)); // Slightly more contrast
    uniforms.set('brightness', new Uniform(options.brightness ?? 0.9)); // Slightly darker
    uniforms.set('tint', new Uniform(options.tint || new Color(0.8, 0.85, 1.1))); // Cool blue tint
    uniforms.set('tintStrength', new Uniform(options.tintStrength ?? 0.15)); // Subtle tint

    super('ColorGradingEffect', fragmentShader, {
      uniforms
    });
  }

  /**
   * Get the saturation
   */
  get saturation(): number {
    return (this.uniforms.get('saturation') as Uniform).value;
  }

  /**
   * Set the saturation
   */
  set saturation(value: number) {
    (this.uniforms.get('saturation') as Uniform).value = value;
  }

  /**
   * Get the contrast
   */
  get contrast(): number {
    return (this.uniforms.get('contrast') as Uniform).value;
  }

  /**
   * Set the contrast
   */
  set contrast(value: number) {
    (this.uniforms.get('contrast') as Uniform).value = value;
  }

  /**
   * Get the brightness
   */
  get brightness(): number {
    return (this.uniforms.get('brightness') as Uniform).value;
  }

  /**
   * Set the brightness
   */
  set brightness(value: number) {
    (this.uniforms.get('brightness') as Uniform).value = value;
  }

  /**
   * Get the tint color
   */
  get tint(): Color {
    return (this.uniforms.get('tint') as Uniform).value;
  }

  /**
   * Set the tint color
   */
  set tint(value: Color) {
    (this.uniforms.get('tint') as Uniform).value = value;
  }

  /**
   * Get the tint strength
   */
  get tintStrength(): number {
    return (this.uniforms.get('tintStrength') as Uniform).value;
  }

  /**
   * Set the tint strength
   */
  set tintStrength(value: number) {
    (this.uniforms.get('tintStrength') as Uniform).value = value;
  }
}
