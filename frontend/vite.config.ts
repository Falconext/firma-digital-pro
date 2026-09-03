import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuración de Vite (el "empaquetador" que sirve y compila el frontend)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Permite importar con "@/..." en vez de rutas relativas largas
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy: en desarrollo, /api se redirige al backend NestJS (puerto 3000).
    // Así evitamos problemas de CORS y no hardcodeamos la URL del backend.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
