import * as THREE from 'three';

/**
 * FoliagePlacementCoordinator
 *
 * Coordinates placement of all foliage/props to prevent overlap:
 * - Trees
 * - Bushes
 * - Rocks/Props
 *
 * Maintains minimum spacing between different object types
 */

export interface PlacedObject {
  type: 'tree' | 'bush' | 'rock';
  position: THREE.Vector3;
  radius: number; // Collision radius for spacing
}

export class FoliagePlacementCoordinator {
  private placedObjects: PlacedObject[] = [];

  // Minimum spacing rules (in meters)
  private readonly minSpacing: Record<string, number> = {
    'tree-tree': 2.5,      // Trees need space (trunk radius + buffer)
    'tree-rock': 1.5,      // Rocks shouldn't touch tree trunks
    'tree-bush': 1.8,      // Bushes can be near trees but not overlapping
    'rock-rock': 1.0,      // Rocks can be close but not touching
    'rock-bush': 0.8,      // Bushes and rocks can be close
    'bush-bush': 1.2       // Bushes need some personal space
  };

  /**
   * Register a placed object
   */
  registerObject(obj: PlacedObject): void {
    this.placedObjects.push(obj);
  }

  /**
   * Check if a position is valid (not too close to other objects)
   */
  isValidPosition(
    position: THREE.Vector3,
    objectType: 'tree' | 'bush' | 'rock',
    radius: number
  ): boolean {
    for (const placed of this.placedObjects) {
      const distance = position.distanceTo(placed.position);
      const key = this.getSpacingKey(objectType, placed.type);
      const minDist = this.minSpacing[key] || 2.0; // Default 2m spacing

      // Combined radius check + minimum spacing
      const requiredDistance = radius + placed.radius + minDist;

      if (distance < requiredDistance) {
        return false; // Too close!
      }
    }

    return true; // All clear
  }

  /**
   * Get spacing key for two object types (order-independent)
   */
  private getSpacingKey(type1: string, type2: string): string {
    const sorted = [type1, type2].sort();
    return `${sorted[0]}-${sorted[1]}`;
  }

  /**
   * Get count of placed objects
   */
  getPlacedCount(): number {
    return this.placedObjects.length;
  }

  /**
   * Get count by type
   */
  getCountByType(type: 'tree' | 'bush' | 'rock'): number {
    return this.placedObjects.filter(obj => obj.type === type).length;
  }

  /**
   * Clear all placed objects (for regeneration)
   */
  clear(): void {
    this.placedObjects = [];
  }

  /**
   * Get all placed objects (for debugging)
   */
  getAllPlaced(): PlacedObject[] {
    return [...this.placedObjects];
  }
}
