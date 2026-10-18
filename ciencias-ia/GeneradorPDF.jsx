/* CIA Etapa 3: PDF local + generación mediante Edge Function protegida. */
import React, {useState} from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {supabase} from './supabase.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const caja='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
export default function GeneradorPDF({onGenerado, bloqueado=false}) {
 const [texto,setTexto]=useState(''); const [archivo,setArchivo]=useState(''); const [numero,setNumero]=useState(20);
 const [ocupado,setOcupado]=useState(false); const [error,setError]=useState(''); const [estado,setEstado]=useState('');
 async function leer(e){const f=e.target.files?.[0];e.target.value='';if(!f)return;setError('');setEstado('');setTexto('');setArchivo('');
  try {if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf'))throw Error('Selecciona un PDF.');if(f.size>12*1024*1024)throw Error('El PDF debe pesar 12 MB o menos.');
   setOcupado(true);const doc=await pdfjs.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
   if(doc.numPages>80)throw Error('Máximo 80 páginas por documento.');let partes=[];
   for(let i=1;i<=doc.numPages;i++){const pagina=await doc.getPage(i);const c=await pagina.getTextContent();partes.push(c.items.map(x=>x.str||'').join(' '));}
   const t=partes.join('\n').replace(/\s+/g,' ').trim();if(t.length<250)throw Error('No se encontró texto suficiente. Si es un PDF escaneado, primero aplícale OCR.');
   setTexto(t.slice(0,45000));setArchivo(f.name);setEstado(`PDF leído: ${doc.numPages} páginas. ${Math.min(t.length,45000)} caracteres listos para generar.`);
  }catch(ex){setError(ex.message||'No se pudo leer el PDF.')}finally{setOcupado(false)} }
 async function generar(){setError('');setEstado('');if(bloqueado){setError('Pulsa Nuevo ejercicio antes de generar preguntas.');return}if(texto.length<250){setError('Primero carga un PDF con texto.');return}
  setOcupado(true);try{const {data,error:fallo}=await supabase.functions.invoke('cia-generar-preguntas',{body:{texto,cantidad:Number(numero)}});
   if(fallo)throw Error(fallo.message||'No se pudo contactar el servicio.');if(data?.error)throw Error(data.error);
   if(!Array.isArray(data?.preguntas)||data.preguntas.length===0)throw Error('El servicio no devolvió preguntas válidas.');
   onGenerado(data.preguntas,archivo);setEstado(`${data.preguntas.length} preguntas generadas. Revísalas y guarda el ejercicio.`);
  }catch(ex){setError(ex.message||'No se pudieron generar preguntas. Revisa el despliegue y la clave de IA.')}finally{setOcupado(false)} }
 return <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
  <h4 className="font-bold text-emerald-900">Generador de preguntas desde PDF · IA</h4>
  <p className="text-xs text-slate-700">El PDF se lee en este navegador. Solo se envía su texto a la función segura para generar Verdadero/Falso. Revisa la exactitud antes de publicar.</p>
  <label className="block text-sm font-semibold">Seleccionar PDF <input type="file" accept="application/pdf,.pdf" onChange={leer} disabled={ocupado} className="mt-1 block w-full text-sm" /></label>
  <div className="flex flex-wrap gap-2 items-center"><label className="text-sm">Cantidad <select value={numero} onChange={e=>setNumero(Number(e.target.value))} className={caja}>{[5,10,15,20,30,40,60,80].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
  <button type="button" disabled={ocupado||!texto||bloqueado} onClick={generar} className="rounded-lg bg-emerald-700 px-4 py-2 text-white text-sm disabled:opacity-50">{ocupado?'Procesando…':'Generar con IA'}</button></div>
  {archivo&&<p className="text-xs text-slate-600">Documento: {archivo}</p>}
  {estado&&<p role="status" className="text-sm text-green-800">{estado}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </div>;
}
