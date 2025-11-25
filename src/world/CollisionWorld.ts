import * as THREE from 'three';

type BoxObstacle = {
  id: number;
  box: THREE.Box2;
  minY: number;
  maxY: number;
};

type CircleObstacle = {
  id: number;
  center: THREE.Vector2;
  radius: number;
  minY: number;
  maxY: number;
};

/**
 * Lightweight collision world.
 * - Horizontal resolution only (XZ plane) with simple circles/boxes.
 * - Used to keep the player from walking through trees/cabin walls.
 */
export class CollisionWorld {
  private nextId = 1;
  private boxes: BoxObstacle[] = [];
  private circles: CircleObstacle[] = [];
  private readonly tempVec2 = new THREE.Vector2();
  private readonly tempVec3 = new THREE.Vector3();

  public addBox(box3: THREE.Box3): number {
    const id = this.nextId++;
    const box2 = new THREE.Box2(
      new THREE.Vector2(box3.min.x, box3.min.z),
      new THREE.Vector2(box3.max.x, box3.max.z)
    );

    this.boxes.push({
      id,
      box: box2,
      minY: box3.min.y,
      maxY: box3.max.y
    });

    return id;
  }

  public addCircle(center: THREE.Vector3, radius: number, height = 2): number {
    const id = this.nextId++;
    this.circles.push({
      id,
      center: new THREE.Vector2(center.x, center.z),
      radius,
      minY: center.y - height * 0.5,
      maxY: center.y + height * 0.5
    });
    return id;
  }

  public remove(id: number): void {
    this.boxes = this.boxes.filter((b) => b.id !== id);
    this.circles = this.circles.filter((c) => c.id !== id);
  }

  /**
   * Resolve a horizontal move for a capsule treated as a circle in XZ.
   * Returns the corrected world-space position.
   */
  public resolveHorizontal(
    currentPosition: THREE.Vector3,
    desiredDisplacement: THREE.Vector3,
    radius: number,
    capsuleBottomY: number,
    capsuleTopY: number
  ): THREE.Vector3 {
    const target = this.tempVec3.copy(currentPosition).add(desiredDisplacement);

    // Iterate a few times to resolve stacking collisions
    for (let iteration = 0; iteration < 2; iteration++) {
      // Box obstacles
      for (const obstacle of this.boxes) {
        if (capsuleTopY < obstacle.minY || capsuleBottomY > obstacle.maxY + 0.4) {
          continue; // out of vertical range
        }

        this.resolveCircleBox(target, radius, obstacle.box);
      }

      // Circle obstacles
      for (const obstacle of this.circles) {
        if (capsuleTopY < obstacle.minY || capsuleBottomY > obstacle.maxY + 0.4) {
          continue;
        }

        this.resolveCircleCircle(
          target,
          radius,
          obstacle.center,
          obstacle.radius
        );
      }
    }

    return target;
  }

  private resolveCircleBox(position: THREE.Vector3, radius: number, box: THREE.Box2): void {
    const closestX = Math.max(box.min.x, Math.min(position.x, box.max.x));
    const closestZ = Math.max(box.min.y, Math.min(position.z, box.max.y));
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;
    const radiusSq = radius * radius;

    if (distSq < radiusSq) {
      const dist = Math.sqrt(Math.max(distSq, 1e-6));
      const penetration = radius - dist;

      if (dist > 1e-6) {
        position.x += (dx / dist) * penetration;
        position.z += (dz / dist) * penetration;
      } else {
        // If we're exactly at the corner, push out along the smallest axis
        if (box.min.x - position.x < position.x - box.max.x) {
          position.x = box.min.x - radius;
        } else {
          position.x = box.max.x + radius;
        }
      }
    }
  }

  private resolveCircleCircle(
    center: THREE.Vector3,
    radius: number,
    otherCenter: THREE.Vector2,
    otherRadius: number
  ): void {
    this.tempVec2.set(center.x, center.z);
    const totalRadius = radius + otherRadius;
    const distSq = this.tempVec2.distanceToSquared(otherCenter);

    if (distSq < totalRadius * totalRadius) {
      const dist = Math.sqrt(Math.max(distSq, 1e-6));
      const penetration = totalRadius - dist;

      if (dist > 1e-6) {
        const nx = (this.tempVec2.x - otherCenter.x) / dist;
        const nz = (this.tempVec2.y - otherCenter.y) / dist;
        center.x += nx * penetration;
        center.z += nz * penetration;
      } else {
        // Random small nudge to avoid divide by zero
        center.x += totalRadius * 0.1;
      }
    }
  }
}
