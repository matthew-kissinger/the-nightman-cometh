# Cabin Model Documentation

**File:** `public/assets/models/cabin.glb`
**Generator:** THREE.GLTFExporter r180
**File Size:** 5.2 MB
**Extensions:** KHR_texture_transform

## Overview

Small single-room cabin with bedroom, fireplace, and porch. Suitable for horror game environment.

## Dimensions

- **Width:** 6.6 meters (-3.3 to 3.3 on X-axis)
- **Height:** 3.8 meters (0 to 3.8 on Y-axis)
- **Depth:** 7.4 meters (-2.8 to 4.6 on Z-axis)
- **Origin:** Centered at world (0, 0, 0)
- **Ground Level:** Y = 0

## Geometry Statistics

- **Total Meshes:** 65
- **Total Vertices:** 1,560 (uploaded), 2,340 (rendered)
- **Primitives:** All triangles
- **Mesh Size:** ~840 bytes per mesh (very optimized)

## Materials (6 total)

| # | Name | Instances | Texture | Alpha Mode |
|---|------|-----------|---------|------------|
| 0 | `Brick_Mat` | 8 | baseColorTexture | OPAQUE |
| 1 | `Foundation_Mat` | 2 | baseColorTexture | OPAQUE |
| 2 | `Floor_Mat` | 1 | baseColorTexture | OPAQUE |
| 3 | `Wood_Mat` | 49 | baseColorTexture | OPAQUE |
| 4 | `Roof_Mat` | 2 | baseColorTexture | OPAQUE |
| 5 | `Door_Mat` | 3 | baseColorTexture | OPAQUE |

## Textures (6 total)

All textures are **1024x1024 PNG**, embedded in GLB:

| Material | Texture Size | GPU Memory |
|----------|-------------|------------|
| Brick | 1.77 MB | 5.59 MB |
| Foundation | 892 KB | 5.59 MB |
| Floor | 629 KB | 5.59 MB |
| Wood | 1.52 MB | 5.59 MB |
| Roof | 82 KB | 5.59 MB |
| Door | 343 KB | 5.59 MB |

**Total:** ~5.3 MB compressed, ~33.5 MB GPU memory

## Interactive Objects

### Doors (3)

| Name | Position | Rotation | Notes |
|------|----------|----------|-------|
| `Geo_Door_Front` | (-0.93, 1.025, 2.478) | -90° Y | Main entrance, faces south |
| `Geo_Door_Back` | (-0.53, 1.025, -2.478) | -90° Y | Back exit, faces north |
| `Geo_Door_Bedroom` | (0.448, 1.025, -0.475) | +90° Y | Interior bedroom door |

**Door Dimensions:** ~2.05m tall x 1.2m wide
**Door Pivot:** Left side (hinges on left)

### Door Jambs/Frames

| Location | Objects | Position |
|----------|---------|----------|
| Front Door | `Geo_FrontDoorJambL`, `Geo_FrontDoorJambR`, `Geo_FrontDoorHeader` | (-0.4, various, 2.425) |
| Back Door | `Geo_BackDoorJambL`, `Geo_BackDoorJambR`, `Geo_BackDoorHeader` | (0, various, -2.425) |
| Bedroom Door | `Geo_InteriorDoorJambFront`, `Geo_InteriorDoorJambBack`, `Geo_InteriorHeader` | (0.5, various, -0.525 to 0.525) |

### Windows (6 total)

| Location | Objects | Position | Can Board? |
|----------|---------|----------|------------|
| Front Window | `Geo_FrontWindowJambA`, `Geo_FrontWindowJambB`, `Geo_FrontWindowBase`, `Geo_FrontWindowTop` | (-1.8, 1.475, 2.425) | Yes |
| Left Side Window 1 | `Geo_LeftJambA_0`, `Geo_LeftJambB_0` | (-2.925, 1.475, -1.4) | Yes |
| Left Side Window 2 | `Geo_LeftJambA_1`, `Geo_LeftJambB_1` | (-2.925, 1.475, 1.2) | Yes |
| Right Side Window 1 | `Geo_RightJambA`, `Geo_RightJambB` | (2.925, 1.475, 0.4) | Yes |
| Back Side Windows | Via jambs in back wall | Various | Yes |

**Window Height:** ~1.0-1.5m above ground
**Window Width:** ~1.3m typical

## Structure Breakdown

### Foundation & Floor
- `Geo_Foundation` - Stone foundation at (0, 0.11, 0.8)
- `Geo_Floor` - Interior wood floor at (0, 0.16, 0)
- `Geo_PorchFloor` - Exterior porch at (0, 0.12, 3.3)
- `Geo_PorchStep` - Entry step at (0, 0.09, 4.35)

### Walls

**Back Wall:**
- `Geo_BackPlate*` - Upper/lower plates (structural)
- `Geo_BackPanel*` - Wall panels
- `Geo_BackJamb*` - Window frames

**Left Wall:**
- `Geo_LeftPlate*` - Upper/lower plates
- `Geo_LeftPanel*` - Wall panels (front, middle, back sections)
- Two window openings with jambs

**Right Wall:**
- `Geo_RightPlate*` - Upper/lower plates
- `Geo_RightPanel*` - Wall panels
- One window opening

**Front Wall:**
- `Geo_FrontPanel*` - Wall panels (left, middle, right)
- Main door opening
- One window opening

**Interior Wall:**
- `Geo_BedroomConnectingWall` - Divides main room from bedroom at (1.75, 1.4, -0.55)
- `Geo_InteriorSegment*` - Interior door frame segments

### Roof & Ceiling
- `Geo_Beam1-4` - Four ceiling support beams at Y=2.52
  - Beam1: Z=-2.5
  - Beam2: Z=-0.833
  - Beam3: Z=0.833
  - Beam4: Z=2.5
- `Geo_Roof` - Main cabin roof at (0, 2.8, 0)
- `Geo_PorchRoof` - Porch overhang at (0, 2.55, 3.3)

### Porch
- `Geo_PostLeft` - Support post at (-2.1, 1.315, 3.95)
- `Geo_PostRight` - Support post at (2.1, 1.315, 3.95)
- Posts are ~2.6m tall

### Fireplace
- `Geo_FireplaceHearth` - Base platform at (-1.25, 0.025, -2.19)
- `Geo_FireplaceBack` - Back wall at (-1.25, 0.6, -2.29)
- `Geo_FireplaceBackStack` - Upper chimney at (-1.25, 1.975, -2.29)
- `Geo_FireplaceSideLeft` - Left wall at (-1.79, 0.6, -2.21)
- `Geo_FireplaceSideRight` - Right wall at (-0.71, 0.6, -2.21)
- `Geo_FireplaceLintel` - Mantle beam at (-1.25, 1.09, -2.13)
- `Geo_FireplaceFloor` - Hearth floor at (-1.25, 0.11, -2.21)
- `Geo_Chimney` - Exterior chimney at (-1.25, 2.415, -2.21)

**Fireplace Opening:** ~1.08m wide x ~1.0m tall
**Location:** Back-left corner of cabin

## Layout & Rooms

### Main Room
- **Area:** ~20 square meters
- **Features:** Fireplace, front window, main entrance
- **Bounds:** X: -3.3 to 1.75, Z: -2.8 to 4.6

### Bedroom
- **Area:** ~8 square meters
- **Features:** Separate room with door
- **Bounds:** X: 1.75 to 3.3, Z: -2.8 to 0.5
- **Access:** Interior door at X=0.5

### Porch
- **Area:** ~13 square meters
- **Features:** Covered entrance, two support posts
- **Bounds:** X: -2.1 to 2.1, Z: 2.5 to 4.6

## Camera Positions

### Recommended Starting Position
```typescript
// Front door entrance (looking at door from outside)
camera.position.set(-0.4, 1.6, 4.5);
camera.lookAt(-0.4, 1.6, 2.4);
```

### Other Key Positions
```typescript
// Inside main room, facing fireplace
camera.position.set(0, 1.6, 0);
camera.lookAt(-1.25, 1.0, -2.2);

// Bedroom entrance
camera.position.set(1.0, 1.6, -0.5);

// Back door exit
camera.position.set(-0.5, 1.6, -3.0);
```

## Collision Setup

### Floor Plane
- Y = 0.16 (interior)
- Y = 0.12 (porch)

### Wall Thickness
- Exterior walls: ~0.5m thick
- Interior wall: ~0.1m thick

### Ceiling Height
- Main room: 2.52m to beams
- Peak: ~3.8m at roof center

### Door Clearances
- Height: 2.05m
- Width: 1.2m
- Threshold: 0.1m

## AI Pathfinding Navmesh Recommendations

### Walkable Areas
1. **Main Room:** (-3.0, 0.16, -2.5) to (1.5, 0.16, 2.0)
2. **Bedroom:** (1.8, 0.16, -2.5) to (3.0, 0.16, 0.0)
3. **Porch:** (-2.0, 0.12, 2.5) to (2.0, 0.12, 4.3)

### Doorway Connections
- Front door: (-0.4, 0.16, 2.425) - links porch to main room
- Back door: (-0.53, 0.16, -2.478) - exterior exit
- Bedroom door: (0.5, 0.16, -0.5) - links main room to bedroom

### Avoidance Zones
- Fireplace: (-1.8, 0, -2.5) to (-0.7, 0, -2.0)
- Support posts: circular, radius 0.15m at listed positions

## Usage in Code

```typescript
// Store door references for interaction
const doors = {
  front: scene.getObjectByName('Geo_Door_Front'),
  back: scene.getObjectByName('Geo_Door_Back'),
  bedroom: scene.getObjectByName('Geo_Door_Bedroom')
};

// Store window jambs for boarding system
const windowJambs = [];
scene.traverse((obj) => {
  if (obj.name.includes('Jamb') && obj.name.includes('Window')) {
    windowJambs.push(obj);
  }
});

// Access specific materials for dynamic changes
const woodMaterial = materials.Wood_Mat;
woodMaterial.roughness = 0.8; // Make wood less shiny
```

## Notes for Gameplay

- **Front door is offset to the left** - position camera at X=-0.4, not X=0
- **All doors swing left** - rotation pivot is on left jamb
- **Windows are at eye level** - easy boarding mechanic positioning
- **Fireplace is functional space** - could add fire particle effects
- **Porch provides covered area** - safe zone from rain/fog effects
- **Bedroom is separate** - good for horror game isolation moments
- **Support beams at 2.52m** - potential for headbump if player jumps

## Future Enhancements

Potential additions (would need new GLB or separate props):
- Window glass planes (currently open)
- Boarded window meshes
- Door handles/knobs
- Interior furniture
- Fireplace logs/fire
- Porch railing
- Curtains
