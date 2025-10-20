# PSX Horror Post-Processing Effects

Custom shader effects for authentic PlayStation 1 horror aesthetic.

## Overview

This system recreates the distinctive PSX visual style through:
- **8x8 Bayer dithering** - Ordered dithering for grainy texture
- **Color posterization** - Reduced color depth (32 levels per channel)
- **YUV color space processing** - Perceptually accurate dithering
- **Chromatic aberration** - Subtle RGB channel separation
- **Horror color grading** - Desaturated, high-contrast, cool-tinted

## Effects

### PSXEffect

Core PSX aesthetic with dithering and posterization.

```typescript
const psxEffect = new PSXEffect({
  resolution: new Vector2(320, 240), // PSX native resolution
  colorDepth: 32.0,                  // Color levels (15-32 for authentic PSX)
  ditherStrength: 0.08,              // Dithering intensity
  pixelationAmount: 1.0              // Additional pixelation (1.0 = none)
});
```

**Parameters:**
- `resolution` - Virtual rendering resolution (320x240 = authentic PSX)
- `colorDepth` - Color quantization levels (lower = more posterized)
- `ditherStrength` - How much dithering noise to add (0.0-0.2 recommended)
- `pixelationAmount` - Extra pixelation multiplier (1.0 = disabled)

**How it works:**
1. Converts RGB to YUV color space for perceptual dithering
2. Applies 8x8 Bayer matrix dithering to luminance channel
3. Posterizes color values to simulate limited color depth
4. Converts back to RGB

### ChromaticAberrationEffect

Subtle RGB channel separation for lens distortion.

```typescript
const chromaticAberration = new ChromaticAberrationEffect({
  offset: new Vector2(0.001, 0.001), // Channel separation amount
  strength: 0.5                      // Overall intensity
});
```

**Parameters:**
- `offset` - Base offset for RGB separation (0.001-0.005 recommended)
- `strength` - Multiplier for effect intensity (0.0-1.0)

**Effect:**
- Red channel shifts outward
- Green channel stays centered
- Blue channel shifts inward
- Creates dreamy/unsettling lens distortion

### ColorGradingEffect

Color adjustments for horror atmosphere.

```typescript
const colorGrading = new ColorGradingEffect({
  saturation: 0.7,                           // Desaturated
  contrast: 1.2,                             // High contrast
  brightness: 0.85,                          // Darker
  tint: new Color(0.75, 0.8, 1.15),         // Cool blue-purple
  tintStrength: 0.2                          // Subtle tint
});
```

**Parameters:**
- `saturation` - Color saturation (0.0 = grayscale, 1.0 = normal, >1.0 = vibrant)
- `contrast` - Contrast level (1.0 = normal, >1.0 = more dramatic)
- `brightness` - Overall brightness (1.0 = normal, <1.0 = darker)
- `tint` - RGB color tint (use Color values >1.0 to boost channels)
- `tintStrength` - How much tint to apply (0.0-1.0)

**Horror defaults:**
- Desaturated (0.7) for bleak atmosphere
- High contrast (1.2) for dramatic shadows
- Darker (0.85) for ominous feel
- Cool blue-purple tint for nighttime/supernatural mood

## Integration

Effects are applied in SceneManager via the `postprocessing` library:

```typescript
import { PSXEffect, ChromaticAberrationEffect, ColorGradingEffect } from '../rendering/effects';

// Create effects
const psxEffect = new PSXEffect({ /* ... */ });
const colorGrading = new ColorGradingEffect({ /* ... */ });
const chromaticAberration = new ChromaticAberrationEffect({ /* ... */ });

// Combine in EffectPass (order matters!)
const effectPass = new EffectPass(
  camera,
  psxEffect,          // 1. Base PSX look
  colorGrading,       // 2. Mood adjustment
  chromaticAberration,// 3. Lens distortion
  noiseEffect,        // 4. Film grain
  vignetteEffect      // 5. Framing
);

composer.addPass(effectPass);
```

## Effect Order

The order effects are applied matters:

1. **PSX Effect** - Base dithering and posterization
2. **Color Grading** - Adjust mood before distortion
3. **Chromatic Aberration** - Lens effects on graded image
4. **Noise Effect** - Film grain on top
5. **Vignette Effect** - Final framing

## Tuning for Horror

### Subtle PSX (modern horror)
```typescript
colorDepth: 64.0      // Higher = less posterization
ditherStrength: 0.03  // Subtle dithering
saturation: 0.85      // Slightly desaturated
```

### Heavy PSX (retro horror)
```typescript
colorDepth: 16.0      // Lower = more posterization
ditherStrength: 0.12  // Heavy dithering
saturation: 0.6       // Very desaturated
```

### Nightmare Mode (extreme)
```typescript
colorDepth: 8.0       // Extreme posterization
ditherStrength: 0.2   // Maximum dithering
saturation: 0.4       // Almost grayscale
brightness: 0.7       // Very dark
```

## Performance

All effects are GPU-accelerated and very efficient:
- **PSX Effect** - ~0.2ms @ 1080p (simple math operations)
- **Chromatic Aberration** - ~0.1ms (3 texture samples)
- **Color Grading** - ~0.1ms (simple math)

Total overhead: ~0.4ms (negligible)

## Technical Details

### Bayer Matrix Dithering

Uses 8x8 ordered dithering matrix for consistent, artifact-free patterns:
```glsl
const mat4 bayerMatrix0 = mat4(
   0.0, 32.0,  8.0, 40.0,
  48.0, 16.0, 56.0, 24.0,
  12.0, 44.0,  4.0, 36.0,
  60.0, 28.0, 52.0, 20.0
);
```

Split into two 4x4 matrices to work around GLSL limitations.

### YUV Color Space

Dithering in YUV space looks better than RGB:
- Y (luminance) contains most perceptual information
- U/V (chrominance) less sensitive to quantization
- Prevents color banding and preserves detail

### Posterization

Reduces color precision to simulate PSX 15-bit color (5 bits per channel):
```glsl
vec3 posterize(vec3 color, float levels) {
  return floor(color * levels) / levels;
}
```

## References

- Roman Liutikov: [PS1 Style Graphics in Three.js](https://romanliutikov.com/blog/ps1-style-graphics-in-threejs)
- Maxime Heckel: [The Art of Dithering and Retro Shading](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/)
- Codrops: [PSX Jitter Shader Tutorial](https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/)

## Future Enhancements

Potential additions for Phase 2+:

- **Vertex Jitter** - Geometry wobble (requires material patching)
- **Affine Texture Mapping** - Perspective-incorrect UVs (material level)
- **Screen-space Reflections** - Low-res, dithered reflections
- **Fog Shader** - Custom PSX-style fog with dithering
- **CRT Scanlines** - Optional scanline effect
