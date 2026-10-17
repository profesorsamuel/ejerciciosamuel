
/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: vite.config.js
 *
 * React + Tailwind CSS
 * Publicacion en GitHub Pages
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // Ruta de Ciencias IA en GitHub Pages
  base: '/ejerciciosamuel/ciencias-ia/',

  // Carpeta de archivos compilados
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
