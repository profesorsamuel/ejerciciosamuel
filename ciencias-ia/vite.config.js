
/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: vite.config.js
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ejerciciosamuel/ciencias-ia/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
