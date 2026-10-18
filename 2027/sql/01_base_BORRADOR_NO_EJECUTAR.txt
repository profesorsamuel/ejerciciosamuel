-- CIA 2027 | Base independiente. No modifica tablas de otros proyectos.
create table if not exists public.ej27_salones (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references auth.users(id), grado text not null, seccion text not null, anio_lectivo integer not null default 2027, created_at timestamptz not null default now(), unique(docente_id,grado,seccion,anio_lectivo)
);
comment on table public.ej27_salones is 'Proyecto ejercicios 2027';
create table if not exists public.ej27_estudiantes (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references auth.users(id), salon_id uuid not null references public.ej27_salones(id) on delete cascade, codigo_estudiante text, nombres text not null, cedula text not null, sexo text, correo_estudiante text, nombre_acudiente text, telefono_acudiente text, estado text not null default 'activo', created_at timestamptz not null default now(), unique(docente_id,cedula)
);
comment on table public.ej27_estudiantes is 'Proyecto ejercicios 2027';
create index if not exists ej27_idx_estudiantes_salon on public.ej27_estudiantes(salon_id);
alter table public.ej27_salones enable row level security;
alter table public.ej27_estudiantes enable row level security;
drop policy if exists ej27_policy_salones_docente on public.ej27_salones;
create policy ej27_policy_salones_docente on public.ej27_salones for all to authenticated using (docente_id = (select auth.uid())) with check (docente_id = (select auth.uid()));
drop policy if exists ej27_policy_estudiantes_docente on public.ej27_estudiantes;
create policy ej27_policy_estudiantes_docente on public.ej27_estudiantes for all to authenticated using (docente_id = (select auth.uid()) and exists (select 1 from public.ej27_salones s where s.id=salon_id and s.docente_id=(select auth.uid()))) with check (docente_id = (select auth.uid()) and exists (select 1 from public.ej27_salones s where s.id=salon_id and s.docente_id=(select auth.uid())));
revoke all on public.ej27_salones, public.ej27_estudiantes from anon;
grant select,insert,update,delete on public.ej27_salones, public.ej27_estudiantes to authenticated;
-- No incluye DROP ni limpieza automática: conservar los datos de prueba hasta confirmar.
