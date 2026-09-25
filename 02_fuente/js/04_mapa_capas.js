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
function flyTo(vs, ms=900){ if (NOMAP){ viewState={...viewState,...vs}; return; } dk.setProps({initialViewState:{...vs, transitionDuration: matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms, transitionInterpolator:new FlyToInterpolator()}}); viewState={...viewState,...vs}; }

function frontsData(){ return {length:N, startIndices:start, attributes:{ getPath:{value:POS,size:2}, getColor:{value:COLORS,size:4,normalized:true}, getFilterValue:{value:FILTER,size:2} }}; }
function vpData(){ return {length:NV, startIndices:vstart, attributes:{ getPath:{value:VPOS,size:2}, getColor:{value:VCOLORS,size:4,normalized:true}, getFilterValue:{value:VFILTER,size:2} }}; }
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
  if (myPos){ const P=[myPos];
    L.push(new deck.ScatterplotLayer({id:'loc-acc', data:P, getPosition:d=>[d.lon,d.lat], getRadius:d=>Math.max(d.acc,4), radiusUnits:'meters', filled:true, stroked:true, getFillColor:[...LOC_BLUE,38], getLineColor:[...LOC_BLUE,120], lineWidthMinPixels:1, pickable:false, updateTriggers:{getPosition:[myPos.t], getRadius:[myPos.t]}}));
    L.push(new deck.ScatterplotLayer({id:'loc-dot', data:P, getPosition:d=>[d.lon,d.lat], getRadius:7, radiusUnits:'pixels', filled:true, stroked:true, getFillColor:[...LOC_BLUE,255], getLineColor:[255,255,255,255], lineWidthUnits:'pixels', getLineWidth:2.5, pickable:false, updateTriggers:{getPosition:[myPos.t]}})); }
  return L;
}
