/**
 * PlayerMovementSystem - ECS system for player movement and physics
 * Integrates InputManager, PlayerController, and CameraController
 */

import { defineQuery, IWorld, addComponent, addEntity } from 'bitecs';
import { Player, Transform, Velocity } from '../Components';
import { InputManager } from '../../utils/InputManager';
import { PlayerController } from '../PlayerController';
import { CameraController } from '../CameraController';

// Query for player entities
const playerQuery = defineQuery([Player, Transform, Velocity]);

// Singleton references (set by SceneManager)
let inputManager: InputManager | null = null;
let playerController: PlayerController | null = null;
let cameraController: CameraController | null = null;

/**
 * Initialize the player movement system with required managers
 */
export function initPlayerMovementSystem(
  input: InputManager,
  player: PlayerController,
  camera: CameraController
): void {
  inputManager = input;
  playerController = player;
  cameraController = camera;

  console.log('✅ PlayerMovementSystem initialized');
}

/**
 * Create player entity in ECS world
 */
export function createPlayerEntity(world: IWorld): number {
  const eid = addEntity(world);

  addComponent(world, Player, eid);
  addComponent(world, Transform, eid);
  addComponent(world, Velocity, eid);

  // Initialize player component values
  Player.stamina[eid] = 100;
  Player.health[eid] = 100;
  Player.hasFlashlight[eid] = 1;

  console.log(`✅ Player entity created (eid: ${eid})`);
  return eid;
}

export function PlayerMovementPrePhysicsSystem(world: IWorld, deltaTime: number): void {
  if (!inputManager || !playerController || !cameraController) {
    return; // Not initialized yet
  }

  if (!cameraController.locked) {
    return;
  }

  const entities = playerQuery(world);
  if (entities.length === 0) {
    return;
  }

  playerController.updatePrePhysics(deltaTime, inputManager.state, cameraController.camera);
}

export function PlayerMovementPostPhysicsSystem(world: IWorld, deltaTime: number): void {
  if (!inputManager || !playerController || !cameraController) {
    return;
  }

  if (!cameraController.locked) {
    return;
  }

  const entities = playerQuery(world);
  if (entities.length === 0) {
    return;
  }
  const eid = entities[0]!;

  playerController.postPhysics(deltaTime);

  const cameraPos = playerController.getCameraPosition();
  const moveSpeed = playerController.getMoveSpeed();
  const isMoving = moveSpeed > 0.05;

  cameraController.update(cameraPos, deltaTime, isMoving, moveSpeed);

  Transform.x[eid] = playerController.position.x;
  Transform.y[eid] = playerController.position.y;
  Transform.z[eid] = playerController.position.z;

  Velocity.x[eid] = playerController.velocity.x;
  Velocity.y[eid] = playerController.velocity.y;
  Velocity.z[eid] = playerController.velocity.z;

  Player.stamina[eid] = playerController.stamina;
}
