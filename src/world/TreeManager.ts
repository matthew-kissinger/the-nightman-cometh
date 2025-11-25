import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { TreeLoader, TreeAsset } from './TreeLoader';
import { TreePlacementSystem } from './Systems/TreePlacementSystem';
import { CollisionWorld } from './CollisionWorld';
import { WindSystem } from './Systems/WindSystem';
import { FoliagePlacementCoordinator } from './Systems/FoliagePlacementCoordinator';

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

export interface TreeInstanceEntry {
  meshes: THREE.InstancedMesh[];
  index: number;
  position: THREE.Vector3;
  treeType: string;
  colliderId?: number;
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
  private collisionWorld: CollisionWorld;

  private treeLoader: TreeLoader;
  private placementSystem: TreePlacementSystem;
  private instancedMeshes: Map<string, TreeInstancedMeshGroup> = new Map();
  private windSystem: WindSystem;
  private instancedEntries: TreeInstanceEntry[] = [];
  private instancedEntryMap: Map<string, TreeInstanceEntry> = new Map();

  constructor(scene: THREE.Scene, _camera: THREE.Camera, collisionWorld: CollisionWorld, coordinator?: FoliagePlacementCoordinator) {
    this.scene = scene;
    this.collisionWorld = collisionWorld;

    this.treeLoader = new TreeLoader();
    this.placementSystem = new TreePlacementSystem(coordinator);
    this.windSystem = new WindSystem();
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

    this.instancedEntries.length = 0;
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

      // Track instances for interaction (use first mesh in the set for position reference)
      instances.forEach((instance, index) => {
        const entry: TreeInstanceEntry = {
          meshes: createdMeshes,
          index,
          position: instance.position.clone(),
          treeType
        };
        this.instancedEntries.push(entry);
        this.instancedEntryMap.set(`${treeType}:${index}`, entry);
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
   * Register collision obstacles for all trees (cylinders approximated as circles on XZ)
   */
  private addPhysicsColliders(): void {
    if (!this.collisionWorld) {
      console.warn('Collision world not ready, skipping tree colliders');
      return;
    }

    console.log('Adding collision obstacles for trees...');
    let colliderCount = 0;

    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, treeType) => {
      const asset = this.treeLoader.getTree(treeType);
      if (!asset) return;

      instances.forEach((instance, index) => {
        const colliderId = this.collisionWorld.addCircle(
          new THREE.Vector3(instance.position.x, asset.colliderHeight * 0.5, instance.position.z),
          asset.colliderRadius,
          asset.colliderHeight
        );
        const entry = this.instancedEntryMap.get(`${treeType}:${index}`);
        if (entry) {
          entry.colliderId = colliderId;
        }
        colliderCount++;
      });
    });

    console.log(`✅ Added ${colliderCount} tree collision obstacles`);
  }

  /**
   * Update tree rendering (called per frame)
   * Handles wind animation and distance-based culling
   */
  update(_camera: THREE.Camera, deltaTime: number): void {
    // Update wind simulation
    this.windSystem.update(deltaTime);

    // Apply wind to all tree instances
    const allInstances = this.placementSystem.getAllInstances();

    this.instancedMeshes.forEach((meshGroup, treeType) => {
      const instances = allInstances.get(treeType);
      if (!instances) return;

      // Apply wind effect to each mesh in the group
      meshGroup.meshes.forEach(mesh => {
        this.windSystem.applyWindToInstancedMesh(mesh, instances, 0.08);
      });
    });
  }

  /**
   * Get all instanced mesh groups (for debugging/inspection)
   */
  getInstancedMeshes(): Map<string, TreeInstancedMeshGroup> {
    return this.instancedMeshes;
  }

  /**
   * Get flattened list of instanced meshes with their positions (for interactions)
   */
  getInstancedEntries(): TreeInstanceEntry[] {
    return this.instancedEntries;
  }

  /**
   * Get wind system for audio integration
   */
  getWindSystem(): WindSystem {
    return this.windSystem;
  }

  /**
   * Get all tree positions for obstacle avoidance
   */
  public getAllTreePositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances) => {
      instances.forEach(instance => {
        positions.push(new THREE.Vector3(instance.position.x, 0, instance.position.z));
      });
    });

    return positions;
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
