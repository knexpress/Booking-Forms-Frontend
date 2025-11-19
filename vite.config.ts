import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { consoleToTerminal } from './vite-plugin-console-terminal'

export default defineConfig({
  plugins: [react(), consoleToTerminal()],
  optimizeDeps: {
    include: ['jspdf']
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /node_modules/]
    }
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'localhost'
    ],
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: true, // Set to true for HTTPS (ngrok uses HTTPS)
        rewrite: (path) => path,
      }
    }
  }
})
