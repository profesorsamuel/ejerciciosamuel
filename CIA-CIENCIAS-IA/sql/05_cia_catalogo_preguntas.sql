-- CIA: preguntas asignadas a cada evaluación del catálogo.
create table if not exists public.cia_catalogo_preguntas (
 docente_id uuid not null references auth.users(id) on delete cascade,
 catalogo_id bigint not null references public.cia_catalogo_evaluaciones(id) on delete cascade,
 pregunta_id uuid not null references public.cia_preguntas(id) on delete cascade,
 creado_en timestamptz not null default now(),
 primary key (catalogo_id,pregunta_id)
);
create index if not exists cia_cat_preg_docente_idx on public.cia_catalogo_preguntas(docente_id,catalogo_id);
alter table public.cia_catalogo_preguntas enable row level security;
drop policy if exists cia_cat_preg_propietario on public.cia_catalogo_preguntas;
create policy cia_cat_preg_propietario on public.cia_catalogo_preguntas for all to authenticated
 using (docente_id=auth.uid() and exists (select 1 from public.cia_catalogo_evaluaciones c where c.id=catalogo_id and c.docente_id=auth.uid()))
 with check (docente_id=auth.uid() and exists (select 1 from public.cia_catalogo_evaluaciones c where c.id=catalogo_id and c.docente_id=auth.uid()) and exists (select 1 from public.cia_preguntas p where p.id=pregunta_id and p.docente_id=auth.uid()));
grant select,insert,update,delete on public.cia_catalogo_preguntas to authenticated;
