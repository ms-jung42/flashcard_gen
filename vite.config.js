import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages
  base: '/flashcard_gen/',
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (needed for Tailscale/Mobile access)
    port: 5173,
  },
})
