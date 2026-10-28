import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configures React, Tailwind CSS, development, and Vitest.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Vitest uses jsdom to simulate a browser for component tests.
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
