-- Ciencias IA - Fase 1: verdadero/falso
create extension if not exists pgcrypto;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nombre text not null default ''
);
create table public.documentos (
 id uuid primary key default gen_random_uuid(),
 profesor_id uuid not null references public.profiles(id) on delete cascade,
 nombre text not null,
 texto text,
 storage_path text,
 created_at timestamptz not null default now()
);
create table public.ejercicios (
 id uuid primary key default gen_random_uuid(),
 documento_id uuid not null references public.documentos(id) on delete cascade,
 tipo text not null check (tipo in ('verdadero_falso')),
 preguntas jsonb not null default '[]'::jsonb check (jsonb_typeof(preguntas) = 'array'),
 publicado boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.grupos (
 id uuid primary key default gen_random_uuid(),
 profesor_id uuid not null references public.profiles(id) on delete cascade,
 ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
 codigo text not null unique,
 activo boolean not null default true
);
create table public.estudiantes (
 id uuid primary key default gen_random_uuid(),
 grupo_id uuid not null references public.grupos(id) on delete cascade,
 nombre text not null check (length(btrim(nombre)) between 2 and 120)
);
create table public.respuestas (
 id uuid primary key default gen_random_uuid(),
 estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
 ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
 respuestas jsonb not null check (jsonb_typeof(respuestas) = 'object'),
 nota numeric(3,2) not null check (nota between 1 and 5),
 created_at timestamptz not null default now(),
 unique(estudiante_id, ejercicio_id)
);
create index on public.documentos(profesor_id);
create index on public.ejercicios(documento_id);
create index on public.grupos(profesor_id);
create index on public.estudiantes(grupo_id);
create index on public.respuestas(ejercicio_id);

create function public.es_profesor_documento(p_documento uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.documentos d where d.id=p_documento and d.profesor_id=(select auth.uid()));
$$;
create function public.es_profesor_ejercicio(p_ejercicio uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.ejercicios e join public.documentos d on d.id=e.documento_id where e.id=p_ejercicio and d.profesor_id=(select auth.uid()));
$$;
create function public.es_profesor_grupo(p_grupo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.grupos g where g.id=p_grupo and g.profesor_id=(select auth.uid()));
$$;

alter table public.profiles enable row level security;
alter table public.documentos enable row level security;
alter table public.ejercicios enable row level security;
alter table public.grupos enable row level security;
alter table public.estudiantes enable row level security;
alter table public.respuestas enable row level security;

create policy profiles_owner on public.profiles for all to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy documentos_owner on public.documentos for all to authenticated using (profesor_id=(select auth.uid())) with check (profesor_id=(select auth.uid()));
create policy ejercicios_select on public.ejercicios for select to authenticated using (public.es_profesor_documento(documento_id));
create policy ejercicios_insert on public.ejercicios for insert to authenticated with check (public.es_profesor_documento(documento_id));
create policy ejercicios_update on public.ejercicios for update to authenticated using (public.es_profesor_documento(documento_id)) with check (public.es_profesor_documento(documento_id));
create policy ejercicios_delete on public.ejercicios for delete to authenticated using (public.es_profesor_documento(documento_id));
create policy grupos_select on public.grupos for select to authenticated using (profesor_id=(select auth.uid()));
create policy grupos_insert on public.grupos for insert to authenticated with check (profesor_id=(select auth.uid()) and public.es_profesor_ejercicio(ejercicio_id));
create policy grupos_update on public.grupos for update to authenticated using (profesor_id=(select auth.uid())) with check (profesor_id=(select auth.uid()) and public.es_profesor_ejercicio(ejercicio_id));
create policy grupos_delete on public.grupos for delete to authenticated using (profesor_id=(select auth.uid()));
create policy estudiantes_profesor_select on public.estudiantes for select to authenticated using (public.es_profesor_grupo(grupo_id));
create policy respuestas_profesor_select on public.respuestas for select to authenticated using (
 exists(select 1 from public.estudiantes s join public.grupos g on g.id=s.grupo_id where s.id=estudiante_id and g.profesor_id=(select auth.uid()))
);

-- Las tablas nunca se consultan directamente desde un cliente anónimo.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on function public.es_profesor_documento(uuid), public.es_profesor_ejercicio(uuid), public.es_profesor_grupo(uuid) from public, anon;
grant execute on function public.es_profesor_documento(uuid), public.es_profesor_ejercicio(uuid), public.es_profesor_grupo(uuid) to authenticated;

-- Bucket privado. La ruta debe empezar con el UUID del profesor autenticado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-ciencias', 'documentos-ciencias', false, 10485760, array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf'];
create policy ciencias_pdf_insert on storage.objects for insert to authenticated
with check (bucket_id='documentos-ciencias' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy ciencias_pdf_select on storage.objects for select to authenticated
using (bucket_id='documentos-ciencias' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy ciencias_pdf_delete on storage.objects for delete to authenticated
using (bucket_id='documentos-ciencias' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Nota: las Edge Functions de estudiantes usarán service_role exclusivamente en servidor,
-- validarán código y token de participación y nunca devolverán respuestas correctas antes de entregar.
