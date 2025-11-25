# The Nightman Cometh - Development Roadmap

## Phase 1: Foundation ✅ COMPLETE
- [x] Rapier3D physics (character controller, collisions)
- [x] Mouse look controls (PointerLock)
- [x] WASD movement with sprint/crouch
- [x] ECS architecture (BitECS)

## Phase 2: Environment ✅ COMPLETE
- [x] Cabin model with collision meshes
- [x] Forest (200+ trees, bushes, rocks)
- [x] Ground textures (grass/dirt)
- [x] Atmospheric fog
- [x] Wind system (tree sway)
- [x] PSX post-processing (dithering, grain, vignette, color grading)

## Phase 3: Weapons ✅ COMPLETE
- [x] Viewmodel system (flashlight, hatchet, shotgun)
- [x] Weapon switching (1/2/3 keys)
- [x] Procedural sway and bob
- [x] Volumetric flashlight with toggle (F key)
- [x] Shotgun firing with muzzle flash
- [x] Hatchet swing animation

## Phase 4: Interaction ✅ COMPLETE
- [x] Door system (open/close with physics)
- [x] Tree chopping (hatchet + wood drops)
- [x] Inventory system (wood, boards, shells)
- [x] Crafting (wood to boards)
- [x] Boarding system (windows/doors)
- [x] Firepit (burn wood for protection)
- [x] Ammo pickups

## Phase 5: The Nightman ✅ COMPLETE
- [x] Character model loaded (22k tris, rigged)
- [x] Animation system (idle, walk, run)
- [x] Basic stalking AI behavior
  - [x] Follows player from distance (~12 units)
  - [x] Flees when player gets too close (~6 units)
  - [x] Smooth animation crossfading
  - [x] Faces movement direction

## Phase 6: Game Loop (In Progress)
- [x] Audio system (ambient, footsteps, combat sounds)
- [x] UI/HUD (health, stamina, ammo, inventory)
- [ ] Combat damage system
- [ ] Win/lose conditions
- [ ] Pathfinding (navmesh)
- [ ] Advanced AI (line-of-sight, sound detection)

## Current Status
The game is playable with core survival mechanics. The Nightman stalks the forest with basic AI behavior. Combat and win/lose conditions are next.
