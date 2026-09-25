// Interfaz: ventana de metodología, hoja inferior en teléfono, pestañas, acciones fijas y ruta de navegación.
// ---------- metodología ----------
const infoModal = $('info-modal'); let lastFocus = null;
function openInfo(){ lastFocus=document.activeElement; infoModal.hidden=false; $('info-close').focus(); }
function closeInfo(){ infoModal.hidden=true; if(lastFocus) lastFocus.focus(); }
$('open-info').onclick = openInfo; $('info-btn').onclick = openInfo; $('info-close').onclick = closeInfo;
infoModal.addEventListener('click', e=>{ if(e.target===infoModal) closeInfo(); });
addEventListener('keydown', e=>{ if(e.key==='Escape' && !infoModal.hidden) closeInfo(); });
// cifras del cruce en la metodología
$('m-vp-km').textContent = fmt0.format(VPC.cov.km_total); $('m-vp-prio').textContent = fmt0.format(vCityPrioKm); $('m-vp-pct').textContent = pct(vCityPrioKm, vCityTotKm);
$('m-gc-fr').textContent = fmt.format(META.cruce.frentes_gc); $('m-gc-km').textContent = fmt0.format(META.cruce.km_gc); $('m-cov').textContent = pct(VPC.cov.km_con_frente, VPC.cov.km_total); $('m-vp-tramos').textContent = fmt.format(VPC.cov.registros); $('m-vp-km2').textContent = fmt0.format(VPC.cov.km_total);

// ---------- móvil: hoja inferior y leyenda plegable ----------
const isPhone = ()=> matchMedia('(max-width:860px)').matches;
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
function setLegend(open){ legendEl.classList.toggle('open', open); legendBtn.setAttribute('aria-expanded', String(open)); }
legendBtn.onclick = ()=> setLegend(!legendEl.classList.contains('open'));
setLegend(!isPhone());
addEventListener('resize', ()=>{ if(!isPhone()){ setLegend(true); document.body.classList.remove('sheet-open','sheet-peek'); } });

// ---------- pestañas Resumen / Listado / Descargas (auditoría C1) ----------
let curTab = 'res';
function setTab(t){ curTab=t; document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); ['res','list','dl'].forEach(k=>{ $('tp-'+k).hidden = k!==t; }); }
document.querySelectorAll('.tabs [role=tab]').forEach(b=>{ b.onclick=()=>setTab(b.dataset.tab); });
function updTabLabel(){
  const lbl = isGC()? 'Avenidas' : (alcOnly() && sel===null)? 'Alcaldías' : (colOnly() && selCol===null)? 'Colonias' : 'Calles';
  $('tab-list').textContent = lbl; }
function renderScopeTitle(){
  $('scope-title').textContent = selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : '')
    : selCol!==null? META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México'; }
// ---------- acciones fijas al pie del panel (auditoría C1) ----------
function renderActions(){
  const m=$('act-main'), f=$('act-ficha'), lbl=$('act-main-lbl'), hint=$('act-hint');
  let main=null, ficha=null, txt='', why='';
  if (isGC()){ main='dl-tramos'; txt='Descargar tramos prioritarios (Excel)'; ficha = selAv!==null? 'dl-ficha-av' : sel!==null? 'dl-ficha-vpalc' : null; }
  else {
    txt='Descargar frentes prioritarios (Excel)';
    const vacia = selCol!==null && sum(colStat(selCol).n)===0;
    main = (sel!==null && !vacia)? 'dl-frentes' : null;
    ficha = vacia? null : selCol!==null? 'dl-ficha' : sel!==null? 'dl-ficha-alc' : null;
    why = vacia? 'Esta colonia no tiene frentes a cargo de la alcaldía que descargar.' : sel===null? 'Elige una alcaldía o una colonia para descargar su listado.' : '';
  }
  lbl.textContent = txt; m.disabled = !main; m.dataset.target = main||''; f.hidden = !ficha; f.dataset.target = ficha||'';
  hint.hidden = !why; hint.textContent = why; }
$('act-main').onclick = ()=>{ const t=$('act-main').dataset.target; if(t) $(t).click(); };
$('act-ficha').onclick = ()=>{ const t=$('act-ficha').dataset.target; if(t) $(t).click(); };
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
  rest.innerHTML = h; const up = rest.querySelector('.cr-up'); if (up) up.onclick = ()=>{ up.dataset.up==='col'? clearColonia() : clearAvenida(); };
}
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; selEl.value=''; setSel(''); };
