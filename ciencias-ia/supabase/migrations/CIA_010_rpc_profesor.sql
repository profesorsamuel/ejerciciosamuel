-- CIENCIAS IA (CIA)
-- CIA_010_rpc_profesor.sql
-- Funciones seguras de consulta para el profesor.
BEGIN;

CREATE OR REPLACE FUNCTION public.cia_profesor_listar_ejercicios()
RETURNS TABLE (
  id uuid,
  titulo text,
  tipo text,
  publicado boolean,
  cantidad_preguntas integer,
  creado_en timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, e.titulo, e.tipo, e.publicado,
         jsonb_array_length(e.preguntas), e.creado_en
  FROM ciencias_ia.cia_ejercicios AS e
  WHERE e.profesor_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY e.creado_en DESC, e.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.cia_profesor_listar_asignaciones()
RETURNS TABLE (
  id uuid,
  ejercicio_id uuid,
  titulo text,
  grado text,
  seccion text,
  anio_lectivo integer,
  abierta boolean,
  fecha_limite timestamptz,
  creado_en timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.ejercicio_id, e.titulo, a.grado, a.seccion,
         a.anio_lectivo, a.abierta, a.fecha_limite, a.creado_en
  FROM ciencias_ia.cia_asignaciones AS a
  JOIN ciencias_ia.cia_ejercicios AS e
    ON e.id = a.ejercicio_id AND e.profesor_id = a.profesor_id
  WHERE a.profesor_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY a.creado_en DESC, a.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.cia_profesor_listar_resultados()
RETURNS TABLE (
  respuesta_id uuid,
  nombres text,
  grado text,
  seccion text,
  anio_lectivo integer,
  titulo text,
  nota numeric,
  fecha timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.id, m.nombres, a.grado, a.seccion, a.anio_lectivo,
         e.titulo, r.nota, r.creado_en
  FROM ciencias_ia.cia_respuestas AS r
  JOIN ciencias_ia.cia_asignaciones AS a ON a.id = r.asignacion_id
  JOIN ciencias_ia.cia_ejercicios AS e
    ON e.id = a.ejercicio_id AND e.profesor_id = a.profesor_id
  JOIN ciencias_ia.cia_matricula AS m
    ON m.id = r.matricula_id AND m.profesor_id = a.profesor_id
  WHERE a.profesor_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY r.creado_en DESC, r.id DESC;
$$;

REVOKE ALL ON FUNCTION public.cia_profesor_listar_ejercicios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cia_profesor_listar_asignaciones() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cia_profesor_listar_resultados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cia_profesor_listar_ejercicios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_listar_asignaciones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_listar_resultados() TO authenticated;
COMMIT;
