# GLB Model Import Workflow

This document explains how to analyze and import GLB/GLTF models into the game.

## Tools Used

### 1. **gltf-transform CLI** (Primary Analysis Tool)
```bash
npx @gltf-transform/cli inspect path/to/model.glb
```

**What it provides:**
- Scene hierarchy and bounding box dimensions
- Mesh count, vertex count, material usage
- Texture information (resolution, size, GPU memory)
- Materials breakdown
- Animation data (if any)

**Key information to extract:**
- **Bounding box** (min/max) - for positioning and collision
- **Center point** - where the model origin is
- **Mesh count** - performance impact
- **Texture sizes** - memory usage
- **Material names** - for runtime material swapping

### 2. **gltfjsx** (Node Structure Export)
```bash
npx gltfjsx path/to/model.glb --output structure.txt
```

**What it provides:**
- Complete node hierarchy with names
- All mesh names (critical for finding doors, windows, etc.)
- Material assignments per mesh
- Transform data (position, rotation) for each object
- TypeScript types for the model

**Why this is important:**
- You can identify specific objects by name (e.g., `Geo_Door_Front`)
- Provides exact positions for interactive elements
- Shows parent-child relationships in the scene graph

## Workflow Steps

### Step 1: Place GLB File
```bash
# Models go in public/assets/models/
public/assets/models/cabin.glb
public/assets/models/enemy.glb
public/assets/models/props.glb
```

### Step 2: Analyze with gltf-transform
```bash
npx @gltf-transform/cli inspect public/assets/models/cabin.glb
```

**Extract from output:**
- Scene bounding box (bboxMin, bboxMax)
- Total mesh/vertex count
- Material names
- Texture count and sizes

### Step 3: Get Node Structure
```bash
npx gltfjsx public/assets/models/cabin.glb --output cabin-structure.txt
```

**Look for in output:**
- Object names containing keywords: `door`, `window`, `trigger`, `spawn`
- Position data for important objects
- Material assignments

### Step 4: Document Key Findings

Create a companion `.md` file for the model:

```markdown
# cabin.glb Structure

## Dimensions
- Size: 6.6m (W) x 3.8m (H) x 7.4m (D)
- Bounding Box: (-3.3, 0, -2.8) to (3.3, 3.8, 4.6)
- Origin: Centered at world (0, 0, 0)

## Interactive Objects
- **Front Door**: `Geo_Door_Front` at (-0.4, 1.025, 2.425)
- **Back Door**: `Geo_Door_Back` at (-0.53, 1.025, -2.478)
- **Bedroom Door**: `Geo_Door_Bedroom` at (0.448, 1.025, -0.475)
- **Front Window**: `Geo_FrontWindowJambA/B` at (-2.47, 1.475, 2.425)
- **Left Windows**: `Geo_LeftJambA_0/1`, `Geo_LeftJambB_0/1`
- **Right Windows**: `Geo_RightJambA/B`

## Materials
1. **Brick_Mat** - Fireplace, chimney (8 instances)
2. **Foundation_Mat** - Foundation, porch step (2 instances)
3. **Floor_Mat** - Interior floor (1 instance)
4. **Wood_Mat** - Walls, beams, planks (49 instances)
5. **Roof_Mat** - Roof panels (2 instances)
6. **Door_Mat** - All doors (3 instances)

## Textures
- 6 textures total, all 1024x1024 PNG
- ~5.3 MB total, ~33.5 MB GPU memory
```

### Step 5: Load in Three.js

```typescript
const gltfLoader = new GLTFLoader();

gltfLoader.load(
  '/assets/models/cabin.glb',
  (gltf) => {
    const model = gltf.scene;

    // Enable shadows
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Position if needed (cabin is pre-centered at origin)
    // model.position.set(x, y, z);

    scene.add(model);
    console.log('Model loaded:', gltf);
  },
  (progress) => {
    const percent = (progress.loaded / progress.total) * 100;
    console.log(`Loading: ${percent.toFixed(0)}%`);
  },
  (error) => {
    console.error('Load error:', error);
  }
);
```

### Step 6: Reference Specific Nodes

```typescript
// After loading, access specific nodes by name
gltfLoader.load('/assets/models/cabin.glb', (gltf) => {
  const cabin = gltf.scene;
  const nodes = gltf.nodes;
  const materials = gltf.materials;

  // Find specific door mesh
  const frontDoor = cabin.getObjectByName('Geo_Door_Front');
  if (frontDoor) {
    // Now you can interact with this specific door
    frontDoor.userData.canOpen = true;
    frontDoor.userData.isLocked = false;
  }

  // Modify specific material
  const doorMaterial = materials.Door_Mat;
  if (doorMaterial) {
    doorMaterial.roughness = 0.8;
    doorMaterial.metalness = 0.1;
  }

  scene.add(cabin);
});
```

## Tips

### Finding Interactive Objects
When analyzing the structure output, search for keywords:
- `door` - Entry points
- `window` - Boarding locations
- `trigger` - Event zones
- `spawn` - Enemy/item spawn points
- `jamb` - Door/window frames (for collision)
- `floor` - Walk surfaces
- `wall` - Collision surfaces

### Performance Optimization
```bash
# Compress/optimize GLB files
npx gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --resize 1024,1024
```

### Camera Positioning
Use bounding box data to position camera:
```typescript
// Place camera at front entrance
// If front is at Z=2.425, add 2-3 meters for outside view
camera.position.set(doorX, eyeHeight, doorZ + 2.0);
```

### Door/Window Detection Pattern
```typescript
model.traverse((child) => {
  const name = child.name.toLowerCase();
  if (name.includes('door')) {
    console.log('Door:', child.name, 'at', child.position);
    // Store for interaction system
  }
  if (name.includes('window') || name.includes('jamb')) {
    console.log('Window:', child.name, 'at', child.position);
    // Store for boarding system
  }
});
```

## Common Issues

### Issue: Model too large/small
**Solution:** Check bounding box dimensions. Scale uniformly:
```typescript
model.scale.setScalar(0.1); // Make 10x smaller
```

### Issue: Model oriented incorrectly
**Solution:** Rotate to face correct direction:
```typescript
model.rotation.y = Math.PI; // 180 degrees
```

### Issue: Textures not loading
**Solution:** Check console for 404 errors. Textures should be embedded in GLB.

### Issue: Can't find objects by name
**Solution:** Log all names first:
```typescript
model.traverse((obj) => {
  if (obj.name) console.log(obj.name, obj.type);
});
```

## Export Settings (For 3D Artists)

When exporting from Blender/Maya:
- **Format:** glTF 2.0 Binary (.glb)
- **Include:** Selected Objects only
- **Transform:** +Y Up
- **Geometry:** Apply Modifiers, UVs, Normals, Vertex Colors
- **Materials:** Export materials + textures
- **Compression:** Embed textures in GLB
- **Naming:** Use clear prefixes (`Geo_`, `Prop_`, `Trigger_`)

## Reference: cabin.glb Analysis

See `docs/CABIN_MODEL.md` for complete cabin structure documentation.
