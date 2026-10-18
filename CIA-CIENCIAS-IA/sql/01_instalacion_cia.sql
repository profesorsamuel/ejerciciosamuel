-- CIA - Ciencias IA 2027 | Etapa 2: esquema inicial
-- IMPORTANTE: ejecutar exclusivamente en un proyecto Supabase NUEVO para CIA.
-- No ejecutar sobre la base de datos de Portal 2027.
-- Prefijo ej27_ conservado porque el JavaScript de CIA utiliza esos nombres.
-- Este script crea las tablas faltantes y políticas faltantes; no elimina datos.
-- Para instalaciones ya existentes, CREATE TABLE IF NOT EXISTS no corrige diferencias de esquema.

-- CIA 2027. Ejecutar UNA VEZ en el SQL Editor del proyecto Supabase correcto.
-- No altera tablas ajenas a ej27_. Autenticación de docentes por Supabase Auth.
create extension if not exists pgcrypto;
create table if not exists public.ej27_docentes (
 id uuid primary key references auth.users(id) on delete cascade,
 nombre text not null default '', creado_en timestamptz not null default now()
);
create table if not exists public.ej27_salones (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 nombre text not null, anio_lectivo integer not null default 2027, creado_en timestamptz not null default now(),
 unique(docente_id,nombre,anio_lectivo)
);
create table if not exists public.ej27_estudiantes (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 salon_id uuid references public.ej27_salones(id) on delete set null,
 codigo_estudiante text, nombres text not null, cedula text not null, sexo text, grado text, seccion text,
 anio_lectivo integer not null default 2027, correo_estudiante text, nombre_acudiente text,
 telefono_acudiente text, estado text not null default 'activo', creado_en timestamptz not null default now(),
 unique(docente_id,cedula,anio_lectivo)
);
create table if not exists public.ej27_bancos (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 nombre text not null, fuente text, creado_en timestamptz not null default now()
);
create table if not exists public.ej27_preguntas (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 banco_id uuid not null references public.ej27_bancos(id) on delete cascade,
 enunciado text not null, correcta text not null, explicacion text not null default '',
 distractores jsonb not null default '[]'::jsonb, tema text, nivel text, metadatos jsonb not null default '{}'::jsonb,
 creado_en timestamptz not null default now()
);
create table if not exists public.ej27_ejercicios (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 titulo text not null, tecnica integer not null check(tecnica between 1 and 25),
 salon_id uuid references public.ej27_salones(id) on delete set null,
 publicado boolean not null default false, vence_en timestamptz, max_nota numeric(5,2) not null default 5,
 creado_en timestamptz not null default now()
);
create table if not exists public.ej27_ejercicio_preguntas (
 ejercicio_id uuid not null references public.ej27_ejercicios(id) on delete cascade,
 pregunta_id uuid not null references public.ej27_preguntas(id) on delete restrict,
 posicion smallint not null check(posicion between 1 and 5),
 primary key(ejercicio_id,pregunta_id),unique(ejercicio_id,posicion)
);
create table if not exists public.ej27_intentos (
 id uuid primary key default gen_random_uuid(), docente_id uuid not null references public.ej27_docentes(id) on delete cascade,
 estudiante_id uuid not null references public.ej27_estudiantes(id) on delete cascade,
 ejercicio_id uuid not null references public.ej27_ejercicios(id) on delete cascade,
 respuestas jsonb not null default '[]'::jsonb, nota numeric(5,2), revision_pendiente boolean not null default false,
 creado_en timestamptz not null default now()
);
-- Todas las tablas tienen RLS habilitado, sin políticas de acceso anónimo.
alter table public.ej27_docentes enable row level security;
alter table public.ej27_salones enable row level security;
alter table public.ej27_estudiantes enable row level security;
alter table public.ej27_bancos enable row level security;
alter table public.ej27_preguntas enable row level security;
alter table public.ej27_ejercicios enable row level security;
alter table public.ej27_ejercicio_preguntas enable row level security;
alter table public.ej27_intentos enable row level security;
-- Crear políticas solo si no existen: reejecución segura.
do $$ declare t text; begin
 foreach t in array array['ej27_docentes','ej27_salones','ej27_estudiantes','ej27_bancos','ej27_preguntas','ej27_ejercicios','ej27_intentos'] loop
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='ej27_owner_all') then
   if t='ej27_docentes' then
    execute 'create policy ej27_owner_all on public.ej27_docentes for all to authenticated using (id = auth.uid()) with check (id = auth.uid())';
   else
    execute format('create policy ej27_owner_all on public.%I for all to authenticated using (docente_id = auth.uid()) with check (docente_id = auth.uid())',t);
   end if;
  end if;
 end loop;
end $$;
-- Los vínculos ejercicio/pregunta solo son visibles para el docente dueño del ejercicio.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='ej27_ejercicio_preguntas' and policyname='ej27_owner_links') then
  create policy ej27_owner_links on public.ej27_ejercicio_preguntas for all to authenticated
  using (exists(select 1 from public.ej27_ejercicios e where e.id=ejercicio_id and e.docente_id=auth.uid()))
  with check (exists(select 1 from public.ej27_ejercicios e where e.id=ejercicio_id and e.docente_id=auth.uid())
    and exists(select 1 from public.ej27_preguntas p where p.id=pregunta_id and p.docente_id=auth.uid()));
 end if;
end $$;
-- IMPORTANTE: no hay acceso estudiantil ni calificación segura implementados todavía.
