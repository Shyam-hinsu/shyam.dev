import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// VITE_BASE lets the same build run at the domain root ("/") or under a
// repository path on GitHub Pages ("/shyam.dev/"). See .github/workflows/deploy.yml.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue'],
        },
      },
    },
  },
})
