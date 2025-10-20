import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { TreeLoader, TreeAsset } from './TreeLoader';
import { TreePlacementSystem } from './Systems/TreePlacementSystem';
import { PhysicsWorld } from './PhysicsWorld';

// Extend Three.js BufferGeometry prototype with BVH methods
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

interface TreeInstancedMeshGroup {
  group: THREE.Group;
  meshes: THREE.InstancedMesh[];
  count: number;
  treeType: string;
  asset: TreeAsset;
}

/**
 * Manages large-scale tree rendering using InstancedMesh for optimal performance
 *
 * Features:
 * - Native Three.js InstancedMesh (one draw call per tree type)
 * - BVH acceleration via three-mesh-bvh (already in dependencies)
 * - Frustum culling (built-in to Three.js)
 * - Fog-based distance culling
 * - Physics collider generation for Rapier
 */
export class TreeManager {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;

  private treeLoader: TreeLoader;
  private placementSystem: TreePlacementSystem;
  private instancedMeshes: Map<string, TreeInstancedMeshGroup> = new Map();

  constructor(scene: THREE.Scene, _camera: THREE.Camera, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.treeLoader = new TreeLoader();
    this.placementSystem = new TreePlacementSystem();
  }

  /**
   * Initialize tree system: load models, generate placement, create instances
   */
  async initialize(): Promise<void> {
    console.log('🌲 Initializing tree system...');

    // Load all tree models
    await this.treeLoader.loadAllTrees();

    // Generate tree positions (with cabin/path exclusion)
    this.placementSystem.generateTreePositions();

    // Create instanced meshes for each tree type
    this.createInstancedMeshes();

    // Add physics colliders
    this.addPhysicsColliders();

    console.log('✅ Tree system initialized');
    console.log(`   Total trees: ${this.placementSystem.getTotalTreeCount()}`);
    console.log(`   Instanced mesh groups: ${this.instancedMeshes.size}`);
  }

  /**
   * Create InstancedMesh for each tree type
   */
  private createInstancedMeshes(): void {
    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, treeType) => {
      const asset = this.treeLoader.getTree(treeType);
      if (!asset || instances.length === 0) return;

      console.log(`Creating InstancedMesh for ${treeType}: ${instances.length} instances`);

      // Precompute instance transforms so each mesh part reuses them
      const dummy = new THREE.Object3D();
      const instanceMatrices: THREE.Matrix4[] = [];

      instances.forEach((instance, i) => {
        dummy.position.copy(instance.position);
        dummy.rotation.y = instance.rotation;
        dummy.scale.setScalar(instance.scale);
        dummy.updateMatrix();

        instanceMatrices[i] = dummy.matrix.clone();
      });

      const treeGroup = new THREE.Group();
      treeGroup.name = `trees:${treeType}`;
      const createdMeshes: THREE.InstancedMesh[] = [];

      asset.meshes.forEach(meshAsset => {
        const instancedMesh = new THREE.InstancedMesh(
          meshAsset.geometry,
          meshAsset.material,
          instances.length
        );

        instanceMatrices.forEach((matrix, index) => {
          instancedMesh.setMatrixAt(index, matrix);
        });
        instancedMesh.instanceMatrix.needsUpdate = true;

        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        instancedMesh.frustumCulled = true;

        // Compute BVH for the base geometry (accelerates raycasting)
        const geometry = meshAsset.geometry as THREE.BufferGeometry & {
          computeBoundsTree?: () => void;
        };
        if (geometry.computeBoundsTree) {
          geometry.computeBoundsTree();
        }

        treeGroup.add(instancedMesh);
        createdMeshes.push(instancedMesh);
      });

      this.scene.add(treeGroup);
      this.instancedMeshes.set(treeType, {
        group: treeGroup,
        meshes: createdMeshes,
        count: instances.length,
        treeType,
        asset
      });
    });
  }

  /**
   * Add physics colliders for all trees
   * Uses cylinder colliders for performance (trimesh would be too expensive for 300+ trees)
   */
  private addPhysicsColliders(): void {
    if (!this.physicsWorld || !this.physicsWorld.isReady()) {
      console.warn('Physics world not ready, skipping tree colliders');
      return;
    }

    console.log('Adding physics colliders for trees...');
    let colliderCount = 0;

    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, treeType) => {
      const asset = this.treeLoader.getTree(treeType);
      if (!asset) return;

      instances.forEach(instance => {
        // Create cylinder collider for tree trunk
        this.physicsWorld.createCylinderCollider(
          asset.colliderRadius,
          asset.colliderHeight,
          {
            x: instance.position.x,
            y: asset.colliderHeight / 2, // Center at half height
            z: instance.position.z
          },
          { x: 0, y: 0, z: 0, w: 1 }
        );

        colliderCount++;
      });
    });

    console.log(`✅ Added ${colliderCount} tree physics colliders`);
  }

  /**
   * Update tree rendering (called per frame)
   * Handles distance-based culling beyond fog
   */
  update(_camera: THREE.Camera): void {
    // Built-in frustum culling handles most of the work
    // Three.js automatically culls objects outside the frustum
    // Fog handles visual fade-out, so no additional culling needed
  }

  /**
   * Get all instanced mesh groups (for debugging/inspection)
   */
  getInstancedMeshes(): Map<string, TreeInstancedMeshGroup> {
    return this.instancedMeshes;
  }

  /**
   * Dispose of all tree resources
   */
  dispose(): void {
    this.instancedMeshes.forEach(group => {
      this.scene.remove(group.group);
      group.meshes.forEach(mesh => {
        mesh.dispose();
        const geometry = mesh.geometry as THREE.BufferGeometry & {
          disposeBoundsTree?: () => void;
        };
        if (geometry.disposeBoundsTree) {
          geometry.disposeBoundsTree();
        }
      });
    });

    this.instancedMeshes.clear();
  }
}
