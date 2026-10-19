-- CIA: acceso por cédula, para datos ficticios y pruebas.
-- ADVERTENCIA: conocer una cédula permite suplantar al estudiante.
-- No usar con calificaciones reales sin autenticación adicional.
create or replace function public.cia_ingresar_cedula(p_cedula text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare e public.cia_estudiantes%rowtype; n integer;
begin
  if nullif(trim(p_cedula),'') is null then
    raise exception 'Escriba una cédula.';
  end if;
  select count(*) into n from public.cia_estudiantes
  where upper(regexp_replace(cedula,'[^[:alnum:]]','','g')) =
        upper(regexp_replace(p_cedula,'[^[:alnum:]]','','g'));
  if n <> 1 then
    raise exception 'La cédula no corresponde a un estudiante único. Consulte al profesor.';
  end if;
  select * into e from public.cia_estudiantes
  where upper(regexp_replace(cedula,'[^[:alnum:]]','','g')) =
        upper(regexp_replace(p_cedula,'[^[:alnum:]]','','g')) limit 1;
  update public.cia_estudiantes set registrado_en=coalesce(registrado_en,now()) where id=e.id;
  return jsonb_build_object('id',e.id,'nombres',e.nombres,'cedula',e.cedula,
                            'grado',e.grado,'seccion',e.seccion);
end $$;
revoke all on function public.cia_ingresar_cedula(text) from public;
grant execute on function public.cia_ingresar_cedula(text) to anon, authenticated;
