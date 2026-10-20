// Leyenda-filtro por prioridad, filas "Atiende" (alcaldías / Gobierno Central), "Banqueta" y "Espacio", y casillas de capas.
// ---------- leyenda-filtro ----------
const lg = $('legend-rows');
META.prio.slice().reverse().forEach((p, ri)=>{
  const k = 4-ri; const row = document.createElement('div'); row.className='row'; row.tabIndex=0; row.setAttribute('role','checkbox'); row.setAttribute('aria-checked','true');
  row.innerHTML = `<b class="lg-cb" aria-hidden="true"></b><i data-st="background:var(--p${k})"></i><span>${p}</span><em class="lg-km" data-k="${k}"></em>`;
  const toggle = ()=>{ visible[k]=!visible[k]; row.classList.toggle('off',!visible[k]); row.setAttribute('aria-checked',String(visible[k])); buildFilter(); buildVP(); rerender(); notaFiltro(); };
  row.onclick = toggle; row.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); } };
  lg.appendChild(row);
});
// aviso solo cuando no queda ninguna prioridad visible
function notaFiltro(){ const n=$('lg-filter-note'); if(!n) return; n.hidden = visible.some(Boolean);
  n.textContent = n.hidden? '' : 'Ninguna prioridad está visible: el mapa no muestra calles. Activa al menos una casilla.'; }
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
// sinRefresh: quien la llama refresca después (pickColonia, pickAvenida, buscador); así no queda un paso intermedio en el historial
function setResp(v, sinRefresh){
  respOn.alc = v!=='gc'; respOn.gc = v!=='alc';
  document.querySelectorAll('button[data-resp]').forEach(b=>b.setAttribute('aria-pressed', String(respOn[b.dataset.resp])));
  $('banq-row').hidden = v==='gc';   // la banqueta es de los frentes de las alcaldías
  // con solo Gobierno Central la fila no se ve: su filtro se suelta para que ninguna cifra quede filtrada por algo que no está a la vista
  if (v==='gc' && filtroBanq!=='todas'){ filtroBanq = 'todas'; document.querySelectorAll('button[data-banq]').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.banq==='todas'))); }
  $('esp-row').hidden = !INV;   // el espacio aplica a las dos redes desde la v1.24 (el archivo único no trae el inventario)
  espTitulos(v);
  if (resp===v) return; resp=v;
  document.body.dataset.resp = v;
  if (isGC()){ colBefore = showColB; if (showColB && !showFrB){ setLayer('col',false); setLayer('fr',true); } else if (showColB) setLayer('col',false); selCol=null; }
  else { selAv=null; if (colBefore && !showColB && !showAlcB) setLayer('col',true); colBefore=false; if(!showAlcB && !showColB && !showFrB) setLayer('col',true); }
  highlight=null; hideCard(); $('q').value='';
  document.querySelector('.seg.lvl button[data-lvl="col"]').hidden = isGC();
  document.querySelector('.seg.lvl button[data-lvl="fr"]').innerHTML = isGC()? '<i></i>Vialidades' : '<i></i>Calles';
  document.querySelector('.seg.lvl').classList.toggle('two', isGC());
  if (modoLigero){ $('lvl-note').textContent = 'Modo ligero: las calles se dibujan al acercarte y solo las del ámbito elegido.'; }
  else $('lvl-note').textContent = isGC()? 'Alcaldías va sola, con la prioridad de sus vialidades primarias.' : 'Colonias y Calles se combinan; Alcaldías va sola.';
  $('resp-note').textContent = v==='alc' ? 'Frentes de manzana que plantan las alcaldías; las vialidades primarias aparecen en gris. Puedes activar las dos.'
    : v==='gc' ? 'Vialidades primarias y de acceso controlado que atiende el Gobierno de la Ciudad, con su propia prioridad.'
    : 'Las dos redes juntas: cifras, barras y descargas se muestran por separado para las alcaldías y para el Gobierno Central.';
  buildVP(); if (!sinRefresh) refresh();
}

// ---------- fila «Banqueta»: filtra los frentes de las alcaldías según INEGI 2020; ver filtroBanq en 03_estado.js ----------
const banqBtns = document.querySelectorAll('button[data-banq]');
function setBanq(v){ if (v!=='con' && v!=='sin') v = 'todas'; if (filtroBanq===v) return; filtroBanq = v;
  banqBtns.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.banq===v)));
  highlight = null; hideCard(); refresh(); }   // la calle resaltada se arma con el filtro anterior: se suelta
banqBtns.forEach(b=>{ b.onclick = ()=> setBanq(b.dataset.banq); });

// ---------- fila «Espacio»: frentes con cepa vacante, tocón o árbol muerto del inventario de arbolado; ver filtroEsp en 03_estado.js ----------
// Tres casillas independientes, como «Atiende»: todas apagadas = sin filtro; con una o varias, los frentes que tienen al menos un punto de
// alguno de esos tipos. Se combina con «Banqueta». La primera vez se piden los datos (espCargar): las casillas cambian al instante y las
// cifras cuando llegan; espQuiero es lo que marcan las casillas y filtroEsp lo que ya se aplica.
// Con Gobierno Central (v1.24) acota los tramos de vialidad primaria (pasaEspacioVP); con las dos redes, a las dos.
const espBtns = document.querySelectorAll('button[data-esp]');
// la descripción de cada casilla dice qué acota según la red consultada
const ESP_QUE = ['al menos una cepa vacante del inventario de arbolado: se puede plantar directo', 'al menos un tocón del inventario de arbolado: hay que retirarlo antes de plantar', 'al menos un árbol muerto del inventario de arbolado: requiere sustitución'];
function espTitulos(v){ const quien = v==='gc'? 'Tramos de vialidad primaria (en sus frentes o en el camellón)' : v==='both'? 'Frentes de manzana y tramos de vialidad primaria' : 'Frentes';
  espBtns.forEach(b=>{ b.title = `${quien} con ${ESP_QUE[+b.dataset.esp]}`; }); }
let espQuiero = 0;
const espBotones = ()=> espBtns.forEach(b=> b.setAttribute('aria-pressed', String(!!(espQuiero & (1<<+b.dataset.esp)))));
function setEspacio(m){ m = INV? (m & 7) : 0; espQuiero = m; espBotones();
  if (m && !ESP_FR){ espAviso('carga');
    espCargar().then(()=>{ if (espQuiero===m) setEspacio(m); }, e=>{ console.warn('filtro de espacio', e); if (espQuiero!==m) return; espQuiero = filtroEsp; espBotones(); espAviso(e); });
    return; }
  if (filtroEsp===m){ espAviso(); return; }
  filtroEsp = m; espAviso(); highlight = null; hideCard(); refresh(); }   // como con la banqueta, la calle resaltada se suelta
espBtns.forEach(b=>{ b.onclick = ()=> setEspacio(espQuiero ^ (1<<+b.dataset.esp)); });
// aviso bajo la fila mientras el filtro está activo: el inventario está en curso (corte y registros de la alcaldía consultada)
function espAviso(estado){ const n = $('esp-aviso'); if (!n) return; n.classList.toggle('warn', !!(estado && estado!=='carga'));
  if (estado==='carga'){ n.hidden = false; n.textContent = 'Cargando el inventario de arbolado…'; return; }
  if (estado){ n.hidden = false; if (estado.sesion) avisoSesion(n); else n.textContent = 'No fue posible cargar el inventario de arbolado para el filtro (revisa la conexión a internet).'; return; }
  n.hidden = !filtroEsp; if (n.hidden){ n.textContent = ''; return; }
  const cve = sel!==null? META.muns[sel] : null, reg = cve? (INV.avance[cve]||0) : Object.values(INV.avance).reduce((s,a)=>s+a, 0);
  n.textContent = `El filtro solo incluye lo inventariado hasta ${INV.corte} (inventario en curso); ${cve? 'en esta alcaldía' : 'en toda la ciudad'} van ${fmt.format(reg)} registros.`; }
function espReinicia(){ espQuiero = filtroEsp = 0; espBotones(); espAviso(); }
if (!INV) $('esp-row').hidden = true;

const LAY = { alc: ()=>showAlcB, col: ()=>showColB, fr: ()=>showFrB };
function setLayer(k, v){ if(k==='alc') showAlcB=v; else if(k==='col') showColB=v; else showFrB=v; document.querySelector(`.seg.lvl button[data-lvl="${k}"]`).setAttribute('aria-pressed', String(v)); }
document.querySelectorAll('.seg.lvl button').forEach(b=>{ b.onclick = ()=>{
  const k=b.dataset.lvl, cur=LAY[k]();
  if (k==='alc'){ if (cur) return; setLayer('alc',true); setLayer('col',false); setLayer('fr',false); }
  else if (isGC()){ if (cur) return; setLayer('alc',false); setLayer('fr',true); }
  else { if (showAlcB){ setLayer('alc',false); setLayer(k,true); } else { const other = k==='col'? showFrB : showColB; if (cur && !other) return; setLayer(k, !cur); } }
  hideCard(); rerender(); }; });   // la lista de «Dónde empezar» no depende de las capas
// opacidad de las capas de prioridad (alcaldías, colonias, calles y vialidades primarias)
$('op-prio').oninput = e=>{ opPrio = Math.min(1, Math.max(0.2, (+e.target.value||100)/100)); $('op-val').textContent = Math.round(opPrio*100)+' %'; rerender(); };
// mapa de fondo: sin fondo, calles (el predeterminado, FONDO_INICIAL) o satélite
const ATRIB_BASE = $('attrib').innerHTML;
function setFondo(k){ fondoUI(k); rerender(); }
// botones, atribución y nota del fondo elegido (sin redibujar: al abrir, el mapa ya se armó con él)
function fondoUI(k){ fondo = k; fondoFallas = 0; const f = FONDOS[k], con = k!=='no';
  document.querySelectorAll('.seg.fondo button').forEach(b=> b.setAttribute('aria-pressed', String(b.dataset.fondo===k)));
  $('attrib').innerHTML = con? f.atrib : ATRIB_BASE; $('attrib').classList.toggle('sat', con); document.body.classList.toggle('fondo-sat', con); document.body.classList.toggle('fondo-propio', !!(f && f.propio));
  const n = $('fondo-note'), nota = con? f.nota : ''; n.hidden = !nota; n.textContent = nota;
  ajustaEscala(); }
// la atribución del fondo ocupa una o varias líneas: la barra de escala se coloca justo encima
function ajustaEscala(){ $('scalebar').style.bottom = (fondo!=='no' && !isPhone())? (16 + $('attrib').offsetHeight + 6)+'px' : ''; }
addEventListener('resize', ajustaEscala);
function avisoFondo(){ const n = $('fondo-note'); n.hidden = false; n.textContent = 'No fue posible cargar el mapa de fondo (revisa la conexión a internet).'; }
document.querySelectorAll('.seg.fondo button').forEach(b=>{ b.onclick = ()=>{ if (b.dataset.fondo!==fondo) setFondo(b.dataset.fondo); }; });
$('reset-all').onclick = ()=>{ invReinicia(); espReinicia();
  filtroBanq = 'todas'; banqBtns.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.banq==='todas')));   // «Reiniciar» apaga los dos filtros (setSel redibuja)
  opPrio=1; $('op-prio').value=100; $('op-val').textContent='100 %'; setResp('alc'); setLayer('alc',false); setLayer('col',true); setLayer('fr',true); for(let k=0;k<5;k++) visible[k]=true; document.querySelectorAll('.legend .row').forEach(r=>{ r.classList.remove('off'); r.setAttribute('aria-checked','true'); }); buildFilter(); buildVP(); notaFiltro(); if (fondo!=='no') setFondo(FONDO_INICIAL); selEl.value=''; setSel(''); };
