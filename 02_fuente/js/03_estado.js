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
