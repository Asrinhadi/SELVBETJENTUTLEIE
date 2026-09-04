/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Preview-serveren sender ellers «Access-Control-Allow-Origin: *», som lar
  // hvilken som helst nettside lese dokumentet med fetch. Ufarlig for en
  // offentlig demo, men det motsier resten av headersettet.
  preview: { cors: false },
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/ },
            { name: 'radix', test: /node_modules[\\/](@radix-ui|radix-ui)[\\/]/ },
            { name: 'forms', test: /node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
})
