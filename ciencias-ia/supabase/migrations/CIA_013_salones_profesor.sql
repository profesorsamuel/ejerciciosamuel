-- CIA_013: Salones de la matrícula del profesor autenticado.
-- No modifica las tablas ni las funciones anteriores.
BEGIN;

CREATE OR REPLACE FUNCTION public.cia_profesor_salones()
RETURNS TABLE (grado text, seccion text, anio_lectivo integer, estudiantes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.grado, m.seccion, m.anio_lectivo, count(*)::bigint AS estudiantes
  FROM ciencias_ia.cia_matricula AS m
  WHERE m.profesor_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL
    AND m.estado = 'activo'
  GROUP BY m.grado, m.seccion, m.anio_lectivo
  ORDER BY m.anio_lectivo DESC, m.grado, m.seccion;
$$;

REVOKE ALL ON FUNCTION public.cia_profesor_salones() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_salones() TO authenticated;

COMMIT;
