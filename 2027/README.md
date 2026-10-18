# CIA – Ciencias IA 2027

Versión de avance funcional **solo para demostraciones**. Incluye salones, estudiantes, importación Excel/CSV, extracción de texto PDF, banco, galería de 25 técnicas y laboratorio de práctica local con cinco desafíos. Algunas técnicas tienen una interacción simplificada y no son aún sus juegos definitivos.

## Abrir
Publicar la carpeta `2027/` en GitHub Pages. La URL prevista es https://profesorsamuel.github.io/ejerciciosamuel/2027/ . No se necesita instalar SQL para la demostración local.

## Advertencias
- Los datos se almacenan únicamente en el navegador (localStorage), no en Supabase. No utilizar cédulas ni notas reales.
- El laboratorio no implementa calificación segura ni protección frente a suplantación.
- Las técnicas abiertas quedan pendientes de revisión humana.
- Crucigrama, sopa de letras, línea de tiempo y mapa conceptual todavía requieren motores visuales completos.
- El PDF extrae texto pero no genera preguntas mediante IA.
- Se requiere implementar Auth, RLS, Edge Functions, calificación servidor, publicaciones reales y SQL definitivo antes de producción.

## Cómo actualizar con GitHub Desktop
Copiar la carpeta `2027` de este ZIP encima de la del repositorio local; revisar archivos modificados y eliminados, luego Commit to main y Push origin.
