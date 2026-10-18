/* CIA - Paso 11B: ejercicios del estudiante, sin respuestas antes de entregar. */
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const btn = 'rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';
const tarjeta = 'rounded-xl border border-slate-200 bg-white p-4';

export default function EstudianteEjercicios({ estudianteId, cedula, onSalir }) {
  const [lista, setLista] = useState([]);
  const [actual, setActual] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarLista() {
    setCargando(true); setError('');
    const { data, error: fallo } = await supabase.rpc('cia_estudiante_listar_ejercicios', {
      p_estudiante_id: estudianteId, p_cedula: cedula,
    });
    setCargando(false);
    if (fallo) setError('No se pudieron cargar los ejercicios: ' + fallo.message);
    else setLista(data || []);
  }
  useEffect(() => { cargarLista(); }, [estudianteId, cedula]);

  async function abrir(item) {
    setCargando(true); setError(''); setMensaje(''); setResultado(null); setActual(null);
    const funcion = item.entregado ? 'cia_estudiante_ver_resultado' : 'cia_estudiante_obtener_ejercicio';
    const { data, error: fallo } = await supabase.rpc(funcion, {
      p_estudiante_id: estudianteId, p_cedula: cedula, p_asignacion_id: item.asignacion_id,
    });
    setCargando(false);
    if (fallo) { setError(fallo.message); return; }
    setActual({ ...item, preguntas: item.entregado ? [] : (data?.preguntas || []) });
    setRespuestas((data?.preguntas || []).map(() => null));
    if (item.entregado) setResultado(data);
  }

  async function entregar() {
    if (!actual || cargando || respuestas.some(r => r === null)) {
      setError('Debes responder todas las preguntas.'); return;
    }
    if (!window.confirm('¿Deseas entregar? Solo tienes un intento.')) return;
    setCargando(true); setError('');
    const { data, error: fallo } = await supabase.rpc('cia_estudiante_entregar_ejercicio', {
      p_estudiante_id: estudianteId, p_cedula: cedula,
      p_asignacion_id: actual.asignacion_id, p_respuestas: respuestas,
    });
    setCargando(false);
    if (fallo) { setError('No se pudo entregar: ' + fallo.message); return; }
    setResultado(data);
    setMensaje('Ejercicio entregado correctamente. Tu nota quedó registrada.');
    setLista(prev => prev.map(x => x.asignacion_id === actual.asignacion_id ? { ...x, entregado: true } : x));
  }

  return <section className="mt-5 space-y-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-slate-900">Mis ejercicios</h2>
      <button type="button" onClick={onSalir} className="rounded-lg border px-3 py-2 text-sm">Salir</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {mensaje && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{mensaje}</p>}
    {cargando && <p className="text-sm text-slate-500">Cargando…</p>}
    {!actual && <div className="space-y-3">
      <button type="button" onClick={cargarLista} disabled={cargando} className="text-sm font-semibold text-blue-700">Actualizar lista</button>
      {!cargando && lista.length === 0 && <p className={tarjeta + ' text-sm text-slate-600'}>No hay ejercicios abiertos disponibles para tu salón.</p>}
      {lista.map(item => <div key={item.asignacion_id} className={tarjeta + ' flex items-center justify-between gap-3'}>
        <div><h3 className="font-semibold">{item.titulo}</h3><p className="text-xs text-slate-500">{item.cantidad_preguntas} preguntas · {item.entregado ? 'Entregado' : 'Pendiente'}</p>
          {item.fecha_limite && <p className="text-xs text-slate-500">Límite: {new Date(item.fecha_limite).toLocaleString('es-PA')}</p>}
        </div>
        <button type="button" disabled={cargando} onClick={() => abrir(item)} className={btn}>{item.entregado ? 'Ver nota' : 'Resolver'}</button>
      </div>)}
    </div>}
    {actual && <div className="space-y-4">
      <button type="button" onClick={() => { setActual(null); setResultado(null); setError(''); cargarLista(); }} className="text-sm font-semibold text-blue-700">← Volver a mis ejercicios</button>
      <h3 className="text-lg font-bold">{actual.titulo}</h3>
      {!resultado && <>
        <p className="text-sm text-slate-600">Selecciona Verdadero o Falso en cada pregunta. Solo puedes entregar una vez.</p>
        {actual.preguntas.map((p, i) => <fieldset key={i} className={tarjeta}>
          <legend className="font-semibold text-sm">Pregunta {i + 1}</legend>
          <p className="my-3 text-sm">{p.enunciado}</p>
          <div className="flex flex-wrap gap-3">{[true, false].map(v => <label key={String(v)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input type="radio" name={'pregunta-'+i} checked={respuestas[i] === v} onChange={() => setRespuestas(prev => prev.map((r, j) => i === j ? v : r))} />{v ? 'Verdadero' : 'Falso'}
          </label>)}</div>
        </fieldset>)}
        <button type="button" onClick={entregar} disabled={cargando || respuestas.some(r => r === null)} className={btn}>Entregar ejercicio</button>
      </>}
      {resultado && <div className="space-y-3">
        <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm">Calificación</p><p className="text-3xl font-bold text-blue-900">{Number(resultado.nota).toFixed(2)} / 5.00</p>
          {resultado.total != null && <p className="text-sm">{resultado.aciertos} de {resultado.total} respuestas correctas</p>}</div>
        {(resultado.detalle || []).map((d,i) => <div key={i} className={tarjeta}>
          <p className="font-semibold text-sm">{i + 1}. {d.enunciado}</p>
          <p className="mt-2 text-sm">Tu respuesta: {d.respuesta_estudiante ? 'Verdadero' : 'Falso'}</p>
          <p className="text-sm">Correcta: {d.correcta ? 'Verdadero' : 'Falso'}</p>
          <p className={'mt-1 text-sm font-semibold ' + (d.acierto ? 'text-green-700' : 'text-red-700')}>{d.acierto ? 'Correcto' : 'Incorrecto'}</p>
          <p className="mt-2 text-sm text-slate-600">{d.explicacion}</p>
        </div>)}
      </div>}
    </div>}
  </section>;
}
