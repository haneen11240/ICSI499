import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'popup.js',
        background: 'background.js'
      },
      output: {
        entryFileNames: '[name].bundle.js'
      }
    }
  }
});