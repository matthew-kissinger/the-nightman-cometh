# The Nightman Cometh

A PSX-style survival horror game built with Three.js, TypeScript, and Vite.

**[Play Now](https://mattm.github.io/the-nightman-cometh/)**

## About

Survive the night in an isolated cabin deep in the woods. The Nightman stalks the forest - board up windows, chop trees for resources, and defend yourself until dawn.

## Features

- **PSX Aesthetic** - Dithering, fog, film grain, color grading
- **Survival Mechanics** - Chop trees, craft boards, barricade the cabin
- **Dynamic AI** - The Nightman stalks, follows, and flees based on player proximity
- **Atmospheric Audio** - Spatial sound, ambient forest, surface-based footsteps
- **Physics** - Rapier3D character controller with realistic movement

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Mouse | Look |
| Shift | Sprint |
| Space | Crouch |
| E | Interact |
| F | Toggle Flashlight |
| 1/2/3 | Switch Weapons (Flashlight/Hatchet/Shotgun) |
| Left Click | Use Weapon (Chop trees with hatchet) |
| TAB | Inventory |

## Development

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

## Tech Stack

- **Three.js** - 3D rendering
- **Rapier3D** - Physics simulation
- **TypeScript** - Type-safe development
- **Vite** - Build tool
- **BitECS** - Entity Component System

## Project Status

See [ROADMAP.md](ROADMAP.md) for detailed development progress.

## License

MIT
