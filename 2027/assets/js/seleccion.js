// CIA 2027: selección local de borradores (no sustituye selección segura del servidor).
const normalizar=v=>String(v??'').trim().toLocaleLowerCase('es');
const mezclar=lista=>{const a=[...lista];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clave=p=>normalizar(p.id||p.enunciado);
/** Selecciona cinco preguntas únicas, priorizando temas y niveles diferentes.
 * opciones.excluir: ids o enunciados usados; se reinicia el ciclo cuando no quedan cinco.
 * opciones.detalle: devuelve {preguntas, reinicio} para registrar el ciclo.
 */
export function seleccionarCinco(banco,tecnica=1,opciones={}){
 const validas=(Array.isArray(banco)?banco:[]).filter(p=>p&&normalizar(p.enunciado)&&normalizar(p.correcta));
 const unicas=[];const vistos=new Set();
 for(const p of validas){const k=normalizar(p.enunciado);if(!vistos.has(k)){vistos.add(k);unicas.push(p);}}
 if(unicas.length<5)throw Error(`Se necesitan 5 preguntas distintas completas; hay ${unicas.length}.`);
 const excluidas=new Set((opciones.excluir||[]).map(normalizar));
 let disponibles=unicas.filter(p=>!excluidas.has(clave(p))&&!excluidas.has(normalizar(p.enunciado)));
 const reinicio=disponibles.length<5;
 if(reinicio)disponibles=unicas;
 const elegidas=[],temas=new Set(),niveles=new Set();
 while(elegidas.length<5){
  const candidatos=disponibles.filter(p=>!elegidas.includes(p));
  const ordenados=mezclar(candidatos).map(p=>({p,puntos:(temas.has(normalizar(p.tema))?0:2)+(niveles.has(normalizar(p.nivel))?0:1)}));
  ordenados.sort((a,b)=>b.puntos-a.puntos);
  const elegido=ordenados[0].p;
  elegidas.push(elegido);temas.add(normalizar(elegido.tema));niveles.add(normalizar(elegido.nivel));
 }
 const preguntas=mezclar(elegidas);
 return opciones.detalle?{preguntas,reinicio}:preguntas;
}
