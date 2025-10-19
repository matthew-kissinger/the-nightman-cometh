import { addComponent, addEntity, defineQuery, IWorld } from 'bitecs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Door, Transform } from '../Components';
import { InputManager } from '../../utils/InputManager';
import { PlayerController } from '../PlayerController';
import { PhysicsWorld } from '../PhysicsWorld';
import { CameraController } from '../CameraController';
import { world as ecsWorld } from '../ECS';

interface DoorSpawnConfig {
  openAngle: number;
  openDirection: number;
  openSpeed: number;
  interactLabel: string;
  locked: boolean;
}

interface DoorRuntime {
  eid: number;
  mesh: THREE.Mesh;
  closedQuat: THREE.Quaternion;
  openQuat: THREE.Quaternion;
  currentQuat: THREE.Quaternion;
  hingeWorld: THREE.Vector3;
  interactionPoint: THREE.Vector3;
  interactionOffsetLocal: THREE.Vector3;
  normalLocal: THREE.Vector3;
  worldNormal: THREE.Vector3;
  colliderOffset: THREE.Vector3;
  halfExtents: { x: number; y: number; z: number };
  rigidBody: RAPIER.RigidBody | null;
  collider: RAPIER.Collider | null;
  target: number;
  speed: number;
  label: string;
}

const DEFAULT_DOOR_CONFIG: DoorSpawnConfig = {
  openAngle: THREE.MathUtils.degToRad(95),
  openDirection: 1,
  openSpeed: 2.2,
  interactLabel: 'Door',
  locked: false
};

const doorQuery = defineQuery([Door, Transform]);
const doorInstances: DoorRuntime[] = [];
const pendingDoorRegistrations: Array<{ mesh: THREE.Mesh; overrides: Partial<DoorSpawnConfig> }> = [];

let dependencies:
  | {
      inputManager: InputManager;
      camera: THREE.Camera;
      playerController: PlayerController;
      physicsWorld: PhysicsWorld;
      cameraController: CameraController;
      promptElement: HTMLElement | null;
    }
  | null = null;

const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempVec3 = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);

export function initDoorSystem(deps: {
  inputManager: InputManager;
  camera: THREE.Camera;
  playerController: PlayerController;
  physicsWorld: PhysicsWorld;
  cameraController: CameraController;
  promptElement: HTMLElement | null;
}): void {
  dependencies = deps;
  if (pendingDoorRegistrations.length > 0) {
    const pending = [...pendingDoorRegistrations];
    pendingDoorRegistrations.length = 0;
    for (const entry of pending) {
      registerDoorMesh(entry.mesh, entry.overrides);
    }
  }
}

export function registerDoorMesh(
  mesh: THREE.Mesh,
  overrides: Partial<DoorSpawnConfig> = {}
): void {
  if (mesh.userData.__doorRegistered) {
    return;
  }

  if (!dependencies) {
    pendingDoorRegistrations.push({ mesh, overrides });
    return;
  }

  const config: DoorSpawnConfig = { ...DEFAULT_DOOR_CONFIG, ...overrides };
  const { physicsWorld } = dependencies;

  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox;
  if (!boundingBox) {
    console.warn(`Door mesh ${mesh.name} missing bounding box`);
    return;
  }

  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const center = new THREE.Vector3();
  boundingBox.getCenter(center);

  const closedQuat = mesh.quaternion.clone();
  const rotationDelta = new THREE.Quaternion().setFromAxisAngle(
    upAxis,
    config.openAngle * config.openDirection
  );
  const openQuat = closedQuat.clone().multiply(rotationDelta);

  const eid = addEntity(ecsWorld);
  addComponent(ecsWorld, Door, eid);
  addComponent(ecsWorld, Transform, eid);

  Door.isOpen[eid] = 0;
  Door.openProgress[eid] = 0;
  Door.isLocked[eid] = config.locked ? 1 : 0;

  mesh.updateMatrixWorld(true);
  const hingeWorld = new THREE.Vector3();
  mesh.getWorldPosition(hingeWorld);

  Transform.x[eid] = hingeWorld.x;
  Transform.y[eid] = hingeWorld.y;
  Transform.z[eid] = hingeWorld.z;
  Transform.rotX[eid] = mesh.rotation.x;
  Transform.rotY[eid] = mesh.rotation.y;
  Transform.rotZ[eid] = mesh.rotation.z;
  Transform.scaleX[eid] = mesh.scale.x;
  Transform.scaleY[eid] = mesh.scale.y;
  Transform.scaleZ[eid] = mesh.scale.z;

  const interactionOffsetLocal = center.clone();
  interactionOffsetLocal.z += size.z * 0.2;

  const runtime: DoorRuntime = {
    eid,
    mesh,
    closedQuat,
    openQuat,
    currentQuat: mesh.quaternion.clone(),
    hingeWorld,
    interactionPoint: new THREE.Vector3(),
    interactionOffsetLocal,
    normalLocal: new THREE.Vector3(0, 0, 1),
    worldNormal: new THREE.Vector3(),
    colliderOffset: center,
    halfExtents: {
      x: size.x * 0.5,
      y: size.y * 0.5,
      z: Math.max(size.z * 0.5, 0.05)
    },
    rigidBody: null,
    collider: null,
    target: 0,
    speed: config.openSpeed,
    label: config.interactLabel
  };

  if (physicsWorld.isReady()) {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      hingeWorld.x,
      hingeWorld.y,
      hingeWorld.z
    );
    const body = physicsWorld.world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      runtime.halfExtents.x,
      runtime.halfExtents.y,
      runtime.halfExtents.z
    )
      .setTranslation(runtime.colliderOffset.x, runtime.colliderOffset.y, runtime.colliderOffset.z)
      .setFriction(0.4)
      .setRestitution(0);

    const collider = physicsWorld.world.createCollider(colliderDesc, body);

    runtime.rigidBody = body;
    runtime.collider = collider;
    body.setNextKinematicTranslation({
      x: hingeWorld.x,
      y: hingeWorld.y,
      z: hingeWorld.z
    });
    body.setNextKinematicRotation({
      x: runtime.currentQuat.x,
      y: runtime.currentQuat.y,
      z: runtime.currentQuat.z,
      w: runtime.currentQuat.w
    });
  } else {
    console.warn('Physics world not ready, skipping door collider creation');
  }

  mesh.userData.__doorRegistered = true;
  doorInstances.push(runtime);
}

export function DoorSystem(world: IWorld, deltaTime: number): void {
  if (!dependencies) {
    return;
  }

  const { inputManager, camera, playerController, physicsWorld, cameraController } = dependencies;

  const entities = doorQuery(world);
  if (entities.length === 0) {
    hidePrompt();
    return;
  }

  if (!cameraController.locked) {
    inputManager.consumeInteractPress();
    hidePrompt();
    return;
  }

  const interactPressed = inputManager.consumeInteractPress();
  const playerPos = playerController.getCameraPosition();
  const forward = camera.getWorldDirection(tempVec).setY(0);
  if (forward.lengthSq() > 0) {
    forward.normalize();
  }

  const maxDistance = 1.7;
  const maxDistanceSq = maxDistance * maxDistance;
  const facingThreshold = Math.cos(THREE.MathUtils.degToRad(60));

  let bestDoor: DoorRuntime | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const door of doorInstances) {
    door.mesh.updateMatrixWorld();
    door.mesh.getWorldPosition(door.hingeWorld);

    door.interactionPoint.copy(door.interactionOffsetLocal);
    door.mesh.localToWorld(door.interactionPoint);

    door.worldNormal.copy(door.normalLocal);
    door.mesh.localToWorld(door.worldNormal);
    door.worldNormal.sub(door.hingeWorld).normalize();

    const toDoor = tempVec2.copy(door.interactionPoint).sub(playerPos);
    const horizontal = tempVec3.set(toDoor.x, 0, toDoor.z);
    const distanceSq = horizontal.lengthSq();

    if (distanceSq > maxDistanceSq) {
      continue;
    }

    if (distanceSq === 0) {
      continue;
    }

    horizontal.normalize();
    const facingScore = forward.dot(horizontal);
    if (facingScore < facingThreshold) {
      continue;
    }

    const score = distanceSq - facingScore * 0.3;
    if (score < bestScore) {
      bestScore = score;
      bestDoor = door;
    }
  }

  if (!bestDoor) {
    hidePrompt();
  } else {
    const doorCompLocked = Door.isLocked[bestDoor.eid] === 1;
    const doorState = Door.openProgress[bestDoor.eid] ?? 0;
    const action = doorCompLocked
      ? 'Locked'
      : doorState > 0.5
      ? 'Close'
      : 'Open';
    showPrompt(`${action} ${bestDoor.label}`);

    if (interactPressed && !doorCompLocked) {
      const shouldOpen = doorState < 0.5;
      bestDoor.target = shouldOpen ? 1 : 0;
    } else if (interactPressed && doorCompLocked) {
      console.log(`🔐 ${bestDoor.label} is locked`);
    }
  }

  for (const door of doorInstances) {
    const current = Door.openProgress[door.eid] ?? 0;
    let next = current;

    if (door.target > current) {
      next = Math.min(door.target, current + door.speed * deltaTime);
    } else if (door.target < current) {
      next = Math.max(door.target, current - door.speed * deltaTime);
    }

    Door.openProgress[door.eid] = next;
    Door.isOpen[door.eid] = next > 0.95 ? 1 : 0;

    tempQuat.copy(door.closedQuat);
    tempQuat.slerp(door.openQuat, next);
    door.currentQuat.copy(tempQuat);
    door.mesh.quaternion.copy(door.currentQuat);
    door.mesh.updateMatrixWorld();

    const hingeWorld = door.hingeWorld;
    Transform.x[door.eid] = hingeWorld.x;
    Transform.y[door.eid] = hingeWorld.y;
    Transform.z[door.eid] = hingeWorld.z;

    const euler = door.mesh.rotation;
    Transform.rotX[door.eid] = euler.x;
    Transform.rotY[door.eid] = euler.y;
    Transform.rotZ[door.eid] = euler.z;

    if (door.rigidBody && physicsWorld.world) {
      door.rigidBody.setNextKinematicTranslation({ x: hingeWorld.x, y: hingeWorld.y, z: hingeWorld.z });
      door.rigidBody.setNextKinematicRotation({
        x: door.currentQuat.x,
        y: door.currentQuat.y,
        z: door.currentQuat.z,
        w: door.currentQuat.w
      });
    }
  }
}

function showPrompt(text: string): void {
  if (!dependencies || !dependencies.promptElement) {
    return;
  }
  const { promptElement } = dependencies;
  if (promptElement.textContent !== text) {
    promptElement.textContent = text;
  }
  if (!promptElement.classList.contains('visible')) {
    promptElement.classList.add('visible');
  }
}

function hidePrompt(): void {
  if (!dependencies || !dependencies.promptElement) {
    return;
  }
  const { promptElement } = dependencies;
  if (promptElement.classList.contains('visible')) {
    promptElement.classList.remove('visible');
  }
  promptElement.textContent = '';
}
