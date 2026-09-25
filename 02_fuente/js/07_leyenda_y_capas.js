// Leyenda-filtro por prioridad, fila "Atiende" (alcaldías / Gobierno Central) y casillas de capas.
// ---------- leyenda-filtro ----------
const lg = $('legend-rows');
META.prio.slice().reverse().forEach((p, ri)=>{
  const k = 4-ri; const row = document.createElement('div'); row.className='row'; row.tabIndex=0; row.setAttribute('role','checkbox'); row.setAttribute('aria-checked','true');
  row.innerHTML = `<b class="lg-cb" aria-hidden="true"></b><i style="background:var(--p${k})"></i><span>${p}</span><em class="lg-km" data-k="${k}"></em>`;
  const toggle = ()=>{ visible[k]=!visible[k]; row.classList.toggle('off',!visible[k]); row.setAttribute('aria-checked',String(visible[k])); buildFilter(); buildVP(); rerender(); };
  row.onclick = toggle; row.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); } };
  lg.appendChild(row);
});
function renderLegendNote(){
  $('legend-vp').innerHTML = resp==='alc'
    ? `<i class="sw ctx"></i><span>Vialidades primarias (Gobierno Central)</span>`
    : resp==='gc' ? `<i class="sw thick"></i><span>Vialidades primarias por prioridad</span>`
    : `<i class="sw thick"></i><span>Línea gruesa: vialidad primaria (Gobierno Central) · línea fina: frente de manzana (Alcaldía)</span>`;
}

// ---------- quién atiende: alcaldías y Gobierno Central ----------
// dos casillas combinables: Alcaldía y Gob. Central; al menos una activa
const respOn = { alc:true, gc:false };
document.querySelectorAll('button[data-resp]').forEach(b=>{ b.onclick = ()=>{ const k=b.dataset.resp; const other = k==='alc'? respOn.gc : respOn.alc; if (respOn[k] && !other) return; respOn[k]=!respOn[k]; setResp(respOn.alc && respOn.gc? 'both' : respOn.gc? 'gc' : 'alc'); }; });
function setResp(v){
  respOn.alc = v!=='gc'; respOn.gc = v!=='alc';
  document.querySelectorAll('button[data-resp]').forEach(b=>b.setAttribute('aria-pressed', String(respOn[b.dataset.resp])));
  if (resp===v) return; resp=v;
  document.body.dataset.resp = v;
  if (isGC()){ colBefore = showColB; if (showColB && !showFrB){ setLayer('col',false); setLayer('fr',true); } else if (showColB) setLayer('col',false); selCol=null; }
  else { selAv=null; if (colBefore && !showColB && !showAlcB) setLayer('col',true); colBefore=false; if(!showAlcB && !showColB && !showFrB) setLayer('col',true); }
  highlight=null; hideCard(); $('q').value=''; $('q').placeholder = isGC()? 'Buscar avenida o eje…' : 'Buscar calle o avenida…';
  document.querySelector('.seg.lvl button[data-lvl="col"]').hidden = isGC();
  document.querySelector('.seg.lvl button[data-lvl="fr"]').innerHTML = isGC()? '<i></i>Vialidades' : '<i></i>Calles';
  document.querySelector('.seg.lvl').classList.toggle('two', isGC());
  $('lvl-note').textContent = isGC()? 'Alcaldías va sola, con la prioridad de sus vialidades primarias.' : 'Colonias y Calles se combinan; Alcaldías va sola.';
  $('resp-note').textContent = v==='alc' ? 'Frentes de manzana que plantan las alcaldías; las vialidades primarias aparecen en gris. Puedes activar las dos.'
    : v==='gc' ? 'Vialidades primarias y de acceso controlado que atiende el Gobierno de la Ciudad, con su propia prioridad.'
    : 'Las dos redes juntas: cifras, barras y descargas se muestran por separado para cada responsable.';
  buildVP(); refresh();
}

const LAY = { alc: ()=>showAlcB, col: ()=>showColB, fr: ()=>showFrB };
function setLayer(k, v){ if(k==='alc') showAlcB=v; else if(k==='col') showColB=v; else showFrB=v; document.querySelector(`.seg.lvl button[data-lvl="${k}"]`).setAttribute('aria-pressed', String(v)); }
document.querySelectorAll('.seg.lvl button').forEach(b=>{ b.onclick = ()=>{
  const k=b.dataset.lvl, cur=LAY[k]();
  if (k==='alc'){ if (cur) return; setLayer('alc',true); setLayer('col',false); setLayer('fr',false); }
  else if (isGC()){ if (cur) return; setLayer('alc',false); setLayer('fr',true); }
  else { if (showAlcB){ setLayer('alc',false); setLayer(k,true); } else { const other = k==='col'? showFrB : showColB; if (cur && !other) return; setLayer(k, !cur); } }
  hideCard(); renderResults(); rerender(); }; });
// mapa de fondo: sin fondo (predeterminado) o satélite
const ATRIB_BASE = $('attrib').innerHTML;
function setFondo(sat){ fondoSat = sat; satFallas = 0;
  document.querySelectorAll('.seg.fondo button').forEach(b=> b.setAttribute('aria-pressed', String((b.dataset.fondo==='sat')===sat)));
  $('attrib').innerHTML = sat? SAT_ATRIB : ATRIB_BASE; $('attrib').classList.toggle('sat', sat); document.body.classList.toggle('fondo-sat', sat);
  const n = $('fondo-note'); n.hidden = !sat; n.textContent = sat? 'Imagen de satélite de 10 m por píxel: muestra zonas verdes y mancha urbana, no árboles individuales.' : '';
  rerender(); }
function avisoSatelite(){ const n = $('fondo-note'); n.hidden = false; n.textContent = 'No fue posible cargar la imagen de satélite (revisa la conexión a internet).'; }
document.querySelectorAll('.seg.fondo button').forEach(b=>{ b.onclick = ()=>{ const sat = b.dataset.fondo==='sat'; if (sat!==fondoSat) setFondo(sat); }; });
$('reset-all').onclick = ()=>{ setResp('alc'); setLayer('alc',false); setLayer('col',true); setLayer('fr',true); for(let k=0;k<5;k++) visible[k]=true; document.querySelectorAll('.legend .row').forEach(r=>{ r.classList.remove('off'); r.setAttribute('aria-checked','true'); }); buildFilter(); buildVP(); selEl.value=''; setSel(''); };
