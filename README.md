# 🕯 the-nightman-cometh

A PSX-style horror game built with Vite, TypeScript, Three.js, and Bitecs ECS.

## Stack

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Three.js r180** - 3D rendering
- **Bitecs** - Entity Component System
- **Rapier3D** - Physics simulation
- **XState** - Finite state machines for AI
- **three-mesh-bvh** - Line-of-sight and occlusion
- **postprocessing** - Post-processing effects chain
- **tweakpane** - Debug UI and config panel
- **vite-plugin-glsl** - Custom shader support

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
the-nightman-cometh/
├── public/
│   ├── assets/
│   │   ├── models/      # Place cabin.glb here
│   │   ├── textures/
│   │   ├── audio/
│   │   └── particles/
│   └── shaders/
│       ├── fog.vert     # Custom fog vertex shader
│       └── fog.frag     # Custom fog fragment shader
├── src/
│   ├── main.ts          # Entry point
│   ├── world/
│   │   ├── SceneManager.ts  # Three.js scene setup
│   │   ├── ECS.ts           # ECS world and pipeline
│   │   ├── Components.ts    # ECS components
│   │   └── Systems/         # ECS systems
│   ├── utils/
│   │   ├── loaders.ts   # Asset loaders
│   │   ├── shaders.ts   # Shader utilities
│   │   └── soundBus.ts  # Audio management
│   ├── config/          # Configuration files
│   └── ui/              # Debug UI
└── index.html
```

## Features (Planned)

- ✅ PSX-style rendering (low res, no AA, film grain)
- ✅ Post-processing (vignette, noise/grain)
- ✅ Flashlight spotlight with shadows
- ✅ ECS architecture with Bitecs
- 🚧 Door system (open/close/lock)
- 🚧 Board system (board up windows)
- 🚧 Fog system (volumetric fog)
- 🚧 Camera rig (smooth movement, head bob)
- 🚧 AI system (XState FSM, pathfinding, LOS)
- 🚧 Physics (Rapier3D)
- 🚧 Sound system (spatial audio)

## Development Notes

- The cabin model should be placed at `/public/assets/models/cabin.glb`
- Custom fog shaders are in `/public/shaders/` (currently placeholders)
- All ECS systems have TODO comments marking implementation areas
- The build prints "🕯 the-nightman-cometh scaffold ready" on successful initialization

## License

MIT
