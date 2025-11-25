import * as THREE from 'three';
import { InputManager } from '../../utils/InputManager';
import { InventorySystem } from './InventorySystem';
import { interactionPrompt } from '../../ui/InteractionPrompt';

/**
 * BoardingSystem - Board up windows and doors
 *
 * Features:
 * - Detect windows/doors nearby
 * - Use boards from inventory
 * - Track boarded state
 * - Nightman can break boards
 */

export interface BoardableTarget {
  type: 'window' | 'door';
  mesh: THREE.Mesh;
  position: THREE.Vector3; // world center of target
  size: THREE.Vector3; // oriented bounds (width, height, depth)
  rotation: THREE.Quaternion; // world rotation
  normal: THREE.Vector3; // Surface normal
  right: THREE.Vector3;
  up: THREE.Vector3;
  surfaceWidth: number;
  surfaceHeight: number;
  surfaceDepth: number;
  boards: BoardedPlank[];
  maxBoards: number;
}

export interface BoardedPlank {
  mesh: THREE.Mesh;
  health: number;
  maxHealth: number;
  collider?: any; // Rapier collider
}

export class BoardingSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private inputManager: InputManager;
  private inventory: InventorySystem;

  // Boardable targets
  private targets: Map<string, BoardableTarget> = new Map();

  // Interaction
  private raycaster: THREE.Raycaster;
  private maxBoardDistance = 1.9;
  private promptElement: HTMLElement | null = null;
  private currentTarget: BoardableTarget | null = null;

  // Board settings
  private readonly PLANK_HEALTH = 50; // HP per board
  private readonly BOARDS_PER_WINDOW = 3;
  private readonly BOARDS_PER_DOOR = 4;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    inputManager: InputManager,
    inventory: InventorySystem
  ) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;
    this.inventory = inventory;
    this.raycaster = new THREE.Raycaster();

    this.promptElement = document.getElementById('interaction-prompt');
    interactionPrompt.attach(this.promptElement);
  }

  /**
   * Register a window for boarding
   */
  public registerWindow(windowMesh: THREE.Mesh, options?: { anchor?: THREE.Vector3; size?: THREE.Vector3; rotation?: THREE.Quaternion }): void {
    const oriented = this.computeOrientedBounds(windowMesh);
    const position = options?.anchor ? options.anchor.clone() : oriented.center;
    
    // Use provided rotation or computed rotation
    const rotation = options?.rotation || oriented.rotation;
    
    // Use provided size or computed size
    // If size is provided, we might need to adjust how we resolve basis, 
    // but resolveSurfaceBasis takes 'oriented' object. 
    // Let's construct a synthetic 'oriented' object if options are present.
    
    const effectiveOriented = {
        center: position,
        size: options?.size || oriented.size,
        rotation: rotation,
        right: options?.rotation ? new THREE.Vector3(1, 0, 0).applyQuaternion(options.rotation) : oriented.right,
        up: options?.rotation ? new THREE.Vector3(0, 1, 0).applyQuaternion(options.rotation) : oriented.up,
        forward: options?.rotation ? new THREE.Vector3(0, 0, 1).applyQuaternion(options.rotation) : oriented.forward
    };

    const basis = this.resolveSurfaceBasis(effectiveOriented);

    const target: BoardableTarget = {
      type: 'window',
      mesh: windowMesh,
      position,
      size: new THREE.Vector3(basis.surfaceWidth, basis.surfaceHeight, basis.surfaceDepth),
      rotation: basis.rotation,
      normal: basis.normal,
      right: basis.right,
      up: basis.up,
      surfaceWidth: basis.surfaceWidth,
      surfaceHeight: basis.surfaceHeight,
      surfaceDepth: basis.surfaceDepth,
      boards: [],
      maxBoards: this.BOARDS_PER_WINDOW
    };

    this.targets.set(windowMesh.uuid, target);
    console.log(`🪟 Registered window for boarding at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
  }

  /**
   * Register a door for boarding
   */
  public registerDoor(doorMesh: THREE.Mesh): void {
    const oriented = this.computeOrientedBounds(doorMesh);
    const basis = this.resolveSurfaceBasis(oriented);

    const target: BoardableTarget = {
      type: 'door',
      mesh: doorMesh,
      position: oriented.center,
      size: new THREE.Vector3(basis.surfaceWidth, basis.surfaceHeight, basis.surfaceDepth),
      rotation: basis.rotation,
      normal: basis.normal,
      right: basis.right,
      up: basis.up,
      surfaceWidth: basis.surfaceWidth,
      surfaceHeight: basis.surfaceHeight,
      surfaceDepth: basis.surfaceDepth,
      boards: [],
      maxBoards: this.BOARDS_PER_DOOR
    };

    this.targets.set(doorMesh.uuid, target);
    console.log(`🚪 Registered door for boarding at (${target.position.x.toFixed(1)}, ${target.position.z.toFixed(1)})`);
  }

  /**
   * Update boarding system
   */
  public update(deltaTime: number): void {
    // Raycast to find target in crosshair
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const cameraPos = this.camera.position;

    let closestTarget: BoardableTarget | null = null;
    let closestDistance = Infinity;

    for (const target of this.targets.values()) {
      const distance = cameraPos.distanceTo(target.position);

      if (distance <= this.maxBoardDistance && distance < closestDistance) {
        // Check if looking at target
        const direction = new THREE.Vector3().subVectors(target.position, cameraPos).normalize();
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        const angle = direction.dot(cameraDirection);
        if (angle > 0.82) {
          closestTarget = target;
          closestDistance = distance;
        }
      }
    }

    this.currentTarget = closestTarget;

    // Show prompt
    if (closestTarget) {
      const boardCount = closestTarget.boards.length;
      const maxBoards = closestTarget.maxBoards;
      const inventoryBoards = this.inventory.getInventory().boards;
      const canAddBoard = boardCount < maxBoards;

      if (boardCount >= maxBoards) {
        this.showPrompt(`${closestTarget.type} fully boarded (${boardCount}/${maxBoards})`);
      } else {
        const baseLabel = `Board ${closestTarget.type} [E] (${boardCount}/${maxBoards})`;
        const label = inventoryBoards > 0 ? baseLabel : `${baseLabel} - Need boards`;
        this.showPrompt(label);

        // Allow interaction attempt even if you have no boards (will early-exit in addBoard)
        if (canAddBoard && this.inputManager.consumeInteractPress()) {
          this.addBoard(closestTarget);
        }
      }
    } else {
      this.clearPrompt();
    }
  }

  /**
   * Add a board to the target
   */
  private addBoard(target: BoardableTarget): void {
    if (!this.inventory.useBoard()) {
      console.warn('⚠️ No boards available');
      return;
    }

    const boardIndex = target.boards.length;
    const plankMesh = this.createPlankMesh(target, boardIndex);

    const plank: BoardedPlank = {
      mesh: plankMesh,
      health: this.PLANK_HEALTH,
      maxHealth: this.PLANK_HEALTH,
      collider: null // TODO: Add physics collider
    };

    target.boards.push(plank);
    this.scene.add(plankMesh);

    console.log(`🪚 Boarded ${target.type} (${target.boards.length}/${target.maxBoards})`);

    // TODO: Play hammering sound
    // TODO: Add nail visuals
  }

  /**
   * Create plank mesh
   */
  private createPlankMesh(target: BoardableTarget, index: number): THREE.Mesh {
    // Size plank relative to the window bounds (use oriented width/height)
    const length = Math.max(target.surfaceWidth * 1.6, Math.max(target.size.x, target.size.z) * 1.05, 1.35);
    const height = Math.min(Math.max(target.surfaceHeight * 0.22, 0.12), 0.22);
    const thickness = 0.03;
    const geometry = new THREE.BoxGeometry(length, height, thickness);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
      metalness: 0.0
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position plank on target surface
    const verticalSpacing = Math.min(target.surfaceHeight * 0.35, 0.55);
    const offset = (index - (target.maxBoards - 1) / 2) * verticalSpacing;
    const position = target.position
      .clone()
      .addScaledVector(target.up, offset)
      .addScaledVector(target.normal, target.surfaceDepth * 0.5 + thickness * 0.5 + 0.04); // Sit flush to surface

    mesh.position.copy(position);

    // Orient plank to face same direction as target
    mesh.setRotationFromQuaternion(target.rotation);

    // Add slight random rotation for realism
    mesh.rotation.z += (Math.random() - 0.5) * 0.1;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Damage a board (called by Nightman)
   */
  public damageBoard(targetId: string, damage: number): boolean {
    const target = this.targets.get(targetId);
    if (!target || target.boards.length === 0) return false;

    // Damage the top-most board
    const plank = target.boards[target.boards.length - 1];
    plank.health -= damage;

    console.log(`💥 Board damaged! HP: ${plank.health}/${plank.maxHealth}`);

    // Board broken
    if (plank.health <= 0) {
      this.removeBoard(target, target.boards.length - 1);
      return true;
    }

    return false;
  }

  /**
   * Remove a broken board
   */
  private removeBoard(target: BoardableTarget, index: number): void {
    const plank = target.boards[index];

    // Remove mesh
    this.scene.remove(plank.mesh);
    plank.mesh.geometry.dispose();
    (plank.mesh.material as THREE.Material).dispose();

    // Remove from array
    target.boards.splice(index, 1);

    console.log(`🪚 Board broken! Remaining: ${target.boards.length}/${target.maxBoards}`);

    // TODO: Play wood break sound
    // TODO: Spawn wood debris particles
  }

  private computeOrientedBounds(mesh: THREE.Mesh): {
    center: THREE.Vector3;
    size: THREE.Vector3;
    rotation: THREE.Quaternion;
    right: THREE.Vector3;
    up: THREE.Vector3;
    forward: THREE.Vector3;
  } {
    mesh.updateMatrixWorld(true);
    mesh.geometry.computeBoundingBox?.();
    const localBox =
      mesh.geometry.boundingBox?.clone() || new THREE.Box3().setFromObject(mesh);

    const corners = [
      new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.min.z),
      new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.max.z),
      new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.min.z),
      new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.max.z),
      new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.min.z),
      new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.max.z),
      new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.min.z),
      new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.max.z)
    ].map((corner) => corner.applyMatrix4(mesh.matrixWorld));

    const rotation = new THREE.Quaternion();
    mesh.getWorldQuaternion(rotation);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rotation).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).normalize();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();

    let minR = Infinity, maxR = -Infinity;
    let minU = Infinity, maxU = -Infinity;
    let minF = Infinity, maxF = -Infinity;

    const center = new THREE.Vector3();
    corners.forEach((corner) => {
      const r = corner.dot(right);
      const u = corner.dot(up);
      const f = corner.dot(forward);

      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minF = Math.min(minF, f);
      maxF = Math.max(maxF, f);

      center.add(corner);
    });

    center.multiplyScalar(1 / corners.length);

    const size = new THREE.Vector3(maxR - minR, maxU - minU, maxF - minF);

    return { center, size, rotation, right, up, forward };
  }

  /**
   * Determine which mesh axis is the wall normal and orient planks so they sit centered across the opening.
   * Uses the thinnest axis as depth (surface normal), the most vertical axis as up, and the remaining as width.
   */
  private resolveSurfaceBasis(oriented: {
    size: THREE.Vector3;
    right: THREE.Vector3;
    up: THREE.Vector3;
    forward: THREE.Vector3;
  }): {
    normal: THREE.Vector3;
    right: THREE.Vector3;
    up: THREE.Vector3;
    surfaceWidth: number;
    surfaceHeight: number;
    surfaceDepth: number;
    rotation: THREE.Quaternion;
  } {
    const axes = [
      { size: oriented.size.x, dir: oriented.right.clone() },
      { size: oriented.size.y, dir: oriented.up.clone() },
      { size: oriented.size.z, dir: oriented.forward.clone() }
    ].sort((a, b) => a.size - b.size);

    const depthAxis = axes[0]; // thinnest axis = surface normal
    const spanAxes = axes.slice(1);

    const worldUp = new THREE.Vector3(0, 1, 0);
    const verticalAxis = spanAxes.reduce((best, axis) =>
      Math.abs(axis.dir.dot(worldUp)) > Math.abs(best.dir.dot(worldUp)) ? axis : best
    , spanAxes[0]);
    const remainingAxis = spanAxes.find(axis => axis !== verticalAxis) || spanAxes[0];

    // Use the thinnest axis as the true surface normal
    const normal = depthAxis.dir.clone().normalize();

    // Orthogonalize up against the normal
    let up = verticalAxis.dir.clone().sub(normal.clone().multiplyScalar(verticalAxis.dir.dot(normal)));
    if (up.lengthSq() < 1e-6) {
      up.copy(worldUp).sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
    }
    up.normalize();

    // Right = up x normal
    let right = new THREE.Vector3().crossVectors(up, normal);
    if (right.lengthSq() < 1e-6) {
      right = new THREE.Vector3(1, 0, 0).sub(normal.clone().multiplyScalar(normal.x)).normalize();
    } else {
      right.normalize();
    }

    // Rebuild orthonormal basis so planks sit centered on the opening plane
    const rotationMatrix = new THREE.Matrix4().makeBasis(right, up, normal);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);

    return {
      normal,
      right,
      up,
      surfaceWidth: remainingAxis.size,
      surfaceHeight: verticalAxis.size,
      surfaceDepth: depthAxis.size,
      rotation
    };
  }

  /**
   * Check if target is fully boarded
   */
  public isFullyBoarded(targetId: string): boolean {
    const target = this.targets.get(targetId);
    if (!target) return false;
    return target.boards.length >= target.maxBoards;
  }

  /**
   * Get board strength (0-1) for a target
   */
  public getBoardStrength(targetId: string): number {
    const target = this.targets.get(targetId);
    if (!target) return 0;
    return target.boards.length / target.maxBoards;
  }

  /**
   * Get all broken windows (not boarded)
   */
  public getBrokenWindows(): BoardableTarget[] {
    const broken: BoardableTarget[] = [];
    for (const target of this.targets.values()) {
      if (target.type === 'window' && target.boards.length === 0) {
        broken.push(target);
      }
    }
    return broken;
  }

  /**
   * Get all open doors
   */
  public getOpenDoors(): BoardableTarget[] {
    const open: BoardableTarget[] = [];
    for (const target of this.targets.values()) {
      if (target.type === 'door' && target.boards.length === 0) {
        open.push(target);
      }
    }
    return open;
  }

  /**
   * Get all boarded windows
   */
  public getBoardedWindows(): BoardableTarget[] {
    const boarded: BoardableTarget[] = [];
    for (const target of this.targets.values()) {
      if (target.type === 'window' && target.boards.length > 0) {
        boarded.push(target);
      }
    }
    return boarded;
  }

  /**
   * Get weakest entry points (least boarded)
   */
  public getWeakestEntries(): BoardableTarget[] {
    const entries = Array.from(this.targets.values());
    // Sort by board strength (ascending - weakest first)
    entries.sort((a, b) => {
      const strengthA = a.boards.length / a.maxBoards;
      const strengthB = b.boards.length / b.maxBoards;
      return strengthA - strengthB;
    });
    return entries.slice(0, 3); // Return top 3 weakest
  }

  private showPrompt(text: string): void {
    interactionPrompt.show('boarding', text, this.promptElement);
  }

  private clearPrompt(): void {
    interactionPrompt.hide('boarding');
  }

  public dispose(): void {
    for (const target of this.targets.values()) {
      for (const plank of target.boards) {
        this.scene.remove(plank.mesh);
        plank.mesh.geometry.dispose();
        (plank.mesh.material as THREE.Material).dispose();
      }
    }
    this.targets.clear();
  }
}
