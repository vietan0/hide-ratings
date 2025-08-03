export default [
  {
    input: 'src/background.js',
    output: {
      file: 'dist/background.js',
    },
  },
  {
    input: 'src/content.js',
    output: {
      file: 'dist/content.js',
    },
  },
  {
    input: 'src/popup/index.js',
    output: {
      file: 'dist/popup.js',
    },
  },
  {
    input: 'src/lichessContent.js',
    output: {
      file: 'dist/lichessContent.js',
    },
  },
];
