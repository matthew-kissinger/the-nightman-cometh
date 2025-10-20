import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface TreeMeshAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface TreeAsset {
  name: string;
  meshes: TreeMeshAsset[];
  scale: number;
  colliderRadius: number;
  colliderHeight: number;
}

export interface TreeConfig {
  file: string;
  size_kb: number;
  species: string;
  height: string;
  detail_level: string;
  recommended_density: string;
  instances_per_zone: {
    near: number;
    mid: number;
    far: number;
  };
  description: string;
  lod_distances: number[];
  physics_collider: {
    type: string;
    radius: number;
    height: number;
  };
}

export class TreeLoader {
  private loader: GLTFLoader;
  private loadedTrees: Map<string, TreeAsset> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load a single tree model
   */
  async loadTree(name: string, path: string, config: TreeConfig): Promise<TreeAsset> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const scene = gltf.scene;

          // Extract renderable meshes from the loaded model
          const meshes: TreeMeshAsset[] = [];

          scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            // Skip any helper meshes used solely for physics/colliders
            const name = child.name.toLowerCase();
            if (name.includes('collider') || name.includes('collision') || name.includes('physics')) {
              return;
            }

            child.updateMatrix(); // ensure local matrix is up to date

            const baseGeometry = child.geometry.clone();
            baseGeometry.applyMatrix4(child.matrix);

            // Apply PSX-style texture settings
            const processMaterial = (mat: THREE.Material) => {
              if (mat instanceof THREE.MeshStandardMaterial && mat.map) {
                mat.map.magFilter = THREE.NearestFilter;
                mat.map.minFilter = THREE.NearestFilter;
                mat.map.anisotropy = 1;
              }
            };

            if (Array.isArray(child.material)) {
              child.material.forEach(processMaterial);
              child.material.forEach(mat => {
                meshes.push({
                  geometry: baseGeometry.clone(),
                  material: mat
                });
              });
            } else {
              processMaterial(child.material);
              meshes.push({
                geometry: baseGeometry,
                material: child.material
              });
            }
          });

          if (meshes.length === 0) {
            reject(new Error(`No renderable meshes found in tree ${name}`));
            return;
          }

          const asset: TreeAsset = {
            name,
            meshes,
            scale: 1.0,
            colliderRadius: config.physics_collider.radius,
            colliderHeight: config.physics_collider.height
          };

          this.loadedTrees.set(name, asset);
          resolve(asset);
        },
        undefined,
        (error) => {
          console.error(`Failed to load tree ${name}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load all tree models from config
   */
  async loadAllTrees(): Promise<Map<string, TreeAsset>> {
    const response = await fetch('/assets/models/trees/trees.json');
    const config = await response.json();

    const treeNames = Object.keys(config.trees);
    const promises = treeNames.map(name => {
      const treeConfig = config.trees[name];
      const path = `/assets/models/trees/${treeConfig.file}`;
      return this.loadTree(name, path, treeConfig);
    });

    await Promise.all(promises);
    console.log(`✅ Loaded ${this.loadedTrees.size} tree types`);

    return this.loadedTrees;
  }

  /**
   * Get a loaded tree asset
   */
  getTree(name: string): TreeAsset | undefined {
    return this.loadedTrees.get(name);
  }
}
