
/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: vite.config.js
 * Publicacion en GitHub Pages
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Ruta de Ciencias IA en GitHub Pages
  base: '/ejerciciosamuel/ciencias-ia/',

  // Carpeta de archivos compilados
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
