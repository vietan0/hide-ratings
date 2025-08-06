import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'dist/content.js',
      sourcemap: true,
    },
    plugins: [typescript()],
  },
  {
    input: 'src/lichessContent.ts',
    output: {
      file: 'dist/lichessContent.js',
      sourcemap: true,
    },
    plugins: [typescript()],
  },
  {
    input: 'src/background.ts',
    output: {
      file: 'dist/background.js',
      sourcemap: true,
    },
    plugins: [typescript()],
  },
  {
    input: 'src/popup/index.ts',
    output: {
      file: 'dist/popup.js',
      sourcemap: true,
    },
    plugins: [typescript()],
  },
  {
    input: 'sign.ts',
    output: {
      file: 'dist/sign.js',
      sourcemap: true,
    },
    plugins: [typescript(), json(), commonjs(), nodeResolve()],
  },
];
