import * as THREE from 'three';
import { FoliagePlacementCoordinator } from './FoliagePlacementCoordinator';

export interface PropInstance {
  propType: string;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
}

export interface PropPlacementZone {
  name: string;
  minRadius: number;
  maxRadius: number;
  density: number; // props per 100m²
}

/**
 * Generates procedural prop placement (rocks, logs, etc.)
 * Similar to TreePlacementSystem but for smaller environmental details
 */
export class PropPlacementSystem {
  private instances: Map<string, PropInstance[]> = new Map();
  private placementZones: PropPlacementZone[] = [];
  private coordinator: FoliagePlacementCoordinator | null = null;

  // Reuse tree exclusion zones (cabin + path)
  private cabinExclusionRadius = 12;
  private pathStart = new THREE.Vector3(0, 0, 2.425);
  private pathEnd = new THREE.Vector3(0, 0, 52.425);
  private pathWidth = 3;

  constructor(coordinator?: FoliagePlacementCoordinator) {
    this.coordinator = coordinator || null;
    this.setupDefaultZones();
  }

  /**
   * Setup placement zones for rocks
   * Rocks are denser near cabin, sparser at distance
   */
  private setupDefaultZones(): void {
    // Near cabin zone (12-30m) - moderate density
    this.placementZones.push({
      name: 'near_cabin',
      minRadius: 12,
      maxRadius: 30,
      density: 0.8 // ~25 rocks in this zone
    });

    // Mid zone (30-70m) - lower density
    this.placementZones.push({
      name: 'mid_forest',
      minRadius: 30,
      maxRadius: 70,
      density: 0.4 // ~40 rocks in this zone
    });

    // Far zone (70-120m) - sparse
    this.placementZones.push({
      name: 'far_forest',
      minRadius: 70,
      maxRadius: 120,
      density: 0.15 // ~30 rocks in this zone
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
   * Generate rock placement across all zones
   * Distributes rocks by size (small/medium/large)
   */
  generatePropPositions(propTypes: string[]): void {
    this.instances.clear();

    // Initialize instance arrays for each prop type
    propTypes.forEach(type => {
      this.instances.set(type, []);
    });

    // Categorize prop types by size
    const smallProps = propTypes.filter(t => t.includes('small'));
    const mediumProps = propTypes.filter(t => t.includes('medium'));
    const largeProps = propTypes.filter(t => t.includes('large'));

    for (const zone of this.placementZones) {
      const area = Math.PI * (zone.maxRadius ** 2 - zone.minRadius ** 2);
      const targetCount = Math.floor((area / 10000) * zone.density * 100);

      console.log(`Placing rocks in ${zone.name} zone (target: ${targetCount})...`);

      // Distribution: 50% medium, 30% small, 20% large
      const mediumCount = Math.floor(targetCount * 0.5);
      const smallCount = Math.floor(targetCount * 0.3);
      const largeCount = Math.floor(targetCount * 0.2);

      // Place medium rocks
      this.placePropsInZone(mediumProps, mediumCount, zone);

      // Place small rocks
      this.placePropsInZone(smallProps, smallCount, zone);

      // Place large rocks
      this.placePropsInZone(largeProps, largeCount, zone);
    }

    // Log placement summary
    let total = 0;
    this.instances.forEach((instances, type) => {
      if (instances.length > 0) {
        console.log(`  ✓ ${type}: ${instances.length} instances`);
        total += instances.length;
      }
    });
    console.log(`✅ Total rocks placed: ${total}`);
  }

  /**
   * Place specific prop types within a zone
   */
  private placePropsInZone(
    propTypes: string[],
    count: number,
    zone: PropPlacementZone
  ): void {
    if (propTypes.length === 0) return;

    for (let i = 0; i < count; i++) {
      // Pick random prop type from the list
      const propType = propTypes[Math.floor(Math.random() * propTypes.length)];
      if (!propType) continue;

      const instance = this.generatePropInstance(propType, zone);

      if (instance) {
        const typeInstances = this.instances.get(propType);
        if (typeInstances) {
          typeInstances.push(instance);
        }
      }
    }
  }

  /**
   * Generate a single prop instance within a zone
   */
  private generatePropInstance(
    propType: string,
    zone: PropPlacementZone,
    maxAttempts: number = 20
  ): PropInstance | null {
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
      const rockRadius = 0.3; // Approximate rock radius
      if (this.coordinator && !this.coordinator.isValidPosition(position, 'rock', rockRadius)) {
        continue;
      }

      // Valid position found
      const instance = {
        propType,
        position,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.8 + Math.random() * 0.4 // 80-120% scale variation
      };

      // Register with coordinator
      if (this.coordinator) {
        this.coordinator.registerObject({
          type: 'rock',
          position: position.clone(),
          radius: rockRadius
        });
      }

      return instance;
    }

    return null;
  }

  /**
   * Get all instances for a specific prop type
   */
  getInstances(propType: string): PropInstance[] {
    return this.instances.get(propType) || [];
  }

  /**
   * Get all prop instances grouped by type
   */
  getAllInstances(): Map<string, PropInstance[]> {
    return this.instances;
  }

  /**
   * Get total prop count
   */
  getTotalPropCount(): number {
    let total = 0;
    this.instances.forEach(instances => {
      total += instances.length;
    });
    return total;
  }
}
