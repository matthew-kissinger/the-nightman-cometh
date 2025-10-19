/**
 * PhysicsWorld - Rapier3D physics initialization and management
 * Handles physics world creation, stepping, and character controller
 */

import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  public world!: RAPIER.World;
  public characterController!: RAPIER.KinematicCharacterController;

  private initialized = false;
  private readonly fixedTimeStep = 1 / 60;
  private readonly maxSubSteps = 5;
  private accumulator = 0;
  private readonly gravity = { x: 0.0, y: -9.81, z: 0.0 };

  /**
   * Initialize Rapier physics world
   * MUST be called before any physics operations
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      console.warn('PhysicsWorld already initialized');
      return;
    }

    await RAPIER.init();

    this.world = new RAPIER.World(this.gravity);
    this.world.timestep = this.fixedTimeStep;

    this.characterController = this.world.createCharacterController(0.05);
    this.characterController.setUp({ x: 0, y: 1, z: 0 });
    this.characterController.setApplyImpulsesToDynamicBodies(false);
    this.characterController.setMaxSlopeClimbAngle(50 * (Math.PI / 180));
    this.characterController.setMinSlopeSlideAngle(30 * (Math.PI / 180));
    this.characterController.enableSnapToGround(0.25);
    this.characterController.enableAutostep(0.35, 0.2, true);

    this.initialized = true;
    console.log('✅ Rapier physics world initialized');
    console.log(`   Gravity: ${this.gravity.x}, ${this.gravity.y}, ${this.gravity.z}`);
    console.log('   Character controller configured (snap-to-ground + autostep)');
  }

  /**
   * Step the physics simulation forward using a semi-fixed timestep
   */
  public step(deltaTime: number): void {
    if (!this.initialized) {
      console.warn('PhysicsWorld not initialized, call init() first');
      return;
    }

    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    this.accumulator = Math.min(
      this.accumulator + deltaTime,
      this.fixedTimeStep * this.maxSubSteps
    );

    let stepsTaken = 0;
    while (this.accumulator >= this.fixedTimeStep && stepsTaken < this.maxSubSteps) {
      this.world.step();
      this.accumulator -= this.fixedTimeStep;
      stepsTaken += 1;
    }
  }

  /**
   * Create static ground plane collider
   */
  public createGroundPlane(width: number, depth: number, yPosition = 0): RAPIER.Collider {
    const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, yPosition, 0));
    const groundDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.1, depth / 2)
      .setFriction(0.8)
      .setRestitution(0);

    return this.world.createCollider(groundDesc, groundBody);
  }

  /**
   * Create static trimesh collider from Three.js geometry
   */
  public createTrimeshCollider(
    vertices: Float32Array,
    indices: Uint32Array,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number; w: number }
  ): RAPIER.Collider {
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setTranslation(position.x, position.y, position.z)
      .setRotation(rotation)
      .setFriction(0.6)
      .setRestitution(0);

    return this.world.createCollider(colliderDesc);
  }

  /**
   * Clean up physics world
   */
  public dispose(): void {
    if (this.characterController) {
      this.characterController.free();
    }
    if (this.world) {
      this.world.free();
    }
    this.initialized = false;
  }

  /**
   * Check if physics is ready to use
   */
  public isReady(): boolean {
    return this.initialized;
  }

  /**
   * Expose gravity vector so gameplay systems can stay in sync
   */
  public getGravity(): Readonly<{ x: number; y: number; z: number }> {
    return this.gravity;
  }
}
