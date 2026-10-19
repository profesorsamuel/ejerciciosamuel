-- CIA · Técnica activa para estudiantes (Banco de preguntas o Técnicas Enlace 2)
-- Pegar completo en Supabase > SQL Editor > Run. No modifica tablas existentes.
create table if not exists public.cia_config(
  docente_id uuid primary key references public.cia_docentes(id) on delete cascade,
  tecnica_activa text not null default 'banco' check (tecnica_activa in ('banco','e2')),
  actualizado_en timestamptz not null default now()
);
alter table public.cia_config enable row level security;
drop policy if exists cia_config_docente on public.cia_config;
create policy cia_config_docente on public.cia_config for all to authenticated
  using (docente_id = auth.uid()) with check (docente_id = auth.uid());

-- El estudiante (sin sesión) consulta solo qué técnica está activa para su docente.
create or replace function public.cia_tecnica_activa(p_cedula text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select c.tecnica_activa
    from public.cia_estudiantes e
    join public.cia_config c on c.docente_id = e.docente_id
    where upper(regexp_replace(coalesce(e.cedula,''), '[^[:alnum:]]', '', 'g')) =
          upper(regexp_replace(coalesce(p_cedula,''), '[^[:alnum:]]', '', 'g'))
    limit 1
  ), 'banco');
$$;
revoke all on function public.cia_tecnica_activa(text) from public;
grant execute on function public.cia_tecnica_activa(text) to anon, authenticated;
