import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const send=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return send({error:'Método no permitido'},405);
try{const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return send({error:'Inicie sesión'},401);
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
const {data:{user},error:ue}=await sb.auth.getUser();if(ue||!user)return send({error:'Sesión inválida'},401);
const {data:doc,error:de}=await sb.from('cia_docentes').select('id').eq('id',user.id).maybeSingle();if(de||!doc)return send({error:'Solo docentes autorizados'},403);
const {texto_pdf,cantidad}=await req.json();if(typeof texto_pdf!=='string'||texto_pdf.trim().length<150||texto_pdf.length>45000||![20,40,60,80].includes(cantidad))return send({error:'Texto o cantidad inválidos'},400);
const key=Deno.env.get('GEMINI_API_KEY');if(!key)return send({error:'Configure GEMINI_API_KEY en Supabase Secrets'},503);
const model=Deno.env.get('GEMINI_MODEL')||'gemini-2.5-flash-lite';const preguntas:any[]=[];
for(let inicio=0;inicio<cantidad;inicio+=10){const n=Math.min(10,cantidad-inicio);const prompt=`Eres un profesor de ciencias. Genera EXACTAMENTE ${n} preguntas diferentes basadas ÚNICAMENTE en el texto proporcionado. No inventes información. Entrega JSON puro {"preguntas":[{"enunciado":"...","correcta":"respuesta textual","distractores":["incorrecta 1","incorrecta 2","incorrecta 3"],"explicacion":"...","tema":"...","nivel":"facil|medio|dificil","tipo":"multiple"}]}. Cada pregunta tendrá una respuesta correcta y tres distractores distintos. Evita repetir: ${JSON.stringify(preguntas.map(p=>p.enunciado).slice(-50))}. Texto: ${texto_pdf}`;
const resp=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.65,maxOutputTokens:4500}})});
if(!resp.ok){const detail=await resp.text();return send({error:`Gemini respondió ${resp.status}: ${detail.slice(0,400)}`},502);}const data=await resp.json();const raw=data.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('')||'';let parsed;try{parsed=JSON.parse(raw);}catch{return send({error:'Gemini devolvió JSON inválido. Intente nuevamente.'},502);}
if(!Array.isArray(parsed.preguntas))return send({error:'Respuesta sin preguntas'},502);
for(const p of parsed.preguntas){if(typeof p.enunciado==='string'&&typeof p.correcta==='string'&&Array.isArray(p.distractores)&&p.distractores.length===3&&!preguntas.some(x=>x.enunciado.trim().toLowerCase()===p.enunciado.trim().toLowerCase()))preguntas.push(p);}
}return send({preguntas});}catch(e){return send({error:e instanceof Error?e.message:'Error interno'},500);}});
