import * as THREE from 'three';

export interface PlacementZone {
  name: string;
  minRadius: number;
  maxRadius: number;
  count: number;
  mix: Record<string, number>;
}

export interface ExclusionZone {
  type: 'circle' | 'rectangle' | 'path';
  center?: THREE.Vector3;
  radius?: number;
  start?: THREE.Vector3;
  end?: THREE.Vector3;
  width?: number;
}

export interface TreeInstance {
  treeType: string;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
}

/**
 * Generates procedural tree placement with exclusion zones
 * for cabin and path clearance
 */
export class TreePlacementSystem {
  private exclusionZones: ExclusionZone[] = [];
  private placementZones: PlacementZone[] = [];
  private instances: Map<string, TreeInstance[]> = new Map();

  constructor() {
    this.setupDefaultZones();
  }

  /**
   * Setup default exclusion and placement zones from trees.json config
   */
  private setupDefaultZones(): void {
    // Cabin exclusion zone (12m radius - no trees)
    this.exclusionZones.push({
      type: 'circle',
      center: new THREE.Vector3(0, 0, 0),
      radius: 12
    });

    // Front path exclusion (3m wide path from front door)
    this.exclusionZones.push({
      type: 'path',
      start: new THREE.Vector3(0, 0, 2.425),
      end: new THREE.Vector3(0, 0, 52.425),
      width: 3
    });

    // Near zone: 12-50m from cabin
    this.placementZones.push({
      name: 'near',
      minRadius: 12,
      maxRadius: 50,
      count: 60,
      mix: {
        'conifer-mid': 0.25,
        'fir-tall': 0.20,
        'fir-tallest': 0.13,
        'broadleaf-short': 0.08,
        'birch-mid': 0.34
      }
    });

    // Mid zone: 50-150m from cabin
    this.placementZones.push({
      name: 'mid',
      minRadius: 50,
      maxRadius: 150,
      count: 138,
      mix: {
        'conifer-mid': 0.22,
        'fir-tall': 0.18,
        'fir-tallest': 0.11,
        'broadleaf-short': 0.06,
        'birch-mid': 0.43
      }
    });

    // Far zone: 150-250m from cabin (fog zone)
    this.placementZones.push({
      name: 'far',
      minRadius: 150,
      maxRadius: 250,
      count: 125,
      mix: {
        'conifer-mid': 0.16,
        'fir-tall': 0.12,
        'fir-tallest': 0.08,
        'broadleaf-short': 0,
        'birch-mid': 0.64
      }
    });
  }

  /**
   * Check if a position is inside any exclusion zone
   */
  private isInExclusionZone(pos: THREE.Vector3): boolean {
    for (const zone of this.exclusionZones) {
      if (zone.type === 'circle' && zone.center && zone.radius) {
        const dist = pos.distanceTo(zone.center);
        if (dist < zone.radius) return true;
      }

      if (zone.type === 'path' && zone.start && zone.end && zone.width) {
        // Check if point is near the path line segment
        const distToPath = this.distanceToLineSegment(pos, zone.start, zone.end);
        if (distToPath < zone.width / 2) return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance from point to line segment (for path exclusion)
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

    // Clamp to line segment
    const clampedProjection = Math.max(0, Math.min(lineLength, projection));
    const closestPoint = new THREE.Vector3()
      .copy(lineStart)
      .addScaledVector(line, clampedProjection);

    return point.distanceTo(closestPoint);
  }

  /**
   * Generate random tree positions for all zones
   */
  generateTreePositions(): void {
    this.instances.clear();

    for (const zone of this.placementZones) {
      console.log(`Placing trees in ${zone.name} zone...`);

      // Calculate tree counts per type based on mix ratios
      const treeTypes = Object.keys(zone.mix);
      const counts: Record<string, number> = {};

      treeTypes.forEach(type => {
        const mixRatio = zone.mix[type];
        if (mixRatio !== undefined) {
          counts[type] = Math.round(zone.count * mixRatio);
        }
      });

      // Place trees for each type
      treeTypes.forEach(type => {
        const count = counts[type] || 0;
        if (count === 0) return;

        if (!this.instances.has(type)) {
          this.instances.set(type, []);
        }

        for (let i = 0; i < count; i++) {
          const instance = this.generateTreeInstance(type, zone);
          if (instance) {
            const typeInstances = this.instances.get(type);
            if (typeInstances) {
              typeInstances.push(instance);
            }
          }
        }
      });
    }

    // Log placement summary
    let total = 0;
    this.instances.forEach((instances, type) => {
      console.log(`  ✓ ${type}: ${instances.length} trees`);
      total += instances.length;
    });
    console.log(`✅ Total trees placed: ${total}`);
  }

  /**
   * Generate a single tree instance within a zone
   */
  private generateTreeInstance(
    treeType: string,
    zone: PlacementZone,
    maxAttempts: number = 30
  ): TreeInstance | null {
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

      // Valid position found
      // Base scale is 0.85, with 90-110% variation
      const baseScale = 0.85;
      return {
        treeType,
        position,
        rotation: Math.random() * Math.PI * 2,
        scale: baseScale * (0.9 + Math.random() * 0.2) // 76.5-93.5% of original size
      };
    }

    // Failed to find valid position after max attempts
    return null;
  }

  /**
   * Get all instances for a specific tree type
   */
  getInstances(treeType: string): TreeInstance[] {
    return this.instances.get(treeType) || [];
  }

  /**
   * Get all tree instances grouped by type
   */
  getAllInstances(): Map<string, TreeInstance[]> {
    return this.instances;
  }

  /**
   * Get total tree count
   */
  getTotalTreeCount(): number {
    let total = 0;
    this.instances.forEach(instances => {
      total += instances.length;
    });
    return total;
  }
}
