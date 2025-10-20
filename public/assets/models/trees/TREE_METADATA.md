# Tree Asset Metadata

Active trees for "The Nightman Cometh" horror game.

## Active Trees (5 variants)

### Tree 1 - `tree_1.glb` (196 KB)
- **Size**: Largest file size, likely most detailed/tallest
- **Polygon Count**: ~2 primitives
- **Materials**: Branch + Wood textures
- **Recommended Use**: Hero tree, sparse placement
- **Density**: LOW (5-10 per zone)
- **Characteristics**: High detail, use for prominent/foreground placement

---

### Tree 3 - `tree_3.glb` (104 KB)
- **Size**: Medium
- **Polygon Count**: ~2 primitives
- **Materials**: Branch + Wood textures
- **Recommended Use**: Standard forest tree
- **Density**: MEDIUM (15-25 per zone)
- **Characteristics**: Balanced detail, good for mid-ground

---

### Tree 4 - `tree_4.glb` (104 KB)
- **Size**: Medium (same as tree_3)
- **Polygon Count**: ~2 primitives
- **Materials**: Branch + Wood textures
- **Recommended Use**: Standard forest tree (variation)
- **Density**: MEDIUM (15-25 per zone)
- **Characteristics**: Similar to tree_3, use for variety

---

### Tree 6 - `tree_6.glb` (316 KB)
- **Size**: LARGEST - Most detailed/complex
- **Polygon Count**: ~2 primitives (but higher poly)
- **Materials**: Branch + Wood textures
- **Recommended Use**: Special landmark trees, very sparse
- **Density**: VERY LOW (1-3 per zone)
- **Characteristics**: Highest detail, use near cabin or key locations
- **Performance**: May impact FPS if too many instances

---

### Tree 7 - `tree_7.glb` (80 KB)
- **Size**: Smallest/lightest
- **Polygon Count**: ~2 primitives
- **Materials**: Branch + Wood textures
- **Recommended Use**: Background/distance trees, dense forests
- **Density**: HIGH (30-50 per zone)
- **Characteristics**: Low poly, optimized for many instances

---

## Placement Strategy

### Near Cabin (High Detail Zone)
- 1-2x Tree 6 (landmark trees)
- 3-5x Tree 1 (prominent trees)
- 5-10x Tree 3/4 (forest variation)
- 10-15x Tree 7 (background filler)

### Mid-Range Forest (200m radius)
- 0-1x Tree 6 (occasional landmark)
- 5-10x Tree 1 (sparse detail)
- 20-30x Tree 3/4 (main forest)
- 40-60x Tree 7 (dense background)

### Far Forest/Fog Zone (Performance Optimized)
- 0x Tree 6 (skip heavy trees)
- 0-5x Tree 1 (minimal detail trees)
- 10-15x Tree 3/4 (sparse mid-detail)
- 50-80x Tree 7 (dense fog forest effect)

---

## Technical Details

**All trees include:**
- Embedded textures (PNG/JPG)
- PSX-style nearest filtering applied
- Branch textures: Various sizes (145-457px wide)
- Wood bark textures: 176-256px
- 2 mesh primitives per tree (trunk + foliage)
- Ready for physics collider attachment

**Texture Variants Used:**
- Branch: Branch_05, Branch_07, Branch_08, Branch_10, Branch_11, Branch_12, Branch_13
- Wood: Wood, Wood_01, Wood_03, Wood_04, Wood_05, Wood_09, Wood_14

**Performance Notes:**
- Use Three.js `InstancedMesh` for repeated trees (tree_7 especially)
- Consider LOD: Use tree_7 as low-poly version for all tree types at distance
- Frustum culling: Only render trees in camera view
- Fog culling: Trees beyond fog end distance can be skipped

---

## Archived Trees

The following trees were excluded from the game:
- `archive/tree.glb` (156 KB)
- `archive/tree_2.glb` (89 KB)
- `archive/tree_5.glb` (81 KB)

These can be restored if needed for additional variety.

---

## Future Additions

- Universal stump model (to be added)
- Chopped tree mechanic (swap full tree → stump on interaction)
- Dead/burnt tree variants (optional)
- Seasonal variants (optional - winter/autumn)
