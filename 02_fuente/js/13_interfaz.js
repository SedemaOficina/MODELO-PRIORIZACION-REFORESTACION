// Interfaz: ventana de metodología, hoja inferior en teléfono, pestañas, acciones fijas y ruta de navegación.
// ---------- metodología ----------
const infoModal = $('info-modal'); let lastFocus = null;
// La ventana se cierra con la × (siempre visible), con "Volver al mapa" al final, con Esc, tocando fuera
// de ella o con el botón Atrás del teléfono (se registra un paso en el historial al abrirla).
// Mientras la ayuda está abierta, el resto de la página queda inerte: el foco no sale de la ventana
const appEl = document.querySelector('.app');
function openInfo(){ lastFocus=document.activeElement; infoModal.hidden=false; appEl.inert = true; infoModal.querySelector('.modal-card').scrollTop=0; $('info-close').focus();
  try { history.pushState({ayuda:true}, ''); } catch(e){} }
function hideInfo(){ infoModal.hidden=true; appEl.inert = false; if(lastFocus && lastFocus.isConnected) lastFocus.focus(); }
function closeInfo(){ if (history.state && history.state.ayuda){ history.back(); setTimeout(()=>{ if(!infoModal.hidden) hideInfo(); }, 400); } else hideInfo(); }
addEventListener('popstate', ()=>{ if (!infoModal.hidden) hideInfo(); });
$('open-info').onclick = openInfo; $('info-btn').onclick = openInfo; $('info-close').onclick = closeInfo; $('info-back').onclick = closeInfo;
infoModal.addEventListener('click', e=>{ if(e.target===infoModal) closeInfo(); });
// Esc cierra, en este orden: la ayuda, la ficha abierta y el panel de capas; el foco vuelve al control que los abrió
addEventListener('keydown', e=>{ if (e.key!=='Escape' || e.defaultPrevented) return;
  if (!entradaEl.hidden) return cierraEntrada(null);
  if (!infoModal.hidden) return closeInfo();
  if (!$('card').hidden){ e.preventDefault(); return hideCard(true); }
  if (legendEl.classList.contains('open') && legendEl.contains(document.activeElement)){ setLegend(false); capasBtn.focus(); } });
// cifras del cruce en la metodología
$('m-vp-km').textContent = fmt0.format(VPC.cov.km_total); $('m-vp-prio').textContent = fmt0.format(vCityPrioKm); $('m-vp-pct').textContent = pct(vCityPrioKm, vCityTotKm);
$('m-n-fr').textContent = fmt.format(N); $('m-n-alc').textContent = $('m-n-alc2').textContent = fmt.format(N - META.cruce.frentes_gc);
$('m-alc-km').textContent = fmt0.format(cityTotKm); $('m-alc-prio').textContent = fmt0.format(cityPrioKm); $('m-alc-pct').textContent = pct(cityPrioKm, cityTotKm);   // red de las alcaldías
$('m-gc-fr').textContent = fmt.format(META.cruce.frentes_gc); $('m-gc-km').textContent = fmt0.format(META.cruce.km_gc); $('m-cov').textContent = pct(VPC.cov.km_con_frente, VPC.cov.km_total); $('m-vp-tramos').textContent = fmt.format(VPC.cov.registros); $('m-vp-km2').textContent = fmt0.format(VPC.cov.km_total);

// ---------- celular: información y mapa en dos pantallas ----------
const isPhone = ()=> matchMedia(MQ_TEL).matches;
// En el celular la información y el mapa son dos pantallas completas que se cambian con un botón («Ver el mapa» en el encabezado del
// panel; en el mapa, abajo, el que dice qué se verá al regresar). La que no se ve queda inerte: sin foco, toques ni lector de pantalla.
// Qué lleva a qué pantalla: buscar o elegir alcaldía o colonia, filtros, pestañas y descargas se quedan en la información; elegir una
// calle, una avenida o un tramo de una lista, o un punto por coordenadas, va al mapa con lo elegido; tocar el mapa se queda en el mapa;
// «atrás» del navegador desde el mapa regresa a la información. En la computadora no cambia nada.
let PANTALLA = 'info';
const panelEl = document.querySelector('.panel'), mapaEl = document.querySelector('.mapwrap');
function pantalla(p, op={}){
  if (!HAY_MAPA) p = 'info';
  const antes = PANTALLA, tel = isPhone(), b = document.body; PANTALLA = p;
  b.classList.toggle('ver-mapa', p==='mapa'); b.classList.toggle('ver-info', p==='info');
  panelEl.inert = tel && p==='mapa'; mapaEl.inert = tel && p==='info' && HAY_MAPA;
  rotuloInfo();
  if (tel && antes!==p){ const f = document.activeElement;
    if (op.foco || (f && f!==document.body && (p==='mapa'? panelEl : mapaEl).contains(f))) $(p==='mapa'? 'ver-info' : 'ver-mapa').focus({preventScroll:true});
    // lo elegido desde una lista: «atrás» regresa a la lista
    if (p==='mapa' && op.desdeLista) history.pushState({...(history.state || {}), pantalla:'mapa'}, ''); } }
const verMapa = op=> pantalla('mapa', op), verInfo = op=> pantalla('info', op);
// el botón del mapa dice «Volver a la información» y, abajo, el lugar consultado
function rotuloInfo(){ const t = $('ver-info-t'); if (!t) return;
  const s = highlight && highlight.avId!==undefined? VPC.nomenclat[highlight.avId] : highlight? (META.names[highlight.nameId] || 'Calle sin nombre')
    : selAv!==null? VPC.nomenclat[selAv] : selCol!==null? 'Col. '+META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México';
  if (t.textContent!==s) t.textContent = s; }
// al elegir desde el panel en el celular, la respuesta queda a la vista (sin cambiar de pantalla: desde el mapa, se sigue en el mapa)
const alaRespuesta = ()=>{ if (!isPhone() || PANTALLA!=='info') return; const k=$('answer'); if (k) setTimeout(()=>k.scrollIntoView({block:'start'}), 300); };
$('ver-mapa').onclick = ()=> verMapa({foco:true});
$('ver-info').onclick = ()=> verInfo({foco:true});
matchMedia(MQ_TEL).addEventListener('change', ()=>{ pantalla(PANTALLA); if (!isPhone()) document.querySelectorAll('details.mas:not(.siempre)').forEach(d=> d.open = true); });
// plegables de la plantilla (fuentes, archivos de mapa): abiertos en la computadora, cerrados en el celular
if (isPhone()) document.querySelectorAll('details.mas').forEach(d=> d.open = false);
addEventListener('popstate', e=>{ if (isPhone() && PANTALLA==='mapa' && !(e.state && e.state.pantalla==='mapa')) verInfo(); });
// alto real de la pantalla: en iOS 26, con 100dvh o height:100%, Safari dejaba una franja vacía abajo (--alto, en 10_dos_pantallas.css);
// --vvh es el alto visible, que se reduce con el teclado abierto
{ const vv = ()=>{ const r = document.documentElement.style; r.setProperty('--alto', innerHeight+'px'); if (window.visualViewport) r.setProperty('--vvh', visualViewport.height+'px'); };
  vv(); addEventListener('resize', vv); if (window.visualViewport) visualViewport.addEventListener('resize', vv); }
const panelBtn = $('panel-toggle');
panelBtn.onclick = ()=>{ const off = document.body.classList.toggle('panel-off');
  panelBtn.setAttribute('aria-expanded', String(!off));
  panelBtn.title = panelBtn.ariaLabel = off? 'Mostrar el panel de consulta' : 'Ocultar el panel de consulta';
  setTimeout(()=>{ if(!NOMAP) dk.redraw(true); }, 120); };
const legendEl = document.querySelector('.legend'), legendBtn = $('legend-toggle');
// el panel de capas se abre y se cierra con el botón de capas de la barra de herramientas; su × lo cierra
const capasBtn = $('zcapas');
function setLegend(open){ legendEl.classList.toggle('open', open); legendBtn.setAttribute('aria-expanded', String(open)); capasBtn.setAttribute('aria-expanded', String(open)); capasBtn.classList.toggle('on', open); }
legendBtn.onclick = ()=>{ setLegend(false); capasBtn.focus(); };
capasBtn.onclick = ()=> setLegend(!legendEl.classList.contains('open'));
setLegend(false);   // el panel de capas empieza cerrado: la leyenda compacta dice los colores y lo abre
$('leymini').onclick = ()=>{ setLegend(true); legendBtn.focus(); };

// ---------- pestañas Dónde empezar / Resumen / Descargas ----------
// La antigua pestaña del listado se fundió en «Dónde empezar»: cualquier otro nombre (por ejemplo, el «list» de antes) abre «Dónde empezar».
const PESTANAS = ['ini','res','dl'];
function setTab(t){ if (!PESTANAS.includes(t)) t = 'ini';
  document.body.classList.toggle('tab-dl', t==='dl');   // en Descargas la barra inferior sobra: repite los mismos botones
  document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); PESTANAS.forEach(k=>{ $('tp-'+k).hidden = k!==t; }); }
document.querySelectorAll('.tabs [role=tab]').forEach(b=>{ b.onclick=()=>setTab(b.dataset.tab); });
function renderScopeTitle(){
  $('scope-title').textContent = selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : '')
    : selCol!==null? 'Col. '+META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México'; }   // «Col.» para que se sepa que es una colonia
// ---------- acciones fijas al pie del panel ----------
function renderActions(){
  const m=$('act-main'), f=$('act-ficha'), lbl=$('act-main-lbl'), hint=$('act-hint');
  let main=null, ficha=null, txt='', why='';
  if (isGC()){ main='dl-tramos'; txt='Descargar tramos prioritarios (Excel)'; if ($('dl-tramos').disabled) why='Este ámbito no tiene tramos de prioridad Muy Alta, Alta o Media que descargar.'; ficha = selAv!==null? 'dl-ficha-av' : sel!==null? 'dl-ficha-vpalc' : null; }
  else {
    txt='Descargar frentes prioritarios (Excel)';
    const vacia = selCol!==null && sum(colStat(selCol).n)===0;
    main = (sel!==null && !vacia)? 'dl-frentes' : null;
    ficha = vacia? null : selCol!==null? 'dl-ficha' : sel!==null? 'dl-ficha-alc' : null;
    why = vacia? 'Esta colonia no tiene frentes a cargo de la alcaldía que descargar.' : sel===null? 'Elige una alcaldía o una colonia para descargar su listado.' : '';
    // en teléfono, un listado de decenas de miles de frentes pesa demasiado: se ofrece primero el resumen por calle
    if (main==='dl-frentes' && isPhone() && selCol===null){ const fsG = frSumm(), nG = sumPrio(fsG.n);
      if (nG>GRANDE){ main='dl-calles'; txt='Descargar resumen por calle (Excel)'; why=`En teléfono se ofrece primero el resumen por calle. El listado completo (${fmt.format(nG)} frentes) está en la pestaña Descargas.`; } }
    // con una calle consultada, los botones principales son los de la calle
    const calle = calleSel();
    if (calle){ main='dl-calle'; ficha='dl-ficha-calle'; txt='Descargar frentes de la calle (Excel)';
      why = `Calle consultada: ${calle.nombre}. ` + (sel===null? 'Para descargar un ámbito completo, elige primero una alcaldía.' : `Los archivos de la ${selCol!==null? 'colonia' : 'alcaldía'} completa están en la pestaña Descargas.`); }
  }
  lbl.textContent = txt; m.disabled = !main || $(main).disabled; m.dataset.target = main||''; f.hidden = !ficha; f.dataset.target = ficha||'';
  $('panel-actions').classList.toggle('sin-descarga', m.disabled && f.hidden);   // en el celular el pie no ocupa lugar si no hay nada que descargar
  hint.hidden = !why; hint.textContent = why; }
$('act-main').onclick = ()=>{ const t=$('act-main').dataset.target; if(t) $(t).click(); };
$('act-ficha').onclick = ()=>{ const t=$('act-ficha').dataset.target; if(t) $(t).click(); };
// cierre de sesión: solo aparece si la instalación define su dirección
if (SESION.cierre){ const a = $('sesion-salir'); a.href = SESION.cierre; a.hidden = false; document.body.classList.add('con-sesion'); }
// ---------- títulos de lista: la palabra de lo que se consulta (Colonias, Calles, Avenidas, Tramos, Alcaldías) va destacada ----------
const UNIDAD_RX = /(Colonias|Calles|Avenidas|Tramos|Alcaldías|calles)/;
function resaltaUnidad(el){ if (!el || el.querySelector('b.unidad')) return; const t = el.textContent, m = t.match(UNIDAD_RX); if (!m) return;
  const b = document.createElement('b'); b.className = 'unidad'; b.textContent = m[1]; el.replaceChildren(t.slice(0, m.index), b, t.slice(m.index + m[1].length)); }
for (const id of ['ini-title']){ const el = $(id); if (!el) continue; resaltaUnidad(el); new MutationObserver(()=>resaltaUnidad(el)).observe(el, {childList:true, characterData:true, subtree:true}); }
// ---------- entrada en dos pasos ----------
// Primera visita sin consulta en la dirección. Paso 1: qué red se consulta (alcaldías o Gobierno Central), con el mismo peso.
// Paso 2: el territorio (una alcaldía o toda la ciudad). Esc o «Ver toda la ciudad» dejan la ciudad completa.
const entradaEl = $('entrada'); let entradaRed = 'alc';
let trasEntrada = null;   // lo que sigue a la entrada en la primera visita: el recorrido guiado (17_recorrido.js)
function cierraEntrada(m){ entradaEl.hidden = true; appEl.inert = false;
  if (resp!==entradaRed) setResp(entradaRed);
  if (m!==null){ selEl.value = String(m); setSel(String(m)); } else recuerdaInicio();
  $('scope-title').focus();
  if (trasEntrada){ const f = trasEntrada; trasEntrada = null; setTimeout(f, 700); } }
function entradaPaso(n){ $('entrada-p1').hidden = n!==1; $('entrada-p2').hidden = n!==2;
  if (n===1) entradaEl.querySelector('.entrada-red[data-red="'+entradaRed+'"]').focus();
  else { $('entrada-q').textContent = entradaRed==='gc'? '¿En qué alcaldía quieres ver las vialidades primarias?' : '¿Qué alcaldía quieres revisar?'; $('entrada-q').focus(); } }
function abreEntrada(){ const g = $('entrada-grid');
  if (!g.children.length) META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const b = document.createElement('button'); b.type = 'button'; b.className = 'entrada-op'; b.textContent = META.munNames[i]; b.onclick = ()=>cierraEntrada(i); g.appendChild(b); });
  entradaEl.hidden = false; appEl.inert = true; entradaPaso(1); }
entradaEl.querySelectorAll('.entrada-red').forEach(b=>{ b.onclick = ()=>{ entradaRed = b.dataset.red; entradaPaso(2); }; });
$('entrada-volver').onclick = ()=>entradaPaso(1);
$('entrada-cdmx').onclick = ()=>cierraEntrada(null);
// ---------- ruta de navegación ----------
function renderCrumb(){
  const atRoot = sel===null && selCol===null && selAv===null;
  $('cr-city').setAttribute('aria-current', atRoot? 'page' : 'false');
  $('cr-city').title = atRoot? '' : 'Volver a toda la ciudad';
  selEl.classList.toggle('unset', sel===null);
  const rest=$('cr-rest'); let h='';
  if (selCol!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>Col. ${META.colonias[selCol].n}</span><button type="button" class="cr-up" data-up="col" title="Quitar la colonia y volver a ${META.munNames[sel]}" aria-label="Quitar la colonia y volver a ${META.munNames[sel]}">×</button></span>`;
  else if (selAv!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${VPC.nomenclat[selAv]}</span><button type="button" class="cr-up" data-up="av" title="Quitar la avenida" aria-label="Quitar la avenida">×</button></span>`;
  // la calle consultada es el último nivel de la ruta y se puede soltar
  const cs = calleSel(); if (cs) h += `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${cs.nombre}</span><button type="button" class="cr-up" data-up="calle" title="Quitar la calle" aria-label="Quitar la calle consultada">×</button></span>`;
  rest.innerHTML = h; rest.querySelectorAll('.cr-up').forEach(up=>{ up.onclick = ()=>{ const k=up.dataset.up;
    if (k==='calle'){ highlight=null; hideCard(); rerender(); renderInicio(); renderActions(); syncCalleBtns(); } else if (k==='col') clearColonia(); else clearAvenida(); }; });
}
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; selEl.value=''; setSel(''); };
