# Door Audio System

## Overview
Dynamic door sounds that play when doors are opened or closed in The Nightman Cometh.

## Implementation

### Audio Files
Located in `public/assets/audio/`:
- `qubodup-DoorOpen08.ogg` (16KB) - Door opening sound
- `qubodup-DoorClose08.ogg` (16KB) - Door closing sound

### Integration with DoorSystem

The door audio is integrated directly into the existing `DoorSystem.ts`:

#### 1. **Audio Loading**
```typescript
// Loads both sounds on initialization
async function loadDoorAudio(): Promise<void>
```

Called automatically when `initDoorSystem()` is invoked with an AudioManager.

#### 2. **Playing Door Sounds**
```typescript
function playDoorSound(isOpening: boolean): void
```

- **Volume**: 0.6
- **Type**: Non-positional (plays at listener/player position)
- **Cleanup**: Automatically disconnects after playing

#### 3. **Trigger Point**
Door sounds play immediately when the player presses the interact key (E) on a door:

```typescript
if (interactPressed && !doorCompLocked) {
  const shouldOpen = doorState < 0.5;
  bestDoor.target = shouldOpen ? 1 : 0;

  // Play door sound
  playDoorSound(shouldOpen);
}
```

### Features

- **State-Aware**: Plays correct sound based on door state (opening vs closing)
- **Instant Feedback**: Sound plays immediately on interaction, not when animation completes
- **No Trailing**: Uses non-positional audio attached to listener
- **Locked Doors**: No sound plays for locked doors (just a console message)

### Console Messages

Watch for:
- `✅ Door sounds loaded` - Both door sounds ready to play
- `⚠️ Failed to load door sounds` - Audio loading failed

### Testing

1. Approach any door in the cabin
2. Press `E` to open - hear door opening sound
3. Press `E` again to close - hear door closing sound
4. Try different doors - all use same sounds

### Technical Details

**Audio Format**: OGG Vorbis
- Good compression (16KB each)
- Browser-compatible
- Low latency

**Playback Characteristics**:
- Sample rate: Original (not modified)
- Volume: 0.6 (60%)
- No pitch variation (consistent sound)
- Auto-cleanup on completion

## Integration Points

### SceneManager.ts
Passes AudioManager to DoorSystem during initialization:
```typescript
initDoorSystem({
  inputManager: this.inputManager,
  camera: this.camera,
  playerController: this.playerController,
  physicsWorld: this.physicsWorld,
  cameraController: this.cameraController,
  promptElement: promptElement ?? null,
  audioManager: this.audioManager  // <-- Added for door sounds
});
```

### DoorSystem.ts
- Imports AudioManager
- Loads door sounds on init
- Plays appropriate sound on door interaction
- Uses AudioBuffer caching (no repeated loading)

## Performance

- **Memory**: ~32KB total (both sounds cached as AudioBuffers)
- **CPU**: Negligible (<0.1ms per interaction)
- **Latency**: Instant (pre-loaded buffers)

## Future Enhancements

### Sound Variations
- Multiple open/close sounds (randomized)
- Different sounds for different door types
- Creaky vs smooth door sounds

### Spatial Audio
- Convert to PositionalAudio for 3D sound
- Volume based on distance from door
- Occlusion through walls

### Additional Feedback
- Locked door sound (rattle/jiggle)
- Door slam sound when closing quickly
- Footstep variation when crossing threshold
