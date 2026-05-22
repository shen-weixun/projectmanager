import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const { VITE_BACKEND_HOST, VITE_BACKEND_PORT } = process.env;
const backendHost = VITE_BACKEND_HOST || 'localhost';
const backendPort = VITE_BACKEND_PORT || '3000';
const protocol = 'http';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8088,
    strictPort: true,
    proxy: {
      '/api': {
        target: `${protocol}://${backendHost}:${backendPort}`,
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: `${protocol}://${backendHost}:${backendPort}`,
        ws: true,
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  }
})
