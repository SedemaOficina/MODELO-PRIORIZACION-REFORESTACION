// Generado por 02_fuente/construir.py a partir de 02_fuente/js/. No editar aquí.
(async function(){
'use strict';
// Utilidades: acceso al DOM y formatos de número y distancia.
const $ = id => document.getElementById(id);
const PRIO_VARS = ['--p0','--p1','--p2','--p3','--p4'];
const fmt = new Intl.NumberFormat('es-MX');
const fmt1 = new Intl.NumberFormat('es-MX',{maximumFractionDigits:1});
const fmt0 = new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
const pct = (a,b)=> b? fmt1.format(100*a/b)+' %' : '—';
const kmTxt = v => v>=10? fmt0.format(v) : v>=1? fmt1.format(v) : v>0? fmt.format(Math.max(1,Math.round(v*1000))) : '0';
const kmUn = v => (v>0 && v<1)? 'm' : 'km';
const kmFull = v => kmTxt(v)+' '+kmUn(v);
const sum = a => a.reduce((x,y)=>x+y,0);
// Versión de la herramienta y corte de los datos: los fija construir.py (VERSION y CORTE_DATOS) y se muestran en el panel, las fichas y los Excel.
const VERSION = Object.assign({v:'', corte:''}, window.SIA_VERSION || {});
const VERSION_TXT = `Versión ${VERSION.v} · Datos: ${VERSION.corte}`;
const PRELIM_TXT = 'La asignación de cada frente a la alcaldía o al Gobierno Central es preliminar: resulta de una regla geométrica en validación.';

// Datos: descarga (sitio) o lectura (archivo único) de meta.bin, data.bin y vp.bin, descompresión y decodificación a arreglos (frentes F, geometría POS, vialidades primarias VP).
// ---------- lectura y decodificación ----------
function b64ToBytes(s){ const bin = atob(s); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
async function gunzip(bytes){
  if (typeof DecompressionStream !== 'undefined'){
    try{ const ds = new DecompressionStream('gzip'); const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer(); return new Uint8Array(ab); }
    catch(e){ console.warn('DecompressionStream falló, usando pako', e); }
  }
  return pako.inflate(bytes);
}
const setLoad = (msg, p)=>{ $('load-msg').textContent = msg; $('load-bar').style.width = (p*100)+'%'; };
// datos: incrustados en la página (artefacto, versión de un solo archivo) o en archivos aparte (docs/datos)
const DATOS = window.SIA_DATOS || null;
let dlDone = 0, dlShow = true;
function showDl(){ if (!dlShow || !DATOS) return; const mb = v => fmt1.format(v/1048576); setLoad('Descargando datos: ' + mb(dlDone) + ' de ' + mb(DATOS.total) + ' MB', .02 + .2*Math.min(1, dlDone/DATOS.total)); }
async function fetchBytes(name){
  let r;
  try { r = await fetch('datos/' + name + '?v=' + DATOS.v[name]); }
  catch(e){ throw new Error(location.protocol==='file:' ? 'Esta versión se abre desde un servidor web (GitHub Pages o el SIA). Para abrirla con doble clic usa _local/calles_prioritarias.html' : 'No se pudieron descargar los datos; revisa tu conexión'); }
  if (!r.ok) throw new Error('No se pudo descargar ' + name + ' (' + r.status + ')');
  if (!r.body || !r.body.getReader){ const b = new Uint8Array(await r.arrayBuffer()); dlDone += b.length; showDl(); return b; }
  const rd = r.body.getReader(), parts = []; let n = 0;
  for(;;){ const {done, value} = await rd.read(); if (done) break; parts.push(value); n += value.length; dlDone += value.length; showDl(); }
  const out = new Uint8Array(n); let o = 0; for (const q of parts){ out.set(q, o); o += q.length; } return out;
}
const blk = (id, name) => { const el = $(id); return el ? Promise.resolve(b64ToBytes(el.textContent.trim())) : fetchBytes(name); };
const pMeta = blk('meta-b64','meta.bin'), pData = blk('data-b64','data.bin'), pVp = blk('vp-b64','vp.bin');
pMeta.catch(()=>{}); pData.catch(()=>{}); pVp.catch(()=>{});
function reader(raw){ let rp=0; return ()=>{ let res=0, shift=0, b; do{ b=raw[rp++]; res += (b & 0x7f) * Math.pow(2,shift); shift+=7; }while(b & 0x80); return (res % 2) ? -((res+1)/2) : res/2; }; }

setLoad(DATOS ? 'Descargando datos…' : 'Descomprimiendo catálogos…', .02);
const META = JSON.parse(new TextDecoder().decode(await gunzip(await pMeta)));
const Q = META.Q;
const rawGz = await pData; dlShow = false;
setLoad('Descomprimiendo 372 mil frentes…', .25);
const raw = await gunzip(rawGz);
setLoad('Construyendo geometría…', .45);
await new Promise(r=>setTimeout(r,20));

// frentes de manzana
let rv = reader(raw);
const N = rv();
const F = { mun:new Uint8Array(N), prio:new Uint8Array(N), name:new Int32Array(N), tipo:new Uint8Array(N), col:new Int32Array(N), len:new Uint16Array(N), flags:new Uint8Array(N), vp:new Int32Array(N), gc:new Uint8Array(N) };
const start = new Uint32Array(N+1);
let px=0, py=0, vcount=0;
const tmpPos = new Float64Array(raw.length);
for(let i=0;i<N;i++){
  F.mun[i]=rv(); F.prio[i]=rv(); F.name[i]=rv(); F.tipo[i]=rv(); F.col[i]=rv(); F.len[i]=rv(); const fl=rv(); F.flags[i]=fl; F.gc[i]=(fl>>6)&1; F.vp[i]=rv()-1;
  const nv = rv(); start[i]=vcount;
  for(let k=0;k<nv;k++){ px+=rv(); py+=rv(); tmpPos[2*vcount]=px/Q; tmpPos[2*vcount+1]=py/Q; vcount++; }
}
start[N]=vcount;
const POS = tmpPos.slice(0, vcount*2);
const V = vcount;
// Punto a media longitud SOBRE la línea (no el promedio de sus extremos, que en una curva cae fuera de la calle).
// Es la única regla de «punto medio» de la herramienta: tarjeta, Excel, enlaces de campo y Mi ubicación (auditoría H-089).
function puntoMedio(P, a, b){ const c=Math.cos(P[2*a+1]*Math.PI/180); let L=0; for(let k=a;k<b-1;k++) L+=Math.hypot((P[2*k+2]-P[2*k])*c, P[2*k+3]-P[2*k+1]);
  if (!L) return [P[2*a], P[2*a+1]]; let h=L/2;
  for(let k=a;k<b-1;k++){ const d=Math.hypot((P[2*k+2]-P[2*k])*c, P[2*k+3]-P[2*k+1]); if (h<=d){ const t=d? h/d : 0; return [P[2*k]+(P[2*k+2]-P[2*k])*t, P[2*k+1]+(P[2*k+3]-P[2*k+1])*t]; } h-=d; }
  return [P[2*(b-1)], P[2*(b-1)+1]]; }
const midLon = i => puntoMedio(POS, start[i], start[i+1])[0];
const midLat = i => puntoMedio(POS, start[i], start[i+1])[1];

// vialidades primarias (Gobierno Central)
setLoad('Cargando vialidades primarias…', .7);
const vraw = await gunzip(await pVp);
rv = reader(vraw);
const NV = rv();
const VP = { nom:new Int32Array(NV), nombre:new Int32Array(NV), tipo:new Uint8Array(NV), car:new Uint8Array(NV), circ:new Uint8Array(NV), alct:new Uint8Array(NV), mun:new Uint8Array(NV), prio:new Uint8Array(NV), len:new Uint32Array(NV), clave:new Int32Array(NV), rec:new Int32Array(NV) };
const vstart = new Uint32Array(NV+1);
px=0; py=0; let vc=0; const vtmp = new Float64Array(vraw.length);
for(let i=0;i<NV;i++){
  VP.nom[i]=rv(); VP.nombre[i]=rv(); VP.tipo[i]=rv(); VP.car[i]=rv(); VP.circ[i]=rv(); VP.alct[i]=rv(); VP.mun[i]=rv(); VP.prio[i]=rv(); VP.len[i]=rv(); VP.clave[i]=rv(); VP.rec[i]=rv();
  const nv=rv(); vstart[i]=vc;
  for(let k=0;k<nv;k++){ px+=rv(); py+=rv(); vtmp[2*vc]=px/Q; vtmp[2*vc+1]=py/Q; vc++; }
}
vstart[NV]=vc; const VPOS = vtmp.slice(0, vc*2); const VV = vc;
const VPC = META.vp; // catálogos de la capa
setLoad('Preparando capas…', .85);
await new Promise(r=>setTimeout(r,20));

// Estado de la consulta (ámbito, responsable, capas), colores del tema, atributos por vértice para el mapa y geometría de contexto (alcaldías y colonias).
// ---------- colores del tema (se leen de las variables CSS) ----------
function css(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
function hex(h, a=255){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),a]; }
let T = {};
function readTokens(){
  T.prio = PRIO_VARS.map(v=>hex(css(v)));
  T.alc = hex(css('--map-alc')); T.col = hex(css('--map-col')); T.label = hex(css('--map-label')); T.sel = hex(css('--map-sel')); T.gold = hex(css('--dorado')); T.vpctx = hex(css('--map-vp'));
  T.ground = css('--ground');
}
readTokens();

// ---------- estado de la consulta ----------
let resp = 'alc';         // 'alc' | 'gc' | 'both'  → responsable consultado
let sel = null;           // índice de alcaldía o null
let selCol = null;        // id de colonia o null
let selAv = null;         // id de avenida (NOMENCLAT) o null — solo modo Gobierno Central
let highlight = null;     // {nameId, idx:[...]} (calles) | {avId, idx:[...]} (vialidades)
let pinned = null;        // {kind:'fr'|'vp', i}
let viewState = null;
const LOC_BLUE = hex(css('--loc')).slice(0,3);   // azul de Mi ubicación (variable --loc en 01_variables.css)
let myPos = null;          // Mi ubicación: {lon, lat, acc, t}; nunca sale del teléfono
const munIndex = Object.fromEntries(META.muns.map((m,i)=>[m,i]));
const isGC = ()=> resp==='gc';
const showsFrontsMode = ()=> resp!=='gc';

// ---------- atributos por vértice (frentes) ----------
let COLORS = new Uint8Array(V*4);
// Filtro único de frentes del ámbito consultado. Lo usan el mapa, las cifras, el listado, los Excel y las fichas,
// para que todos hablen del mismo territorio: con colonia elegida manda la colonia (aunque parte de sus frentes
// pertenezca a otra alcaldía en el catálogo); sin colonia, manda la alcaldía.
const enAmbito = i => selCol!==null ? F.col[i]===selCol : (sel===null || F.mun[i]===sel);
function buildColors(){
  for(let i=0;i<N;i++){ const c=T.prio[F.prio[i]]; const a = enAmbito(i)? 255 : 38; for(let k=start[i];k<start[i+1];k++){ const o=4*k; COLORS[o]=c[0]; COLORS[o+1]=c[1]; COLORS[o+2]=c[2]; COLORS[o+3]=a; } }
  COLORS = COLORS.slice(0);
}
buildColors();
const visible = [true,true,true,true,true];
let FILTER = new Float32Array(V*2);
function buildFilter(){
  for(let i=0;i<N;i++){ const m=F.mun[i], v=(visible[F.prio[i]] && !F.gc[i])?1:0; for(let k=start[i];k<start[i+1];k++){ FILTER[2*k]=m; FILTER[2*k+1]=v; } }
  FILTER = FILTER.slice(0);
}
buildFilter();
// atributos por vértice (vialidades primarias)
let VCOLORS = new Uint8Array(VV*4), VFILTER = new Float32Array(VV*2);
function buildVP(){
  const ctx = resp==='alc';
  for(let i=0;i<NV;i++){
    const c = ctx? T.vpctx : T.prio[VP.prio[i]];
    const inS = (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv);
    const a = ctx? 200 : (inS? 255 : 40);
    const v = visible[VP.prio[i]]? 1 : 0;
    for(let k=vstart[i];k<vstart[i+1];k++){ const o=4*k; VCOLORS[o]=c[0]; VCOLORS[o+1]=c[1]; VCOLORS[o+2]=c[2]; VCOLORS[o+3]=a; VFILTER[2*k]=VP.mun[i]; VFILTER[2*k+1]=v; }
  }
  VCOLORS = VCOLORS.slice(0); VFILTER = VFILTER.slice(0);
}
buildVP();

// ---------- geometría de contexto: alcaldías, colonias y rankings ----------
const ring = r => r.map(p=>[p[0]/Q, p[1]/Q]);
const ALC = META.alc.map(a=>({cve:a.cve, nom:a.nom, polys:a.rings.map(ring)}));
const COLS = META.cols.map(c=>({i:c.i, nom:META.colonias[c.i].n, mun:META.colonias[c.i].m, prio:META.colonias[c.i].p, paths:c.rings.map(ring)}));
function centroid(paths){ let sx=0,sy=0,n=0; for(const p of paths) for(const q of p){ sx+=q[0]; sy+=q[1]; n++; } return [sx/n, sy/n]; }
const ALC_PARTS = ALC.flatMap((a,i)=>a.polys.map(poly=>({i, poly})));
const ALC_LABELS = ALC.map(a=>({pos:centroid([a.polys.reduce((m,p)=>p.length>m.length?p:m, a.polys[0])]), text:a.nom}));
const COL_PATHS = COLS.flatMap(c=>c.paths.map(p=>({path:p})));
const COL_PARTS = COLS.flatMap(c=>c.paths.map(poly=>({poly, prio:c.prio, i:c.i})));
function colBounds(id){ let w=180,s=90,e=-180,n=-90; for(const c of COLS){ if(c.i!==id) continue; for(const p of c.paths) for(const q of p){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } } return [w,s,e,n]; }
function avBounds(id, mun){ let w=180,s=90,e=-180,n=-90; for(let i=0;i<NV;i++){ if(VP.nom[i]!==id) continue; if(mun!==undefined && mun!==null && VP.mun[i]!==mun) continue; for(let k=vstart[i];k<vstart[i+1];k++){ const x=VPOS[2*k],y=VPOS[2*k+1]; if(x<w)w=x; if(x>e)e=x; if(y<s)s=y; if(y>n)n=y; } } return [w,s,e,n]; }
let showAlcB = false, showColB = true, showFrB = true, colBefore = false;
// Modo ligero: si el navegador dibuja sin tarjeta gráfica (o se pide con ?modo=ligero), las calles se dibujan
// solo desde el zoom ZOOM_LIGERO y, más lejos, las colonias muestran la prioridad. Ver 06_mapa_interaccion.js.
let modoLigero = false;
let opPrio = 1;          // opacidad de las capas de prioridad (0.2 a 1), la ajusta el usuario en el panel de capas
let fondo = 'no';        // mapa de fondo: 'no' | 'calles' | 'sat'
const ZOOM_LIGERO = 13;
const frVisibles = ()=> showFrB && !(modoLigero && viewState.zoom < ZOOM_LIGERO);
const showCol = ()=> showColB && !isGC(), showFr = ()=> showFrB, colOnly = ()=> showColB && !frVisibles() && !isGC(), alcOnly = ()=> showAlcB && !showColB && !showFrB;
// Sumas exactas por alcaldía, calculadas una sola vez de los frentes y los tramos (auditoría H-087): los resúmenes de meta.bin
// vienen redondeados a dos decimales y volver a redondearlos movía la cifra hasta 0.1 km respecto del recálculo.
(()=>{ const z = ()=>[0,0,0,0,0]; const A=META.muns.map(z), G=META.muns.map(z), W=META.muns.map(z);
  for(let i=0;i<N;i++) (F.gc[i]? G : A)[F.mun[i]][F.prio[i]] += F.len[i]/1000;
  for(let i=0;i<NV;i++) W[VP.mun[i]][VP.prio[i]] += VP.len[i]/1000;
  const tot = M => M.reduce((t,a)=>t.map((v,k)=>v+a[k]), z());
  META.muns.forEach((m,i)=>{ META.summ[m].km=A[i]; META.summ_gc[m].km=G[i]; if (VPC.summ[m]) VPC.summ[m].km=W[i]; });
  META.city.km=tot(A); META.city_gc.km=tot(G); VPC.city.km=tot(W); })();
// prioridad predominante y ranking por alcaldía — frentes (Alcaldía) y vialidades primarias (Gobierno Central)
const kmPrio = s => s.km[3]+s.km[4];
const rank = META.muns.map(m=>kmPrio(META.summ[m])).map((v,i,arr)=>1+arr.filter(x=>x>v).length);
const rankVP = META.muns.map(m=>kmPrio(VPC.summ[m])).map((v,i,arr)=>1+arr.filter(x=>x>v).length);
const dom = s => { const k=s.km; let b=0; for(let i=1;i<5;i++) if(k[i]>k[b]) b=i; return b; };
const ALC_DOM = META.muns.map(m=>dom(META.summ[m]));
const VP_DOM = META.muns.map(m=>dom(VPC.summ[m]));
const VP_RECS = META.muns.map(()=>({r:new Set(), rp:new Set()})); for(let i=0;i<NV;i++){ VP_RECS[VP.mun[i]].r.add(VP.rec[i]); if(VP.prio[i]>=3) VP_RECS[VP.mun[i]].rp.add(VP.rec[i]); }
const domOf = i => isGC()? VP_DOM[i] : ALC_DOM[i];
const rankOf = i => isGC()? rankVP[i] : rank[i];
const summOf = i => isGC()? VPC.summ[META.muns[i]] : META.summ[META.muns[i]];
const COL_LABELS = COLS.map(c=>({pos:centroid(c.paths), text:c.nom, mun:c.mun}));
const charset = [...new Set((ALC_LABELS.concat(COL_LABELS)).map(l=>l.text).join('') + '0123456789')];

// Mapa: vista, nombres de calle, barra de escala y capas de deck.gl (layers()).
// ---------- mapa: vista y datos para deck.gl ----------
const {DeckGL, PathLayer, PolygonLayer, TextLayer, DataFilterExtension, CollisionFilterExtension, WebMercatorViewport, FlyToInterpolator, MapView} = deck;
const mapEl = $('map');
function fitTo(bounds, pad=40){
  const w = mapEl.clientWidth, h = mapEl.clientHeight;
  const vp = new WebMercatorViewport({width:w, height:h}).fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]], {padding:pad});
  return {longitude:vp.longitude, latitude:vp.latitude, zoom:vp.zoom, bearing:0, pitch:0};
}
const CITY_BOUNDS = [-99.365,19.048,-98.940,19.593];
viewState = fitTo(CITY_BOUNDS, 24);
const NOMAP = location.hash==='#nomap';
// Sin animación en modo ligero o si la persona pidió reducir movimiento: cada cuadro de animación redibuja el mapa.
let nVista = 0;
function flyTo(vs, ms=700){ if (NOMAP){ viewState={...viewState,...vs}; return; } const sinAnim = modoLigero || ms===0 || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prev = viewState.zoom;
  // _n hace única cada orden: deck.gl ignora una vista inicial igual a la anterior aunque el usuario ya
  // haya movido el mapa con el ratón o los dedos (por eso "toda la ciudad" a veces no hacía nada)
  dk.setProps({initialViewState:{...vs, _n: ++nVista, transitionDuration: sinAnim? 0 : ms, transitionInterpolator: sinAnim? undefined : new FlyToInterpolator()}}); viewState={...viewState,...vs};
  // sin animación deck.gl no avisa del cambio de vista: se actualizan aquí capas y escala
  if (sinAnim){ if (zoomBand(viewState.zoom)!==zoomBand(prev)) rerender(); updateScale(); } }

// Rendimiento: deck.gl vuelve a procesar ~1 millón de vértices cada vez que recibe un objeto de datos nuevo.
// Por eso se reutiliza el mismo objeto mientras no cambien colores ni filtros (solo cambian al cambiar la
// consulta, no al hacer zoom o mover el mapa).
let FR_DATA = null, VP_DATA = null;
function frontsData(){
  if (!FR_DATA || FR_DATA.attributes.getColor.value!==COLORS || FR_DATA.attributes.getFilterValue.value!==FILTER)
    FR_DATA = {length:N, startIndices:start, attributes:{ getPath:{value:POS,size:2}, getColor:{value:COLORS,size:4,normalized:true}, getFilterValue:{value:FILTER,size:2} }};
  return FR_DATA; }
function vpData(){
  if (!VP_DATA || VP_DATA.attributes.getColor.value!==VCOLORS || VP_DATA.attributes.getFilterValue.value!==VFILTER)
    VP_DATA = {length:NV, startIndices:vstart, attributes:{ getPath:{value:VPOS,size:2}, getColor:{value:VCOLORS,size:4,normalized:true}, getFilterValue:{value:VFILTER,size:2} }};
  return VP_DATA; }
// ---------- nombres de calle desde los propios frentes (zoom ≥ 15; auditoría C3) ----------
let COL_FR = null; const STL = new Map(); const COL_BB = new Map(); let lblCenter = null;
function colFrentes(){ if (COL_FR) return COL_FR; COL_FR = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; let a=COL_FR.get(c); if(!a){ a=[]; COL_FR.set(c,a); } a.push(i); } return COL_FR; }
function colBB(c){ let b=COL_BB.get(c); if(!b){ b=colBounds(c); COL_BB.set(c,b); } return b; }
function colStreetLabels(c){ let L=STL.get(c); if(L) return L; const best=new Map();
  for(const i of (colFrentes().get(c)||[])){ if(F.gc[i]) continue; const nid=F.name[i]; if(PLACEHOLDER.has(nid)) continue; const b=best.get(nid); if(b===undefined || F.len[i]>F.len[b]) best.set(nid,i); }
  L=[...best.entries()].map(([nid,i])=>{ const a=start[i], e=start[i+1]-1; const dx=(POS[2*e]-POS[2*a])*Math.cos(midLat(i)*Math.PI/180), dy=POS[2*e+1]-POS[2*a+1]; let ang=Math.atan2(dy,dx)*180/Math.PI; if(ang>90) ang-=180; if(ang<-90) ang+=180; return {pos:[midLon(i),midLat(i)], text:META.names[nid], ang, len:F.len[i]}; });
  STL.set(c,L); return L; }
function streetLabelData(){
  if (viewState.zoom<15 || isGC() || !showFrB) return [];
  const w=mapEl.clientWidth||800, h=mapEl.clientHeight||600; const vp=new WebMercatorViewport({...viewState, width:w, height:h});
  const b=vp.getBounds(); const out=[]; lblCenter=[viewState.longitude, viewState.latitude];
  for(const c of COLS){ if(sel!==null && munIndex[c.mun]!==sel) continue; const bb=colBB(c.i); if(bb[2]<b[0]||bb[0]>b[2]||bb[3]<b[1]||bb[1]>b[3]) continue; for(const l of colStreetLabels(c.i)) out.push(l); }
  return out; }
// ---------- barra de escala (auditoría C3) ----------
function updateScale(){ const el=$('scalebar'); if(!el) return; const mpp = 40075016.686*Math.cos(viewState.latitude*Math.PI/180)/(512*Math.pow(2,viewState.zoom));
  const steps=[10,20,50,100,200,500,1000,2000,5000,10000,20000]; let m=steps[0]; for(const st of steps){ if(st/mpp<=110) m=st; }
  el.querySelector('i').style.width = Math.round(m/mpp)+'px'; el.querySelector('span').textContent = m>=1000? (m/1000)+' km' : m+' m'; }
let COL_LBL_SEL, COL_LBL = null;
function colLabelsFor(k){ if (COL_LBL===null || COL_LBL_SEL!==k){ COL_LBL_SEL = k; COL_LBL = k===null? COL_LABELS : COL_LABELS.filter(c=>munIndex[c.mun]===k); } return COL_LBL; }
// Mapas de fondo (opcionales; solo se piden a su servidor cuando el usuario los enciende).
//  · calles: CARTO Positron sobre OpenStreetMap; no requiere clave.
//  · sat: imagen de satélite de Esri (World Imagery) con la capa de referencia de nombres de vías encima
//    (Reference/World_Transportation). Con clave de ArcGIS Location Platform (window.SIA_ESRI_KEY, se define en
//    construir.py) se usa el servicio con clave, que ya trae los nombres; sin clave, los servicios de services.arcgisonline.com.
const ESRI_KEY = String(window.SIA_ESRI_KEY || '').trim();
const ESRI_TILES = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/';
const ESRI_AGOL = 'https://services.arcgisonline.com/ArcGIS/rest/services/';
const enlace = (url, t)=> `<a href="${url}" target="_blank" rel="noopener">${t}</a>`;
const FONDOS = {
  calles: { url:'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', size:256, max:19, op:1, nota:'',
    atrib:`Mapa: © ${enlace('https://www.openstreetmap.org/copyright','OpenStreetMap')} · © ${enlace('https://carto.com/attributions','CARTO')}` },
  sat: ESRI_KEY
    ? { url: ESRI_TILES+'arcgis/imagery/static/tile/{z}/{y}/{x}?token='+encodeURIComponent(ESRI_KEY), size:512, max:19, op:.9, nota:'',
        atrib:`Powered by ${enlace('https://www.esri.com','Esri')} · Imagen: Esri, Vantor, Earthstar Geographics y GIS User Community · Vías y lugares: Esri, HERE, Garmin, © OpenStreetMap contributors` }
    : { url: ESRI_AGOL+'World_Imagery/MapServer/tile/{z}/{y}/{x}', size:256, max:19, op:.9, nota:'',
        ref: ESRI_AGOL+'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        atrib:`Powered by ${enlace('https://www.esri.com','Esri')} · Imagen: Esri, Vantor, Earthstar Geographics y GIS User Community · Vías: Esri, HERE, Garmin, © OpenStreetMap contributors` }
};
let fondoFallas = 0;
// teselas de un servicio de mapas; `ref` = capa de referencia (nombres de vías) que va encima de la imagen
function capaTeselas(id, url, f, op, avisa){
  return new deck.TileLayer({id, data:url, minZoom:0, maxZoom:f.max, tileSize:f.size, opacity:op,
    onTileError: ()=>{ if (avisa && ++fondoFallas===3) avisoFondo(); },
    renderSubLayers: p=>{ const b = p.tile.boundingBox;
      return new deck.BitmapLayer(p, {data:null, image:p.data, bounds:[b[0][0], b[0][1], b[1][0], b[1][1]]}); }});
}
function capasFondo(){ const f = FONDOS[fondo], L = [capaTeselas('fondo-'+fondo, f.url, f, f.op, true)];
  if (f.ref) L.push(capaTeselas('fondo-'+fondo+'-vias', f.ref, f, 1, false));
  return L; }

function layers(){
  const z = viewState.zoom;
  const L = [];
  if (fondo!=='no') L.push(...capasFondo());
  if (showAlcB) L.push(new PolygonLayer({id:'alcaldias', opacity:opPrio, data:ALC_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> visible[domOf(d.i)]? [...T.prio[domOf(d.i)].slice(0,3), (sel===null || d.i===sel)? 170 : 45] : [0,0,0,0], pickable:true, autoHighlight: alcOnly(), highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, sel, visible.join(''), resp]}}));
  if (showCol()) L.push(new PolygonLayer({id:'col-fill', opacity:opPrio, data:COL_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> (d.prio>=0 && visible[d.prio])? [...T.prio[d.prio].slice(0,3), selCol!==null? (d.i===selCol? (frVisibles()? 60 : 190) : (frVisibles()? 14 : 40)) : (colOnly()? 150 : 80)] : [0,0,0,0], pickable: true, autoHighlight: true, highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, showColB, showFrB, frVisibles(), visible.join(''), resp, selCol]}}));
  L.push(new PolygonLayer({id:'alc', data:ALC_PARTS, getPolygon:d=>d.poly, filled:false, stroked:true, getLineColor:T.alc, lineWidthMinPixels:1, lineWidthMaxPixels:1.5, updateTriggers:{getLineColor:[T.alc]}}));
  if ((z>=12.2 && !isGC()) || colOnly()) L.push(new PathLayer({id:'cols', data:COL_PATHS, getPath:d=>d.path, getColor:T.col, widthMinPixels:0.7, widthMaxPixels:1, opacity:.7, updateTriggers:{getColor:[T.col]}}));
  // frentes de manzana (responsabilidad de las alcaldías)
  // los frentes solo responden al cursor desde el zoom 12: más lejos son demasiado finos y revisar 372 mil tramos
  // en cada movimiento del ratón vuelve lento el mapa (se consultan las colonias)
  if (frVisibles() && showsFrontsMode()) L.push(new PathLayer({id:'fronts', opacity:opPrio, data:frontsData(), _pathType:'open', widthUnits:'meters', getWidth:6, widthMinPixels:1, widthMaxPixels:9,
    pickable: z>=12, autoHighlight: z>=12, highlightColor:T.gold,
    extensions:[new DataFilterExtension({filterSize:2})], filterRange:[[0,15],[1,1]],
    updateTriggers:{getColor:[COLORS], getFilterValue:[FILTER]}}));
  if (highlight && highlight.avId!==undefined){
    // con alcaldía seleccionada, el tramo que sí cuentan las cifras va marcado; el resto de la avenida, tenue
    const mk = (idx, alpha, id)=>{ if(!idx.length) return; const st=new Uint32Array(idx.length+1); let n=0;
      for(let i=0;i<idx.length;i++){ st[i]=n; n += vstart[idx[i]+1]-vstart[idx[i]]; }
      st[idx.length]=n; const p=new Float64Array(n*2); let o=0;
      for(const i of idx){ for(let k=vstart[i];k<vstart[i+1];k++){ p[o++]=VPOS[2*k]; p[o++]=VPOS[2*k+1]; } }
      L.push(new PathLayer({id, data:{length:idx.length, startIndices:st, attributes:{getPath:{value:p,size:2}}}, _pathType:'open', widthUnits:'meters', getWidth:44, widthMinPixels:9, widthMaxPixels:30, capRounded:true, jointRounded:true, getColor:[T.gold[0],T.gold[1],T.gold[2],alpha], pickable:false})); };
    if (sel===null) mk(highlight.idx, 95, 'av-halo');
    else { mk(highlight.idx.filter(i=>VP.mun[i]!==sel), 32, 'av-halo-out'); mk(highlight.idx.filter(i=>VP.mun[i]===sel), 120, 'av-halo'); }
  }
  // vialidades primarias (Gobierno Central): contexto en gris en modo Alcaldía; coloreadas por prioridad en los otros modos
  if (showFr() || isGC()) L.push(new PathLayer({id:'vias', opacity:opPrio, data:vpData(), _pathType:'open', widthUnits:'meters', getWidth: resp==='alc'? 7 : 14, widthMinPixels: resp==='alc'? 1.2 : 2.2, widthMaxPixels: resp==='alc'? 5 : 12, capRounded:true, jointRounded:true,
    pickable:true, autoHighlight:true, highlightColor:T.gold,
    extensions:[new DataFilterExtension({filterSize:2})], filterRange:[[0,15],[1,1]],
    updateTriggers:{getColor:[VCOLORS], getFilterValue:[VFILTER], getWidth:[resp]}}));
  if (sel!==null) L.push(new PolygonLayer({id:'alc-sel', data:ALC_PARTS.filter(d=>d.i===sel), getPolygon:d=>d.poly, filled:false, stroked:true, getLineColor:T.sel, lineWidthMinPixels:2.2, lineWidthMaxPixels:3, updateTriggers:{getLineColor:[T.sel]}}));
  if (selCol!==null) L.push(new PolygonLayer({id:'col-sel', data:COL_PARTS.filter(d=>d.i===selCol), getPolygon:d=>d.poly, filled:false, stroked:true, getLineColor:T.sel, lineWidthMinPixels:2.5, lineWidthMaxPixels:4, updateTriggers:{getLineColor:[T.sel]}}));
  if (highlight && highlight.avId===undefined){
    const src = {st:start, pos:POS};
    const idx = highlight.idx; const st = new Uint32Array(idx.length+1); let n=0;
    for(let i=0;i<idx.length;i++){ st[i]=n; n += src.st[idx[i]+1]-src.st[idx[i]]; }
    st[idx.length]=n; const p = new Float64Array(n*2); let o=0;
    for(const i of idx){ for(let k=src.st[i];k<src.st[i+1];k++){ p[o++]=src.pos[2*k]; p[o++]=src.pos[2*k+1]; } }
    // calle buscada: halo dorado, filete oscuro y, al centro, el color de prioridad de cada frente (el resaltado
    // no debe tapar la prioridad, y se ve aunque la capa de calles esté apagada)
    const hd = {length:idx.length, startIndices:st, attributes:{getPath:{value:p,size:2}}};
    L.push(new PathLayer({id:'hl', data:hd, _pathType:'open', widthUnits:'meters', getWidth:30, widthMinPixels:13, widthMaxPixels:34, getColor:[T.gold[0],T.gold[1],T.gold[2],235], pickable:false}));
    L.push(new PathLayer({id:'hl-borde', data:hd, _pathType:'open', widthUnits:'meters', getWidth:16, widthMinPixels:7, widthMaxPixels:18, getColor:[36,38,42,255], pickable:false}));
    if (highlight.avId===undefined){ const cc = new Uint8Array(n*4); let q=0;
      for(const i of idx){ const c=T.prio[F.prio[i]]; for(let k=src.st[i];k<src.st[i+1];k++){ cc[q++]=c[0]; cc[q++]=c[1]; cc[q++]=c[2]; cc[q++]=255; } }
      L.push(new PathLayer({id:'hl-prio', data:{length:idx.length, startIndices:st, attributes:{getPath:{value:p,size:2}, getColor:{value:cc,size:4,normalized:true}}}, _pathType:'open', widthUnits:'meters', getWidth:10, widthMinPixels:4, widthMaxPixels:12, pickable:false})); }
  }
  L.push(new TextLayer({id:'alc-labels', data:ALC_LABELS, getPosition:d=>d.pos, getText:d=>d.text, getSize: z<11.5? 13 : 15, getColor:T.label, characterSet:charset,
    fontFamily:'Cabin, Roboto, sans-serif', fontWeight:600, fontSettings:{sdf:true}, outlineWidth:5, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', visible: z<14, extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority: d=> d.text.length, updateTriggers:{getColor:[T.label], getSize:[z<11.5]}}));
  if (z>=13.6 && !isGC()) L.push(new TextLayer({id:'col-labels', data: colLabelsFor(sel), getPosition:d=>d.pos, getText:d=>d.text.toUpperCase(), getSize:10.5, getColor:[T.label[0],T.label[1],T.label[2],200], characterSet:charset,
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:{sdf:true}, outlineWidth:4, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority: d=> -d.text.length, updateTriggers:{getColor:[T.label], data:[sel]}}));
  if (!isGC() && showFrB && z>=15){ const sd=streetLabelData(); if (sd.length) L.push(new TextLayer({id:'st-labels', data:sd, getPosition:d=>d.pos, getText:d=>d.text, getAngle:d=>d.ang, getSize:12, getColor:[34,38,42,235], characterSet:'auto',
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:{sdf:true}, outlineWidth:6, outlineColor:[255,255,255,235], getTextAnchor:'middle', getAlignmentBaseline:'center',
    extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority:d=>d.len })); }
  if (myPos){ const P=[myPos];
    L.push(new deck.ScatterplotLayer({id:'loc-acc', data:P, getPosition:d=>[d.lon,d.lat], getRadius:d=>Math.max(d.acc,4), radiusUnits:'meters', filled:true, stroked:true, getFillColor:[...LOC_BLUE,38], getLineColor:[...LOC_BLUE,120], lineWidthMinPixels:1, pickable:false, updateTriggers:{getPosition:[myPos.t], getRadius:[myPos.t]}}));
    L.push(new deck.ScatterplotLayer({id:'loc-dot', data:P, getPosition:d=>[d.lon,d.lat], getRadius:7, radiusUnits:'pixels', filled:true, stroked:true, getFillColor:[...LOC_BLUE,255], getLineColor:[255,255,255,255], lineWidthUnits:'pixels', getLineWidth:2.5, pickable:false, updateTriggers:{getPosition:[myPos.t]}})); }
  return L;
}

// Contenido de las tarjetas del mapa: frente, tramo de vialidad primaria y colonia, con acciones de campo.
const dot = c => `<i class="dot" style="background:rgb(${c[0]},${c[1]},${c[2]})"></i>`;
function featHtml(i, compact){
  const c = T.prio[F.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nm = nomFrente(i); const tp = META.tipos[F.tipo[i]] || '—'; const pre = (sinNombreFr(i) || tp==='—')? '' : tp+' '; const col = META.colonias[F.col[i]];
  const ban = META.disp[(F.flags[i]>>3)&7];
  const cpTxt = col.cp ? col.cp.padStart(5,'0') : ''; const colTxt = col.n ? `${col.n}${cpTxt? ' · CP '+cpTxt : ''}` : 'Colonia no identificada';
  if (compact) return `<span class="pr" style="background:${rgb}"></span><b>${pre}${nm}</b><br><span class="m">${col.n||'Colonia no identificada'} · ${F.len[i]} m · Prioridad ${META.prio[F.prio[i]]}</span>`;
  const cp = col.p>=0 ? META.prio[col.p] : '—';
  const cc = col.p>=0 ? T.prio[col.p] : null;
  const respTxt = (F.gc[i]? `Gobierno Central · sobre ${VPC.nomenclat[VP.nom[F.vp[i]]]}` : 'Alcaldía') + ' <small>(asignación preliminar)</small>';
  // si la colonia del frente ya es la consultada, sus datos están en el panel: no se repiten aquí
  const dupCol = (selCol!==null && F.col[i]===selCol);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad ${META.prio[F.prio[i]]}</span>
    <h3>${pre}${nm}</h3>
    <div class="sub">${colTxt} · ${META.munNames[F.mun[i]]}</div>
    <dl><dt>Responsable</dt><dd>${respTxt}</dd>
    <dt>Tipo de vialidad</dt><dd>${tp}</dd>
    <dt>Longitud del frente</dt><dd>${fmt.format(F.len[i])} m</dd>
    <dt>Banqueta (INEGI 2020)</dt><dd>${ban} <small>(por verificar en campo)</small></dd>
    ${dupCol? '' : `<dt>Prioridad de la colonia</dt><dd>${cc? dot(cc):''}${cp}</dd>
    <dt>Desarrollo social (IDS) de su unidad territorial</dt><dd>${col.ids||'—'}</dd>
    <dt>Población de la colonia</dt><dd>${col.pob? fmt.format(col.pob)+' hab.' : '—'}</dd>`}
    <dt>Coordenadas del frente</dt><dd>${midLat(i).toFixed(5)}, ${midLon(i).toFixed(5)}</dd></dl>
    ${dupCol? '<div class="cardnote">Los datos de la colonia se muestran arriba, en Resultados.</div>' : ''}
    ${fieldActs(midLat(i), midLon(i))}`;
}
function vpHtml(i, compact){
  const c = T.prio[VP.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nom = VPC.nomenclat[VP.nom[i]], nombre = VPC.nombres[VP.nombre[i]];
  if (compact){
    if (resp==='alc') return `<b>${nom}</b><br><span class="m">Vialidad primaria · a cargo de Gobierno Central · ${nombre}</span>`;
    return `<span class="pr" style="background:${rgb}"></span><b>${nom}</b><br><span class="m">${nombre} · ${VPC.tipos[VP.tipo[i]]} · ${fmt.format(VP.len[i])} m · Prioridad ${META.prio[VP.prio[i]]}</span>`;
  }
  const s = avStat(VP.nom[i]);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad ${META.prio[VP.prio[i]]}</span>
    <h3>${nom}</h3>
    <div class="sub">${nombre} · ${META.munNames[VP.mun[i]]}</div>
    <dl><dt>Responsable</dt><dd>Gobierno Central</dd>
    <dt>Tipo</dt><dd>${VPC.tipos[VP.tipo[i]]}</dd>
    <dt>Carriles</dt><dd>${VP.car[i]} · ${VPC.circula[VP.circ[i]].toLowerCase()}</dd>
    <dt>Longitud del tramo</dt><dd>${fmt.format(VP.len[i])} m</dd>
    <dt>Toda la avenida</dt><dd>${fmt1.format(s.km)} km · ${fmt1.format(s.kmp)} km prioritarios</dd>
    <dt>Alcaldías</dt><dd>${[...s.muns].map(m=>META.munNames[m]).join(', ')}</dd></dl>
    ${fieldActs(...vpMid(i))}
    ${isGC()? `<button class="btn secondary act" id="card-av" type="button">Ver toda la avenida</button>` : ''}`;
}
// acciones para salir a campo (enlaces externos y copia de coordenadas) (auditoría I5)
function fieldActs(lat, lon){ const ll = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return `<div class="field-acts">
    <a class="fa" href="https://www.google.com/maps/dir/?api=1&destination=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>Cómo llegar</a>
    <a class="fa" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="3"/><path d="M8 21v-5l-2-3 3-3h6l3 3-2 3v5"/></svg>Street View</a>
    <button class="fa" type="button" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg><span>Copiar coordenadas</span></button>
  </div>`; }
const vpMid = i => { const m = puntoMedio(VPOS, vstart[i], vstart[i+1]); return [m[1], m[0]]; };   // [lat, lon]
function colHtml(id){
  const c = META.colonias[id]; const s = colStat(id); const tot = sum(s.km); const ntot = sum(s.n);
  const pc = c.p>=0? T.prio[c.p] : null; const rgb = pc? `rgb(${pc[0]},${pc[1]},${pc[2]})` : 'transparent';
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}</span>
    <h3>${c.n}</h3>
    <div class="sub">${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}</div>
    ${ntot? '' : `<div class="empty-note"><b>Sin frentes de manzana a cargo de la alcaldía.</b> El modelo no registra calles con frente en esta colonia; puede ser una unidad habitacional o un predio sin vía pública propia.</div>`}
    <dl>${ntot? `<dt>Frente prioritario</dt><dd>${kmFull(s.kmp)}${tot? ' · '+pct(s.kmp,tot):''}</dd>
    <dt>Frentes prioritarios</dt><dd>${fmt.format(s.np)} de ${fmt.format(ntot)}</dd>
    <dt>Frente total</dt><dd>${kmFull(tot)}</dd>` : ''}
    <dt>Población</dt><dd>${c.pob? fmt.format(c.pob)+' hab.' : '—'}</dd>
    <dt>Desarrollo social (IDS) de su unidad territorial</dt><dd>${c.ids||'—'}</dd>
    ${c.nbi? `<dt>Pobreza (NBI)</dt><dd>${fmt.format(c.nbi)} personas en su unidad territorial</dd>`:''}</dl>
    <div class="acts">${!ntot? '<button class="btn secondary act" id="card-alc" type="button">Ver la alcaldía</button>' : showFrB? '' : '<button class="btn secondary act" id="card-calles" type="button">Ver sus calles</button>'}${ntot? '<button class="btn secondary act" id="card-ficha" type="button">Ficha (PDF)</button>' : ''}</div>`;
}

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
    if (info.layer.id.startsWith('alcaldias')){ const i=info.object.i; const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; return {html:`<div class="tip"><span class="pr" style="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></span><b>${META.munNames[i]}</b><br><span class="m">${isGC()? 'Vialidades primarias: prioridad predominante':'Prioridad predominante'} ${META.prio[d]} (${pct(s.km[d],tot)}) · ${fmt0.format(kmPrio(s))} km prioritarios · ${partTxt(i,isGC())}</span></div>`, style:st}; }
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
// botón de la casa: regresa a toda la ciudad y reinicia la consulta (alcaldía, colonia y avenida); conserva
// quién atiende, las capas y la leyenda
$('zcity').onclick = ()=>{ if (locFollow) stopFollow(true); hideCard();
  if (sel!==null || selCol!==null || selAv!==null){ selEl.value=''; setSel(''); } else flyTo(scopeView()); };

// Leyenda-filtro por prioridad, fila "Atiende" (alcaldías / Gobierno Central) y casillas de capas.
// ---------- leyenda-filtro ----------
const lg = $('legend-rows');
META.prio.slice().reverse().forEach((p, ri)=>{
  const k = 4-ri; const row = document.createElement('div'); row.className='row'; row.tabIndex=0; row.setAttribute('role','checkbox'); row.setAttribute('aria-checked','true');
  row.innerHTML = `<b class="lg-cb" aria-hidden="true"></b><i style="background:var(--p${k})"></i><span>${p}</span><em class="lg-km" data-k="${k}"></em>`;
  const toggle = ()=>{ visible[k]=!visible[k]; row.classList.toggle('off',!visible[k]); row.setAttribute('aria-checked',String(visible[k])); buildFilter(); buildVP(); rerender(); notaFiltro(); };
  row.onclick = toggle; row.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); } };
  lg.appendChild(row);
});
// el filtro por prioridad solo cambia el mapa: se dice siempre, y se avisa si no queda ninguna prioridad visible (auditoría H-041)
function notaFiltro(){ const n=$('lg-filter-note'); if(!n) return; const ninguna = !visible.some(Boolean); n.classList.toggle('warn', ninguna);
  n.textContent = ninguna? 'Ninguna prioridad está visible: el mapa no muestra calles. Activa al menos una casilla.' : 'Estas casillas solo cambian lo que se ve en el mapa. Las cifras, los listados y las descargas incluyen todas las prioridades.'; }
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
// opacidad de las capas de prioridad (alcaldías, colonias, calles y vialidades primarias)
$('op-prio').oninput = e=>{ opPrio = Math.min(1, Math.max(0.2, (+e.target.value||100)/100)); $('op-val').textContent = Math.round(opPrio*100)+' %'; rerender(); };
// mapa de fondo: sin fondo (predeterminado), calles o satélite
const ATRIB_BASE = $('attrib').innerHTML;
function setFondo(k){ fondo = k; fondoFallas = 0; const f = FONDOS[k], con = k!=='no';
  document.querySelectorAll('.seg.fondo button').forEach(b=> b.setAttribute('aria-pressed', String(b.dataset.fondo===k)));
  $('attrib').innerHTML = con? f.atrib : ATRIB_BASE; $('attrib').classList.toggle('sat', con); document.body.classList.toggle('fondo-sat', con);
  const n = $('fondo-note'); n.hidden = !(con && f.nota); n.textContent = con? f.nota : '';
  ajustaEscala(); rerender(); }
// la atribución del fondo ocupa una o varias líneas: la barra de escala se coloca justo encima
function ajustaEscala(){ $('scalebar').style.bottom = (fondo!=='no' && !isPhone())? (16 + $('attrib').offsetHeight + 6)+'px' : ''; }
addEventListener('resize', ajustaEscala);
function avisoFondo(){ const n = $('fondo-note'); n.hidden = false; n.textContent = 'No fue posible cargar el mapa de fondo (revisa la conexión a internet).'; }
document.querySelectorAll('.seg.fondo button').forEach(b=>{ b.onclick = ()=>{ if (b.dataset.fondo!==fondo) setFondo(b.dataset.fondo); }; });
$('reset-all').onclick = ()=>{ opPrio=1; $('op-prio').value=100; $('op-val').textContent='100 %'; setResp('alc'); setLayer('alc',false); setLayer('col',true); setLayer('fr',true); for(let k=0;k<5;k++) visible[k]=true; document.querySelectorAll('.legend .row').forEach(r=>{ r.classList.remove('off'); r.setAttribute('aria-checked','true'); }); buildFilter(); buildVP(); notaFiltro(); if (fondo!=='no') setFondo('no'); selEl.value=''; setSel(''); };

// Estadísticas por colonia, avenida y ámbito; cifras principales, barras por prioridad y textos de contexto del panel.
// estadísticas por colonia (frentes a cargo de la alcaldía)
let COLSTAT = null;
function colStat(id){ if(!COLSTAT){ COLSTAT = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i]) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; if(p>=3){ s.kmp+=k; s.np++; } } } return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(p>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// Vialidades distintas que comparten nombre (auditoría H-044): las partes de una avenida se agrupan por continuidad espacial;
// dos grupos separados por más de AV_SEP metros son vialidades distintas y la consulta lo advierte.
const AV_SEP = 1500, AVG = new Map();
function avGrupos(a){ let g=AVG.get(a); if (g) return g; const idx=avStat(a).idx, n=idx.length, c=Math.cos(19.35*Math.PI/180);
  const E = idx.map(i=>{ const p=vstart[i], q=vstart[i+1]-1; return [VPOS[2*p]*111320*c, VPOS[2*p+1]*110540, VPOS[2*q]*111320*c, VPOS[2*q+1]*110540]; });
  const par = idx.map((_,k)=>k); const find = k=>{ while(par[k]!==k){ par[k]=par[par[k]]; k=par[k]; } return k; };
  for(let p=0;p<n;p++) for(let q=p+1;q<n;q++){ const A=E[p], B=E[q];
    const d = Math.min(Math.hypot(A[0]-B[0],A[1]-B[1]), Math.hypot(A[0]-B[2],A[1]-B[3]), Math.hypot(A[2]-B[0],A[3]-B[1]), Math.hypot(A[2]-B[2],A[3]-B[3])); if (d<=AV_SEP) par[find(p)]=find(q); }
  const M = new Map(); idx.forEach((i,k)=>{ const r=find(k); let s=M.get(r); if(!s){ s={km:0, muns:new Set()}; M.set(r,s); } s.km+=VP.len[i]/1000; s.muns.add(VP.mun[i]); });
  g = [...M.values()].sort((x,y)=>y.km-x.km); AVG.set(a,g); return g; }
const avGruposTxt = a => { const g=avGrupos(a); return g.length<2? '' : `Atención: con este nombre hay ${g.length} vialidades separadas entre sí por más de ${fmt1.format(AV_SEP/1000)} km (${g.map(x=>[...x.muns].map(m=>META.munNames[m]).join(' y ')+', '+kmFull(x.km)).join('; ')}). Las cifras las suman`; };
// resumen de vialidades en un ámbito (alcaldía y/o avenida)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(sel!==null && VP.mun[i]!==sel) continue; if(selAv!==null && VP.nom[i]!==selAv) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(p>=3) s.recsp.add(VP.rec[i]); } return s; }

// ---------- reparto por responsable y universo de intervención ----------
// Universo de intervención = prioridades Muy Alta, Alta y Media. «Prioritario» sigue siendo Muy Alta + Alta.
const kmUniv = s => s.km[2]+s.km[3]+s.km[4];
// Kilómetros de FRENTE DE MANZANA por responsable (0 = alcaldía, 1 = Gobierno Central) y prioridad en un ámbito:
// total (km), sin arbolado (sa) y sin arbolado con banqueta registrada por INEGI (sb). Con colonia manda la colonia, igual que enAmbito().
const REP_CACHE = new Map();
function repStat(mun, col){
  const key = mun+'|'+col; let r = REP_CACHE.get(key); if (r) return r;
  r = {km:[[0,0,0,0,0],[0,0,0,0,0]], sa:[[0,0,0,0,0],[0,0,0,0,0]], sb:[[0,0,0,0,0],[0,0,0,0,0]]};
  for(let i=0;i<N;i++){ if (col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun)) continue;
    const g=F.gc[i], p=F.prio[i], k=F.len[i]/1000, fl=F.flags[i]; r.km[g][p]+=k;
    if ((fl&7)===1){ r.sa[g][p]+=k; if (((fl>>3)&7)===0) r.sb[g][p]+=k; } }
  if (REP_CACHE.size>40) REP_CACHE.clear(); REP_CACHE.set(key, r); return r; }
const univ3 = a => a[2]+a[3]+a[4];
// Equivalente en km de FRENTE DE MANZANA (aceras con manzana enfrente) de las vialidades primarias de un ámbito.
// La cifra oficial del Gobierno Central es el km de vialidad medido sobre el eje; el km de frente es su dato complementario
// y la única unidad con la que se compara o se suma con las alcaldías (auditoría H-018).
const GCF_CACHE = new Map();
function gcFrente(mun, av){ const key=mun+'|'+av; let r=GCF_CACHE.get(key); if (r) return r; r={km:[0,0,0,0,0]};
  for(let i=0;i<N;i++){ if(!F.gc[i]) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; r.km[F.prio[i]]+=F.len[i]/1000; }
  if (GCF_CACHE.size>60) GCF_CACHE.clear(); GCF_CACHE.set(key,r); return r; }
const gcFrenteTxt = (mun, av) => { const g=gcFrente(mun, av); return `Equivalen a ${kmFull(sum(g.km))} de frente de manzana (aceras con manzana enfrente), ${kmFull(kmPrio(g))} prioritarios`; };
const km1 = v => v>0 && v<0.05? '<0.1' : fmt1.format(v);   // cuadro de reparto: siempre en km con un decimal
function repartoHtml(){
  const R = repStat(sel, selCol);
  const amb = selCol!==null? 'colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
  const fila = (lab, a, g, cls, sw) => `<tr${cls? ' class="'+cls+'"':''}><th scope="row">${sw!==undefined? `<i style="background:var(--p${sw})"></i>`:''}${lab}</th><td>${km1(a)}</td><td>${km1(g)}</td><td>${km1(a+g)}</td></tr>`;
  let h = `<div class="section-title"><h2>Quién atiende · km de frente de manzana</h2><span>${amb}</span></div>
    <table class="reparto"><thead><tr><th scope="col">Prioridad</th><th scope="col">${sel===null? 'Alcaldías':'Alcaldía'}</th><th scope="col">Gobierno Central</th><th scope="col">Total</th></tr></thead><tbody>`;
  for(let p=4;p>=0;p--) h += fila(META.prio[p], R.km[0][p], R.km[1][p], '', p);
  h += fila('Total', sum(R.km[0]), sum(R.km[1]), 'tot');
  h += fila('Universo de intervención <small>Muy Alta, Alta y Media</small>', univ3(R.km[0]), univ3(R.km[1]), 'univ');
  h += fila('<span>de ese universo,</span> sin arbolado', univ3(R.sa[0]), univ3(R.sa[1]), 'sub');
  h += fila('<span>de ese universo,</span> sin arbolado y con banqueta <small>INEGI</small>', univ3(R.sb[0]), univ3(R.sb[1]), 'sub');
  h += `</tbody></table><p class="note">Cifras en kilómetros de frente de manzana: cada lado de la calle frente a una manzana cuenta por separado. No son comparables con los kilómetros de vialidad primaria, que se miden sobre el eje de la vialidad. El universo de intervención reúne las prioridades Muy Alta, Alta y Media; «prioritario» se reserva para Muy Alta y Alta. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación, que debe verificarse en campo. La asignación entre alcaldía y Gobierno Central es preliminar.</p>`;
  return h;
}
function univHtml(fs, vs, amb, ambV){
  const linea = (km, tot, txt) => `<div class="univline"><b>${kmFull(km)}</b><span>${txt} · ${pct(km,tot)}</span></div>`;
  let h='';
  if (fs && sum(fs.km)>0) h += linea(kmUniv(fs), sum(fs.km), `de frente en el universo de intervención (Muy Alta, Alta y Media) ${amb}`);
  if (vs) h += linea(kmUniv(vs), sum(vs.km), `de vialidad primaria en el universo de intervención (Muy Alta, Alta y Media) ${ambV}`);
  return h;
}

// ---------- resumen del ámbito consultado ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0,u:0,nbi:0})); let t=0,p=0,u=0,nbi=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(c.p>=2){ alc[m].u+=pb; u+=pb; } if(c.p>=3){ alc[m].p+=pb; p+=pb; alc[m].nbi+=c.nbi||0; nbi+=c.nbi||0; } }
  return {alc, city:{t,p,u,nbi}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
// Participación de una alcaldía en los km prioritarios de la ciudad. Sustituye al «lugar entre 16 alcaldías»:
// describe dónde se concentra la necesidad sin ordenar a las alcaldías como si fuera una calificación (auditoría H-072).
const partTxt = (i, gc) => pct(kmPrio((gc? VPC.summ : META.summ)[META.muns[i]]), gc? vCityPrioKm : cityPrioKm) + ' de los km prioritarios de la ciudad';
// Las dos alcaldías con más km prioritarios, calculadas de los datos (antes estaban escritas a mano).
const top2Txt = (S, tot) => { const o = META.muns.map((m,i)=>[i, kmPrio(S[m])]).sort((a,b)=>b[1]-a[1]);
  return `${META.munNames[o[0][0]]} y ${META.munNames[o[1][0]]} concentran ${pct(o[0][1]+o[1][1], tot)} de los km prioritarios de la ciudad.`; };
function frSumm(){
  if (selCol!==null){ const s={n:[0,0,0,0,0], km:[0,0,0,0,0]}; for(let i=0;i<N;i++){ if(F.col[i]!==selCol || F.gc[i]) continue; const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; } return s; }
  return sel===null? CITY : META.summ[META.muns[sel]];
}
function kpiHtml(s, opts){
  const tot = sum(s.km); const prio = kmPrio(s); const nprio = opts.nprio;
  return `<div class="kpi"><div class="v">${kmTxt(prio)}<small>${kmUn(prio)}</small></div><div class="l">${opts.l1}</div></div>
    <div class="kpi"><div class="v">${tot? fmt1.format(100*prio/tot):'0'}<small>%</small></div><div class="l">de los ${kmFull(tot)} ${opts.l2}</div></div>
    <div class="kpi"><div class="v">${nprio>=10000? fmt1.format(nprio/1000)+'<small>mil</small>' : fmt.format(nprio)}</div><div class="l">${opts.l3}</div></div>`;
}
function barsHtml(s){ const tot=sum(s.km); const max = Math.max(...s.km, 0.001); return META.prio.map((p,k)=>`
    <div class="lab"><i style="background:var(--p${k})"></i>${p}</div>
    <div class="track"><div class="fill" style="width:${100*s.km[k]/max}%;background:var(--p${k})"></div></div>
    <div class="val">${kmFull(s.km[k])}<small>${pct(s.km[k],tot)}</small></div>`).reverse().join(''); }
function renderSummary(){
  const scopeName = selAv!==null? VPC.nomenclat[selAv] : selCol!==null? META.colonias[selCol].n : sel===null? 'Ciudad de México' : META.munNames[sel];
  $('scope-label').textContent = scopeName;
  const amb = selCol!==null?'de la colonia':sel===null?'de la ciudad':'de la alcaldía';
  const fs = frSumm(); const nprioF = fs.n[3]+fs.n[4];
  const emptyCol = selCol!==null && sum(fs.n)===0;  // colonia sin frentes a cargo de la alcaldía (auditoría I3)
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`de frente prioritario ${amb}<br>(Muy Alta + Alta)`, l2:`de frentes ${amb}`, l3:`frentes prioritarios ${amb}`+(sel!==null && selCol===null? '<br>'+partTxt(sel,false):'')});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV = selAv!==null? (sel===null? 'de la avenida en toda la ciudad' : 'de la avenida dentro de la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`de vialidad primaria prioritaria ${ambV1}<br>(Muy Alta + Alta)`, l2:ambV, l3:`tramos prioritarios ${ambV1}<br>de ${fmt.format(vs.recs.size)} tramos`+(sel!==null && selAv===null? '<br>'+partTxt(sel,true):'')}) : '';
  const pobLine = (()=>{ if (isGC()) return '';
    if (selAv!==null) return '';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · su unidad territorial tiene desarrollo social ${c.ids.toLowerCase()}`:''}</div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><b>${hab(P.p)}</b><span>residen en colonias de prioridad Alta o Muy Alta ${sel===null?'de la ciudad':'de la alcaldía'} · ${pct(P.p,P.t)} de su población<small class="pobnota">Con las colonias de prioridad Media, el universo de intervención reúne ${hab(P.u)} (${pct(P.u,P.t)}). Población residente (Censo 2020); no equivale a población atendida.</small></span></div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = (resp==='both')? '' : pobLine; pb.hidden = !pb.innerHTML; }
  // universo de intervención (Muy Alta, Alta y Media) y cuadro de reparto por responsable
  const ub = $('univbox'); if (ub){ ub.innerHTML = univHtml(resp!=='gc' && !emptyCol? fs : null, (vs && !(resp==='both' && selCol!==null))? vs : null, amb, ambV1); ub.hidden = !ub.innerHTML; }
  if (ub && vs && resp==='gc'){ ub.innerHTML += `<div class="univline eq"><span>${gcFrenteTxt(sel, selAv)}. Los kilómetros de vialidad se miden sobre el eje de la avenida; los de frente, por cada acera. Para comparar o sumar con las alcaldías se usa el kilómetro de frente.</span></div>`; ub.hidden=false; }
  const rp = $('reparto'); if (rp){ rp.hidden = selAv!==null; rp.innerHTML = rp.hidden? '' : repartoHtml(); }
  // resumen compacto sobre el mapa
  const ms = $('mapsum');
  if (ms){
    const tag = selAv!==null? (sel===null? 'Avenida' : 'Avenida en alcaldía') : selCol!==null? 'Colonia' : sel===null? 'Resumen' : 'Alcaldía';
    const dcol = selCol!==null? (META.colonias[selCol].p>=0? T.prio[META.colonias[selCol].p] : null)
      : sel!==null? T.prio[domOf(sel)] : null;
    const P = sel===null? POB.city : POB.alc[sel];
    let stats;
    if (isGC()){
      const t2 = sum(vs.km);
      const scV2 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
      stats = `<div class="st"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios ${scV2}</small></div>
        <div class="st opt"><b>${pct(kmPrio(vs),t2)}</b><small>de ${kmFull(t2)} ${scV2}</small></div>
        <div class="st opt"><b>${fmt.format(vs.recsp.size)}</b><small>tramos prioritarios ${scV2}</small></div>`;
    } else if (resp==='both'){
      // en una colonia no hay cifra de vialidades primarias: se muestra su población en su lugar
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} de frente prioritarios · a cargo de la Alcaldía</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} de vialidad prioritarios · a cargo del Gob. Central</small></div>`}
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    } else if (emptyCol){
      stats = `<div class="st"><b>Sin frentes</b><small>a cargo de la alcaldía en esta colonia</small></div>
        <div class="st opt"><b>${habC(META.colonias[selCol].pob||0)}</b><small>habitantes de la colonia</small></div>`;
    } else {
      const t2 = sum(fs.km);
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios de frente</small></div>
        <div class="st opt"><b>${pct(kmPrio(fs),t2)}</b><small>de ${kmFull(t2)} de frentes ${amb}</small></div>
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    }
    const scopeTxt = (selAv!==null && sel!==null)? `${scopeName} · ${META.munNames[sel]}` : scopeName;
    ms.innerHTML = `<div class="scope"><span>${tag}</span><b>${dcol? `<i style="background:rgb(${dcol[0]},${dcol[1]},${dcol[2]})"></i>`:''}${scopeTxt}</b></div><div class="sep"></div>${stats}`;
  }
  // km por categoría del ámbito consultado, en la leyenda (auditoría M1)
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmFull(ls.km[+e.dataset.k]); });
    $('lg-scope').textContent = resp==='gc' ? `Prioridad · km de vialidad primaria ${ambV1}` : `Prioridad · km de frente ${amb}`; }
  const b2t = $('bars2-title');
  if (resp==='alc'){ $('kpis').innerHTML = kFr; $('kpis').className='kpis'; $('bars').innerHTML = emptyCol? '' : barsHtml(fs); $('bars-title').textContent=`Kilómetros de frente de manzana por prioridad ${amb}`; $('bars2').hidden=true; }
  else if (resp==='gc'){ $('kpis').innerHTML = kVp; $('kpis').className='kpis'; $('bars').innerHTML = barsHtml(vs); $('bars-title').textContent=`Kilómetros de vialidad primaria por prioridad ${ambV1}`; $('bars2').hidden=true; }
  else {
    const ambN = selCol!==null? 'colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
    const ambG = sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
    const avisoCol = selCol!==null? ' · sin desglose por colonia' : '';
    $('kpis').className='kpis dual';
    $('kpis').innerHTML = `<div class="cap">Frentes de manzana · a cargo de la Alcaldía · ${ambN}</div>${kFr}${pobLine? '<div class="cap pob">'+pobLine+'</div>':''}<div class="cap">Vialidades primarias · a cargo del Gobierno Central · ${ambG}${avisoCol}</div>${kVp}`;
    $('bars-title').textContent=`Km por prioridad · frentes de manzana (Alcaldía) · ${ambN}`;
    if(b2t) b2t.textContent=`Km por prioridad · vialidades primarias (Gobierno Central) · ${ambG}${avisoCol}`;
    $('bars').innerHTML = barsHtml(fs); $('bars2').hidden=false; $('bars2-rows').innerHTML = barsHtml(vs); }
  const gcs = sel===null? META.city_gc : META.summ_gc[META.muns[sel]];
  const note = $('bars-note');
  if (resp==='gc'){
    const tot=sum(vs.km);
    note.textContent = sel===null
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. ${top2Txt(VPC.summ, vCityPrioKm)}`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
  } else if (emptyCol){
    note.textContent = EMPTY_MSG;
  } else {
    note.textContent = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. ${top2Txt(META.summ, cityPrioKm)}`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(fs.n[3]+fs.n[4])+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (selCol===null && sinColStat().n? ` ${fmt.format(sinColStat().n)} frentes (${kmFull(sinColStat().km)}) ${sel===null?'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo: se cuentan aquí, pero no aparecen en las consultas por colonia.` : '')
      + (resp==='alc' && selCol===null? ` Además, ${fmt0.format(sum(gcs.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'} (${fmt0.format(kmPrio(gcs))} km prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.` : '');
  }
}

// Listados de la pestaña "Listado": calles dentro de su colonia, avenidas, colonias y alcaldías.
// ---------- índices de calles y avenidas ----------
let streetIdx = null; // Map clave -> {nid, col, idx:[], km, kmp, np, tipos:Set, cols:Set}; clave = calle dentro de su colonia
let sinNombre = {km:0, kmp:0, n:0, np:0};  // frentes sin nombre de vialidad en INEGI dentro del ámbito
function buildStreets(){
  streetIdx = new Map(); sinNombre = {km:0, kmp:0, n:0, np:0};
  for(let i=0;i<N;i++){ if (F.gc[i] || !enAmbito(i)) continue; const nid=F.name[i];
    if (PLACEHOLDER.has(nid)){ const k=F.len[i]/1000; sinNombre.km+=k; sinNombre.n++; if(F.prio[i]>=3){ sinNombre.kmp+=k; sinNombre.np++; } continue; }
    const col=F.col[i]; const key = nid*4096 + col; let s=streetIdx.get(key); if(!s){ s={nid, col, idx:[],km:0,kmp:0,np:0,kp:[0,0,0,0,0],tipos:new Set(),cols:new Set()}; streetIdx.set(key,s); }
    s.idx.push(i); s.km+=F.len[i]/1000; s.kp[F.prio[i]]+=F.len[i]/1000; if(F.prio[i]>=3){ s.kmp+=F.len[i]/1000; s.np++; } s.tipos.add(META.tipos[F.tipo[i]]); if(col) s.cols.add(META.colonias[col].n); }
}
let avIdx = null; // Map nomId -> {idx:[], km, kmp, recs:Set, recsp:Set, nombres:Set, muns:Set, tipos:Set}
function buildAvenues(){
  avIdx = new Map();
  for(let i=0;i<NV;i++){ if (sel!==null && VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=avIdx.get(a); if(!s){ s={idx:[],km:0,kmp:0,recs:new Set(),recsp:new Set(),nombres:new Set(),muns:new Set(),tipos:new Set()}; avIdx.set(a,s); }
    const k=VP.len[i]/1000; s.idx.push(i); s.km+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.nombres.add(VPC.nombres[VP.nombre[i]]); s.muns.add(VP.mun[i]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const NAMES_N = META.names.map(norm);
const AV_N = VPC.nomenclat.map(norm), NOMBRE_N = VPC.nombres.map(norm);
// desglose de una calle por prioridad: una calle reúne frentes de prioridades distintas, por eso no tiene una sola
function desgHtml(s){ const d = dom({km:s.kp}); const partes = []; for(let p=4;p>=0;p--) if (s.kp[p]>0) partes.push(`<span><i style="background:var(--p${p})"></i>${META.prio[p]} ${kmFull(s.kp[p])}</span>`);
  return `<div class="desg" aria-label="Kilómetros de frente de la calle por prioridad">${partes.join('')}</div>${partes.length>1? `<div class="t">Prioridad predominante: ${META.prio[d]} · ${kmFull(s.km)} de frente en total</div>` : ''}`; }
const PLACEHOLDER = new Set(META.names.map((n,i)=>[norm(n),i]).filter(([n])=> n==='' || n==='sin referencia' || n==='sin nombre' || n.startsWith('ninguno') || / ninguno$/.test(n) || n.startsWith('manzana o edificacion')).map(x=>x[1]));
// Nombre de un frente, igual en tarjeta, listados, Mi ubicación, Excel y fichas (auditoría H-008): los nombres genéricos de INEGI
// («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua» y variantes como «Privada Ninguno») no son nombres de calle.
const SIN_NOMBRE = 'Frente sin nombre de calle (INEGI)';
const sinNombreFr = i => PLACEHOLDER.has(F.name[i]) || !META.names[F.name[i]];
const nomFrente = i => sinNombreFr(i)? SIN_NOMBRE : META.names[F.name[i]];
// frentes de alcaldía sin colonia asignada (auditoría H-028): no aparecen en ninguna consulta por colonia
const SINCOL = (()=>{ const a = META.muns.map(()=>({n:0, km:0, kmp:0})); for(let i=0;i<N;i++){ if (F.col[i] || F.gc[i]) continue; const s=a[F.mun[i]], k=F.len[i]/1000; s.n++; s.km+=k; if (F.prio[i]>=3) s.kmp+=k; } return a; })();
const sinColStat = () => sel!==null? SINCOL[sel] : SINCOL.reduce((t,s)=>({n:t.n+s.n, km:t.km+s.km, kmp:t.kmp+s.kmp}), {n:0,km:0,kmp:0});
function renderAlcRanking(){
  const items = META.muns.map((m,i)=>i).sort((a,b)=> rankOf(a)-rankOf(b));
  $('search-title').textContent = isGC()? 'Alcaldías ordenadas por km prioritarios de vialidad primaria' : 'Alcaldías ordenadas por km de frente prioritario'; $('search-count').textContent='16 alcaldías de la ciudad';
  const ul=$('results'); ul.innerHTML='';
  for(const i of items){ const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${dot(pc)}${META.munNames[i]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${pct(kmPrio(s),tot)} de ${isGC()? 'sus km de vialidad primaria':'sus km de frente'} es prioritario</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${isGC()? fmt.format(VP_RECS[i].rp.size)+' de '+fmt.format(VP_RECS[i].r.size)+' tramos prioritarios' : fmt.format(s.n[3]+s.n[4])+' frentes prioritarios'} en la alcaldía</small></div>`;
    const go=()=>{ selEl.value=String(i); setSel(String(i)); }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
function renderColoniaRanking(){
  const m = sel===null? null : META.muns[sel]; const items=[];
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); }
  items.sort((a,b)=> b[1].kmp-a[1].kmp);
  $('search-title').textContent = `Colonias con más km de frente prioritario ${sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel]}`; $('search-count').textContent = `${fmt.format(items.length)} colonia${items.length===1?'':'s'} con frente prioritario`;
  const ul=$('results'); ul.innerHTML='';
  for(const [i,s] of items.slice(0,10)){ const c=META.colonias[i]; const pc=c.p>=0? T.prio[c.p]:null; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${pc? dot(pc):''}${c.n}</div><div class="t">${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.ids? ' · Unidad territorial con desarrollo social '+c.ids.toLowerCase():''}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes de la colonia son prioritarios</small></div>`;
    const go=()=>pickColonia(i); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if(!items.length) ul.innerHTML='<li class="empty">Este ámbito no tiene colonias con frente prioritario.</li>';
  { const sc = sinColStat(); if (sc.n){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${fmt.format(sc.n)} frentes (${kmFull(sc.km)}; ${kmFull(sc.kmp)} prioritarios) ${sel===null? 'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo y no aparecen en las consultas por colonia. Sí se cuentan en las cifras de la alcaldía y en su Excel de frentes.`; ul.appendChild(li); } }
}
function renderAvenueByAlc(){
  // avenida seleccionada: desglose por alcaldía
  const per = new Map();
  for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); }
  const items=[...per.entries()].sort((a,b)=> kmPrio(b[1])-kmPrio(a[1]));
  $('search-title').textContent=`Tramos de ${VPC.nomenclat[selAv]} por alcaldía`; $('search-count').textContent=`cruza ${items.length} alcaldía${items.length===1?'':'s'}`;
  const ul=$('results'); ul.innerHTML='';
  for(const [m,s] of items){ const d=dom(s); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${dot(pc)}${META.munNames[m]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${fmt1.format(sum(s.km))} km de la avenida en esta alcaldía</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${s.recsp.size} de ${s.recs.size} tramos prioritarios aquí</small></div>`;
    const go=()=>{ if(sel!==m){ selEl.value=String(m); sel=m; refresh(); } }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
// ---------- ubicar una calle cuyo nombre se repite ----------
// Sin alcaldía ni colonia elegidas, un nombre que existe en varias colonias no se responde con cifras:
// primero se pregunta dónde (alcaldías con ese nombre y renglones que solo dicen la colonia y la alcaldía).
let COL_N = null; const colN = c => { if(!COL_N) COL_N = META.colonias.map(x=>norm(x.n||'')); return COL_N[c] || ''; };
const MUN_N = META.munNames.map(norm);
// la búsqueda acepta además la colonia o la alcaldía: «ayuntamiento centro», «reforma iztapalapa»
function calleCoincide(s, q){ const nm = NAMES_N[s.nid]; if (nm.includes(q)) return true;
  const ts = q.split(/\s+/).filter(Boolean); if (ts.length<2) return false; const ctx = colN(s.col)+' '+MUN_N[F.mun[s.idx[0]]];
  let enNombre = 0; for (const t of ts){ if (nm.includes(t)) enNombre++; else if (!ctx.includes(t)) return false; } return enNombre>0; }
function fijaAlcaldia(m){ selEl.value = m===null? '' : String(m); sel=m; selCol=null; selAv=null; highlight=null; hideCard(); refresh(); }
function locChips(html){ const b=$('locchips'); if(!b) return; b.innerHTML = html||''; b.hidden = !html;
  b.querySelectorAll('button').forEach(x=>{ x.onclick = ()=> fijaAlcaldia(x.dataset.m===''? null : +x.dataset.m); }); }
function renderUbicar(items, qRaw){
  const ul=$('results'); const uno = new Set(items.map(x=>x[1].nid)).size===1;
  $('search-title').textContent = uno? `${fmt.format(items.length)} calles se llaman ${META.names[items[0][1].nid]}` : `${fmt.format(items.length)} calles coinciden con «${qRaw}»`;
  $('search-count').textContent = 'Elige la alcaldía o la colonia';
  const porMun = new Map(); for (const [,s] of items){ const m=F.mun[s.idx[0]]; porMun.set(m, (porMun.get(m)||0)+1); }
  locChips('<span class="lc-cap">¿En qué alcaldía?</span>' + [...porMun.entries()].sort((a,b)=>META.munNames[a[0]].localeCompare(META.munNames[b[0]],'es')).map(([m,n])=>`<button type="button" class="lchip" data-m="${m}">${META.munNames[m]} <b>${n}</b></button>`).join(''));
  // orden por ubicación: con Mi ubicación, la más cercana primero; si no, por alcaldía y colonia
  const c0 = myPos? Math.cos(myPos.lat*Math.PI/180) : 0;
  const dist = s => { let d=Infinity; for (const i of s.idx){ const dd=Math.hypot((midLon(i)-myPos.lon)*111320*c0, (midLat(i)-myPos.lat)*110540); if(dd<d) d=dd; } return d; };
  const filas = items.map(([key,s])=>({key, s, m:F.mun[s.idx[0]], col: s.col? META.colonias[s.col].n : 'Colonia no identificada', d: myPos? dist(s) : 0}));
  filas.sort((a,b)=> myPos? a.d-b.d : (META.munNames[a.m].localeCompare(META.munNames[b.m],'es') || a.col.localeCompare(b.col,'es') || (META.names[a.s.nid]||'').localeCompare(META.names[b.s.nid]||'','es')));
  const MAXF = 40;
  for (const f of filas.slice(0, MAXF)){ const li=document.createElement('li'); li.tabIndex=0; li.className='ubica';
    const tl=[...f.s.tipos].filter(Boolean).slice(0,2).join(', ');
    li.innerHTML = `<div><div class="n">${META.names[f.s.nid]||'Sin nombre'}</div><div class="t">${f.col} · ${META.munNames[f.m]}${tl? ' · '+tl : ''}</div></div><div class="k"><small>${myPos? 'a '+distTxt(f.d) : ''}</small></div>`;
    // al elegir, la consulta queda en la alcaldía de la calle y la calle resaltada
    const go = ()=>{ selEl.value=String(f.m); sel=f.m; selCol=null; selAv=null; highlight=null; hideCard(); keepView=true; refresh(); keepView=false;
      const st=streetIdx.get(f.key); if (st){ highlightStreet(f.key, st); renderResults(); } };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if (filas.length>MAXF){ const li=document.createElement('li'); li.className='empty'; li.textContent=`Se muestran ${MAXF} de ${fmt.format(filas.length)}. Elige una alcaldía para acotar la lista.`; ul.appendChild(li); }
}
function renderResults(){
  const q = norm($('q').value.trim()); locChips('');
  if (alcOnly() && sel===null && q.length<2){ renderAlcRanking(); return; }
  if (colOnly() && selCol===null && q.length<2){ renderColoniaRanking(); return; }
  if (isGC() && selAv!==null && q.length<2){ renderAvenueByAlc(); return; }
  const ul = $('results'); ul.innerHTML='';
  if (isGC()){
    let items=[];
    const scV = sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
    if (q.length<2 && sel===null && selAv===null){ $('search-title').textContent='Buscar una avenida'; $('search-count').textContent=''; ul.innerHTML='<li class="empty">Elige una alcaldía arriba para ver sus avenidas con más km prioritarios, o escribe el nombre de una avenida para consultarla en toda la ciudad.</li>'; return; }
    if (q.length>=2){ for(const [a,s] of avIdx){ if (AV_N[a].includes(q) || [...s.nombres].some(n=>norm(n).includes(q))) items.push([a,s]); } $('search-title').textContent=`Avenidas encontradas ${scV}`; }
    else { for(const [a,s] of avIdx){ if(s.kmp>0) items.push([a,s]); } $('search-title').textContent=`Avenidas con más km prioritarios ${scV}`; }
    items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
    const total=items.length; items = items.slice(0, q.length>=2? 40 : 10);
    $('search-count').textContent = `${fmt.format(total)} avenida${total===1?'':'s'}${q.length>=2?'':' con km prioritarios'}`;
    if(!items.length){ ul.innerHTML = q.length>=2? `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>` : '<li class="empty">Este ámbito no tiene avenidas con kilómetros prioritarios (Muy Alta o Alta).</li>'; return; }
    for(const [a,s] of items){ const li=document.createElement('li'); li.tabIndex=0; const nb=[...s.nombres]; const ms=[...s.muns];
      li.innerHTML = `<div><div class="n">${VPC.nomenclat[a]}</div><div class="t">${nb.slice(0,2).join(', ')}${nb.length>2?' +'+(nb.length-2):''}${sel===null? ' · '+ms.slice(0,2).map(m=>META.munNames[m]).join(', ')+(ms.length>2?' +'+(ms.length-2):''):''}</div></div>
        <div class="k">${kmFull(s.kmp)}<small>${s.recsp.size} de ${s.recs.size} tramos de la avenida son prioritarios</small></div>`;
      if (selAv===a) li.classList.add('active');
      const go=()=>pickAvenida(a); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
    return;
  }
  let items = [];
  const scF = selCol!==null? 'en la colonia '+META.colonias[selCol].n : sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
  if (q.length<2 && sel===null && selCol===null){ $('search-title').textContent='Buscar una calle'; $('search-count').textContent=''; ul.innerHTML='<li class="empty">Elige una alcaldía o una colonia arriba para ver sus calles con más frente prioritario, o escribe el nombre de una calle para consultarla en toda la ciudad.</li>'; return; }
  if (q.length>=2){ for(const [key,s] of streetIdx){ if (calleCoincide(s, q)) items.push([key,s]); } $('search-title').textContent=`Calles encontradas ${scF}`;
    if (sel===null && selCol===null && new Set(items.map(x=>x[1].col)).size>1){ renderUbicar(items, $('q').value.trim()); return; }
    if (sel!==null && selCol===null) locChips(`<button type="button" class="lchip" data-m="">Buscar «${$('q').value.trim().replace(/[<>&"]/g,'')}» en otra alcaldía</button>`); }
  else { for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } $('search-title').textContent=`Calles con más km de frente prioritario ${scF}`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length; items = items.slice(0, q.length>=2? 40 : 10);
  $('search-count').textContent = selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q.length>=2?'':' con frente prioritario'}`
    : q.length>=2 ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  if(!items.length){ ul.innerHTML = q.length>=2? `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>` : '<li class="empty">Este ámbito no tiene calles con frente prioritario (Muy Alta o Alta).</li>'; return; }
  for(const [key,s] of items){
    const li = document.createElement('li'); li.tabIndex=0;
    const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    li.innerHTML = `<div><div class="n">${META.names[s.nid]||'Sin nombre'}</div><div class="t">${donde? donde+' · ':''}${tipos}</div>${desgHtml(s)}</div>
      <div class="k">${kmFull(s.kmp)}<small>${s.np} de ${s.idx.length} frentes prioritarios</small></div>`;
    if (highlight && highlight.nameId===key) li.classList.add('active');
    const go = ()=>{ highlightStreet(key, s); [...ul.children].forEach(x=>x.classList.remove('active')); li.classList.add('active'); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter'){ go(); } };
    ul.appendChild(li);
  }
  if (q.length<2 && sinNombre.kmp>0){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI ("Ninguno" o "Manzana o edificación contigua"). No aparecen en esta lista, pero sí en el Excel de frentes.`; ul.appendChild(li); }
}
// calle consultada en la red de las alcaldías (la resaltada): nombre y frentes; null si no hay
function calleSel(){ if (!highlight || highlight.avId!==undefined || isGC() || !highlight.idx.length) return null;
  if (callesHomonimas()) return null; // un nombre repetido no es una calle: se elige una en la lista
  return {nombre: META.names[F.name[highlight.idx[0]]] || 'Calle sin nombre', idx: highlight.idx}; }
// número de colonias distintas entre los frentes resaltados cuando el resaltado reúne calles homónimas; 0 si es una sola calle
function callesHomonimas(){ if (!highlight || highlight.avId!==undefined || !highlight.idx || !highlight.idx.length) return 0;
  const cols = new Set(); for (const i of highlight.idx) cols.add(F.col[i]); return cols.size>1 ? cols.size : 0; }
function highlightStreet(nid, s){
  highlight = {nameId:nid, idx:s.idx};
  let w=180,sN=90,e=-180,n=-90; for(const i of s.idx){ for(let k=start[i];k<start[i+1];k++){ const x=POS[2*k],y=POS[2*k+1]; if(x<w)w=x; if(x>e)e=x; if(y<sN)sN=y; if(y>n)n=y; } }
  const pad = 0.0015; const vs = fitTo([w-pad,sN-pad,e+pad,n+pad], 60); vs.zoom = Math.min(vs.zoom, 16.5);
  hideCard(); collapseSheet(); flyTo(vs, 1000); rerender(); renderActions(); syncCalleBtns();
}
$('q').addEventListener('input', renderResults);

// Tramos de una calle de la red de las alcaldías: agrupa los frentes de manzana de la calle consultada en tramos
// (de esquina a esquina, con sus dos lados) y nombra las vialidades que los delimitan. Se calcula al consultar la calle,
// a partir de la geometría de los frentes; no cambia los datos ni el catálogo.
// Regla: dos frentes de la misma calle forman un tramo cuando son casi paralelos (≤ 30°), están en lados opuestos
// a no más de TR_ANCHO metros y se traslapan a lo largo de la calle. Es una aproximación geométrica: se verifica en campo.
const TR_ANCHO = 45, TR_COS = Math.cos(30*Math.PI/180), TR_ESQ = 28;
const trXY = (k, c) => [POS[2*k]*111320*c, POS[2*k+1]*110540];   // grados → metros (proyección local)
function trFrente(i, c){ const a = trXY(start[i], c), b = trXY(start[i+1]-1, c); let dx=b[0]-a[0], dy=b[1]-a[1]; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
  return {i, a, b, m:[(a[0]+b[0])/2,(a[1]+b[1])/2], d:[dx,dy], L}; }
// índice espacial de extremos de todos los frentes (se arma una sola vez, la primera vez que se consulta una calle)
let TR_GRID = null; const TR_CELL = 0.0005;
function trGrid(){ if (TR_GRID) return TR_GRID; TR_GRID = new Map();
  const put = (k, i) => { const key = Math.floor(POS[2*k]/TR_CELL)*100000 + Math.floor(POS[2*k+1]/TR_CELL); let a = TR_GRID.get(key); if(!a){ a=[]; TR_GRID.set(key,a); } a.push(i); };
  for(let i=0;i<N;i++){ put(start[i], i); put(start[i+1]-1, i); } return TR_GRID; }
// nombre de la vialidad que cruza cerca de un punto (en metros), distinta de la calle consultada y no paralela a ella
function trCruce(pt, c, nid, d){ const G = trGrid(); const lon = pt[0]/(111320*c), lat = pt[1]/110540; const cx=Math.floor(lon/TR_CELL), cy=Math.floor(lat/TR_CELL);
  let best=null, bd=TR_ESQ;
  for(let x=cx-1;x<=cx+1;x++) for(let y=cy-1;y<=cy+1;y++){ const a = G.get(x*100000+y); if(!a) continue;
    for(const j of a){ const nj=F.name[j]; if (nj===nid || PLACEHOLDER.has(nj) || !META.names[nj]) continue; const f = trFrente(j, c);
      if (Math.abs(f.d[0]*d[0]+f.d[1]*d[1]) > TR_COS) continue;
      const dist = Math.min(Math.hypot(f.a[0]-pt[0], f.a[1]-pt[1]), Math.hypot(f.b[0]-pt[0], f.b[1]-pt[1])); if (dist<bd){ bd=dist; best=nj; } } }
  return best; }
// tramos de una calle: recibe los índices de sus frentes y devuelve [{n, idx, m, lados, km:[5], entre:[a,b], bounds}] ordenados a lo largo de la calle
function tramosDeCalle(idx){
  if (!idx.length) return [];
  const c = Math.cos(POS[2*start[idx[0]]+1]*Math.PI/180); const fr = idx.map(i=>trFrente(i, c)); const n = fr.length;
  const par = fr.map((_,k)=>k); const find = k => { while(par[k]!==k){ par[k]=par[par[k]]; k=par[k]; } return k; };
  for(let p=0;p<n;p++) for(let q=p+1;q<n;q++){ const A=fr[p], B=fr[q];
    if (Math.abs(A.d[0]*B.d[0]+A.d[1]*B.d[1]) < TR_COS) continue;
    const rx=B.m[0]-A.m[0], ry=B.m[1]-A.m[1]; const perp = Math.abs(rx*A.d[1]-ry*A.d[0]); if (perp > TR_ANCHO || perp < 2) continue;
    // traslape de B sobre el eje de A
    const t1=(B.a[0]-A.a[0])*A.d[0]+(B.a[1]-A.a[1])*A.d[1], t2=(B.b[0]-A.a[0])*A.d[0]+(B.b[1]-A.a[1])*A.d[1];
    const ov = Math.min(A.L, Math.max(t1,t2)) - Math.max(0, Math.min(t1,t2)); if (ov < Math.min(15, 0.3*Math.min(A.L,B.L))) continue;
    par[find(p)] = find(q); }
  const grupos = new Map(); fr.forEach((f,k)=>{ const r=find(k); let g=grupos.get(r); if(!g){ g=[]; grupos.set(r,g); } g.push(f); });
  // eje general de la calle: de los dos puntos medios más alejados entre sí
  let e0=fr[0].m, e1=fr[0].m, dm=-1; for(const A of fr) for(const B of fr){ const dd=Math.hypot(A.m[0]-B.m[0],A.m[1]-B.m[1]); if(dd>dm){ dm=dd; e0=A.m; e1=B.m; } }
  let ex=e1[0]-e0[0], ey=e1[1]-e0[1]; const el=Math.hypot(ex,ey)||1; ex/=el; ey/=el; if (el<2){ ex=fr[0].d[0]; ey=fr[0].d[1]; }
  const nid = F.name[idx[0]]; const out=[];
  for(const g of grupos.values()){
    // eje del tramo: el del frente más largo; extremos del tramo sobre ese eje
    const ref = g.reduce((a,b)=> b.L>a.L? b : a, g[0]); let tmin=Infinity, tmax=-Infinity, pmin=null, pmax=null; const lado = new Set(); const km=[0,0,0,0,0]; let m=0;
    for(const f of g){ for(const p of [f.a,f.b]){ const t=(p[0]-ref.a[0])*ref.d[0]+(p[1]-ref.a[1])*ref.d[1]; if(t<tmin){ tmin=t; pmin=p; } if(t>tmax){ tmax=t; pmax=p; } }
      const s=(f.m[0]-ref.m[0])*ref.d[1]-(f.m[1]-ref.m[1])*ref.d[0]; lado.add(Math.abs(s)<2? 0 : s>0? 1 : -1); km[F.prio[f.i]]+=F.len[f.i]/1000; m+=F.len[f.i]; }
    const lados = (lado.has(1) && lado.has(-1)) || (lado.has(0) && (lado.has(1)||lado.has(-1))) ? 2 : 1;
    let w=180,s=90,e=-180,nn=-90; for(const f of g){ for(let k=start[f.i];k<start[f.i+1];k++){ const x=POS[2*k],y=POS[2*k+1]; if(x<w)w=x; if(x>e)e=x; if(y<s)s=y; if(y>nn)nn=y; } }
    const cm = g.reduce((a,f)=>[a[0]+f.m[0]/g.length, a[1]+f.m[1]/g.length],[0,0]);
    let ca = trCruce(pmin, c, nid, ref.d), cb = trCruce(pmax, c, nid, ref.d);
    const pos = cm[0]*ex+cm[1]*ey; if ((pmax[0]-pmin[0])*ex+(pmax[1]-pmin[1])*ey < 0){ const t=ca; ca=cb; cb=t; }
    out.push({idx:g.map(f=>f.i), m, largo:Math.round(tmax-tmin), lados, km, entre:[ca,cb], bounds:[w,s,e,nn], pos}); }
  out.sort((a,b)=>a.pos-b.pos); out.forEach((t,k)=>{ t.n=k+1; }); return out;
}
// texto «entre A y B» de un tramo
function entreTxt(t){ const a = t.entre[0]!==null? META.names[t.entre[0]] : null, b = t.entre[1]!==null? META.names[t.entre[1]] : null;
  return a && b? (a===b? `a la altura de ${a}` : `entre ${a} y ${b}`) : (a||b)? `desde ${a||b}` : 'sin cruce identificado'; }
let TR_SEL = null;   // tramos de la calle consultada: {key, lista}
function tramosSel(){ const c = calleSel(); if (!c){ TR_SEL=null; return null; } const key = highlight.nameId; if (!TR_SEL || TR_SEL.key!==key) TR_SEL = {key, lista:tramosDeCalle(c.idx)}; return TR_SEL.lista; }
// número de tramo de cada frente de la calle consultada (para el Excel)
function tramoDeFrente(){ const m = new Map(); const l = tramosSel(); if (l) for(const t of l) for(const i of t.idx) m.set(i, t); return m; }
function renderTramos(){
  const box = $('tramos'); if (!box) return; const c = calleSel(); const l = c && !isGC()? tramosSel() : null;
  if (!l){ box.hidden = true; box.innerHTML=''; return; }
  const d = dom({km:l.reduce((a,t)=>a.map((v,k)=>v+t.km[k]),[0,0,0,0,0])});
  box.hidden = false;
  box.innerHTML = `<div class="section-title"><h2>Tramos de ${c.nombre}</h2><span>${l.length} tramo${l.length===1?'':'s'} · predominante ${META.prio[d]}</span></div>
    <ol class="tramos">${l.map(t=>{ const pd = dom({km:t.km}); const partes=[]; for(let p=4;p>=0;p--) if(t.km[p]>0) partes.push(`<span><i style="background:var(--p${p})"></i>${META.prio[p]} ${kmFull(t.km[p])}</span>`);
      return `<li tabindex="0" data-t="${t.n-1}"><b>${t.n}</b><div><div class="n">${entreTxt(t)}</div><div class="desg">${partes.join('')}</div><div class="t">${fmt.format(t.largo)} m de calle · ${t.lados===2? 'dos lados' : 'un lado'} · ${t.idx.length} frente${t.idx.length===1?'':'s'}${partes.length>1? ' · predominante '+META.prio[pd] : ''}</div></div></li>`; }).join('')}</ol>
    <p class="note">Un tramo va de esquina a esquina y reúne los frentes de sus dos lados. Se arma con una regla geométrica a partir de los frentes de manzana; las vialidades que lo delimitan son las más cercanas a sus extremos y deben confirmarse en campo. Selecciona un tramo para ubicarlo en el mapa.</p>`;
  box.querySelectorAll('li').forEach(li=>{ const go=()=>{ const t=l[+li.dataset.t]; const pad=0.0008; const vs=fitTo([t.bounds[0]-pad,t.bounds[1]-pad,t.bounds[2]+pad,t.bounds[3]+pad], 60); vs.zoom=Math.min(vs.zoom, 17.5);
      box.querySelectorAll('li').forEach(x=>x.classList.remove('active')); li.classList.add('active'); collapseSheet(); flyTo(vs, 800); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; });
}

// Selección de alcaldía, colonia y avenida, y refresh(): recalcula colores, cifras y listados del ámbito.
// ---------- selección de alcaldía y refresh() ----------
const selEl = $('alc');
META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const o=document.createElement('option'); o.value=i; o.textContent=META.munNames[i]; selEl.appendChild(o); });
function renderAlcInfo(){
  const box=$('alcinfo'); if (sel===null){ box.hidden=true; return; }
  const s=summOf(sel); const tot=sum(s.km); const d=domOf(sel); const pc=T.prio[d];
  const gcs = META.summ_gc[META.muns[sel]]; const vs = VPC.summ[META.muns[sel]];
  box.hidden=false; box.innerHTML = isGC()
    ? `${dot(pc)}<b>Vialidades primarias · prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los km de vialidad primaria de la alcaldía)<br>${partTxt(sel,true)} · ${fmt0.format(tot)} km de vialidad primaria en toda la alcaldía`
    : `${dot(pc)}<b>Prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los km de frente de la alcaldía)<br>${partTxt(sel,false)} · ${fmt0.format(tot)} km de frentes en toda la alcaldía${resp==='alc'? `<br><span class="gcline">Gobierno Central atiende en esta alcaldía ${fmt0.format(sum(vs.km))} km de vialidades primarias medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); en frentes de manzana son ${fmt0.format(sum(gcs.km))} km.</span>`:''}`;
}
function renderColInfo(){
  const box = $('colinfo'); if (selCol===null){ box.hidden=true; return; }
  const c = META.colonias[selCol]; const pc = c.p>=0? T.prio[c.p] : null;
  box.hidden=false; box.innerHTML = `${pc? dot(pc):''}<b>Prioridad de la colonia: ${c.p>=0? META.prio[c.p] : '—'}</b><br>Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' hab.':''}${c.ut? `<br><span class="utline">Unidad territorial ${c.ut}: ${fmt.format(c.utpob||0)} hab., ${fmt.format(c.nbi||0)} en pobreza (NBI)</span>`:''}`;
}
function renderAvInfo(){
  const box=$('avinfo'); if (selAv===null){ box.hidden=true; return; }
  const s=avStat(selAv); const d=dom({km:s.kmByP}); const pc=T.prio[d];
  const vsA = vpSumm(); const kmA = sum(vsA.km), kmpA = kmPrio(vsA);
  box.hidden=false; box.innerHTML = `${dot(pc)}<b>Prioridad predominante de la avenida: ${META.prio[d]}</b> (${pct(s.kmByP[d], s.km)} de los km de la avenida en toda la ciudad)<br>Red vial: ${[...s.nombres].join(', ')} · ${fmt1.format(s.km)} km de la avenida en toda la ciudad · Cruza: ${[...s.muns].map(m=>META.munNames[m]).join(', ')}${sel!==null? `<br><span class="gcline">Las cifras de abajo son solo del tramo en la alcaldía ${META.munNames[sel]}: ${kmFull(kmA)} de esta avenida, ${kmFull(kmpA)} prioritarios${kmpA===0? ' (ningún tramo de esta avenida en la alcaldía resultó Muy Alta o Alta)':''}.</span>`:''}${avGruposTxt(selAv)? `<br><span class="gcline">${avGruposTxt(selAv)}; elige una alcaldía para consultar una sola.</span>`:''}`;
}
let keepView = false;
function refresh(){ buildColors(); buildVP(); buildStreets(); buildAvenues(); renderSummary(); renderResults(); renderAlcInfo(); renderColInfo(); renderAvInfo(); renderLegendNote(); rerender(); if (!keepView) flyTo(scopeView());
  const gc = isGC();
  $('dl-frentes').hidden = !respOn.alc; $('dl-calles').hidden = !respOn.alc; $('dl-tramos').hidden = !respOn.gc; $('dl-avenidas').hidden = !respOn.gc;
  // sin registros que entregar: el botón se deshabilita y se dice por qué, en lugar de entregar un archivo vacío (auditoría H-043)
  const fsD = (respOn.alc && sel!==null)? frSumm() : null; const nFrD = fsD? sum(fsD.n) : 1, nPrD = fsD? fsD.n[3]+fsD.n[4] : 1;
  const nTrD = respOn.gc? vpSumm().recsp.size : 1;
  $('dl-frentes').disabled = $('dl-calles').disabled = (sel===null || nPrD===0);
  $('dl-ficha').disabled = nFrD===0; $('dl-tramos').disabled = nTrD===0;
  $('dl-status').textContent = (respOn.alc && sel===null)? 'Selecciona una alcaldía para descargar su listado.'
    : nFrD===0? 'Este ámbito no tiene frentes de manzana a cargo de la alcaldía: no hay listado ni ficha que descargar.'
    : nPrD===0? 'Este ámbito no tiene frentes de prioridad Muy Alta o Alta: el listado de frentes prioritarios estaría vacío.'
    : nTrD===0? 'Este ámbito no tiene tramos de vialidad primaria de prioridad Muy Alta o Alta: el listado de tramos prioritarios estaría vacío.' : '';
  $('dl-ficha').hidden = !(respOn.alc && selCol!==null); $('dl-ficha-alc').hidden = !(respOn.alc && sel!==null && selCol===null);
  $('dl-ficha-vpalc').hidden = !(respOn.gc && sel!==null && selAv===null); $('dl-ficha-av').hidden = !(gc && selAv!==null);  renderCrumb(); renderScopeTitle(); updTabLabel(); renderActions(); syncCalleBtns(); }
function syncCalleBtns(){ renderTramos(); renderCrumb(); const c = calleSel(); $('dl-calle').hidden = !c; $('dl-ficha-calle').hidden = !c;
  const h = callesHomonimas(); if (h && !isGC()) $('dl-status').textContent = `Hay calles con este nombre en ${fmt.format(h)} colonias. Elige una en la lista para descargar su Excel o su ficha.`; }
function setSel(v){
  sel = v===''? null : +v; selCol=null; selAv=null; highlight=null; hideCard(); $('q').value='';
  collapseSheet(); refresh();
}
// ---------- selección de colonia y avenida (la búsqueda está en el buscador único, más abajo) ----------
// el catálogo de colonias trae abreviaturas (Pgal, Sto, Ampl…); el buscador las expande
const ABREV = {pgal:'pedregal', sto:'santo', sta:'santa', ampl:'ampliacion', ampliacion:'ampliacion', secc:'seccion', ote:'oriente', pte:'poniente', nte:'norte', gral:'general', prol:'prolongacion', fracc:'fraccionamiento', cjto:'conjunto', uh:'unidad habitacional', bo:'barrio', pblo:'pueblo'};
function pickColonia(id){
  if (isGC()) setResp('alc');
  const c = META.colonias[id]; const m = munIndex[c.m];
  if (sel!==m){ sel=m; selEl.value=String(m); }
  selCol=id; selAv=null; highlight=null; hideCard(); $('q').value=''; if (isPhone() && !showFrB) setLayer('fr', true); collapseSheet(); refresh(); showCard('col', id);
}
function clearColonia(){ if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } }
function pickAvenida(a){
  if (!isGC()) setResp('gc');
  selAv=a; selCol=null; hideCard(); $('q').value='';
  const s=avStat(a); highlight={avId:a, idx:s.idx}; collapseSheet(); refresh();
}
function clearAvenida(){ if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } }
selEl.onchange = e=> setSel(e.target.value);
$('n-total').textContent = `${fmt.format(N)} frentes de manzana y ${fmt.format(VPC.cov.registros)} tramos de vialidad primaria (${fmt0.format(VPC.cov.km_total)} km).`;
$('ver-line').textContent = VERSION_TXT + '.';

// Descargas: CSV y Excel (SheetJS bajo demanda) con diccionario de datos.
// ---------- descargas ----------
let downloads; try { downloads = await claude.use('downloads'); } catch(e){ downloads = null; }
function csvEsc(v){ v=String(v??''); return /[",\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
// fecha AAAAMMDD en el nombre de cada archivo entregado (auditoría H-088)
const conFecha = name => { const d=new Date(), f=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return name.replace(/(\.[a-z0-9]+)$/i, `_${f}$1`); };
async function deliver(filename, text){ filename = conFecha(filename);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const blob = new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'});
  if (downloads){
    try{ await downloads.save({filename, data:blob}); st.textContent = `Guardado: ${filename}`; }
    catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  st.textContent = `Descargado: ${filename}`;
}
async function deliverBlob(filename, blob){ if (!/_\d{8}\.[a-z0-9]+$/i.test(filename)) filename = conFecha(filename);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  if (downloads){ try{ await downloads.save({filename, data:blob}); st.textContent=`Guardado: ${filename}`; } catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
// las descargas de vialidades primarias no se filtran por colonia: su nombre y su ámbito tampoco la declaran
const scopeSlugVP = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(META.colonias[selCol].n) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = clases Muy Alta y Alta de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas de las alcaldías. ' + PRELIM_TXT,
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), del punto a media longitud del frente o del tramo, medido sobre su línea (no el promedio de sus extremos).',
  'Cobertura: la herramienta incluye los frentes de manzana del ámbito urbano de INEGI. Algunos frentes no tienen colonia asignada en el catálogo: se cuentan en las cifras de su alcaldía y en su Excel de frentes, pero no en las consultas por colonia.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  `La meta de vialidades primarias se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red completa, incluidos los tramos sin manzanas al frente.`,
  'Dos unidades: las vialidades primarias del Gobierno Central se reportan en kilómetros de vialidad, medidos sobre el eje de la avenida; la red de las alcaldías, en kilómetros de frente de manzana, una medida por cada acera. Para comparar o sumar lo que atiende cada quien se usa siempre el kilómetro de frente.',
  'Los kilómetros prioritarios describen dónde es mayor la necesidad de arbolado según el modelo; no son una meta ni una obligación de plantación.',
  'Universo de intervención = clases Muy Alta, Alta y Media. Se reporta en kilómetros de frente de manzana (cada lado de la calle frente a una manzana cuenta por separado), que no son comparables con los kilómetros de vialidad primaria medidos sobre el eje. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación.',
  'El Índice de Desarrollo Social y la población en pobreza corresponden a la unidad territorial de EVALÚA CDMX en la que se ubica la colonia, no a la colonia; no deben sumarse entre colonias.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.';
const DIC = {
  frentes: { titulo:'Frentes de manzana prioritarios', contenido:'Un renglón por frente de manzana con prioridad Muy Alta o Alta a cargo de la alcaldía.',
    cols:[10,11,30,16,13,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['id_frente','Identificador del frente de manzana en esta versión de los datos (ver «Corte de los datos»). Permite cruzar el renglón con la capa geográfica y detectar duplicados; no cambia mientras no cambie el corte.','Entero'],
      ['prioridad','Clase de prioridad del frente de manzana.','Muy Alta o Alta'],
      ['vialidad','Nombre de la calle a la que da el frente. Cuando INEGI no registra un nombre de calle («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua»), dice «Frente sin nombre de calle (INEGI)».','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['responsable','Orden de gobierno que atiende el frente.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente.','Texto'],
      ['cp','Código postal de la colonia.','5 dígitos'],
      ['prioridad_colonia','Prioridad de la colonia: combinación de calor, rezago social y sombra.','Muy Baja a Muy Alta'],
      ['desarrollo_social_ids','Estrato del Índice de Desarrollo Social de la unidad territorial donde se ubica la colonia (EVALÚA CDMX).','Muy bajo a Muy alto'],
      ['unidad_territorial','Unidad territorial de EVALÚA CDMX de la que provienen el estrato de desarrollo social y la población en pobreza. No coincide necesariamente con los límites de la colonia.','Texto'],
      ['poblacion_colonia','Población total de la colonia (Censo 2020). Vacío si el frente no tiene colonia asignada.','Habitantes'],
      ['poblacion_pobreza_nbi','Población en pobreza por necesidades básicas insatisfechas de la unidad territorial —no de la colonia— (EVALÚA CDMX).','Personas'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['longitud_m','Longitud del frente de manzana.','Metros'],
      ['banqueta_inegi','Disponibilidad de banqueta registrada por INEGI (2020). Es una condición por verificar: no indica ancho, estado ni espacio de plantación.','Dispone, No dispone, Conjunto habitacional, No aplica, No especificado'],
      ['lat','Latitud del punto a media longitud del frente, sobre su línea.','Grados decimales'],
      ['lon','Longitud del punto a media longitud del frente, sobre su línea.','Grados decimales'] ] },
  calle: { titulo:'Frentes de manzana de la calle consultada', contenido:'Un renglón por frente de manzana de la calle consultada, en todas las clases de prioridad, a cargo de la alcaldía. La calle es la de la colonia indicada en el ámbito; las calles con el mismo nombre en otras colonias no se incluyen.',
    cols:[10,11,30,16,13,28,7,16,18,26,14,18,20,11,20,8,44,11,11], campos:null },
  calles: { titulo:'Resumen por calle', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana. Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel de frentes.',
    cols:[30,30,8,22,20,13,15,12,13,11,15,11,24,11],
    campos:[
      ['vialidad','Nombre de la calle.','Texto'],
      ['colonia','Colonia en la que está este tramo de la calle.','Texto'],
      ['cp','Código postal de la colonia.','Texto de 5 dígitos'],
      ['tipos_vialidad','Tipos de vialidad que aparecen en sus tramos.','Texto separado por punto y coma'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['frentes_total','Número de frentes de manzana con ese nombre en el ámbito.','Entero'],
      ['frentes_muy_alta','Frentes con prioridad Muy Alta.','Entero'],
      ['frentes_alta','Frentes con prioridad Alta.','Entero'],
      ['km_muy_alta','Kilómetros de frente con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros de frente con prioridad Alta.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta y Alta.','Kilómetros'],
      ['km_media','Kilómetros de frente con prioridad Media.','Kilómetros'],
      ['km_universo_intervencion','Universo de intervención: suma de Muy Alta, Alta y Media.','Kilómetros'],
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las clases.','Kilómetros'] ] },
  tramos: { titulo:'Tramos prioritarios de vialidades primarias', contenido:'Un renglón por parte de tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta o Alta, a cargo del Gobierno de la Ciudad. Un tramo (id_tramo) ocupa más de un renglón cuando cruza un límite de alcaldía o su trazo tiene varias partes; la herramienta cuenta los tramos por id_tramo, por eso el número de renglones puede ser mayor que el número de tramos que muestra la pantalla. Los kilómetros coinciden.',
    cols:[10,11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['id_tramo','Identificador del tramo en la capa de vialidades primarias. Se repite cuando el tramo ocupa varios renglones.','Entero'],
      ['prioridad','Clase de prioridad del tramo en la capa de vialidades primarias.','Muy Alta o Alta'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave registrada en la capa de vialidades primarias. No identifica al tramo: varios tramos comparten la misma clave.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud de la parte del tramo de este renglón.','Metros'],
      ['responsable','Orden de gobierno que atiende el tramo.','Gobierno Central'],
      ['lat','Latitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'],
      ['lon','Longitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'] ] },
  avenidas: { titulo:'Resumen por avenida', contenido:'Un renglón por avenida o eje, con la suma de sus tramos de vialidad primaria en el ámbito consultado.',
    cols:[30,30,24,34,13,18,13,11,11,11,13,15,11],
    campos:[
      ['vialidad','Nombre en calle de la avenida o eje.','Texto'],
      ['nombres_red_vial','Identificadores de la red vial asociados a esa avenida.','Texto separado por punto y coma'],
      ['tipos','Clasificación de sus tramos.','Vía primaria y/o Vía de acceso controlado'],
      ['alcaldias','Alcaldías que cruza dentro del ámbito consultado.','Texto separado por punto y coma'],
      ['tramos_total','Número de tramos de la avenida en el ámbito.','Entero'],
      ['tramos_prioritarios','Tramos con prioridad Muy Alta o Alta.','Entero'],
      ['km_muy_alta','Kilómetros con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros con prioridad Media.','Kilómetros'],
      ['km_baja','Kilómetros con prioridad Baja.','Kilómetros'],
      ['km_muy_baja','Kilómetros con prioridad Muy Baja.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta y Alta.','Kilómetros'],
      ['km_total','Kilómetros de la avenida en el ámbito.','Kilómetros'] ] }
};
DIC.calle.campos = DIC.frentes.campos.map(f=> f[0]==='prioridad'? ['prioridad','Clase de prioridad del frente de manzana.','Muy Baja a Muy Alta'] : f);
DIC.calle.campos.splice(DIC.calle.campos.findIndex(f=>f[0]==='lat'), 0,
  ['tramo','Número del tramo de la calle al que pertenece el frente. Un tramo va de esquina a esquina y reúne los frentes de sus dos lados; se numera a lo largo de la calle. Se arma con una regla geométrica (frentes casi paralelos, en lados opuestos y traslapados) y debe confirmarse en campo.','Entero'],
  ['tramo_entre','Vialidades más cercanas a los extremos del tramo.','Texto']);
function calleAmbito(c){ const cols=[...new Set(c.idx.map(i=>F.col[i]).filter(Boolean))].map(k=>META.colonias[k].n); const muns=[...new Set(c.idx.map(i=>F.mun[i]))].map(m=>META.munNames[m]);
  return `Calle ${c.nombre} · ${cols.length>4? cols.length+' colonias' : cols.join(', ')} · ${muns.join(', ')}`; }
function ambitoTxt(key){
  const vp = key==='tramos' || key==='avenidas';
  if (selAv!==null && (vp || isGC())) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad');
  if (selCol!==null && !vp) return META.colonias[selCol].n + ' · ' + META.munNames[sel];
  return sel===null? 'Ciudad de México' : META.munNames[sel];
}
function dictAoa(key, nreg, archivo, extra){
  const d = DIC[key];
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const a = [['Calles prioritarias para reforestar — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', (key==='calle' && calleSel())? calleAmbito(calleSel()) : ambitoTxt(key)],
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ...(extra||[]), ['Fecha de generación', hoy], ['Versión de la herramienta', VERSION.v], ['Corte de los datos', VERSION.corte], [],
    ['Campo', 'Descripción', 'Valores o unidad']];
  for (const f of d.campos) a.push(f);
  a.push([], ['Notas']);
  for (const n of NOTAS_COMUNES) a.push([n]);
  a.push([], [FUENTES]);
  return a;
}
// ---------- exportación a Excel (datos + diccionario) ----------
// librerías bajo demanda: de docs/libs en la versión del sitio (window.SIA_LIBS) o del CDN en el artefacto
function loadLib(file, glob, cdn){
  if (window[glob]) return Promise.resolve(window[glob]);
  return new Promise((res, rej)=>{
    const s = document.createElement('script');
    s.src = window.SIA_LIBS ? window.SIA_LIBS + file : cdn;
    s.onload = ()=> window[glob] ? res(window[glob]) : rej(new Error('sin ' + glob));
    s.onerror = ()=> rej(new Error('no se pudo cargar la librería'));
    document.head.appendChild(s);
  });
}
let XL = null;
function loadXL(){
  if (XL) return Promise.resolve(XL);
  return loadLib('xlsx.js', 'XLSX', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').then(x => (XL = x));
}
const wch = ws => ws.map(w=>({wch:w}));
async function deliverTable(base, key, aoa, extra){
  const st = $('dl-status'); st.textContent = 'Preparando archivo…';
  const nreg = aoa.length - 1;
  let X; try { X = await loadXL(); }
  catch(e){ // sin conexión al CDN: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = 'Sin conexión para generar el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '.csv', csv);
    const dic = dictAoa(key, nreg, base + '.csv', extra).map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '_diccionario.csv', dic);
    return;
  }
  const wb = X.utils.book_new();
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(DIC[key].cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx', extra));
  wd['!cols'] = wch([26, 78, 46]);
  X.utils.book_append_sheet(wb, wd, 'Diccionario');
  const buf = X.write(wb, { bookType:'xlsx', type:'array', compression:true });
  await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
const num = v => { const n = Number(v); return Number.isFinite(n)? n : v; };
// equivalente en km de frente del ámbito de vialidades primarias, para el diccionario de los Excel del Gobierno Central
function gcExtra(){ const g = gcFrente(sel, selAv);
  return [['Unidad de las longitudes', 'Metros o kilómetros de vialidad, medidos sobre el eje'],
    ['Equivalente del ámbito en km de frente de manzana (aceras con manzana enfrente)', num(sum(g.km).toFixed(2))],
    ['Equivalente prioritario (Muy Alta y Alta) en km de frente de manzana', num(kmPrio(g).toFixed(2))]]; }
// cifras del universo de intervención del ámbito consultado, para el diccionario de los Excel de la red de las alcaldías
function univExtra(){ const R = repStat(sel, selCol); const k = v => num(v.toFixed(2));
  return [['Universo de intervención del ámbito (Muy Alta, Alta y Media), km de frente a cargo de la alcaldía', k(univ3(R.km[0]))],
    ['De ese universo, km de frente sin arbolado', k(univ3(R.sa[0]))],
    ['De ese universo, km de frente sin arbolado y con banqueta (INEGI)', k(univ3(R.sb[0]))],
    ['Universo de intervención del ámbito, km de frente a cargo del Gobierno Central', k(univ3(R.km[1]))]]; }
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(F.prio[i]>=3 && !F.gc[i] && enAmbito(i)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.n? (c.pob||0) : '', c.n? (c.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const sn = idx.filter(sinNombreFr);
  deliverTable(`frentes_prioritarios_${scopeSlug()}`, 'frentes', rows, [['Responsable de todos los renglones', 'Alcaldía (los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen)'], ['Frentes sin nombre de calle (INEGI) en este archivo', sn.length], ['Km de esos frentes sin nombre de calle', num((sn.reduce((t,i)=>t+F.len[i],0)/1000).toFixed(2))], ...univExtra()]);
};
$('dl-calle').onclick = ()=>{
  const c = calleSel(); if (!c) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','tramo','tramo_entre','lat','lon']];
  const tr = tramoDeFrente(); const nt = i => tr.has(i)? tr.get(i).n : 0;
  const idx=[...c.idx].sort((a,b)=> nt(a)-nt(b) || F.prio[b]-F.prio[a]);
  for(const i of idx){ const k=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', k.n, k.cp? k.cp.padStart(5,'0'):'', k.p>=0? META.prio[k.p]:'', k.ids||'', k.ut||'', k.n? (k.pob||0) : '', k.n? (k.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], nt(i)||'', tr.has(i)? entreTxt(tr.get(i)) : '', num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const muns=[...new Set(c.idx.map(i=>F.mun[i]))];
  deliverTable(`frentes_calle_${slug(c.nombre)}_${muns.length===1? slug(META.munNames[muns[0]]) : 'ciudad'}${selCol!==null? '_'+slug(META.colonias[selCol].n) : ''}`, 'calle', rows, [['Tramos de la calle', new Set([...tr.values()].map(t=>t.n)).size]]);
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const rows=[['vialidad','colonia','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','km_muy_alta','km_alta','km_prioritario','km_media','km_universo_intervencion','km_total']];
  const items=[]; for(const [key,s] of streetIdx){ if(!s.kmp) continue; let ma=0,a=0,kma=0,ka=0; for(const i of s.idx){ if(F.prio[i]===4){ma++;kma+=F.len[i]/1000;} else if(F.prio[i]===3){a++;ka+=F.len[i]/1000;} }
    const c = s.col? META.colonias[s.col] : null;
    items.push([META.names[s.nid], c? c.n : 'Colonia no identificada', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[F.mun[s.idx[0]]], s.idx.length, ma, a, num(kma.toFixed(2)), num(ka.toFixed(2)), num(s.kmp.toFixed(2)), num(s.kp[2].toFixed(2)), num((s.kmp+s.kp[2]).toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[10]-x[10]); for(const r of items) rows.push(r);
  deliverTable(`resumen_calles_prioritarias_${scopeSlug()}`, 'calles', rows, [['Km de frente prioritario sin nombre de calle (INEGI), no incluidos en este resumen', num(sinNombre.kmp.toFixed(2))], ['Frentes prioritarios sin nombre de calle, no incluidos', sinNombre.np], ...univExtra()]);
};
$('dl-tramos').onclick = ()=>{
  const rows=[['id_tramo','prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','responsable','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(VP.prio[i]>=3 && (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ const a=vstart[i], b=vstart[i+1]-1; rows.push([VP.rec[i], META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(vpMid(i)[0].toFixed(6)), num(vpMid(i)[1].toFixed(6))]); }
  const nTramos = new Set(idx.map(i=>VP.rec[i])).size;
  deliverTable(`tramos_prioritarios_vialidades_primarias_${scopeSlugVP()}`, 'tramos', rows, [['Tramos distintos (id_tramo)', nTramos], ...gcExtra()]);
};
$('dl-avenidas').onclick = ()=>{
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  const items=[]; for(const [a,s] of avIdx){ if (selAv!==null && a!==selAv) continue; const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    items.push([VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[11]-x[11]); for(const r of items) rows.push(r);
  deliverTable(`resumen_avenidas_prioritarias_${scopeSlugVP()}`, 'avenidas', rows, gcExtra());
};

document.fonts && document.fonts.ready.then(()=> rerender());

// Fichas PDF (jsPDF bajo demanda) de colonia, alcaldía, vialidades primarias de la alcaldía, avenida y calle.
// abre la ficha después de cargar jsPDF (de libs/ en el sitio; del CDN en el artefacto)
function conPDF(kind){
  loadLib('jspdf.js', 'jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js')
    .then(()=> fichaPDF(kind))
    .catch(()=>{ const st = $('dl-status'); if (st) st.textContent = 'No se pudo cargar el generador de PDF; revisa tu conexión.'; });
}
// ---------- fichas (PDF) ----------
// texto en una sola línea: si no cabe, se recorta con puntos suspensivos en lugar de cortarse en seco (auditoría H-046)
function cortaTxt(doc, t, w){ const ls = doc.splitTextToSize(t, w); if (ls.length<2) return t; let x = ls[0]; while (x.length>1 && doc.getTextWidth(x+'…')>w) x = x.slice(0,-1); return x.replace(/[\s·,;(]+$/,'')+'…'; }
// título de ficha: se reduce hasta caber en el ancho útil
function tituloFicha(doc, t, w, x, y){ let fs=22; doc.setFontSize(fs); while (fs>13 && doc.getTextWidth(t)>w){ fs-=1; doc.setFontSize(fs); } doc.text(cortaTxt(doc, t, w), x, y); }
const LOGO_IMG = document.querySelector('.panel-head .logo'), LOGO_W = 1400, LOGO_H = 142;  // jsPDF acepta la imagen ya cargada (incrustada o en img/)
function alcBounds(i){ let w=180,s=90,e=-180,n=-90; for(const part of ALC_PARTS){ if(part.i!==i) continue; for(const q of part.poly){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } } const fb=META.bounds[META.muns[i]]; return [Math.min(w,fb[0]),Math.min(s,fb[1]),Math.max(e,fb[2]),Math.max(n,fb[3])]; }
function fichaPDF(kind){
  // kind: 'col' | 'alc' | 'vpalc' | 'vpav'
  if (!window.jspdf) return;
  const isCol = kind==='col', isAlc = kind==='alc', isVpAlc = kind==='vpalc', isVpAv = kind==='vpav'; const isVP = isVpAlc || isVpAv;
  if ((isCol && selCol===null) || ((isAlc||isVpAlc) && sel===null) || (isVpAv && selAv===null)) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'});
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const c = isCol? META.colonias[selCol] : null; const av = isVpAv? avStat(selAv) : null;
  let cs;
  if (isCol) cs = colStat(selCol);
  else if (isAlc){ const s=META.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:s.n[3]+s.n[4]}; }
  else if (isVpAlc){ const s=VPC.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:VP_RECS[sel].rp.size, ntot:VP_RECS[sel].r.size}; }
  else { cs={n:av.n, km:av.kmByP, kmp:av.kmp, np:av.recsp.size, ntot:av.recs.size}; }
  const tot = sum(cs.km); const ntot = isVP? cs.ntot : sum(cs.n);
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const unit = isVP? 'tramos' : 'frentes';
  // encabezado
  const lw = 118, lh = lw*LOGO_H/LOGO_W; doc.addImage(LOGO_IMG, 'PNG', M, 9, lw, lh);
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text(isCol? 'Ficha de colonia' : isAlc? 'Ficha de alcaldía' : isVpAlc? 'Ficha de vialidades primarias' : 'Ficha de avenida', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Calles prioritarias para reforestar', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  const title = isCol? c.n : isVpAv? VPC.nomenclat[selAv] : META.munNames[sel];
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); tituloFicha(doc, title, W-2*M, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = isCol? `${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' habitantes (Censo 2020)':''}`
    : isAlc? `Ciudad de México · ${fmt.format(ntot)} frentes de manzana a cargo de la alcaldía · ${fmt0.format(tot)} km de frentes`
    : isVpAlc? `Ciudad de México · ${fmt.format(ntot)} tramos de vialidad primaria a cargo del Gobierno Central · ${fmt0.format(tot)} km`
    : `${[...av.nombres].join(', ')} · ${[...av.muns].map(m=>META.munNames[m]).join(', ')} · ${fmt1.format(tot)} km · ${fmt.format(ntot)} tramos`;
  doc.text(cortaTxt(doc, sub, W-2*M), M, 44);
  const pk = isCol? c.p : isAlc? ALC_DOM[sel] : isVpAlc? VP_DOM[sel] : dom({km:av.kmByP}); const pc = pk>=0? T.prio[pk] : GRIS;
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = isCol? `Prioridad de la colonia: ${pk>=0? META.prio[pk]:'—'}` : `Prioridad predominante: ${META.prio[pk]} (${pct(cs.km[pk],tot)} de los ${isVpAv? 'km de la avenida' : isVP? 'km de vialidad primaria de la alcaldía' : 'km de frente de la alcaldía'})`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5);
  const tw = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = isCol? `Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}` : isAlc? `Concentra ${partTxt(sel,false)}` : isVpAlc? `Concentra ${partTxt(sel,true)}` : `${VPC.tipos[VP.tipo[av.idx[0]]]}`;
  const l2x = M+6+tw+8; if (l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5); else doc.text(doc.splitTextToSize(l2, W-2*M-6)[0], M+6, 56.4);
  // KPIs
  const kp = [[kmFull(cs.kmp), isVP? `de vialidad primaria prioritaria ${ampP()} (Muy Alta + Alta)` : `de frente prioritario ${ampP()} (Muy Alta + Alta)`],[fmt1.format(tot? 100*cs.kmp/tot:0)+' %','de los '+kmFull(tot)+' '+(isCol?'de frentes de la colonia':isAlc?'de frentes de la alcaldía':isVpAlc?'de vialidad primaria de la alcaldía':'de la avenida')],[fmt.format(cs.np), isVP? `${unit} prioritarios, de los ${fmt.format(ntot)} ${unit} ${ampP()}` : (isCol? `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la colonia` : `frentes prioritarios, de los ${fmt.format(ntot)} a cargo de la alcaldía`)]];
  function ampP(){ return isCol? 'de la colonia' : isVpAv? 'de la avenida' : 'de la alcaldía'; }
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  // nota complementaria: se mide su alto real y la gráfica se coloca debajo, sin encimarse (auditoría H-046)
  let notaFin = 0; const nota = t => { doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); const ls = doc.splitTextToSize(t, W-2*M).slice(0,3); doc.text(ls, M, 81.5, {lineHeightFactor:1.2}); notaFin = 81.5 + (ls.length-1)*3.6; };
  if (isAlc){ const vs=VPC.summ[META.muns[sel]]; const top=[]; for(const [a,s] of (()=>{ const m=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; m.set(a,(m.get(a)||0)+(VP.prio[i]>=3? VP.len[i]/1000:0)); } return m; })()) top.push([a,s]); top.sort((x,y)=>y[1]-x[1]);
    nota(`Gobierno Central atiende además ${fmt0.format(sum(vs.km))} km de vialidades primarias en la alcaldía, medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); no se cuentan arriba. Principales: ${top.slice(0,3).map(t=>VPC.nomenclat[t[0]]).join(', ')}.`); }
  if (isVpAlc){ const fs=META.summ[META.muns[sel]]; nota(`Los kilómetros de esta ficha se miden sobre el eje de la vialidad. ${gcFrenteTxt(sel, null)}. La alcaldía atiende por su parte ${fmt0.format(sum(fs.km))} km de frentes de manzana (${fmt0.format(kmPrio(fs))} km prioritarios); ver ficha de alcaldía.`); }
  if (isVpAv){
    let t=`${avGruposTxt(selAv)? avGruposTxt(selAv)+'. ' : ''}Las cifras de esta ficha corresponden a la avenida completa, en todas las alcaldías que cruza, medidas sobre el eje. ${gcFrenteTxt(null, selAv)}.`;
    if (sel!==null){ const va=vpSumm(); t+=` En ${META.munNames[sel]}: ${kmFull(sum(va.km))} de la avenida, ${kmFull(kmPrio(va))} prioritarios, ${fmt.format(va.recsp.size)} de ${fmt.format(va.recs.size)} tramos prioritarios.`; }
    nota(t); }
  // barras + mapa
  y = Math.max(89, notaFin + 5.5); const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); const tBar = doc.splitTextToSize(isVP? `KILÓMETROS DE VIALIDAD PRIMARIA POR PRIORIDAD ${isVpAv? 'DE LA AVENIDA':'DE LA ALCALDÍA'}` : `KILÓMETROS DE FRENTE POR PRIORIDAD ${isCol? 'DE LA COLONIA':'DE LA ALCALDÍA'}`, colW-2); doc.text(tBar, M, y, {lineHeightFactor:1.15}); const dyT = (tBar.length-1)*4;
  const max=Math.max(...cs.km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+dyT+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*cs.km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(cs.km[k])} · ${tot? fmt1.format(100*cs.km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
  let capMapa='';
  doc.setDrawColor(...LINE); doc.setFillColor(255,255,255); doc.rect(mx,my,mw,mh,'FD');
  doc.saveGraphicsState(); doc.rect(mx,my,mw,mh,null); doc.clip(); doc.discardPath();
  let b = isCol? colBounds(selCol) : isVpAv? avBounds(selAv) : alcBounds(sel);
  if (isVpAv){ const pad=Math.max(0.004, 0.08*Math.max(b[2]-b[0], b[3]-b[1])); b=[b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad]; }
  const cosl=Math.cos((b[1]+b[3])/2*Math.PI/180);
  const dx=(b[2]-b[0])*cosl, dy=(b[3]-b[1]); const pad=3; const sc=Math.min((mw-2*pad)/dx,(mh-2*pad)/dy);
  const ox=mx+(mw-dx*sc)/2, oy=my+(mh-dy*sc)/2;
  const X=lon=>ox+(lon-b[0])*cosl*sc, Y=lat=>oy+(b[3]-lat)*sc;
  const drawAlcOutline = (i)=>{ for(const part of ALC_PARTS){ if(part.i!==i) continue; const p=part.poly; for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } };
  if (isCol){
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(k>=3?0.55:0.35);
      for(let i=0;i<N;i++){ if(F.col[i]!==selCol || F.prio[i]!==k || F.gc[i]) continue; for(let v=start[i];v<start[i+1]-1;v++){ doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); } } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6);
    for(const cc of COLS){ if(cc.i!==selCol) continue; for(const p of cc.paths){ for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } }
    capMapa = 'Frentes de manzana por prioridad · contorno de la colonia';
  } else if (isAlc){
    const m = META.muns[sel]; doc.setLineWidth(0.15); doc.setDrawColor(255,255,255);
    for(const cc of COLS){ if(cc.mun!==m || cc.prio<0) continue; const col=T.prio[cc.prio]; doc.setFillColor(col[0],col[1],col[2]);
      for(const p of cc.paths){ if(p.length<3) continue; const segs=[]; for(let q=1;q<p.length;q++) segs.push([(X(p[q][0])-X(p[q-1][0])), (Y(p[q][1])-Y(p[q-1][1]))]); doc.lines(segs, X(p[0][0]), Y(p[0][1]), [1,1], 'FD', true); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); drawAlcOutline(sel);
    capMapa = 'Colonias por prioridad · contorno de la alcaldía';
  } else {
    // vialidades primarias por prioridad
    doc.setDrawColor(200,196,190); doc.setLineWidth(0.25);
    if (isVpAv) for(const m of av.muns) drawAlcOutline(m); else { for(let i=0;i<16;i++){ if(i!==sel) drawAlcOutline(i); } }
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(k>=3? 0.9 : 0.6);
      for(let i=0;i<NV;i++){ if(VP.prio[i]!==k) continue; if(isVpAlc && VP.mun[i]!==sel) continue; if(isVpAv && VP.nom[i]!==selAv) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); if (isVpAlc) drawAlcOutline(sel);
    capMapa = isVpAlc? 'Vialidades primarias por prioridad · contorno de la alcaldía' : 'Tramos de la avenida por prioridad · alcaldías que cruza';
  }
  doc.restoreGraphicsState();
  doc.setFillColor(255,255,255); doc.rect(mx+0.3,my+mh-5.2,mw-0.6,4.9,'F'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text(cortaTxt(doc, capMapa, mw-4), mx+2, my+mh-2);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla
  y=y+62;
  // universo de intervención (Muy Alta, Alta y Media) del ámbito de la ficha, en km de frente de manzana
  const NR = (isCol||isAlc)? (sinNombre.kmp>0? 11 : 12) : 14;
  if (isCol||isAlc){ const R = repStat(sel, isCol? selCol : null); const ua=univ3(R.km[0]);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
    const ug = univ3(R.km[1]);
    doc.text(doc.splitTextToSize(`Universo de intervención (Muy Alta, Alta y Media): ${kmFull(ua)} de frente a cargo de la alcaldía (${pct(ua,sum(R.km[0]))} de sus frentes ${isCol?'en la colonia':'en la alcaldía'}); de ellos, ${kmFull(univ3(R.sa[0]))} sin arbolado y ${kmFull(univ3(R.sb[0]))} sin arbolado y con banqueta (INEGI).${ug>0? ` Gobierno Central: ${kmFull(ug)} de frente de ese universo, sobre vialidades primarias.`:''}`, W-2*M).slice(0,3), M, y+2, {lineHeightFactor:1.25});
    y+=16; }
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  let rows, cols;
  if (isCol){
    doc.text('CALLES CON MÁS FRENTE PRIORITARIO EN LA COLONIA', M, y);
    const items=[]; for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Vialidad'],[M+96,'Tipo'],[M+134,'Km prior.'],[M+158,'Frentes prior.']];
    rows = items.slice(0,NR).map(([key,s])=>[META.names[s.nid], [...s.tipos].filter(Boolean).slice(0,2).join(', '), f2.format(s.kmp), `${s.np} de ${s.idx.length}`]);
  } else if (isAlc){
    doc.text('COLONIAS CON MÁS FRENTE PRIORITARIO EN LA ALCALDÍA', M, y);
    const m=META.muns[sel]; const items=[]; for(let i=1;i<META.colonias.length;i++){ const cc=META.colonias[i]; if(!cc.n || cc.m!==m) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Colonia'],[M+78,'Prioridad'],[M+106,'IDS de su U. T.'],[M+140,'Km prior.'],[M+161,'Frentes prior.']];
    rows = items.slice(0,NR).map(([i,s])=>{ const cc=META.colonias[i]; return [cc.n, cc.p>=0? META.prio[cc.p]:'—', cc.ids||'—', f2.format(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))}`]; });
  } else if (isVpAlc){
    doc.text('AVENIDAS CON MÁS KILÓMETROS PRIORITARIOS EN LA ALCALDÍA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=per.get(a); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set(),nombres:new Set(),tipos:new Set()}; per.set(a,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
    const items=[...per.entries()].filter(([a,s])=>kmPrio(s)>0).sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Vialidad'],[M+70,'Red vial'],[M+108,'Predominante'],[M+134,'Km prior.'],[M+158,'Tramos prior.']];
    rows = items.slice(0,14).map(([a,s])=>[VPC.nomenclat[a], [...s.nombres].slice(0,2).join(', '), META.prio[dom(s)], f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  } else {
    doc.text('TRAMOS DE LA AVENIDA POR ALCALDÍA QUE CRUZA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); }
    const items=[...per.entries()].sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Alcaldía'],[M+62,'Predominante'],[M+92,'Km en la alcaldía'],[M+126,'Km prior.'],[M+150,'Tramos prior.']];
    rows = items.map(([m,s])=>[META.munNames[m], META.prio[dom(s)], f2.format(sum(s.km)), f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if(!rows.length){ doc.setTextColor(...GRIS); doc.text('Sin registros prioritarios.', M+1.5, y+6); }
  // frentes prioritarios sin nombre de calle: no caben en una tabla por calle, pero se reportan (auditoría H-008)
  if ((isCol||isAlc) && sinNombre.kmp>0){ doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(`Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${isCol?'de la colonia':'de la alcaldía'} no tienen nombre de calle en INEGI (${fmt.format(sinNombre.np)} frentes); no aparecen en los listados por calle, pero sí en el Excel de frentes.`, W-2*M-3).slice(0,2), M+1.5, y+6+Math.max(rows.length,1)*6.2-1.5, {lineHeightFactor:1.2}); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,254,W-M,254); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const fuentes = isVP
    ? `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros. Las vialidades primarias y de acceso controlado corresponden al Gobierno de la Ciudad de México. Fuentes: SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); modelo de priorización del Sistema de Información Ambiental. La meta se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red primaria completa. ${PRELIM_TXT} Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar. ${VERSION_TXT}.`
    : `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. ${isCol?'':'Prioridad predominante = categoría con más kilómetros de frente en la alcaldía. '}Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025) y capa de vialidades primarias (ago. 2026); catálogo de colonias SEDEMA-SIA e Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX). ${PRELIM_TXT} Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar. ${VERSION_TXT}.`;
  doc.text(doc.splitTextToSize(fuentes, W-2*M), M, 258);
  const fname = isCol? `ficha_colonia_${slug(META.munNames[sel])}_${slug(c.n)}.pdf` : isAlc? `ficha_alcaldia_${slug(META.munNames[sel])}.pdf` : isVpAlc? `ficha_vialidades_primarias_${slug(META.munNames[sel])}.pdf` : `ficha_avenida_${slug(VPC.nomenclat[selAv])}_toda_la_ciudad.pdf`;
  deliverBlob(fname, doc.output('blob'));
}
// ---------- ficha de calle (red de las alcaldías) ----------
// Misma composición que las demás fichas: encabezado, cifras, barras por prioridad, mapa y tabla por colonia.
function fichaCallePDF(){
  const c = calleSel(); if (!c || !window.jspdf) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'});
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const idx = c.idx, enCalle = new Set(idx);
  const km=[0,0,0,0,0], n=[0,0,0,0,0]; let banq=0; const tipos=new Set(), porCol=new Map(), munSet=new Set();
  for(const i of idx){ const k=F.len[i]/1000, p=F.prio[i]; km[p]+=k; n[p]++; if (META.disp[(F.flags[i]>>3)&7]==='Dispone') banq++; if (META.tipos[F.tipo[i]]) tipos.add(META.tipos[F.tipo[i]]); munSet.add(F.mun[i]);
    let s=porCol.get(F.col[i]); if(!s){ s={km:0,kmp:0,n:0,np:0}; porCol.set(F.col[i],s); } s.km+=k; s.n++; if(p>=3){ s.kmp+=k; s.np++; } }
  const tot=sum(km), kmp=km[3]+km[4], ntot=idx.length, np=n[3]+n[4];
  const muns=[...munSet].map(m=>META.munNames[m]); const colNoms=[...porCol.keys()].filter(Boolean).map(k=>META.colonias[k].n);
  // encabezado
  const lw = 118, lh = lw*LOGO_H/LOGO_W; doc.addImage(LOGO_IMG, 'PNG', M, 9, lw, lh);
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text('Ficha de calle', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Calles prioritarias para reforestar', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); tituloFicha(doc, c.nombre, W-2*M, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = `${colNoms.length>3? colNoms.length+' colonias' : colNoms.join(', ')} · ${muns.join(', ')} · ${fmt.format(ntot)} frentes de manzana · ${kmFull(tot)}`;
  doc.text(cortaTxt(doc, sub, W-2*M), M, 44);
  const pk = dom({km}); const pc = T.prio[pk];
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = `Prioridad predominante: ${META.prio[pk]} (${pct(km[pk],tot)} de los km de la calle)`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5); const tw1 = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = [...tipos].slice(0,2).join(', '); const l2x = M+6+tw1+8; if (l2 && l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5);
  // cifras
  const kp = [[kmFull(kmp), 'de frente prioritario de la calle (Muy Alta + Alta)'],[fmt1.format(tot? 100*kmp/tot:0)+' %','de los '+kmFull(tot)+' de frentes de la calle'],[fmt.format(np), `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la calle`]];
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA);
  doc.text(doc.splitTextToSize(`Banqueta (INEGI): ${fmt.format(banq)} de ${fmt.format(ntot)} frentes registran banqueta; el espacio de plantación se verifica en campo. Cada frente es un lado de la calle frente a una manzana.`, W-2*M).slice(0,2), M, 80.6, {lineHeightFactor:1.2});
  // barras + mapa
  y=90.5; const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.text('KILÓMETROS POR PRIORIDAD EN LA CALLE', M, y);
  const max=Math.max(...km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(km[k])} · ${tot? fmt1.format(100*km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
  doc.setDrawColor(...LINE); doc.setFillColor(255,255,255); doc.rect(mx,my,mw,mh,'FD');
  doc.saveGraphicsState(); doc.rect(mx,my,mw,mh,null); doc.clip(); doc.discardPath();
  let w=180,s0=90,e=-180,nn=-90; for(const i of idx){ for(let v=start[i];v<start[i+1];v++){ const x=POS[2*v], yv=POS[2*v+1]; if(x<w)w=x; if(x>e)e=x; if(yv<s0)s0=yv; if(yv>nn)nn=yv; } }
  const pd=Math.max(0.0025, 0.15*Math.max(e-w, nn-s0)); const b=[w-pd,s0-pd,e+pd,nn+pd];
  const cosl=Math.cos((b[1]+b[3])/2*Math.PI/180); const dx=(b[2]-b[0])*cosl, dy=(b[3]-b[1]); const sc=Math.min((mw-6)/dx,(mh-6)/dy);
  // la vista del mapa se amplía hasta llenar el recuadro, para dar contexto alrededor de la calle
  const cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2, hw=mw/2/sc/cosl, hh=mh/2/sc; const vb=[cx-hw,cy-hh,cx+hw,cy+hh];
  const X=lon=>mx+mw/2+(lon-cx)*cosl*sc, Y=lat=>my+mh/2-(lat-cy)*sc;
  // contexto: demás frentes de la zona en gris claro y contorno de las colonias de la calle
  doc.setDrawColor(214,209,201); doc.setLineWidth(0.2);
  for(let i=0;i<N;i++){ if (enCalle.has(i) || !munSet.has(F.mun[i])) continue; const a=start[i]; const x=POS[2*a], yv=POS[2*a+1]; if (x<vb[0]||x>vb[2]||yv<vb[1]||yv>vb[3]) continue;
    for(let v=start[i];v<start[i+1]-1;v++) doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); }
  doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.3);
  for(const cc of COLS){ if(!porCol.has(cc.i)) continue; for(const p of cc.paths){ for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } }
  for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(1.1);
    for(const i of idx){ if(F.prio[i]!==k) continue; for(let v=start[i];v<start[i+1]-1;v++) doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); } }
  doc.restoreGraphicsState();
  doc.setFillColor(255,255,255); doc.rect(mx+0.3,my+mh-5.2,mw-0.6,4.9,'F');
  doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('La calle por prioridad · en gris, calles vecinas · contorno de sus colonias', mx+2, my+mh-2);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla por colonia
  // tabla: tramos de la calle (de esquina a esquina); si la calle abarca varias colonias, por colonia
  y=y+62; doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const trs = porCol.size===1? tramosDeCalle(idx) : null;
  let items, cols, rows;
  if (trs){ doc.text('TRAMOS DE LA CALLE, DE ESQUINA A ESQUINA', M, y); items = trs;
    cols=[[M,'Tramo'],[M+13,'Ubicación'],[M+104,'Metros de calle'],[M+130,'Lados'],[M+144,'Predominante'],[M+168,'Km prior.']];
    rows = items.slice(0,14).map(t=>[t.n, entreTxt(t), fmt.format(t.largo), t.lados, META.prio[dom({km:t.km})], f2.format(t.km[3]+t.km[4])]);
  } else { doc.text('LA CALLE POR COLONIA', M, y);
    items=[...porCol.entries()].sort((a,b2)=>b2[1].kmp-a[1].kmp || b2[1].km-a[1].km);
    cols=[[M,'Colonia'],[M+70,'Prioridad de la colonia'],[M+112,'Km de frente'],[M+138,'Km prior.'],[M+160,'Frentes prior.']];
    rows = items.slice(0,14).map(([k,st])=>{ const cc=META.colonias[k]; return [k? cc.n : 'Colonia no identificada', k && cc.p>=0? META.prio[cc.p] : '—', f2.format(st.km), f2.format(st.kmp), `${st.np} de ${st.n}`]; }); }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if (items.length>14){ doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(`Se muestran 14 de ${items.length} ${trs? 'tramos; el Excel de la calle trae todos' : 'colonias; el Excel de la calle trae todas'}.`, M+1.5, y+6+14*6.2); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,254,W-M,254); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  doc.text(doc.splitTextToSize('Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros de frente en la calle. Una calle se compone de frentes de manzana: cada lado de la calle frente a una manzana es un frente. Los tramos se arman con una regla geométrica y sus vialidades delimitantes son aproximadas; se confirman en campo. Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025); catálogo de colonias SEDEMA-SIA. ' + PRELIM_TXT + ' Generada el ' + new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}) + '. ' + VERSION_TXT + '.', W-2*M), M, 258);
  deliverBlob(`ficha_calle_${slug(c.nombre)}_${munSet.size===1? slug(muns[0]) : 'ciudad'}${selCol!==null? '_'+slug(META.colonias[selCol].n) : ''}.pdf`, doc.output('blob'));
}
$('dl-ficha-calle').onclick = ()=> loadLib('jspdf.js', 'jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js').then(fichaCallePDF)
  .catch(()=>{ const st = $('dl-status'); if (st) st.textContent = 'No se pudo cargar el generador de PDF; revisa tu conexión.'; });
$('dl-ficha').onclick = ()=>conPDF('col');
$('dl-ficha-alc').onclick = ()=>conPDF('alc');
$('dl-ficha-vpalc').onclick = ()=>conPDF('vpalc');
$('dl-ficha-av').onclick = ()=>conPDF('vpav');

// Interfaz: ventana de metodología, hoja inferior en teléfono, pestañas, acciones fijas y ruta de navegación.
// ---------- metodología ----------
const infoModal = $('info-modal'); let lastFocus = null;
// La ventana se cierra con la × (siempre visible), con "Volver al mapa" al final, con Esc, tocando fuera
// de ella o con el botón Atrás del teléfono (se registra un paso en el historial al abrirla).
function openInfo(){ lastFocus=document.activeElement; infoModal.hidden=false; infoModal.querySelector('.modal-card').scrollTop=0; $('info-close').focus();
  try { history.pushState({ayuda:true}, ''); } catch(e){} }
function hideInfo(){ infoModal.hidden=true; if(lastFocus) lastFocus.focus(); }
function closeInfo(){ if (history.state && history.state.ayuda){ history.back(); setTimeout(()=>{ if(!infoModal.hidden) hideInfo(); }, 400); } else hideInfo(); }
addEventListener('popstate', ()=>{ if (!infoModal.hidden) hideInfo(); });
$('open-info').onclick = openInfo; $('info-btn').onclick = openInfo; $('info-close').onclick = closeInfo; $('info-back').onclick = closeInfo;
infoModal.addEventListener('click', e=>{ if(e.target===infoModal) closeInfo(); });
addEventListener('keydown', e=>{ if(e.key==='Escape' && !infoModal.hidden) closeInfo(); });
// cifras del cruce en la metodología
$('m-vp-km').textContent = fmt0.format(VPC.cov.km_total); $('m-vp-prio').textContent = fmt0.format(vCityPrioKm); $('m-vp-pct').textContent = pct(vCityPrioKm, vCityTotKm);
$('m-n-fr').textContent = fmt.format(N); $('m-n-alc').textContent = fmt.format(N - META.cruce.frentes_gc);
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
// el panel de capas se abre y se cierra con el botón de capas de la barra de herramientas; su × lo cierra
const capasBtn = $('zcapas');
function setLegend(open){ legendEl.classList.toggle('open', open); legendBtn.setAttribute('aria-expanded', String(open)); capasBtn.setAttribute('aria-expanded', String(open)); capasBtn.classList.toggle('on', open); }
legendBtn.onclick = ()=> setLegend(false);
capasBtn.onclick = ()=> setLegend(!legendEl.classList.contains('open'));
setLegend(!isPhone());
addEventListener('resize', ()=>{ if(!isPhone()) document.body.classList.remove('sheet-open','sheet-peek'); });

// ---------- pestañas Resumen / Listado / Descargas (auditoría C1) ----------
let curTab = 'res';
function setTab(t){ curTab=t; document.body.classList.toggle('tab-dl', t==='dl');   // en Descargas la barra inferior sobra: repite los mismos botones
  document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); ['res','list','dl'].forEach(k=>{ $('tp-'+k).hidden = k!==t; }); }
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
  if (isGC()){ main='dl-tramos'; txt='Descargar tramos prioritarios (Excel)'; if ($('dl-tramos').disabled) why='Este ámbito no tiene tramos de prioridad Muy Alta o Alta que descargar.'; ficha = selAv!==null? 'dl-ficha-av' : sel!==null? 'dl-ficha-vpalc' : null; }
  else {
    txt='Descargar frentes prioritarios (Excel)';
    const vacia = selCol!==null && sum(colStat(selCol).n)===0;
    main = (sel!==null && !vacia)? 'dl-frentes' : null;
    ficha = vacia? null : selCol!==null? 'dl-ficha' : sel!==null? 'dl-ficha-alc' : null;
    why = vacia? 'Esta colonia no tiene frentes a cargo de la alcaldía que descargar.' : sel===null? 'Elige una alcaldía o una colonia para descargar su listado.' : '';
    // con una calle consultada, los botones principales son los de la calle
    const calle = calleSel();
    if (calle){ main='dl-calle'; ficha='dl-ficha-calle'; txt='Descargar frentes de la calle (Excel)';
      why = `Calle consultada: ${calle.nombre}. ` + (sel===null? 'Para descargar un ámbito completo, elige primero una alcaldía.' : `Los archivos de la ${selCol!==null? 'colonia' : 'alcaldía'} completa están en la pestaña Descargas.`); }
  }
  lbl.textContent = txt; m.disabled = !main || $(main).disabled; m.dataset.target = main||''; f.hidden = !ficha; f.dataset.target = ficha||'';
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
  // la calle consultada es el último nivel de la ruta y se puede soltar (auditoría H-087)
  const cs = calleSel(); if (cs) h += `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${cs.nombre}</span><button type="button" class="cr-up" data-up="calle" title="Quitar la calle" aria-label="Quitar la calle consultada">×</button></span>`;
  rest.innerHTML = h; rest.querySelectorAll('.cr-up').forEach(up=>{ up.onclick = ()=>{ const k=up.dataset.up;
    if (k==='calle'){ highlight=null; hideCard(); rerender(); renderResults(); renderActions(); syncCalleBtns(); } else if (k==='col') clearColonia(); else clearAvenida(); }; });
}
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; selEl.value=''; setSel(''); };

// Buscador único: alcaldías, colonias, avenidas y calles, con abreviaturas y tolerancia a errores.
// ---------- buscador único (auditoría C6) ----------
const omni=$('omni'), omniList=$('omni-list'), omniClear=$('omni-clear');
const OMNI_AB = Object.assign({}, ABREV, {calz:'calzada', clz:'calzada', av:'avenida', avda:'avenida', ave:'avenida', blvd:'boulevard', cda:'cerrada', priv:'privada', and:'andador', circ:'circuito', cto:'circuito', dr:'doctor', ing:'ingeniero', lic:'licenciado', mtro:'maestro', pdte:'presidente', fco:'francisco', gpe:'guadalupe', ma:'maria', col:'colonia'});
const STOP = new Set(['de','del','la','las','los','el','y','en']);
const toks = s => norm(s||'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).map(t=>OMNI_AB[t]||t).join(' ').split(' ');
function lev1(a,b){ if(a===b) return true; const la=a.length, lb=b.length; if(Math.abs(la-lb)>1) return false; let i=0,j=0,e=0;
  while(i<la && j<lb){ if(a[i]===b[j]){ i++; j++; continue; } if(++e>1) return false; if(la>lb) i++; else if(lb>la) j++; else { i++; j++; } }
  return e + (la-i) + (lb-j) <= 1; }
function swap1(a,b){ if(a.length!==b.length) return false; const d=[]; for(let i=0;i<a.length;i++) if(a[i]!==b[i]){ d.push(i); if(d.length>2) return false; } return d.length===2 && d[1]===d[0]+1 && a[d[0]]===b[d[1]] && a[d[1]]===b[d[0]]; }
function tokScore(q, c){ if(c===q) return 3; if(c.startsWith(q)) return 2.5; if(q.length>=4 && c.includes(q)) return 1.5;
  if(q.length>=5 && (lev1(q,c) || swap1(q,c) || (c.length>q.length && (lev1(q, c.slice(0,q.length)) || swap1(q, c.slice(0,q.length)))))) return 1; return 0; }
let omniTypo = false;
function omniMatch(qt, ct){ if(!ct || !ct.length) return 0; let tot=0, typo=false;
  for(const q of qt){ let best=0; for(const c of ct){ const sc=tokScore(q,c); if(sc>best) best=sc; } if(!best) return 0; if(best===1) typo=true; tot+=best; }
  if (typo) omniTypo = true; return tot - ct.length*0.05 + (ct[0]===qt[0]? 0.6 : ct[0].startsWith(qt[0])? 0.3 : 0); }
let OM = null;
function omniIndex(){ if (OM) return OM;
  OM = { alc: META.munNames.map(toks), col: META.colonias.map(c=> c.n? toks(c.n) : null), colUT: META.colonias.map(c=> c.ut? toks(c.ut) : null), av: VPC.nomenclat.map(toks), avRV: [] };
  const stat = new Map();
  for(let i=0;i<N;i++){ if (F.gc[i]) continue; const nid=F.name[i]; if (PLACEHOLDER.has(nid)) continue; let s=stat.get(nid); if(!s){ s={cols:new Map(), kmp:0, muns:new Set()}; stat.set(nid,s); }
    const k = F.prio[i]>=3? F.len[i]/1000 : 0; s.kmp+=k; s.cols.set(F.col[i], (s.cols.get(F.col[i])||0)+k); s.muns.add(F.mun[i]); }
  OM.stStat = stat; OM.stIds = [...stat.keys()]; OM.st = OM.stIds.map(nid=>toks(META.names[nid]));
  // colonias homónimas (mismo nombre, CP y alcaldía): se numeran
  const seen = new Map(); OM.part = new Map();
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const k=c.n+'|'+(c.cp||'')+'|'+c.m; const a=seen.get(k)||[]; a.push(i); seen.set(k,a); }
  for(const a of seen.values()) if (a.length>1) a.forEach((id,k)=>OM.part.set(id, [k+1, a.length]));
  return OM; }
let omniItems=[], omniActive=-1, omniQ='';
function omniSearch(q){
  const qt = toks(q).filter(t=>!STOP.has(t)); if (!qt.length || q.trim().length<2) return null;
  const I = omniIndex(); omniTypo=false; const R = {alc:[], col:[], av:[], st:[]};
  I.alc.forEach((ct,i)=>{ const s=omniMatch(qt,ct); if(s) R.alc.push({t:'alc', i, s: s+1.5}); });
  for(let i=1;i<I.col.length;i++){ if(!I.col[i]) continue; let s=omniMatch(qt,I.col[i]), via=''; if(!s && I.colUT[i]){ s=omniMatch(qt,I.colUT[i]); if(s){ s-=1; via=META.colonias[i].ut; } } if(s) R.col.push({t:'col', i, s: s+0.5, via}); }
  I.av.forEach((ct,a)=>{ let s=omniMatch(qt,ct), via='';
    if(!s){ if(!I.avRV[a]) I.avRV[a] = [...avStat(a).nombres].map(n=>[n,toks(n)]); for(const [n,rt] of I.avRV[a]){ const s2=omniMatch(qt,rt); if(s2){ s=s2-0.5; via=n; break; } } }
    if(s) R.av.push({t:'av', a, s: s+1.5, via}); });
  I.st.forEach((ct,k)=>{ const s=omniMatch(qt,ct); if(s) R.st.push({t:'st', nid:I.stIds[k], s}); });
  // calle + lugar: «ayuntamiento centro», «reforma iztapalapa». Parte de las palabras nombra la calle y el resto, su colonia o alcaldía
  if (qt.length>=2) I.st.forEach((ct,k)=>{ if (omniMatch(qt,ct)) return;
    const enCalle = qt.filter(t=>ct.some(c=>tokScore(t,c)>=1.5)); if (!enCalle.length || enCalle.length===qt.length) return; const resto = qt.filter(t=>!enCalle.includes(t));
    const sc = omniMatch(enCalle, ct); if (!sc) return; const nid=I.stIds[k], s=I.stStat.get(nid); let n=0;
    for (const c of s.cols.keys()){ if (!c || !I.col[c]) continue; const m=munIndex[META.colonias[c].m]; if (omniMatch(resto, I.col[c].concat(I.alc[m]||[]))){ R.st.push({t:'st', nid, col:c, s: sc+0.4}); if (++n>=3) break; } } });
  const kmpOf = it => it.t==='st'? I.stStat.get(it.nid).kmp : it.t==='av'? avStat(it.a).kmp : it.t==='col'? colStat(it.i).kmp : 0;
  for (const k in R) R[k].sort((x,y)=> y.s-x.s || kmpOf(y)-kmpOf(x));
  R.alc=R.alc.slice(0,3); R.col=R.col.slice(0,6); R.av=R.av.slice(0,4); R.st=R.st.slice(0,5);
  const expanded = norm(q).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>OMNI_AB[t] && OMNI_AB[t]!==t).map(t=>`«${t}» como «${OMNI_AB[t]}»`);
  R.qt = qt; R.why = [expanded.length? 'Se reconoció '+expanded.join(', ')+'.' : '', omniTypo? 'Incluye coincidencias aproximadas (una letra de diferencia).' : ''].filter(Boolean).join(' ');
  return R; }
function omniMark(name, qt){ return name.split(/(\s+)/).map(w=>{ const n=toks(w)[0]||''; return (n && qt.some(q=>tokScore(q,n)>=1.5))? `<mark>${w}</mark>` : w; }).join(''); }
function omniRender(){
  const R = omniSearch(omni.value); omniList.innerHTML=''; omniItems=[]; omniActive=-1;
  if (!R){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); return; }
  const groups = [['alc','Alcaldías'],['col','Colonias'],['av','Avenidas · Gobierno Central'],['st','Calles · alcaldías']].filter(([k])=>R[k].length).sort((a,b)=> R[b[0]][0].s - R[a[0]][0].s);
  if (!groups.length){ omniList.innerHTML = `<li class="empty">Sin coincidencias. Prueba con menos palabras o con otra forma del nombre.</li>`; omniList.hidden=false; omni.setAttribute('aria-expanded','true'); return; }
  const I = omniIndex();
  for (const [k,title] of groups){ const g=document.createElement('li'); g.className='grp'; g.setAttribute('role','presentation'); g.textContent=title; omniList.appendChild(g);
    for (const it of R[k]){ const li=document.createElement('li'); li.className='opt'; li.setAttribute('role','option'); li.id='om-'+omniItems.length; let html='';
      if (it.t==='alc'){ const d=domOf(it.i); html = `<span class="ty">Alc</span><span class="nm">${omniMark(META.munNames[it.i], R.qt)}</span><span class="k">${kmFull(kmPrio(summOf(it.i)))} prior.</span><span class="m">Prioridad predominante ${META.prio[d]}</span>`; }
      else if (it.t==='col'){ const c=META.colonias[it.i]; const pt=I.part.get(it.i); html = `<span class="ty">Col</span><span class="nm">${omniMark(c.n, R.qt)}${pt? ` <small>· parte ${pt[0]} de ${pt[1]}</small>`:''}</span><span class="k">${c.p>=0? META.prio[c.p] : '—'}</span><span class="m">${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${it.via? ` · coincide con su unidad territorial: ${it.via}`:''}</span>`; }
      else if (it.t==='av'){ const s=avStat(it.a); html = `<span class="ty">Av</span><span class="nm">${omniMark(VPC.nomenclat[it.a], R.qt)}</span><span class="k">${kmFull(s.kmp)} prior.</span><span class="m">${[...s.nombres].slice(0,2).join(', ')} · cruza ${s.muns.size} alcaldía${s.muns.size===1?'':'s'}${it.via? ` · coincide con la red vial ${it.via}`:''}</span>`; }
      else { const s=I.stStat.get(it.nid); const cols = it.col? [it.col] : [...s.cols.keys()].filter(Boolean); const one = cols.length===1;
        html = `<span class="ty">Calle</span><span class="nm">${omniMark(META.names[it.nid], R.qt)}</span><span class="k">${kmFull(it.col? s.cols.get(it.col) : s.kmp)} prior.</span><span class="m">${one? META.colonias[cols[0]].n+' · '+META.munNames[it.col? munIndex[META.colonias[it.col].m] : [...s.muns][0]] : `${fmt.format(cols.length)} calles con este nombre en ${s.muns.size===1? 'distintas colonias' : fmt.format(s.muns.size)+' alcaldías'} · elige dónde en el listado`}</span>`; }
      li.innerHTML = html; const n=omniItems.length; omniItems.push(it);
      li.onmousedown = e=>{ e.preventDefault(); omniPick(omniItems[n]); }; omniList.appendChild(li); } }
  if (R.why){ const w=document.createElement('li'); w.className='why'; w.setAttribute('role','presentation'); w.textContent=R.why; omniList.appendChild(w); }
  omniList.hidden=false; omni.setAttribute('aria-expanded','true'); }
function omniSetActive(i){ const lis=[...omniList.querySelectorAll('li.opt')]; if(!lis.length) return; omniActive=(i+lis.length)%lis.length;
  lis.forEach((l,k)=>l.classList.toggle('active',k===omniActive)); lis[omniActive].scrollIntoView({block:'nearest'}); omni.setAttribute('aria-activedescendant', lis[omniActive].id); }
function omniClose(){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); omni.removeAttribute('aria-activedescendant'); }
function omniPick(it){
  omniClose(); omni.value=''; omniClear.hidden=true; omni.blur();
  if (it.t==='alc'){ if (isGC() && selAv!==null){ selAv=null; highlight=null; } selEl.value=String(it.i); setSel(String(it.i)); }
  else if (it.t==='col'){ pickColonia(it.i); }
  else if (it.t==='av'){ if (sel!==null && !avStat(it.a).muns.has(sel)){ sel=null; selEl.value=''; } pickAvenida(it.a); }
  else { const s=omniIndex().stStat.get(it.nid); if (isGC()) setResp('alc');
    const cols = it.col? [it.col] : [...s.cols.keys()].filter(Boolean);
    if (cols.length===1){ pickColonia(cols[0]); const key=it.nid*4096+cols[0]; const st=streetIdx.get(key); if (st){ highlightStreet(key, st); } setTab('list'); renderResults(); }
    else { const muns=[...s.muns]; if (muns.length===1){ if (sel!==muns[0] || selCol!==null){ selEl.value=String(muns[0]); setSel(String(muns[0])); } } else if (sel!==null || selCol!==null){ selEl.value=''; setSel(''); }
      $('q').value = META.names[it.nid]; renderResults(); setTab('list');
      // varias calles con el mismo nombre: se resaltan todas y el mapa se acerca a ellas
      const idx = []; for (const st of streetIdx.values()) if (st.nid===it.nid) for (const i of st.idx) idx.push(i);
      if (idx.length) highlightStreet('nombre-'+it.nid, {idx}); } }
  collapseSheet(); }
omni.addEventListener('input', ()=>{ omniClear.hidden = !omni.value; omniRender(); });
omni.addEventListener('focus', ()=>{ if (isPhone() && sheetState==='peek') setSheetState('full'); if (omni.value.trim().length>=2) omniRender(); });
omni.addEventListener('blur', ()=> setTimeout(omniClose, 150));
omni.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ e.preventDefault(); if (omniList.hidden) omniRender(); omniSetActive(omniActive+1); }
  else if (e.key==='ArrowUp'){ e.preventDefault(); omniSetActive(omniActive-1); }
  else if (e.key==='Enter'){ if (!omniList.hidden && omniItems.length){ e.preventDefault(); omniPick(omniItems[omniActive>=0? omniActive : 0]); } }
  else if (e.key==='Escape'){ if (!omniList.hidden){ e.stopPropagation(); omniClose(); } else if (omni.value){ omni.value=''; omniClear.hidden=true; } } });
omniClear.onclick = ()=>{ omni.value=''; omniClear.hidden=true; omniClose(); omni.focus(); };

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
    if (respOn.alc) for(let i=0;i<N;i++){ const x=MID[2*i], y=MID[2*i+1]; if (Math.abs(x-lon)>dLon || Math.abs(y-lat)>dLat || F.gc[i]) continue;
      const [d,dx,dy] = pathDist(POS, start[i], start[i+1], lon, lat); if (d<any.d){ any.d=d; any.k='fr'; any.i=i; any.dx=dx; any.dy=dy; }
      if (F.prio[i]>=3 && d<=R) out.push({k:'fr', i, d, dx, dy}); }
    if (respOn.gc) for(let i=0;i<NV;i++){ const x=VMID[2*i], y=VMID[2*i+1]; if (Math.abs(x-lon)>dLon+0.01 || Math.abs(y-lat)>dLat+0.01) continue;
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
  const nm = o.k==='fr'? (sinNombreFr(o.i)? SIN_NOMBRE : `${META.tipos[F.tipo[o.i]] && META.tipos[F.tipo[o.i]]!=='—'? META.tipos[F.tipo[o.i]]+' ':''}${META.names[F.name[o.i]]}`) : VPC.nomenclat[VP.nom[o.i]];
  const sub = o.k==='fr'? `${META.prio[pr]} · ${(META.colonias[F.col[o.i]]||{}).n || 'colonia no identificada'}` : `${META.prio[pr]} · vialidad primaria (Gobierno Central)`;
  return {c, nm, sub};
}
function locHtml(){
  if (!myPos) return '';
  const p = myPos, w = whereAmI(p.lon, p.lat);
  const accTxt = `precisión ±${fmt0.format(Math.max(1, Math.round(p.acc)))} m`;
  const head = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i style="background:rgb(${LOC_BLUE})"></i>Tu ubicación · ${accTxt}</span>`;
  const privacy = `<div class="cardnote">Tu ubicación solo se usa en este teléfono; la herramienta no la envía ni la guarda. Si enciendes un mapa de fondo, su proveedor recibe la zona del mapa que estás viendo.</div>`;
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
function locMsg(title, body){ const c=$('card'); pinned={kind:'loc', i:0}; c.innerHTML = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i style="background:rgb(${LOC_BLUE})"></i>Tu ubicación</span><h3>${title}</h3><div class="empty-note">${body}</div><div class="cardnote">Tu ubicación solo se usa en este teléfono; la herramienta no la envía ni la guarda. Si enciendes un mapa de fondo, su proveedor recibe la zona del mapa que estás viendo.</div>`; c.hidden=false; c.querySelector('.close').onclick=hideCard; }
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

// Arranque: estado inicial de la herramienta.
// ---------- arranque ----------
if (isPhone()) setLayer('fr', false);   // en pantallas chicas se dibujan primero las colonias
document.body.dataset.resp = resp;
setSel('');
setTab('res');
if (isPhone()) setSheetState('peek');
})().catch(err=>{ console.error(err); const l=document.getElementById('loader'); l.hidden=false; l.querySelector('div').innerHTML = `<div class="cabin" style="font-weight:600;font-size:16px">No fue posible cargar el mapa</div><div style="font-size:12px;margin-top:6px;max-width:320px">${(err && err.message)||err}. Recarga la página; si persiste, avisa al Sistema de Información Ambiental.</div>`; });
