-- CIA: catálogo de evaluaciones adicionales, sin modificar intentos ni notas existentes.
create table if not exists public.cia_catalogo_evaluaciones (
 id bigint generated always as identity primary key,
 docente_id uuid not null references auth.users(id) on delete cascade,
 nombre text not null check (length(trim(nombre)) between 1 and 100),
 motor text not null check (motor in ('banco','e2')),
 orden integer not null default 3,
 activa boolean not null default true,
 creado_en timestamptz not null default now()
);
create index if not exists cia_catalogo_evaluaciones_docente_orden_idx on public.cia_catalogo_evaluaciones(docente_id,orden);
alter table public.cia_catalogo_evaluaciones enable row level security;
drop policy if exists cia_catalogo_propietario on public.cia_catalogo_evaluaciones;
create policy cia_catalogo_propietario on public.cia_catalogo_evaluaciones for all to authenticated
 using (docente_id = (select auth.uid())) with check (docente_id = (select auth.uid()));
grant select,insert,update,delete on public.cia_catalogo_evaluaciones to authenticated;
grant usage,select on sequence public.cia_catalogo_evaluaciones_id_seq to authenticated;
