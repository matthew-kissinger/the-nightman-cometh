import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetPath } from '../utils/assetPath';

export interface BushMeshAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
}

export interface BushAsset {
  name: string;
  meshes: BushMeshAsset[];
  colliderRadius: number;
  colliderHeight: number;
}

/**
 * Loads bush variations from individual GLB files
 * Bushes use billboard/crossed-plane geometry with MASK alpha mode
 */
export class BushLoader {
  private loader: GLTFLoader;
  private loadedBushes: Map<string, BushAsset> = new Map();

  // Bush files to load (bush02, bush04, bush07, bush08)
  private bushFiles = ['bush02', 'bush04', 'bush07', 'bush08'];

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load all bush variations from individual GLB files
   */
  async loadBushes(): Promise<Map<string, BushAsset>> {
    const loadPromises = this.bushFiles.map(bushName => this.loadBush(bushName));

    try {
      await Promise.all(loadPromises);
      console.log(`✅ Loaded ${this.loadedBushes.size} bush variations`);
      return this.loadedBushes;
    } catch (error) {
      console.error('Failed to load bushes:', error);
      throw error;
    }
  }

  /**
   * Load a single bush GLB file
   */
  private async loadBush(bushName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        assetPath(`assets/models/bushes/${bushName}.glb`),
        (gltf) => {
          const scene = gltf.scene;
          const meshes: BushMeshAsset[] = [];

          scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            // Update matrix and clone geometry
            child.updateMatrix();
            const geometry = child.geometry.clone();
            geometry.applyMatrix4(child.matrix);

            // Apply PSX-style texture settings
            const processMaterial = (mat: THREE.Material) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                if (mat.map) {
                  mat.map.magFilter = THREE.NearestFilter;
                  mat.map.minFilter = THREE.NearestFilter;
                  mat.map.anisotropy = 1;
                }
                // Ensure alpha mode is set correctly for billboards
                mat.transparent = true;
                mat.alphaTest = 0.5; // MASK mode threshold
                mat.side = THREE.DoubleSide; // Render both sides

                // Reduce reflectivity for more matte foliage appearance
                mat.roughness = 1.0; // Fully rough (no specular highlights)
                mat.metalness = 0.0; // Not metallic at all
                mat.envMapIntensity = 0.0; // No environment reflections
              }
            };

            const meshAsset: BushMeshAsset = {
              geometry,
              material: child.material as THREE.Material,
              name: child.name
            };

            if (Array.isArray(child.material)) {
              child.material.forEach(processMaterial);
            } else {
              processMaterial(child.material);
            }

            meshes.push(meshAsset);
          });

          // Bush collision: cylinder approximation
          // Bushes are ~1.5m tall, ~1m radius
          const asset: BushAsset = {
            name: bushName,
            meshes,
            colliderRadius: 0.5,
            colliderHeight: 1.5
          };

          this.loadedBushes.set(bushName, asset);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Failed to load ${bushName}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Get a loaded bush asset by name
   */
  getBush(name: string): BushAsset | undefined {
    return this.loadedBushes.get(name);
  }

  /**
   * Get all loaded bushes
   */
  getAllBushes(): Map<string, BushAsset> {
    return this.loadedBushes;
  }
}
