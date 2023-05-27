import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import pkg from './package.json'

const watch = process.argv.slice(2).includes('--watch')

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: !watch,
    target: 'node14',
    lib: {
      entry: 'src/index',
      formats: ['es'],
      fileName: () => '[name].mjs',
    },
    rollupOptions: {
      external: [
        'electron',
        'vite',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...Object.keys('dependencies' in pkg ? pkg.dependencies as object : {}),
      ],
    },
  },
})
