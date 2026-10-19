-- Etapa: intercambio atómico de posiciones; requiere cia_catalogo_evaluaciones.sql previo.
create or replace function public.cia_catalogo_intercambiar(p_primero bigint, p_segundo bigint)
returns void language plpgsql security invoker set search_path = public as $$
declare a record; b record;
begin
 if auth.uid() is null then raise exception 'Debe iniciar sesión'; end if;
 if p_primero is null or p_segundo is null or p_primero = p_segundo then raise exception 'Evaluaciones inválidas'; end if;
 -- Bloquea ambas filas durante el intercambio para evitar ediciones simultáneas.
 perform 1 from public.cia_catalogo_evaluaciones
 where id in (p_primero,p_segundo) and docente_id=auth.uid()
 order by id for update;
 select id,orden into a from public.cia_catalogo_evaluaciones where id=p_primero and docente_id=auth.uid();
 select id,orden into b from public.cia_catalogo_evaluaciones where id=p_segundo and docente_id=auth.uid();
 if a.id is null or b.id is null then raise exception 'Evaluación no encontrada o sin permisos'; end if;
 update public.cia_catalogo_evaluaciones
 set orden = case when id=p_primero then b.orden else a.orden end
 where id in (p_primero,p_segundo) and docente_id=auth.uid();
end; $$;
revoke all on function public.cia_catalogo_intercambiar(bigint,bigint) from public;
grant execute on function public.cia_catalogo_intercambiar(bigint,bigint) to authenticated;
