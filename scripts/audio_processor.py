#!/usr/bin/env python3
"""
Audio Processor for The Nightman Cometh
Analyzes, optimizes, and compresses audio files for web game deployment
"""

import os
import glob
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Tuple

# Audio categories based on AUDIO_LIST.md
AUDIO_CATEGORIES = {
    'combat': [
        'shotgun_fire', 'shotgun_empty', 'shotgun_reload',
        'hatchet_swing', 'hatchet_hit_flesh', 'hatchet_miss',
        'Heavy_double-barrel', 'Dry_click_of_empty', 'Shotgun_shell_loadin',
        'Fast_whoosh_sound'
    ],
    'nightman': [
        'nightman_footstep_heavy', 'nightman_footstep_light',
        'nightman_growl_low', 'nightman_growl_aggressive',
        'nightman_attack_swing', 'nightman_attack_hit',
        'nightman_damaged', 'nightman_death',
        'Massive_creature_foo', 'Heavy_human-sized_fo',
        'Deep_guttural_monste', 'guttural_demon_hunti',
        'Massive_creature_arm', 'Heavy_impact_of_mons',
        'Monster_pain_roar', 'Massive_creature_dyi'
    ],
    'transformation': [
        'bone_crack_1', 'bone_crack_2', 'bone_crack_3',
        'transformation_whoosh', 'transformation_complete',
        'Wet_bone_snapping', 'Multiple_bones_break',
        'Final_massive_bone', 'Dark_ethereal_whoosh',
        'Ominous_low_rumble'
    ],
    'environment': [
        'window_tap_light', 'window_tap_heavy', 'window_scratch',
        'window_break', 'door_creak', 'door_rattle',
        'door_bang_heavy', 'door_splinter',
        'Light_tapping_on_woo', 'Heavy_pounding_on_wo',
        'Sharp_claws_scratchi', 'wooden_board_shatter',
        'Door_handle_rattling', 'Massive_impact_on_wo',
        'Wood_door_splinterin', 'qubodup-DoorClose08',
        'qubodup-DoorOpen08'
    ],
    'items': [
        'ammo_pickup', 'wood_pickup', 'board_hammer',
        'pickup_ammo_sound', 'wood_pickup_sound',
        'Hammering_nail_into', 'tree_falls_down'
    ],
    'player': [
        'player_hit_light', 'player_hit_heavy',
        'player_death', 'player_heartbeat',
        'Male_grunt_of_pain', 'Male_scream_of_agony',
        'Male_death_scream', 'Realistic_heartbeat'
    ],
    'ambient': [
        'forest_night_loop', 'wind_trees',
        'cabin_ambience', 'nightman_roar_distant',
        'stepdirt_1', 'stepdirt_2', 'stepwood_1', 'stepwood_2'
    ]
}

# Optimization settings per category
OPTIMIZATION_PROFILES = {
    'combat': {
        'format': 'ogg',
        'bitrate': '96k',  # High quality for impact
        'sample_rate': 44100,
        'channels': 1,  # Mono for SFX
        'normalize': True,
        'compression': 'vorbis',
        'quality': 6  # 0-10, 6 = ~96kbps
    },
    'nightman': {
        'format': 'ogg',
        'bitrate': '80k',  # Good quality for creature sounds
        'sample_rate': 44100,
        'channels': 1,
        'normalize': True,
        'compression': 'vorbis',
        'quality': 5
    },
    'transformation': {
        'format': 'ogg',
        'bitrate': '96k',  # Higher quality for dramatic effect
        'sample_rate': 44100,
        'channels': 1,
        'normalize': True,
        'compression': 'vorbis',
        'quality': 6
    },
    'environment': {
        'format': 'ogg',
        'bitrate': '64k',  # Medium quality for ambient
        'sample_rate': 44100,
        'channels': 1,
        'normalize': True,
        'compression': 'vorbis',
        'quality': 4
    },
    'items': {
        'format': 'ogg',
        'bitrate': '64k',
        'sample_rate': 44100,
        'channels': 1,
        'normalize': True,
        'compression': 'vorbis',
        'quality': 4
    },
    'player': {
        'format': 'ogg',
        'bitrate': '80k',
        'sample_rate': 44100,
        'channels': 1,
        'normalize': True,
        'compression': 'vorbis',
        'quality': 5
    },
    'ambient': {
        'format': 'ogg',
        'bitrate': '96k',  # Higher for loops
        'sample_rate': 44100,
        'channels': 2,  # Stereo for ambient
        'normalize': False,  # Keep dynamic range
        'compression': 'vorbis',
        'quality': 6
    }
}


def analyze_audio_file(filepath: str) -> Dict:
    """Analyze audio file using ffprobe"""
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filepath
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)

        if 'streams' in data and len(data['streams']) > 0:
            stream = data['streams'][0]
            format_info = data.get('format', {})

            return {
                'file': os.path.basename(filepath),
                'size_kb': os.path.getsize(filepath) / 1024,
                'codec': stream.get('codec_name', 'unknown'),
                'sample_rate': int(stream.get('sample_rate', 0)),
                'channels': stream.get('channels', 0),
                'bitrate': int(format_info.get('bit_rate', 0)) // 1000 if 'bit_rate' in format_info else 0,
                'duration': float(format_info.get('duration', 0))
            }
    except Exception as e:
        print(f"Error analyzing {filepath}: {e}")
        return None


def categorize_file(filename: str) -> str:
    """Determine which category a file belongs to"""
    for category, keywords in AUDIO_CATEGORIES.items():
        for keyword in keywords:
            if keyword.lower() in filename.lower():
                return category
    return 'ambient'  # Default


def optimize_audio_file(input_path: str, output_path: str, profile: Dict) -> bool:
    """Convert and optimize audio file using ffmpeg"""
    try:
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-y',  # Overwrite output
            '-acodec', 'libvorbis',
            '-ac', str(profile['channels']),
            '-ar', str(profile['sample_rate']),
            '-q:a', str(profile['quality']),
        ]

        # Add normalization filter
        if profile['normalize']:
            cmd.extend(['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11'])

        cmd.append(output_path)

        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0

    except Exception as e:
        print(f"Error optimizing {input_path}: {e}")
        return False


def create_audio_sprite_manifest(files: List[Tuple[str, Dict]]) -> Dict:
    """Generate manifest for audio sprite (multiple sounds in one file)"""
    manifest = {
        'resources': {},
        'spritemap': {}
    }

    current_time = 0.0
    for filepath, info in files:
        if info and info['duration'] > 0:
            filename = Path(filepath).stem
            manifest['spritemap'][filename] = {
                'start': current_time,
                'end': current_time + info['duration'],
                'loop': False
            }
            current_time += info['duration'] + 0.1  # 100ms padding

    return manifest


def main():
    print("="*80)
    print("AUDIO PROCESSOR - The Nightman Cometh")
    print("="*80)

    # Setup paths
    audio_dir = Path('public/assets/audio')
    output_dir = Path('public/assets/audio/optimized')
    output_dir.mkdir(parents=True, exist_ok=True)

    # Analyze all existing audio files
    print("\nAnalyzing existing audio files...")
    print("-"*80)

    audio_files = list(audio_dir.glob('*.wav')) + list(audio_dir.glob('*.ogg'))
    analysis_results = []
    total_size_before = 0

    for filepath in sorted(audio_files):
        info = analyze_audio_file(str(filepath))
        if info:
            analysis_results.append((str(filepath), info))
            total_size_before += info['size_kb']

            category = categorize_file(info['file'])
            print(f"{info['file']:50s} | {info['size_kb']:8.1f} KB | "
                  f"{info['codec']:8s} | {info['sample_rate']}Hz | "
                  f"{info['channels']}ch | [{category}]")

    print("-"*80)
    print(f"Total files: {len(analysis_results)}")
    print(f"Total size: {total_size_before:.1f} KB ({total_size_before/1024:.2f} MB)")

    # Optimize files
    print("\nOptimizing audio files...")
    print("-"*80)

    total_size_after = 0
    optimized_files = []

    for filepath, info in analysis_results:
        category = categorize_file(info['file'])
        profile = OPTIMIZATION_PROFILES[category]

        # Generate output filename
        input_path = Path(filepath)
        output_filename = input_path.stem + '.ogg'
        output_path = output_dir / category / output_filename
        output_path.parent.mkdir(parents=True, exist_ok=True)

        print(f"Processing: {info['file']}")
        print(f"  Category: {category}")
        print(f"  Profile: {profile['bitrate']} {profile['channels']}ch {profile['sample_rate']}Hz")

        if optimize_audio_file(str(filepath), str(output_path), profile):
            optimized_size = os.path.getsize(output_path) / 1024
            total_size_after += optimized_size
            compression_ratio = (1 - optimized_size / info['size_kb']) * 100

            print(f"  [OK] {info['size_kb']:.1f} KB -> {optimized_size:.1f} KB "
                  f"({compression_ratio:+.1f}%)")

            optimized_files.append({
                'original': info['file'],
                'optimized': str(output_path.relative_to(Path('public/assets/audio'))),
                'category': category,
                'size_before': info['size_kb'],
                'size_after': optimized_size
            })
        else:
            print(f"  [FAIL] Failed to optimize")

    print("-"*80)
    print(f"\nOptimization Results:")
    print(f"  Total size before: {total_size_before:.1f} KB ({total_size_before/1024:.2f} MB)")
    print(f"  Total size after:  {total_size_after:.1f} KB ({total_size_after/1024:.2f} MB)")
    print(f"  Space saved:       {total_size_before - total_size_after:.1f} KB "
          f"({(1 - total_size_after/total_size_before)*100:.1f}%)")

    # Generate manifest
    print("\nGenerating audio manifest...")
    manifest = {
        'version': '1.0',
        'files': optimized_files,
        'categories': AUDIO_CATEGORIES,
        'total_files': len(optimized_files),
        'total_size_kb': total_size_after
    }

    manifest_path = output_dir / 'audio_manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"[OK] Manifest saved to: {manifest_path}")

    # Generate TypeScript mapping
    print("\nGenerating TypeScript audio map...")
    ts_content = generate_typescript_map(optimized_files)
    ts_path = Path('src/audio/AudioMap.ts')
    with open(ts_path, 'w') as f:
        f.write(ts_content)
    print(f"[OK] TypeScript map saved to: {ts_path}")

    print("\n[OK] Audio processing complete!")


def generate_typescript_map(files: List[Dict]) -> str:
    """Generate TypeScript file with audio mappings"""

    # Group by category
    by_category = {}
    for file in files:
        category = file['category']
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(file)

    ts = """/**
 * Audio Map - Generated by audio_processor.py
 * Maps audio file identifiers to optimized file paths
 */

export type AudioCategory = 'combat' | 'nightman' | 'transformation' |
                            'environment' | 'items' | 'player' | 'ambient';

export interface AudioFile {
  path: string;
  category: AudioCategory;
  originalSize: number;
  optimizedSize: number;
}

export const AUDIO_MAP: Record<string, AudioFile> = {
"""

    for category, category_files in sorted(by_category.items()):
        ts += f"\n  // {category.upper()}\n"
        for file in category_files:
            # Create a clean key from the filename
            key = file['original'].replace('.wav', '').replace('.ogg', '')
            # Clean up the generated filenames
            key = key.replace('#1-', '').replace('#2-', '').replace('#3-', '').replace('#4-', '')
            key = key.replace('_#', '')

            ts += f"  '{key}': {{\n"
            ts += f"    path: '/assets/audio/{file['optimized']}',\n"
            ts += f"    category: '{category}',\n"
            ts += f"    originalSize: {file['size_before']:.1f},\n"
            ts += f"    optimizedSize: {file['size_after']:.1f}\n"
            ts += f"  }},\n"

    ts += """};

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
"""

    return ts


if __name__ == '__main__':
    main()
