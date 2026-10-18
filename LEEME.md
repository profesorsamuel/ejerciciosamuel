# CIA Ciencias IA v2 · instalación

1. **Supabase → SQL Editor:** pega y ejecuta `sql/cia8_instalacion.sql` (crea solo tablas `cia8_`).
2. **Authentication → Users:** crea tu usuario docente (correo y contraseña). Luego ejecuta en el SQL Editor el `insert into cia8_docentes ...` que está comentado al final del SQL, con tu correo.
3. **Función de IA (Supabase CLI):**
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
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
