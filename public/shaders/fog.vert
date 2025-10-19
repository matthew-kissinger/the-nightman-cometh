// Fog Vertex Shader
// TODO: Implement custom volumetric fog rendering

varying vec3 vWorldPosition;
varying vec3 vViewPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  vec4 viewPosition = viewMatrix * worldPosition;
  vViewPosition = viewPosition.xyz;

  gl_Position = projectionMatrix * viewPosition;
}
