import process from 'node:process';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';

if (!process.env.BROWSER) {
  throw new Error('BROWSER is missing, must specify using --environment flag.');
}

const outDir = `dist/${process.env.BROWSER}`;

export default defineConfig([
  {
    input: 'baseManifest.json',
    output: { dir: 'dist' },
    plugins: [
      json(),
      copy({
        targets: [
          {
            src: 'baseManifest.json',
            dest: outDir,
            rename: 'manifest.json',
            transform: (contents) => {
              const manifest = JSON.parse(contents.toString());

              if (process.env.BROWSER === 'firefox') {
                delete manifest.background.service_worker;
              }
              else if (process.env.BROWSER === 'chrome') {
                delete manifest.background.scripts;
                delete manifest.browser_specific_settings;
              }

              return JSON.stringify(manifest, null, 2);
            },
          },
          { src: ['src/css', 'src/icons', 'src/images', 'src/popup'], dest: outDir },
        ],
      }),
      del({ targets: 'dist/baseManifest.js', hook: 'writeBundle' }),
    ],
  },
  {
    input: 'src/ts/content.ts',
    output: { dir: `${outDir}/js`, sourcemap: true },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/ts/background.ts',
    output: { dir: `${outDir}/js`, sourcemap: true },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/ts/popup.ts',
    output: { dir: `${outDir}/js`, sourcemap: true },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/ts/lichessContent.ts',
    output: { dir: `${outDir}/js`, sourcemap: true },
    plugins: [typescript(), nodeResolve(), commonjs(), terser()],
  },
  {
    input: 'src/ts/mainWorldScript.ts',
    output: { dir: `${outDir}/js`, sourcemap: true },
    plugins: [typescript(), terser()],
  },
]);
