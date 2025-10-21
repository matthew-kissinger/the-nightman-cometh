# Lighting and Fog Improvements (2025)

## Overview
Enhanced flashlight and fog systems using modern Three.js techniques researched from 2025 best practices. Focuses on realistic atmospheric scattering, volumetric lighting, and horror game aesthetics.

---

## 1. Enhanced Flashlight System

### Modern 2025 Parameters
Based on research from MoldStud and Three.js community best practices:

**Previous Settings:**
```typescript
new THREE.SpotLight(0xffddaa, 2, 20, Math.PI/6, 0.5, 1)
// intensity: 2, distance: 20, angle: ~30°, penumbra: 0.5, decay: 1 (linear)
```

**New Settings (2025 Best Practices):**
```typescript
new THREE.SpotLight(0xffddaa, 4.5, 25, Math.PI/7, 0.7, 2)
// intensity: 4.5, distance: 25, angle: ~25.7°, penumbra: 0.7, decay: 2 (quadratic)
```

### Key Improvements:

1. **Intensity: 2.0 → 4.5**
   - 2025 recommendation: 3-5 range for dramatic horror lighting
   - Creates stronger, more visible beam in dark environments
   - Better illumination of nearby objects

2. **Decay: 1 (linear) → 2 (quadratic)**
   - Quadratic decay is physically accurate (inverse-square law)
   - More realistic light falloff
   - Reduces intensity proportionally to square of distance

3. **Angle: π/6 (~30°) → π/7 (~25.7°)**
   - Tighter, more focused beam
   - 2025 recommendation: 15-45° for optimal spotlight effect
   - Creates more dramatic, "flashlight-like" appearance

4. **Penumbra: 0.5 → 0.7**
   - Softer edges for more realistic rendering
   - 2025 standard: 0.5 for effective balance
   - Higher value (0.7) creates atmospheric, horror-appropriate softness

5. **Shadow Map: 512x512 → 1024x1024**
   - 2025 standard compromise between quality and performance
   - Previous 512x512 was intentionally PSX-style low-res
   - 1024x1024 maintains performance while improving quality
   - Added shadow bias (-0.0001) to prevent shadow acne

6. **Distance: 20 → 25**
   - Extended range for better coverage
   - Matches increased intensity

---

## 2. Volumetric Spotlight Effect

### Implementation: `VolumetricSpotlight.ts`

Created custom Three.js mesh with shader to render visible light cone.

**Features:**
- Cone geometry matching spotlight parameters
- Distance-based attenuation (fade along beam length)
- Edge-based attenuation (fade at cone edges)
- Atmospheric noise for volumetric scattering
- Fog integration
- Additive blending for realistic light appearance

**Shader Technique:**
```glsl
// Distance attenuation (exponential falloff)
float distanceAttenuation = pow(clamp(1.0 - vDepth * attenuation, 0.0, 1.0), 2.0);

// Edge attenuation (soft edges)
float angleAttenuation = pow(abs(vNormal.z), anglePower);

// Atmospheric noise (scattering)
float noiseAttenuation = mix(1.0, noise(vWorldPosition * 2.0), noisiness);

// Fog integration
float fogFactor = 1.0 - exp(-fogDensity^2 * vDepth^2);
```

**Parameters:**
- `opacity: 0.35` - Subtle volumetric effect
- `attenuation: 0.04` - Gentle distance falloff
- `anglePower: 2.5` - Soft edges
- `noisiness: 0.4` - Atmospheric scattering for horror
- `segments: 32` - Smooth cone geometry

**Integration:**
- Syncs position/rotation with SpotLight in update loop
- Syncs fog parameters from scene
- Uses `BackSide` rendering for proper blending from inside

---

## 3. Enhanced Fog System

### Scene Fog (Three.js Built-in)

**Previous:**
```typescript
new THREE.FogExp2(0x000000, 0.02)
// Pure black, moderate density
```

**New:**
```typescript
new THREE.FogExp2(0x050508, 0.035)
// Dark blue-gray, higher density
```

**Improvements:**

1. **Color: 0x000000 → 0x050508**
   - Very dark blue-gray instead of pure black
   - Creates depth perception (lighter than black)
   - Matches background for seamless fade
   - Horror aesthetic: cold, atmospheric

2. **Density: 0.02 → 0.035**
   - 75% increase in fog density
   - More atmospheric, claustrophobic feel
   - Better depth cues for horror environment
   - Still allows visibility of nearby objects

### Post-Processing Depth Fog

### Implementation: `DepthFogEffect.ts`

Modern 2025 technique using depth buffer for enhanced atmospheric scattering.

**How It Works:**
1. Samples scene depth buffer
2. Converts depth to view-space distance
3. Calculates exponential fog factor
4. Mixes scene color with fog color based on depth

**Advantages over Scene Fog:**
- More accurate depth-based fog
- Works in post-processing (after all rendering)
- Can be combined with scene fog for layered effect
- Better control over fog appearance

**Shader Implementation:**
```glsl
// Sample depth buffer
float depth = texture2D(depthBuffer, uv).r;
float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
float distance = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);

// Exponential fog
float fogDistance = distance * (cameraFar - cameraNear);
float fogFactor = 1.0 - exp(-fogDensity^2 * fogDistance^2);

// Mix with fog color
vec3 color = mix(inputColor.rgb, fogColor, fogFactor);
```

**Parameters:**
- `fogColor: 0x050508` - Matches scene fog
- `fogDensity: 0.4` - Subtle post-process effect
- `useLinear: false` - Exponential fog for realism

**Integration in Effect Pipeline:**
```
1. PSX dithering/posterization
2. Color grading
3. Depth fog ← NEW
4. Chromatic aberration
5. Noise
6. Vignette
```

---

## 4. Combined Effect

### Layered Fog System
The game now uses THREE levels of fog:

1. **Scene Fog (Three.js FogExp2)**
   - Applied to materials during rendering
   - Affects 3D geometry directly
   - Creates base atmospheric haze

2. **Post-Processing Depth Fog**
   - Applied after rendering using depth buffer
   - More accurate depth-based fog
   - Enhances atmospheric depth

3. **Volumetric Light Interaction**
   - Light cone itself fades with fog
   - Creates realistic light scattering
   - Syncs with scene fog parameters

### Horror Atmosphere Benefits

1. **Depth Perception**
   - Fog color (0x050508) lighter than background
   - Creates sense of depth in darkness
   - Objects fade into darkness naturally

2. **Claustrophobia**
   - Higher density (0.035) creates oppressive atmosphere
   - Limited visibility enhances tension
   - Works with dark ambient lighting

3. **Light Contrast**
   - Stronger flashlight (4.5 intensity) cuts through fog
   - Volumetric cone visible in atmospheric haze
   - Creates dramatic lighting moments

4. **Performance**
   - Exponential fog is GPU-efficient
   - Depth fog uses existing depth buffer
   - Volumetric light uses simple cone mesh
   - 1024x1024 shadows balanced for quality/performance

---

## Research Sources

### 2025 Best Practices:
- **MoldStud**: Three.js lighting techniques comparing directional, point, and spotlights
- **Higherpass (April 2025)**: Enhancing Three.js scenes with shadows and fog
- **Three.js Community**: Volumetric fog and lighting discussions
- **GitHub Examples**:
  - jeromeetienne/threex.volumetricspotlight
  - hsimpson/threejs-volumetric-spotlight
  - netpraxis/volumetric_light_example

### Key Findings:
1. Quadratic decay (value 2) is 2025 standard for realistic light falloff
2. Shadow resolution of 1024x1024 is optimal quality/performance balance
3. Penumbra around 0.5-0.7 creates realistic soft edges
4. Spotlight intensity 3-5 range for dramatic effects
5. Exponential fog more realistic than linear
6. Depth-based post-processing fog enhances scene fog
7. Volumetric light cones use cone geometry + custom shaders
8. Noise in volumetric effects creates atmospheric scattering

---

## Configuration

Updated `src/config/cabin.config.json`:

```json
{
  "lighting": {
    "flashlightIntensity": 4.5,
    "flashlightDistance": 25,
    "flashlightAngle": 0.4488,
    "flashlightPenumbra": 0.7,
    "flashlightDecay": 2,
    "shadowMapSize": 1024
  },
  "fog": {
    "color": "#050508",
    "density": 0.035,
    "type": "exponential"
  }
}
```

---

## Files Modified

1. **Created:**
   - `src/rendering/effects/VolumetricSpotlight.ts` - Volumetric light cone
   - `src/rendering/effects/DepthFogEffect.ts` - Post-processing depth fog

2. **Modified:**
   - `src/world/SceneManager.ts` - Integrated all improvements
   - `src/config/cabin.config.json` - Updated configuration

---

## Performance Impact

- **Volumetric Light**: +1 draw call (cone mesh), minimal GPU cost
- **Depth Fog**: Uses existing depth buffer, negligible cost
- **Shadow Maps**: 512→1024 = 4x memory, ~2x cost (acceptable on modern GPUs)
- **Overall**: Minimal performance impact for significant visual improvement

---

## Next Steps (Phase 2 Continuation)

From ROADMAP.md Phase 2 - Environment:

- [ ] Skybox (dark stormy night)
- [ ] Tune other post-processing effects
  - [ ] Adjust vignette darkness
  - [ ] Adjust film grain
  - [ ] Tweak color grading for horror mood

**Completed:**
- [x] Integrate custom fog shaders ✓ (Depth fog + enhanced FogExp2)
- [x] Tune post-processing effects ✓ (Added depth fog to pipeline)
