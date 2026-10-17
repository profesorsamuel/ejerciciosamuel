-- CIA_007 - Acceso del estudiante: lista de nombres por salón y verificación de cédula.
-- Ejecutar en SQL Editor de control-notas-jiral, DESPUÉS de CIA_006.
-- La lista pública solo devuelve id y nombre (nunca la cédula).
-- La cédula se compara en el servidor; la tabla sigue sin permisos directos.
BEGIN;

CREATE OR REPLACE FUNCTION public.cia_estudiantes_salon(p_grado text, p_seccion text, p_anio integer)
RETURNS TABLE (id uuid, nombres text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT m.id, m.nombres
  FROM ciencias_ia.cia_matricula m
  WHERE m.grado = btrim(p_grado)
    AND m.seccion = upper(btrim(p_seccion))
    AND m.anio_lectivo = p_anio
    AND m.estado = 'activo'
  ORDER BY m.nombres;
$$;

CREATE OR REPLACE FUNCTION public.cia_verificar_estudiante(p_estudiante_id uuid, p_cedula text)
RETURNS TABLE (id uuid, nombres text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT m.id, m.nombres
  FROM ciencias_ia.cia_matricula m
  WHERE m.id = p_estudiante_id
    AND m.estado = 'activo'
    AND upper(regexp_replace(m.codigo_estudiante, '\s', '', 'g'))
        = upper(regexp_replace(coalesce(p_cedula, ''), '\s', '', 'g'));
$$;

REVOKE ALL ON FUNCTION public.cia_estudiantes_salon(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cia_verificar_estudiante(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cia_estudiantes_salon(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cia_verificar_estudiante(uuid, text) TO anon, authenticated;
COMMIT;
