import './index.css';
import * as THREE from 'three';
import { SceneManager } from './world/SceneManager';

// Initialize WebGL renderer
const renderer = new THREE.WebGLRenderer({
  antialias: false, // PSX-style - no antialiasing
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // PSX-style - low resolution
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;

const appElement = document.querySelector<HTMLDivElement>('#app');
if (appElement) {
  appElement.appendChild(renderer.domElement);
}

// Initialize scene manager
const sceneManager = new SceneManager(renderer);

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  sceneManager.onResize(width, height);
});

// Render loop
let previousTime = performance.now();
renderer.setAnimationLoop((time) => {
  const deltaSeconds = Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;

  sceneManager.update(deltaSeconds);
  sceneManager.render();
});

// Log success message
console.log('🕯 the-nightman-cometh scaffold ready');
