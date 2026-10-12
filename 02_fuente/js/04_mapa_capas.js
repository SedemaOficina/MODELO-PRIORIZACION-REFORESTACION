// Mapa: vista, nombres de calle, barra de escala y capas de deck.gl (layers()).
// ---------- mapa: vista y datos para deck.gl ----------
const {DeckGL, PathLayer, PolygonLayer, TextLayer, DataFilterExtension, WebMercatorViewport, FlyToInterpolator, MapView} = deck;
const mapEl = $('map');
function fitTo(bounds, pad=40){
  const w = mapEl.clientWidth, h = mapEl.clientHeight;
  const vp = new WebMercatorViewport({width:w, height:h}).fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]], {padding:pad});
  return {longitude:vp.longitude, latitude:vp.latitude, zoom:vp.zoom, bearing:0, pitch:0};
}
const CITY_BOUNDS = [-99.365,19.048,-98.940,19.593];
viewState = fitTo(CITY_BOUNDS, 24);
// Solo para las pruebas automáticas (04_pruebas): con window.SIA_PRUEBA y #nomap en la dirección no se redibuja el mapa.
// En el sitio publicado la variable no existe y #nomap no hace nada.
const NOMAP = window.SIA_PRUEBA===true && location.hash==='#nomap';
// Sin animación en modo ligero o si el sistema pide reducir movimiento: cada cuadro de animación redibuja el mapa.
let nVista = 0;
function flyTo(vs, ms=700){ if (NOMAP){ viewState={...viewState,...vs}; return; } const sinAnim = modoLigero || ms===0 || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prev = viewState.zoom;
  // _n hace única cada orden: deck.gl ignora una vista inicial igual a la anterior aunque el usuario ya
  // haya movido el mapa con el ratón o los dedos (sin _n, "toda la ciudad" podría no hacer nada)
  dk.setProps({initialViewState:{...vs, _n: ++nVista, transitionDuration: sinAnim? 0 : ms, transitionInterpolator: sinAnim? undefined : new FlyToInterpolator()}}); viewState={...viewState,...vs};
  // sin animación deck.gl no avisa del cambio de vista: se actualizan aquí capas y escala
  if (sinAnim){ if (zoomBand(viewState.zoom)!==zoomBand(prev)) rerender(); else if (etqDesfasado(viewState)) rerenderNombres(); updateScale(); } }

// Rendimiento: deck.gl vuelve a procesar ~1 millón de vértices cada vez que recibe un objeto de datos nuevo.
// Por eso se reutiliza el mismo objeto mientras no cambien colores ni filtros (solo cambian al cambiar la
// consulta, no al hacer zoom o mover el mapa).
let FR_DATA = null, VP_DATA = null;
function frontsData(){
  if (!FR_DATA || FR_DATA.attributes.getColor.value!==COLORS || FR_DATA.attributes.getFilterValue.value!==FILTER)
    FR_DATA = {length:N, startIndices:start, attributes:{ getPath:{value:POS,size:2}, getColor:{value:COLORS,size:4,normalized:true}, getFilterValue:{value:FILTER,size:2} }};
  return FR_DATA; }
// En modo ligero, con una alcaldía o colonia elegida, solo se dibujan los frentes de ese ámbito:
// sin tarjeta gráfica el costo crece con cada vértice enviado, aunque quede fuera de la vista.
let FR_SUB = null;
const frParcial = ()=> modoLigero && (sel!==null || selCol!==null);
function frontsSub(){ const key = sel+'|'+selCol; if (FR_SUB && FR_SUB.key===key && FR_SUB.colors===COLORS && FR_SUB.filter===FILTER) return FR_SUB;
  const idx = []; let nv = 0; for(let i=0;i<N;i++){ if (!enAmbito(i)) continue; idx.push(i); nv += start[i+1]-start[i]; }
  const P = new Float64Array(2*nv), C = new Uint8Array(4*nv), Fl = new Float32Array(2*nv), st = new Uint32Array(idx.length+1); let v = 0;
  idx.forEach((i,k)=>{ st[k]=v; const a=start[i], n=start[i+1]-a; P.set(POS.subarray(2*a, 2*(a+n)), 2*v); C.set(COLORS.subarray(4*a, 4*(a+n)), 4*v); Fl.set(FILTER.subarray(2*a, 2*(a+n)), 2*v); v+=n; }); st[idx.length]=v;
  return FR_SUB = {key, colors:COLORS, filter:FILTER, idx, data:{length:idx.length, startIndices:st, attributes:{ getPath:{value:P,size:2}, getColor:{value:C,size:4,normalized:true}, getFilterValue:{value:Fl,size:2} }}}; }
// índice real de un frente a partir del índice del objeto en la capa (difiere cuando la capa trae solo el ámbito)
const frReal = k => frParcial() && FR_SUB? FR_SUB.idx[k] : k;
function vpData(){
  if (!VP_DATA || VP_DATA.attributes.getColor.value!==VCOLORS || VP_DATA.attributes.getFilterValue.value!==VFILTER)
    VP_DATA = {length:NV, startIndices:vstart, attributes:{ getPath:{value:VPOS,size:2}, getColor:{value:VCOLORS,size:4,normalized:true}, getFilterValue:{value:VFILTER,size:2} }};
  return VP_DATA; }
// ---------- nombres de calle desde los propios frentes (zoom ≥ 15) ----------
// El nombre va sobre la línea media entre un frente y el de enfrente con el mismo nombre (regla trEnfrente de 09_tramos.js,
// aunque el de enfrente sea de otra colonia: las avenidas suelen ser límite). Así queda en medio de la calle y no encima de
// la línea de prioridad. Se prueba con los frentes más largos de la calle; si ninguno tiene frente enfrente (calle de un solo
// lado, avenida con camellón), el nombre va a la mitad del más largo.
function lineaMedia(i){
  const c = Math.cos(midLat(i)*Math.PI/180), A = trFrente(i, c), G = trGrid(), nid = F.name[i], vistos = new Set(); let mejor = null;
  // celdas del índice espacial a lo largo del frente (los extremos de un frente de enfrente quedan a ≤ 45 m de ellas)
  const paso = Math.max(1, Math.ceil(A.L/40));
  for(let s=0;s<=paso;s++){ const x=(A.a[0]+(A.b[0]-A.a[0])*s/paso)/(111320*c), y=(A.a[1]+(A.b[1]-A.a[1])*s/paso)/110540; const cx=Math.floor(x/TR_CELL), cy=Math.floor(y/TR_CELL);
    for(let gx=cx-1;gx<=cx+1;gx++) for(let gy=cy-1;gy<=cy+1;gy++){ const a=G.get(gx*100000+gy); if(!a) continue;
      for(const j of a){ if (j===i || vistos.has(j) || F.name[j]!==nid || F.gc[j]) continue; vistos.add(j);
        const B = trFrente(j, c), e = trEnfrente(A, B); if (e && (!mejor || e.hi-e.lo > mejor.e.hi-mejor.e.lo)) mejor = {B, e}; } } }
  if (!mejor) return null;
  const {B, e} = mejor, n = [-A.d[1], A.d[0]];
  const s1 = (B.a[0]-A.a[0])*n[0]+(B.a[1]-A.a[1])*n[1], s2 = (B.b[0]-A.a[0])*n[0]+(B.b[1]-A.a[1])*n[1];
  const t = (e.lo+e.hi)/2, s = e.t2!==e.t1? s1+(s2-s1)*(t-e.t1)/(e.t2-e.t1) : (s1+s2)/2;
  const x = A.a[0]+A.d[0]*t+n[0]*s/2, y = A.a[1]+A.d[1]*t+n[1]*s/2;
  const k = A.d[0]*B.d[0]+A.d[1]*B.d[1] < 0? -1 : 1; const dx = A.d[0]+k*B.d[0], dy = A.d[1]+k*B.d[1];
  return {pos:[x/(111320*c), y/110540], ang:Math.atan2(dy, dx)*180/Math.PI, largo:e.hi-e.lo}; }
let COL_FR = null; const COL_BB = new Map(); let lblCenter = null;
function colFrentes(){ if (COL_FR) return COL_FR; COL_FR = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; let a=COL_FR.get(c); if(!a){ a=[]; COL_FR.set(c,a); } a.push(i); } return COL_FR; }
function colBB(c){ let b=COL_BB.get(c); if(!b){ b=colBounds(c); COL_BB.set(c,b); } return b; }
// ¿la vista se alejó más de 0.35 del ancho del lugar donde se acomodaron los nombres? (desde el zoom 13.6)
function lblDesfasado(vs){ if (vs.zoom<13.6 || !lblCenter) return false; const w=mapEl.clientWidth||800;
  const mpp=40075016.686*Math.cos(vs.latitude*Math.PI/180)/(512*Math.pow(2,vs.zoom)); const dx=(vs.longitude-lblCenter[0])*111320*Math.cos(vs.latitude*Math.PI/180), dy=(vs.latitude-lblCenter[1])*110540;
  return Math.hypot(dx,dy)/mpp > w*0.35; }
// ---------- barra de escala ----------
function updateScale(){ const el=$('scalebar'); if(!el) return; const mpp = 40075016.686*Math.cos(viewState.latitude*Math.PI/180)/(512*Math.pow(2,viewState.zoom));
  const steps=[10,20,50,100,200,500,1000,2000,5000,10000,20000]; let m=steps[0]; for(const st of steps){ if(st/mpp<=110) m=st; }
  el.querySelector('i').style.width = Math.round(m/mpp)+'px'; el.querySelector('span').textContent = m>=1000? (m/1000)+' km' : m+' m'; }
let COL_LBL_SEL, COL_LBL = null;
function colLabelsFor(k){ if (COL_LBL===null || COL_LBL_SEL!==k){ COL_LBL_SEL = k; COL_LBL = k===null? COL_LABELS : COL_LABELS.filter(c=>munIndex[c.mun]===k); } return COL_LBL; }
// Mapas de fondo (opcionales; solo se piden cuando el usuario los enciende).
//  · calles: fondo propio, alojado con el sitio (ver fondoPropio): manzanas del Catastro, parques, agua, ANP y AVA. Sin terceros ni claves.
//  · sat: imagen de satélite de Esri (World Imagery) con la capa de referencia de nombres de vías encima
//    (Reference/World_Transportation). Con clave de ArcGIS Location Platform (window.SIA_ESRI_KEY: construir.py la toma
//    de SIA_ESRI_KEY o de claves.local.json) se usa el servicio con clave, que ya trae los nombres; sin clave, los servicios de services.arcgisonline.com.
const ESRI_KEY = String(window.SIA_ESRI_KEY || '').trim();
const ESRI_TILES = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/';
const ESRI_AGOL = 'https://services.arcgisonline.com/ArcGIS/rest/services/';
const enlace = (url, t)=> `<a href="${url}" target="_blank" rel="noopener noreferrer">${t}</a>`;
const FONDOS = {
  calles: { propio:true, nota:'', atrib:'' },   // fondo propio: sin crédito sobre el mapa
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
// ---------- fondo propio («Calles») ----------
// Manzanas del Catastro en gris claro sobre suelo blanco (la calle es el hueco entre manzanas), y encima parques, jardines, ANP y AVA
// en verde claro (Catastro trae muchos parques como manzana) y agua. Datos en datos/fondo/ (03_procesamiento_datos/6_fondo.py):
// fondo_base.bin al encender el fondo; las manzanas de cada alcaldía, desde el zoom FONDO_Z y solo de las alcaldías a la vista.
// El archivo único no los trae (window.SIA_FONDO no existe): allí el fondo «Calles» lo dice en la nota del panel de capas.
const FONDO_ESCALA = 200000, FONDO_Z = 13;   // coordenadas en 1/200,000 de grado (ESCALA en 6_fondo.py)
const FONDO = {base:null, pidiendo:false, intentos:0, mz:new Map(), pend:new Set(), fallo:new Set()};
async function fondoLeer(n){ const v = (window.SIA_FONDO || {})[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/fondo/' + n + '?v=' + v); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); let q=0, x=0, y=0;
  const val = ()=>{ let res=0, sh=0, c; do { c=b[q++]; res += (c & 0x7f)*Math.pow(2, sh); sh += 7; } while (c & 0x80); return res%2? -((res+1)/2) : res/2; };
  // cada llamada lee la siguiente lista de polígonos (las coordenadas van en diferencias a lo largo de todo el archivo)
  return ()=>{ const n=val(), out=new Array(n);
    for(let i=0;i<n;i++){ const nr=val(), p=new Array(nr);
      for(let j=0;j<nr;j++){ const k=val(), a=new Array(k); for(let m=0;m<k;m++){ x+=val(); y+=val(); a[m]=[x/FONDO_ESCALA, y/FONDO_ESCALA]; } p[j]=a; }
      out[i]=p; }
    return out; }; }
const ALC_BB = ALC.map(a=>{ let w=180,s=90,e=-180,n=-90; for(const p of a.polys) for(const q of p){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } return [w,s,e,n]; });
function fondoPropio(){ const L = [];
  if (!window.SIA_FONDO){ const n=$('fondo-note'); n.hidden=false; n.textContent='El fondo «Calles» no viene en el archivo único: ábrelo desde el sitio.'; return L; }
  if (!FONDO.base && !FONDO.pidiendo && FONDO.intentos<3){ FONDO.pidiendo = true; FONDO.intentos++;
    fondoLeer('fondo_base.bin').then(lee=>{ FONDO.base = {verde:lee(), agua:lee(), protegida:lee()}; FONDO.pidiendo = false; if (fondo==='calles') rerender(); })
      .catch(()=>{ FONDO.pidiendo = false; if (FONDO.intentos>=3) avisoFondo(); }); }
  if (viewState.zoom >= FONDO_Z){ const b = new WebMercatorViewport({...viewState, width:mapEl.clientWidth||800, height:mapEl.clientHeight||600}).getBounds();
    ALC.forEach((a,k)=>{ const bb=ALC_BB[k]; if (bb[2]<b[0] || bb[0]>b[2] || bb[3]<b[1] || bb[1]>b[3]) return;
      const n = 'fondo_mz_' + a.cve + '.bin', d = FONDO.mz.get(n);
      if (d) L.push(new PolygonLayer({id:'fondo-mz-'+a.cve, data:d, getPolygon:p=>p, getFillColor:T.manzana, stroked:false, filled:true, pickable:false, updateTriggers:{getFillColor:[T.manzana]}}));
      else if (!FONDO.pend.has(n) && !FONDO.fallo.has(n)){ FONDO.pend.add(n);
        fondoLeer(n).then(lee=>{ FONDO.mz.set(n, lee()); FONDO.pend.delete(n); if (fondo==='calles') rerender(); })
          .catch(()=>{ FONDO.pend.delete(n); FONDO.fallo.add(n); avisoFondo(); }); } }); }
  if (FONDO.base) for(const [id, dat, col] of [['fondo-protegida', FONDO.base.protegida, T.fverde], ['fondo-verde', FONDO.base.verde, T.fverde], ['fondo-agua', FONDO.base.agua, T.fagua]])
    L.push(new PolygonLayer({id, data:dat, getPolygon:p=>p, getFillColor:col, stroked:false, filled:true, pickable:false, updateTriggers:{getFillColor:[col]}}));
  return L; }
function capasFondo(){ const f = FONDOS[fondo]; if (f.propio) return fondoPropio(); const L = [capaTeselas('fondo-'+fondo, f.url, f, f.op, true)];
  if (f.ref) L.push(capaTeselas('fondo-'+fondo+'-vias', f.ref, f, 1, false));
  return L; }

function layers(){
  const z = viewState.zoom;
  const L = [];
  if (fondo!=='no') L.push(...capasFondo());
  if (showAlcB) L.push(new PolygonLayer({id:'alcaldias', opacity:opPrio, data:ALC_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> visible[domOf(d.i)]? [...T.prio[domOf(d.i)].slice(0,3), (sel===null || d.i===sel)? 170 : 45] : [0,0,0,0], pickable:true, autoHighlight: alcOnly(), highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, sel, visible.join(''), resp]}}));
  // con el fondo propio, el tinte de prioridad de las colonias va más tenue: si no, cubre el hueco blanco de las calles
  if (showCol()) L.push(new PolygonLayer({id:'col-fill', opacity:opPrio, data:COL_PARTS, getPolygon:d=>d.poly, filled:true, stroked:false, getFillColor:d=> (d.prio>=0 && visible[d.prio])? [...T.prio[d.prio].slice(0,3), selCol!==null? (d.i===selCol? (frVisibles()? 60 : 190) : (frVisibles()? 14 : 40)) : (colOnly()? 150 : fondo==='calles'? 35 : 80)] : [0,0,0,0], pickable: true, autoHighlight: true, highlightColor:[...T.gold.slice(0,3),120], updateTriggers:{getFillColor:[T.prio, showColB, showFrB, frVisibles(), visible.join(''), resp, selCol, fondo]}}));
  L.push(new PolygonLayer({id:'alc', data:ALC_PARTS, getPolygon:d=>d.poly, filled:false, stroked:true, getLineColor:T.alc, lineWidthMinPixels:1, lineWidthMaxPixels:1.5, updateTriggers:{getLineColor:[T.alc]}}));
  if ((z>=12.2 && !isGC()) || colOnly()) L.push(new PathLayer({id:'cols', data:COL_PATHS, getPath:d=>d.path, getColor:T.col, widthMinPixels:0.7, widthMaxPixels:1, opacity:.7, updateTriggers:{getColor:[T.col]}}));
  // frentes de manzana (responsabilidad de las alcaldías)
  // los frentes solo responden al cursor desde el zoom 12: más lejos son demasiado finos y revisar 372 mil tramos
  // en cada movimiento del ratón vuelve lento el mapa (se consultan las colonias)
  if (frVisibles() && showsFrontsMode()) L.push(new PathLayer({id:'fronts', opacity:opPrio, data: frParcial()? frontsSub().data : frontsData(), _pathType:'open', widthUnits:'meters', getWidth:4, widthMinPixels:1, widthMaxPixels:6,
    pickable: z>=12, autoHighlight: z>=12, highlightColor:T.gold,
    extensions:[new DataFilterExtension({filterSize:2})], filterRange:[[0,15],[1,1]],
    updateTriggers:{getColor:[COLORS, frParcial()? sel+'|'+selCol : ''], getFilterValue:[FILTER, frParcial()? sel+'|'+selCol : '']}}));
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
  const E = NOMAP? {alc:[], col:[], st:[]} : colocarNombres();
  L.push(new TextLayer({id:'alc-labels', data:E.alc, getPosition:d=>d.pos, getText:d=>d.text, getSize: z<11.5? 13 : 15, getColor:T.label, characterSet:ETQ_LETRAS,
    fontFamily:'Cabin, Roboto, sans-serif', fontWeight:600, fontSettings:ETQ_LETRA, outlineWidth:ETQ_CONTORNO, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', visible: z<14, updateTriggers:{getColor:[T.label], getSize:[z<11.5]}}));
  if (z>=13.6 && !isGC()) L.push(new TextLayer({id:'col-labels', data:E.col, getPosition:d=>d.pos, getText:d=>d.text.toUpperCase(), getSize:10.5, getColor:T.label, characterSet:ETQ_LETRAS,
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:ETQ_LETRA, outlineWidth:ETQ_CONTORNO, outlineColor:hex(T.ground), getTextAnchor:'middle', getAlignmentBaseline:'center', updateTriggers:{getColor:[T.label]}}));
  if (E.st.length) L.push(new TextLayer({id:'st-labels', data:E.st, getPosition:d=>d.pos, getText:d=>d.text, getAngle:d=>d.ang, getSize:ETQ_TAM, getColor:[34,38,42,235], characterSet:ETQ_LETRAS,
    fontFamily:'Roboto, sans-serif', fontWeight:500, fontSettings:ETQ_LETRA, outlineWidth:ETQ_CONTORNO, outlineColor:[255,255,255,235], getTextAnchor:'middle', getAlignmentBaseline:'center'}));
  if (ptoBuscado) L.push(new deck.ScatterplotLayer({id:'pto-buscado', data:[ptoBuscado], getPosition:d=>[d.lon,d.lat], getRadius:8, radiusUnits:'pixels', filled:true, stroked:true,
    getFillColor:hex(css('--guinda')), getLineColor:[255,255,255,255], lineWidthUnits:'pixels', getLineWidth:3, pickable:false, updateTriggers:{getPosition:[ptoBuscado.lon, ptoBuscado.lat]}}));
  if (myPos){ const P=[myPos];
    L.push(new deck.ScatterplotLayer({id:'loc-acc', data:P, getPosition:d=>[d.lon,d.lat], getRadius:d=>Math.max(d.acc,4), radiusUnits:'meters', filled:true, stroked:true, getFillColor:[...LOC_BLUE,38], getLineColor:[...LOC_BLUE,120], lineWidthMinPixels:1, pickable:false, updateTriggers:{getPosition:[myPos.t], getRadius:[myPos.t]}}));
    L.push(new deck.ScatterplotLayer({id:'loc-dot', data:P, getPosition:d=>[d.lon,d.lat], getRadius:7, radiusUnits:'pixels', filled:true, stroked:true, getFillColor:[...LOC_BLUE,255], getLineColor:[255,255,255,255], lineWidthUnits:'pixels', getLineWidth:2.5, pickable:false, updateTriggers:{getPosition:[myPos.t]}})); }
  return L;
}
