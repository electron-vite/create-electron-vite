import * as esbuild from 'esbuild'

await esbuild.build({
  bundle: true,
  entryPoints: ['index.ts'],
  outfile: 'index.cjs',
  format: 'cjs',
  platform: 'node',
  target: 'node14'
})
