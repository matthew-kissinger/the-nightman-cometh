import * as THREE from 'three';
import { PropLoader, PropAsset } from './PropLoader';
import { PropPlacementSystem } from './Systems/PropPlacementSystem';
import { PhysicsWorld } from './PhysicsWorld';
import { FoliagePlacementCoordinator } from './Systems/FoliagePlacementCoordinator';

interface PropInstancedMeshGroup {
  group: THREE.Group;
  meshes: THREE.InstancedMesh[];
  count: number;
  propType: string;
  asset: PropAsset;
}

/**
 * Manages environmental props (rocks, logs, foliage)
 * Uses InstancedMesh for efficient rendering, similar to TreeManager
 */
export class PropManager {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;

  private propLoader: PropLoader;
  private placementSystem: PropPlacementSystem;
  private instancedMeshes: Map<string, PropInstancedMeshGroup> = new Map();

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, coordinator?: FoliagePlacementCoordinator) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.propLoader = new PropLoader();
    this.placementSystem = new PropPlacementSystem(coordinator);
  }

  /**
   * Initialize prop system: load models, generate placement, create instances
   */
  async initialize(): Promise<void> {
    console.log('🪨 Initializing environmental props...');

    // Load rock variations
    await this.propLoader.loadRocks();

    // Get all loaded prop types
    const allProps = this.propLoader.getAllProps();
    const propTypes = Array.from(allProps.keys());

    // Generate prop positions
    this.placementSystem.generatePropPositions(propTypes);

    // Create instanced meshes
    this.createInstancedMeshes();

    // Add physics colliders
    this.addPhysicsColliders();

    console.log('✅ Environmental props initialized');
    console.log(`   Total props: ${this.placementSystem.getTotalPropCount()}`);
    console.log(`   Instanced mesh groups: ${this.instancedMeshes.size}`);
  }

  /**
   * Create InstancedMesh for each prop type
   */
  private createInstancedMeshes(): void {
    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, propType) => {
      const asset = this.propLoader.getProp(propType);
      if (!asset || instances.length === 0) return;

      console.log(`Creating InstancedMesh for ${propType}: ${instances.length} instances`);

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

      const propGroup = new THREE.Group();
      propGroup.name = `props:${propType}`;
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

        propGroup.add(instancedMesh);
        createdMeshes.push(instancedMesh);
      });

      this.scene.add(propGroup);
      this.instancedMeshes.set(propType, {
        group: propGroup,
        meshes: createdMeshes,
        count: instances.length,
        propType,
        asset
      });
    });
  }

  /**
   * Add physics colliders for all props
   * Uses cylinder colliders for rocks (simple and efficient)
   */
  private addPhysicsColliders(): void {
    if (!this.physicsWorld || !this.physicsWorld.isReady()) {
      console.warn('Physics world not ready, skipping prop colliders');
      return;
    }

    console.log('Adding physics colliders for props...');
    let colliderCount = 0;

    const allInstances = this.placementSystem.getAllInstances();

    allInstances.forEach((instances, propType) => {
      const asset = this.propLoader.getProp(propType);
      if (!asset) return;

      instances.forEach(instance => {
        // Create cylinder collider for prop
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

    console.log(`✅ Added ${colliderCount} prop physics colliders`);
  }

  /**
   * Get all instanced mesh groups (for debugging)
   */
  getInstancedMeshes(): Map<string, PropInstancedMeshGroup> {
    return this.instancedMeshes;
  }

  /**
   * Dispose of all prop resources
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
