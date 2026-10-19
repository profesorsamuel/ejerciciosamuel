# CIA — Etapas agrupadas: estadísticas, Gemini y seguridad

## Cambios implementados
- El generador por PDF del módulo Materias propone 80 preguntas por defecto.
- Hasta 10 lotes de generación (sujeto a límites y errores de Gemini); filtra duplicados y permite revisar antes de guardar.
- La pantalla docente de notas por periodo aclara que los resultados provienen de Supabase.
- Se corrigen algunos rótulos antiguos sin cambiar nombres internos de RPC.

## Instalación
1. Reemplazar `CIA-CIENCIAS-IA/index.html` en GitHub.
2. Ejecutar `sql/10_auditoria_seguridad_lectura.sql` en SQL Editor. Es de solo lectura.
3. Revisar las tres consultas de RLS, políticas y permisos RPC; NO ejecutar políticas genéricas sin revisar.

## Pruebas manuales obligatorias
1. Como docente, subir PDF con texto y generar 80. Verificar cantidad real y guardar solo preguntas revisadas. Gemini puede generar menos.
2. Consultar **Notas finales por periodo** y exportar CSV; comparar con intentos de estudiante en Supabase.
3. Entrar como estudiante de prueba, resolver y enviar; verificar una sola nota persistida, repetición y mejor nota.
4. Verificar aislamiento entre dos docentes y que un estudiante no pueda consultar respuestas o notas ajenas.
5. Revisar los permisos de funciones SECURITY DEFINER y acceso por cédula: RLS activado NO garantiza protección.

## Pendientes reales
- Estadísticas agregadas por salón y periodo (tasas, promedios y mejor nota) en panel propio, con consulta segura de servidor.
- Generación garantizada de 80 preguntas únicas: no es posible garantizarla solo aumentando los lotes.
- Corrección y pruebas de políticas RLS según resultados de auditoría.
- Prueba end-to-end real con Supabase y GitHub Pages.
