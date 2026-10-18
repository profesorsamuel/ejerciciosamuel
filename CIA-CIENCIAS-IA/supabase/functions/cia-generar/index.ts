import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const FORMATO:Record<string,string>={
 multiple:'{"enunciado","opciones":[4 textos distintos],"correcta":(copia exacta de una opción),"explicacion","tema"}',
 verdadero_falso:'{"enunciado":(una afirmación),"correcta":"Verdadero" o "Falso","explicacion","tema"}',
 completar:'{"enunciado":(frase con ____ en el espacio),"opciones":[4 textos distintos],"correcta":(copia exacta de una opción),"explicacion","tema"}',
 relacionar:'{"enunciado":"Relaciona cada concepto con su definición","pares":[[concepto,definición] x4, sin repetir],"explicacion","tema"}',
 ordenar:'{"enunciado":(qué se debe ordenar),"items":[4 o 5 elementos en el ORDEN CORRECTO],"explicacion","tema"}'};
const SISTEMA='Eres un docente experto en evaluación escolar. Responde SOLO con JSON válido {"preguntas":[...]}, sin Markdown ni texto extra. Usa únicamente información del texto dado; no inventes datos. Preguntas claras, sin ambigüedad, con distractores creíbles. No repitas las preguntas previas.';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 const send=(o:unknown,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...cors,'Content-Type':'application/json'}});
 try{
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return send({error:'Inicia sesión'},401);
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await sb.auth.getUser();if(!user)return send({error:'Sesión no válida'},401);
  const {data:doc}=await sb.from('cia8_docentes').select('id').eq('id',user.id).maybeSingle();if(!doc)return send({error:'Usuario no autorizado como docente'},403);
  const {texto_pdf,tipo,cantidad,excluir=[]}=await req.json();
  if(typeof texto_pdf!=='string'||texto_pdf.length<80||texto_pdf.length>35000||!FORMATO[tipo]||!Number.isInteger(cantidad)||cantidad<1||cantidad>10)return send({error:'Entrada inválida'},400);
  const key=Deno.env.get('ANTHROPIC_API_KEY');if(!key)return send({error:'Falta el secreto ANTHROPIC_API_KEY'},503);
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
   body:JSON.stringify({model:Deno.env.get('CIA_MODEL')||'claude-sonnet-5-5',max_tokens:4000,system:SISTEMA,messages:[{role:'user',content:`Genera ${cantidad} preguntas tipo "${tipo}" con esta forma por pregunta: ${FORMATO[tipo]}\n\nPreguntas previas (no repetir): ${JSON.stringify(excluir.slice(-60))}\n\nTEXTO:\n${texto_pdf}`}]})});
  if(!r.ok)return send({error:'Error del proveedor de IA: '+r.status},502);
  const j=await r.json();const txt=String(j.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
  const out=JSON.parse(txt);if(!Array.isArray(out.preguntas))return send({error:'Formato de IA incorrecto'},502);
  return send({preguntas:out.preguntas.slice(0,cantidad)});
 }catch(e){return send({error:e instanceof Error?e.message:'Error interno'},500);}
});
