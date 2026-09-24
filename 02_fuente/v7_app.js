<script>
(async function(){
'use strict';
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

// ---------- decode ----------
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
const midLon = i => { const a=start[i], b=start[i+1]; return (POS[2*a]+POS[2*(b-1)])/2; };
const midLat = i => { const a=start[i], b=start[i+1]; return (POS[2*a+1]+POS[2*(b-1)+1])/2; };

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

// ---------- theme tokens ----------
function css(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
function hex(h, a=255){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),a]; }
let T = {};
function readTokens(){
  T.prio = PRIO_VARS.map(v=>hex(css(v)));
  T.alc = hex(css('--map-alc')); T.col = hex(css('--map-col')); T.label = hex(css('--map-label')); T.sel = hex(css('--map-sel')); T.gold = hex(css('--dorado')); T.vpctx = hex(css('--map-vp'));
  T.ground = css('--ground');
}
readTokens();

// ---------- state ----------
let resp = 'alc';         // 'alc' | 'gc' | 'both'  → responsable consultado
let sel = null;           // índice de alcaldía o null
let selCol = null;        // id de colonia o null
let selAv = null;         // id de avenida (NOMENCLAT) o null — solo modo Gobierno Central
let highlight = null;     // {nameId, idx:[...]} (calles) | {avId, idx:[...]} (vialidades)
let pinned = null;        // {kind:'fr'|'vp', i}
let viewState = null;
const munIndex = Object.fromEntries(META.muns.map((m,i)=>[m,i]));
const isGC = ()=> resp==='gc';
const showsFrontsMode = ()=> resp!=='gc';

// ---------- atributos por vértice (frentes) ----------
let COLORS = new Uint8Array(V*4);
function buildColors(){
  for(let i=0;i<N;i++){ const c=T.prio[F.prio[i]]; const a = ((sel===null || F.mun[i]===sel) && (selCol===null || F.col[i]===selCol))? 255 : 38; for(let k=start[i];k<start[i+1];k++){ const o=4*k; COLORS[o]=c[0]; COLORS[o+1]=c[1]; COLORS[o+2]=c[2]; COLORS[o+3]=a; } }
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

// ---------- context geometry ----------
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
const showCol = ()=> showColB && !isGC(), showFr = ()=> showFrB, colOnly = ()=> showColB && !showFrB && !isGC(), alcOnly = ()=> showAlcB && !showColB && !showFrB;
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

// ---------- deck ----------
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
function flyTo(vs, ms=900){ if (NOMAP){ viewState={...viewState,...vs}; return; } dk.setProps({initialViewState:{...vs, transitionDuration: matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms, transitionInterpolator:new FlyToInterpolator()}}); viewState={...viewState,...vs}; }

function frontsData(){ return {length:N, startIndices:start, attributes:{ getPath:{value:POS,size:2}, getColor:{value:COLORS,size:4,normalized:true}, getFilterValue:{value:FILTER,size:2} }}; }
function vpData(){ return {length:NV, startIndices:vstart, attributes:{ getPath:{value:VPOS,size:2}, getColor:{value:VCOLORS,size:4,normalized:true}, getFilterValue:{value:VFILTER,size:2} }}; }
// ---------- C3 · nombres de calle desde los propios frentes (zoom ≥ 15) ----------
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
// ---------- C3 · barra de escala ----------
function updateScale(){ const el=$('scalebar'); if(!el) return; const mpp = 40075016.686*Math.cos(viewState.latitude*Math.PI/180)/(512*Math.pow(2,viewState.zoom));
  const steps=[10,20,50,100,200,500,1000,2000,5000,10000,20000]; let m=steps[0]; for(const st of steps){ if(st/mpp<=110) m=st; }
  el.querySelector('i').style.width = Math.round(m/mpp)+'px'; el.querySelector('span').textContent = m>=1000? (m/1000)+' km' : m+' m'; }
function layers(){
  const z = viewState.zoom;
  const L = [];
  if (showAlcB) L.push(new PolygonLayer({id:'alcaldias', data:ALC_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> visible[domOf(d.i)]? [...T.prio[domOf(d.i)].slice(0,3), (sel===null || d.i===sel)? 170 : 45] : [0,0,0,0], pickable:true, autoHighlight: alcOnly(), highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, sel, visible.join(''), resp]}}));
  if (showCol()) L.push(new PolygonLayer({id:'col-fill', data:COL_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> (d.prio>=0 && visible[d.prio])? [...T.prio[d.prio].slice(0,3), selCol!==null? (d.i===selCol? (showFrB? 60 : 190) : (showFrB? 14 : 40)) : (colOnly()? 150 : 80)] : [0,0,0,0], pickable: true, autoHighlight: true, highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, showColB, showFrB, visible.join(''), resp, selCol]}}));
  L.push(new PolygonLayer({id:'alc', data:ALC_PARTS, getPolygon:d=>d.poly, filled:false, stroked:true, getLineColor:T.alc, lineWidthMinPixels:1, lineWidthMaxPixels:1.5, updateTriggers:{getLineColor:[T.alc]}}));
  if ((z>=12.2 && !isGC()) || colOnly()) L.push(new PathLayer({id:'cols', data:COL_PATHS, getPath:d=>d.path, getColor:T.col, widthMinPixels:0.7, widthMaxPixels:1, opacity:.7, updateTriggers:{getColor:[T.col]}}));
  // frentes de manzana (responsabilidad de las alcaldías)
  if (showFr() && showsFrontsMode()) L.push(new PathLayer({id:'fronts', data:frontsData(), _pathType:'open', widthUnits:'meters', getWidth:6, widthMinPixels:1, widthMaxPixels:9,
    pickable:true, autoHighlight:true, highlightColor:T.gold,
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
  if (showFr() || isGC()) L.push(new PathLayer({id:'vias', data:vpData(), _pathType:'open', widthUnits:'meters', getWidth: resp==='alc'? 7 : 14, widthMinPixels: resp==='alc'? 1.2 : 2.2, widthMaxPixels: resp==='alc'? 5 : 12, capRounded:true, jointRounded:true,
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
    L.push(new PathLayer({id:'hl', data:{length:idx.length, startIndices:st, attributes:{getPath:{value:p,size:2}}}, _pathType:'open', widthUnits:'meters', getWidth:14, widthMinPixels:4, widthMaxPixels:16, getColor:[T.gold[0],T.gold[1],T.gold[2],160], pickable:false}));
  }
  L.push(new TextLayer({id:'alc-labels', data:ALC_LABELS, getPosition:d=>d.pos, getText:d=>d.text, getSize: z<11.5? 13 : 15, getColor:T.label, characterSet:charset,
    fontFamily:'Cabin, Roboto, sans-serif', fontWeight:600, fontSettings:{sdf:true}, outlineWidth:5, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', visible: z<14, extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority: d=> d.text.length, updateTriggers:{getColor:[T.label], getSize:[z<11.5]}}));
  if (z>=13.6 && !isGC()) L.push(new TextLayer({id:'col-labels', data: sel===null? COL_LABELS : COL_LABELS.filter(c=>munIndex[c.mun]===sel), getPosition:d=>d.pos, getText:d=>d.text.toUpperCase(), getSize:10.5, getColor:[T.label[0],T.label[1],T.label[2],200], characterSet:charset,
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:{sdf:true}, outlineWidth:4, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority: d=> -d.text.length, updateTriggers:{getColor:[T.label], data:[sel]}}));
  if (!isGC() && showFrB && z>=15){ const sd=streetLabelData(); if (sd.length) L.push(new TextLayer({id:'st-labels', data:sd, getPosition:d=>d.pos, getText:d=>d.text, getAngle:d=>d.ang, getSize:12, getColor:[34,38,42,235], characterSet:'auto',
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:{sdf:true}, outlineWidth:6, outlineColor:[255,255,255,235], getTextAnchor:'middle', getAlignmentBaseline:'center',
    extensions:[new CollisionFilterExtension()], collisionGroup:'labels', getCollisionPriority:d=>d.len })); }
  return L;
}
const dot = c => `<i class="dot" style="background:rgb(${c[0]},${c[1]},${c[2]})"></i>`;
function featHtml(i, compact){
  const c = T.prio[F.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nm = META.names[F.name[i]] || 'Sin nombre'; const tp = META.tipos[F.tipo[i]] || '—'; const col = META.colonias[F.col[i]];
  const ban = META.disp[(F.flags[i]>>3)&7];
  const cpTxt = col.cp ? col.cp.padStart(5,'0') : ''; const colTxt = col.n ? `${col.n}${cpTxt? ' · CP '+cpTxt : ''}` : 'Colonia no identificada';
  if (compact) return `<span class="pr" style="background:${rgb}"></span><b>${tp!=='—'? tp+' ':''}${nm}</b><br><span class="m">${col.n||'Colonia no identificada'} · ${F.len[i]} m · Prioridad ${META.prio[F.prio[i]]}</span>`;
  const cp = col.p>=0 ? META.prio[col.p] : '—';
  const cc = col.p>=0 ? T.prio[col.p] : null;
  const respTxt = F.gc[i]? `Gobierno Central · sobre ${VPC.nomenclat[VP.nom[F.vp[i]]]}` : 'Alcaldía';
  // si la colonia del frente ya es la consultada, sus datos están en el panel: no se repiten aquí
  const dupCol = (selCol!==null && F.col[i]===selCol);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad ${META.prio[F.prio[i]]}</span>
    <h3>${tp!=='—'? tp+' ':''}${nm}</h3>
    <div class="sub">${colTxt} · ${META.munNames[F.mun[i]]}</div>
    <dl><dt>Responsable</dt><dd>${respTxt}</dd>
    <dt>Tipo de vialidad</dt><dd>${tp}</dd>
    <dt>Longitud del frente</dt><dd>${fmt.format(F.len[i])} m</dd>
    <dt>Banqueta (INEGI)</dt><dd>${ban}</dd>
    ${dupCol? '' : `<dt>Prioridad de la colonia</dt><dd>${cc? dot(cc):''}${cp}</dd>
    <dt>Desarrollo social (IDS) de la colonia</dt><dd>${col.ids||'—'}</dd>
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
// I5 · acciones para salir a campo (enlaces externos y copia de coordenadas)
function fieldActs(lat, lon){ const ll = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return `<div class="field-acts">
    <a class="fa" href="https://www.google.com/maps/dir/?api=1&destination=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>Cómo llegar</a>
    <a class="fa" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="3"/><path d="M8 21v-5l-2-3 3-3h6l3 3-2 3v5"/></svg>Street View</a>
    <button class="fa" type="button" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg><span>Copiar coordenadas</span></button>
  </div>`; }
const vpMid = i => { const a=vstart[i], b=vstart[i+1]-1, m=Math.floor((a+b)/2); return [VPOS[2*m+1], VPOS[2*m]]; };
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
    <dt>Desarrollo social (IDS)</dt><dd>${c.ids||'—'}</dd>
    ${c.nbi? `<dt>Pobreza (NBI)</dt><dd>${fmt.format(c.nbi)} personas en su unidad territorial</dd>`:''}</dl>
    <div class="acts">${!ntot? '<button class="btn secondary act" id="card-alc" type="button">Ver la alcaldía</button>' : showFrB? '' : '<button class="btn secondary act" id="card-calles" type="button">Ver sus calles</button>'}${ntot? '<button class="btn secondary act" id="card-ficha" type="button">Ficha (PDF)</button>' : ''}</div>`;
}
const dk = new DeckGL({
  container: mapEl, views: new MapView({repeat:false}), controller:{dragRotate:false, touchRotate:false, minZoom:9.4, maxZoom:18.5},
  initialViewState: viewState, layers: layers(), style:{background:'transparent'},
  onViewStateChange: ({viewState:vs})=>{ vs = {...vs, longitude: Math.min(Math.max(vs.longitude, CITY_BOUNDS[0]-0.05), CITY_BOUNDS[2]+0.05), latitude: Math.min(Math.max(vs.latitude, CITY_BOUNDS[1]-0.04), CITY_BOUNDS[3]+0.04)}; const zc = Math.floor(vs.zoom*10); const prev = Math.floor(viewState.zoom*10); viewState = vs; let moved=false; if (vs.zoom>=15 && lblCenter){ const w=mapEl.clientWidth||800; const mpp=40075016.686*Math.cos(vs.latitude*Math.PI/180)/(512*Math.pow(2,vs.zoom)); const dx=(vs.longitude-lblCenter[0])*111320*Math.cos(vs.latitude*Math.PI/180), dy=(vs.latitude-lblCenter[1])*110540; moved = Math.hypot(dx,dy)/mpp > w*0.35; } if (zc!==prev || moved) rerender(); updateScale(); return vs; },
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
function showCard(kind, i){ pinned={kind,i}; const c=$('card');
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
$('zin').onclick = ()=> flyTo({...viewState, zoom:viewState.zoom+1}, 300);
$('zout').onclick = ()=> flyTo({...viewState, zoom:Math.max(9.4, viewState.zoom-1)}, 300);
function scopeView(){ const P = matchMedia('(max-width:860px)').matches? 0.45 : 1;
  if (selAv!==null){ const b=avBounds(selAv, sel); const pad=0.003; const vs=fitTo([b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad], 60*P); vs.zoom=Math.min(vs.zoom,15.5); return vs; }
  return selCol!==null? fitTo(colBounds(selCol), 60*P) : sel===null? fitTo(CITY_BOUNDS,24*P) : fitTo(META.bounds[META.muns[sel]], 40*P); }
$('zfit').onclick = ()=> flyTo(scopeView());

// ---------- legend ----------
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

// ---------- responsable ----------
const RESP_TXT = {alc:'Alcaldía', gc:'Gobierno Central', both:'Ambos'};
// dos casillas combinables: Alcaldía y Gob. Central; al menos una activa
const respOn = { alc:true, gc:false };
document.querySelectorAll('button[data-resp]').forEach(b=>{ b.onclick = ()=>{ const k=b.dataset.resp; const other = k==='alc'? respOn.gc : respOn.alc; if (respOn[k] && !other) return; respOn[k]=!respOn[k]; setResp(respOn.alc && respOn.gc? 'both' : respOn.gc? 'gc' : 'alc'); }; });
function setResp(v){
  respOn.alc = v!=='gc'; respOn.gc = v!=='alc';
  document.querySelectorAll('button[data-resp]').forEach(b=>b.setAttribute('aria-pressed', String(respOn[b.dataset.resp])));
  if (resp===v) return; resp=v;
  document.body.dataset.resp = v;
  if (isGC()){ colBefore = showColB; if (showColB && !showFrB){ setLayer('col',false); setLayer('fr',true); } else if (showColB) setLayer('col',false); selCol=null; colQ.value=''; colClear.hidden=true; colList.hidden=true; }
  else { selAv=null; avQ.value=''; avClear.hidden=true; avList.hidden=true; if (colBefore && !showColB && !showAlcB) setLayer('col',true); colBefore=false; if(!showAlcB && !showColB && !showFrB) setLayer('col',true); }
  highlight=null; hideCard(); $('q').value=''; $('q').placeholder = isGC()? 'Buscar avenida o eje…' : 'Buscar calle o avenida…';
  document.querySelector('.seg.lvl button[data-lvl="col"]').hidden = isGC();
  document.querySelector('.seg.lvl button[data-lvl="fr"]').innerHTML = isGC()? '<i></i>Vialidades' : '<i></i>Calles';
  document.querySelector('.seg.lvl').classList.toggle('two', isGC());
  $('lvl-note').textContent = isGC()? 'Alcaldías va sola, con la prioridad de sus vialidades primarias.' : 'Colonias y Calles se combinan; Alcaldías va sola.';
  $('resp-note').textContent = v==='alc' ? 'Frentes de manzana que plantan las alcaldías; las vialidades primarias aparecen en gris. Puedes activar las dos.'
    : v==='gc' ? 'Vialidades primarias y de acceso controlado que atiende el Gobierno de la Ciudad, con su propia prioridad.'
    : 'Las dos redes juntas: cifras, barras y descargas se muestran por separado para cada responsable.';
  $('col-field').hidden = isGC(); $('av-field').hidden = !isGC();
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
$('reset-all').onclick = ()=>{ setResp('alc'); setLayer('alc',false); setLayer('col',true); setLayer('fr',true); for(let k=0;k<5;k++) visible[k]=true; document.querySelectorAll('.legend .row').forEach(r=>{ r.classList.remove('off'); r.setAttribute('aria-checked','true'); }); buildFilter(); buildVP(); selEl.value=''; setSel(''); };

// estadísticas por colonia (frentes a cargo de la alcaldía)
let COLSTAT = null;
function colStat(id){ if(!COLSTAT){ COLSTAT = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i]) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; if(p>=3){ s.kmp+=k; s.np++; } } } return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(p>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// resumen de vialidades en un ámbito (alcaldía y/o avenida)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(sel!==null && VP.mun[i]!==sel) continue; if(selAv!==null && VP.nom[i]!==selAv) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(p>=3) s.recsp.add(VP.rec[i]); } return s; }

// ---------- summaries ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0,nbi:0})); let t=0,p=0,nbi=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(c.p>=3){ alc[m].p+=pb; p+=pb; alc[m].nbi+=c.nbi||0; nbi+=c.nbi||0; } }
  return {alc, city:{t,p,nbi}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
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
  const emptyCol = selCol!==null && sum(fs.n)===0;  // I3 · colonia sin frentes a cargo de la alcaldía
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`de frente prioritario ${amb}<br>(Muy Alta + Alta)`, l2:`de frentes ${amb}`, l3:`frentes prioritarios ${amb}`+(sel!==null && selCol===null? '<br>'+rank[sel]+'.º lugar de 16 alcaldías en km prioritarios':'')});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV = selAv!==null? (sel===null? 'de la avenida en toda la ciudad' : 'de la avenida dentro de la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`de vialidad primaria prioritaria ${ambV1}<br>(Muy Alta + Alta)`, l2:ambV, l3:`tramos prioritarios ${ambV1}<br>de ${fmt.format(vs.recs.size)} tramos`+(sel!==null && selAv===null? '<br>'+rankVP[sel]+'.º lugar de 16 alcaldías en km prioritarios':'')}) : '';
  const pobLine = (()=>{ if (isGC()) return '';
    if (selAv!==null) return '';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · desarrollo social ${c.ids.toLowerCase()}`:''}</div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><b>${hab(P.p)}</b> viven en colonias prioritarias ${sel===null?'de la ciudad':'de la alcaldía'} · ${pct(P.p,P.t)} de su población</div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = (resp==='both')? '' : pobLine; pb.hidden = !pb.innerHTML; }
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
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios · a cargo de la Alcaldía</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios · a cargo del Gob. Central</small></div>`}
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
  // M1 · km por categoría del ámbito consultado, en la leyenda
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmTxt(ls.km[+e.dataset.k]); });
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
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. Iztapalapa y Gustavo A. Madero concentran ${pct(kmPrio(VPC.summ['007'])+kmPrio(VPC.summ['005']), vCityPrioKm)} de los km prioritarios de la ciudad.`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
  } else if (emptyCol){
    note.textContent = EMPTY_MSG;
  } else {
    note.textContent = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. Iztapalapa y Gustavo A. Madero concentran ${pct(kmPrio(META.summ['007'])+kmPrio(META.summ['005']), cityPrioKm)} de los km prioritarios de la ciudad.`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(fs.n[3]+fs.n[4])+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (resp==='alc' && selCol===null? ` Además, ${fmt0.format(sum(gcs.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'} (${fmt0.format(kmPrio(gcs))} km prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.` : '');
  }
}

// ---------- streets / avenues index ----------
let streetIdx = null; // Map clave -> {nid, col, idx:[], km, kmp, np, tipos:Set, cols:Set}; clave = calle dentro de su colonia
let sinNombre = {km:0, kmp:0, n:0};  // frentes sin nombre de vialidad en INEGI dentro del ámbito
function buildStreets(){
  streetIdx = new Map(); sinNombre = {km:0, kmp:0, n:0};
  for(let i=0;i<N;i++){ if (F.gc[i]) continue; if (sel!==null && F.mun[i]!==sel) continue; if (selCol!==null && F.col[i]!==selCol) continue; const nid=F.name[i];
    if (PLACEHOLDER.has(nid)){ const k=F.len[i]/1000; sinNombre.km+=k; sinNombre.n++; if(F.prio[i]>=3) sinNombre.kmp+=k; continue; }
    const col=F.col[i]; const key = nid*4096 + col; let s=streetIdx.get(key); if(!s){ s={nid, col, idx:[],km:0,kmp:0,np:0,tipos:new Set(),cols:new Set()}; streetIdx.set(key,s); }
    s.idx.push(i); s.km+=F.len[i]/1000; if(F.prio[i]>=3){ s.kmp+=F.len[i]/1000; s.np++; } s.tipos.add(META.tipos[F.tipo[i]]); if(col) s.cols.add(META.colonias[col].n); }
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
const PLACEHOLDER = new Set(META.names.map((n,i)=>[norm(n),i]).filter(([n])=> n==='' || n==='ninguno' || n==='sin referencia' || n.startsWith('manzana o edificacion')).map(x=>x[1]));
function renderAlcRanking(){
  const items = META.muns.map((m,i)=>i).sort((a,b)=> rankOf(a)-rankOf(b));
  $('search-title').textContent = isGC()? 'Alcaldías ordenadas por km prioritarios de vialidad primaria' : 'Alcaldías ordenadas por km de frente prioritario'; $('search-count').textContent='16 alcaldías de la ciudad';
  const ul=$('results'); ul.innerHTML='';
  for(const i of items){ const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${dot(pc)}${rankOf(i)}. ${META.munNames[i]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${pct(kmPrio(s),tot)} de ${isGC()? 'sus km de vialidad primaria':'sus km de frente'} es prioritario</div></div>
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
    li.innerHTML = `<div><div class="n">${pc? dot(pc):''}${c.n}</div><div class="t">${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.ids? ' · Desarrollo social '+c.ids.toLowerCase():''}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes de la colonia son prioritarios</small></div>`;
    const go=()=>pickColonia(i); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if(!items.length) ul.innerHTML='<li class="empty">Sin colonias con frente prioritario.</li>';
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
function renderResults(){
  const q = norm($('q').value.trim());
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
    if(!items.length){ ul.innerHTML=`<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>`; return; }
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
  if (q.length>=2){ for(const [key,s] of streetIdx){ if (NAMES_N[s.nid].includes(q)) items.push([key,s]); } $('search-title').textContent=`Calles encontradas ${scF}`; }
  else { for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } $('search-title').textContent=`Calles con más km de frente prioritario ${scF}`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length; items = items.slice(0, q.length>=2? 40 : 10);
  $('search-count').textContent = selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q.length>=2?'':' con frente prioritario'}`
    : q.length>=2 ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  if(!items.length){ ul.innerHTML = `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>`; return; }
  for(const [key,s] of items){
    const li = document.createElement('li'); li.tabIndex=0;
    const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    li.innerHTML = `<div><div class="n">${META.names[s.nid]||'Sin nombre'}</div><div class="t">${donde? donde+' · ':''}${tipos}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${s.np} de ${s.idx.length} frentes prioritarios</small></div>`;
    if (highlight && highlight.nameId===key) li.classList.add('active');
    const go = ()=>{ highlightStreet(key, s); [...ul.children].forEach(x=>x.classList.remove('active')); li.classList.add('active'); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter'){ go(); } };
    ul.appendChild(li);
  }
  if (q.length<2 && sinNombre.kmp>0){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI ("Ninguno" o "Manzana o edificación contigua"). No aparecen en esta lista, pero sí en el Excel de frentes.`; ul.appendChild(li); }
}
function highlightStreet(nid, s){
  highlight = {nameId:nid, idx:s.idx};
  let w=180,sN=90,e=-180,n=-90; for(const i of s.idx){ for(let k=start[i];k<start[i+1];k++){ const x=POS[2*k],y=POS[2*k+1]; if(x<w)w=x; if(x>e)e=x; if(y<sN)sN=y; if(y>n)n=y; } }
  const pad = 0.0015; const vs = fitTo([w-pad,sN-pad,e+pad,n+pad], 60); vs.zoom = Math.min(vs.zoom, 16.5);
  hideCard(); collapseSheet(); flyTo(vs, 1000); rerender();
}
$('q').addEventListener('input', renderResults);

// ---------- alcaldía select ----------
const selEl = $('alc');
META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const o=document.createElement('option'); o.value=i; o.textContent=META.munNames[i]; selEl.appendChild(o); });
function renderAlcInfo(){
  const box=$('alcinfo'); if (sel===null){ box.hidden=true; return; }
  const s=summOf(sel); const tot=sum(s.km); const d=domOf(sel); const pc=T.prio[d];
  const gcs = META.summ_gc[META.muns[sel]]; const vs = VPC.summ[META.muns[sel]];
  box.hidden=false; box.innerHTML = isGC()
    ? `${dot(pc)}<b>Vialidades primarias · prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los km de vialidad primaria de la alcaldía)<br>${rankVP[sel]}.º lugar de 16 alcaldías en km prioritarios de vialidad primaria · ${fmt0.format(tot)} km de vialidad primaria en toda la alcaldía`
    : `${dot(pc)}<b>Prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los frentes de la alcaldía)<br>${rank[sel]}.º lugar de 16 alcaldías en km prioritarios · ${fmt0.format(tot)} km de frentes en toda la alcaldía${resp==='alc'? `<br><span class="gcline">Gobierno Central atiende en esta alcaldía ${fmt0.format(sum(vs.km))} km de vialidades primarias (${fmt0.format(kmPrio(vs))} km prioritarios).</span>`:''}`;
}
function renderColInfo(){
  const box = $('colinfo'); if (selCol===null){ box.hidden=true; return; }
  const c = META.colonias[selCol]; const pc = c.p>=0? T.prio[c.p] : null;
  box.hidden=false; box.innerHTML = `${pc? dot(pc):''}<b>Prioridad de la colonia: ${c.p>=0? META.prio[c.p] : '—'}</b><br>Desarrollo social (IDS): ${c.ids||'—'}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' hab.':''}${c.ut? `<br><span class="utline">Unidad territorial ${c.ut}: ${fmt.format(c.utpob||0)} hab., ${fmt.format(c.nbi||0)} en pobreza (NBI)</span>`:''}`;
}
function renderAvInfo(){
  const box=$('avinfo'); if (selAv===null){ box.hidden=true; return; }
  const s=avStat(selAv); const d=dom({km:s.kmByP}); const pc=T.prio[d];
  const vsA = vpSumm(); const kmA = sum(vsA.km), kmpA = kmPrio(vsA);
  box.hidden=false; box.innerHTML = `${dot(pc)}<b>Prioridad predominante de la avenida: ${META.prio[d]}</b> (${pct(s.kmByP[d], s.km)} de los km de la avenida en toda la ciudad)<br>Red vial: ${[...s.nombres].join(', ')} · ${fmt1.format(s.km)} km de la avenida en toda la ciudad · Cruza: ${[...s.muns].map(m=>META.munNames[m]).join(', ')}${sel!==null? `<br><span class="gcline">Las cifras de abajo son solo del tramo en la alcaldía ${META.munNames[sel]}: ${kmFull(kmA)} de esta avenida, ${kmFull(kmpA)} prioritarios${kmpA===0? ' (ningún tramo de esta avenida en la alcaldía resultó Muy Alta o Alta)':''}.</span>`:''}`;
}
function refresh(){ buildColors(); buildVP(); buildStreets(); buildAvenues(); renderSummary(); renderResults(); renderAlcInfo(); renderColInfo(); renderAvInfo(); renderLegendNote(); rerender(); flyTo(scopeView());
  const gc = isGC();
  $('dl-frentes').hidden = !respOn.alc; $('dl-calles').hidden = !respOn.alc; $('dl-tramos').hidden = !respOn.gc; $('dl-avenidas').hidden = !respOn.gc;
  $('dl-frentes').disabled = $('dl-calles').disabled = (sel===null);
  $('dl-status').textContent = (respOn.alc && sel===null)? 'Selecciona una alcaldía para descargar su listado.' : '';
  $('dl-ficha').hidden = !(respOn.alc && selCol!==null); $('dl-ficha-alc').hidden = !(respOn.alc && sel!==null && selCol===null);
  $('dl-ficha-vpalc').hidden = !(respOn.gc && sel!==null && selAv===null); $('dl-ficha-av').hidden = !(gc && selAv!==null);  renderCrumb(); renderScopeTitle(); updTabLabel(); renderActions(); }
function setSel(v){
  sel = v===''? null : +v; selCol=null; selAv=null; highlight=null; hideCard(); $('q').value='';
  colQ.value=''; colClear.hidden=true; colList.hidden=true; avQ.value=''; avClear.hidden=true; avList.hidden=true; colLabel(); collapseSheet(); refresh();
}
// ---------- colonia: autocompletar ----------
const colQ = $('col-q'), colList = $('col-list'), colClear = $('col-clear');
// el catálogo de colonias trae abreviaturas (Pgal, Sto, Ampl…): se expanden para que la búsqueda funcione con el nombre completo
const ABREV = {pgal:'pedregal', sto:'santo', sta:'santa', ampl:'ampliacion', ampliacion:'ampliacion', secc:'seccion', ote:'oriente', pte:'poniente', nte:'norte', gral:'general', prol:'prolongacion', fracc:'fraccionamiento', cjto:'conjunto', uh:'unidad habitacional', bo:'barrio', pblo:'pueblo'};
const expand = s => norm(s).split(/\s+/).map(t=>ABREV[t]||t).join(' ');
const COL_N = META.colonias.map(c=>expand(c.n));
const COL_UT = META.colonias.map(c=>expand(c.ut||''));  // la unidad territorial ayuda cuando el nombre del catálogo es distinto
let colItems = [], colActive = -1;
function colLabel(){ colQ.placeholder = sel===null? 'Buscar colonia en toda la ciudad…' : 'Escribe el nombre de la colonia…'; avQ.placeholder = sel===null? 'Buscar avenida en toda la ciudad…' : 'Escribe el nombre de la avenida…'; }
function colSearch(q){
  q = expand(q.trim()); if (q.length<2) return [];
  const m = sel===null? null : META.muns[sel]; const starts=[], inc=[];
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const n=COL_N[i]; if(n.startsWith(q)) starts.push(i); else if(n.includes(q) || COL_UT[i].includes(q)) inc.push(i); }
  const byName = (a,b)=> META.colonias[a].n.localeCompare(META.colonias[b].n,'es') || (META.colonias[a].cp||'').localeCompare(META.colonias[b].cp||'');
  return starts.concat(inc).sort(byName).slice(0, 30);
}
function colRender(){
  colList.innerHTML=''; colActive=-1;
  if (!colItems.length){ const q=colQ.value.trim(); if(q.length>=2){ colList.innerHTML='<li class="empty">Sin coincidencias'+(sel!==null?' en '+META.munNames[sel]:'')+'.</li>'; colList.hidden=false; } else colList.hidden=true; colQ.setAttribute('aria-expanded', String(!colList.hidden)); return; }
  for(const id of colItems){ const c=META.colonias[id]; const pc = c.p>=0? T.prio[c.p]:null; const li=document.createElement('li'); li.setAttribute('role','option'); li.dataset.id=id;
    li.innerHTML = `<i class="dot" style="background:${pc? `rgb(${pc[0]},${pc[1]},${pc[2]})`:'transparent'}"></i><span>${c.n}</span><span class="cp">${c.cp? 'CP '+c.cp.padStart(5,'0'):''}</span><span class="m">${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}</span>`;
    li.onmousedown = e=>{ e.preventDefault(); pickColonia(id); }; colList.appendChild(li); }
  colList.hidden=false; colQ.setAttribute('aria-expanded','true');
}
function colSetActive(i){ const lis=[...colList.querySelectorAll('li[role=option]')]; if(!lis.length) return; colActive=(i+lis.length)%lis.length; lis.forEach((l,k)=>l.classList.toggle('active',k===colActive)); lis[colActive].scrollIntoView({block:'nearest'}); }
function pickColonia(id){
  if (isGC()) setResp('alc');
  const c = META.colonias[id]; const m = munIndex[c.m];
  colList.hidden=true; colQ.setAttribute('aria-expanded','false'); colQ.value = c.n; colClear.hidden=false;
  if (sel!==m){ sel=m; selEl.value=String(m); colLabel(); }
  selCol=id; selAv=null; highlight=null; hideCard(); $('q').value=''; if (isPhone() && !showFrB) setLayer('fr', true); collapseSheet(); refresh(); showCard('col', id);
}
function clearColonia(){ colQ.value=''; colClear.hidden=true; colList.hidden=true; if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } }
colQ.addEventListener('input', ()=>{ if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } colClear.hidden = !colQ.value; colItems=colSearch(colQ.value); colRender(); });
colQ.addEventListener('focus', ()=>{ if(colQ.value.trim().length>=2 && selCol===null){ colItems=colSearch(colQ.value); colRender(); } });
colQ.addEventListener('blur', ()=> setTimeout(()=>{ colList.hidden=true; colQ.setAttribute('aria-expanded','false'); }, 120));
colQ.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ e.preventDefault(); if(colList.hidden){ colItems=colSearch(colQ.value); colRender(); } colSetActive(colActive+1); }
  else if (e.key==='ArrowUp'){ e.preventDefault(); colSetActive(colActive-1); }
  else if (e.key==='Enter'){ if(!colList.hidden && colItems.length){ e.preventDefault(); pickColonia(colItems[colActive>=0? colActive : 0]); } }
  else if (e.key==='Escape'){ if(!colList.hidden){ e.stopPropagation(); colList.hidden=true; } else if(colQ.value){ clearColonia(); } }
});
colClear.onclick = ()=>{ clearColonia(); colQ.focus(); };
// ---------- avenida: autocompletar (Gobierno Central) ----------
const avQ = $('av-q'), avList = $('av-list'), avClear = $('av-clear');
let avItems = [], avActive = -1;
function avSearch(q){
  q = norm(q.trim()); if (q.length<2) return [];
  const starts=[], inc=[];
  for(const [a,s] of avIdx){ const n=AV_N[a]; if(n.startsWith(q)) starts.push(a); else if(n.includes(q) || [...s.nombres].some(x=>norm(x).includes(q))) inc.push(a); }
  const byName=(a,b)=> VPC.nomenclat[a].localeCompare(VPC.nomenclat[b],'es');
  return starts.sort(byName).concat(inc.sort(byName)).slice(0,30);
}
function avRender(){
  avList.innerHTML=''; avActive=-1;
  if (!avItems.length){ const q=avQ.value.trim(); if(q.length>=2){ avList.innerHTML='<li class="empty">Sin coincidencias'+(sel!==null?' en '+META.munNames[sel]:'')+'.</li>'; avList.hidden=false; } else avList.hidden=true; avQ.setAttribute('aria-expanded', String(!avList.hidden)); return; }
  for(const a of avItems){ const s=avIdx.get(a); const d=dom({km:avStat(a).kmByP}); const pc=T.prio[d]; const li=document.createElement('li'); li.setAttribute('role','option');
    li.innerHTML = `<i class="dot" style="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></i><span>${VPC.nomenclat[a]}</span><span class="cp">${fmt1.format(s.kmp)} km prior.</span><span class="m">${[...s.nombres].slice(0,2).join(', ')}${sel===null? ' · '+[...s.muns].slice(0,2).map(m=>META.munNames[m]).join(', ')+(s.muns.size>2?' +'+(s.muns.size-2):''):''}</span>`;
    li.onmousedown = e=>{ e.preventDefault(); pickAvenida(a); }; avList.appendChild(li); }
  avList.hidden=false; avQ.setAttribute('aria-expanded','true');
}
function avSetActive(i){ const lis=[...avList.querySelectorAll('li[role=option]')]; if(!lis.length) return; avActive=(i+lis.length)%lis.length; lis.forEach((l,k)=>l.classList.toggle('active',k===avActive)); lis[avActive].scrollIntoView({block:'nearest'}); }
function pickAvenida(a){
  if (!isGC()) setResp('gc');
  avList.hidden=true; avQ.setAttribute('aria-expanded','false'); avQ.value = VPC.nomenclat[a]; avClear.hidden=false;
  selAv=a; selCol=null; hideCard(); $('q').value='';
  const s=avStat(a); highlight={avId:a, idx:s.idx}; collapseSheet(); refresh();
}
function clearAvenida(){ avQ.value=''; avClear.hidden=true; avList.hidden=true; if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } }
avQ.addEventListener('input', ()=>{ if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } avClear.hidden = !avQ.value; avItems=avSearch(avQ.value); avRender(); });
avQ.addEventListener('focus', ()=>{ if(avQ.value.trim().length>=2 && selAv===null){ avItems=avSearch(avQ.value); avRender(); } });
avQ.addEventListener('blur', ()=> setTimeout(()=>{ avList.hidden=true; avQ.setAttribute('aria-expanded','false'); }, 120));
avQ.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ e.preventDefault(); if(avList.hidden){ avItems=avSearch(avQ.value); avRender(); } avSetActive(avActive+1); }
  else if (e.key==='ArrowUp'){ e.preventDefault(); avSetActive(avActive-1); }
  else if (e.key==='Enter'){ if(!avList.hidden && avItems.length){ e.preventDefault(); pickAvenida(avItems[avActive>=0? avActive : 0]); } }
  else if (e.key==='Escape'){ if(!avList.hidden){ e.stopPropagation(); avList.hidden=true; } else if(avQ.value){ clearAvenida(); } }
});
avClear.onclick = ()=>{ clearAvenida(); avQ.focus(); };
selEl.onchange = e=> setSel(e.target.value);
$('n-total').textContent = `${fmt.format(N)} frentes de manzana y ${fmt.format(VPC.cov.registros)} tramos de vialidad primaria (${fmt0.format(VPC.cov.km_total)} km).`;

// ---------- export ----------
let downloads; try { downloads = await claude.use('downloads'); } catch(e){ downloads = null; }
function csvEsc(v){ v=String(v??''); return /[",\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
async function deliver(filename, text){
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
async function deliverBlob(filename, blob){
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  if (downloads){ try{ await downloads.save({filename, data:blob}); st.textContent=`Guardado: ${filename}`; } catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(META.colonias[selCol].n) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = clases Muy Alta y Alta de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas de las alcaldías.',
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), correspondientes al punto medio del tramo.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  'La meta de vialidades primarias se mide sobre los 2,267 km de la red completa, incluidos los tramos sin manzanas al frente.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.';
const DIC = {
  frentes: { titulo:'Frentes de manzana prioritarios', contenido:'Un renglón por frente de manzana con prioridad Muy Alta o Alta a cargo de la alcaldía.',
    cols:[11,30,16,13,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['prioridad','Clase de prioridad del frente de manzana.','Muy Alta o Alta'],
      ['vialidad','Nombre de la calle a la que da el frente.','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['responsable','Orden de gobierno que atiende el frente.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente.','Texto'],
      ['cp','Código postal de la colonia.','5 dígitos'],
      ['prioridad_colonia','Prioridad de la colonia: combinación de calor, rezago social y sombra.','Muy Baja a Muy Alta'],
      ['desarrollo_social_ids','Estrato del Índice de Desarrollo Social de la unidad territorial donde se ubica la colonia (EVALÚA CDMX).','Muy bajo a Muy alto'],
      ['unidad_territorial','Unidad territorial de EVALÚA CDMX de la que provienen el estrato de desarrollo social y la población en pobreza. No coincide necesariamente con los límites de la colonia.','Texto'],
      ['poblacion_colonia','Población total de la colonia (Censo 2020).','Habitantes'],
      ['poblacion_pobreza_nbi','Población en pobreza por necesidades básicas insatisfechas de la unidad territorial —no de la colonia— (EVALÚA CDMX).','Personas'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['longitud_m','Longitud del frente de manzana.','Metros'],
      ['banqueta_inegi','Disponibilidad de banqueta registrada por INEGI.','Dispone, No dispone, Conjunto habitacional, No aplica, No especificado'],
      ['lat','Latitud del punto medio del frente.','Grados decimales'],
      ['lon','Longitud del punto medio del frente.','Grados decimales'] ] },
  calles: { titulo:'Resumen por calle', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana. Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel de frentes.',
    cols:[30,30,8,22,20,13,15,12,13,11,15,11],
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
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las clases.','Kilómetros'] ] },
  tramos: { titulo:'Tramos prioritarios de vialidades primarias', contenido:'Un renglón por tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta o Alta, a cargo del Gobierno de la Ciudad.',
    cols:[11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['prioridad','Clase de prioridad del tramo en la capa de vialidades primarias.','Muy Alta o Alta'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave del tramo en la capa de vialidades primarias.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud del tramo.','Metros'],
      ['responsable','Orden de gobierno que atiende el tramo.','Gobierno Central'],
      ['lat','Latitud del punto medio del tramo.','Grados decimales'],
      ['lon','Longitud del punto medio del tramo.','Grados decimales'] ] },
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
function ambitoTxt(){
  if (selAv!==null) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad');
  if (selCol!==null) return META.colonias[selCol].n + ' · ' + META.munNames[sel];
  return sel===null? 'Ciudad de México' : META.munNames[sel];
}
function dictAoa(key, nreg, archivo){
  const d = DIC[key];
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const a = [['Calles prioritarias para reforestar — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', ambitoTxt()],
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ['Fecha de generación', hoy], [],
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
function conPDF(kind){
  loadLib('jspdf.js', 'jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js')
    .then(()=> fichaPDF(kind))
    .catch(()=>{ const st = $('dl-status'); if (st) st.textContent = 'No se pudo cargar el generador de PDF; revisa tu conexión.'; });
}
const wch = ws => ws.map(w=>({wch:w}));
async function deliverTable(base, key, aoa){
  const st = $('dl-status'); st.textContent = 'Preparando archivo…';
  const nreg = aoa.length - 1;
  let X; try { X = await loadXL(); }
  catch(e){ // sin conexión al CDN: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = 'Sin conexión para generar el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '.csv', csv);
    const dic = dictAoa(key, nreg, base + '.csv').map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '_diccionario.csv', dic);
    return;
  }
  const wb = X.utils.book_new();
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(DIC[key].cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx'));
  wd['!cols'] = wch([26, 78, 46]);
  X.utils.book_append_sheet(wb, wd, 'Diccionario');
  const buf = X.write(wb, { bookType:'xlsx', type:'array' });
  await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
const num = v => { const n = Number(v); return Number.isFinite(n)? n : v; };
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(F.mun[i]===sel && F.prio[i]>=3 && !F.gc[i] && (selCol===null || F.col[i]===selCol)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([META.prio[F.prio[i]], META.names[F.name[i]], META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.pob||0, c.nbi||0, META.munNames[sel], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  deliverTable(`frentes_prioritarios_${scopeSlug()}`, 'frentes', rows);
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const rows=[['vialidad','colonia','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','km_muy_alta','km_alta','km_prioritario','km_total']];
  const items=[]; for(const [key,s] of streetIdx){ if(!s.kmp) continue; let ma=0,a=0,kma=0,ka=0; for(const i of s.idx){ if(F.prio[i]===4){ma++;kma+=F.len[i]/1000;} else if(F.prio[i]===3){a++;ka+=F.len[i]/1000;} }
    const c = s.col? META.colonias[s.col] : null;
    items.push([META.names[s.nid], c? c.n : 'Colonia no identificada', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[sel], s.idx.length, ma, a, num(kma.toFixed(2)), num(ka.toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[10]-x[10]); for(const r of items) rows.push(r);
  deliverTable(`resumen_calles_prioritarias_${scopeSlug()}`, 'calles', rows);
};
$('dl-tramos').onclick = ()=>{
  const rows=[['prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','responsable','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(VP.prio[i]>=3 && (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ const a=vstart[i], b=vstart[i+1]-1; rows.push([META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(((VPOS[2*a+1]+VPOS[2*b+1])/2).toFixed(6)), num(((VPOS[2*a]+VPOS[2*b])/2).toFixed(6))]); }
  deliverTable(`tramos_prioritarios_vialidades_primarias_${scopeSlug()}`, 'tramos', rows);
};
$('dl-avenidas').onclick = ()=>{
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  const items=[]; for(const [a,s] of avIdx){ const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    items.push([VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[11]-x[11]); for(const r of items) rows.push(r);
  deliverTable(`resumen_avenidas_prioritarias_${scopeSlug()}`, 'avenidas', rows);
};

document.fonts && document.fonts.ready.then(()=> rerender());

// ---------- fichas (PDF) ----------
const LOGO_URI = document.querySelector('.panel-head .logo').src, LOGO_W = 1400, LOGO_H = 142;
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
  const lw = 118, lh = lw*LOGO_H/LOGO_W; doc.addImage(LOGO_URI, 'PNG', M, 9, lw, lh);
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text(isCol? 'Ficha de colonia' : isAlc? 'Ficha de alcaldía' : isVpAlc? 'Ficha de vialidades primarias' : 'Ficha de avenida', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Calles prioritarias para reforestar', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  const title = isCol? c.n : isVpAv? VPC.nomenclat[selAv] : META.munNames[sel];
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(title.length>34? 17 : 22); doc.text(title, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = isCol? `${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' habitantes beneficiados':''}`
    : isAlc? `Ciudad de México · ${fmt.format(ntot)} frentes de manzana a cargo de la alcaldía · ${fmt0.format(tot)} km de frentes`
    : isVpAlc? `Ciudad de México · ${fmt.format(ntot)} tramos de vialidad primaria a cargo del Gobierno Central · ${fmt0.format(tot)} km`
    : `${[...av.nombres].join(', ')} · ${[...av.muns].map(m=>META.munNames[m]).join(', ')} · ${fmt1.format(tot)} km · ${fmt.format(ntot)} tramos`;
  doc.text(doc.splitTextToSize(sub, W-2*M)[0], M, 44);
  const pk = isCol? c.p : isAlc? ALC_DOM[sel] : isVpAlc? VP_DOM[sel] : dom({km:av.kmByP}); const pc = pk>=0? T.prio[pk] : GRIS;
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const ambP = isCol? 'de la colonia' : isAlc? 'de la alcaldía' : isVpAlc? 'de vialidad primaria de la alcaldía' : 'de la avenida';
  const l1 = isCol? `Prioridad de la colonia: ${pk>=0? META.prio[pk]:'—'}` : `Prioridad predominante: ${META.prio[pk]} (${pct(cs.km[pk],tot)} de los ${isVpAv? 'km de la avenida' : isVP? 'km de vialidad primaria de la alcaldía' : 'frentes de la alcaldía'})`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5);
  const tw = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = isCol? `Desarrollo social (IDS) de la colonia: ${c.ids||'—'}` : isAlc? `${rank[sel]}.º de 16 alcaldías en km prioritarios` : isVpAlc? `${rankVP[sel]}.º de 16 alcaldías en km prioritarios` : `${VPC.tipos[VP.tipo[av.idx[0]]]}`;
  const l2x = M+6+tw+8; if (l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5); else doc.text(doc.splitTextToSize(l2, W-2*M-6)[0], M+6, 56.4);
  // KPIs
  const kp = [[kmFull(cs.kmp), isVP? `de vialidad primaria prioritaria ${ampP()} (Muy Alta + Alta)` : `de frente prioritario ${ampP()} (Muy Alta + Alta)`],[fmt1.format(tot? 100*cs.kmp/tot:0)+' %','de los '+kmFull(tot)+' '+(isCol?'de frentes de la colonia':isAlc?'de frentes de la alcaldía':isVpAlc?'de vialidad primaria de la alcaldía':'de la avenida')],[fmt.format(cs.np), `${unit} prioritarios, de los ${fmt.format(ntot)} ${unit} ${ampP()}`]];
  function ampP(){ return isCol? 'de la colonia' : isVpAv? 'de la avenida' : 'de la alcaldía'; }
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  // línea de responsabilidad complementaria
  if (isAlc){ const vs=VPC.summ[META.muns[sel]]; const top=[]; for(const [a,s] of (()=>{ const m=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; m.set(a,(m.get(a)||0)+(VP.prio[i]>=3? VP.len[i]/1000:0)); } return m; })()) top.push([a,s]); top.sort((x,y)=>y[1]-x[1]);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); doc.text(doc.splitTextToSize(`Gobierno Central atiende además ${fmt0.format(sum(vs.km))} km de vialidades primarias en la alcaldía (${fmt0.format(kmPrio(vs))} km prioritarios); no se cuentan arriba. Principales: ${top.slice(0,3).map(t=>VPC.nomenclat[t[0]]).join(', ')}.`, W-2*M).slice(0,2), M, 81.5, {lineHeightFactor:1.25}); }
  if (isVpAlc){ const fs=META.summ[META.muns[sel]]; doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); doc.text(`La alcaldía atiende por su parte ${fmt0.format(sum(fs.km))} km de frentes de manzana (${fmt0.format(kmPrio(fs))} km prioritarios); ver ficha de alcaldía.`, M, 82.5); }
  // barras + mapa
  y=89; const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.text(isVP? `KILÓMETROS DE VIALIDAD PRIMARIA POR PRIORIDAD ${isVpAv? 'DE LA AVENIDA':'DE LA ALCALDÍA'}` : `KILÓMETROS DE FRENTE POR PRIORIDAD ${isCol? 'DE LA COLONIA':'DE LA ALCALDÍA'}`, M, y);
  const max=Math.max(...cs.km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*cs.km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(cs.km[k])} · ${tot? fmt1.format(100*cs.km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
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
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('Frentes de manzana por prioridad · contorno de la colonia', mx+2, my+mh-2);
  } else if (isAlc){
    const m = META.muns[sel]; doc.setLineWidth(0.15); doc.setDrawColor(255,255,255);
    for(const cc of COLS){ if(cc.mun!==m || cc.prio<0) continue; const col=T.prio[cc.prio]; doc.setFillColor(col[0],col[1],col[2]);
      for(const p of cc.paths){ if(p.length<3) continue; const segs=[]; for(let q=1;q<p.length;q++) segs.push([(X(p[q][0])-X(p[q-1][0])), (Y(p[q][1])-Y(p[q-1][1]))]); doc.lines(segs, X(p[0][0]), Y(p[0][1]), [1,1], 'FD', true); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); drawAlcOutline(sel);
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('Colonias por prioridad · contorno de la alcaldía', mx+2, my+mh-2);
  } else {
    // vialidades primarias por prioridad
    doc.setDrawColor(200,196,190); doc.setLineWidth(0.25);
    if (isVpAv) for(const m of av.muns) drawAlcOutline(m); else { for(let i=0;i<16;i++){ if(i!==sel) drawAlcOutline(i); } }
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(k>=3? 0.9 : 0.6);
      for(let i=0;i<NV;i++){ if(VP.prio[i]!==k) continue; if(isVpAlc && VP.mun[i]!==sel) continue; if(isVpAv && VP.nom[i]!==selAv) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); if (isVpAlc) drawAlcOutline(sel);
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text(isVpAlc? 'Vialidades primarias por prioridad · contorno de la alcaldía' : 'Tramos de la avenida por prioridad · alcaldías que cruza', mx+2, my+mh-2);
  }
  doc.restoreGraphicsState();
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla
  y=y+62; doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  let rows, cols;
  if (isCol){
    doc.text('CALLES CON MÁS FRENTE PRIORITARIO EN LA COLONIA', M, y);
    const items=[]; for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Vialidad'],[M+96,'Tipo'],[M+134,'Km prior.'],[M+158,'Frentes prior.']];
    rows = items.slice(0,14).map(([key,s])=>[META.names[s.nid], [...s.tipos].filter(Boolean).slice(0,2).join(', '), f2.format(s.kmp), `${s.np} de ${s.idx.length}`]);
  } else if (isAlc){
    doc.text('COLONIAS CON MÁS FRENTE PRIORITARIO EN LA ALCALDÍA', M, y);
    const m=META.muns[sel]; const items=[]; for(let i=1;i<META.colonias.length;i++){ const cc=META.colonias[i]; if(!cc.n || cc.m!==m) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Colonia'],[M+78,'Prioridad'],[M+106,'Desarrollo social'],[M+140,'Km prior.'],[M+161,'Frentes prior.']];
    rows = items.slice(0,14).map(([i,s])=>{ const cc=META.colonias[i]; return [cc.n, cc.p>=0? META.prio[cc.p]:'—', cc.ids||'—', f2.format(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))}`]; });
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
  // pie
  doc.setDrawColor(...LINE); doc.line(M,262,W-M,262); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const fuentes = isVP
    ? `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros. Las vialidades primarias y de acceso controlado corresponden al Gobierno de la Ciudad de México. Fuentes: SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); modelo de priorización del Sistema de Información Ambiental. La meta se mide sobre los 2,267 km de la red primaria completa. Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar.`
    : `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. ${isCol?'':'Prioridad predominante = categoría con más kilómetros de frente en la alcaldía. '}Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025) y capa de vialidades primarias (ago. 2026); catálogo de colonias SEDEMA-SIA e Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX). Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar.`;
  doc.text(doc.splitTextToSize(fuentes, W-2*M), M, 266);
  const fname = isCol? `ficha_colonia_${slug(META.munNames[sel])}_${slug(c.n)}.pdf` : isAlc? `ficha_alcaldia_${slug(META.munNames[sel])}.pdf` : isVpAlc? `ficha_vialidades_primarias_${slug(META.munNames[sel])}.pdf` : `ficha_avenida_${slug(VPC.nomenclat[selAv])}${sel!==null? '_'+slug(META.munNames[sel]):''}.pdf`;
  deliverBlob(fname, doc.output('blob'));
}
$('dl-ficha').onclick = ()=>conPDF('col');
$('dl-ficha-alc').onclick = ()=>conPDF('alc');
$('dl-ficha-vpalc').onclick = ()=>conPDF('vpalc');
$('dl-ficha-av').onclick = ()=>conPDF('vpav');

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
function setSheet(open){ setSheetState(open? 'full' : 'half'); }
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

// ================= BLOQUE 2 (auditoría UX v1) =================
// ---------- C1 · pestañas ----------
let curTab = 'res';
function setTab(t){ curTab=t; document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); ['res','list','dl'].forEach(k=>{ $('tp-'+k).hidden = k!==t; }); }
document.querySelectorAll('.tabs [role=tab]').forEach(b=>{ b.onclick=()=>setTab(b.dataset.tab); });
function updTabLabel(){
  const lbl = isGC()? 'Avenidas' : (alcOnly() && sel===null)? 'Alcaldías' : (colOnly() && selCol===null)? 'Colonias' : 'Calles';
  $('tab-list').textContent = lbl; }
function renderScopeTitle(){
  $('scope-title').textContent = selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : '')
    : selCol!==null? META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México'; }
// ---------- C1 · acciones fijas al pie del panel ----------
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
// ---------- I4 · ruta de navegación ----------
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
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; avQ.value=''; selEl.value=''; setSel(''); };

// ---------- C6 · buscador único ----------
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
      else { const s=I.stStat.get(it.nid); const cols=[...s.cols.keys()].filter(Boolean); const one = cols.length===1;
        html = `<span class="ty">Calle</span><span class="nm">${omniMark(META.names[it.nid], R.qt)}</span><span class="k">${kmFull(s.kmp)} prior.</span><span class="m">${one? META.colonias[cols[0]].n+' · '+META.munNames[[...s.muns][0]] : `${fmt.format(cols.length)} calles con este nombre en distintas colonias · ver en el listado`}</span>`; }
      li.innerHTML = html; const n=omniItems.length; omniItems.push(it);
      li.onmousedown = e=>{ e.preventDefault(); omniPick(omniItems[n]); }; omniList.appendChild(li); } }
  if (R.why){ const w=document.createElement('li'); w.className='why'; w.setAttribute('role','presentation'); w.textContent=R.why; omniList.appendChild(w); }
  omniList.hidden=false; omni.setAttribute('aria-expanded','true'); }
function omniSetActive(i){ const lis=[...omniList.querySelectorAll('li.opt')]; if(!lis.length) return; omniActive=(i+lis.length)%lis.length;
  lis.forEach((l,k)=>l.classList.toggle('active',k===omniActive)); lis[omniActive].scrollIntoView({block:'nearest'}); omni.setAttribute('aria-activedescendant', lis[omniActive].id); }
function omniClose(){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); omni.removeAttribute('aria-activedescendant'); }
function omniPick(it){
  omniClose(); omni.value=''; omniClear.hidden=true; omni.blur();
  if (it.t==='alc'){ if (isGC() && selAv!==null){ selAv=null; highlight=null; avQ.value=''; } selEl.value=String(it.i); setSel(String(it.i)); }
  else if (it.t==='col'){ pickColonia(it.i); }
  else if (it.t==='av'){ if (sel!==null && !avStat(it.a).muns.has(sel)){ sel=null; selEl.value=''; } pickAvenida(it.a); }
  else { const s=omniIndex().stStat.get(it.nid); if (isGC()) setResp('alc');
    const cols=[...s.cols.keys()].filter(Boolean);
    if (cols.length===1){ pickColonia(cols[0]); const key=it.nid*4096+cols[0]; const st=streetIdx.get(key); if (st){ highlightStreet(key, st); } setTab('list'); renderResults(); }
    else { const muns=[...s.muns]; if (muns.length===1){ if (sel!==muns[0] || selCol!==null){ selEl.value=String(muns[0]); setSel(String(muns[0])); } } else if (sel!==null || selCol!==null){ selEl.value=''; setSel(''); }
      $('q').value = META.names[it.nid]; renderResults(); setTab('list'); } }
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

// ---------- init ----------
if (isPhone()) setLayer('fr', false);   // en pantallas chicas se dibujan primero las colonias
document.body.dataset.resp = resp;
$('col-field').hidden = false; $('av-field').hidden = true;
setSel('');
setTab('res');
if (isPhone()) setSheetState('peek');
})().catch(err=>{ console.error(err); const l=document.getElementById('loader'); l.hidden=false; l.querySelector('div').innerHTML = `<div class="cabin" style="font-weight:600;font-size:16px">No fue posible cargar el mapa</div><div style="font-size:12.5px;margin-top:6px;max-width:320px">${(err && err.message)||err}. Recarga la página; si persiste, avisa al Sistema de Información Ambiental.</div>`; });
</script>
