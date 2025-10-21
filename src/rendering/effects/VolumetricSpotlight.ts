import * as THREE from 'three';

/**
 * Volumetric Spotlight Effect
 * Creates a visible light cone/beam for SpotLight (flashlight effect)
 * Based on modern Three.js techniques (2025)
 *
 * Implementation: Creates a cone mesh with custom shader that:
 * - Fades based on distance from light source
 * - Interacts with fog
 * - Uses noise for atmospheric scattering
 * - Optimized for horror game aesthetic
 */

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDepth;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 lightColor;
  uniform float attenuation;
  uniform float anglePower;
  uniform float opacity;
  uniform float noisiness;
  uniform float fogDensity;
  uniform vec3 fogColor;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vDepth;

  // Simple 3D noise function for atmospheric scattering
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
          mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
          mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    // Ensure depth is positive (prevent artifacts)
    float depth = abs(vDepth);

    // Distance-based attenuation (fade along cone length)
    float distanceAttenuation = pow(clamp(1.0 - depth * attenuation, 0.0, 1.0), 2.0);

    // Edge-based attenuation (fade at cone edges)
    float angleAttenuation = pow(abs(vNormal.z), anglePower);

    // Atmospheric noise (volumetric scattering)
    vec3 noiseCoord = vWorldPosition * 2.0;
    float n = noise(noiseCoord) * 0.5 + noise(noiseCoord * 2.0) * 0.25;
    float noiseAttenuation = mix(1.0, n, noisiness);

    // Combine all attenuation factors
    float finalAttenuation = distanceAttenuation * angleAttenuation * noiseAttenuation;

    // Calculate final alpha with all factors
    float finalAlpha = finalAttenuation * opacity;

    // Discard fragments with very low alpha to prevent artifacts
    if (finalAlpha < 0.001) {
      discard;
    }

    // Apply fog
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * depth * depth);
    vec3 finalColor = mix(lightColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export interface VolumetricSpotlightOptions {
  /** Light color (default: 0xffddaa) */
  color?: THREE.ColorRepresentation;
  /** Light cone angle in radians (should match SpotLight angle) */
  angle?: number;
  /** Distance/length of light cone (should match SpotLight distance) */
  distance?: number;
  /** Overall opacity of volumetric effect (0-1, default: 0.4) */
  opacity?: number;
  /** Attenuation rate along cone length (default: 0.05) */
  attenuation?: number;
  /** Edge softness power (higher = sharper edges, default: 3.0) */
  anglePower?: number;
  /** Atmospheric noise strength (0-1, default: 0.3) */
  noisiness?: number;
  /** Cone segments for geometry (default: 32) */
  segments?: number;
}

export class VolumetricSpotlight extends THREE.Mesh {
  private uniforms!: { [key: string]: THREE.IUniform };

  constructor(options: VolumetricSpotlightOptions = {}) {
    const {
      color = 0xffddaa,
      angle = Math.PI / 6,
      distance = 20,
      opacity = 0.4,
      attenuation = 0.05,
      anglePower = 3.0,
      noisiness = 0.3,
      segments = 32
    } = options;

    // Create cone geometry matching spotlight parameters
    // Cone opens in +Z direction, we'll rotate it to point forward (-Z)
    const radius = Math.tan(angle) * distance;
    const geometry = new THREE.ConeGeometry(radius, distance, segments, 1, true);

    // Rotate cone to point forward (Three.js SpotLight points in -Z)
    geometry.rotateX(Math.PI);

    // Move cone so it starts at origin (light position)
    geometry.translate(0, 0, -distance / 2);

    // Create shader material
    const uniforms = {
      lightColor: { value: new THREE.Color(color) },
      attenuation: { value: attenuation },
      anglePower: { value: anglePower },
      opacity: { value: opacity },
      noisiness: { value: noisiness },
      fogDensity: { value: 0.02 }, // Will be synced with scene fog
      fogColor: { value: new THREE.Color(0x000000) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide // Render both sides to prevent artifacts when rotating
    });

    super(geometry, material);

    this.uniforms = uniforms;

    // Don't cast or receive shadows
    this.castShadow = false;
    this.receiveShadow = false;

    // Render after opaque objects but before transparent ones
    this.renderOrder = 100;
  }

  /**
   * Update the volumetric cone to match a SpotLight's parameters
   */
  public syncWithSpotLight(spotlight: THREE.SpotLight): void {
    // Copy position
    this.position.copy(spotlight.position);

    // Calculate direction from spotlight to its target
    const direction = new THREE.Vector3();
    direction.subVectors(spotlight.target.position, spotlight.position).normalize();

    // Make the cone point in the direction of the spotlight target
    // The cone geometry points in -Z direction after our rotation in constructor
    // So we need to make -Z axis point towards the target direction
    this.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1), // Cone points in -Z
      direction                     // Make it point towards target
    );

    // Sync color
    this.uniforms?.lightColor?.value?.copy(spotlight.color);
  }

  /**
   * Sync fog parameters with scene fog
   */
  public syncWithFog(fog: THREE.Fog | THREE.FogExp2 | null): void {
    if (!fog || !this.uniforms) return;

    if (fog instanceof THREE.FogExp2) {
      if (this.uniforms.fogDensity) this.uniforms.fogDensity.value = fog.density;
      if (this.uniforms.fogColor) this.uniforms.fogColor.value.copy(fog.color);
    } else if (fog instanceof THREE.Fog) {
      // Convert linear fog to approximate exponential density
      const avgDistance = (fog.near + fog.far) / 2;
      if (this.uniforms.fogDensity) this.uniforms.fogDensity.value = 1 / Math.max(avgDistance, 1);
      if (this.uniforms.fogColor) this.uniforms.fogColor.value.copy(fog.color);
    }
  }

  /**
   * Get/set light color
   */
  get color(): THREE.Color {
    return this.uniforms?.lightColor?.value || new THREE.Color();
  }

  set color(value: THREE.Color | THREE.ColorRepresentation) {
    if (!this.uniforms?.lightColor) return;
    if (value instanceof THREE.Color) {
      this.uniforms.lightColor.value.copy(value);
    } else {
      this.uniforms.lightColor.value.set(value);
    }
  }

  /**
   * Get/set opacity
   */
  get opacity(): number {
    return this.uniforms?.opacity?.value || 1.0;
  }

  set opacity(value: number) {
    if (this.uniforms?.opacity) this.uniforms.opacity.value = value;
  }

  /**
   * Get/set noisiness (atmospheric scattering)
   */
  get noisiness(): number {
    return this.uniforms?.noisiness?.value || 0.0;
  }

  set noisiness(value: number) {
    if (this.uniforms?.noisiness) this.uniforms.noisiness.value = value;
  }

  /**
   * Get/set attenuation (distance falloff)
   */
  get attenuation(): number {
    return this.uniforms?.attenuation?.value || 1.0;
  }

  set attenuation(value: number) {
    if (this.uniforms?.attenuation) this.uniforms.attenuation.value = value;
  }
}
