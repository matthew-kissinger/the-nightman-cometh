"""
Blender Python Script: Convert Bushes FBX to GLB with PSX Optimizations

This script:
1. Imports bush FBX files (bush01-bush08)
2. Links corresponding textures
3. Applies PSX-style texture optimizations (nearest filtering)
4. Exports each bush as a separate GLB file

Usage:
    blender --background --python scripts/convert-bushes.py

    Or with custom paths:
    blender --background --python scripts/convert-bushes.py -- --input "tree_pack_1.1 (1)/tree_pack_1.1" --output public/assets/models/bushes
"""

import bpy
import os
import sys
from pathlib import Path

# Configuration
DEFAULT_INPUT = r"C:\Users\Mattm\X\the-nightman-cometh\tree_pack_1.1 (1)\tree_pack_1.1"
DEFAULT_OUTPUT = r"C:\Users\Mattm\X\the-nightman-cometh\public\assets\models\bushes"
BUSH_COUNT = 8  # bush01 through bush08

def parse_args():
    """Parse command line arguments after --"""
    args = {
        'input': DEFAULT_INPUT,
        'output': DEFAULT_OUTPUT
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
        print(f"  - Found texture: {img.name} ({img.size[0]}x{img.size[1]})")

    # Set materials to use nearest filtering (PSX aesthetic)
    for mat in bpy.data.materials:
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE':
                    node.interpolation = 'Closest'
                    print(f"  - Set PSX filtering on material: {mat.name}")

def load_texture(texture_path):
    """Load texture image if it exists"""
    if os.path.exists(texture_path):
        try:
            img = bpy.data.images.load(texture_path)
            print(f"  ✓ Loaded texture: {os.path.basename(texture_path)}")
            return img
        except Exception as e:
            print(f"  ✗ Failed to load texture {texture_path}: {e}")
            return None
    else:
        print(f"  ⚠ Texture not found: {texture_path}")
        return None

def import_bush_fbx(fbx_path, texture_path):
    """Import bush FBX and link texture"""
    print(f"Importing: {os.path.basename(fbx_path)}")

    if not os.path.exists(fbx_path):
        print(f"  ERROR: FBX file not found: {fbx_path}")
        return None

    try:
        # Clear scene before importing
        clear_scene()

        # Import FBX
        bpy.ops.import_scene.fbx(filepath=fbx_path)

        # Load and link texture
        texture_img = load_texture(texture_path)

        # Find the imported mesh
        mesh_obj = None
        for obj in bpy.data.objects:
            if obj.type == 'MESH':
                mesh_obj = obj
                break

        if not mesh_obj:
            print(f"  ERROR: No mesh found in FBX")
            return None

        # Link texture to material and enable alpha transparency
        if texture_img and mesh_obj.data.materials:
            for mat in mesh_obj.data.materials:
                if mat.use_nodes:
                    # Find or create image texture node
                    nodes = mat.node_tree.nodes
                    tex_node = None

                    for node in nodes:
                        if node.type == 'TEX_IMAGE':
                            tex_node = node
                            break

                    if not tex_node:
                        tex_node = nodes.new('ShaderNodeTexImage')
                        # Connect to principled BSDF
                        bsdf = nodes.get('Principled BSDF')
                        if bsdf:
                            mat.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])

                            # For MASK mode export, use Greater Than node (Blender 4.x requirement)
                            # This creates proper alphaMode: MASK in glTF
                            greater_than = nodes.new('ShaderNodeMath')
                            greater_than.operation = 'GREATER_THAN'
                            greater_than.inputs[1].default_value = 0.5  # Alpha threshold

                            # Connect: Texture Alpha -> Greater Than -> BSDF Alpha
                            mat.node_tree.links.new(tex_node.outputs['Alpha'], greater_than.inputs[0])
                            mat.node_tree.links.new(greater_than.outputs[0], bsdf.inputs['Alpha'])

                    # Assign texture
                    tex_node.image = texture_img

                    # Material settings for proper rendering
                    mat.use_backface_culling = False  # Disable backface culling for billboards
                    mat.show_transparent_back = True  # Show both sides

                    print(f"  ✓ Enabled alpha mask mode (Greater Than node) on material: {mat.name}")

        print(f"  ✓ Successfully imported: {mesh_obj.name}")
        return mesh_obj

    except Exception as e:
        print(f"  ERROR importing FBX: {e}")
        return None

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
        # Blender 4.4+ glTF export parameters
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
    print("BUSH FBX → GLB CONVERTER (PSX Horror Edition)")
    print("="*60 + "\n")

    # Parse arguments
    args = parse_args()
    input_base = args['input']
    output_path = args['output']

    models_dir = os.path.normpath(os.path.join(input_base, "models"))
    textures_dir = os.path.normpath(os.path.join(input_base, "textures"))

    print(f"Configuration:")
    print(f"  Input Directory: {input_base}")
    print(f"  Models Directory: {models_dir}")
    print(f"  Textures Directory: {textures_dir}")
    print(f"  Output Directory: {output_path}")
    print(f"  Processing {BUSH_COUNT} bushes\n")

    if not os.path.exists(models_dir):
        print(f"ERROR: Models directory not found: {models_dir}")
        return

    if not os.path.exists(textures_dir):
        print(f"ERROR: Textures directory not found: {textures_dir}")
        return

    # Process each bush
    exported_count = 0

    for i in range(1, BUSH_COUNT + 1):
        bush_num = f"{i:02d}"  # Format as 01, 02, etc.
        fbx_path = os.path.normpath(os.path.join(models_dir, f"bush{bush_num}.fbx"))
        texture_path = os.path.normpath(os.path.join(textures_dir, f"bush{bush_num}.png"))

        print(f"\n[{i}/{BUSH_COUNT}] Processing bush{bush_num}...")

        # Import bush with texture
        bush_obj = import_bush_fbx(fbx_path, texture_path)

        if not bush_obj:
            print(f"  ✗ Failed to import bush{bush_num}")
            continue

        # Apply PSX texture optimization
        optimize_textures_for_psx()

        # Export as GLB
        filename = f"bush{bush_num}.glb"
        if export_glb(bush_obj, output_path, filename):
            exported_count += 1

    # Summary
    print("\n" + "="*60)
    print(f"CONVERSION COMPLETE!")
    print(f"  Exported: {exported_count}/{BUSH_COUNT} bushes")
    print(f"  Location: {os.path.abspath(output_path)}")
    print("="*60 + "\n")

    print("Next steps:")
    print("  1. Validate GLB files in a viewer")
    print("  2. Create BushLoader.ts similar to TreeLoader")
    print("  3. Create BushPlacementSystem for procedural scattering")
    print("  4. Integrate into SceneManager\n")

if __name__ == "__main__":
    main()
