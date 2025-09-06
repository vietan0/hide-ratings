import process from 'node:process';
import dotenv from 'dotenv';

// since this file is executed relative to manifest.json in dist/{browser}
dotenv.config({ path: '../../.env' });

export default {
  artifactsDir: '../../web-ext-artifacts',
  run: {
    startUrl: ['www.chess.com'],
    firefoxProfile: 'ext-dev',
    chromiumProfile: process.env.CHROMIUM_PROFILE,
  },
  sign: {
    channel: 'listed',
    apiKey: process.env.WEB_EXT_API_KEY,
    apiSecret: process.env.WEB_EXT_API_SECRET,
  },
  ignoreFiles: ['**/*.js.map'],
};
