import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true
  },
  optimizeDeps: {
    exclude: ['jeep-sqlite']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'sqlite': ['@capacitor-community/sqlite', '@capacitor/core'],
          'ui': ['tailwind-merge']
        }
      }
    }
  }
})
