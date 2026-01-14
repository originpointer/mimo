import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/components/**/*.tsx',
    './src/lib/**/*.ts'
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom']
})
