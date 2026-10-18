-- CIA_012: lectura segura del ejercicio para su profesor.
BEGIN;
CREATE OR REPLACE FUNCTION public.cia_profesor_obtener_ejercicio(p_ejercicio_id uuid)
RETURNS TABLE (id uuid, titulo text, tipo text, preguntas jsonb, publicado boolean, documento_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.id, e.titulo, e.tipo, e.preguntas, e.publicado, e.documento_id
  FROM ciencias_ia.cia_ejercicios AS e
  WHERE e.id = p_ejercicio_id
    AND e.profesor_id = (SELECT auth.uid())
    AND (SELECT auth.uid()) IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.cia_profesor_obtener_ejercicio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_obtener_ejercicio(uuid) TO authenticated;
COMMIT;
