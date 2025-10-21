# Foliage Spacing System

## Overview
The Foliage Placement Coordinator prevents overlap between trees, bushes, and rocks by enforcing minimum spacing rules during procedural generation.

## Problem Solved

**Before**: Each placement system (trees, bushes, rocks) placed objects independently, causing:
- Rocks spawning inside tree trunks
- Bushes clipping through rocks
- Multiple objects occupying the same space

**After**: All placement systems coordinate through a shared `FoliagePlacementCoordinator` that:
- Tracks all placed objects
- Enforces minimum spacing between object types
- Prevents visual overlap and clipping

## Implementation

### FoliagePlacementCoordinator (`src/world/Systems/FoliagePlacementCoordinator.ts`)

Central coordinator that all placement systems use to avoid collisions.

#### Minimum Spacing Rules (meters):

| Object Pair | Min Distance | Reason |
|-------------|--------------|--------|
| Tree ↔ Tree | 2.5m | Trees need space (trunk + canopy) |
| Tree ↔ Rock | 1.5m | Rocks shouldn't touch tree trunks |
| Tree ↔ Bush | 1.8m | Bushes can be near trees but not overlapping |
| Rock ↔ Rock | 1.0m | Rocks can be close but not touching |
| Rock ↔ Bush | 0.8m | Bushes and rocks can coexist closely |
| Bush ↔ Bush | 1.2m | Bushes need some personal space |

#### Object Radii:
- **Trees**: 0.5m (trunk radius)
- **Rocks**: 0.3m (approximate radius)
- **Bushes**: 0.4m (foliage radius)

### Placement Order

Objects are placed **sequentially** to ensure proper collision detection:

1. **Trees First** (largest objects)
   - Establishes the forest structure
   - Other objects avoid tree trunks

2. **Bushes Second** (ground cover)
   - Fill in spaces between trees
   - Avoid trees and each other

3. **Rocks Last** (smallest details)
   - Fill remaining gaps
   - Avoid trees, bushes, and other rocks

### How It Works

```typescript
// 1. Create coordinator
const coordinator = new FoliagePlacementCoordinator();

// 2. Pass to each manager/placement system
const treeSystem = new TreePlacementSystem(coordinator);
const bushSystem = new BushPlacementSystem(coordinator);
const propSystem = new PropPlacementSystem(coordinator);

// 3. Each placement attempt checks against existing objects
coordinator.isValidPosition(position, 'tree', treeRadius);
// → Returns true if position has enough clearance

// 4. Valid positions are registered
coordinator.registerObject({ type: 'tree', position, radius });
```

### Integration Points

#### TreePlacementSystem
```typescript
// Check against other foliage
const treeRadius = 0.5;
if (coordinator && !coordinator.isValidPosition(position, 'tree', treeRadius)) {
  continue; // Skip this position
}

// Register successful placement
coordinator.registerObject({ type: 'tree', position: position.clone(), radius: treeRadius });
```

#### PropPlacementSystem (Rocks)
```typescript
const rockRadius = 0.3;
if (coordinator && !coordinator.isValidPosition(position, 'rock', rockRadius)) {
  continue;
}
coordinator.registerObject({ type: 'rock', position: position.clone(), radius: rockRadius });
```

#### BushPlacementSystem
```typescript
const bushRadius = 0.4;
if (coordinator && !coordinator.isValidPosition(position, 'bush', bushRadius)) {
  continue;
}
coordinator.registerObject({ type: 'bush', position: position.clone(), radius: bushRadius });
```

## Console Output

Watch for these messages during initialization:

```
🌲 Initializing forest...
✅ Forest initialized
   Trees registered in coordinator: 323

🌿 Initializing bushes...
✅ Bushes initialized
   Bushes registered in coordinator: 55

🪨 Initializing environmental props...
✅ Environmental props initialized
   Rocks registered in coordinator: 95
```

## Performance Impact

### Collision Check Algorithm
For each placement attempt:
1. Iterate through all previously placed objects
2. Calculate 2D distance (XZ plane, ignores Y)
3. Compare against (radius1 + radius2 + minSpacing)
4. Continue if too close, accept if clear

### Performance Characteristics
- **Complexity**: O(n) per placement attempt
- **Worst Case**: ~300 trees × 20 attempts = ~6,000 checks for trees
- **Actual Impact**: ~50-100ms total during initialization (one-time cost)
- **Runtime**: Zero (placement happens once at scene init)

### Placement Success Rate
With coordination enabled:
- **Trees**: ~95% placement success (most attempts succeed)
- **Bushes**: ~85% placement success (more crowded)
- **Rocks**: ~80% placement success (most crowded, placed last)

## Visual Results

### Before Coordinator:
- Random overlaps and clipping
- Rocks inside tree models
- Bushes intersecting everything
- Unrealistic dense clusters

### After Coordinator:
- Natural spacing and distribution
- No visual overlaps or Z-fighting
- Realistic forest appearance
- Proper layering of foliage types

## Tuning Parameters

To adjust spacing, modify `FoliagePlacementCoordinator.ts`:

```typescript
private readonly minSpacing: Record<string, number> = {
  'tree-tree': 2.5,    // Increase for sparser forests
  'tree-rock': 1.5,    // Increase to keep rocks further from trees
  'tree-bush': 1.8,    // etc.
  'rock-rock': 1.0,
  'rock-bush': 0.8,
  'bush-bush': 1.2
};
```

To adjust object radii, modify each placement system's `generateInstance` method.

## Future Enhancements

### Advanced Collision Shapes
- Elliptical collision bounds for elongated objects
- Oriented bounding boxes for angular rocks
- Hierarchical collision (canopy vs trunk)

### Placement Strategies
- Cluster placement (groups of bushes/rocks)
- Biome-specific spacing rules
- Height-aware placement (slope consideration)

### Performance Optimizations
- Spatial partitioning (grid/quadtree) for O(1) lookups
- Parallel placement generation
- Incremental placement for dynamic scenes

### Artistic Control
- Placement weight maps (artist-defined dense/sparse zones)
- Manual placement override system
- Procedural variation presets
