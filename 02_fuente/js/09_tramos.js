// Tramos de una calle de la red de las alcaldías: agrupa los frentes de manzana de la calle consultada en tramos
// (de esquina a esquina, con sus dos lados) y nombra las vialidades que los delimitan. Se calcula al consultar la calle;
// no cambia los datos ni el catálogo.
// Los frentes ligados a un tramo de la capa de calles de la CDMX (F.tr, 02_datos.js) se agrupan por ese tramo, con las calles de
// sus esquinas que da la capa. Los demás (sin calle en la capa) siguen una regla geométrica: dos frentes de la misma calle forman un
// tramo cuando son casi paralelos (≤ 30°), están en lados opuestos a no más de TR_ANCHO metros y se traslapan a lo largo de la calle;
// sus esquinas son las vialidades más cercanas a sus extremos y se verifican en campo.
const TR_ANCHO = 45, TR_COS = Math.cos(30*Math.PI/180), TR_ESQ = 28, TR_JUNTA = 60;
// Cita obligatoria de la capa de calles (licencia CC BY 4.0, su METADATOS.md): «Fuentes y versión», Excel y GeoJSON. En el pie de las
// fichas PDF, que no tiene lugar para la completa (7 líneas como máximo), va la corta dentro de sus fuentes
const CITA_CALLES_CORTA = 'capa de calles de la Ciudad de México 1.0.0 (con datos de INEGI y SEMOVI)';
const CITA_CALLES = 'Nombres de calle y tramos: capa de calles de la Ciudad de México 1.0.0, elaborada por SEDEMA con información de: INEGI, Marco Geoestadístico. Encuesta Intercensal 2025; INEGI, Red Nacional de Caminos 2025 (INEGI, SICT, IMT); SEMOVI, Vialidades primarias de la Ciudad de México (Portal de Datos Abiertos de la Ciudad de México, CC BY 4.0), y ACUERDO/CCV/016/3ORD/SEPTIEMBRE/2024 de la Comisión de Clasificación de Vialidades. SEDEMA unió, partió y clasificó los tramos, y homologó sus nombres; esas transformaciones no son del INEGI ni de SEMOVI, ni están respaldadas por ellos.';
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
// ¿B está enfrente de A? Casi paralelos (≤ 30°), a 2–TR_ANCHO m en perpendicular y con traslape de al menos min(15 m, 30 % del
// menor) sobre el eje de A. Devuelve las posiciones de los extremos de B sobre ese eje y el traslape [lo, hi], o null.
// La usan los tramos y los nombres de calle (04_mapa_capas.js).
function trEnfrente(A, B){
  if (Math.abs(A.d[0]*B.d[0]+A.d[1]*B.d[1]) < TR_COS) return null;
  const rx=B.m[0]-A.m[0], ry=B.m[1]-A.m[1]; const perp = Math.abs(rx*A.d[1]-ry*A.d[0]); if (perp > TR_ANCHO || perp < 2) return null;
  const t1=(B.a[0]-A.a[0])*A.d[0]+(B.a[1]-A.a[1])*A.d[1], t2=(B.b[0]-A.a[0])*A.d[0]+(B.b[1]-A.a[1])*A.d[1];
  const lo = Math.max(0, Math.min(t1,t2)), hi = Math.min(A.L, Math.max(t1,t2)); if (hi-lo < Math.min(15, 0.3*Math.min(A.L,B.L))) return null;
  return {t1, t2, lo, hi}; }
// tramos de una calle: recibe los índices de sus frentes y devuelve [{n, idx, m, lados, km:[5], entre:[a,b], bounds}] ordenados a lo largo de la calle
function tramosDeCalle(idx){
  if (!idx.length) return [];
  const c = Math.cos(POS[2*start[idx[0]]+1]*Math.PI/180); const fr = idx.map(i=>trFrente(i, c)); const n = fr.length;
  const par = fr.map((_,k)=>k); const find = k => { while(par[k]!==k){ par[k]=par[par[k]]; k=par[k]; } return k; };
  const deCapa = new Map();   // tramo de la capa -> primer frente de la calle en él
  for(let k=0;k<n;k++){ const t=F.tr[fr[k].i]; if (t<0) continue; if (deCapa.has(t)) par[find(k)] = find(deCapa.get(t)); else deCapa.set(t, k); }
  for(let p=0;p<n;p++){ if (F.tr[fr[p].i]>=0) continue; for(let q=p+1;q<n;q++) if (F.tr[fr[q].i]<0 && trEnfrente(fr[p], fr[q])) par[find(p)] = find(q); }
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
    // esquinas: las de la capa (la 1 al poniente o al sur) o, sin tramo de la capa, la vialidad más cercana a cada extremo
    const tc = F.tr[g[0].i]; let ca, cb;
    if (tc>=0){ const dx=pmax[0]-pmin[0], dy=pmax[1]-pmin[1], e1=TRC.e1[tc]>=0? TRC.e1[tc] : null, e2=TRC.e2[tc]>=0? TRC.e2[tc] : null;
      [ca, cb] = (Math.abs(dx)>=Math.abs(dy)? dx>=0 : dy>=0)? [e1, e2] : [e2, e1]; }
    else { ca = trCruce(pmin, c, nid, ref.d); cb = trCruce(pmax, c, nid, ref.d); }
    const pos = cm[0]*ex+cm[1]*ey; if ((pmax[0]-pmin[0])*ex+(pmax[1]-pmin[1])*ey < 0){ const t=ca; ca=cb; cb=t; }
    // a lo largo de la calle y de lado: sobre el eje general (pos, a0–a1) y su perpendicular (off)
    let a0=Infinity, a1=-Infinity, off=0; for(const f of g){ for(const p of [f.a,f.b]){ const t=(p[0]-e0[0])*ex+(p[1]-e0[1])*ey; if(t<a0) a0=t; if(t>a1) a1=t; } off += ((f.m[0]-e0[0])*-ey + (f.m[1]-e0[1])*ex)/g.length; }
    out.push({idx:g.map(f=>f.i), m, largo:Math.round(tmax-tmin), lados, km, entre:[ca,cb], bounds:[w,s,e,nn], pos, a0, a1, off, capa:tc>=0}); }
  out.sort((a,b)=>a.pos-b.pos);
  // lado de cada tramo de un solo lado, respecto del centro local de la calle (promedio de los frentes a ±80 m): poniente u oriente, norte o sur
  const offs = fr.map(f=>[(f.m[0]-e0[0])*ex+(f.m[1]-e0[1])*ey, (f.m[0]-e0[0])*-ey+(f.m[1]-e0[1])*ex]);
  for(const t of out){ t.ladoS = 0; if (t.lados!==1) continue; let sm=0, nm=0; for(const [al, o] of offs) if (Math.abs(al-t.pos)<=80){ sm+=o; nm++; }
    const d = t.off - (nm? sm/nm : t.off); if (Math.abs(d) >= 3) t.ladoS = Math.sign(d); }
  const cardinal = sg=>{ const vx=-ey*sg, vy=ex*sg; return Math.abs(vy)>=Math.abs(vx)? (vy>0? 'norte' : 'sur') : (vx>0? 'oriente' : 'poniente'); };
  const junta = (a, b)=>{ a.idx.push(...b.idx); a.km = a.km.map((v,k)=>v+b.km[k]); a.pos = (a.pos*a.m + b.pos*b.m)/(a.m+b.m); a.m += b.m;
    a.bounds = [Math.min(a.bounds[0],b.bounds[0]), Math.min(a.bounds[1],b.bounds[1]), Math.max(a.bounds[2],b.bounds[2]), Math.max(a.bounds[3],b.bounds[3])];
    a.a0 = Math.min(a.a0, b.a0); a.a1 = Math.max(a.a1, b.a1); a.largo = Math.round(Math.max(a.largo, b.largo, a.a1-a.a0)); };
  // 1. pedazo de esquina: un tramo de menos de TR_JUNTA m con la misma calle en sus dos extremos («a la altura de X») se junta con
  //    el tramo vecino que también llega a X. Los pasos 1 y 2 son solo para los tramos de la regla geométrica: los de la capa ya van
  //    de esquina a esquina
  for(let k=0;k<out.length;k++){ const t=out[k], x=t.entre[0]; if (t.capa || x===null || x!==t.entre[1] || t.largo>=TR_JUNTA) continue;
    const v = [out[k-1], out[k+1]].filter(u=>u && !u.capa && u.entre.includes(x)).sort((u,w)=>Math.abs(u.pos-t.pos)-Math.abs(w.pos-t.pos))[0];
    if (v){ if (t.lados===2 || (v.ladoS && t.ladoS && v.ladoS!==t.ladoS)){ v.lados=2; v.ladoS=0; } junta(v, t); out.splice(k,1); k--; } }
  // 2. los dos lados de una misma cuadra que no se emparejaron (frentes desfasados): tramos seguidos, de un lado cada uno, en lados
  //    opuestos, con el mismo «entre» y a menos de TR_JUNTA m, se juntan en uno de dos lados
  for(let k=0;k+1<out.length;k++){ const a=out[k], b=out[k+1];
    if (!a.capa && !b.capa && a.lados===1 && b.lados===1 && a.ladoS && b.ladoS && a.ladoS!==b.ladoS && a.entre[0]===b.entre[0] && a.entre[1]===b.entre[1] && Math.abs(a.pos-b.pos)<TR_JUNTA){
      junta(a, b); a.lados=2; a.ladoS=0; out.splice(k+1,1); k--; } }
  // 3. si dos tramos todavía dicen lo mismo, se distinguen por su lado y, si no basta, con un número
  const cuenta = f=>{ const c=new Map(); for(const t of out) c.set(f(t), (c.get(f(t))||0)+1); return c; };
  let c1 = cuenta(entreTxt); for(const t of out) t.lado = c1.get(entreTxt(t))>1 && t.ladoS? cardinal(t.ladoS) : '';
  const c2 = cuenta(tramoTxt), vistos = new Map(); for(const t of out){ const x=tramoTxt(t); if (c2.get(x)>1){ const j=(vistos.get(x)||0)+1; vistos.set(x,j); t.orden=`${j} de ${c2.get(x)}`; } }
  out.forEach((t,k)=>{ t.n=k+1; }); return out;
}
// texto «entre A y B» de un tramo
function entreTxt(t){ const a = t.entre[0]!==null? META.names[t.entre[0]] : null, b = t.entre[1]!==null? META.names[t.entre[1]] : null;
  return a && b? (a===b? `a la altura de ${a}` : `entre ${a} y ${b}`) : (a||b)? `desde ${a||b}` : 'sin cruce identificado'; }
// «entre A y B» del tramo de la capa al que da un frente (su ficha); null si el frente no tiene tramo o el tramo no tiene esquinas
const entreFrente = i => { const t = F.tr[i]; if (t<0 || (TRC.e1[t]<0 && TRC.e2[t]<0)) return null;
  return entreTxt({entre:[TRC.e1[t]>=0? TRC.e1[t] : null, TRC.e2[t]>=0? TRC.e2[t] : null]}); };
// texto de un tramo: «entre A y B» y, si hace falta distinguirlo de otro, su lado o su número entre los que dicen lo mismo
function tramoTxt(t){ return entreTxt(t) + (t.lado? ' · lado '+t.lado : '') + (t.orden? ' · '+t.orden : ''); }
let TR_SEL = null;   // tramos de la calle consultada: {key, idx, lista}. La misma calle trae otros frentes en otro ámbito: se compara también el arreglo
function tramosSel(){ const c = calleSel(); if (!c){ TR_SEL=null; return null; } const key = highlight.nameId; if (!TR_SEL || TR_SEL.key!==key || TR_SEL.idx!==c.idx) TR_SEL = {key, idx:c.idx, lista:tramosDeCalle(c.idx)}; return TR_SEL.lista; }
// número de tramo de cada frente de la calle consultada (para el Excel)
function tramoDeFrente(){ const m = new Map(); const l = tramosSel(); if (l) for(const t of l) for(const i of t.idx) m.set(i, t); return m; }
function renderTramos(){
  const box = $('tramos'); if (!box) return; const c = calleSel(); const l = c && !isGC()? tramosSel() : null;
  if (!l){ box.hidden = true; box.innerHTML=''; return; }
  const d = dom({km:l.reduce((a,t)=>a.map((v,k)=>v+t.km[k]),[0,0,0,0,0])});
  box.hidden = false;
  box.innerHTML = `<div class="section-title"><h2>Tramos de ${c.nombre}</h2><span>${l.length} tramo${l.length===1?'':'s'} · predominante ${META.prio[d]}</span></div>
    <ol class="tramos">${l.map(t=>{ const pd = dom({km:t.km}); const partes=[]; for(let p=4;p>=0;p--) if(t.km[p]>0) partes.push(`<span><i data-st="background:var(--p${p})"></i>${META.prio[p]} ${kmFull(t.km[p])}</span>`);
      return `<li data-t="${t.n-1}"><button type="button" class="fila"><b>${t.n}</b><span><span class="n">${tramoTxt(t)}</span><span class="desg">${partes.join('')}</span><span class="t">${fmt.format(t.largo)} m de calle · ${t.lados===2? 'dos lados' : 'un lado'} · ${t.idx.length} frente${t.idx.length===1?'':'s'}${partes.length>1? ' · predominante '+META.prio[pd] : ''}</span></span></button></li>`; }).join('')}</ol>
    <div class="note">${masDet('Un tramo va de esquina a esquina y reúne los frentes de sus dos lados. Los tramos y sus esquinas son los de la capa de calles de la Ciudad de México (SEDEMA, con el Marco Geoestadístico 2025 del INEGI). Los frentes que esa capa no tiene se agrupan con una regla geométrica, y sus esquinas deben confirmarse en campo. Selecciona un tramo para ubicarlo en el mapa y abrir la ficha de su frente de mayor prioridad.')}</div>`;
  box.querySelectorAll('li').forEach(li=>{ const go=()=>{ const t=l[+li.dataset.t], origen = li.querySelector('.fila'); const pad=0.0008; const vs=fitTo([t.bounds[0]-pad,t.bounds[1]-pad,t.bounds[2]+pad,t.bounds[3]+pad], 60); vs.zoom=Math.min(vs.zoom, 17.5);
      box.querySelectorAll('li').forEach(x=>x.classList.remove('active')); li.classList.add('active'); verMapa({desdeLista:true}); flyTo(vs, 800);
      // ficha del frente de mayor prioridad del tramo (el más largo si hay varios): así la ficha de un frente se alcanza sin el puntero
      const rep = t.idx.reduce((a,b)=> (F.prio[b]>F.prio[a] || (F.prio[b]===F.prio[a] && F.len[b]>F.len[a]))? b : a, t.idx[0]); showCard('fr', rep);
      cardOrigen = origen; };   // al cerrar la ficha con Esc, el foco regresa a este renglón (en el celular, también a la información)
    li.onclick=go; });
}
