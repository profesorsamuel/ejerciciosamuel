/*
 * PROYECTO: CIENCIAS IA
 * CODIGO: CIA
 * ARCHIVO: App.jsx
 * React + Tailwind CSS 4
 */

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { supabase, configurado } from './supabase.js';

const NOMBRES_GRADO = {
  '1': 'Primero', '2': 'Segundo', '3': 'Tercero', '4': 'Cuarto', '5': 'Quinto',
  '6': 'Sexto', '7': 'Séptimo', '8': 'Octavo', '9': 'Noveno', '10': 'Décimo',
  '11': 'Undécimo', '12': 'Duodécimo',
};

// Salones de ejemplo mientras no exista la función de Supabase
const SALONES_EJEMPLO = [
  { grado: '9', seccion: 'C', anio_lectivo: 2026 },
];

function etiquetaSalon(g) {
  const nombre = NOMBRES_GRADO[String(g.grado).trim()] || `Grado ${g.grado}`;
  return `${g.grado}.º ${g.seccion} — ${nombre} ${g.seccion}`;
}

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
    codigo_estudiante: tomar(fila, ['codigo_estudiante', 'codigo', 'código']) || tomar(fila, ['cedula', 'cédula']),
    cedula: tomar(fila, ['cedula', 'cédula']),
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
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [cargandoEst, setCargandoEst] = useState(false);
  const [verificando, setVerificando] = useState(false);
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
      
    });
    return () => { vigente = false; };
  }, [session, vista]);

  async function verificarMatricula(e) {
    e.preventDefault();
    if (!supabase || !estudianteId) return;
    setVerificando(true);
    setResultadoAcceso('');
    const { data, error } = await supabase.rpc('cia_verificar_estudiante', {
      p_estudiante_id: estudianteId,
      p_cedula: cedula.trim(),
    });
    setVerificando(false);
    if (error) {
      setResultadoAcceso('No se pudo verificar. Falta instalar el SQL CIA_007 en Supabase.');
    } else if (data && data.length > 0) {
      setResultadoAcceso('Matrícula verificada: ' + data[0].nombres + '. Los ejercicios se activarán en la siguiente fase.');
    } else {
      setResultadoAcceso('La cédula no coincide con el estudiante seleccionado.');
    }
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

  const listaSalones = salones.length ? salones : SALONES_EJEMPLO;
  const modoEjemplo = !configurado || salones.length === 0;
  const clave = (g) => `${g.grado}|${g.seccion}|${g.anio_lectivo}`;

  // Selecciona por defecto el primer salón disponible
  useEffect(() => {
    if (!salon && listaSalones.length) setSalon(clave(listaSalones[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salones]);

  // Carga la lista de nombres del salón seleccionado
  useEffect(() => {
    setEstudianteId('');
    setEstudiantes([]);
    if (!supabase || session || !salon || modoEjemplo) return;
    const [grado, seccion, anio] = salon.split('|');
    let vigente = true;
    setCargandoEst(true);
    supabase
      .rpc('cia_estudiantes_salon', { p_grado: grado, p_seccion: seccion, p_anio: Number(anio) })
      .then(({ data, error }) => {
        if (!vigente) return;
        setCargandoEst(false);
        if (error) setResultadoAcceso('Falta instalar el SQL CIA_007 (lista de estudiantes).');
        else setEstudiantes(data || []);
      });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon, session, modoEjemplo]);

  const pestana = (activa) =>
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
    (activa ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800');

  const campo =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 ' +
    'placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <main className="mx-auto max-w-xl p-4 sm:p-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <header className="rounded-2xl bg-slate-900 px-5 py-6 text-white">
          <div className="text-xs font-medium text-cyan-300">CIA · Proyecto independiente</div>
          <h1 className="mt-3 text-2xl font-bold">Ciencias IA</h1>
          <p className="mt-3 text-xs font-medium text-slate-200">Acceso a ejercicios virtuales</p>
        </header>

        {!configurado && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
            Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
          </div>
        )}

        {session ? (
          <section className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Panel del profesor</h2>
              <button
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                onClick={() => supabase.auth.signOut()}
              >
                Salir
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">Sesión iniciada: {session.user.email}</p>

            <h3 className="mt-6 text-base font-semibold">Importar matrícula (Excel)</h3>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={leerExcel}
              className="mt-3 block w-full rounded-xl border border-slate-200 p-3 text-sm"
            />

            {filas.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-slate-600">Vista previa: {filas.length} estudiantes</p>
                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2">Código</th>
                        <th className="p-2">Nombres</th>
                        <th className="p-2">Cédula</th>
                        <th className="p-2">Grado</th>
                        <th className="p-2">Sección</th>
                        <th className="p-2">Año</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          <td className="p-2">{f.codigo_estudiante}</td>
                          <td className="p-2">{f.nombres}</td>
                          <td className="p-2">{f.cedula}</td>
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
                  className="mt-4 rounded-xl bg-blue-700 px-4 py-3 text-sm text-white disabled:opacity-40"
                >
                  {guardando ? 'Guardando…' : 'Confirmar importación'}
                </button>
              </div>
            )}

            {mensaje && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">{mensaje}</p>}
          </section>
        ) : (
          <section className="mt-5">
            <div className="mb-5 flex gap-2">
              <button type="button" onClick={() => setVista('inicio')} className={pestana(vista === 'inicio')}>
                Estudiante
              </button>
              <button type="button" onClick={() => setVista('profesor')} className={pestana(vista === 'profesor')}>
                Profesor
              </button>
            </div>

            {vista === 'profesor' ? (
              <form onSubmit={iniciarSesion} className="grid gap-4">
                <h2 className="text-lg font-semibold">Acceso del profesor</h2>
                <input
                  className={campo}
                  type="email"
                  placeholder="Correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className={campo}
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && <p className="text-sm text-red-700">{error}</p>}
                <button
                  disabled={!configurado}
                  className="rounded-full bg-blue-700 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Ingresar
                </button>
              </form>
            ) : (
              <form onSubmit={verificarMatricula} className="grid gap-5">
                <h2 className="text-lg font-semibold">Ingreso del estudiante</h2>

                <div className="grid gap-2">
                  <label className="text-sm text-slate-600" htmlFor="cia-salon">Grado y salón</label>
                  <div className="relative">
                    <select
                      id="cia-salon"
                      className={campo + ' appearance-none pr-10'}
                      value={salon}
                      onChange={(e) => { setSalon(e.target.value); setResultadoAcceso(''); }}
                      required
                    >
                      {listaSalones.map((g) => (
                        <option key={clave(g)} value={clave(g)}>{etiquetaSalon(g)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm text-slate-600" htmlFor="cia-nombre">Nombre del estudiante</label>
                  <div className="relative">
                    <select
                      id="cia-nombre"
                      className={campo + ' appearance-none pr-10'}
                      value={estudianteId}
                      onChange={(e) => { setEstudianteId(e.target.value); setResultadoAcceso(''); }}
                      disabled={modoEjemplo || cargandoEst || estudiantes.length === 0}
                      required
                    >
                      <option value="">
                        {cargandoEst ? 'Cargando lista…' : 'Seleccione su nombre'}
                      </option>
                      {estudiantes.map((est) => (
                        <option key={est.id} value={est.id}>{est.nombres}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm text-slate-600" htmlFor="cia-cedula">
                    Número de cédula del estudiante
                  </label>
                  <input
                    id="cia-cedula"
                    className={campo}
                    placeholder="Ejemplo: 3-123-4567"
                    value={cedula}
                    onChange={(e) => { setCedula(e.target.value); setResultadoAcceso(''); }}
                    autoComplete="off"
                    required
                    maxLength={60}
                  />
                </div>

                <div className="px-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <CircleCheck className="h-4 w-4 text-slate-500" />
                    Verificación de matrícula
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Elige tu nombre en la lista y escribe tu cédula para confirmar que estás matriculado en el salón.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={modoEjemplo || verificando || !estudianteId || !cedula.trim()}
                  className="rounded-full bg-blue-700 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {verificando ? 'Verificando…' : 'Ingresar al ejercicio'}
                </button>

                {resultadoAcceso && (
                  <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{resultadoAcceso}</p>
                )}

                {modoEjemplo && (
                  <p className="text-xs text-slate-600">
                    Vista de ejemplo. El acceso real quedará disponible al conectar la verificación con Supabase.
                  </p>
                )}
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
