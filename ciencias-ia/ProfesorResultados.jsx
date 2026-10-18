/* CIA - Resultados por profesor y exportacion CSV UTF-8 con BOM. */
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

function exportarCSV(filas) {
  const columnas = ['Nombre','Grado','Sección','Año','Ejercicio','Nota','Fecha'];
  const escapar = (valor) => '"' + String(valor ?? '').replaceAll('"', '""') + '"';
  const lineas = [columnas, ...filas.map(f => [f.nombres, f.grado, f.seccion, f.anio_lectivo, f.titulo, f.nota, f.creado_en ? new Date(f.creado_en).toLocaleString('es-PA') : ''])];
  const contenido = '\uFEFF' + lineas.map(f => f.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'CIA_resultados_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProfesorResultados() {
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [salon, setSalon] = useState('todos');
  async function cargar() {
    setCargando(true); setError('');
    const { data, error: fallo } = await supabase.rpc('cia_profesor_resultados');
    setCargando(false);
    if (fallo) setError('No se pudieron consultar las notas: ' + fallo.message);
    else setFilas(data || []);
  }
  useEffect(() => { cargar(); }, []);
  const salones = [...new Set(filas.map(f => `${f.grado}|${f.seccion}|${f.anio_lectivo}`))];
  const visibles = salon === 'todos' ? filas : filas.filter(f => `${f.grado}|${f.seccion}|${f.anio_lectivo}` === salon);
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
    <h3 className="text-lg font-bold">Resultados de los estudiantes</h3>
    <p className="text-sm text-slate-600">Notas de los ejercicios entregados. Solo se muestran tus propios salones.</p>
    <div className="flex flex-wrap gap-2 items-center">
      <select aria-label="Filtrar salón" className="rounded-lg border p-2 text-sm" value={salon} onChange={e => setSalon(e.target.value)}>
        <option value="todos">Todos los salones</option>
        {salones.map(v => { const [grado,seccion,anio] = v.split('|'); return <option key={v} value={v}>{grado}.º {seccion} · {anio}</option>; })}
      </select>
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={cargar} disabled={cargando}>{cargando ? 'Cargando…' : 'Actualizar'}</button>
      <button type="button" className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={() => exportarCSV(visibles)} disabled={!visibles.length}>Exportar CSV para Excel</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!cargando && !visibles.length && !error && <p className="text-sm text-slate-500">Todavía no hay entregas para mostrar.</p>}
    {!!visibles.length && <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{['Estudiante','Salón','Ejercicio','Nota','Fecha'].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{visibles.map(f => <tr key={f.respuesta_id} className="border-b"><td className="p-2">{f.nombres}</td><td className="p-2 whitespace-nowrap">{f.grado}.º {f.seccion} · {f.anio_lectivo}</td><td className="p-2">{f.titulo}</td><td className="p-2 font-bold">{Number(f.nota).toFixed(2)}</td><td className="p-2 whitespace-nowrap">{new Date(f.creado_en).toLocaleString('es-PA')}</td></tr>)}</tbody></table></div>}
  </section>;
}
