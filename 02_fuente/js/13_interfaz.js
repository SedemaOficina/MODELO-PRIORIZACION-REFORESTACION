// Interfaz: ventana de metodología, hoja inferior en teléfono, pestañas, acciones fijas y ruta de navegación.
// ---------- metodología ----------
const infoModal = $('info-modal'); let lastFocus = null;
// La ventana se cierra con la × (siempre visible), con "Volver al mapa" al final, con Esc, tocando fuera
// de ella o con el botón Atrás del teléfono (se registra un paso en el historial al abrirla).
// Mientras la ayuda está abierta, el resto de la página queda inerte: el foco no sale de la ventana (auditoría H-048)
const appEl = document.querySelector('.app');
function openInfo(){ lastFocus=document.activeElement; infoModal.hidden=false; appEl.inert = true; infoModal.querySelector('.modal-card').scrollTop=0; $('info-close').focus();
  try { history.pushState({ayuda:true}, ''); } catch(e){} }
function hideInfo(){ infoModal.hidden=true; appEl.inert = false; if(lastFocus && lastFocus.isConnected) lastFocus.focus(); }
function closeInfo(){ if (history.state && history.state.ayuda){ history.back(); setTimeout(()=>{ if(!infoModal.hidden) hideInfo(); }, 400); } else hideInfo(); }
addEventListener('popstate', ()=>{ if (!infoModal.hidden) hideInfo(); });
$('open-info').onclick = openInfo; $('info-btn').onclick = openInfo; $('info-close').onclick = closeInfo; $('info-back').onclick = closeInfo;
infoModal.addEventListener('click', e=>{ if(e.target===infoModal) closeInfo(); });
// Esc cierra, en este orden: la ayuda, la ficha abierta y el panel de capas; el foco vuelve al control que los abrió (auditoría H-048)
addEventListener('keydown', e=>{ if (e.key!=='Escape' || e.defaultPrevented) return;
  if (!infoModal.hidden) return closeInfo();
  if (!$('card').hidden){ e.preventDefault(); return hideCard(true); }
  if (legendEl.classList.contains('open') && legendEl.contains(document.activeElement)){ setLegend(false); capasBtn.focus(); } });
// cifras del cruce en la metodología
$('m-vp-km').textContent = fmt0.format(VPC.cov.km_total); $('m-vp-prio').textContent = fmt0.format(vCityPrioKm); $('m-vp-pct').textContent = pct(vCityPrioKm, vCityTotKm);
$('m-n-fr').textContent = fmt.format(N); $('m-n-alc').textContent = fmt.format(N - META.cruce.frentes_gc);
$('m-gc-fr').textContent = fmt.format(META.cruce.frentes_gc); $('m-gc-km').textContent = fmt0.format(META.cruce.km_gc); $('m-cov').textContent = pct(VPC.cov.km_con_frente, VPC.cov.km_total); $('m-vp-tramos').textContent = fmt.format(VPC.cov.registros); $('m-vp-km2').textContent = fmt0.format(VPC.cov.km_total);

// ---------- móvil: hoja inferior y leyenda plegable ----------
const isPhone = ()=> matchMedia(MQ_TEL).matches;
const sheetBtn = $('sheet'), sheetLbl = $('sheet-label');
// hoja inferior con tres alturas: mínima (buscador), media (respuesta) y completa
let sheetState = 'half';
function setSheetState(st){ sheetState = st; document.body.classList.toggle('sheet-open', st==='full'); document.body.classList.toggle('sheet-peek', st==='peek');
  sheetBtn.setAttribute('aria-expanded', String(st!=='peek')); sheetLbl.textContent = st==='peek'? 'Ver la consulta' : st==='half'? 'Ver más' : 'Ver el mapa';
  setTimeout(()=>{ if(!NOMAP) dk.redraw(true); }, 260); }
sheetBtn.onclick = ()=> setSheetState(sheetState==='peek'? 'half' : sheetState==='half'? 'full' : 'peek');
const panelBtn = $('panel-toggle');
panelBtn.onclick = ()=>{ const off = document.body.classList.toggle('panel-off');
  panelBtn.setAttribute('aria-expanded', String(!off));
  panelBtn.title = panelBtn.ariaLabel = off? 'Mostrar el panel de consulta' : 'Ocultar el panel de consulta';
  setTimeout(()=>{ if(!NOMAP) dk.redraw(true); }, 120); };
const collapseSheet = ()=>{ if(!isPhone()) return; if(sheetState!=='half') setSheetState('half'); const k=$('answer'); if(k) setTimeout(()=>k.scrollIntoView({block:'start'}), 300); };
const legendEl = document.querySelector('.legend'), legendBtn = $('legend-toggle');
// el panel de capas se abre y se cierra con el botón de capas de la barra de herramientas; su × lo cierra
const capasBtn = $('zcapas');
function setLegend(open){ legendEl.classList.toggle('open', open); legendBtn.setAttribute('aria-expanded', String(open)); capasBtn.setAttribute('aria-expanded', String(open)); capasBtn.classList.toggle('on', open); }
legendBtn.onclick = ()=>{ setLegend(false); capasBtn.focus(); };
capasBtn.onclick = ()=> setLegend(!legendEl.classList.contains('open'));
setLegend(!isPhone() && innerHeight>480);   // en pantallas bajas el panel de capas empieza cerrado
addEventListener('resize', ()=>{ if(!isPhone()) document.body.classList.remove('sheet-open','sheet-peek'); });

// ---------- pestañas Resumen / Listado / Descargas (auditoría C1) ----------
function setTab(t){ document.body.classList.toggle('tab-dl', t==='dl');   // en Descargas la barra inferior sobra: repite los mismos botones
  document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); ['res','list','dl'].forEach(k=>{ $('tp-'+k).hidden = k!==t; }); }
document.querySelectorAll('.tabs [role=tab]').forEach(b=>{ b.onclick=()=>setTab(b.dataset.tab); });
function updTabLabel(){
  const lbl = isGC()? 'Avenidas' : (alcOnly() && sel===null)? 'Alcaldías' : (colLista() && selCol===null)? 'Colonias' : 'Calles';
  $('tab-list').textContent = lbl; }
function renderScopeTitle(){
  $('scope-title').textContent = selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : '')
    : selCol!==null? META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México'; }
// ---------- acciones fijas al pie del panel (auditoría C1) ----------
function renderActions(){
  const m=$('act-main'), f=$('act-ficha'), lbl=$('act-main-lbl'), hint=$('act-hint');
  let main=null, ficha=null, txt='', why='';
  if (isGC()){ main='dl-tramos'; txt='Descargar tramos prioritarios (Excel)'; if ($('dl-tramos').disabled) why='Este ámbito no tiene tramos de prioridad Muy Alta o Alta que descargar.'; ficha = selAv!==null? 'dl-ficha-av' : sel!==null? 'dl-ficha-vpalc' : null; }
  else {
    txt='Descargar frentes prioritarios (Excel)';
    const vacia = selCol!==null && sum(colStat(selCol).n)===0;
    main = (sel!==null && !vacia)? 'dl-frentes' : null;
    ficha = vacia? null : selCol!==null? 'dl-ficha' : sel!==null? 'dl-ficha-alc' : null;
    why = vacia? 'Esta colonia no tiene frentes a cargo de la alcaldía que descargar.' : sel===null? 'Elige una alcaldía o una colonia para descargar su listado.' : '';
    // en teléfono, un listado de decenas de miles de frentes pesa demasiado: se ofrece primero el resumen por calle (auditoría H-045)
    if (main==='dl-frentes' && isPhone() && selCol===null){ const fsG = frSumm(), nG = sumPrio(fsG.n);
      if (nG>GRANDE){ main='dl-calles'; txt='Descargar resumen por calle (Excel)'; why=`En teléfono se ofrece primero el resumen por calle. El listado completo (${fmt.format(nG)} frentes) está en la pestaña Descargas.`; } }
    // con una calle consultada, los botones principales son los de la calle
    const calle = calleSel();
    if (calle){ main='dl-calle'; ficha='dl-ficha-calle'; txt='Descargar frentes de la calle (Excel)';
      why = `Calle consultada: ${calle.nombre}. ` + (sel===null? 'Para descargar un ámbito completo, elige primero una alcaldía.' : `Los archivos de la ${selCol!==null? 'colonia' : 'alcaldía'} completa están en la pestaña Descargas.`); }
  }
  lbl.textContent = txt; m.disabled = !main || $(main).disabled; m.dataset.target = main||''; f.hidden = !ficha; f.dataset.target = ficha||'';
  hint.hidden = !why; hint.textContent = why; }
$('act-main').onclick = ()=>{ const t=$('act-main').dataset.target; if(t) $(t).click(); };
$('act-ficha').onclick = ()=>{ const t=$('act-ficha').dataset.target; if(t) $(t).click(); };
// cierre de sesión: solo aparece si la instalación define su dirección (Fase 2)
if (SESION.cierre){ const a = $('sesion-salir'); a.href = SESION.cierre; a.hidden = false; }
$('resp-help').onclick = ()=>{ const n=$('resp-note'); n.hidden=!n.hidden; $('resp-help').setAttribute('aria-expanded', String(!n.hidden)); };
// ---------- ruta de navegación (auditoría I4) ----------
function renderCrumb(){
  const atRoot = sel===null && selCol===null && selAv===null;
  $('cr-city').setAttribute('aria-current', atRoot? 'page' : 'false');
  $('cr-city').title = atRoot? '' : 'Volver a toda la ciudad';
  selEl.classList.toggle('unset', sel===null);
  const rest=$('cr-rest'); let h='';
  if (selCol!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${META.colonias[selCol].n}</span><button type="button" class="cr-up" data-up="col" title="Quitar la colonia y volver a ${META.munNames[sel]}" aria-label="Quitar la colonia y volver a ${META.munNames[sel]}">×</button></span>`;
  else if (selAv!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${VPC.nomenclat[selAv]}</span><button type="button" class="cr-up" data-up="av" title="Quitar la avenida" aria-label="Quitar la avenida">×</button></span>`;
  // la calle consultada es el último nivel de la ruta y se puede soltar (auditoría H-087)
  const cs = calleSel(); if (cs) h += `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${cs.nombre}</span><button type="button" class="cr-up" data-up="calle" title="Quitar la calle" aria-label="Quitar la calle consultada">×</button></span>`;
  rest.innerHTML = h; rest.querySelectorAll('.cr-up').forEach(up=>{ up.onclick = ()=>{ const k=up.dataset.up;
    if (k==='calle'){ highlight=null; hideCard(); rerender(); renderResults(); renderActions(); syncCalleBtns(); } else if (k==='col') clearColonia(); else clearAvenida(); }; });
}
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; selEl.value=''; setSel(''); };
