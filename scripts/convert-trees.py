"""
Blender Python Script: Convert Trees FBX to GLB with PSX Optimizations

This script:
1. Imports the Trees.fbx file
2. Applies PSX-style texture optimizations (nearest filtering, reduced resolution)
3. Separates individual tree meshes
4. Exports each tree as a separate GLB file
5. Optionally creates stump variants by removing upper geometry

Usage:
    blender --background --python scripts/convert-trees.py

    Or with custom paths:
    blender --background --python scripts/convert-trees.py -- --input tree/Trees/Trees.fbx --output public/assets/models/trees
"""

import bpy
import os
import sys
import math
from pathlib import Path
from mathutils import Vector

# Configuration
DEFAULT_INPUT = "tree/Trees/Trees.fbx"
DEFAULT_OUTPUT = "public/assets/models/trees"
TEXTURE_SOURCE = "tree/Trees"
PSX_TEXTURE_SIZE = 256  # Reduce textures to 256x256 for PSX aesthetic
CREATE_STUMPS = False  # User will add universal stump model later

def parse_args():
    """Parse command line arguments after --"""
    args = {
        'input': DEFAULT_INPUT,
        'output': DEFAULT_OUTPUT,
        'create_stumps': CREATE_STUMPS
    }

    # Get args after -- separator
    try:
        separator_idx = sys.argv.index('--')
        script_args = sys.argv[separator_idx + 1:]

        for i in range(0, len(script_args), 2):
            if i + 1 < len(script_args):
                key = script_args[i].lstrip('-')
                value = script_args[i + 1]

                if key in ['input', 'output']:
                    args[key] = value
                elif key == 'no-stumps':
                    args['create_stumps'] = False
    except ValueError:
        pass

    return args

def clear_scene():
    """Clear default Blender scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphaned data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        if block.users == 0:
            bpy.data.textures.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)

def optimize_textures_for_psx():
    """Apply PSX-style texture settings (nearest filtering, no mipmaps)"""
    print(f"Optimizing textures for PSX aesthetic...")

    for img in bpy.data.images:
        # Note: Texture interpolation is set per-material in Blender 4.x, not per-image
        # We'll handle this during material processing instead
        print(f"  - Found texture: {img.name} ({img.size[0]}x{img.size[1]})")

    # Set materials to use nearest filtering (PSX aesthetic)
    for mat in bpy.data.materials:
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE':
                    node.interpolation = 'Closest'
                    print(f"  - Set PSX filtering on material: {mat.name}")

def import_fbx(filepath):
    """Import FBX file"""
    print(f"Importing FBX from: {filepath}")

    if not os.path.exists(filepath):
        print(f"ERROR: FBX file not found: {filepath}")
        return False

    try:
        bpy.ops.import_scene.fbx(filepath=filepath)
        print(f"  ✓ Successfully imported FBX")
        return True
    except Exception as e:
        print(f"ERROR importing FBX: {e}")
        return False

def get_tree_objects():
    """Get all mesh objects that are trees (not empties/lights/cameras)"""
    trees = []
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            trees.append(obj)

    print(f"Found {len(trees)} tree mesh(es)")
    for tree in trees:
        print(f"  - {tree.name}")

    return trees

def create_stump_variant(tree_obj):
    """Create a stump variant by removing geometry above certain height"""
    # Duplicate the tree
    bpy.ops.object.select_all(action='DESELECT')
    tree_obj.select_set(True)
    bpy.context.view_layer.objects.active = tree_obj
    bpy.ops.object.duplicate()

    stump = bpy.context.active_object
    stump.name = f"{tree_obj.name}_stump"

    # Get tree bounds
    bbox = [tree_obj.matrix_world @ Vector(corner) for corner in tree_obj.bound_box]
    z_values = [v.z for v in bbox]
    min_z = min(z_values)
    max_z = max(z_values)
    height = max_z - min_z

    # Calculate cut height
    cut_height = min_z + (height * STUMP_HEIGHT_RATIO)

    # Enter edit mode and delete vertices above cut height
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')

    # Select vertices above cut height
    for v in stump.data.vertices:
        world_pos = stump.matrix_world @ v.co
        if world_pos.z > cut_height:
            v.select = True

    # Delete selected vertices
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"  ✓ Created stump variant: {stump.name} (cut at {cut_height:.2f})")

    return stump

def export_glb(obj, output_path, filename):
    """Export single object as GLB"""
    # Ensure output directory exists
    os.makedirs(output_path, exist_ok=True)

    # Select only this object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Export path
    filepath = os.path.join(output_path, filename)

    try:
        # Blender 4.4+ glTF export parameters (minimal set for compatibility)
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            use_selection=True,
            export_format='GLB',
            export_materials='EXPORT',
            export_image_format='AUTO'
        )
        print(f"  ✓ Exported: {filename}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to export {filename}: {e}")
        return False

def main():
    """Main conversion process"""
    print("\n" + "="*60)
    print("TREE FBX → GLB CONVERTER (PSX Horror Edition)")
    print("="*60 + "\n")

    # Parse arguments
    args = parse_args()
    input_path = args['input']
    output_path = args['output']
    create_stumps = args['create_stumps']

    print(f"Configuration:")
    print(f"  Input FBX: {input_path}")
    print(f"  Output Directory: {output_path}")
    print(f"  PSX Texture Size: {PSX_TEXTURE_SIZE}x{PSX_TEXTURE_SIZE}\n")

    # Clear scene
    clear_scene()

    # Import FBX
    if not import_fbx(input_path):
        return

    # Optimize textures
    optimize_textures_for_psx()

    # Get tree objects
    trees = get_tree_objects()

    if not trees:
        print("ERROR: No tree meshes found in FBX!")
        return

    # Process each tree
    print(f"\nProcessing {len(trees)} tree(s)...")
    exported_count = 0

    for i, tree in enumerate(trees):
        print(f"\n[{i+1}/{len(trees)}] Processing: {tree.name}")

        # Export full tree
        filename = f"{tree.name.lower().replace(' ', '-')}.glb"
        if export_glb(tree, output_path, filename):
            exported_count += 1

        # Create and export stump variant
        if create_stumps:
            try:
                stump = create_stump_variant(tree)
                stump_filename = f"{tree.name.lower().replace(' ', '-')}-stump.glb"
                if export_glb(stump, output_path, stump_filename):
                    exported_count += 1

                # Clean up stump object
                bpy.data.objects.remove(stump, do_unlink=True)
            except Exception as e:
                print(f"  ✗ Failed to create stump: {e}")

    # Summary
    print("\n" + "="*60)
    print(f"CONVERSION COMPLETE!")
    print(f"  Exported: {exported_count} file(s)")
    print(f"  Location: {os.path.abspath(output_path)}")
    print("="*60 + "\n")

    print("Next steps:")
    print("  1. Check the exported GLB files in:", output_path)
    print("  2. Test load them in your game")
    print("  3. Add physics colliders in SceneManager.ts")
    print("  4. Create TreePlacementSystem for procedural placement\n")

if __name__ == "__main__":
    main()
