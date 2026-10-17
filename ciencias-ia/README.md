# Ciencias IA — módulo independiente

Esta carpeta pertenece exclusivamente al proyecto **Ciencias IA** dentro del repositorio `ejerciciosamuel`. Los HTML existentes en la raíz no se modificaron.

## Estado actual
- Estructura React + Vite + Tailwind creada.
- Pantalla de entrada de profesor con Supabase Auth cuando se configuran las variables.
- Pantalla de estudiante en preparación (botón deshabilitado).
- Migración SQL incluida, **no ejecutada**.
- **No implementados aún**: PDF, extracción, generación IA, publicación, código de grupo, envío de respuestas, calificación, CSV. No se trata de una versión funcional completa.

## Desarrollo local
1. Instala Node.js LTS.
2. Abre terminal en esta carpeta: `npm install`.
3. Copia `.env.example` a `.env.local` y sustituye los valores por los de Supabase (solo clave pública).
4. Ejecuta `npm run dev`.

## GitHub Pages
El repositorio esperado es `ejerciciosamuel`. Si tiene otro nombre, cambia `base` en `vite.config.js` y la ruta de publicación en `.github/workflows/ciencias-ia-pages.yml`.
En GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions. Haz push a la rama `main`. El workflow construye y publica esta carpeta con el enlace `https://USUARIO.github.io/ejerciciosamuel/ciencias-ia/`.

**Variables en GitHub:** Settings → Secrets and variables → Actions → Variables. Crear `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (solo clave pública). Nunca agregar `AI_API_KEY` en GitHub Pages ni en archivos del frontend. El secreto de IA irá únicamente en Supabase cuando se implemente esa función.

## Base de datos
SQL de referencia en `supabase/migrations/202610170001_inicial.sql`. Ejecutar solo en un proyecto Supabase nuevo o verificar conflictos antes. No se ejecutó automáticamente.

## Seguridad
La migración mantiene las tablas de estudiantes sin permisos directos públicos. El acceso por código y la calificación se implementarán con Edge Functions validadas en el servidor. No publicar ejercicios hasta que esas funciones estén completas.
