import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.tsx',
    next: 'src/next.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  external: ['react', 'next', 'next/server'],
})
