// Instancia del mapa (DeckGL), clic y descripción emergente, mostrar u ocultar tarjetas y botones de acercamiento.
// Las capas solo cambian al cruzar estos niveles de zoom (tamaño de nombres de alcaldía, límites y nombres
// de colonias, nombres de calle); entre ellos no hace falta rehacerlas, lo que mantiene fluido el zoom.
const ZOOM_CORTES = [11.5, 12, 12.2, 13, 13.6, 14, 15];
const zoomBand = z => ZOOM_CORTES.filter(c => z >= c).length;
const dk = new DeckGL({
  container: mapEl, views: new MapView({repeat:false}), controller:{dragRotate:false, touchRotate:false, minZoom:9.4, maxZoom:18.5},
  initialViewState: viewState, layers: layers(), style:{background:'transparent'},
  useDevicePixels: Math.min(window.devicePixelRatio || 1, 1.5),   // pantallas de alta densidad: menos píxeles por dibujar
  onLoad: ()=> revisarRendimiento(),
  onViewStateChange: ({viewState:vs})=>{ vs = {...vs, longitude: Math.min(Math.max(vs.longitude, CITY_BOUNDS[0]-0.05), CITY_BOUNDS[2]+0.05), latitude: Math.min(Math.max(vs.latitude, CITY_BOUNDS[1]-0.04), CITY_BOUNDS[3]+0.04)}; const zc = zoomBand(vs.zoom); const prev = zoomBand(viewState.zoom); viewState = vs; let moved=false; if (vs.zoom>=15 && lblCenter){ const w=mapEl.clientWidth||800; const mpp=40075016.686*Math.cos(vs.latitude*Math.PI/180)/(512*Math.pow(2,vs.zoom)); const dx=(vs.longitude-lblCenter[0])*111320*Math.cos(vs.latitude*Math.PI/180), dy=(vs.latitude-lblCenter[1])*110540; moved = Math.hypot(dx,dy)/mpp > w*0.35; } if (zc!==prev || moved) rerender(); updateScale(); return vs; },
  getTooltip: info => {
    if (info.index<0 || !info.layer) return null; const st = {background:'transparent',padding:0,border:0,boxShadow:'none'};
    if (info.layer.id.startsWith('alcaldias')){ const i=info.object.i; const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; return {html:`<div class="tip"><span class="pr" style="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></span><b>${META.munNames[i]}</b><br><span class="m">${isGC()? 'Vialidades primarias: prioridad predominante':'Prioridad predominante'} ${META.prio[d]} (${pct(s.km[d],tot)}) · ${fmt0.format(kmPrio(s))} km prioritarios · ${rankOf(i)}.º de 16</span></div>`, style:st}; }
    if (info.layer.id.startsWith('col-fill')){ const id=info.object.i; const c=META.colonias[id]; if (sel!==null && munIndex[c.m]!==sel) return null; const cs=colStat(id); const pc=c.p>=0? T.prio[c.p]:null; return {html:`<div class="tip">${pc? `<span class="pr" style="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></span>`:''}<b>${c.n}</b><br><span class="m">${META.munNames[munIndex[c.m]]} · Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'} · ${fmt1.format(cs.kmp)} km prioritarios</span></div>`, style:st}; }
    if (info.layer.id==='vias' && !pinned) return {html:`<div class="tip">${vpHtml(info.index,true)}</div>`, style:st};
    return (info.layer.id==='fronts' && !pinned && inScope(info.index)) ? {html:`<div class="tip">${featHtml(info.index,true)}</div>`, style:st} : null;
  },
});
let pdown = null;
mapEl.addEventListener('pointerdown', e=>{ pdown=[e.clientX,e.clientY]; });
mapEl.addEventListener('click', e=>{
  if (pdown && Math.hypot(e.clientX-pdown[0], e.clientY-pdown[1])>5) return;
  const r = mapEl.getBoundingClientRect(); const p = dk.pickObject({x:e.clientX-r.left, y:e.clientY-r.top, radius:6});
  if (p && p.layer && p.layer.id.startsWith('alcaldias') && p.object){ const i=p.object.i; if (sel!==i || selCol!==null || selAv!==null){ selEl.value=String(i); setSel(String(i)); } return; }
  if (p && p.layer && p.layer.id.startsWith('col-fill') && p.object){ const id=p.object.i; pickColonia(id); showCard('col', id); return; }
  if (p && p.layer && p.layer.id==='vias' && p.index>=0){ showCard('vp', p.index); return; }
  if (p && p.layer && p.layer.id==='fronts' && p.index>=0){ const i=p.index, cid=F.col[i];
    if (cid && cid!==selCol) pickColonia(cid); else if (!cid && sel!==null && F.mun[i]!==sel){ selEl.value=String(F.mun[i]); setSel(String(F.mun[i])); }
    showCard('fr', i); } else hideCard();
});
function rerender(){ if (NOMAP) return; dk.setProps({layers: layers()}); }
$('loader').hidden = true; updateScale();

function inScope(i){ return (sel===null || F.mun[i]===sel) && (selCol===null || F.col[i]===selCol); }
function showCard(kind, i){ if (kind==='loc') return showLoc(); pinned={kind,i}; const c=$('card');
  c.innerHTML = kind==='vp'? vpHtml(i,false) : kind==='col'? colHtml(i) : featHtml(i,false);
  c.hidden=false; c.querySelector('.close').onclick=hideCard;
  const b=c.querySelector('#card-av'); if(b) b.onclick=()=>pickAvenida(VP.nom[i]);
  const ba=c.querySelector('#card-alc'); if(ba) ba.onclick=()=>{ clearColonia(); };
  const bc=c.querySelector('#card-calles'); if(bc) bc.onclick=()=>{ setLayer('fr',true); renderResults(); rerender(); showCard('col', i); };
  const bf=c.querySelector('#card-ficha'); if(bf) bf.onclick=()=>conPDF('col');
  const bcp=c.querySelector('[data-copy]'); if(bcp) bcp.onclick=()=>{ const t=bcp.dataset.copy, lab=bcp.querySelector('span');
    const ok=()=>{ lab.textContent='Coordenadas copiadas'; setTimeout(()=>{ lab.textContent='Copiar coordenadas'; }, 1800); };
    const fb=()=>{ const r=document.createRange(); r.selectNodeContents(lab); lab.textContent=t; const sl=getSelection(); sl.removeAllRanges(); sl.addRange(r); };
    try { navigator.clipboard.writeText(t).then(ok, fb); } catch(e){ fb(); } };
}
function hideCard(){ pinned=null; $('card').hidden=true; }
$('zin').onclick = ()=> flyTo({...viewState, zoom:Math.min(18.5, viewState.zoom+1)}, 0);   // acercar y alejar son inmediatos
$('zout').onclick = ()=> flyTo({...viewState, zoom:Math.max(9.4, viewState.zoom-1)}, 0);

// ---------- rendimiento: modo ligero ----------
// Si el navegador dibuja sin tarjeta gráfica (aceleración por hardware desactivada o no disponible), el mapa se
// vuelve muy lento con 372 mil frentes. En ese caso: sin animaciones, menos píxeles y calles solo al acercarse.
// Se puede forzar con ?modo=ligero o ?modo=completo en la dirección.
function rendererGL(){
  try { const d = dk.device; if (d && d.info) return [d.info.renderer, d.info.gpu, d.info.vendor].join(' '); } catch(e){}
  try { const c = dk.getCanvas && dk.getCanvas(); const gl = c && (c.getContext('webgl2') || c.getContext('webgl')); if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info'); return String(gl.getParameter(ext? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); } catch(e){ return ''; }
}
function revisarRendimiento(){
  const pedido = new URLSearchParams(location.search).get('modo');
  const sinGPU = /swiftshader|llvmpipe|softpipe|basic render|software/i.test(rendererGL());
  if (pedido==='completo' || !(pedido==='ligero' || sinGPU)) return;
  modoLigero = true; document.body.classList.add('modo-ligero');
  dk.setProps({useDevicePixels: 1}); rerender(); renderLegendNote();
  if (pedido!=='ligero'){ const n = document.createElement('div'); n.className = 'aviso-ligero'; n.setAttribute('role','status');
    n.innerHTML = '<b>Tu navegador está dibujando el mapa sin aceleración gráfica.</b> Para que no se trabe, las calles aparecen al acercarte y las colonias muestran la prioridad. Para verlo completo y fluido, activa la aceleración por hardware del navegador (en Chrome: Configuración › Sistema › "Usar aceleración de gráficos") y recarga la página. <button type="button" aria-label="Cerrar aviso">×</button>';
    n.querySelector('button').onclick = ()=> n.remove(); mapEl.parentElement.appendChild(n); }
}
function scopeView(){ const P = matchMedia('(max-width:860px)').matches? 0.45 : 1;
  if (selAv!==null){ const b=avBounds(selAv, sel); const pad=0.003; const vs=fitTo([b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad], 60*P); vs.zoom=Math.min(vs.zoom,15.5); return vs; }
  return selCol!==null? fitTo(colBounds(selCol), 60*P) : sel===null? fitTo(CITY_BOUNDS,24*P) : fitTo(META.bounds[META.muns[sel]], 40*P); }
$('zfit').onclick = ()=> flyTo(scopeView());
// regresa el mapa a toda la ciudad sin cambiar la consulta (para cambiarla, "Ciudad de México" en la ruta de navegación)
$('zcity').onclick = ()=>{ if (locFollow) stopFollow(true); hideCard(); flyTo(fitTo(CITY_BOUNDS, 24*(matchMedia('(max-width:860px)').matches? 0.45 : 1))); };
