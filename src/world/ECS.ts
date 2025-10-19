import { createWorld, IWorld } from 'bitecs';

// Create the ECS world
export const world: IWorld = createWorld();

// Pipeline for system execution
export const pipeline: Array<(world: IWorld, deltaTime: number) => void> = [];

// Execute all systems in the pipeline
export function executePipeline(deltaTime: number): void {
  for (const system of pipeline) {
    system(world, deltaTime);
  }
}

// Register a system to the pipeline
export function registerSystem(system: (world: IWorld, deltaTime: number) => void): void {
  pipeline.push(system);
}
