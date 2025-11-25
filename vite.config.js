import glsl from 'vite-plugin-glsl';

export default {
  plugins: [glsl()],
  assetsInclude: ['**/*.glb', '**/*.hdr', '**/*.ktx2', '**/*.wav', '**/*.ogg'],
  server: { open: true },
  base: '/the-nightman-cometh/'
};
