import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader, AudioLoader } from 'three';

// Singleton loaders
export const gltfLoader = new GLTFLoader();
export const textureLoader = new TextureLoader();
export const audioLoader = new AudioLoader();

/**
 * Load a GLTF model with progress tracking
 */
export async function loadGLTF(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => resolve(gltf),
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading ${path}: ${percent.toFixed(0)}%`);
      },
      (error) => reject(error)
    );
  });
}

/**
 * Load a texture
 */
export async function loadTexture(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error)
    );
  });
}

/**
 * Load an audio file
 */
export async function loadAudio(path: string): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    audioLoader.load(
      path,
      (buffer) => resolve(buffer),
      undefined,
      (error) => reject(error)
    );
  });
}
