import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  outDir: './dist',
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['zod'],
});
