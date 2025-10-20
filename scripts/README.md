# Tree Asset Conversion Guide

This guide explains how to convert your FBX tree models to GLB format for use in The Nightman Cometh.

## Prerequisites

**Install Blender:**
- Download from: https://www.blender.org/download/
- Minimum version: Blender 3.0 or higher
- Add Blender to your system PATH (optional, makes commands easier)

**Verify Installation:**
```bash
blender --version
```

## Quick Start

### Basic Conversion (Default Settings)

From your project root directory:

```bash
blender --background --python scripts/convert-trees.py
```

This will:
- ✅ Import `tree/Trees/Trees.fbx`
- ✅ Apply PSX texture optimizations (nearest filtering)
- ✅ Export each tree mesh as a separate GLB file
- ✅ Create stump variants for each tree
- ✅ Save to `public/assets/models/trees/`

### Custom Paths

Specify custom input/output paths:

```bash
blender --background --python scripts/convert-trees.py -- --input path/to/your/trees.fbx --output path/to/output
```

### Skip Stump Generation

If you don't want automatic stump variants:

```bash
blender --background --python scripts/convert-trees.py -- --no-stumps
```

## What the Script Does

### 1. **Import FBX**
- Loads `Trees.fbx` with all textures
- Imports all embedded meshes

### 2. **PSX Texture Optimization**
- Sets texture interpolation to `Closest` (pixelated, no smoothing)
- Disables mipmaps
- Preserves original texture files but applies PSX-style filtering

### 3. **Separate Tree Export**
- Identifies each tree mesh in the FBX
- Exports each as individual GLB file with embedded textures
- Naming: `tree-name.glb` (e.g., `tree-pine-01.glb`)

### 4. **Stump Variant Generation** (optional)
- Duplicates each tree
- Removes top 70% of geometry (keeps bottom 30%)
- Exports as `tree-name-stump.glb`

## Expected Output

After running the script, you should see:

```
public/assets/models/trees/
  ├── tree-1.glb           # Full tree
  ├── tree-1-stump.glb     # Chopped stump
  ├── tree-2.glb
  ├── tree-2-stump.glb
  └── ...
```

## Troubleshooting

### "blender: command not found"

**Windows:**
Add Blender to PATH or use full path:
```bash
"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe" --background --python scripts/convert-trees.py
```

**macOS:**
```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/convert-trees.py
```

**Linux:**
```bash
/usr/bin/blender --background --python scripts/convert-trees.py
```

### "FBX file not found"

Make sure you're running from the project root directory and the FBX exists:
```bash
ls tree/Trees/Trees.fbx  # Should show the file
```

### No tree meshes found

The FBX might contain only armatures/empties. Open it in Blender GUI to inspect:
```bash
blender tree/Trees/Trees.fbx
```

### Textures not embedded

Check that texture files exist in `tree/Trees/` and are referenced correctly in the FBX.

## Manual Alternative (GUI)

If you prefer using Blender GUI:

1. Open Blender
2. File → Import → FBX (.fbx)
3. Select `tree/Trees/Trees.fbx`
4. For each tree mesh:
   - Select the mesh
   - File → Export → glTF 2.0 (.glb)
   - Check "Selected Objects"
   - Check "Embed Textures"
   - Export Format: glTF Binary (.glb)
   - Save as `tree-name.glb`

## Next Steps

After conversion:

1. **Verify GLB files:**
   - Check `public/assets/models/trees/` for exported files
   - Use online viewer: https://gltf-viewer.donmccurdy.com/

2. **Integrate into game:**
   - Load in SceneManager.ts (similar to cabin.glb)
   - Add physics colliders
   - Create TreePlacementSystem for procedural placement

3. **Test in browser:**
   ```bash
   npm run dev
   ```

## Advanced Configuration

Edit `scripts/convert-trees.py` to customize:

```python
PSX_TEXTURE_SIZE = 256       # Texture resolution (128, 256, 512)
CREATE_STUMPS = True         # Auto-generate stumps
STUMP_HEIGHT_RATIO = 0.3     # Stump height (0.3 = 30% of tree)
```

## Performance Tips

- **Smaller textures = better performance**: Reduce `PSX_TEXTURE_SIZE` to 128 for more PSX authenticity
- **Instance trees**: Use Three.js InstancedMesh for many trees
- **LOD**: Create low-poly versions for distant trees
- **Culling**: Only render trees near the player

## Questions?

Check the main game documentation or the Three.js GLTFLoader docs:
- https://threejs.org/docs/#examples/en/loaders/GLTFLoader
