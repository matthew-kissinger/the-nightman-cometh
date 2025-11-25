import { addComponent, addEntity, defineQuery, IWorld } from 'bitecs';
import * as THREE from 'three';
import { Door, Transform } from '../Components';
import { InputManager } from '../../utils/InputManager';
import { PlayerController } from '../PlayerController';
import { CameraController } from '../CameraController';
import { world as ecsWorld } from '../ECS';
import { AudioManager } from '../../audio/AudioManager';
import { interactionPrompt } from '../../ui/InteractionPrompt';
import { CollisionWorld } from '../CollisionWorld';

interface DoorSpawnConfig {
  openAngle: number;
  openDirection: number;
  openSpeed: number;
  interactLabel: string;
  locked: boolean;
  hinge: 'min' | 'max';
}

interface DoorRuntime {
  eid: number;
  mesh: THREE.Mesh;
  pivot: THREE.Group;
  closedQuat: THREE.Quaternion;
  openQuat: THREE.Quaternion;
  currentQuat: THREE.Quaternion;
  hingeWorld: THREE.Vector3;
  interactionPoint: THREE.Vector3;
  interactionOffsetLocal: THREE.Vector3;
  target: number;
  speed: number;
  label: string;
  colliderId?: number;
}

const DEFAULT_DOOR_CONFIG: DoorSpawnConfig = {
  openAngle: THREE.MathUtils.degToRad(90),
  openDirection: 1,
  openSpeed: 2.2,
  interactLabel: 'Door',
  locked: false,
  hinge: 'min'
};

const doorQuery = defineQuery([Door, Transform]);
const doorInstances: DoorRuntime[] = [];
const pendingDoorRegistrations: Array<{ mesh: THREE.Mesh; overrides: Partial<DoorSpawnConfig> }> = [];

let dependencies:
  | {
      inputManager: InputManager;
      camera: THREE.Camera;
      playerController: PlayerController;
      cameraController: CameraController;
      promptElement: HTMLElement | null;
      audioManager?: AudioManager;
      collisionWorld?: CollisionWorld;
    }
  | null = null;

// Door audio buffers
let doorOpenBuffer: AudioBuffer | null = null;
let doorCloseBuffer: AudioBuffer | null = null;

const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempVec3 = new THREE.Vector3();
const tempVec4 = new THREE.Vector3();
const tempVec5 = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempQuat2 = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);

export function initDoorSystem(deps: {
  inputManager: InputManager;
  camera: THREE.Camera;
  playerController: PlayerController;
  cameraController: CameraController;
  promptElement: HTMLElement | null;
  audioManager?: AudioManager;
  collisionWorld?: CollisionWorld;
}): void {
  dependencies = deps;
  interactionPrompt.attach(deps.promptElement ?? null);
  if (pendingDoorRegistrations.length > 0) {
    const pending = [...pendingDoorRegistrations];
    pendingDoorRegistrations.length = 0;
    for (const entry of pending) {
      registerDoorMesh(entry.mesh, entry.overrides);
    }
  }

  // Load door audio
  if (deps.audioManager) {
    loadDoorAudio();
  }
}

async function loadDoorAudio(): Promise<void> {
  const loader = new THREE.AudioLoader();

  try {
    const [openBuf, closeBuf] = await Promise.all([
      new Promise<AudioBuffer>((resolve, reject) => {
        loader.load('/assets/audio/qubodup-DoorOpen08.ogg', resolve, undefined, reject);
      }),
      new Promise<AudioBuffer>((resolve, reject) => {
        loader.load('/assets/audio/qubodup-DoorClose08.ogg', resolve, undefined, reject);
      })
    ]);

    doorOpenBuffer = openBuf;
    doorCloseBuffer = closeBuf;
    console.log('✅ Door sounds loaded');
  } catch (error) {
    console.warn('⚠️ Failed to load door sounds', error);
  }
}

function playDoorSound(isOpening: boolean): void {
  if (!dependencies?.audioManager) return;

  const buffer = isOpening ? doorOpenBuffer : doorCloseBuffer;
  if (!buffer) return;

  const listener = dependencies.audioManager['listener'];
  const sound = new THREE.Audio(listener);
  sound.setBuffer(buffer);
  sound.setVolume(0.6);
  sound.play();

  sound.onEnded = () => {
    sound.disconnect();
  };
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

  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox;
  if (!boundingBox) {
    console.warn(`Door mesh ${mesh.name} missing bounding box`);
    return;
  }

  const parent = mesh.parent;
  if (!parent) {
    console.warn(`Door mesh ${mesh.name} has no parent, skipping door registration`);
    return;
  }

  parent.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const center = new THREE.Vector3();
  boundingBox.getCenter(center);

  const hingeAxis = Math.abs(size.x) >= Math.abs(size.z) ? 'x' : 'z';
  const hingeLocal = center.clone();
  if (hingeAxis === 'x') {
    hingeLocal.x = config.hinge === 'max' ? boundingBox.max.x : boundingBox.min.x;
  } else {
    hingeLocal.z = config.hinge === 'max' ? boundingBox.max.z : boundingBox.min.z;
  }
  const localOffset = new THREE.Vector3().subVectors(center, hingeLocal);
  const meshLocalScale = mesh.scale.clone();

  const meshLocalMatrix = new THREE.Matrix4().compose(
    localOffset.clone(),
    new THREE.Quaternion(),
    meshLocalScale.clone()
  );
  const meshLocalMatrixInv = meshLocalMatrix.clone().invert();

  const parentMatrixWorldInv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const meshWorldMatrix = mesh.matrixWorld.clone();
  const pivotMatrix = new THREE.Matrix4()
    .multiplyMatrices(parentMatrixWorldInv, meshWorldMatrix)
    .multiply(meshLocalMatrixInv);

  const pivotPosition = new THREE.Vector3();
  const pivotQuaternion = new THREE.Quaternion();
  const pivotScale = new THREE.Vector3();
  pivotMatrix.decompose(pivotPosition, pivotQuaternion, pivotScale);

  const pivot = new THREE.Group();
  pivot.name = `${mesh.name}_pivot`;
  pivot.position.copy(pivotPosition);
  pivot.quaternion.copy(pivotQuaternion);
  pivot.scale.copy(pivotScale);

  parent.add(pivot);
  parent.remove(mesh);
  pivot.add(mesh);

  mesh.position.copy(localOffset);
  mesh.quaternion.identity();
  mesh.scale.copy(meshLocalScale);
  mesh.updateMatrixWorld(true);
  pivot.updateMatrixWorld(true);

  const hingeWorld = new THREE.Vector3();
  pivot.getWorldPosition(hingeWorld);

  const openQuat = pivot.quaternion.clone();
  const swing = -config.openAngle * config.openDirection;
  const rotationToClosed = new THREE.Quaternion().setFromAxisAngle(upAxis, swing);
  const closedQuat = openQuat.clone().multiply(rotationToClosed);

  pivot.quaternion.copy(openQuat);
  pivot.updateMatrixWorld(true);

  const eid = addEntity(ecsWorld);
  addComponent(ecsWorld, Door, eid);
  addComponent(ecsWorld, Transform, eid);

  Door.isOpen[eid] = 1;
  Door.openProgress[eid] = 1;
  Door.isLocked[eid] = config.locked ? 1 : 0;

  Transform.x[eid] = hingeWorld.x;
  Transform.y[eid] = hingeWorld.y;
  Transform.z[eid] = hingeWorld.z;
  Transform.rotX[eid] = pivot.rotation.x;
  Transform.rotY[eid] = pivot.rotation.y;
  Transform.rotZ[eid] = pivot.rotation.z;
  Transform.scaleX[eid] = pivot.scale.x;
  Transform.scaleY[eid] = pivot.scale.y;
  Transform.scaleZ[eid] = pivot.scale.z;

  const interactionOffsetLocal = localOffset.clone();
  interactionOffsetLocal.y = -size.y * 0.15;

  const runtime: DoorRuntime = {
    eid,
    mesh,
    pivot,
    closedQuat,
    openQuat,
  currentQuat: openQuat.clone(),
  hingeWorld,
  interactionPoint: new THREE.Vector3(),
  interactionOffsetLocal,
  target: 1,
  speed: config.openSpeed,
  label: config.interactLabel
};

  mesh.userData.__doorRegistered = true;
  doorInstances.push(runtime);
}

export function DoorSystem(world: IWorld, deltaTime: number): void {
  if (!dependencies) {
    return;
  }

  const { inputManager, camera, playerController, cameraController } = dependencies;

  const entities = doorQuery(world);
  if (entities.length === 0) {
    hidePrompt();
    return;
  }

  if (!cameraController.locked) {
    hidePrompt();
    return;
  }

  const interactPressed = inputManager.hasInteractPress();
  const playerPos = playerController.getCameraPosition();
  const cameraForward = camera.getWorldDirection(tempVec);
  if (cameraForward.lengthSq() > 0) {
    cameraForward.normalize();
  }
  const cameraForwardHorizontal = tempVec3.set(cameraForward.x, 0, cameraForward.z);
  const hasHorizontalForward = cameraForwardHorizontal.lengthSq() > 0;
  if (hasHorizontalForward) {
    cameraForwardHorizontal.normalize();
  }

  const maxDistance = 1.7;
  const maxDistanceSq = maxDistance * maxDistance;
  const facingThresholdHorizontal = Math.cos(THREE.MathUtils.degToRad(60));
  const facingThreshold3D = Math.cos(THREE.MathUtils.degToRad(35));

  let bestDoor: DoorRuntime | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const door of doorInstances) {
    door.pivot.updateMatrixWorld(true);
    door.pivot.getWorldPosition(door.hingeWorld);

    door.interactionPoint.copy(door.interactionOffsetLocal);
    door.pivot.localToWorld(door.interactionPoint);

    const toDoor = tempVec2.copy(door.interactionPoint).sub(playerPos);
    const distanceSq = toDoor.lengthSq();
    if (distanceSq > maxDistanceSq) {
      continue;
    }

    if (distanceSq === 0) {
      continue;
    }

    const toDoorDir = tempVec5.copy(toDoor).normalize();
    const facingScore3D = cameraForward.dot(toDoorDir);
    if (facingScore3D < facingThreshold3D) {
      continue;
    }

    const horizontal = tempVec4.set(toDoor.x, 0, toDoor.z);
    const horizontalLengthSq = horizontal.lengthSq();
    let facingScoreHorizontal = facingScore3D;
    if (horizontalLengthSq > 0 && hasHorizontalForward) {
      horizontal.normalize();
      facingScoreHorizontal = cameraForwardHorizontal.dot(horizontal);
      if (facingScoreHorizontal < facingThresholdHorizontal) {
        continue;
      }
    }

    const score = distanceSq - facingScoreHorizontal * 0.3 - facingScore3D * 0.2;
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
      inputManager.consumeInteractPress();
      const shouldOpen = doorState < 0.5;
      bestDoor.target = shouldOpen ? 1 : 0;

      // Play door sound
      playDoorSound(shouldOpen);
    } else if (interactPressed && doorCompLocked) {
      inputManager.consumeInteractPress();
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
    door.pivot.quaternion.copy(door.currentQuat);
    door.pivot.updateMatrixWorld(true);

    const hingeWorld = door.hingeWorld;
    Transform.x[door.eid] = hingeWorld.x;
    Transform.y[door.eid] = hingeWorld.y;
    Transform.z[door.eid] = hingeWorld.z;

    const euler = door.pivot.rotation;
    Transform.rotX[door.eid] = euler.x;
    Transform.rotY[door.eid] = euler.y;
    Transform.rotZ[door.eid] = euler.z;

    // Update collision so a closed door blocks movement
    const shouldBlock = next < 0.95;
    updateDoorCollider(door, shouldBlock);
  }
}

function updateDoorCollider(door: DoorRuntime, isBlocking: boolean): void {
  if (!dependencies?.collisionWorld) return;

  // Remove existing collider if we should not block
  if (!isBlocking) {
    if (door.colliderId !== undefined) {
      dependencies.collisionWorld.remove(door.colliderId);
      door.colliderId = undefined;
    }
    return;
  }

  // Compute world-aligned bounds for the swinging leaf
  const box = new THREE.Box3().setFromObject(door.mesh);
  if (box.isEmpty()) {
    return;
  }

  // Keep collider tight to the door thickness but not oversized
  box.expandByScalar(0.02);

  if (door.colliderId !== undefined) {
    dependencies.collisionWorld.remove(door.colliderId);
  }
  door.colliderId = dependencies.collisionWorld.addBox(box);
}

function showPrompt(text: string): void {
  if (!dependencies) return;
  interactionPrompt.show('door', text, dependencies.promptElement ?? null);
}

function hidePrompt(): void {
  interactionPrompt.hide('door');
}
