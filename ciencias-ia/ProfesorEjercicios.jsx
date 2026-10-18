/* CIA - Paso 6: editor manual de Verdadero o falso. */
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const nuevaPregunta = () => ({ enunciado: '', correcta: true, explicacion: '' });
const campo = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none';
const boton = 'rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';

export default function ProfesorEjercicios() {
  const [titulo, setTitulo] = useState('');
  const [preguntas, setPreguntas] = useState([nuevaPregunta()]);
  const [id, setId] = useState(null);
  const [publicado, setPublicado] = useState(false);
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function cargarLista() {
    const { data, error: fallo } = await supabase.rpc('cia_profesor_listar_ejercicios');
    if (fallo) setError('No se pudo consultar la lista: ' + fallo.message);
    else setEjercicios(data || []);
  }
  useEffect(() => { cargarLista(); }, []);

  function cambiar(i, clave, valor) {
    setPreguntas(actual => actual.map((p, j) => i === j ? { ...p, [clave]: valor } : p));
  }
  function limpiar() {
    setId(null); setTitulo(''); setPreguntas([nuevaPregunta()]); setPublicado(false);
    setMensaje(''); setError('');
  }
  function validar() {
    if (!titulo.trim() || titulo.trim().length > 200) return 'Escribe un título de 1 a 200 caracteres.';
    if (!preguntas.length || preguntas.length > 80) return 'Debe haber entre 1 y 80 preguntas.';
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      if (p.enunciado.trim().length < 5 || p.enunciado.trim().length > 2000) return `Revisa el enunciado de la pregunta ${i + 1} (5 a 2000 caracteres).`;
      if (p.explicacion.trim().length < 3 || p.explicacion.trim().length > 2000) return `Revisa la explicación de la pregunta ${i + 1} (3 a 2000 caracteres).`;
    }
    return '';
  }
  async function guardar() {
    const problema = validar();
    setMensaje(''); setError(problema);
    if (problema) return;
    setCargando(true);
    const limpias = preguntas.map(p => ({ enunciado: p.enunciado.trim(), correcta: p.correcta, explicacion: p.explicacion.trim() }));
    const { data, error: fallo } = await supabase.rpc('cia_profesor_guardar_ejercicio', {
      p_titulo: titulo.trim(), p_preguntas: limpias, p_ejercicio_id: id, p_documento_id: null,
    });
    setCargando(false);
    if (fallo) { setError(fallo.message); return; }
    setId(data); setError(''); setMensaje('Ejercicio guardado correctamente. Puedes publicarlo cuando esté listo.');
    await cargarLista();
  }
  async function publicar(valor) {
    if (!id) { setError('Primero guarda el ejercicio.'); return; }
    setCargando(true); setError(''); setMensaje('');
    const { error: fallo } = await supabase.rpc('cia_profesor_publicar_ejercicio', { p_ejercicio_id: id, p_publicado: valor });
    setCargando(false);
    if (fallo) { setError(fallo.message); return; }
    setPublicado(valor);
    setMensaje(valor ? 'Ejercicio publicado. Aún debes asignarlo a un salón en el siguiente paso.' : 'Ejercicio retirado de publicación.');
    await cargarLista();
  }
  function abrirEjercicio(e) {
    setId(e.id); setTitulo(e.titulo); setPublicado(e.publicado);
    // La RPC de listado no entrega preguntas. No se permite fingir que se cargaron.
    setPreguntas([nuevaPregunta()]);
    setError('Este ejercicio está guardado, pero el listado actual no devuelve sus preguntas. No lo edites desde aquí todavía: se añadirá una función de lectura segura.');
    setMensaje('');
  }
  return (
    <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Ejercicios · Verdadero o falso</h3>
        <button type="button" onClick={limpiar} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">+ Nuevo ejercicio</button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Primera prueba: crea preguntas manualmente. La IA y los PDF se añadirán después.</p>
      <div className="mt-4">
        <label className="mb-1 block text-sm font-semibold" htmlFor="cia-titulo">Título</label>
        <input id="cia-titulo" className={campo} value={titulo} maxLength={200} placeholder="Ejemplo: La célula — Clase 1" onChange={e => setTitulo(e.target.value)} />
      </div>
      <div className="mt-4 space-y-4">
        {preguntas.map((p, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <strong className="text-sm">Pregunta {i + 1}</strong>
              <button type="button" disabled={preguntas.length === 1 || cargando} onClick={() => setPreguntas(actual => actual.filter((_, j) => j !== i))} className="text-xs text-red-700 disabled:opacity-40">Eliminar</button>
            </div>
            <label className="block text-xs font-semibold">Enunciado</label>
            <textarea className={campo + ' mt-1'} rows={2} value={p.enunciado} onChange={e => cambiar(i, 'enunciado', e.target.value)} placeholder="Escribe una afirmación..." />
            <label className="mt-3 block text-xs font-semibold">Respuesta correcta</label>
            <select className={campo + ' mt-1'} value={String(p.correcta)} onChange={e => cambiar(i, 'correcta', e.target.value === 'true')}>
              <option value="true">Verdadero</option><option value="false">Falso</option>
            </select>
            <label className="mt-3 block text-xs font-semibold">Explicación para después de responder</label>
            <textarea className={campo + ' mt-1'} rows={2} value={p.explicacion} onChange={e => cambiar(i, 'explicacion', e.target.value)} placeholder="Explica por qué..." />
          </div>
        ))}
      </div>
      <button type="button" disabled={cargando || preguntas.length >= 80} onClick={() => setPreguntas(actual => [...actual, nuevaPregunta()])} className="mt-3 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">+ Agregar pregunta</button>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={boton} disabled={cargando || (id && error.startsWith('Este ejercicio está guardado'))} onClick={guardar}>{cargando ? 'Procesando…' : id ? 'Guardar cambios' : 'Guardar ejercicio'}</button>
        {id && !error.startsWith('Este ejercicio está guardado') && <button type="button" disabled={cargando} onClick={() => publicar(!publicado)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{publicado ? 'Retirar publicación' : 'Publicar ejercicio'}</button>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {mensaje && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{mensaje}</p>}
      <h4 className="mt-6 text-sm font-bold">Ejercicios guardados</h4>
      <div className="mt-2 space-y-2">
        {ejercicios.length === 0 && <p className="text-sm text-slate-500">Todavía no hay ejercicios guardados.</p>}
        {ejercicios.map(e => <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm">
          <span className="min-w-0 break-words"><strong>{e.titulo}</strong><span className="block text-xs text-slate-500">{e.cantidad_preguntas} preguntas · {e.publicado ? 'Publicado' : 'Borrador'}</span></span>
          <button type="button" className="shrink-0 rounded-lg border px-3 py-1.5 text-xs" onClick={() => abrirEjercicio(e)}>Ver</button>
        </div>)}
      </div>
    </section>
  );
}
