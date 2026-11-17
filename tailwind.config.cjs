/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Segoe UI Variable',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'Cascadia Mono',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'ui-monospace',
          'monospace'
        ]
      }
    }
  },
  plugins: []
};
