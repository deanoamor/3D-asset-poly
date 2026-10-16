import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { output: { inlineDynamicImports: true } } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as import('vite').UserConfig);
