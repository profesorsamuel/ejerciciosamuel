-- Etapa: asociar el catálogo a evaluaciones oficiales independientes.
-- Ejecutar después de cia_catalogo_evaluaciones.sql y cia_evaluaciones_etapas.sql.
-- No borra datos ni cambia las notas anteriores.
ALTER TABLE public.cia_evaluaciones
 ADD COLUMN IF NOT EXISTS catalogo_id bigint;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cia_evaluaciones_catalogo_id_fkey') THEN
  ALTER TABLE public.cia_evaluaciones ADD CONSTRAINT cia_evaluaciones_catalogo_id_fkey
   FOREIGN KEY (catalogo_id) REFERENCES public.cia_catalogo_evaluaciones(id) ON DELETE RESTRICT;
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS cia_evaluaciones_catalogo_id_idx ON public.cia_evaluaciones(catalogo_id);
-- Asegurar que la evaluación pertenece al mismo docente que el catálogo.
CREATE OR REPLACE FUNCTION public.cia_validar_catalogo_evaluacion()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.catalogo_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.cia_catalogo_evaluaciones c
  WHERE c.id = NEW.catalogo_id AND c.docente_id = NEW.docente_id
 ) THEN
  RAISE EXCEPTION 'El catálogo no pertenece al docente de la evaluación';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS cia_validar_catalogo_evaluacion_trg ON public.cia_evaluaciones;
CREATE TRIGGER cia_validar_catalogo_evaluacion_trg
BEFORE INSERT OR UPDATE OF catalogo_id,docente_id ON public.cia_evaluaciones
FOR EACH ROW EXECUTE FUNCTION public.cia_validar_catalogo_evaluacion();
