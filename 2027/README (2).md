# CIA – Ciencias IA 2027

Proyecto nuevo e independiente para C.E.B.G. El Jiral.

## Estado de esta entrega

**Estructura y demostración local, NO aplicación completa.** `index.html` permite crear salones, estudiantes, preguntas y borradores temporalmente en el navegador. Los datos desaparecen al actualizar. Se muestran las 25 técnicas como catálogo; sus motores de juego aún no están implementados. No hay conexión a Supabase, generación con IA, autenticación, calificación real ni publicación de estudiantes.

## Uso de la demostración

Subir la carpeta `2027/` completa al repositorio. Abrir `https://profesorsamuel.github.io/ejerciciosamuel/2027/` una vez habilitado GitHub Pages para `main` / raíz. Requiere navegador moderno con módulos JavaScript. No colocar claves privadas en el HTML ni en `config.js`.

## Orden de implementación

1. Estructura y catálogo visual (esta entrega).
2. Motores independientes de 25 técnicas con esquemas de pregunta y validación.
3. Importación Excel real y PDF.js, validaciones y vista previa.
4. Persistencia y autenticación con Supabase, RPC y Edge Functions.
5. SQL completo con tablas `ej27_`, RLS y políticas.
6. Pruebas integrales, incluyendo seguridad de acceso estudiantil.

Ver `docs/PLAN.md` y `docs/SEGURIDAD.md`.
