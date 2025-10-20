import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const loader = new GLTFLoader();

loader.load(
  'C:/Users/Mattm/X/the-nightman-cometh/rocks/rocks_-_psx_low_poly.glb',
  (gltf) => {
    console.log('\n🪨 ROCK GLB ANALYSIS\n');
    console.log('Scene structure:');

    const meshes = [];
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);

        meshes.push({
          name: child.name,
          vertices: geometry.attributes.position.count,
          triangles: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
          size: {
            x: size.x.toFixed(2),
            y: size.y.toFixed(2),
            z: size.z.toFixed(2)
          },
          hasMaterial: !!child.material,
          materialType: child.material?.type
        });
      }
    });

    console.log(`\nTotal meshes found: ${meshes.length}\n`);

    meshes.forEach((mesh, i) => {
      console.log(`[${i + 1}] ${mesh.name}`);
      console.log(`    Vertices: ${mesh.vertices}`);
      console.log(`    Triangles: ${Math.floor(mesh.triangles)}`);
      console.log(`    Size: ${mesh.size.x}m × ${mesh.size.y}m × ${mesh.size.z}m`);
      console.log(`    Material: ${mesh.materialType || 'None'}`);
      console.log('');
    });

    if (meshes.length === 5) {
      console.log('✅ Perfect! 5 rock variations detected.');
    } else {
      console.log(`⚠️  Expected 5 variations, found ${meshes.length}`);
    }

    process.exit(0);
  },
  undefined,
  (error) => {
    console.error('❌ Failed to load GLB:', error);
    process.exit(1);
  }
);
