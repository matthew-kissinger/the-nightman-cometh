// Fog Fragment Shader
// TODO: Implement custom volumetric fog with distance-based density

uniform vec3 fogColor;
uniform float fogDensity;
uniform vec3 cameraPosition;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
  // Calculate distance from camera
  float distance = length(vViewPosition);

  // Exponential fog falloff
  float fogFactor = 1.0 - exp(-fogDensity * distance);
  fogFactor = clamp(fogFactor, 0.0, 1.0);

  // TODO: Add height-based fog
  // TODO: Add noise/turbulence for volumetric effect
  // TODO: Integrate with multiple fog zones

  gl_FragColor = vec4(fogColor, fogFactor);
}
