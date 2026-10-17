/* CIA - CIENCIAS IA | Repositorio ejerciciosamuel | Importación de matrícula */
import React, {useEffect,useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase,configurado} from './supabase.js';

const columnas=['codigo_estudiante','nombres','grado','seccion','anio_lectivo','estado'];
const normaliza = v => String(v ?? '').trim();
const canon = v => normaliza(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function leerPlantilla(buffer){
  const libro=XLSX.read(buffer,{type:'array',cellDates:false});
  const hoja=libro.Sheets['Importar'] || libro.Sheets[libro.SheetNames[0]];
  if(!hoja)throw Error('El archivo no tiene hojas.');
  const filas=XLSX.utils.sheet_to_json(hoja,{defval:'',raw:false});
  if(!filas.length)throw Error('La hoja está vacía.');
  const cabeceras=Object.keys(filas[0]).map(canon);
  if(!columnas.every(c=>cabeceras.includes(c)))throw Error('Faltan columnas: '+columnas.filter(c=>!cabeceras.includes(c)).join(', '));
  const mapa=new Map(); const errores=[];
  filas.forEach((fila,i)=>{
    const r=Object.fromEntries(Object.entries(fila).map(([k,v])=>[canon(k),normaliza(v)]));
    if(!r.codigo_estudiante&&!r.nombres)return;
    if(!r.codigo_estudiante||!r.nombres||!r.grado||!r.seccion||!r.anio_lectivo){errores.push('Fila '+(i+2)+': faltan código, nombre, grado, sección o año.');return;}
    if(!/^\d{4}$/.test(r.anio_lectivo)){errores.push('Fila '+(i+2)+': año inválido.');return;}
    const clave=r.anio_lectivo+'|'+r.codigo_estudiante.toUpperCase();
    if(mapa.has(clave)){errores.push('Fila '+(i+2)+': código repetido en el Excel.');return;}
    mapa.set(clave,{codigo_estudiante:r.codigo_estudiante,nombres:r.nombres,grado:r.grado,seccion:r.seccion.toUpperCase(),anio_lectivo:Number(r.anio_lectivo),estado:r.estado || 'activo'});
  });
  if(errores.length)throw Error(errores.slice(0,8).join(' ')+(errores.length>8?' Hay más errores.':''));
  if(!mapa.size)throw Error('No hay estudiantes válidos para importar.');
  if(mapa.size>1000)throw Error('Importa un máximo de 1000 estudiantes por archivo.');
  return [...mapa.values()];
}
export default function App(){
 const [session,setSession]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[vista,setVista]=useState('estudiante'),[codigo,setCodigo]=useState(''),[nombre,setNombre]=useState(''),[filas,setFilas]=useState([]),[guardando,setGuardando]=useState(false);
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 async function login(e){e.preventDefault();setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message)}
 async function cargarExcel(e){setError('');setMensaje('');setFilas([]);const f=e.target.files?.[0];if(!f)return;try{if(!/\.xlsx?$/i.test(f.name))throw Error('Selecciona un archivo Excel .xlsx o .xls');if(f.size>10*1024*1024)throw Error('Máximo 10 MB');setFilas(leerPlantilla(await f.arrayBuffer()));}catch(err){setError(err.message)}finally{e.target.value=''}}
 async function importar(){if(!supabase||!filas.length)return;setGuardando(true);setError('');setMensaje('');try{const {data,error}=await supabase.rpc('cia_importar_matricula',{p_filas:filas});if(error)throw error;setMensaje('Importación completada: '+data+' estudiantes registrados o actualizados.');setFilas([]);}catch(err){setError('No se pudo importar: '+err.message+'. Comprueba que ejecutaste CIA_006_importar_matricula.sql.')}finally{setGuardando(false)}}
 return <main className="mx-auto max-w-4xl p-4 sm:p-8"><header className="mb-6 rounded-3xl bg-slate-900 p-7 text-white"><div className="text-sm text-cyan-300">CIA · Proyecto independiente</div><h1 className="mt-2 text-3xl font-bold">Ciencias IA</h1><p className="mt-2 text-slate-300">Fase 1 · Verdadero o falso · Gestión de matrícula</p></header>
 {!configurado&&<p className="mb-4 rounded-xl bg-amber-100 p-4">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para conectar Supabase.</p>}
 {error&&<p role="alert" className="mb-4 rounded-xl bg-red-100 p-4 text-red-800">{error}</p>}{mensaje&&<p role="status" className="mb-4 rounded-xl bg-green-100 p-4 text-green-800">{mensaje}</p>}
 {session?<section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Panel del profesor</h2><button className="rounded-xl border px-4 py-2" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></div><p className="mt-2 text-sm text-slate-500">{session.user.email}</p><div className="mt-6 rounded-xl border p-4"><h3 className="text-lg font-semibold">CIA · Importar estudiantes desde Excel</h3><p className="my-2 text-sm text-slate-600">Usa la hoja «Importar» de tu plantilla. Solo se guardan código, nombre, grado, sección, año y estado. No se importan cédulas, correos ni teléfonos.</p><input aria-label="Seleccionar plantilla Excel" type="file" accept=".xlsx,.xls" onChange={cargarExcel} className="my-3 block w-full rounded-lg border p-3"/>
 {filas.length>0&&<><p className="my-3 font-semibold">Vista previa: {filas.length} estudiantes</p><div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr>{['Código','Nombre','Grado','Sección','Año','Estado'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{filas.map(r=><tr key={r.anio_lectivo+'-'+r.codigo_estudiante} className="border-t"><td className="p-2">{r.codigo_estudiante}</td><td className="p-2">{r.nombres}</td><td className="p-2">{r.grado}</td><td className="p-2">{r.seccion}</td><td className="p-2">{r.anio_lectivo}</td><td className="p-2">{r.estado}</td></tr>)}</tbody></table></div><button disabled={guardando} onClick={importar} className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-white disabled:opacity-50">{guardando?'Guardando...':'Confirmar importación en Supabase'}</button></>}
 </div><p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">Las prácticas, el PDF y las notas se incorporarán en las siguientes etapas. Esta versión implementa la importación de matrícula.</p></section>:<section className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-5 flex gap-2"><button onClick={()=>setVista('estudiante')} className={'rounded-xl px-4 py-2 '+(vista==='estudiante'?'bg-blue-700 text-white':'bg-slate-100')}>Estudiante</button><button onClick={()=>setVista('profesor')} className={'rounded-xl px-4 py-2 '+(vista==='profesor'?'bg-blue-700 text-white':'bg-slate-100')}>Profesor</button></div>{vista==='profesor'?<form onSubmit={login} className="grid gap-3"><h2 className="text-xl font-bold">Acceso del profesor</h2><input type="email" required placeholder="Correo" className="rounded-xl border p-3" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" required placeholder="Contraseña" className="rounded-xl border p-3" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={!configurado} className="rounded-xl bg-blue-700 p-3 text-white disabled:opacity-50">Ingresar</button></form>:<div className="grid gap-3"><h2 className="text-xl font-bold">Entrar a un ejercicio</h2><input className="rounded-xl border p-3" placeholder="Código del grupo" value={codigo} onChange={e=>setCodigo(e.target.value)}/><input className="rounded-xl border p-3" placeholder="Nombre del estudiante" value={nombre} onChange={e=>setNombre(e.target.value)}/><p className="rounded-xl bg-blue-50 p-3 text-sm">El acceso a prácticas estará disponible después de instalar las funciones seguras de evaluación.</p><button disabled className="rounded-xl bg-slate-300 p-3 text-white">Próximamente</button></div>}</section>}</main>;
}
