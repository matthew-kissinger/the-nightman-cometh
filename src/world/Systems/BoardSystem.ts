import { defineQuery, IWorld } from 'bitecs';
import { Board, Transform } from '../Components';

// Query for all entities with Board and Transform components
const boardQuery = defineQuery([Board, Transform]);

/**
 * BoardSystem - Handles boarding up windows/doors
 * TODO: Implement boarding mechanic, damage, and removal
 */
export function BoardSystem(world: IWorld, _deltaTime: number): void {
  const entities = boardQuery(world);

  for (const _eid of entities) {
    // TODO: Implement board logic
    // - Check board health
    // - Handle board placement
    // - Handle board damage from AI
    // - Update visual state
    // - Play hammering sounds
  }
}
