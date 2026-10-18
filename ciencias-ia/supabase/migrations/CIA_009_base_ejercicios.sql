-- CIA_009 - Estructura de ejercicios, documentos, asignaciones y respuestas.
-- Ejecutar solo en el proyecto Supabase control-notas-jiral.
-- No modifica la matricula ni tablas de otros proyectos.
BEGIN;

CREATE TABLE IF NOT EXISTS ciencias_ia.cia_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_archivo text NOT NULL CHECK (length(btrim(nombre_archivo)) BETWEEN 1 AND 255),
  ruta_storage text NOT NULL UNIQUE,
  texto_extraido text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesando','listo','error')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ciencias_ia.cia_ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento_id uuid REFERENCES ciencias_ia.cia_documentos(id) ON DELETE SET NULL,
  titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 200),
  tipo text NOT NULL DEFAULT 'verdadero_falso' CHECK (tipo = 'verdadero_falso'),
  preguntas jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(preguntas) = 'array'),
  publicado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cia_ejercicios_identidad UNIQUE (id, profesor_id)
);

CREATE TABLE IF NOT EXISTS ciencias_ia.cia_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ejercicio_id uuid NOT NULL,
  grado text NOT NULL CHECK (length(btrim(grado)) BETWEEN 1 AND 20),
  seccion text NOT NULL CHECK (length(btrim(seccion)) BETWEEN 1 AND 20),
  anio_lectivo integer NOT NULL CHECK (anio_lectivo BETWEEN 2020 AND 2100),
  abierta boolean NOT NULL DEFAULT false,
  fecha_limite timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cia_asignaciones_ejercicio_dueno FOREIGN KEY (ejercicio_id, profesor_id)
    REFERENCES ciencias_ia.cia_ejercicios(id, profesor_id) ON DELETE CASCADE,
  CONSTRAINT cia_asignaciones_salon_unico UNIQUE (ejercicio_id, grado, seccion, anio_lectivo)
);

CREATE TABLE IF NOT EXISTS ciencias_ia.cia_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES ciencias_ia.cia_matricula(id) ON DELETE CASCADE,
  asignacion_id uuid NOT NULL REFERENCES ciencias_ia.cia_asignaciones(id) ON DELETE CASCADE,
  respuestas jsonb NOT NULL CHECK (jsonb_typeof(respuestas) = 'array'),
  nota numeric(4,2) NOT NULL CHECK (nota BETWEEN 1 AND 5),
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cia_respuestas_un_intento UNIQUE (matricula_id, asignacion_id)
);

CREATE INDEX IF NOT EXISTS cia_documentos_profesor_idx ON ciencias_ia.cia_documentos(profesor_id);
CREATE INDEX IF NOT EXISTS cia_ejercicios_profesor_idx ON ciencias_ia.cia_ejercicios(profesor_id);
CREATE INDEX IF NOT EXISTS cia_asignaciones_salon_idx ON ciencias_ia.cia_asignaciones(profesor_id, grado, seccion, anio_lectivo);
CREATE INDEX IF NOT EXISTS cia_respuestas_asignacion_idx ON ciencias_ia.cia_respuestas(asignacion_id);

ALTER TABLE ciencias_ia.cia_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciencias_ia.cia_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciencias_ia.cia_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciencias_ia.cia_respuestas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE ciencias_ia.cia_documentos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE ciencias_ia.cia_ejercicios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE ciencias_ia.cia_asignaciones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE ciencias_ia.cia_respuestas FROM PUBLIC, anon, authenticated;

-- No se crean politicas de acceso directo: futuras RPC validaran cada operacion.
-- El bucket privado se configurara en un paso posterior junto a sus controles.
COMMIT;
