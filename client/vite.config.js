import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configures Vite for frontend development, production builds, and tests.
export default defineConfig({
  plugins: [react()],

  // Vitest uses jsdom to simulate a browser for component tests.
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
