# Plan de implementación

## Módulos previstos

- Docente: autenticación, salones, estudiantes, banco, documentos, galería, creador, publicaciones, notas, estadísticas.
- Estudiante: sesión verificada, ejercicios publicados, intentos, retroalimentación e historial.
- IA: extracción de PDF, generación y validación de 80 preguntas, conversión de técnicas, sugerencia de rúbrica.
- Almacenamiento: tablas ej27_ aisladas, RLS y RPC; documentos en bucket ej27-pdfs.
- Exportación: Excel/CSV, plantilla original y reporte.

## Decisiones antes de integrar

1. Cédula sola no demuestra identidad. Elegir un segundo factor o código individual privado para evitar suplantación.
2. Las técnicas de respuesta abierta necesitan revisión docente; las respuestas correctas no deben enviarse antes de cerrar un intento.
3. Cinco preguntas de temas distintos solo se pueden garantizar si existen cinco temas y preguntas compatibles.
4. Un Excel de verdadero/falso no garantiza insumos suficientes para 25 técnicas; solicitar datos faltantes, no inventarlos.
5. Separar generación del banco de su transformación a una técnica y de la calificación en servidor.
6. Usar migraciones versionadas y operaciones idempotentes; el SQL se entregará al final según lo solicitado.

## Pruebas finales

- Publicación GitHub Pages, Auth docente, aislamiento entre docentes, RLS, importación y deduplicación, banco de 80, 25 técnicas, 5 preguntas por intento, no repetición, fechas límite, reportes, calificación en servidor, seguridad del estudiante, acceso móvil.
