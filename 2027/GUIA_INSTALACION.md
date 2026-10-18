# CIA 2027 — instalación única

1. Haga una copia de la carpeta `2027` existente.
2. Sustituya **solo** la carpeta `2027` del repositorio GitHub Desktop por la incluida aquí. Compruebe cambios y haga Commit/Push.
3. Pruebe primero el panel local y la creación de borradores de cinco preguntas.
4. En el proyecto Supabase correcto, haga respaldo de la base y ejecute `sql/ej27_instalacion_completa.sql` en SQL Editor. El script crea **solo** objetos con prefijo `ej27_`.
5. Cree usuarios docentes con Supabase Auth y autorice explícitamente cada UUID en `ej27_docentes` desde SQL Editor. No se autoinscriben docentes.
6. Despliegue `supabase/functions/ej27-generar/index.ts` con Supabase CLI. Configure `OPENAI_API_KEY` como secreto, `EJ27_ORIGIN` y opcionalmente `EJ27_AI_MODEL`.
7. **Importante:** la aplicación web entregada sigue siendo una demo local; SQL y función IA son infraestructura preparada, pero NO están conectados al panel todavía. No publique calificaciones reales ni habilite estudiantes hasta implementar el acceso seguro y la calificación del lado servidor.

## Verificaciones realizadas
- Estructura sin archivos de aplicación duplicados en la raíz.
- Revisión de sintaxis JavaScript con Node (si disponible).
- ZIP verificable.

## Falta para producción
- Vincular autenticación docente y CRUD del frontend a Supabase.
- Generar preguntas IA desde el panel con revisión docente.
- Implementar los 25 motores específicos (no solo catálogo/laboratorio).
- Autenticación segura estudiantil distinta de cédula sola.
- API segura para distribuir intentos sin exponer respuestas, calificarlos y guardar notas.
- Pruebas E2E y seguridad.

## Nuevo: acceso docente a Supabase (consulta)
1. Ejecute el SQL definitivo **solo después de revisarlo** y cree el usuario docente en Supabase Auth.
2. Autorice el UUID del usuario en `ej27_docentes`.
3. En `assets/js/config.js` coloque la URL del proyecto y su clave pública `anon` o `publishable`, nunca `service_role`. Cambie `modoDemostracion` a `false`.
4. Abra la pestaña **Supabase docente**, inicie sesión y pulse **Consultar datos de la nube**.
5. Si desea reemplazar los datos locales de demostración, primero exporte un respaldo y luego pulse **Importar a datos locales**.

**Alcance:** conexión y lectura docente mediante RLS; no guarda notas oficiales ni publica ejercicios. El módulo usa la librería Supabase desde CDN y requiere internet. No almacena contraseñas en el proyecto.
