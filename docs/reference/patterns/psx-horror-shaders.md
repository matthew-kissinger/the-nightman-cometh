# PSX Horror Shaders - Retro PlayStation Aesthetic

**Source URLs**:
- https://romanliutikov.com/blog/ps1-style-graphics-in-threejs
- https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/
- https://www.appfoundry.be/blog/three-js-retro-arcade-effect-using-post-processing
**Date**: 2024 (Codrops tutorial from September 2024)
**Stack**:
- Three.js: r170+
- GLSL: Custom shaders
- TypeScript: Adaptable

**License**: N/A (Educational patterns)

## What This Example Demonstrates

PlayStation 1 graphics have a distinctive look due to hardware limitations: vertex snapping (jitter), affine texture mapping, dithering, and low polygon counts. These "flaws" create a nostalgic, unsettling aesthetic perfect for horror games. Modern implementations recreate these effects through custom shaders.

## Key PSX Visual Characteristics

1. **Vertex Jitter**: Limited vertex precision caused polygon "wobbling"
2. **Affine Texture Mapping**: Textures didn't account for perspective, creating warping
3. **Dithering**: Limited color depth required dithering for gradients
4. **Low Resolution**: Typically 320x240 pixels
5. **No Texture Filtering**: Harsh, pixelated textures

## Key Code Patterns

### Vertex Snapping (Jitter Effect)

From Roman Liutikov's blog:

```glsl
// Vertex Shader - Snap vertices to grid
uniform vec2 resolution;
uniform float jitterLevel;

void main() {
  // Standard MVP transformation
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec4 projectedPosition = projectionMatrix * mvPosition;

  // Snap to grid (this creates the jitter)
  vec2 snappedPosition = projectedPosition.xy / projectedPosition.w;
  snappedPosition *= resolution * jitterLevel;
  snappedPosition = floor(snappedPosition);
  snappedPosition /= resolution * jitterLevel;

  // Apply snapped position
  projectedPosition.xy = snappedPosition * projectedPosition.w;

  gl_Position = projectedPosition;
}
```

**TypeScript Implementation**:

```typescript
// Apply vertex jitter to material
const vertexJitterShader = `
  uniform vec2 u_resolution;
  uniform float u_jitterLevel;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 projected = projectionMatrix * mvPosition;

    // Snap to grid
    vec2 screenPos = projected.xy / projected.w;
    screenPos *= u_resolution * u_jitterLevel;
    screenPos = floor(screenPos);
    screenPos /= u_resolution * u_jitterLevel;
    projected.xy = screenPos * projected.w;

    gl_Position = projected;
  }
`;

// Add to Three.js material
material.onBeforeCompile = (shader) => {
  shader.uniforms.u_resolution = { value: new THREE.Vector2(320, 240) };
  shader.uniforms.u_jitterLevel = { value: 1.0 };

  // Inject into vertex shader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    vertexJitterShader
  );
};
```

### Affine Texture Mapping

```glsl
// Vertex Shader - Prepare for affine mapping
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z; // Store depth

  gl_Position = projectionMatrix * mvPosition;
}
```

```glsl
// Fragment Shader - Apply affine texture mapping
uniform sampler2D map;
varying vec2 vUv;
varying float vDepth;

void main() {
  // Affine mapping: don't divide by depth (perspective incorrect)
  vec2 affineUv = vUv;

  // Sample texture without perspective correction
  vec4 texColor = texture2D(map, affineUv);

  gl_FragColor = texColor;
}
```

### Dithering (Bayer Matrix)

```glsl
// Fragment Shader - Dithering effect
const mat4 bayerMatrix = mat4(
  0.0,  8.0,  2.0, 10.0,
  12.0, 4.0, 14.0,  6.0,
  3.0, 11.0,  1.0,  9.0,
  15.0, 7.0, 13.0,  5.0
);

float getDitherThreshold(vec2 fragCoord) {
  int x = int(mod(fragCoord.x, 4.0));
  int y = int(mod(fragCoord.y, 4.0));
  return bayerMatrix[x][y] / 16.0;
}

void main() {
  vec4 color = texture2D(map, vUv);

  // Apply dithering
  float threshold = getDitherThreshold(gl_FragCoord.xy);
  float gray = (color.r + color.g + color.b) / 3.0;

  if (gray < threshold) {
    color.rgb *= 0.5; // Darken based on threshold
  }

  gl_FragColor = color;
}
```

### Color Posterization

```glsl
// Fragment Shader - Reduce color depth
uniform float colorDepth; // e.g., 16.0 for 16 colors per channel

vec3 posterize(vec3 color, float levels) {
  return floor(color * levels) / levels;
}

void main() {
  vec4 texColor = texture2D(map, vUv);

  // Posterize to limited color palette
  vec3 posterized = posterize(texColor.rgb, colorDepth);

  gl_FragColor = vec4(posterized, texColor.a);
}
```

## Shader Patching Approach (Roman Liutikov)

```typescript
// Patch Three.js built-in shaders before loading scene
import * as THREE from 'three';

// Dithering and posterization functions
const ditheringChunk = `
  const mat4 bayerMatrix = mat4(
    0.0,  8.0,  2.0, 10.0,
    12.0, 4.0, 14.0,  6.0,
    3.0, 11.0,  1.0,  9.0,
    15.0, 7.0, 13.0,  5.0
  );

  float getDither(vec2 coord) {
    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    return bayerMatrix[x][y] / 16.0;
  }

  vec3 posterize(vec3 color, float levels) {
    return floor(color * levels) / levels;
  }
`;

// Patch physical material
THREE.ShaderLib.physical.fragmentShader = THREE.ShaderLib.physical.fragmentShader
  .replace(
    'void main() {',
    `${ditheringChunk}\nvoid main() {`
  );

// Patch map fragment
THREE.ShaderChunk.map_fragment = THREE.ShaderChunk.map_fragment
  .replace(
    'diffuseColor *= sampledDiffuseColor;',
    `
      float dither = getDither(gl_FragCoord.xy);
      vec3 dithered = sampledDiffuseColor.rgb + (dither - 0.5) / 32.0;
      vec3 posterized = posterize(dithered, 16.0);
      diffuseColor *= vec4(posterized, sampledDiffuseColor.a);
    `
  );
```

## Post-Processing Approach

```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Custom PSX post-processing shader
const PSXShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(320, 240) },
    colorDepth: { value: 16.0 },
    ditherAmount: { value: 0.05 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float colorDepth;
    uniform float ditherAmount;
    varying vec2 vUv;

    const mat4 bayerMatrix = mat4(
      0.0,  8.0,  2.0, 10.0,
      12.0, 4.0, 14.0,  6.0,
      3.0, 11.0,  1.0,  9.0,
      15.0, 7.0, 13.0,  5.0
    );

    float getDither(vec2 coord) {
      int x = int(mod(coord.x, 4.0));
      int y = int(mod(coord.y, 4.0));
      return bayerMatrix[x][y] / 16.0;
    }

    vec3 posterize(vec3 color, float levels) {
      return floor(color * levels) / levels;
    }

    void main() {
      // Pixelate
      vec2 pixelatedUv = floor(vUv * resolution) / resolution;
      vec4 color = texture2D(tDiffuse, pixelatedUv);

      // Dither
      float dither = getDither(gl_FragCoord.xy);
      color.rgb += (dither - 0.5) * ditherAmount;

      // Posterize
      color.rgb = posterize(color.rgb, colorDepth);

      gl_FragColor = color;
    }
  `
};

// Setup composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const psxPass = new ShaderPass(PSXShader);
composer.addPass(psxPass);

// Render with effects
composer.render();
```

## Complete PSX Material Setup

```typescript
class PSXMaterial {
  static create(options: {
    map?: THREE.Texture;
    color?: THREE.Color;
    jitter?: boolean;
    affine?: boolean;
  }): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({
      map: options.map,
      color: options.color || 0xffffff
    });

    if (options.map) {
      // Disable texture filtering for pixelated look
      options.map.magFilter = THREE.NearestFilter;
      options.map.minFilter = THREE.NearestFilter;
    }

    if (options.jitter || options.affine) {
      material.onBeforeCompile = (shader) => {
        // Add uniforms
        shader.uniforms.u_resolution = { value: new THREE.Vector2(320, 240) };
        shader.uniforms.u_jitter = { value: options.jitter ? 1.0 : 0.0 };

        // Custom vertex shader
        shader.vertexShader = `
          uniform vec2 u_resolution;
          uniform float u_jitter;
          ${shader.vertexShader}
        `;

        // Inject vertex jitter
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            vec4 projected = projectionMatrix * mvPosition;

            if (u_jitter > 0.0) {
              vec2 screenPos = projected.xy / projected.w;
              screenPos *= u_resolution;
              screenPos = floor(screenPos);
              screenPos /= u_resolution;
              projected.xy = screenPos * projected.w;
            }

            gl_Position = projected;
          `
        );
      };
    }

    return material;
  }
}

// Usage
const psxMaterial = PSXMaterial.create({
  map: texture,
  jitter: true,
  affine: true
});
```

## Implementation Notes

- **Performance**: Post-processing approach is cleanest but adds render pass
- **Material Patching**: Can be applied globally to all materials
- **Per-Material**: Most flexible but requires manual application
- **Texture Filtering**: Always use `NearestFilter` for pixelated look
- **Resolution**: 320x240 is authentic PSX resolution

## Gotchas

- **Vertex Jitter**: Too much causes distracting wobble, keep subtle
- **Affine Mapping**: Most noticeable on large, flat surfaces
- **Dithering**: Can interfere with UI elements, may need to exclude certain objects
- **Posterization**: Very low color depth can make scenes unreadable

## Performance Tips

- Post-processing shaders are very cheap (simple calculations)
- Bayer matrix dithering is faster than ordered/error diffusion
- Can disable effects dynamically for performance mode
- Vertex jitter has no performance impact (runs in vertex shader)

## Horror Game Applications

PSX aesthetic is perfect for horror because:
- **Uncanny Valley**: Imperfect graphics create unease
- **Ambiguity**: Low resolution hides details, creating dread
- **Nostalgia**: Callbacks to classic horror games (Silent Hill, Resident Evil)
- **Performance**: Allows more complex scenes with low-poly aesthetic

## Relevance to Our Project

**Perfect Fit for Nightman Cometh**:
- Horror game benefits from PSX uncanny aesthetic
- Low-poly cabin model works perfectly with PSX style
- Dithering adds to ominous atmosphere
- Vertex jitter creates subtle unease

**Recommended Implementation**:
1. Use post-processing approach for global effects
2. Apply dithering and color posterization
3. Add subtle vertex jitter (very low amount)
4. Use nearest-neighbor texture filtering
5. Render at lower resolution and upscale

**Integration with postprocessing library**:
We already have `postprocessing ^6.36.4` in dependencies - can create custom PSX effect:

```typescript
import { Effect } from 'postprocessing';

class PSXEffect extends Effect {
  constructor() {
    super('PSXEffect', fragmentShader, {
      uniforms: new Map([
        ['resolution', new Uniform(new Vector2(320, 240))],
        ['colorDepth', new Uniform(16.0)],
        ['ditherAmount', new Uniform(0.05)]
      ])
    });
  }
}
```

## Resources

- Roman Liutikov's Blog: https://romanliutikov.com/blog/ps1-style-graphics-in-threejs
- Codrops Tutorial (Sept 2024): https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/
- Three.js Retro Post-Processing: https://www.appfoundry.be/blog/three-js-retro-arcade-effect-using-post-processing
