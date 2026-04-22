import process from 'node:process';
import { defineConfig } from 'rolldown';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import copyWithWatch from './copyWithWatch';

if (!process.env.BROWSER) {
  throw new Error('BROWSER is missing, must specify using --environment flag.');
}

const outDir = `dist/${process.env.BROWSER}`;

export default defineConfig([
  {
    input: 'baseManifest.json',
    output: { dir: 'dist' },
    plugins: [
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
        ],
      }),
      del({ targets: 'dist/baseManifest.js', hook: 'writeBundle' }),
      copyWithWatch({
        targets: [
          { src: 'src/css/*', dest: `${outDir}/css` },
        ],
        hook: 'writeBundle',
      }),
      copyWithWatch({
        targets: [
          { src: 'src/popup/*', dest: `${outDir}/popup` },
        ],
        hook: 'writeBundle',
      }),
      copyWithWatch({
        targets: [
          { src: 'src/icons/*', dest: `${outDir}/icons` },
        ],
        hook: 'writeBundle',
      }),
      copyWithWatch({
        targets: [
          { src: 'src/images/*', dest: `${outDir}/images` },
        ],
        hook: 'writeBundle',
      }),
    ],
  },
  {
    input: 'src/ts/content.ts',
    output: { dir: `${outDir}/js`, minify: true },
  },
  {
    input: 'src/ts/background.ts',
    output: { dir: `${outDir}/js`, minify: true },
  },
  {
    input: 'src/ts/popup.ts',
    output: { dir: `${outDir}/js`, minify: true },
  },
  {
    input: 'src/ts/lichessContent.ts',
    output: { dir: `${outDir}/js`, minify: true },
  },
  {
    input: 'src/ts/mainWorldScript.ts',
    output: { dir: `${outDir}/js`, minify: true },
  },
]);
