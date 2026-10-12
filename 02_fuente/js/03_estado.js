// Estado de la consulta (ámbito, responsable, capas), colores del tema, atributos por vértice para el mapa y geometría de contexto (alcaldías y colonias).
// ---------- colores del tema (se leen de las variables CSS) ----------
function css(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
function hex(h, a=255){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),a]; }
let T = {};
function readTokens(){
  T.prio = PRIO_VARS.map(v=>hex(css(v)));
  T.alc = hex(css('--map-alc')); T.col = hex(css('--map-col')); T.label = hex(css('--map-label')); T.sel = hex(css('--map-sel')); T.gold = hex(css('--dorado')); T.vpctx = hex(css('--map-vp'));
  T.ground = css('--ground');
  T.manzana = hex(css('--fondo-manzana')); T.fverde = hex(css('--fondo-verde')); T.fagua = hex(css('--fondo-agua'));
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
let locSel = false;       // true mientras Mi ubicación cambia el ámbito por sí misma (no es un cambio hecho a mano)
let restaurando = true;   // mientras arranca o se restaura una consulta desde la dirección no se escribe en el historial
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
// Banqueta: «con» = INEGI 2020 registra banqueta (Dispone); «sin» = no la registra o queda por verificar (No dispone,
// conjunto habitacional, no aplica, no especificado). No descarta frentes: separa los de plantación directa de los que requieren
// reconocimiento en sitio. Forma parte del filtro único, así que mapa, cifras, listados, Excel, mapas descargables y fichas lo respetan.
let filtroBanq = 'todas';   // 'todas' | 'con' | 'sin'
const conBanq = i => ((F.flags[i]>>3)&7)===0;
const pasaBanq = i => filtroBanq==='todas' || (filtroBanq==='con') === conBanq(i);
const enTerritorio = i => selCol!==null ? F.col[i]===selCol : (sel===null || F.mun[i]===sel);
const enAmbito = i => enTerritorio(i) && pasaBanq(i);
// texto que acompaña al ámbito cuando el filtro de banqueta está activo
const banqTxt = () => filtroBanq==='con'? 'solo frentes con banqueta (INEGI 2020)' : filtroBanq==='sin'? 'solo frentes sin banqueta o por verificar (INEGI 2020)' : '';
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
// Punto donde va el nombre de un área: el más alejado de sus bordes dentro de su anillo mayor (polo de inaccesibilidad,
// como polylabel). El promedio de vértices cae fuera en figuras irregulares. x se escala por cos(lat) para medir parejo.
const areaAnillo = r => { let a=0; for(let i=0,j=r.length-1;i<r.length;j=i++) a += (r[j][0]-r[i][0])*(r[j][1]+r[i][1]); return Math.abs(a/2); };
const mayorAnillo = rs => rs.reduce((m,r)=> areaAnillo(r)>areaAnillo(m)? r : m, rs[0]);
function puntoInterior(r){
  const k = Math.cos(r[0][1]*Math.PI/180), P = r.map(p=>[p[0]*k, p[1]]);
  let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity; for(const [x,y] of P){ if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y; }
  const lado = Math.min(x1-x0, y1-y0); if (!(lado>0)) return [r[0][0], r[0][1]];
  // distancia con signo al borde: positiva dentro del anillo
  const dist = (x,y)=>{ let dentro=false, d=Infinity;
    for(let i=0,j=P.length-1;i<P.length;j=i++){ const ax=P[i][0], ay=P[i][1], bx=P[j][0], by=P[j][1];
      if ((ay>y)!==(by>y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) dentro=!dentro;
      const dx=bx-ax, dy=by-ay, t=Math.max(0, Math.min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy || 1))); d=Math.min(d, Math.hypot(x-ax-t*dx, y-ay-t*dy)); }
    return dentro? d : -d; };
  const celda = (x,y,h)=>{ const d=dist(x,y); return {x, y, h, d, max:d+h*Math.SQRT2}; };
  // cola de prioridad por la mejor distancia posible de cada celda
  const cola = [], sube = c=>{ cola.push(c); let i=cola.length-1; while(i>0){ const p=(i-1)>>1; if(cola[p].max>=cola[i].max) break; [cola[p],cola[i]]=[cola[i],cola[p]]; i=p; } },
    saca = ()=>{ const top=cola[0], u=cola.pop(); if(cola.length){ cola[0]=u; let i=0; for(;;){ const a=2*i+1, b=a+1; let m=i; if(a<cola.length && cola[a].max>cola[m].max) m=a; if(b<cola.length && cola[b].max>cola[m].max) m=b; if(m===i) break; [cola[m],cola[i]]=[cola[i],cola[m]]; i=m; } } return top; };
  for(let x=x0; x<x1; x+=lado) for(let y=y0; y<y1; y+=lado) sube(celda(x+lado/2, y+lado/2, lado/2));
  let mejor = celda((x0+x1)/2, (y0+y1)/2, 0); const prec = Math.max(x1-x0, y1-y0)/100;
  // tope de celdas: una figura degenerada no puede trabar la página
  for(let vuelta=0; cola.length && vuelta<4000; vuelta++){ const c=saca(); if (c.d>mejor.d) mejor=c; if (!(c.max-mejor.d>prec)) continue; const h=c.h/2;
    sube(celda(c.x-h,c.y-h,h)); sube(celda(c.x+h,c.y-h,h)); sube(celda(c.x-h,c.y+h,h)); sube(celda(c.x+h,c.y+h,h)); }
  return [mejor.x/k, mejor.y];
}
const ALC_PARTS = ALC.flatMap((a,i)=>a.polys.map(poly=>({i, poly})));
const ALC_LABELS = ALC.map(a=>({pos:puntoInterior(mayorAnillo(a.polys)), text:a.nom}));
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
const showCol = ()=> showColB && !isGC(), showFr = ()=> showFrB, colOnly = ()=> showColB && !frVisibles() && !isGC(), colLista = ()=> showColB && !showFrB && !isGC(), alcOnly = ()=> showAlcB && !showColB && !showFrB;
// Sumas exactas por alcaldía, calculadas una sola vez de los frentes y los tramos: los resúmenes de meta.bin
// vienen redondeados a dos decimales y volver a redondearlos movería la cifra hasta 0.1 km respecto del recálculo.
(()=>{ const z = ()=>[0,0,0,0,0]; const A=META.muns.map(z), G=META.muns.map(z), W=META.muns.map(z);
  for(let i=0;i<N;i++) (F.gc[i]? G : A)[F.mun[i]][F.prio[i]] += F.len[i]/1000;
  for(let i=0;i<NV;i++) W[VP.mun[i]][VP.prio[i]] += VP.len[i]/1000;
  const tot = M => M.reduce((t,a)=>t.map((v,k)=>v+a[k]), z());
  META.muns.forEach((m,i)=>{ META.summ[m].km=A[i]; META.summ_gc[m].km=G[i]; if (VPC.summ[m]) VPC.summ[m].km=W[i]; });
  META.city.km=tot(A); META.city_gc.km=tot(G); VPC.city.km=tot(W); })();
// prioridad predominante y ranking por alcaldía — frentes (Alcaldía) y vialidades primarias (Gobierno Central)
const kmPrio = s => sumPrio(s.km);
const rank = META.muns.map(m=>kmPrio(META.summ[m])).map((v,i,arr)=>1+arr.filter(x=>x>v).length);
const rankVP = META.muns.map(m=>kmPrio(VPC.summ[m])).map((v,i,arr)=>1+arr.filter(x=>x>v).length);
const dom = s => { const k=s.km; let b=0; for(let i=1;i<5;i++) if(k[i]>k[b]) b=i; return b; };
const ALC_DOM = META.muns.map(m=>dom(META.summ[m]));
const VP_DOM = META.muns.map(m=>dom(VPC.summ[m]));
const VP_RECS = META.muns.map(()=>({r:new Set(), rp:new Set()})); for(let i=0;i<NV;i++){ VP_RECS[VP.mun[i]].r.add(VP.rec[i]); if(esPrio(VP.prio[i])) VP_RECS[VP.mun[i]].rp.add(VP.rec[i]); }
const domOf = i => isGC()? VP_DOM[i] : ALC_DOM[i];
const rankOf = i => isGC()? rankVP[i] : rank[i];
const summOf = i => isGC()? VPC.summ[META.muns[i]] : META.summ[META.muns[i]];
// El punto interior de las 2,243 colonias toma unos 0.2 s (más en teléfono) y sus nombres solo se ven desde el zoom 13.6:
// se calcula en ratos libres después de abrir. Mientras tanto, cada nombre queda en el promedio de los vértices de su colonia.
const promedioVertices = rs=>{ let x=0, y=0, n=0; for(const r of rs) for(const p of r){ x+=p[0]; y+=p[1]; n++; } return [x/n, y/n]; };
const COL_LABELS = COLS.map(c=>({pos:promedioVertices(c.paths), text:c.nom, mun:c.mun, i:c.i}));
let colPosListas = false;
const enRatos = f=> window.requestIdleCallback? requestIdleCallback(f, {timeout:3000}) : setTimeout(()=>f(null), 60);
(()=>{ let k=0;
  const paso = dl=>{ const fin = performance.now()+10;
    while(k<COL_LABELS.length && (dl? dl.timeRemaining()>1 : performance.now()<fin)){ COL_LABELS[k].pos = puntoInterior(mayorAnillo(COLS[k].paths)); k++; }
    if (k<COL_LABELS.length){ enRatos(paso); return; }
    colPosListas = true; if (window.SIA_LISTO && viewState.zoom>=13.6) rerender(); };
  enRatos(paso); })();
// los nombres de colonia se dibujan en mayúsculas: el juego de letras lleva las dos formas (sin «Ñ» saldría un hueco)
const textosEtq = (ALC_LABELS.concat(COL_LABELS)).map(l=>l.text).join('');
const charset = [...new Set(textosEtq + textosEtq.toUpperCase() + '0123456789')];
