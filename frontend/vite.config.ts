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
        // IP explícita (no "localhost"): en Node 18+ / Windows, "localhost" a
        // veces resuelve primero a IPv6 (::1), y si el backend solo escucha
        // en IPv4 esto da ECONNREFUSED aunque el backend esté corriendo bien.
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
