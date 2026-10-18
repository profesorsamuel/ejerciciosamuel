-- CIA_011 - Gestion de ejercicios verdadero/falso del profesor
-- Solo crea funciones nuevas; no modifica las tablas ni funciones previas.
BEGIN;

CREATE OR REPLACE FUNCTION public.cia_profesor_guardar_ejercicio(
  p_titulo text,
  p_preguntas jsonb,
  p_ejercicio_id uuid DEFAULT NULL,
  p_documento_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profesor uuid := auth.uid();
  v_id uuid;
  v_pregunta jsonb;
  v_num integer := 0;
BEGIN
  IF v_profesor IS NULL THEN
    RAISE EXCEPTION 'Debe iniciar sesion como profesor';
  END IF;
  IF p_titulo IS NULL OR length(btrim(p_titulo)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'El titulo debe tener entre 1 y 200 caracteres';
  END IF;
  IF p_preguntas IS NULL OR jsonb_typeof(p_preguntas) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_preguntas) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Debe proporcionar entre 1 y 80 preguntas';
  END IF;
  FOR v_pregunta IN SELECT value FROM jsonb_array_elements(p_preguntas)
  LOOP
    v_num := v_num + 1;
    IF jsonb_typeof(v_pregunta) IS DISTINCT FROM 'object'
       OR v_pregunta->>'enunciado' IS NULL
       OR length(btrim(v_pregunta->>'enunciado')) NOT BETWEEN 5 AND 2000
       OR jsonb_typeof(v_pregunta->'correcta') IS DISTINCT FROM 'boolean'
       OR v_pregunta->>'explicacion' IS NULL
       OR length(btrim(v_pregunta->>'explicacion')) NOT BETWEEN 3 AND 2000
       OR (SELECT count(*) FROM jsonb_object_keys(v_pregunta) AS k) <> 3
       OR NOT (v_pregunta ?& ARRAY['enunciado','correcta','explicacion'])
    THEN
      RAISE EXCEPTION 'Pregunta % invalida: requiere enunciado, correcta (boolean) y explicacion', v_num;
    END IF;
  END LOOP;
  IF p_documento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ciencias_ia.cia_documentos
    WHERE id = p_documento_id AND profesor_id = v_profesor
  ) THEN
    RAISE EXCEPTION 'Documento no encontrado o no autorizado';
  END IF;

  IF p_ejercicio_id IS NULL THEN
    INSERT INTO ciencias_ia.cia_ejercicios
      (profesor_id, documento_id, titulo, tipo, preguntas, publicado)
    VALUES
      (v_profesor, p_documento_id, btrim(p_titulo), 'verdadero_falso', p_preguntas, false)
    RETURNING id INTO v_id;
  ELSE
    -- Bloqueo de fila para impedir ediciones simultaneas.
    SELECT id INTO v_id FROM ciencias_ia.cia_ejercicios
    WHERE id = p_ejercicio_id AND profesor_id = v_profesor
    FOR UPDATE;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Ejercicio no encontrado o no autorizado';
    END IF;
    IF EXISTS (
      SELECT 1 FROM ciencias_ia.cia_respuestas r
      JOIN ciencias_ia.cia_asignaciones a ON a.id = r.asignacion_id
      WHERE a.ejercicio_id = v_id
    ) THEN
      RAISE EXCEPTION 'No se puede editar un ejercicio que ya tiene respuestas';
    END IF;
    UPDATE ciencias_ia.cia_ejercicios
    SET titulo = btrim(p_titulo), preguntas = p_preguntas,
        documento_id = p_documento_id, actualizado_en = now()
    WHERE id = v_id AND profesor_id = v_profesor;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cia_profesor_publicar_ejercicio(
  p_ejercicio_id uuid,
  p_publicado boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_profesor uuid := auth.uid();
BEGIN
  IF v_profesor IS NULL THEN RAISE EXCEPTION 'Debe iniciar sesion como profesor'; END IF;
  IF p_publicado IS NULL THEN RAISE EXCEPTION 'Indique si desea publicar'; END IF;
  UPDATE ciencias_ia.cia_ejercicios
  SET publicado = p_publicado, actualizado_en = now()
  WHERE id = p_ejercicio_id AND profesor_id = v_profesor
    AND (NOT p_publicado OR jsonb_array_length(preguntas) > 0);
  IF NOT FOUND THEN RAISE EXCEPTION 'Ejercicio no encontrado o sin preguntas'; END IF;
  -- Despublicar tambien cierra todas sus asignaciones.
  IF NOT p_publicado THEN
    UPDATE ciencias_ia.cia_asignaciones
    SET abierta = false
    WHERE ejercicio_id = p_ejercicio_id AND profesor_id = v_profesor;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cia_profesor_asignar_ejercicio(
  p_ejercicio_id uuid,
  p_grado text,
  p_seccion text,
  p_anio_lectivo integer,
  p_abierta boolean DEFAULT false,
  p_fecha_limite timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profesor uuid := auth.uid();
  v_id uuid;
  v_publicado boolean;
BEGIN
  IF v_profesor IS NULL THEN RAISE EXCEPTION 'Debe iniciar sesion como profesor'; END IF;
  IF p_ejercicio_id IS NULL OR p_grado IS NULL OR p_seccion IS NULL
     OR length(btrim(p_grado)) NOT BETWEEN 1 AND 20
     OR length(btrim(p_seccion)) NOT BETWEEN 1 AND 20
     OR p_anio_lectivo IS NULL OR p_anio_lectivo NOT BETWEEN 2020 AND 2100
     OR p_abierta IS NULL THEN
    RAISE EXCEPTION 'Datos de asignacion invalidos';
  END IF;
  SELECT publicado INTO v_publicado FROM ciencias_ia.cia_ejercicios
  WHERE id = p_ejercicio_id AND profesor_id = v_profesor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ejercicio no encontrado o no autorizado'; END IF;
  IF p_abierta AND NOT v_publicado THEN
    RAISE EXCEPTION 'Publique el ejercicio antes de abrirlo';
  END IF;
  IF p_abierta AND p_fecha_limite IS NOT NULL AND p_fecha_limite <= now() THEN
    RAISE EXCEPTION 'La fecha limite ya paso';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM ciencias_ia.cia_matricula
    WHERE profesor_id = v_profesor AND grado = btrim(p_grado)
      AND seccion = btrim(p_seccion) AND anio_lectivo = p_anio_lectivo
  ) THEN
    RAISE EXCEPTION 'No existe matricula de ese salon para este profesor';
  END IF;
  INSERT INTO ciencias_ia.cia_asignaciones
    (profesor_id, ejercicio_id, grado, seccion, anio_lectivo, abierta, fecha_limite)
  VALUES
    (v_profesor, p_ejercicio_id, btrim(p_grado), btrim(p_seccion),
     p_anio_lectivo, p_abierta, p_fecha_limite)
  ON CONFLICT (ejercicio_id, grado, seccion, anio_lectivo)
  DO UPDATE SET abierta = EXCLUDED.abierta, fecha_limite = EXCLUDED.fecha_limite
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cia_profesor_guardar_ejercicio(text,jsonb,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cia_profesor_publicar_ejercicio(uuid,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cia_profesor_asignar_ejercicio(uuid,text,text,integer,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_guardar_ejercicio(text,jsonb,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_publicar_ejercicio(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cia_profesor_asignar_ejercicio(uuid,text,text,integer,boolean,timestamptz) TO authenticated;
COMMIT;
