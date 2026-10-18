-- CIA_014 - Acceso, entrega y resultados de Verdadero/Falso
-- Cada llamada verifica matrícula + cédula. No se conceden permisos directos.
BEGIN;

CREATE OR REPLACE FUNCTION public.cia_estudiante_listar_ejercicios(
 p_estudiante_id uuid, p_cedula text
) RETURNS TABLE(asignacion_id uuid, titulo text, cantidad_preguntas integer,
 fecha_limite timestamptz, entregado boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_m ciencias_ia.cia_matricula%ROWTYPE;
BEGIN
 SELECT * INTO v_m FROM ciencias_ia.cia_matricula m
 WHERE m.id = p_estudiante_id AND m.estado = 'activo'
 AND upper(regexp_replace(m.codigo_estudiante,'\s','','g')) = upper(regexp_replace(coalesce(p_cedula,''),'\s','','g'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Identificación inválida'; END IF;
 RETURN QUERY SELECT a.id, e.titulo, jsonb_array_length(e.preguntas), a.fecha_limite,
 EXISTS (SELECT 1 FROM ciencias_ia.cia_respuestas r WHERE r.matricula_id=v_m.id AND r.asignacion_id=a.id)
 FROM ciencias_ia.cia_asignaciones a JOIN ciencias_ia.cia_ejercicios e
 ON e.id=a.ejercicio_id AND e.profesor_id=a.profesor_id
 WHERE a.profesor_id=v_m.profesor_id AND a.grado=v_m.grado AND a.seccion=v_m.seccion
 AND a.anio_lectivo=v_m.anio_lectivo AND a.abierta AND e.publicado
 AND (a.fecha_limite IS NULL OR a.fecha_limite > now())
 ORDER BY a.creado_en DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.cia_estudiante_obtener_ejercicio(
 p_estudiante_id uuid, p_cedula text, p_asignacion_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_m ciencias_ia.cia_matricula%ROWTYPE; v_e record;
BEGIN
 SELECT * INTO v_m FROM ciencias_ia.cia_matricula m
 WHERE m.id=p_estudiante_id AND m.estado='activo'
 AND upper(regexp_replace(m.codigo_estudiante,'\s','','g'))=upper(regexp_replace(coalesce(p_cedula,''),'\s','','g'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Identificación inválida'; END IF;
 SELECT a.id AS aid, e.titulo, e.preguntas INTO v_e
 FROM ciencias_ia.cia_asignaciones a JOIN ciencias_ia.cia_ejercicios e
 ON e.id=a.ejercicio_id AND e.profesor_id=a.profesor_id
 WHERE a.id=p_asignacion_id AND a.profesor_id=v_m.profesor_id
 AND a.grado=v_m.grado AND a.seccion=v_m.seccion AND a.anio_lectivo=v_m.anio_lectivo
 AND a.abierta AND e.publicado AND (a.fecha_limite IS NULL OR a.fecha_limite>now());
 IF NOT FOUND THEN RAISE EXCEPTION 'Ejercicio no disponible'; END IF;
 IF EXISTS(SELECT 1 FROM ciencias_ia.cia_respuestas r WHERE r.matricula_id=v_m.id AND r.asignacion_id=p_asignacion_id)
 THEN RAISE EXCEPTION 'Ejercicio ya entregado'; END IF;
 RETURN jsonb_build_object('asignacion_id',v_e.aid,'titulo',v_e.titulo,
 'preguntas',(SELECT coalesce(jsonb_agg(jsonb_build_object('enunciado',p.value->>'enunciado') ORDER BY p.ordinality),'[]'::jsonb)
 FROM jsonb_array_elements(v_e.preguntas) WITH ORDINALITY AS p(value,ordinality)));
END; $$;

CREATE OR REPLACE FUNCTION public.cia_estudiante_entregar_ejercicio(
 p_estudiante_id uuid, p_cedula text, p_asignacion_id uuid, p_respuestas jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_m ciencias_ia.cia_matricula%ROWTYPE; v_e record;
 v_total integer; v_aciertos integer; v_nota numeric(4,2); v_id uuid; v_detalle jsonb;
BEGIN
 SELECT * INTO v_m FROM ciencias_ia.cia_matricula m
 WHERE m.id=p_estudiante_id AND m.estado='activo'
 AND upper(regexp_replace(m.codigo_estudiante,'\s','','g'))=upper(regexp_replace(coalesce(p_cedula,''),'\s','','g'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Identificación inválida'; END IF;
 -- Bloquear la asignación para coordinar apertura/cierre con el envío.
 SELECT a.id AS aid, e.preguntas INTO v_e
 FROM ciencias_ia.cia_asignaciones a JOIN ciencias_ia.cia_ejercicios e
 ON e.id=a.ejercicio_id AND e.profesor_id=a.profesor_id
 WHERE a.id=p_asignacion_id AND a.profesor_id=v_m.profesor_id
 AND a.grado=v_m.grado AND a.seccion=v_m.seccion AND a.anio_lectivo=v_m.anio_lectivo
 AND a.abierta AND e.publicado AND (a.fecha_limite IS NULL OR a.fecha_limite>now())
 FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ejercicio cerrado, vencido o no asignado'; END IF;
 IF EXISTS (SELECT 1 FROM ciencias_ia.cia_respuestas r
 WHERE r.matricula_id=v_m.id AND r.asignacion_id=p_asignacion_id)
 THEN RAISE EXCEPTION 'Ya entregaste este ejercicio'; END IF;
 v_total:=jsonb_array_length(v_e.preguntas);
 IF v_total<1 OR p_respuestas IS NULL OR jsonb_typeof(p_respuestas) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_respuestas)<>v_total
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_respuestas) x WHERE jsonb_typeof(x.value)<>'boolean')
 THEN RAISE EXCEPTION 'Debes contestar todas las preguntas con Verdadero o Falso'; END IF;
 SELECT count(*)::integer INTO v_aciertos
 FROM jsonb_array_elements(v_e.preguntas) WITH ORDINALITY q(p,n)
 JOIN jsonb_array_elements(p_respuestas) WITH ORDINALITY r(p,n) USING(n)
 WHERE (q.p->'correcta')=r.p;
 v_nota:=round((1+4.0*v_aciertos/v_total)::numeric,2);
 INSERT INTO ciencias_ia.cia_respuestas(matricula_id,asignacion_id,respuestas,nota)
 VALUES(v_m.id,p_asignacion_id,p_respuestas,v_nota) RETURNING id INTO v_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('enunciado',q.p->>'enunciado',
 'respuesta_estudiante',r.p,'correcta',q.p->'correcta',
 'acierto',(q.p->'correcta'=r.p),'explicacion',q.p->>'explicacion') ORDER BY q.n),'[]'::jsonb)
 INTO v_detalle FROM jsonb_array_elements(v_e.preguntas) WITH ORDINALITY q(p,n)
 JOIN jsonb_array_elements(p_respuestas) WITH ORDINALITY r(p,n) USING(n);
 RETURN jsonb_build_object('respuesta_id',v_id,'nota',v_nota,'aciertos',v_aciertos,'total',v_total,'detalle',v_detalle);
END; $$;

CREATE OR REPLACE FUNCTION public.cia_estudiante_ver_resultado(
 p_estudiante_id uuid, p_cedula text, p_asignacion_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_m ciencias_ia.cia_matricula%ROWTYPE; v_r record; v_detalle jsonb;
BEGIN
 SELECT * INTO v_m FROM ciencias_ia.cia_matricula m
 WHERE m.id=p_estudiante_id AND m.estado='activo'
 AND upper(regexp_replace(m.codigo_estudiante,'\s','','g'))=upper(regexp_replace(coalesce(p_cedula,''),'\s','','g'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Identificación inválida'; END IF;
 SELECT r.id,r.nota,r.respuestas,r.creado_en,e.preguntas INTO v_r
 FROM ciencias_ia.cia_respuestas r
 JOIN ciencias_ia.cia_asignaciones a ON a.id=r.asignacion_id
 JOIN ciencias_ia.cia_ejercicios e ON e.id=a.ejercicio_id AND e.profesor_id=a.profesor_id
 WHERE r.matricula_id=v_m.id AND r.asignacion_id=p_asignacion_id
 AND a.profesor_id=v_m.profesor_id AND a.grado=v_m.grado
 AND a.seccion=v_m.seccion AND a.anio_lectivo=v_m.anio_lectivo;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resultado no encontrado'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('enunciado',q.p->>'enunciado',
 'respuesta_estudiante',r.p,'correcta',q.p->'correcta',
 'acierto',(q.p->'correcta'=r.p),'explicacion',q.p->>'explicacion') ORDER BY q.n),'[]'::jsonb)
 INTO v_detalle FROM jsonb_array_elements(v_r.preguntas) WITH ORDINALITY q(p,n)
 JOIN jsonb_array_elements(v_r.respuestas) WITH ORDINALITY r(p,n) USING(n);
 RETURN jsonb_build_object('respuesta_id',v_r.id,'nota',v_r.nota,'creado_en',v_r.creado_en,'detalle',v_detalle);
END; $$;

REVOKE ALL ON FUNCTION public.cia_estudiante_listar_ejercicios(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cia_estudiante_obtener_ejercicio(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cia_estudiante_entregar_ejercicio(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cia_estudiante_ver_resultado(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cia_estudiante_listar_ejercicios(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cia_estudiante_obtener_ejercicio(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cia_estudiante_entregar_ejercicio(uuid,text,uuid,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cia_estudiante_ver_resultado(uuid,text,uuid) TO anon,authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
