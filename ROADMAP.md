# 🕯 THE NIGHTMAN COMETH - ROADMAP

> Building blocks to build a house (the perfect horror game)

---

## 🎯 Phase 1: Foundation - Controls & Physics
**Make it explorable**

- [ ] Mouse look controls (pointer lock, camera rotation)
- [x] WASD movement system
- [x] Rapier3D physics integration
-  - [x] Initialize physics world
-  - [x] Character capsule controller
-  - [ ] Cabin collision mesh
-  - [x] Ground collision
- [ ] Basic player entity in ECS
- [ ] Connect physics to camera movement

**Test:** Can walk around cabin and look freely

---

## 🌲 Phase 2: Environment - Setting the Scene
**Make it atmospheric**

### Assets to Add:
- [ ] Trees (5-10 low-poly variations)
- [ ] Grass/dirt ground texture
- [ ] Skybox (dark stormy night)
- [ ] Rocks, logs, foliage props
- [ ] Fog volume meshes

### Implementation:
- [ ] Replace ground plane with textured terrain
- [ ] Place trees around cabin (instancing)
- [ ] Add skybox or gradient dome
- [ ] Integrate custom fog shaders (fog.vert/frag)
- [ ] Scatter environmental props
- [ ] Tune post-processing effects
  - [ ] Adjust vignette darkness
  - [ ] Adjust film grain
  - [ ] Add chromatic aberration (subtle)
  - [ ] Tweak color grading for horror mood

**Test:** Feels like creepy cabin in the woods at night

---

## 🔦 Phase 3: Weapons & Flashlight (Viewmodels)
**Make it first-person**

### Assets to Add:
- [ ] Flashlight 3D model (low-poly, ~200 tris)
- [ ] Hatchet 3D model (low-poly, ~150-250 tris)
- [ ] Shotgun 3D model (low-poly, ~300-500 tris)
- [ ] Muzzle flash sprite
- [ ] Shell casing model

### Implementation:
- [ ] Install GSAP for procedural animations: `npm install gsap`
- [ ] Set up viewmodel camera layer system (dual camera rendering)
- [ ] Load flashlight model (always visible, left side of screen)
- [ ] Load weapon models (hatchet, shotgun - switchable)
- [ ] Position models in viewmodel space (no arm rigs needed)
- [ ] Weapon switching system (1=Flashlight only, 2=Hatchet, 3=Shotgun)
- [ ] Code-based animations (NO Blender):
  - [ ] Idle sway (GSAP continuous animation)
  - [ ] Walk bob (procedural sine wave)
  - [ ] Shotgun recoil (GSAP timeline)
  - [ ] Hatchet swing (GSAP timeline with arc)
  - [ ] Mouse sway (weapon follows camera movement)
- [ ] Flashlight improvements:
  - [ ] Sync Three.js spotlight with model position
  - [ ] Add volumetric light cone mesh
  - [ ] Add lens flare/glow effect
  - [ ] Flashlight toggle (F key) with sound
  - [ ] Optional: Battery drain mechanic

**Test:** Floating weapons feel authentic PSX style, animations smooth

---

## 🚪 Phase 4: Interaction & Combat
**Make it survival**

### Assets to Add:
- [ ] Wood board props (for windows)
- [ ] Impact particle effects
- [ ] Blood splatter sprites (optional)

### Implementation:
- [ ] **Weapon Mechanics**
  - [ ] Hatchet swing hitbox (sphere cast in front of player)
  - [ ] Hatchet damage to Nightman (if implemented)
  - [ ] Impact sound/visual effects
  - [ ] Shotgun raycast shooting
  - [ ] Shotgun damage/knockback
  - [ ] Muzzle flash effect
  - [ ] Shell ejection physics (optional cosmetic)
  - [ ] Ammo system (shells scattered in cabin)
  - [ ] Reload mechanic

- [ ] **Door Interaction System**
  - [ ] Proximity detection (raycast from camera)
  - [ ] E to open/close doors
  - [ ] Door swing animation (rotate on hinge)
  - [ ] Door sounds (creak, slam)
  - [ ] Track door state (open/closed/locked)

- [ ] **Window Boarding Mechanic**
  - [ ] E to board windows (when holding boards)
  - [ ] Board pickup system
  - [ ] Board attach to window frame
  - [ ] Track boarded state per window
  - [ ] Hammering sound effect
  - [ ] Stamina cost for boarding

**Test:** Can open doors, board windows, fight with weapons

---

## 👹 Phase 5: The Nightman - Character Import
**Make it scary**

### Assets to Add:
- [ ] Nightman character model (rigged, animated)
  - Idle, walk, run, attack, death animations
- [ ] Nightman textures (creepy/dark)
- [ ] Nightman sounds
  - Footsteps, breathing, growl, attack, death

### Implementation:
- [ ] Import Nightman GLB
- [ ] Test all animations
- [ ] Set up animation state machine (XState)
  - Idle → Investigate → Hunt → Attack → Retreat
- [ ] Position static Nightman in scene (testing)
- [ ] Add skeleton visualization (debug mode)
- [ ] Test pathfinding on navmesh

**Test:** Nightman visible, animations work, not AI yet

---

## 🧠 Phase 6: AI & Game Loop - Bring It Alive
**Make it a game**

### Implementation:
- [ ] **AI State Machine (XState)**
  - [ ] Idle state (wander forest)
  - [ ] Investigate state (heard noise)
  - [ ] Hunt state (spotted player)
  - [ ] Attack state (in range)
  - [ ] Retreat state (boards blocking)

- [ ] **Sound Detection System**
  - [ ] Player footsteps alert radius
  - [ ] Louder when sprinting
  - [ ] Door sounds attract

- [ ] **Line-of-Sight (three-mesh-bvh)**
  - [ ] Raycast from Nightman to player
  - [ ] Check occlusion (walls, boards)
  - [ ] Spot player through windows

- [ ] **Pathfinding (Rapier3D)**
  - [ ] Generate navmesh from cabin
  - [ ] A* pathfinding to player
  - [ ] Avoid obstacles

- [ ] **Combat System**
  - [ ] Hatchet damage to Nightman
  - [ ] Shotgun damage/knockback
  - [ ] Nightman attack damage player
  - [ ] Death animations

- [ ] **Board Breaking**
  - [ ] Nightman attacks boarded windows
  - [ ] Board health system
  - [ ] Break animation/sound

- [ ] **UI/HUD**
  - [ ] Health bar
  - [ ] Stamina bar
  - [ ] Ammo counter
  - [ ] Interaction prompts

- [ ] **Win/Lose Conditions**
  - [ ] Survive until dawn (timer)
  - [ ] Kill Nightman (victory)
  - [ ] Player death (game over)

- [ ] **Audio Atmosphere**
  - [ ] Ambient forest sounds
  - [ ] Tense music (dynamic)
  - [ ] 3D spatial audio

**Test:** Full playable horror game loop

---

## 📦 Asset Checklist

### 3D Models (GLB)
- [ ] Trees (×5-10 variations)
- [ ] Flashlight (low-poly, ~200 tris)
- [ ] Hatchet (low-poly, ~150-250 tris)
- [ ] Shotgun (low-poly, ~300-500 tris)
- [ ] Shell casing (optional)
- [ ] Nightman character
- [ ] Wood boards
- [ ] Environmental props (rocks, logs, grass)
- [ ] Terrain mesh

### Textures
- [ ] Ground texture (dirt/grass)
- [ ] Tree textures
- [ ] Skybox/gradient
- [ ] Nightman textures

### Audio
- [ ] Footsteps (wood, dirt, grass)
- [ ] Door sounds
- [ ] Weapon sounds
- [ ] Flashlight click
- [ ] Nightman sounds
- [ ] Ambient sounds
- [ ] Music

---

## 🎮 Current Status

**✅ Complete:**
- Cabin model loaded
- PSX rendering
- Post-processing (noise, vignette)
- Camera at front door
- ECS architecture

**🚧 In Progress:**
- Nothing (ready to start Phase 1)

**❌ Blocked:**
- No controls
- No physics
- No assets beyond cabin

---

## 🏗️ Build Strategy

**"Building blocks to build a house"**

1. **Block 1:** Controls + Physics = Can explore
2. **Block 2:** Environment = Feels scary
3. **Block 3:** Floating Weapons = Feels immersive (PSX style, no arm rigs)
4. **Block 4:** Interaction + Combat = Can defend
5. **Block 5:** Nightman = Has threat
6. **Block 6:** AI + Loop = IS A GAME

Each block tested before moving to next. Perfect horror game built one layer at a time.

**Note:** Using classic PSX floating weapon approach - no complex arm rigging needed. All animations done procedurally with GSAP in code.

---

**Next Step:** Start Phase 1 - Controls & Physics
