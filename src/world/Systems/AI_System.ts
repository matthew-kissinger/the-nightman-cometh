import { defineQuery, IWorld } from 'bitecs';
import { AI, Transform, Velocity } from '../Components';

// Query for all entities with AI, Transform, and Velocity components
const aiQuery = defineQuery([AI, Transform, Velocity]);

/**
 * AI_System - Manages enemy AI behavior with XState FSM
 * TODO: Integrate XState state machines for AI behavior
 */
export function AI_System(world: IWorld, _deltaTime: number): void {
  const entities = aiQuery(world);

  for (const _eid of entities) {
    // TODO: Implement AI logic
    // - XState FSM (idle, patrol, hunt, attack states)
    // - Pathfinding using Rapier3D
    // - Line-of-sight checks using three-mesh-bvh
    // - Sound detection (player footsteps)
    // - Alertness system
    // - Attack behavior
    // - Update velocity for movement
  }
}
