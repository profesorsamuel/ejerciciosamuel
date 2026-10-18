-- CIA - Ciencias IA 2027. Instalación aislada en Supabase compartido.
-- NO altera tablas ajenas a cia_. Ejecutar en SQL Editor del proyecto elegido.
-- RLS: acceso únicamente a usuarios autenticados propietarios.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cia_docentes (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 nombre text NOT NULL DEFAULT '', creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.cia_salones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 nombre text NOT NULL CHECK (length(btrim(nombre)) > 0),
 anio_lectivo integer NOT NULL DEFAULT 2027,
 creado_en timestamptz NOT NULL DEFAULT now(),
 UNIQUE(docente_id,nombre,anio_lectivo), UNIQUE(id,docente_id)
);
CREATE TABLE IF NOT EXISTS public.cia_estudiantes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 salon_id uuid,
 codigo_estudiante text, nombres text NOT NULL CHECK(length(btrim(nombres))>0),
 cedula text NOT NULL CHECK(length(btrim(cedula))>0),
 sexo text, grado text, seccion text,
 anio_lectivo integer NOT NULL DEFAULT 2027,
 correo_estudiante text, nombre_acudiente text, telefono_acudiente text,
 estado text NOT NULL DEFAULT 'activo', creado_en timestamptz NOT NULL DEFAULT now(),
 UNIQUE(docente_id,cedula,anio_lectivo), UNIQUE(id,docente_id),
 CONSTRAINT cia_estudiantes_salon_propietario FOREIGN KEY (salon_id,docente_id)
   REFERENCES public.cia_salones(id,docente_id)
);
CREATE TABLE IF NOT EXISTS public.cia_bancos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 nombre text NOT NULL CHECK(length(btrim(nombre))>0), fuente text,
 creado_en timestamptz NOT NULL DEFAULT now(), UNIQUE(id,docente_id)
);
CREATE TABLE IF NOT EXISTS public.cia_preguntas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 banco_id uuid NOT NULL,
 enunciado text NOT NULL CHECK(length(btrim(enunciado))>0),
 correcta text NOT NULL DEFAULT '', explicacion text NOT NULL DEFAULT '',
 distractores jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(distractores)='array'),
 tema text, nivel text, metadatos jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadatos)='object'),
 creado_en timestamptz NOT NULL DEFAULT now(), UNIQUE(id,docente_id),
 CONSTRAINT cia_preguntas_banco_propietario FOREIGN KEY (banco_id,docente_id)
   REFERENCES public.cia_bancos(id,docente_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.cia_ejercicios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 titulo text NOT NULL CHECK(length(btrim(titulo))>0),
 tecnica integer NOT NULL DEFAULT 1 CHECK(tecnica BETWEEN 1 AND 25),
 salon_id uuid, publicado boolean NOT NULL DEFAULT false,
 vence_en timestamptz, max_nota numeric(5,2) NOT NULL DEFAULT 5,
 creado_en timestamptz NOT NULL DEFAULT now(), UNIQUE(id,docente_id),
 CONSTRAINT cia_ejercicios_salon_propietario FOREIGN KEY (salon_id,docente_id)
   REFERENCES public.cia_salones(id,docente_id)
);
CREATE TABLE IF NOT EXISTS public.cia_ejercicio_preguntas (
 ejercicio_id uuid NOT NULL REFERENCES public.cia_ejercicios(id) ON DELETE CASCADE,
 pregunta_id uuid NOT NULL REFERENCES public.cia_preguntas(id) ON DELETE RESTRICT,
 posicion smallint NOT NULL CHECK(posicion BETWEEN 1 AND 80),
 PRIMARY KEY(ejercicio_id,pregunta_id), UNIQUE(ejercicio_id,posicion)
);
CREATE TABLE IF NOT EXISTS public.cia_intentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 docente_id uuid NOT NULL REFERENCES public.cia_docentes(id) ON DELETE CASCADE,
 estudiante_id uuid NOT NULL, ejercicio_id uuid NOT NULL,
 respuestas jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(respuestas)='array'),
 nota numeric(5,2), revision_pendiente boolean NOT NULL DEFAULT false,
 creado_en timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT cia_intentos_estudiante_propietario FOREIGN KEY (estudiante_id,docente_id)
  REFERENCES public.cia_estudiantes(id,docente_id) ON DELETE CASCADE,
 CONSTRAINT cia_intentos_ejercicio_propietario FOREIGN KEY (ejercicio_id,docente_id)
  REFERENCES public.cia_ejercicios(id,docente_id) ON DELETE CASCADE
);

ALTER TABLE public.cia_docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_ejercicio_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_intentos ENABLE ROW LEVEL SECURITY;

DO $pol$
DECLARE tab text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cia_docentes' AND policyname='cia_docente_propietario') THEN
  CREATE POLICY cia_docente_propietario ON public.cia_docentes FOR ALL TO authenticated
   USING(id=auth.uid()) WITH CHECK(id=auth.uid());
 END IF;
 FOREACH tab IN ARRAY ARRAY['cia_salones','cia_estudiantes','cia_bancos','cia_preguntas','cia_ejercicios','cia_intentos'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tab AND policyname='cia_propietario') THEN
   EXECUTE format('CREATE POLICY cia_propietario ON public.%I FOR ALL TO authenticated USING(docente_id=auth.uid()) WITH CHECK(docente_id=auth.uid())',tab);
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cia_ejercicio_preguntas' AND policyname='cia_vinculos_propietario') THEN
  CREATE POLICY cia_vinculos_propietario ON public.cia_ejercicio_preguntas FOR ALL TO authenticated
  USING (
   EXISTS(SELECT 1 FROM public.cia_ejercicios e WHERE e.id=ejercicio_id AND e.docente_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.cia_preguntas p WHERE p.id=pregunta_id AND p.docente_id=auth.uid())
  )
  WITH CHECK (
   EXISTS(SELECT 1 FROM public.cia_ejercicios e WHERE e.id=ejercicio_id AND e.docente_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.cia_preguntas p WHERE p.id=pregunta_id AND p.docente_id=auth.uid())
  );
 END IF;
END $pol$;

CREATE INDEX IF NOT EXISTS cia_estudiantes_docente_salon_idx ON public.cia_estudiantes(docente_id,salon_id);
CREATE INDEX IF NOT EXISTS cia_preguntas_docente_banco_idx ON public.cia_preguntas(docente_id,banco_id);
CREATE INDEX IF NOT EXISTS cia_intentos_docente_ejercicio_idx ON public.cia_intentos(docente_id,ejercicio_id);

COMMENT ON TABLE public.cia_docentes IS 'CIA independiente: perfiles docentes asociados a Supabase Auth.';
COMMENT ON TABLE public.cia_bancos IS 'CIA: bancos de preguntas generados y revisados por docentes.';
COMMENT ON TABLE public.cia_intentos IS 'CIA: intentos de evaluación. No habilita acceso directo anónimo de estudiantes.';
COMMIT;
