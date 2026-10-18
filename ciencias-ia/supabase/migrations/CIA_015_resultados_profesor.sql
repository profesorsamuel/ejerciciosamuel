-- CIA_015 - Resultados del profesor, lectura segura sin permisos directos.
BEGIN;
CREATE OR REPLACE FUNCTION public.cia_profesor_resultados()
RETURNS TABLE (
 respuesta_id uuid, nombres text, grado text, seccion text,
 anio_lectivo integer, titulo text, nota numeric, creado_en timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT r.id, m.nombres, a.grado, a.seccion, a.anio_lectivo,
        e.titulo, r.nota, r.creado_en
 FROM ciencias_ia.cia_respuestas r
 JOIN ciencias_ia.cia_asignaciones a ON a.id = r.asignacion_id
 JOIN ciencias_ia.cia_ejercicios e ON e.id = a.ejercicio_id AND e.profesor_id = a.profesor_id
 JOIN ciencias_ia.cia_matricula m ON m.id = r.matricula_id
 WHERE a.profesor_id = (SELECT auth.uid())
   AND m.profesor_id = a.profesor_id
   AND m.grado = a.grado AND m.seccion = a.seccion
   AND m.anio_lectivo = a.anio_lectivo
   AND (SELECT auth.uid()) IS NOT NULL
 ORDER BY r.creado_en DESC;
$$;
REVOKE ALL ON FUNCTION public.cia_profesor_resultados() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_resultados() TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
