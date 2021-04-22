import { terser } from 'rollup-plugin-terser'
import cleanup from 'rollup-plugin-cleanup'
import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: 'src/index.js',
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
    json(),
    cleanup(),
    process.env.NODE_ENV === 'production' && terser()
  ],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: false
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: false
    }
  ]
}
