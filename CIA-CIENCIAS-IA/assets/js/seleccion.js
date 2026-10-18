// CIA 2027 - selección validada de preguntas para borradores.
const texto=v=>String(v??'').trim().toLocaleLowerCase('es');
const aleatorio=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function seleccionarCinco(banco,tecnica=1){
 const compatibles=(Array.isArray(banco)?banco:[]).filter(p=>p&&texto(p.enunciado)&&texto(p.correcta));
 const vistos=new Set();const unicas=compatibles.filter(p=>{const k=texto(p.enunciado);if(vistos.has(k))return false;vistos.add(k);return true;});
 // El banco básico permite evaluación textual; técnicas estructuradas requieren datos específicos.
 if(!unicas.length||unicas.length<5)throw Error(`Se necesitan 5 preguntas distintas completas; hay ${unicas.length}.`);
 const grupos=new Map();for(const p of aleatorio(unicas)){const k=texto(p.tema)||'general';if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(p);}
 const elegidas=[];while(elegidas.length<5&&[...grupos.values()].some(a=>a.length))for(const g of grupos.values()){if(g.length&&elegidas.length<5)elegidas.push(g.shift());}
 return aleatorio(elegidas);
}
