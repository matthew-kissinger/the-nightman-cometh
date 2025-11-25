import * as THREE from 'three';
import { BushLoader, BushAsset } from './BushLoader';
import { BushPlacementSystem } from './Systems/BushPlacementSystem';
import { CollisionWorld } from './CollisionWorld';
import { FoliagePlacementCoordinator } from './Systems/FoliagePlacementCoordinator';

interface BushInstancedMeshGroup {
  group: THREE.Group;
  meshes: THREE.InstancedMesh[];
  count: number;
  bushType: string;
  asset: BushAsset;
}

/**
 * Manages bush rendering and placement
 * Uses InstancedMesh for efficient rendering of billboard bushes
 */
export class BushManager {
  private scene: THREE.Scene;
  private collisionWorld: CollisionWorld;

  private bushLoader: BushLoader;
  private placementSystem: BushPlacementSystem;
  private instancedMeshes: Map<string, BushInstancedMeshGroup> = new Map();

  constructor(scene: THREE.Scene, collisionWorld: CollisionWorld, coordinator?: FoliagePlacementCoordinator) {
    this.scene = scene;
    this.collisionWorld = collisionWorld;

    this.bushLoader = new BushLoader();
    this.placementSystem = new BushPlacementSystem(coordinator);
  }

  /**
   * Initialize bush system: load models, generate placement, create instances
   */
  async initialize(): Promise<void> {
    console.log('🌿 Initializing bushes...');

    // Load bush variations
    await this.bushLoader.loadBushes();

    // Get all loaded bush types
    const allBushes = this.bushLoader.getAllBushes();
    const bushTypes = Array.from(allBushes.keys());

    // Generate bush positions
    this.placementSystem.generateBushPositions(bushTypes);

    // Create instanced meshes
    this.createInstancedMeshes();

    // Add physics colliders
    this.addPhysicsColliders();

    console.log('✅ Bushes initialized');
    console.log(`   Total bushes: ${this.placementSystem.getTotalBushCount()}`);
    console.log(`   Instanced mesh groups: ${this.instancedMeshes.size}`);
  }

  /**
   * Create InstancedMesh for each bush type
   */
  private createInstancedMeshes(): void {
    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, bushType) => {
      const asset = this.bushLoader.getBush(bushType);
      if (!asset || instances.length === 0) return;

      console.log(`Creating InstancedMesh for ${bushType}: ${instances.length} instances`);

      // Precompute instance transforms
      const dummy = new THREE.Object3D();
      const instanceMatrices: THREE.Matrix4[] = [];

      instances.forEach((instance, i) => {
        dummy.position.copy(instance.position);
        dummy.rotation.y = instance.rotation;
        dummy.scale.setScalar(instance.scale);
        dummy.updateMatrix();

        instanceMatrices[i] = dummy.matrix.clone();
      });

      const bushGroup = new THREE.Group();
      bushGroup.name = `bushes:${bushType}`;
      const createdMeshes: THREE.InstancedMesh[] = [];

      // Create instanced mesh for each mesh part in the asset
      asset.meshes.forEach(meshAsset => {
        const instancedMesh = new THREE.InstancedMesh(
          meshAsset.geometry,
          meshAsset.material,
          instances.length
        );

        // Apply all instance transforms
        instanceMatrices.forEach((matrix, index) => {
          instancedMesh.setMatrixAt(index, matrix);
        });
        instancedMesh.instanceMatrix.needsUpdate = true;

        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        instancedMesh.frustumCulled = true;

        bushGroup.add(instancedMesh);
        createdMeshes.push(instancedMesh);
      });

      this.scene.add(bushGroup);
      this.instancedMeshes.set(bushType, {
        group: bushGroup,
        meshes: createdMeshes,
        count: instances.length,
        bushType,
        asset
      });
    });
  }

  /**
   * Add collision obstacles for all bushes
   */
  private addPhysicsColliders(): void {
    if (!this.collisionWorld) {
      console.warn('Collision world not ready, skipping bush colliders');
      return;
    }

    console.log('Adding physics colliders for bushes...');
    let colliderCount = 0;

    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, bushType) => {
      const asset = this.bushLoader.getBush(bushType);
      if (!asset) return;

      instances.forEach(instance => {
        this.collisionWorld.addCircle(
          new THREE.Vector3(instance.position.x, asset.colliderHeight * 0.5, instance.position.z),
          asset.colliderRadius,
          asset.colliderHeight
        );
        colliderCount++;
      });
    });

    console.log(`✅ Added ${colliderCount} bush physics colliders`);
  }

  /**
   * Get all instanced mesh groups (for debugging)
   */
  getInstancedMeshes(): Map<string, BushInstancedMeshGroup> {
    return this.instancedMeshes;
  }

  /**
   * Dispose of all bush resources
   */
  dispose(): void {
    this.instancedMeshes.forEach(group => {
      this.scene.remove(group.group);
      group.meshes.forEach(mesh => {
        mesh.dispose();
      });
    });

    this.instancedMeshes.clear();
  }
}
