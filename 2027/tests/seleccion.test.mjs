// Ejecutar desde la raíz del repositorio: node 2027/tests/seleccion.test.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const ruta=new URL('../assets/js/seleccion.js',import.meta.url);
const fuente=await readFile(ruta,'utf8');
const {seleccionarCinco}=await import('data:text/javascript;base64,'+Buffer.from(fuente).toString('base64'));
const banco=Array.from({length:12},(_,i)=>({enunciado:'Pregunta '+i,correcta:'Respuesta '+i,tema:'Tema '+(i%6),nivel:['recordar','comprender','aplicar','analizar'][i%4]}));
for(let i=0;i<50;i++){
 const elegidas=seleccionarCinco(banco);
 assert.equal(elegidas.length,5,'Cada borrador debe tener cinco preguntas');
 assert.equal(new Set(elegidas.map(p=>p.enunciado)).size,5,'No repetir enunciados');
 assert.equal(new Set(elegidas.map(p=>p.tema)).size,5,'Priorizar temas distintos cuando hay suficientes');
}
assert.throws(()=>seleccionarCinco(banco.slice(0,4)),/5 preguntas/);
assert.throws(()=>seleccionarCinco([]),/5 preguntas/);
const duplicado=[...banco.slice(0,4),{...banco[0]}];
assert.throws(()=>seleccionarCinco(duplicado),/5 preguntas/);
assert.equal(seleccionarCinco([...banco.slice(0,5),{enunciado:' ',correcta:'x'}]).length,5);

const primera=seleccionarCinco(banco);
const segunda=seleccionarCinco(banco,1,{excluir:primera.map(p=>p.enunciado)});
assert.equal(segunda.filter(p=>primera.includes(p)).length,0,'No repetir preguntas entre borradores mientras alcance el banco');
const reiniciado=seleccionarCinco(banco,1,{excluir:banco.map(p=>p.enunciado),detalle:true});
assert.equal(reiniciado.reinicio,true,'Indicar reinicio al agotar el banco');
assert.equal(reiniciado.preguntas.length,5);

const usadas=[...primera,...segunda];
const tercera=seleccionarCinco(banco,1,{excluir:usadas.map(p=>p.enunciado),detalle:true});
assert.equal(tercera.reinicio,true);
const pendientes=banco.filter(p=>!usadas.includes(p));
assert.equal(tercera.preguntas.filter(p=>pendientes.includes(p)).length,2,'Consumir preguntas pendientes antes del reinicio');
console.log('OK: pruebas de selección de cinco preguntas');
