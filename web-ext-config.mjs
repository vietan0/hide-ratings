import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config();

export default {
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
  ignoreFiles: [
    'src/**/*.{js,ts}',
    '**/*.js.map',
    '**/*.md',
    '**/*config.{?(m|c)js,ts}',
    '**/!(manifest).json',
    'screenshots',
    'pnpm-lock.yaml',
  ],
};
