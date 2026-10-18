# Etapa 2 — SQL CIA

1. Crear un proyecto Supabase nuevo, independiente de Portal 2027.
2. Abrir SQL Editor en el proyecto nuevo.
3. Pegar y ejecutar `01_instalacion_cia.sql`.
4. Comprobar que aparecen las ocho tablas `ej27_`.
5. Crear un usuario docente en Authentication y, con su UUID, crear su fila en `ej27_docentes` mediante un procedimiento administrativo seguro.
6. Configurar URL y clave pública anon en `assets/js/config.js`; nunca usar service_role en navegador.
7. Desplegar la Edge Function por separado; no se incluye en esta etapa.

ADVERTENCIAS:
- El esquema original limita `ej27_ejercicio_preguntas.posicion` a 1..5. Esto corresponde a ejercicios de cinco preguntas, NO a evaluaciones de 20/40/80. Se requiere una migración posterior antes de usar esos tamaños en ejercicios guardados.
- RLS por docente_id no sustituye la comprobación de que salon_id y banco_id también pertenezcan al mismo docente. La aplicación debe validar las referencias; se recomienda endurecerlas antes de producción.
- La interfaz de la Técnica 01 todavía tiene operaciones locales y debe probarse antes de usarse con datos reales.
