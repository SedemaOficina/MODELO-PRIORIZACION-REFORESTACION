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
      return `<li tabindex="0" role="button" data-t="${t.n-1}"><b>${t.n}</b><div><div class="n">${entreTxt(t)}</div><div class="desg">${partes.join('')}</div><div class="t">${fmt.format(t.largo)} m de calle · ${t.lados===2? 'dos lados' : 'un lado'} · ${t.idx.length} frente${t.idx.length===1?'':'s'}${partes.length>1? ' · predominante '+META.prio[pd] : ''}</div></div></li>`; }).join('')}</ol>
    <p class="note">Un tramo va de esquina a esquina y reúne los frentes de sus dos lados. Se arma con una regla geométrica a partir de los frentes de manzana; las vialidades que lo delimitan son las más cercanas a sus extremos y deben confirmarse en campo. Selecciona un tramo para ubicarlo en el mapa y abrir la ficha de su frente de mayor prioridad.</p>`;
  box.querySelectorAll('li').forEach(li=>{ const go=()=>{ const t=l[+li.dataset.t]; const pad=0.0008; const vs=fitTo([t.bounds[0]-pad,t.bounds[1]-pad,t.bounds[2]+pad,t.bounds[3]+pad], 60); vs.zoom=Math.min(vs.zoom, 17.5);
      box.querySelectorAll('li').forEach(x=>x.classList.remove('active')); li.classList.add('active'); collapseSheet(); flyTo(vs, 800);
      // ficha del frente de mayor prioridad del tramo (el más largo si hay varios): así la ficha de un frente se alcanza sin el puntero (auditoría H-049)
      const rep = t.idx.reduce((a,b)=> (F.prio[b]>F.prio[a] || (F.prio[b]===F.prio[a] && F.len[b]>F.len[a]))? b : a, t.idx[0]); showCard('fr', rep); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; });
}
