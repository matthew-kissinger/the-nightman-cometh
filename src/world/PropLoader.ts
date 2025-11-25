import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetPath } from '../utils/assetPath';

export interface PropMeshAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
}

export interface PropAsset {
  name: string;
  meshes: PropMeshAsset[];
  colliderRadius: number;
  colliderHeight: number;
}

/**
 * Loads environmental props (rocks, logs, etc.) from GLB files
 * Similar to TreeLoader but for static props
 */
export class PropLoader {
  private loader: GLTFLoader;
  private loadedProps: Map<string, PropAsset> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load rock variations from the multi-rock GLB file
   */
  async loadRocks(): Promise<Map<string, PropAsset>> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        assetPath('assets/models/props/rocks.glb'),
        (gltf) => {
          const scene = gltf.scene;
          const rockVariations: Map<string, PropAsset> = new Map();

          scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            // Skip collider/physics helper meshes
            const name = child.name.toLowerCase();
            if (name.includes('collider') || name.includes('collision') || name.includes('physics')) {
              return;
            }

            // Determine rock size category from name
            let category = 'medium';
            let colliderRadius = 0.4;
            let colliderHeight = 0.6;

            if (name.includes('small')) {
              category = 'small';
              colliderRadius = 0.25;
              colliderHeight = 0.4;
            } else if (name.includes('big') || name.includes('large')) {
              category = 'large';
              colliderRadius = 0.6;
              colliderHeight = 0.8;
            }

            // Update matrix and clone geometry
            child.updateMatrix();
            const geometry = child.geometry.clone();
            geometry.applyMatrix4(child.matrix);

            // Apply PSX-style texture settings
            const processMaterial = (mat: THREE.Material) => {
              if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
                mat.map.magFilter = THREE.NearestFilter;
                mat.map.minFilter = THREE.NearestFilter;
                mat.map.anisotropy = 1;
              }
            };

            const meshAsset: PropMeshAsset = {
              geometry,
              material: child.material as THREE.Material,
              name: child.name
            };

            if (Array.isArray(child.material)) {
              child.material.forEach(processMaterial);
            } else {
              processMaterial(child.material);
            }

            // Create unique prop asset for this rock variation
            const propName = `rock_${category}_${child.name}`;
            const asset: PropAsset = {
              name: propName,
              meshes: [meshAsset],
              colliderRadius,
              colliderHeight
            };

            rockVariations.set(propName, asset);
            this.loadedProps.set(propName, asset);
          });

          console.log(`✅ Loaded ${rockVariations.size} rock variations`);
          resolve(rockVariations);
        },
        undefined,
        (error) => {
          console.error('Failed to load rocks:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Get a loaded prop asset by name
   */
  getProp(name: string): PropAsset | undefined {
    return this.loadedProps.get(name);
  }

  /**
   * Get all loaded props
   */
  getAllProps(): Map<string, PropAsset> {
    return this.loadedProps;
  }
}
