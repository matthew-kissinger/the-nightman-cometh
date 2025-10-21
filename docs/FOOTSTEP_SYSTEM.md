# Footstep Audio System

## Overview
Dynamic footstep system with left/right foot alternation, surface detection, and walk/run speed variation for The Nightman Cometh.

## Features

### 1. **Left-Right Foot Cadence**
- Alternates between `stepdirt_1.wav` (left) and `stepdirt_2.wav` (right) for dirt
- Alternates between `stepwood_1.wav` (left) and `stepwood_2.wav` (right) for wood
- Creates realistic walking rhythm

### 2. **Surface Detection**
- **Dirt**: Default outdoor surface
- **Wood**: Automatically detected when inside cabin bounds
- Smooth transitions between surfaces at doorways

### 3. **Walk vs Run**
- **Walking**:
  - Cadence: 500ms between steps
  - Volume: 0.5
  - Playback rate: 0.95-1.05x (slight random variation)
- **Running** (Shift key held):
  - Cadence: 300ms between steps (faster)
  - Volume: 0.7 (louder)
  - Playback rate: 1.1-1.2x (sounds faster and more urgent)

### 4. **3D Spatial Audio**
- Positional audio placed at player's feet (y=0.1)
- Reference distance: 1.0m
- Sounds originate from player position

## Implementation

### FootstepSystem Class (`src/world/Systems/FootstepSystem.ts`)

```typescript
// Initialize
const footstepSystem = new FootstepSystem(audioManager, scene);
await footstepSystem.loadSounds();

// Set cabin bounds for wood detection
footstepSystem.setCabinBounds(cabinBoundingBox);

// Update every frame
footstepSystem.update(
  deltaTime,
  playerPosition,
  isMoving,    // true if moveSpeed > 0.1
  isRunning    // true if Sprint key held
);
```

### Integration Points

#### SceneManager.ts
1. **Initialization**: Creates FootstepSystem on startup
2. **Cabin Loading**: Sets cabin bounds after model loads
3. **Update Loop**: Calls footstep system every frame with:
   - Player position from PlayerController
   - Movement state from move speed check
   - Sprint state from InputManager

#### PlayerController.ts
- Provides `getMoveSpeed()` - used to detect movement
- Provides `position` - used for spatial audio placement

#### InputManager.ts
- Provides `state.sprint` - used to detect running

## Audio Files

All footstep files are located in `public/assets/audio/`:

| File | Purpose | Format | Size |
|------|---------|--------|------|
| `stepdirt_1.wav` | Left foot on dirt | WAV | 93KB |
| `stepdirt_2.wav` | Right foot on dirt | WAV | 93KB |
| `stepwood_1.wav` | Left foot on wood | WAV | 93KB |
| `stepwood_2.wav` | Right foot on wood | WAV | 74KB |

**Note**: WAV format is used for low latency. File sizes are small enough for web delivery.

## Surface Detection Logic

### Cabin Bounds
```typescript
// Calculated when cabin loads
const box = new THREE.Box3().setFromObject(cabin);
box.expandByScalar(0.5); // Extra 0.5m for doorway transitions
```

### Detection Algorithm
```typescript
if (cabinBounds.containsPoint(playerPosition)) {
  currentSurface = 'wood';
} else {
  currentSurface = 'dirt';
}
```

This simple approach provides instant surface changes as the player crosses boundaries.

## Cadence Timing

The system uses `performance.now()` for accurate timing:

```typescript
const currentTime = performance.now() / 1000; // Convert to seconds
const cadence = isRunning ? 0.3 : 0.5; // 300ms or 500ms

if (currentTime - lastStepTime >= cadence) {
  playFootstep();
  lastStepTime = currentTime;
}
```

This ensures consistent footstep timing regardless of frame rate.

## Playback Rate Variation

### Walking
- Base rate: 0.95-1.05x
- Adds subtle variety to prevent repetitive sound
- Natural walking feel

### Running
- Base rate: 1.1-1.2x
- Sounds faster and more urgent
- Enhances the sense of speed

```typescript
if (isRunning) {
  sound.setPlaybackRate(1.1 + Math.random() * 0.1);
} else {
  sound.setPlaybackRate(0.95 + Math.random() * 0.1);
}
```

## Performance Considerations

### Audio Buffer Caching
- All 4 footstep sounds loaded once on startup
- Stored in `Map<string, AudioBuffer>`
- No repeated file loading during gameplay

### Positional Audio Cleanup
- Each footstep creates a temporary PositionalAudio node
- Automatically removed from scene when sound finishes
- No memory leaks

### CPU Impact
- Negligible: ~0.1-0.2ms per step
- Only processes when player is moving
- Simple containsPoint() check for surface detection

## Testing

### Manual Testing Checklist
1. **Basic Walking**:
   - [ ] Walk forward - hear regular footsteps
   - [ ] Footsteps alternate left/right (listen for variation)
   - [ ] Stop moving - footsteps stop immediately

2. **Running**:
   - [ ] Hold Shift - footsteps faster and louder
   - [ ] Release Shift - footsteps return to normal pace

3. **Surface Detection**:
   - [ ] Walk outside - hear dirt footsteps
   - [ ] Enter cabin - hear wood footsteps
   - [ ] Exit cabin - hear dirt footsteps again

4. **Movement Variations**:
   - [ ] Walk slowly (WASD tapped) - footsteps at regular pace
   - [ ] Sprint in circles - consistent fast footsteps
   - [ ] Walk backwards - same footstep behavior

### Debug Console Messages
Watch for these during initialization:
- `✅ Footstep sounds loaded` - All 4 sounds ready
- `🏠 Cabin bounds set for footstep detection` - Surface detection active

### Common Issues

**No footsteps heard:**
- Check browser console for audio loading errors
- Ensure pointer is locked (audio won't play until user interaction)
- Verify player is actually moving (moveSpeed > 0.1)

**Wrong surface sounds:**
- Cabin bounds may not be set (cabin not loaded yet)
- Check console for "Cabin bounds set" message

**Footsteps too fast/slow:**
- Adjust `walkCadence` and `runCadence` in FootstepSystem.ts
- Current values: 0.5s walk, 0.3s run

## Future Enhancements

### Additional Surfaces
- Grass (softer, muffled sounds)
- Stone (harder, echoey sounds)
- Metal (clanging sounds)
- Water (splashing sounds)

### Environmental Effects
- Reverb in enclosed spaces (cabin interior)
- Footstep volume based on crouch state (quieter when sneaking)
- Scuff sounds when changing direction quickly

### Gameplay Integration
- Attract AI enemies to loud footsteps
- Stealth mechanics (crouch = quieter footsteps)
- Stamina drain affects footstep volume/rate

### Advanced Audio
- HRTF for better 3D positioning
- Occlusion (walls muffle sound)
- Distance-based volume falloff curves
