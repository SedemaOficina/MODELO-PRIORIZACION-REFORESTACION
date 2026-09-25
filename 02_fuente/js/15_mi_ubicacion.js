// Mi ubicación: GPS del teléfono, colonia donde está la persona y tramos prioritarios cercanos. La posición no sale del dispositivo.
// ---------- Mi ubicación (GPS del teléfono; la posición no sale del dispositivo) ----------
let locFollow = false, locWatch = null, locLastSel = null, locLastUpd = 0;
const locBtn = $('zloc');
const toRad = d => d*Math.PI/180;
function metersXY(lon, lat, lon0, lat0){ const k = 111320; return [(lon-lon0)*k*Math.cos(toRad(lat0)), (lat-lat0)*110574]; }
function segDist(px, py, ax, ay, bx, by){ const dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy; let t = L? ((px-ax)*dx+(py-ay)*dy)/L : 0; t=Math.max(0,Math.min(1,t)); const x=ax+t*dx, y=ay+t*dy; return [Math.hypot(px-x, py-y), x, y]; }
function pathDist(pos, st, en, lon0, lat0){ // distancia en metros del punto (lon0,lat0) a una polilínea; devuelve [d, dx, dy] del punto más cercano
  let best=[Infinity,0,0]; let [ax,ay] = metersXY(pos[2*st], pos[2*st+1], lon0, lat0);
  if (en-st===1) return [Math.hypot(ax,ay), ax, ay];
  for(let k=st+1;k<en;k++){ const [bx,by] = metersXY(pos[2*k], pos[2*k+1], lon0, lat0); const r = segDist(0,0,ax,ay,bx,by); if (r[0]<best[0]) best=r; ax=bx; ay=by; }
  return best;
}
const RUMBOS = ['al norte','al noreste','al este','al sureste','al sur','al suroeste','al oeste','al noroeste'];
const rumbo = (dx, dy) => RUMBOS[Math.round(((Math.atan2(dx, dy)*180/Math.PI)+360)%360/45)%8];
const distTxt = d => d<1000? fmt0.format(Math.max(5, Math.round(d/5)*5))+' m' : fmt1.format(d/1000)+' km';
function inRing(x, y, ring){ let inside=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1]; if(((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside; } return inside; }
function whereAmI(lon, lat){
  let alc = null; for(const p of ALC_PARTS){ if (inRing(lon, lat, p.poly)){ alc = p.i; break; } }
  let col = null;
  if (alc!==null) for(const c of COLS){ if (munIndex[META.colonias[c.i].m]!==alc) continue; const b = colBB(c.i); if (lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3]) continue; if (c.paths.some(r=>inRing(lon, lat, r))){ col = c.i; break; } }
  return {alc, col};
}
// índice de puntos medios para buscar cerca sin recorrer toda la ciudad
let MID = null, VMID = null;
function mids(){ if (MID) return; MID = new Float32Array(2*N); for(let i=0;i<N;i++){ MID[2*i]=midLon(i); MID[2*i+1]=midLat(i); }
  VMID = new Float32Array(2*NV); for(let i=0;i<NV;i++){ const [la,lo] = vpMid(i); VMID[2*i]=lo; VMID[2*i+1]=la; } }
function nearby(lon, lat){
  mids();
  const out = [], any = {d:Infinity};
  const scan = (R) => { out.length = 0; const dLat = R/110574 + 0.002, dLon = R/(111320*Math.cos(toRad(lat))) + 0.002;
    if (respOn.alc) for(let i=0;i<N;i++){ const x=MID[2*i], y=MID[2*i+1]; if (Math.abs(x-lon)>dLon || Math.abs(y-lat)>dLat || F.gc[i] || !visible[F.prio[i]]) continue;
      const [d,dx,dy] = pathDist(POS, start[i], start[i+1], lon, lat); if (d<any.d){ any.d=d; any.k='fr'; any.i=i; any.dx=dx; any.dy=dy; }
      if (F.prio[i]>=3 && d<=R) out.push({k:'fr', i, d, dx, dy}); }
    if (respOn.gc) for(let i=0;i<NV;i++){ const x=VMID[2*i], y=VMID[2*i+1]; if (Math.abs(x-lon)>dLon+0.01 || Math.abs(y-lat)>dLat+0.01 || !visible[VP.prio[i]]) continue;
      const [d,dx,dy] = pathDist(VPOS, vstart[i], vstart[i+1], lon, lat); if (d<any.d){ any.d=d; any.k='vp'; any.i=i; any.dx=dx; any.dy=dy; }
      if (VP.prio[i]>=3 && d<=R) out.push({k:'vp', i, d, dx, dy}); } };
  let R = 300; scan(R);
  if (!out.length){ R = 1500; scan(R); }
  // una calle aparece una sola vez: su tramo prioritario más cercano
  out.sort((a,b)=> a.d-b.d); const seen = new Set(), list = [];
  for(const o of out){ const key = o.k==='fr'? (PLACEHOLDER.has(F.name[o.i])? 'x'+o.i : 'f'+F.name[o.i]+'_'+F.col[o.i]) : 'v'+VP.nom[o.i]; if (seen.has(key)) continue; seen.add(key); list.push(o); if (list.length===5) break; }
  return {list, R, any: any.d<=60? any : null};
}
function tramoLine(o){
  const pr = o.k==='fr'? F.prio[o.i] : VP.prio[o.i]; const c = T.prio[pr];
  const nm = o.k==='fr'? (PLACEHOLDER.has(F.name[o.i])? 'Frente sin nombre de calle' : `${META.tipos[F.tipo[o.i]] && META.tipos[F.tipo[o.i]]!=='—'? META.tipos[F.tipo[o.i]]+' ':''}${META.names[F.name[o.i]]}`) : VPC.nomenclat[VP.nom[o.i]];
  const sub = o.k==='fr'? `${META.prio[pr]} · ${(META.colonias[F.col[o.i]]||{}).n || 'colonia no identificada'}` : `${META.prio[pr]} · vialidad primaria (Gobierno Central)`;
  return {c, nm, sub};
}
function locHtml(){
  if (!myPos) return '';
  const p = myPos, w = whereAmI(p.lon, p.lat);
  const accTxt = `precisión ±${fmt0.format(Math.max(1, Math.round(p.acc)))} m`;
  const head = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i style="background:rgb(${LOC_BLUE})"></i>Tu ubicación · ${accTxt}</span>`;
  const privacy = `<div class="cardnote">Tu ubicación solo se usa en este teléfono; no se envía ni se guarda.</div>`;
  if (w.alc===null) return head + `<h3>Estás fuera de la Ciudad de México</h3><div class="empty-note"><b>La herramienta solo cubre las 16 alcaldías.</b> Acércate a la ciudad o busca un territorio con el buscador.</div>` + privacy;
  const col = w.col!==null? META.colonias[w.col] : null;
  const nb = nearby(p.lon, p.lat);
  const aqui = nb.any? (()=>{ const t = tramoLine(nb.any); return `<div class="loc-here">Junto a ti: <b>${t.nm}</b> · prioridad ${t.sub.split(' · ')[0]} · a ${distTxt(nb.any.d)}</div>`; })() : '';
  const tit = respOn.alc && respOn.gc? 'Tramos prioritarios cerca de ti' : respOn.gc? 'Vialidades primarias prioritarias cerca de ti' : 'Calles prioritarias cerca de ti';
  const items = nb.list.map(o=>{ const t = tramoLine(o); return `<li><button type="button" data-k="${o.k}" data-i="${o.i}"><span class="pr" style="background:rgb(${t.c[0]},${t.c[1]},${t.c[2]})"></span><span class="t"><b>${t.nm}</b><span class="m">${t.sub}</span></span><span class="d">${distTxt(o.d)}<br><span class="m">${rumbo(o.dx, o.dy)}</span></span></button></li>`; }).join('');
  const lista = nb.list.length? `${nb.R>300? `<div class="cardnote">No hay tramos prioritarios a menos de 300 m; estos son los más cercanos.</div>`:''}<ol class="loc-list">${items}</ol>`
    : `<div class="empty-note"><b>No hay tramos prioritarios a menos de 1.5 km.</b> La zona donde estás no tiene frentes de prioridad Alta o Muy Alta${respOn.gc && !respOn.alc? ' en vialidades primarias' : ''}.</div>`;
  const aviso = p.acc>50? `<div class="empty-note"><b>Ubicación aproximada.</b> El GPS indica ±${fmt0.format(Math.round(p.acc))} m; al aire libre la precisión mejora. Confirma el tramo en la calle.</div>` : '';
  return head + `<h3>Estás en ${col? col.n : 'una zona sin colonia identificada'}</h3><div class="sub">${META.munNames[w.alc]}${col && col.cp? ' · CP '+col.cp.padStart(5,'0') : ''}</div>`
    + aviso + aqui + `<h4 class="loc-h">${tit}</h4>` + lista
    + `<div class="acts"><button class="btn secondary act" id="loc-follow" type="button" aria-pressed="${locFollow}">${locFollow? 'Dejar de seguirme' : 'Seguirme mientras camino'}</button></div>` + privacy;
}
function locMsg(title, body){ const c=$('card'); pinned={kind:'loc', i:0}; c.innerHTML = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i style="background:rgb(${LOC_BLUE})"></i>Tu ubicación</span><h3>${title}</h3><div class="empty-note">${body}</div><div class="cardnote">Tu ubicación solo se usa en este teléfono; no se envía ni se guarda.</div>`; c.hidden=false; c.querySelector('.close').onclick=hideCard; }
function wireLocCard(c){
  c.querySelectorAll('.loc-list button').forEach(b=> b.onclick = ()=>{ const k=b.dataset.k, i=+b.dataset.i; stopFollow();
    if (k==='fr'){ const cid=F.col[i]; if (cid && cid!==selCol){ keepView=true; pickColonia(cid); keepView=false; } showCard('fr', i); flyTo({...viewState, longitude:midLon(i), latitude:midLat(i), zoom:Math.max(viewState.zoom, 17.5)}, 700); }
    else { showCard('vp', i); const [la,lo]=vpMid(i); flyTo({...viewState, longitude:lo, latitude:la, zoom:Math.max(viewState.zoom, 17)}, 700); } });
  const f = c.querySelector('#loc-follow'); if (f) f.onclick = ()=> locFollow? stopFollow(true) : startFollow();
}
function selectHere(){ // selecciona la colonia (modo Alcaldías) o la alcaldía (modo Gobierno Central) donde está la persona
  const w = whereAmI(myPos.lon, myPos.lat); const key = w.alc+'_'+w.col; if (key===locLastSel) return; locLastSel = key;
  if (w.alc===null) return;
  keepView = true;
  if (!isGC() && w.col!==null){ if (isPhone() && !showFrB) setLayer('fr', true); if (selCol!==w.col) pickColonia(w.col); }
  else if (sel!==w.alc || selCol!==null || selAv!==null){ selEl.value=String(w.alc); setSel(String(w.alc)); }
  keepView = false;
}
function showLoc(){ const c=$('card'); pinned={kind:'loc', i:0}; c.innerHTML = locHtml(); c.hidden=false; c.querySelector('.close').onclick=hideCard; wireLocCard(c); }
function onPos(pos, first){
  myPos = {lon:pos.coords.longitude, lat:pos.coords.latitude, acc:pos.coords.accuracy||0, t:Date.now()};
  locBtn.classList.add('on');
  const w = whereAmI(myPos.lon, myPos.lat); const wasLoc = first || (pinned && pinned.kind==='loc');
  if (w.alc!==null){ selectHere(); if (first || locFollow) flyTo({...viewState, longitude:myPos.lon, latitude:myPos.lat, zoom: first? Math.max(viewState.zoom, 17) : viewState.zoom, bearing:0, pitch:0}, first? 900 : 500); }
  rerender();
  if (wasLoc || (pinned && pinned.kind==='loc')) showLoc();
}
function locError(e){
  locBtn.classList.remove('busy'); stopFollow();
  const enMarco = window.self!==window.top;
  if (e && e.code===1) locMsg('No se permitió usar tu ubicación', enMarco? '<b>Dentro de Claude no se puede pedir la ubicación.</b> Abre la página pública de la herramienta en el navegador de tu teléfono.' :
    '<b>Actívala y vuelve a tocar el botón.</b> Android (Chrome): toca el candado junto a la dirección › Permisos › Ubicación › Permitir. iPhone: Ajustes › Privacidad y seguridad › Localización › Safari › Mientras se usa la app; después recarga la página.');
  else if (e && e.code===3) locMsg('El GPS tardó demasiado', '<b>Intenta de nuevo al aire libre.</b> Dentro de edificios la señal es débil.');
  else locMsg('No se pudo obtener tu ubicación', '<b>Revisa que la ubicación del teléfono esté encendida</b> y vuelve a intentarlo.');
}
function locate(){
  if (!navigator.geolocation || !window.isSecureContext){ locMsg('Tu navegador no permite usar la ubicación', '<b>Abre la herramienta desde su dirección segura (https)</b> en Chrome o Safari.'); return; }
  locBtn.classList.add('busy'); locMsg('Buscando tu ubicación…', 'El navegador puede pedirte permiso. <b>Tu ubicación solo se usa en este teléfono.</b>');
  locLastSel = null;
  navigator.geolocation.getCurrentPosition(p=>{ locBtn.classList.remove('busy'); onPos(p, true); }, locError, {enableHighAccuracy:true, timeout:20000, maximumAge:15000});
}
function startFollow(){ if (!navigator.geolocation) return; locFollow = true; locBtn.classList.add('follow'); locBtn.setAttribute('aria-pressed','true'); locBtn.title='Dejar de seguir mi ubicación';
  if (myPos) flyTo({...viewState, longitude:myPos.lon, latitude:myPos.lat}, 500);
  if (locWatch===null) locWatch = navigator.geolocation.watchPosition(p=>{ const now=Date.now(); const moved = !myPos || Math.hypot(...metersXY(p.coords.longitude, p.coords.latitude, myPos.lon, myPos.lat)) > 8; if (!moved && now-locLastUpd<4000) return; locLastUpd = now; onPos(p, false); }, e=>{ if (e && e.code===1) locError(e); /* sin señal momentánea: se conserva la última posición */ }, {enableHighAccuracy:true, maximumAge:5000, timeout:30000});
  if (pinned && pinned.kind==='loc') showLoc(); }
function stopFollow(redraw){ locFollow = false; locBtn.classList.remove('follow'); locBtn.setAttribute('aria-pressed','false'); locBtn.title='Mi ubicación';
  if (locWatch!==null){ navigator.geolocation.clearWatch(locWatch); locWatch = null; }
  if (redraw && pinned && pinned.kind==='loc') showLoc(); }
locBtn.onclick = ()=>{ if (!myPos) locate(); else if (!locFollow) { locLastSel = null; startFollow(); if (!(pinned && pinned.kind==='loc')) showLoc(); } else stopFollow(true); };
// arrastrar el mapa suspende el seguimiento, como en las apps de mapas
mapEl.addEventListener('pointermove', e=>{ if (locFollow && e.buttons && pdown && Math.hypot(e.clientX-pdown[0], e.clientY-pdown[1])>12) stopFollow(true); });
