import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

/**
 * PSX-style post-processing effect
 * Implements dithering, color posterization, and pixelation
 * Based on PlayStation 1 hardware limitations for retro horror aesthetic
 */

const fragmentShader = `
  uniform vec2 resolution;
  uniform float colorDepth;
  uniform float ditherStrength;
  uniform float pixelationAmount;

  // 8x8 Bayer dithering matrix (PSX-style ordered dithering)
  const mat4 bayerMatrix0 = mat4(
     0.0, 32.0,  8.0, 40.0,
    48.0, 16.0, 56.0, 24.0,
    12.0, 44.0,  4.0, 36.0,
    60.0, 28.0, 52.0, 20.0
  );

  const mat4 bayerMatrix1 = mat4(
     3.0, 35.0, 11.0, 43.0,
    51.0, 19.0, 59.0, 27.0,
    15.0, 47.0,  7.0, 39.0,
    63.0, 31.0, 55.0, 23.0
  );

  // Get dither threshold from 8x8 Bayer matrix
  float getBayerDither(vec2 fragCoord) {
    ivec2 coord = ivec2(mod(fragCoord, 8.0));
    int x = coord.x;
    int y = coord.y;

    // Sample from 4x4 matrices to create 8x8 pattern
    if (y < 4) {
      if (x < 4) {
        return bayerMatrix0[y][x] / 64.0;
      } else {
        return bayerMatrix1[y][x - 4] / 64.0;
      }
    } else {
      if (x < 4) {
        return bayerMatrix0[y - 4][x] / 64.0;
      } else {
        return bayerMatrix1[y - 4][x - 4] / 64.0;
      }
    }
  }

  // RGB to YUV conversion (for better dithering in perceptual space)
  vec3 rgb2yuv(vec3 rgb) {
    float y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float u = (rgb.b - y) * 0.565;
    float v = (rgb.r - y) * 0.713;
    return vec3(y, u, v);
  }

  // YUV to RGB conversion
  vec3 yuv2rgb(vec3 yuv) {
    float r = yuv.x + 1.403 * yuv.z;
    float g = yuv.x - 0.344 * yuv.y - 0.714 * yuv.z;
    float b = yuv.x + 1.770 * yuv.y;
    return vec3(r, g, b);
  }

  // Color posterization (reduce color depth)
  vec3 posterize(vec3 color, float levels) {
    return floor(color * levels) / levels;
  }

  // Dither and posterize in YUV space for better quality
  vec3 ditherAndPosterize(vec2 fragCoord, vec3 color, float levels, float ditherAmount) {
    // Convert to YUV for perceptual dithering
    vec3 yuv = rgb2yuv(color);

    // Get dither threshold
    float threshold = getBayerDither(fragCoord);

    // Apply dithering to luminance
    yuv.x += (threshold - 0.5) * ditherAmount;

    // Posterize in YUV space
    yuv = posterize(yuv, levels);

    // Convert back to RGB
    return yuv2rgb(yuv);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 sampleUv = uv;

    // Pixelation effect using screen coordinates
    if (pixelationAmount > 1.0) {
      // Get screen pixel size for this pixelation level
      vec2 pixelSize = pixelationAmount / resolution;

      // Snap UV coordinates to pixel grid
      sampleUv = floor(uv / pixelSize) * pixelSize;

      // Add half pixel offset to sample from center
      sampleUv += pixelSize * 0.5;
    }

    // Sample from the input buffer
    vec4 color = texture2D(inputBuffer, sampleUv);

    // Apply dithering and posterization
    vec3 finalColor = ditherAndPosterize(
      gl_FragCoord.xy,
      color.rgb,
      colorDepth,
      ditherStrength
    );

    outputColor = vec4(finalColor, color.a);
  }
`;

export class PSXEffect extends Effect {
  /**
   * @param options - PSX effect options
   * @param options.resolution - Screen resolution (default: 320x240 for authentic PSX)
   * @param options.colorDepth - Color levels per channel (default: 32.0, PSX used ~15-32)
   * @param options.ditherStrength - Dithering intensity (default: 0.05)
   * @param options.pixelationAmount - Pixelation level, 1.0 = none, higher = more pixelated (default: 1.0)
   */
  constructor(options: {
    resolution?: Vector2;
    colorDepth?: number;
    ditherStrength?: number;
    pixelationAmount?: number;
  } = {}) {
    const uniforms = new Map<string, Uniform>();
    uniforms.set('resolution', new Uniform(options.resolution || new Vector2(320, 240)));
    uniforms.set('colorDepth', new Uniform(options.colorDepth ?? 32.0));
    uniforms.set('ditherStrength', new Uniform(options.ditherStrength ?? 0.05));
    uniforms.set('pixelationAmount', new Uniform(options.pixelationAmount ?? 1.0));

    super('PSXEffect', fragmentShader, {
      uniforms
    });
  }

  /**
   * Get the resolution uniform
   */
  get resolution(): Vector2 {
    return (this.uniforms.get('resolution') as Uniform).value;
  }

  /**
   * Set the resolution uniform
   */
  set resolution(value: Vector2) {
    (this.uniforms.get('resolution') as Uniform).value = value;
  }

  /**
   * Get the color depth
   */
  get colorDepth(): number {
    return (this.uniforms.get('colorDepth') as Uniform).value;
  }

  /**
   * Set the color depth
   */
  set colorDepth(value: number) {
    (this.uniforms.get('colorDepth') as Uniform).value = value;
  }

  /**
   * Get the dither strength
   */
  get ditherStrength(): number {
    return (this.uniforms.get('ditherStrength') as Uniform).value;
  }

  /**
   * Set the dither strength
   */
  set ditherStrength(value: number) {
    (this.uniforms.get('ditherStrength') as Uniform).value = value;
  }

  /**
   * Get the pixelation amount
   */
  get pixelationAmount(): number {
    return (this.uniforms.get('pixelationAmount') as Uniform).value;
  }

  /**
   * Set the pixelation amount
   */
  set pixelationAmount(value: number) {
    (this.uniforms.get('pixelationAmount') as Uniform).value = value;
  }
}
