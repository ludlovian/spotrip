import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.mjs',
  external: [
    'http',
    'fs',
    'stream',
    'child_process',
    'util',
    'events',
    'fs/promises',
    'stream/promises'
  ],
  plugins: [
    resolve(),
    commonjs(),
    json()
  ],
  output: [
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: false
    }
  ]
}
