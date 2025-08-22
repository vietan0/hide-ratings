import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'dist/content.js',
      sourcemap: true,
    },
    plugins: [typescript(), terser()],
  },
  {
    input: 'src/lichessContent.ts',
    output: {
      file: 'dist/lichessContent.js',
      sourcemap: true,
    },
    plugins: [typescript(), terser()],
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
    plugins: [typescript(), terser()],
  },
  {
    input: 'src/popup/index.ts',
    output: {
      file: 'dist/popup.js',
      sourcemap: true,
    },
    plugins: [typescript(), terser()],
  },
];
