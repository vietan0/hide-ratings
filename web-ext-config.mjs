import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config();

export default {
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
