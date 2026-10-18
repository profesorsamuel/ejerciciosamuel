-- Ejecutar solo si desea permitir que cada docente gestione sus propios bancos y preguntas.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cia_bancos, public.cia_preguntas TO authenticated;
ALTER TABLE public.cia_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_preguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cia_bancos_docente_own ON public.cia_bancos;
CREATE POLICY cia_bancos_docente_own ON public.cia_bancos FOR ALL TO authenticated USING (docente_id=auth.uid()) WITH CHECK (docente_id=auth.uid());
DROP POLICY IF EXISTS cia_preguntas_docente_own ON public.cia_preguntas;
CREATE POLICY cia_preguntas_docente_own ON public.cia_preguntas FOR ALL TO authenticated USING (docente_id=auth.uid()) WITH CHECK (docente_id=auth.uid());
