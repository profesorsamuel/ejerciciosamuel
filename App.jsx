/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: App.jsx
 * React + Tailwind CSS 4
 */

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase, configurado } from './supabase.js';

// Busca el valor de una columna aceptando varios nombres posibles
function tomar(fila, nombres) {
  const claves = Object.keys(fila);
  for (const n of nombres) {
    const k = claves.find(
      (c) => c.trim().toLowerCase() === n.toLowerCase()
    );
    if (k !== undefined) return String(fila[k] ?? '').trim();
  }
  return '';
}

function normalizar(fila) {
  return {
    codigo_estudiante: tomar(fila, ['codigo_estudiante', 'codigo', 'código', 'cedula', 'cédula']),
    nombres: tomar(fila, ['nombres', 'nombre', 'estudiante']),
    grado: tomar(fila, ['grado']),
    seccion: tomar(fila, ['seccion', 'sección']),
    anio_lectivo: tomar(fila, ['anio_lectivo', 'año_lectivo', 'año', 'anio']),
    estado: tomar(fila, ['estado']) || 'activo',
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [vista, setVista] = useState('inicio');
  const [codigo, setCodigo] = useState('');
  const [cedula, setCedula] = useState('');
  const [salon, setSalon] = useState('');
  const [salones, setSalones] = useState([]);
  const [resultadoAcceso, setResultadoAcceso] = useState('');
  const [filas, setFilas] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || session || vista !== 'inicio') return;
    let vigente = true;
    supabase.rpc('cia_salones_disponibles').then(({ data, error }) => {
      if (!vigente) return;
      setSalones(error ? [] : (data || []));
      if (error) setResultadoAcceso('Falta instalar el SQL de acceso a salones.');
    });
    return () => { vigente = false; };
  }, [session, vista]);

  function verificarMatricula(e) {
    e.preventDefault();
    setResultadoAcceso('Salón seleccionado. Para proteger los datos de los estudiantes, la validación de cédula requiere un PIN individual y una función segura que aún no está instalada.');
  }

  async function iniciarSesion(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }

  async function leerExcel(e) {
    const archivo = e.target.files?.[0];
    setMensaje('');
    setFilas([]);
    if (!archivo) return;
    try {
      const libro = XLSX.read(await archivo.arrayBuffer());
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const datos = XLSX.utils.sheet_to_json(hoja, { defval: '' }).map(normalizar);
      setFilas(datos.filter((f) => f.codigo_estudiante || f.nombres));
    } catch (err) {
      setMensaje('No se pudo leer el archivo: ' + err.message);
    }
  }

  async function confirmarImportacion() {
    setGuardando(true);
    setMensaje('');
    const { data, error } = await supabase.rpc('cia_importar_matricula', {
      p_filas: filas,
    });
    setGuardando(false);
    if (error) {
      setMensaje('Error: ' + error.message);
    } else {
      setMensaje('Matrícula importada: ' + data + ' estudiantes.');
      setFilas([]);
    }
  }

  const boton = (activo) =>
    'rounded-xl px-4 py-2 ' + (activo ? 'bg-blue-700 text-white' : 'bg-slate-100');

  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-10">
      <header className="mb-8 rounded-3xl bg-slate-900 p-8 text-white">
        <div className="text-sm text-cyan-300">CIA · Proyecto independiente</div>
        <h1 className="mt-2 text-3xl font-bold">Ciencias IA</h1>
        <p className="mt-2 text-slate-300">Fase 1 · Verdadero o falso · Gestión de matrícula</p>
      </header>

      {!configurado && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
        </div>
      )}

      {session ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Panel del profesor</h2>
            <button
              className="rounded-xl border px-4 py-2"
              onClick={() => supabase.auth.signOut()}
            >
              Salir
            </button>
          </div>
          <p className="mt-3 text-slate-600">Sesión iniciada: {session.user.email}</p>

          <h3 className="mt-6 text-lg font-bold">Importar matrícula (Excel)</h3>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={leerExcel}
            className="mt-3 block w-full rounded-xl border p-3"
          />

          {filas.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">
                Vista previa: {filas.length} estudiantes
              </p>
              <div className="max-h-72 overflow-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2">Código</th>
                      <th className="p-2">Nombres</th>
                      <th className="p-2">Grado</th>
                      <th className="p-2">Sección</th>
                      <th className="p-2">Año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{f.codigo_estudiante}</td>
                        <td className="p-2">{f.nombres}</td>
                        <td className="p-2">{f.grado}</td>
                        <td className="p-2">{f.seccion}</td>
                        <td className="p-2">{f.anio_lectivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={confirmarImportacion}
                disabled={guardando}
                className="mt-4 rounded-xl bg-blue-700 px-4 py-3 text-white disabled:opacity-40"
              >
                {guardando ? 'Guardando…' : 'Confirmar importación'}
              </button>
            </div>
          )}

          {mensaje && <p className="mt-4 rounded-xl bg-blue-50 p-4">{mensaje}</p>}
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex gap-2">
            <button onClick={() => setVista('inicio')} className={boton(vista === 'inicio')}>
              Estudiante
            </button>
            <button onClick={() => setVista('profesor')} className={boton(vista === 'profesor')}>
              Profesor
            </button>
          </div>

          {vista === 'profesor' ? (
            <form onSubmit={iniciarSesion} className="grid gap-3">
              <h2 className="text-xl font-bold">Acceso del profesor</h2>
              <input
                className="rounded-xl border p-3"
                type="email"
                placeholder="Correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="rounded-xl border p-3"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-red-700">{error}</p>}
              <button
                disabled={!configurado}
                className="rounded-xl bg-blue-700 p-3 text-white disabled:opacity-40"
              >
                Ingresar
              </button>
            </form>
          ) : (
            <form onSubmit={verificarMatricula} className="grid gap-3">
              <h2 className="text-xl font-bold">Ingreso del estudiante</h2>
              <label className="font-semibold" htmlFor="cia-salon">Grado y salón</label>
              <select id="cia-salon" className="rounded-xl border p-3" value={salon} onChange={(e) => { setSalon(e.target.value); setResultadoAcceso(''); }} required>
                <option value="">Seleccione su grado y salón</option>
                {salones.map((g) => <option key={`${g.grado}|${g.seccion}|${g.anio_lectivo}`} value={`${g.grado}|${g.seccion}|${g.anio_lectivo}`}>
                  {g.grado}° {g.seccion} · Año {g.anio_lectivo}
                </option>)}
              </select>
              <label className="font-semibold" htmlFor="cia-cedula">Número de cédula</label>
              <input id="cia-cedula" className="rounded-xl border p-3" placeholder="Ejemplo: 3-123-4567" value={cedula} onChange={(e) => { setCedula(e.target.value); setResultadoAcceso(''); }} autoComplete="off" required maxLength={60} />
              <p className="rounded-xl bg-blue-50 p-3 text-sm">Seleccione el salón donde está matriculado y escriba su cédula. El ingreso seguro con cédula y PIN se activará cuando el profesor instale la siguiente fase.</p>
              <button type="submit" disabled={!configurado || !salon || !cedula.trim()} className="rounded-xl bg-blue-700 p-3 text-white disabled:opacity-40">'Continuar'</button>
              {resultadoAcceso && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{resultadoAcceso}</p>}
            </form>
          )}
        </section>
      )}

      <footer className="mt-6 text-center text-sm text-slate-500">
        Este módulo no modifica los ejercicios HTML existentes.
      </footer>
    </main>
  );
}
