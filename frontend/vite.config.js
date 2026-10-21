import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El origen del frontend en desarrollo (5173) debe coincidir con CORS_ORIGIN del backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }
});
