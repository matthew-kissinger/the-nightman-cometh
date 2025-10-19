import glsl from 'vite-plugin-glsl';

export default {
  plugins: [glsl()],
  assetsInclude: ['**/*.glb', '**/*.hdr', '**/*.ktx2', '**/*.wav'],
  server: { open: true }
};
