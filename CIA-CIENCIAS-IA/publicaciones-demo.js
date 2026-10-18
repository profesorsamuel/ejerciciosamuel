// CIA 2027: simulación docente. Nunca exponer como acceso de estudiantes.
const KEY='cia27_demo_v3';
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(){let data={};try{data=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{};
const salones=Array.isArray(data.salones)?data.salones:[];
const sel=$('filtro-publicacion');const before=sel.value;
sel.innerHTML='<option value="">Todos</option>'+salones.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');
sel.value=salones.includes(before)?before:'';
const pub=(data.ejercicios||[]).filter(x=>x.publicado&&(!sel.value||!x.salon||x.salon===sel.value));
$('listado-publicaciones').innerHTML=pub.map(x=>`<div class="tile"><h3>${safe(x.titulo)}</h3><p>Técnica ${Number(x.tecnica)||1} · ${(x.preguntas||[]).length} preguntas · Salón: ${safe(x.salon||'Todos (demo)')}</p><p class="muted">Disponible solo en la simulación de este navegador.</p></div>`).join('')||'<p>No hay ejercicios publicados para este salón.</p>';
}
$('actualizar-publicaciones').addEventListener('click',draw);
$('filtro-publicacion').addEventListener('change',draw);
document.querySelector('[data-tab="publicaciones"]').addEventListener('click',()=>setTimeout(draw,0));
