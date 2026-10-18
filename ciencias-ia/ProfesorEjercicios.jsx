/* CIA - Paso 6: editor manual de Verdadero o falso. */
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import GeneradorPDF from './GeneradorPDF.jsx';
import { supabase } from './supabase.js';

const nuevaPregunta = () => ({ enunciado: '', correcta: true, explicacion: '' });
const campo = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none';
const boton = 'rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';

export default function ProfesorEjercicios() {
  const [titulo, setTitulo] = useState('');
  const [preguntas, setPreguntas] = useState([nuevaPregunta()]);
  const [id, setId] = useState(null);
  const [publicado, setPublicado] = useState(false);
  const [documentoId, setDocumentoId] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [banco, setBanco] = useState([]);
  const [cantidad, setCantidad] = useState(20);

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
    setId(null); setTitulo(''); setPreguntas([nuevaPregunta()]); setPublicado(false); setDocumentoId(null);
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
  // Importa un banco local sin subir el archivo original al servidor.
  async function importarBanco(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setError(''); setMensaje('');
    try {
      if (archivo.size > 3 * 1024 * 1024) throw new Error('El archivo debe pesar menos de 3 MB.');
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { defval: '' });
      if (!filas.length || filas.length > 500) throw new Error('El banco debe contener entre 1 y 500 filas.');
      const tomar = (f, claves) => {
        const clave = Object.keys(f).find(k => claves.includes(k.trim().toLowerCase()));
        return clave ? String(f[clave]).trim() : '';
      };
      const convertidas = filas.map((f, i) => {
        const enunciado = tomar(f, ['enunciado', 'pregunta', 'afirmacion', 'afirmación']);
        const respuesta = tomar(f, ['correcta', 'respuesta', 'verdadero_falso']).toLowerCase();
        const explicacion = tomar(f, ['explicacion', 'explicación', 'justificacion', 'justificación']);
        if (!enunciado || !explicacion || !['verdadero', 'falso', 'v', 'f', 'true', 'false', '1', '0'].includes(respuesta)) {
          throw new Error(`Fila ${i + 2}: revisa enunciado, correcta (Verdadero/Falso) y explicacion.`);
        }
        return { enunciado, correcta: ['verdadero', 'v', 'true', '1'].includes(respuesta), explicacion };
      });
      setBanco(convertidas);
      setMensaje(`Banco cargado: ${convertidas.length} preguntas. Selecciona cuántas pasar al ejercicio.`);
    } catch (e) { setError('No se pudo importar el banco: ' + e.message); }
  }
  function seleccionarBanco() {
    if (!banco.length) return;
    if (id) { setError('Pulsa + Nuevo ejercicio antes de generar otro conjunto; así no modificarás un ejercicio existente.'); return; }
    const n = Math.min(80, Math.max(1, Number(cantidad) || 20), banco.length);
    const copia = [...banco];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    setPreguntas(copia.slice(0, n));
    setMensaje(`${n} preguntas elegidas aleatoriamente. Revísalas y pulsa Guardar ejercicio.`);
    setError('');
  }
  function descargarPlantilla() {
    const ejemplo = [{ enunciado: 'El agua está formada por hidrógeno y oxígeno.', correcta: 'Verdadero', explicacion: 'Su fórmula química es H2O.' }, { enunciado: 'La Tierra es una estrella.', correcta: 'Falso', explicacion: 'La Tierra es un planeta.' }];
    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Banco');
    XLSX.writeFile(libro, 'CIA_plantilla_banco_preguntas.xlsx');
  }
  async function guardar() {
    const problema = validar();
    setMensaje(''); setError(problema);
    if (problema) return;
    setCargando(true);
    const limpias = preguntas.map(p => ({ enunciado: p.enunciado.trim(), correcta: p.correcta, explicacion: p.explicacion.trim() }));
    const { data, error: fallo } = await supabase.rpc('cia_profesor_guardar_ejercicio', {
      p_titulo: titulo.trim(), p_preguntas: limpias, p_ejercicio_id: id, p_documento_id: documentoId,
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
  async function abrirEjercicio(e) {
    setCargando(true); setError(''); setMensaje('');
    const { data, error: fallo } = await supabase.rpc('cia_profesor_obtener_ejercicio', { p_ejercicio_id: e.id });
    setCargando(false);
    if (fallo) { setError('No se pudo abrir el ejercicio: ' + fallo.message); return; }
    const detalle = Array.isArray(data) ? data[0] : data;
    if (!detalle || !Array.isArray(detalle.preguntas) || detalle.preguntas.length === 0) {
      setError('No se encontraron las preguntas del ejercicio.'); return;
    }
    setId(detalle.id);
    setTitulo(detalle.titulo);
    setPublicado(detalle.publicado);
    setDocumentoId(detalle.documento_id || null);
    setPreguntas(detalle.preguntas.map(p => ({
      enunciado: p.enunciado || '', correcta: p.correcta === true, explicacion: p.explicacion || ''
    })));
    setMensaje('Ejercicio cargado. Puedes revisarlo y publicarlo.');
  }
  return (
    <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Ejercicios · Verdadero o falso</h3>
        <button type="button" onClick={limpiar} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">+ Nuevo ejercicio</button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Crea preguntas manualmente o importa un banco Excel/CSV. La generación automática mediante IA desde PDF requiere una etapa de servidor independiente.</p>
      <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3 space-y-3">
        <h4 className="font-bold text-indigo-900">Banco de preguntas · Importar Excel o CSV</h4>
        <p className="text-xs text-slate-600">Prepara hasta 500 afirmaciones con columnas: enunciado, correcta, explicacion. Elige hasta 80 por ejercicio. El banco se mantiene solo en esta sesión del navegador; guarda el ejercicio para conservar las seleccionadas en Supabase.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={descargarPlantilla} className="rounded-lg border border-indigo-300 px-3 py-2 text-sm">Descargar plantilla Excel</button>
          <a href={`${import.meta.env.BASE_URL}CIA_demo_banco_preguntas.xlsx`} download="CIA_demo_banco_preguntas.xlsx" className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Descargar demo Excel (20 preguntas)</a>
          <a href={`${import.meta.env.BASE_URL}CIA_demo_banco_preguntas.csv`} download="CIA_demo_banco_preguntas.csv" className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Descargar demo CSV</a>
          <label className="rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white cursor-pointer">Importar banco<input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={importarBanco} /></label>
        </div>
        {banco.length > 0 && <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{banco.length} preguntas disponibles · Seleccionar:</span>
          <input type="number" min="1" max={Math.min(80,banco.length)} value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-20 rounded-lg border p-2 text-sm" />
          <button type="button" onClick={seleccionarBanco} disabled={cargando} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Crear ejercicio aleatorio</button>
        </div>}
      </div>
      <GeneradorPDF bloqueado={Boolean(id)} onGenerado={(items,nombre)=>{setPreguntas(items);setTitulo(`Evaluación de ${nombre.replace(/\.pdf$/i,'')}`.slice(0,200));setError('');setMensaje('Preguntas generadas. Revisa las respuestas y explicaciones antes de guardar.');}} />
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
        <button type="button" className={boton} disabled={cargando} onClick={guardar}>{cargando ? 'Procesando…' : id ? 'Guardar cambios' : 'Guardar ejercicio'}</button>
        {id && <button type="button" disabled={cargando} onClick={() => publicar(!publicado)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{publicado ? 'Retirar publicación' : 'Publicar ejercicio'}</button>}
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
