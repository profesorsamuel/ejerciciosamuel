# CIA Ciencias IA · instalación (prefijo cia27_)
1. Supabase → SQL Editor: ejecuta `sql/cia27_instalacion.sql` (crea solo tablas cia27_; no toca las cia_ viejas). Selecciona todo con Ctrl+A antes de Run.
2. En `index.html`, línea `const CONFIG={url:'',key:''};`: pega la URL del proyecto y la clave anon/publishable (nunca service_role).
3. Función de IA `cia-generar` (carpeta supabase/functions) con el secreto ANTHROPIC_API_KEY.
4. Commit y Push en GitHub Desktop (rama main).
Cada ejercicio trae siempre 8 preguntas. Estudiantes: sube la plantilla Excel (nombres, cedula, grado, seccion).
