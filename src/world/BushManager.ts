import * as THREE from 'three';
import { BushLoader, BushAsset } from './BushLoader';
import { BushPlacementSystem } from './Systems/BushPlacementSystem';
import { PhysicsWorld } from './PhysicsWorld';

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
  private physicsWorld: PhysicsWorld;

  private bushLoader: BushLoader;
  private placementSystem: BushPlacementSystem;
  private instancedMeshes: Map<string, BushInstancedMeshGroup> = new Map();

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.bushLoader = new BushLoader();
    this.placementSystem = new BushPlacementSystem();
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
   * Add physics colliders for all bushes
   * Uses cylinder colliders (simple and efficient for bushes)
   */
  private addPhysicsColliders(): void {
    if (!this.physicsWorld || !this.physicsWorld.isReady()) {
      console.warn('Physics world not ready, skipping bush colliders');
      return;
    }

    console.log('Adding physics colliders for bushes...');
    let colliderCount = 0;

    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, bushType) => {
      const asset = this.bushLoader.getBush(bushType);
      if (!asset) return;

      instances.forEach(instance => {
        // Create cylinder collider for bush
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
