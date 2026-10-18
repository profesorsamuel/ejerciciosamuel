/* CIA - PASO 9B: asignaciones por salon del profesor. */
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const campo = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none';
const fechaLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const fechaTexto = (iso) => iso ? new Date(iso).toLocaleString('es-PA') : 'Sin fecha limite';
const salonClave = (s) => [s.grado, s.seccion, s.anio_lectivo].join('|');

export default function ProfesorAsignaciones() {
  const [ejercicios, setEjercicios] = useState([]);
  const [salones, setSalones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [ejercicioId, setEjercicioId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [fechaLimite, setFechaLimite] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    const [e, s, a] = await Promise.all([
      supabase.rpc('cia_profesor_listar_ejercicios'),
      supabase.rpc('cia_profesor_salones'),
      supabase.rpc('cia_profesor_listar_asignaciones'),
    ]);
    setCargando(false);
    const fallo = [e, s, a].find(x => x.error);
    if (fallo) { setError('No se pudo cargar la informacion: ' + fallo.error.message); return; }
    setEjercicios((e.data || []).filter(x => x.publicado));
    setSalones(s.data || []);
    setAsignaciones(a.data || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function asignar(evento) {
    evento.preventDefault(); setError(''); setMensaje('');
    const salon = salones.find(x => salonClave(x) === salonId);
    if (!salon || !ejercicioId) { setError('Selecciona un ejercicio publicado y un salon.'); return; }
    const fecha = fechaLimite ? new Date(fechaLimite) : null;
    if (fecha && Number.isNaN(fecha.getTime())) { setError('La fecha limite no es valida.'); return; }
    if (abierta && fecha && fecha.getTime() <= Date.now()) { setError('Para abrir el ejercicio, la fecha limite debe ser futura.'); return; }
    setGuardando(true);
    const { error: fallo } = await supabase.rpc('cia_profesor_asignar_ejercicio', {
      p_ejercicio_id: ejercicioId,
      p_grado: salon.grado,
      p_seccion: salon.seccion,
      p_anio_lectivo: salon.anio_lectivo,
      p_abierta: abierta,
      p_fecha_limite: fecha ? fecha.toISOString() : null,
    });
    setGuardando(false);
    if (fallo) { setError('No se pudo guardar la asignacion: ' + fallo.message); return; }
    setMensaje('Asignacion guardada correctamente. Puedes asignar el mismo ejercicio a otro salon.');
    await cargar();
  }

  function editarAsignacion(a) {
    setEjercicioId(a.ejercicio_id);
    setSalonId([a.grado, a.seccion, a.anio_lectivo].join('|'));
    setAbierta(a.abierta);
    setFechaLimite(fechaLocal(a.fecha_limite));
    setMensaje('Asignacion cargada. Cambia su estado o fecha y pulsa Guardar asignacion.');
    setError('');
  }

  return (
    <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Asignar ejercicios por salon</h3>
        <button type="button" onClick={cargar} disabled={cargando || guardando} className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm disabled:opacity-50">Actualizar listas</button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Selecciona un ejercicio publicado y un salon con matricula activa. Cada salon se administra por separado.</p>
      <form onSubmit={asignar} className="mt-4 space-y-3">
        <div>
          <label htmlFor="cia-asig-ejercicio" className="mb-1 block text-sm font-semibold">Ejercicio publicado</label>
          <select id="cia-asig-ejercicio" className={campo} value={ejercicioId} onChange={e => setEjercicioId(e.target.value)} required>
            <option value="">Selecciona un ejercicio</option>
            {ejercicios.map(e => <option key={e.id} value={e.id}>{e.titulo} ({e.cantidad_preguntas} preguntas)</option>)}
          </select>
          {!ejercicios.length && <p className="mt-1 text-xs text-amber-800">No hay ejercicios publicados. Publica uno y pulsa Actualizar listas.</p>}
        </div>
        <div>
          <label htmlFor="cia-asig-salon" className="mb-1 block text-sm font-semibold">Salon</label>
          <select id="cia-asig-salon" className={campo} value={salonId} onChange={e => setSalonId(e.target.value)} required>
            <option value="">Selecciona un salon</option>
            {salones.map(s => <option key={salonClave(s)} value={salonClave(s)}>{s.grado}.º {s.seccion} · {s.anio_lectivo} ({s.estudiantes} estudiantes)</option>)}
          </select>
          {!salones.length && <p className="mt-1 text-xs text-amber-800">No hay salones con matricula activa para este profesor.</p>}
        </div>
        <div>
          <label htmlFor="cia-asig-fecha" className="mb-1 block text-sm font-semibold">Fecha limite (opcional)</label>
          <input id="cia-asig-fecha" type="datetime-local" className={campo} value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <input type="checkbox" checked={abierta} onChange={e => setAbierta(e.target.checked)} className="h-4 w-4" />
          <span><strong>Ejercicio abierto</strong><span className="block text-xs text-slate-500">Desmarcado = cerrado para estudiantes</span></span>
        </label>
        <button type="submit" disabled={guardando || cargando || !ejercicios.length || !salones.length} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar asignacion'}</button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{mensaje}</p>}
      <h4 className="mt-6 text-sm font-bold">Asignaciones registradas</h4>
      {!asignaciones.length && <p className="mt-2 text-sm text-slate-500">Todavia no hay asignaciones.</p>}
      <div className="mt-2 space-y-2">
        {asignaciones.map(a => <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><strong className="break-words">{a.titulo}</strong><p className="mt-1 text-xs text-slate-600">{a.grado}.º {a.seccion} · {a.anio_lectivo}</p><p className="mt-1 text-xs text-slate-600">{fechaTexto(a.fecha_limite)}</p></div>
            <span className={'shrink-0 rounded-full px-2 py-1 text-xs font-semibold ' + (a.abierta ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>{a.abierta ? 'Abierto' : 'Cerrado'}</span>
          </div>
          <button type="button" onClick={() => editarAsignacion(a)} className="mt-2 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs text-indigo-800">Cambiar estado o fecha</button>
        </div>)}
      </div>
      <p className="mt-3 text-xs text-slate-500">Nota: la pantalla del estudiante para resolver ejercicios se incorporara en el siguiente paso. Una asignacion abierta aun no permite responder desde el portal actual.</p>
    </section>
  );
}
