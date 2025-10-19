# FPS Controller Implementation Patterns

This directory contains curated, modern implementation patterns for building a first-person horror game controller with Three.js r180, Rapier3D physics, and TypeScript.

## Quick Start

**If you're building the FPS controller from scratch, start here:**

1. Read: [Complete FPS Controller Architecture](./complete-fps-controller-architecture.md) - Master reference with full implementation
2. Read: [Three.js + Rapier Integration](./threejs-rapier-integration.md) - Physics setup
3. Read: [PointerLockControls](./pointerlock-controls-threejs.md) - Camera control
4. Implement basic movement
5. Add: [Keyboard Input Management](./keyboard-input-state-management.md) - Input handling
6. Add: [Head Bob Effects](./head-bob-camera-effects.md) - Camera immersion
7. Polish: [PSX Horror Shaders](./psx-horror-shaders.md) - Visual style

## Documents Overview

### 🎯 Essential Reading (Start Here)

#### [Complete FPS Controller Architecture](./complete-fps-controller-architecture.md)
**Master implementation guide** - Production-ready TypeScript code combining all patterns into a complete system.

**Contains**:
- Complete source code for all layers
- Type definitions
- Integration examples
- File structure recommendations
- Implementation checklist

**Use this for**: Building the entire controller from scratch

---

#### [Three.js + Rapier Integration](./threejs-rapier-integration.md)
**Physics foundation** - Best practices for integrating Rapier physics with Three.js rendering.

**Contains**:
- WASM initialization patterns
- Rigid body creation
- Character controller setup
- Collision handling
- Sync patterns (physics ↔ rendering)

**Use this for**: Setting up physics world and character physics

---

#### [PointerLockControls - Three.js](./pointerlock-controls-threejs.md)
**Official FPS camera solution** - The standard Three.js way to implement first-person camera control.

**Contains**:
- Official Three.js PointerLockControls API
- Mouse look implementation
- Camera-relative movement
- Lock/unlock event handling
- TypeScript integration examples

**Use this for**: First-person camera and mouse controls

---

### 🎮 Input & Interaction

#### [Keyboard Input State Management](./keyboard-input-state-management.md)
**State-based input handling** - Proper keyboard input for games (not just event listeners).

**Contains**:
- KeyboardState class implementation
- Action mapping system
- Sprint/stamina integration
- Input normalization (diagonal movement)
- Window blur handling

**Use this for**: WASD movement, sprint key, jump, interact

---

### 🎬 Camera & Immersion

#### [Head Bob and Camera Effects](./head-bob-camera-effects.md)
**Natural movement feel** - Subtle camera effects that make first-person movement immersive.

**Contains**:
- Sine wave head bob formulas
- Velocity-based bobbing
- Sprint vs walk variations
- Breathing effects
- Horror-specific fear camera shake
- Accessibility considerations

**Use this for**: Making movement feel grounded and adding horror atmosphere

---

### 🎨 Visual Style

#### [PSX Horror Shaders](./psx-horror-shaders.md)
**Retro PlayStation aesthetic** - Recreating PS1-era graphics for horror games.

**Contains**:
- Vertex jitter (polygon wobbling)
- Affine texture mapping
- Dithering (Bayer matrix)
- Color posterization
- Post-processing implementation
- Shader patching techniques

**Use this for**: Creating that distinctive PSX horror look (Silent Hill, Resident Evil)

---

### 📚 Reference Examples

#### [FPS Sample Project - icurtis1](./threejs-rapier-fps-controller.md)
**Modern React Three Fiber example** - Complete FPS controller with Rapier physics.

**Key Takeaways**:
- Rapier CharacterController API usage
- Modern implementation patterns
- Smooth movement mechanics

**Note**: Uses R3F (React), adapt patterns to vanilla Three.js

---

#### [Kinematic Character Controller - doppl3r](./kinematic-character-controller-doppl3r.md)
**Vanilla Three.js implementation** - Clean entity architecture with Rapier KCC.

**Key Takeaways**:
- Entity-component architecture
- Factory pattern for game objects
- Pure Three.js (no React)
- Excellent code structure

**Note**: Directly applicable to our project

---

## Technology Stack

All patterns are designed for:

- **Three.js**: r170+ (ideally r180 - what we're using)
- **Rapier3D**: 0.14.0 (@dimforge/rapier3d-compat)
- **TypeScript**: 5.6.2
- **Postprocessing**: 6.36.4 (for effects)

## Pattern Selection Guide

### "I need to implement WASD movement"
→ Start with [Complete Architecture](./complete-fps-controller-architecture.md)
→ Reference [Keyboard Input](./keyboard-input-state-management.md)
→ Reference [PointerLockControls](./pointerlock-controls-threejs.md)

### "I need to add physics collision"
→ Read [Rapier Integration](./threejs-rapier-integration.md)
→ Check [Complete Architecture](./complete-fps-controller-architecture.md) for full example

### "I need stamina/sprint mechanics"
→ See PlayerController class in [Complete Architecture](./complete-fps-controller-architecture.md)
→ See stamina integration in [Keyboard Input](./keyboard-input-state-management.md)

### "I need natural camera movement"
→ Implement [Head Bob](./head-bob-camera-effects.md)
→ See integration in [Complete Architecture](./complete-fps-controller-architecture.md)

### "I need PSX retro graphics"
→ Follow [PSX Shaders](./psx-horror-shaders.md)
→ Integrate with our postprocessing library

### "I need to understand the big picture"
→ Read [Complete Architecture](./complete-fps-controller-architecture.md) top to bottom
→ Review architecture diagram
→ Follow implementation checklist

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up PhysicsWorld singleton
- [ ] Implement KeyboardState class
- [ ] Create InputManager with PointerLockControls
- [ ] Basic PlayerController with Rapier CharacterController
- [ ] Test basic WASD movement with collision

### Phase 2: Core Features (Week 2)
- [ ] Add stamina system
- [ ] Implement sprint mechanics
- [ ] Add jump functionality
- [ ] Create static environment with physics
- [ ] Test all movement mechanics

### Phase 3: Polish (Week 3)
- [ ] Add head bob camera effects
- [ ] Implement breathing camera effect
- [ ] Fine-tune movement speeds
- [ ] Fine-tune camera effect intensities
- [ ] Accessibility toggles

### Phase 4: Horror Atmosphere (Week 4)
- [ ] Implement PSX shader effects
- [ ] Add fear system
- [ ] Fear-based camera shake
- [ ] Footstep audio (synced to head bob)
- [ ] Environmental audio triggers

## Code Quality Standards

All patterns in this directory follow:

- ✅ **TypeScript** - Full type safety
- ✅ **Modern ES6+** - Classes, async/await, modules
- ✅ **Separation of Concerns** - Single responsibility principle
- ✅ **Configurable** - Exposed config objects
- ✅ **Documented** - Inline comments and examples
- ✅ **Tested Patterns** - Based on real-world implementations

## Community Resources

### GitHub Examples
- icurtis1/fps-sample-project - Modern FPS with Rapier
- doppl3r/kinematic-character-controller-example - Vanilla Three.js + Rapier
- viridia/demo-rapier-three - TypeScript Rapier integration
- jsantell/three-simple-fp-controls - Simple FPS controls

### Tutorials
- sbcode.net/threejs - Three.js tutorials (updated 2024)
- romanliutikov.com/blog/ps1-style-graphics-in-threejs - PSX shaders
- Codrops PSX tutorial - React Three Fiber PSX shaders (Sept 2024)

### Official Documentation
- Three.js r180 docs - threejs.org/docs
- Rapier3D JavaScript guide - rapier.rs/docs/user_guides/javascript
- PointerLockControls API - threejs.org/docs/examples/en/controls/PointerLockControls

## Contributing to These Patterns

Found a better implementation? Want to add new patterns?

1. Follow the existing document structure
2. Include working code examples
3. Cite sources
4. Explain relevance to the Nightman Cometh project
5. Test patterns before documenting

## License Notes

These documents compile patterns from various open-source projects and community resources. Individual implementations may have different licenses - always check source repositories before using production code.

Educational patterns and mathematical formulas are generally unrestricted.

---

**Last Updated**: 2024-10-19

**Project**: the-nightman-cometh (Horror Game)

**Tech Stack**: Three.js r180 + Rapier3D 0.14.0 + TypeScript 5.6.2
