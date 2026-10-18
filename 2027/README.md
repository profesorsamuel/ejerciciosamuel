# CIA – Ciencias IA 2027

Versión inicial desde cero. Incluye panel docente, salones y estudiantes con Supabase Auth y RLS. **No es aún el sistema completo de 25 técnicas.**

## Instalación
1. En Supabase SQL Editor ejecuta `sql/01_base.sql`.
2. En Authentication > Users crea el usuario docente. Si usas correo/contraseña, habilita Email en Auth Providers.
3. Sube la carpeta `2027/` al repositorio `profesorsamuel/ejerciciosamuel`.
4. En GitHub Settings > Pages selecciona Deploy from a branch, `main`, `/ (root)`.
5. Abre `https://profesorsamuel.github.io/ejerciciosamuel/2027/` e introduce URL de Supabase y clave **pública** publishable/anon.
6. Inicia sesión, agrega un salón y un estudiante de prueba.

**Seguridad:** nunca coloques `service_role`, claves secretas ni claves de IA en el navegador. El acceso de estudiantes por cédula todavía no está implementado: requerirá un mecanismo seguro del lado del servidor.
