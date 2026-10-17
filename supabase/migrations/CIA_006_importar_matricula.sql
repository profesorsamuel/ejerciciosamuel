-- CIA_006 - Matrícula independiente de Ciencias IA
-- Ejecutar en SQL Editor de control-notas-jiral, DESPUÉS de CIA_001 a CIA_005.
-- No modifica tablas del proyecto de notas.
BEGIN;
CREATE TABLE IF NOT EXISTS ciencias_ia.cia_matricula (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 profesor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 codigo_estudiante text NOT NULL,
 nombres text NOT NULL,
 grado text NOT NULL,
 seccion text NOT NULL,
 anio_lectivo integer NOT NULL CHECK (anio_lectivo BETWEEN 2020 AND 2100),
 estado text NOT NULL DEFAULT 'activo',
 actualizado_en timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT cia_matricula_unica UNIQUE (profesor_id, anio_lectivo, codigo_estudiante)
);
ALTER TABLE ciencias_ia.cia_matricula ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ciencias_ia.cia_matricula FROM PUBLIC, anon, authenticated;
-- RPC con SECURITY DEFINER: solo el usuario autenticado guarda su matrícula.
-- Se crea en public porque el esquema ciencias_ia NO está expuesto en PostgREST.
CREATE OR REPLACE FUNCTION public.cia_importar_matricula(p_filas jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_user uuid; v_item jsonb; v_total integer := 0; v_code text; v_nombre text;
BEGIN
 v_user := auth.uid();
 IF v_user IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'Se requiere iniciar sesión'; END IF;
 IF p_filas IS NULL OR jsonb_typeof(p_filas) <> 'array' THEN RAISE EXCEPTION 'Formato inválido'; END IF;
 IF jsonb_array_length(p_filas) = 0 OR jsonb_array_length(p_filas) > 1000 THEN RAISE EXCEPTION 'Cantidad inválida (1 a 1000)'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_filas) LOOP
  v_code := upper(btrim(v_item->>'codigo_estudiante'));
  v_nombre := btrim(v_item->>'nombres');
  IF coalesce(length(v_code),0) NOT BETWEEN 1 AND 60 OR coalesce(length(v_nombre),0) NOT BETWEEN 1 AND 200
     OR coalesce(length(btrim(v_item->>'grado')),0) NOT BETWEEN 1 AND 20
     OR coalesce(length(btrim(v_item->>'seccion')),0) NOT BETWEEN 1 AND 20
     OR coalesce(v_item->>'anio_lectivo','') !~ '^[0-9]{4}$'
  THEN RAISE EXCEPTION 'Datos incompletos o inválidos'; END IF;
  INSERT INTO ciencias_ia.cia_matricula (profesor_id,codigo_estudiante,nombres,grado,seccion,anio_lectivo,estado)
  VALUES (v_user,v_code,v_nombre,btrim(v_item->>'grado'),upper(btrim(v_item->>'seccion')),(v_item->>'anio_lectivo')::integer,left(coalesce(nullif(btrim(v_item->>'estado'),''),'activo'),40))
  ON CONFLICT (profesor_id,anio_lectivo,codigo_estudiante) DO UPDATE
  SET nombres=EXCLUDED.nombres,grado=EXCLUDED.grado,seccion=EXCLUDED.seccion,estado=EXCLUDED.estado,actualizado_en=now();
  v_total := v_total+1;
 END LOOP;
 RETURN v_total;
END; $$;
REVOKE ALL ON FUNCTION public.cia_importar_matricula(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cia_importar_matricula(jsonb) TO authenticated;
COMMIT;
