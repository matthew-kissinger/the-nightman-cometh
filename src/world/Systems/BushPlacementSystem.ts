import * as THREE from 'three';
import { FoliagePlacementCoordinator } from './FoliagePlacementCoordinator';

export interface BushInstance {
  bushType: string;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
}

export interface BushPlacementZone {
  name: string;
  minRadius: number;
  maxRadius: number;
  density: number; // bushes per 100m²
}

/**
 * Generates procedural bush placement around the cabin
 * Similar to PropPlacementSystem but with different density zones
 */
export class BushPlacementSystem {
  private instances: Map<string, BushInstance[]> = new Map();
  private placementZones: BushPlacementZone[] = [];
  private coordinator: FoliagePlacementCoordinator | null = null;

  // Reuse exclusion zones from trees/props
  private cabinExclusionRadius = 12;
  private pathStart = new THREE.Vector3(0, 0, 2.425);
  private pathEnd = new THREE.Vector3(0, 0, 52.425);
  private pathWidth = 3;

  constructor(coordinator?: FoliagePlacementCoordinator) {
    this.coordinator = coordinator || null;
    this.setupDefaultZones();
  }

  /**
   * Setup placement zones for bushes
   * Bushes are scattered near cabin, sparser at distance
   */
  private setupDefaultZones(): void {
    // Near cabin zone (12-25m) - moderate density, ground cover
    this.placementZones.push({
      name: 'near_cabin',
      minRadius: 12,
      maxRadius: 25,
      density: 1.2 // ~15 bushes in this zone
    });

    // Mid zone (25-50m) - lower density
    this.placementZones.push({
      name: 'mid_forest',
      minRadius: 25,
      maxRadius: 50,
      density: 0.6 // ~25 bushes in this zone
    });

    // Far zone (50-80m) - sparse
    this.placementZones.push({
      name: 'far_forest',
      minRadius: 50,
      maxRadius: 80,
      density: 0.2 // ~15 bushes in this zone
    });
  }

  /**
   * Check if position overlaps with exclusion zones
   */
  private isInExclusionZone(pos: THREE.Vector3): boolean {
    // Cabin exclusion
    const distToCenter = pos.length();
    if (distToCenter < this.cabinExclusionRadius) return true;

    // Path exclusion
    const distToPath = this.distanceToLineSegment(pos, this.pathStart, this.pathEnd);
    if (distToPath < this.pathWidth / 2) return true;

    return false;
  }

  /**
   * Distance from point to line segment
   */
  private distanceToLineSegment(
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): number {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const lineLength = line.length();
    line.normalize();

    const pointToStart = new THREE.Vector3().subVectors(point, lineStart);
    const projection = pointToStart.dot(line);

    const clampedProjection = Math.max(0, Math.min(lineLength, projection));
    const closestPoint = new THREE.Vector3()
      .copy(lineStart)
      .addScaledVector(line, clampedProjection);

    return point.distanceTo(closestPoint);
  }

  /**
   * Generate bush placement across all zones
   * Distributes bushes randomly from available types
   */
  generateBushPositions(bushTypes: string[]): void {
    this.instances.clear();

    // Initialize instance arrays for each bush type
    bushTypes.forEach(type => {
      this.instances.set(type, []);
    });

    for (const zone of this.placementZones) {
      const area = Math.PI * (zone.maxRadius ** 2 - zone.minRadius ** 2);
      const targetCount = Math.floor((area / 10000) * zone.density * 100);

      console.log(`Placing bushes in ${zone.name} zone (target: ${targetCount})...`);

      for (let i = 0; i < targetCount; i++) {
        // Pick random bush type
        const bushType = bushTypes[Math.floor(Math.random() * bushTypes.length)];
        if (!bushType) continue;

        const instance = this.generateBushInstance(bushType, zone);

        if (instance) {
          const typeInstances = this.instances.get(bushType);
          if (typeInstances) {
            typeInstances.push(instance);
          }
        }
      }
    }

    // Log placement summary
    let total = 0;
    this.instances.forEach((instances, type) => {
      if (instances.length > 0) {
        console.log(`  ✓ ${type}: ${instances.length} instances`);
        total += instances.length;
      }
    });
    console.log(`✅ Total bushes placed: ${total}`);
  }

  /**
   * Generate a single bush instance within a zone
   */
  private generateBushInstance(
    bushType: string,
    zone: BushPlacementZone,
    maxAttempts: number = 20
  ): BushInstance | null {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Random position in annulus (ring)
      const angle = Math.random() * Math.PI * 2;
      const distance = zone.minRadius + Math.random() * (zone.maxRadius - zone.minRadius);

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const position = new THREE.Vector3(x, 0, z);

      // Check exclusion zones
      if (this.isInExclusionZone(position)) {
        continue;
      }

      // Check against other foliage (coordinator)
      const bushRadius = 0.4; // Approximate bush radius
      if (this.coordinator && !this.coordinator.isValidPosition(position, 'bush', bushRadius)) {
        continue;
      }

      // Valid position found
      // Base scale is 0.15, with 80-120% variation
      const baseScale = 0.15;
      const instance = {
        bushType,
        position,
        rotation: Math.random() * Math.PI * 2,
        scale: baseScale * (0.8 + Math.random() * 0.4) // 12-18% of original size
      };

      // Register with coordinator
      if (this.coordinator) {
        this.coordinator.registerObject({
          type: 'bush',
          position: position.clone(),
          radius: bushRadius
        });
      }

      return instance;
    }

    return null;
  }

  /**
   * Get all instances for a specific bush type
   */
  getInstances(bushType: string): BushInstance[] {
    return this.instances.get(bushType) || [];
  }

  /**
   * Get all bush instances grouped by type
   */
  getAllInstances(): Map<string, BushInstance[]> {
    return this.instances;
  }

  /**
   * Get total bush count
   */
  getTotalBushCount(): number {
    let total = 0;
    this.instances.forEach(instances => {
      total += instances.length;
    });
    return total;
  }
}
