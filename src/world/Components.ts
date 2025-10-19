import { defineComponent, Types } from 'bitecs';

// Transform component
export const Transform = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
  rotX: Types.f32,
  rotY: Types.f32,
  rotZ: Types.f32,
  scaleX: Types.f32,
  scaleY: Types.f32,
  scaleZ: Types.f32
});

// Velocity component
export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32
});

// Door component
export const Door = defineComponent({
  isOpen: Types.ui8, // 0 = closed, 1 = open
  openProgress: Types.f32, // 0.0 to 1.0
  isLocked: Types.ui8
});

// Board component (for boarding up windows/doors)
export const Board = defineComponent({
  isAttached: Types.ui8,
  health: Types.f32,
  targetEntityId: Types.eid
});

// AI component
export const AI = defineComponent({
  state: Types.ui8, // FSM state index
  targetX: Types.f32,
  targetY: Types.f32,
  targetZ: Types.f32,
  alertness: Types.f32, // 0.0 to 1.0
  hasLineOfSight: Types.ui8
});

// Camera rig component
export const CameraRig = defineComponent({
  targetX: Types.f32,
  targetY: Types.f32,
  targetZ: Types.f32,
  smoothing: Types.f32,
  headBobPhase: Types.f32
});

// Fog volume component
export const FogVolume = defineComponent({
  density: Types.f32,
  radius: Types.f32,
  r: Types.ui8,
  g: Types.ui8,
  b: Types.ui8
});

// Player component
export const Player = defineComponent({
  stamina: Types.f32,
  health: Types.f32,
  hasFlashlight: Types.ui8
});
