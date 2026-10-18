-- CIA Ciencias IA · tablas nuevas con prefijo cia27_ (no tocan las cia_ viejas).
create extension if not exists pgcrypto;
create table if not exists cia27_docentes(id uuid primary key references auth.users(id) on delete cascade, nombre text default '');
create table if not exists cia27_estudiantes(
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references cia27_docentes(id) on delete cascade,
 nombres text not null, cedula text not null, grado text, seccion text, registrado_en timestamptz,
 unique(docente_id,cedula));
create table if not exists cia27_preguntas(
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references cia27_docentes(id) on delete cascade,
 tipo text not null check(tipo in('multiple','verdadero_falso','completar','relacionar','ordenar')),
 enunciado text not null, datos jsonb not null default '{}', correcta jsonb not null,
 explicacion text default '', tema text default '', creado_en timestamptz default now());
create table if not exists cia27_intentos(
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references cia27_docentes(id) on delete cascade,
 estudiante_id uuid not null references cia27_estudiantes(id) on delete cascade, tipo text not null,
 preguntas uuid[] not null, respuestas jsonb, nota int, creado_en timestamptz default now(), enviado_en timestamptz);

alter table cia27_docentes enable row level security; alter table cia27_estudiantes enable row level security;
alter table cia27_preguntas enable row level security; alter table cia27_intentos enable row level security;
-- El docente solo ve y edita lo suyo. El estudiante NO accede a tablas: solo a las 3 funciones de abajo.
drop policy if exists p27_doc on cia27_docentes; create policy p27_doc on cia27_docentes for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists p27_est on cia27_estudiantes; create policy p27_est on cia27_estudiantes for all to authenticated using(docente_id=auth.uid()) with check(docente_id=auth.uid());
drop policy if exists p27_pre on cia27_preguntas; create policy p27_pre on cia27_preguntas for all to authenticated using(docente_id=auth.uid()) with check(docente_id=auth.uid());
drop policy if exists p27_int on cia27_intentos; create policy p27_int on cia27_intentos for select to authenticated using(docente_id=auth.uid());

-- 1) Ingreso: la cédula debe estar en la lista cargada por el docente.
create or replace function cia27_ingresar(p_cedula text,p_nombre text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare e cia27_estudiantes;
begin
 select * into e from cia27_estudiantes
  where lower(regexp_replace(cedula,'\s','','g'))=lower(regexp_replace(p_cedula,'\s','','g')) limit 1;
 if not found then raise exception 'Tu cédula no está en la lista. Avisa a tu docente.'; end if;
 update cia27_estudiantes set registrado_en=coalesce(registrado_en,now()) where id=e.id;
 return jsonb_build_object('id',e.id,'nombres',e.nombres);
end$$;

-- 2) Inicia un ejercicio: 8 preguntas al azar, prioriza las que el estudiante nunca recibió,
--    mezcla preguntas y opciones, y NO envía las respuestas correctas.
create or replace function cia27_iniciar(p_est uuid,p_tipo text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare e cia27_estudiantes; ids uuid[]; vistas uuid[]; iid uuid; r jsonb;
begin
 select * into e from cia27_estudiantes where id=p_est;
 if not found then raise exception 'Sesión no válida. Vuelve a ingresar.'; end if;
 select coalesce(array_agg(x),'{}') into vistas from cia27_intentos i, unnest(i.preguntas) x
  where i.estudiante_id=e.id and i.tipo=p_tipo;
 select array_agg(id) into ids from (select id from cia27_preguntas
  where docente_id=e.docente_id and tipo=p_tipo order by (id=any(vistas)), random() limit 8) s;
 if coalesce(cardinality(ids),0)<8 then raise exception 'El docente aún no tiene 8 preguntas de este ejercicio.'; end if;
 insert into cia27_intentos(docente_id,estudiante_id,tipo,preguntas) values(e.docente_id,e.id,p_tipo,ids) returning id into iid;
 select jsonb_agg(jsonb_build_object('id',q.id,'tipo',q.tipo,'enunciado',q.enunciado,'datos',case
  when q.tipo in('multiple','completar') then jsonb_build_object('opciones',(select jsonb_agg(o order by random()) from jsonb_array_elements(q.datos->'opciones') o))
  when q.tipo='relacionar' then jsonb_build_object('izq',(select jsonb_agg(p->0 order by random()) from jsonb_array_elements(q.datos->'pares') p),
                                                  'der',(select jsonb_agg(p->1 order by random()) from jsonb_array_elements(q.datos->'pares') p))
  when q.tipo='ordenar' then jsonb_build_object('items',(select jsonb_agg(o order by random()) from jsonb_array_elements(q.datos->'items') o))
  else '{}'::jsonb end) order by random()) into r from cia27_preguntas q where q.id=any(ids);
 return jsonb_build_object('intento',iid,'preguntas',r);
end$$;

-- 3) Califica en el servidor y guarda la nota.
create or replace function cia27_enviar(p_est uuid,p_intento uuid,p_resp jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare i cia27_intentos; q cia27_preguntas; a jsonb; ok boolean; n int:=0; d jsonb:='[]';
begin
 select * into i from cia27_intentos where id=p_intento and estudiante_id=p_est and enviado_en is null;
 if not found then raise exception 'Este ejercicio ya fue enviado o no existe.'; end if;
 for q in select * from cia27_preguntas where id=any(i.preguntas) loop
  a:=p_resp->(q.id::text);
  ok:=coalesce(case q.tipo
   when 'relacionar' then not exists(select 1 from jsonb_array_elements(q.correcta) p where a->>(p->>0) is distinct from p->>1)
   else a=q.correcta end,false);
  if ok then n:=n+1; end if;
  d:=d||jsonb_build_object('enunciado',q.enunciado,'ok',ok,'correcta',q.correcta,'explicacion',q.explicacion);
 end loop;
 update cia27_intentos set respuestas=p_resp,nota=n,enviado_en=now() where id=i.id;
 return jsonb_build_object('nota',n,'total',8,'detalle',d);
end$$;

revoke all on function cia27_ingresar(text,text),cia27_iniciar(uuid,text),cia27_enviar(uuid,uuid,jsonb) from public;
grant execute on function cia27_ingresar(text,text),cia27_iniciar(uuid,text),cia27_enviar(uuid,uuid,jsonb) to anon,authenticated;

-- Autoriza tu usuario docente (cambia el correo si usas otro):
insert into cia27_docentes(id,nombre) select id,'Prof. Samuel' from auth.users where email='profesorsamuelortega@gmail.com' on conflict (id) do nothing;
select * from cia27_docentes;
