/**
 * Audio Map - Maps audio identifiers to file paths
 * Using properly encoded OGG files with libvorbis
 */

export type AudioCategory = 'combat' | 'nightman' | 'transformation' |
                            'environment' | 'items' | 'player' | 'ambient';

export interface AudioFile {
  path: string;
  category: AudioCategory;
}

export const AUDIO_MAP: Record<string, AudioFile> = {

  // AMBIENT
  'forest_night_loop': {
    path: '/assets/audio/optimized/ambient/forest_night_loop.ogg',
    category: 'ambient'
  },
  'stepdirt_1': {
    path: '/assets/audio/optimized/ambient/stepdirt_1.ogg',
    category: 'ambient'
  },
  'stepdirt_2': {
    path: '/assets/audio/optimized/ambient/stepdirt_2.ogg',
    category: 'ambient'
  },
  'stepwood_1': {
    path: '/assets/audio/optimized/ambient/stepwood_1.ogg',
    category: 'ambient'
  },
  'stepwood_2': {
    path: '/assets/audio/optimized/ambient/stepwood_2.ogg',
    category: 'ambient'
  },
  'wind_trees': {
    path: '/assets/audio/optimized/ambient/wind_trees.ogg',
    category: 'ambient'
  },

  // COMBAT
  'shotgun_empty': {
    path: '/assets/audio/optimized/combat/shotgun_empty.ogg',
    category: 'combat'
  },
  'hatchet_swing': {
    path: '/assets/audio/optimized/combat/hatchet_swing.ogg',
    category: 'combat'
  },
  'shotgun_fire': {
    path: '/assets/audio/optimized/combat/shotgun_fire.ogg',
    category: 'combat'
  },
  'shotgun_reload': {
    path: '/assets/audio/optimized/combat/shotgun_reload.ogg',
    category: 'combat'
  },

  // ENVIRONMENT
  'door_rattle': {
    path: '/assets/audio/optimized/environment/door_rattle.ogg',
    category: 'environment'
  },
  'door_pound': {
    path: '/assets/audio/optimized/environment/door_pound.ogg',
    category: 'environment'
  },
  'door_tap': {
    path: '/assets/audio/optimized/environment/door_tap.ogg',
    category: 'environment'
  },
  'door_massive_impact': {
    path: '/assets/audio/optimized/environment/door_massive_impact.ogg',
    category: 'environment'
  },
  'door_close': {
    path: '/assets/audio/optimized/environment/qubodup-DoorClose08.ogg',
    category: 'environment'
  },
  'door_open': {
    path: '/assets/audio/optimized/environment/qubodup-DoorOpen08.ogg',
    category: 'environment'
  },
  'door_scratch': {
    path: '/assets/audio/optimized/environment/door_scratch.ogg',
    category: 'environment'
  },
  'door_splinter': {
    path: '/assets/audio/optimized/environment/door_splinter.ogg',
    category: 'environment'
  },
  'board_shatter': {
    path: '/assets/audio/optimized/environment/board_shatter.ogg',
    category: 'environment'
  },

  // ITEMS
  'board_hammer': {
    path: '/assets/audio/optimized/items/board_hammer.ogg',
    category: 'items'
  },
  'pickup_ammo': {
    path: '/assets/audio/optimized/items/pickup_ammo.ogg',
    category: 'items'
  },
  'tree_fall': {
    path: '/assets/audio/optimized/items/tree_fall.ogg',
    category: 'items'
  },
  'pickup_wood': {
    path: '/assets/audio/optimized/items/pickup_wood.ogg',
    category: 'items'
  },

  // PLAYER
  'player_death': {
    path: '/assets/audio/optimized/player/player_death.ogg',
    category: 'player'
  },
  'player_hurt_light': {
    path: '/assets/audio/optimized/player/player_hurt_light.ogg',
    category: 'player'
  },
  'player_hurt_heavy': {
    path: '/assets/audio/optimized/player/player_hurt_heavy.ogg',
    category: 'player'
  },
  'player_heartbeat': {
    path: '/assets/audio/optimized/player/player_heartbeat.ogg',
    category: 'player'
  },

  // TRANSFORMATION
  'transform_whoosh': {
    path: '/assets/audio/optimized/transformation/transform_whoosh.ogg',
    category: 'transformation'
  },
  'transform_bones_final': {
    path: '/assets/audio/optimized/transformation/transform_bones_final.ogg',
    category: 'transformation'
  },
  'transform_bones_break': {
    path: '/assets/audio/optimized/transformation/transform_bones_break.ogg',
    category: 'transformation'
  },
  'transform_rumble': {
    path: '/assets/audio/optimized/transformation/transform_rumble.ogg',
    category: 'transformation'
  },
  'transform_bones_snap': {
    path: '/assets/audio/optimized/transformation/transform_bones_snap.ogg',
    category: 'transformation'
  },

  // NIGHTMAN (monster sounds - for future use)
  'nightman_growl': {
    path: '/assets/audio/optimized/nightman/nightman_growl.ogg',
    category: 'nightman'
  },
  'nightman_footsteps': {
    path: '/assets/audio/optimized/nightman/nightman_footsteps.ogg',
    category: 'nightman'
  },
  'nightman_impact': {
    path: '/assets/audio/optimized/nightman/nightman_impact.ogg',
    category: 'nightman'
  },
  'nightman_arm_swing': {
    path: '/assets/audio/optimized/nightman/nightman_arm_swing.ogg',
    category: 'nightman'
  },
  'nightman_death': {
    path: '/assets/audio/optimized/nightman/nightman_death.ogg',
    category: 'nightman'
  },
  'nightman_stomp': {
    path: '/assets/audio/optimized/nightman/nightman_stomp.ogg',
    category: 'nightman'
  },
  'nightman_pain': {
    path: '/assets/audio/optimized/nightman/nightman_pain.ogg',
    category: 'nightman'
  },
  'nightman_hunt': {
    path: '/assets/audio/optimized/nightman/nightman_hunt.ogg',
    category: 'nightman'
  },
};

export function getAudioPath(key: string): string {
  const audio = AUDIO_MAP[key];
  if (!audio) {
    console.warn(`Audio file not found: ${key}`);
    return '';
  }
  return audio.path;
}

export function getAudiosByCategory(category: AudioCategory): AudioFile[] {
  return Object.values(AUDIO_MAP).filter(a => a.category === category);
}
