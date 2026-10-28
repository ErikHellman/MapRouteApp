import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative paths so the build works under /MapRouteApp/ on GitHub Pages
  base: './',
  plugins: [react()],
  build: {
    // mapbox-gl alone is about 1.7 MB minified
    chunkSizeWarningLimit: 2500,
  },
})
