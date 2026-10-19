-- Etapa siguiente: sincronizar indicadores de prácticas realizadas entre dispositivos.
-- Ejecutar una vez en Supabase SQL Editor. Las notas continúan en sus tablas originales.
create table if not exists public.cia_marcas_realizadas (
 estudiante_id uuid not null references public.cia_estudiantes(id) on delete cascade,
 periodo_id uuid null,
 tipo text not null,
 creado_en timestamptz not null default now(),
 primary key (estudiante_id,tipo,periodo_id)
);
-- Una restricción única adicional trata correctamente los periodos NULL.
create unique index if not exists cia_marcas_unicas
 on public.cia_marcas_realizadas(estudiante_id,coalesce(periodo_id::text,'sin-periodo'),tipo);
alter table public.cia_marcas_realizadas enable row level security;
revoke all on public.cia_marcas_realizadas from anon,authenticated;

create or replace function public.cia_registrar_marca(p_cedula text,p_periodo uuid,p_tipo text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_est uuid;
begin
 select id into v_est from public.cia_estudiantes
 where regexp_replace(cedula,'\s','','g')=regexp_replace(p_cedula,'\s','','g');
 if v_est is null then return false; end if;
 if p_tipo not in ('banco:multiple','banco:verdadero_falso','banco:completar','banco:relacionar','banco:ordenar',
 'e2:detective','e2:quien','e2:causa','e2:mito','e2:casos') then return false; end if;
 -- Sólo registra la marca del banco si hay un intento enviado; para Enlace 2
 -- el frontend sólo invoca esta función tras la confirmación de cia14_enviar.
 if left(p_tipo,6)='banco:' and not exists (
 select 1 from public.cia_intentos i where i.estudiante_id=v_est
 and i.tipo=substring(p_tipo from 7) and i.enviado_en is not null
 ) then return false; end if;
 insert into public.cia_marcas_realizadas(estudiante_id,periodo_id,tipo)
 values(v_est,p_periodo,p_tipo) on conflict do nothing;
 return true;
end $$;

create or replace function public.cia_marcas_realizadas(p_cedula text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_est uuid;
begin
 select id into v_est from public.cia_estudiantes
 where regexp_replace(cedula,'\s','','g')=regexp_replace(p_cedula,'\s','','g');
 if v_est is null then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('periodo_id',periodo_id,'tipo',tipo))
 from public.cia_marcas_realizadas where estudiante_id=v_est),'[]'::jsonb);
end $$;
grant execute on function public.cia_registrar_marca(text,uuid,text) to anon,authenticated;
grant execute on function public.cia_marcas_realizadas(text) to anon,authenticated;
