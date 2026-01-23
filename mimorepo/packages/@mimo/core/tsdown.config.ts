import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  outDir: './dist',
  dts: true,
  clean: false,
  sourcemap: true,
  external: ['eventemitter3', '@mimo/agent', '@mimo/bus', '@mimo/context', '@mimo/llm'],
});
