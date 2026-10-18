# CIA 2027 — Entrega organizada (18 octubre 2026)

Se conserva el proyecto recibido y se incorpora la pestaña **Calidad y respaldo** con revisión de datos, exportación del banco CSV y respaldo/restauración JSON local.

## Instalación
1. Extraer el ZIP.
2. Sustituir únicamente la carpeta `2027` en el repositorio de GitHub Desktop (guardar copia de seguridad).
3. Commit y Push.
4. Abrir `https://profesorsamuel.github.io/ejerciciosamuel/2027/` y entrar a Calidad y respaldo.

## Límites y pendientes reales
- Las 25 técnicas siguen siendo prototipos parciales; no se ha afirmado que sean 25 motores completos.
- Los datos y los intentos permanecen en localStorage; no se sincronizan entre dispositivos.
- Faltan autenticación Supabase Auth, roles y RLS, publicación remota segura, notas verificadas por servidor, Edge Function de IA y generación de 80 preguntas desde PDF.
- No ejecutar los SQL de borrador.
- No introducir datos personales reales mientras la aplicación sea un prototipo local.
- La importación de respaldos reemplaza el almacenamiento local del navegador después de confirmación.

## Archivos
`index.html`, `assets/css/app.css`, `assets/js/*.js`, `plantillas/*.csv`, `sql/01_base_BORRADOR_NO_EJECUTAR.sql`.
No hay copias adicionales de estos archivos en la raíz.
