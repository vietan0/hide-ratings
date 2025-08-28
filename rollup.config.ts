import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig([

  {
    input: 'src/content.ts',
    output: {
      file: 'dist/content.js',
      sourcemap: true,
    },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/lichessContent.ts',
    output: {
      file: 'dist/lichessContent.js',
      sourcemap: true,
    },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/mainWorldScript.ts',
    output: {
      file: 'dist/mainWorldScript.js',
      sourcemap: true,
    },
    plugins: [typescript(), terser()],
  },
  {
    input: 'src/background.ts',
    output: {
      file: 'dist/background.js',
      sourcemap: true,
    },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/popup/index.ts',
    output: {
      file: 'dist/popup.js',
      sourcemap: true,
    },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
]);
