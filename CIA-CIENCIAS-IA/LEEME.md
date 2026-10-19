# CIA Ciencias IA v2 · instalación

1. **Supabase → SQL Editor:** pega y ejecuta `sql/cia_instalacion.sql` (crea solo tablas `cia_`).
2. **Authentication → Users:** crea tu usuario docente (correo y contraseña). Luego ejecuta en el SQL Editor el `insert into cia_docentes ...` que está comentado al final del SQL, con tu correo.
3. **Función de IA (Supabase CLI):**
   ```
   supabase secrets set GEMINI_API_KEY=su-clave-de-gemini
   supabase functions deploy cia-generar
   ```
4. **index.html:** en `CONFIG` pega la URL del proyecto y la clave `anon/publishable` (nunca la `service_role`).
5. **Publicar:** copia esta carpeta al repositorio (por ejemplo `CIA-CIENCIAS-IA/`) y haz Commit/Push en GitHub Pages.

## Uso
- Docente: Banco → sube el PDF → "Generar banco" (90 preguntas: 18 por tipo). Estudiantes → sube la plantilla Excel/CSV. Resultados → exporta CSV.
- Estudiante: nombre + cédula (debe estar en la lista) → elige ejercicio → 8 preguntas distintas → nota y explicaciones.

## Notas de seguridad
- La calificación se hace en el servidor; el estudiante nunca recibe las respuestas antes de enviar.
- Entrar solo con cédula es débil: alguien que conozca una cédula puede entrar como ese estudiante. Úsalo para práctica, no para notas oficiales.
f

## Plataforma única
Todo vive en `CIA-CIENCIAS-IA/index.html` (una sola dirección).

**Docente** (pestañas): Resumen · Banco de preguntas · **Técnicas Enlace 2** · **Materias** · Estudiantes · Evaluaciones · Resultados.
**Estudiante** (entra con su cédula): ejercicios, **técnicas Enlace 2**, evaluaciones asignadas e historial.

Enlaces directos: `.../CIA-CIENCIAS-IA/#docente`, `#estudiante`, `#docente/e2`, `#docente/mat`.
Las páginas viejas (`tecnicas2/*.html` y el `index.html` de la raíz) solo redirigen aquí; se pueden borrar cuando quiera.

## Enlace 2 · Técnicas 2 (banco con Gemini)
- Desplegar la función tras cada cambio de `supabase/functions/cia-generar/index.ts` (GitHub **no** la actualiza solo).
- Técnicas: `detective`, `quien`, `causa`, `mito`, `casos`. Meta: 8 preguntas por técnica, materia y grado.
- Pendiente: los SQL de `cia14_preguntas`, `cia14_materias`, `cia14_iniciar`, `cia14_enviar` y `cia12_materias_estudiante` no están en `sql/`. Exportarlos desde Supabase y guardarlos aquí como respaldo.
