// Nombres del mapa (alcaldías, colonias, vialidades primarias y calles): acomodo propio, sin el filtro de choques de deck.gl,
// que solo revisa el punto de anclaje (dejaba nombres encimados) y no se comporta igual en todos los navegadores.
// - Cada nombre es una fila de círculos a lo largo de su texto. Se colocan de mayor a menor prioridad y el que choca con uno ya
//   puesto, o con un panel sobre el mapa, se omite.
// - El acomodo se calcula en píxeles del mundo a un zoom redondeado en pasos de ETQ_PASO: al mover el mapa los nombres no brincan.
// - Orden: alcaldías → colonia elegida → colonias → calle consultada → vialidades primarias → avenidas → calles. Dentro de cada
//   grupo se reparte sobre una cuadrícula fija del mapa (ETQ_CUAD px) y la misma calle no se repite a menos de ETQ_REPITE px.
// - Una calle solo lleva nombre donde un tramo recto mide al menos lo que su texto; los tramos seguidos y en línea se encadenan.
// Contorno de los nombres: deck.gl lo dibuja con el campo de distancia de las letras (SDF), que solo llega a `radius` px de la letra
// en su atlas de 64 px. outlineWidth se divide entre ese radio: grosor en pantalla ≈ (outlineWidth / radius) × radius × 0.75 × tamaño / 64.
// Con radio 20 y outlineWidth 16, unos 2.3 px a 12 px de letra (antes, radio 12 y 6: 0.8 px): tapa las líneas que cruzan el nombre.
const ETQ_LETRA = {sdf:true, fontSize:64, buffer:8, radius:20}, ETQ_CONTORNO = 16;
const ETQ_PASO = 0.2, ETQ_CUAD = 260, ETQ_REPITE = 240, ETQ_TAM = 12, ETQ_HOLGURA = 2;
const ETQ_AVENIDA = new Set(['Avenida','Boulevard','Calzada','Circuito','Diagonal','Eje Vial','Periférico','Viaducto','Carretera','Autopista']);
// juego de letras fijo para todos los nombres: con 'auto', deck.gl rehace el atlas de letras cada vez que cambian los datos y traba el zoom
const ETQ_LETRAS = (()=>{ const s=new Set(charset); for(const n of META.names) for(const ch of n) s.add(ch); for(const n of VPC.nomenclat) for(const ch of String(n||'')) s.add(ch); return [...s]; })();

// ---------- ancho de los textos ----------
let ETQ_LIENZO = null; const ETQ_ANCHOS = new Map();
function anchoTexto(t, fuente){ const k=fuente+'|'+t; let w=ETQ_ANCHOS.get(k); if (w!==undefined) return w;
  if (!ETQ_LIENZO) ETQ_LIENZO = document.createElement('canvas').getContext('2d');
  ETQ_LIENZO.font = fuente; w = ETQ_LIENZO.measureText(t).width || t.length*ETQ_TAM*0.55; ETQ_ANCHOS.set(k, w); return w; }
// las medidas tomadas antes de cargar la tipografía no valen
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ ETQ_ANCHOS.clear(); if (window.SIA_LISTO) rerender(); });
const FUENTE_CALLE = `500 ${ETQ_TAM}px Roboto, sans-serif`, FUENTE_COL = '500 10.5px Roboto, sans-serif';

// ---------- coordenadas: grados ↔ píxeles del mundo a un zoom dado ----------
const aMundo = (lon, lat, z)=>{ const s=512*Math.pow(2,z), sl=Math.sin(lat*Math.PI/180); return [(lon+180)/360*s, (0.5-Math.log((1+sl)/(1-sl))/(4*Math.PI))*s]; };

// ---------- candidatos de calle por colonia (tramos rectos sobre la línea media), en ratos libres ----------
// Cada tramo: {nid, x0,y0,x1,y1 (m, proyección local de la colonia), c (cos lat), av, prio, media}. Se calculan una vez por colonia.
const ETQ_COL = new Map(); const ETQ_COLA = []; const ETQ_EN_COLA = new Set(); let etqTrabajando = false, etqAviso = null;
function tramosColonia(col){
  const fs = (colFrentes().get(col)||[]).filter(i=> !F.gc[i] && !PLACEHOLDER.has(F.name[i]) && META.names[F.name[i]]);
  if (!fs.length) return [];
  const c = Math.cos(midLat(fs[0])*Math.PI/180), crudos = [];
  for(const i of fs){ const m = lineaMedia(i); const av = ETQ_AVENIDA.has(META.tipos[F.tipo[i]]);
    if (m){ const x=m.pos[0]*111320*c, y=m.pos[1]*110540, a=m.ang*Math.PI/180, h=m.largo/2;
      crudos.push({nid:F.name[i], x0:x-Math.cos(a)*h, y0:y-Math.sin(a)*h, x1:x+Math.cos(a)*h, y1:y+Math.sin(a)*h, av, prio:F.prio[i], media:true}); }
    else { const A = trFrente(i, c); crudos.push({nid:F.name[i], x0:A.a[0], y0:A.a[1], x1:A.b[0], y1:A.b[1], av, prio:F.prio[i], media:false}); } }
  // encadenar los tramos de la misma calle que siguen en línea (también los repetidos: el frente de enfrente da el mismo tramo)
  const porNombre = new Map(); for(const t of crudos){ let a=porNombre.get(t.nid); if(!a){ a=[]; porNombre.set(t.nid,a); } a.push(t); }
  const out = [];
  for(const ts of porNombre.values()){
    const usados = new Set();
    for(let k=0;k<ts.length;k++){ if (usados.has(k)) continue; usados.add(k); let T = {...ts[k]};
      let creció = true;
      while(creció){ creció = false; const dx=T.x1-T.x0, dy=T.y1-T.y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
        for(let q=0;q<ts.length;q++){ if (usados.has(q)) continue; const S=ts[q]; const sx=S.x1-S.x0, sy=S.y1-S.y0, SL=Math.hypot(sx,sy)||1;
          if (Math.abs((sx*ux+sy*uy)/SL) < 0.985) continue;
          const lat0 = Math.abs((S.x0-T.x0)*uy-(S.y0-T.y0)*ux), lat1 = Math.abs((S.x1-T.x0)*uy-(S.y1-T.y0)*ux); if (Math.max(lat0,lat1) > 6) continue;
          const s0=(S.x0-T.x0)*ux+(S.y0-T.y0)*uy, s1=(S.x1-T.x0)*ux+(S.y1-T.y0)*uy, lo=Math.min(s0,s1), hi=Math.max(s0,s1);
          if (lo > L+30 || hi < -30) continue;   // separados por más de un cruce
          const nlo=Math.min(0,lo), nhi=Math.max(L,hi);
          T = {...T, x0:T.x0+ux*nlo, y0:T.y0+uy*nlo, x1:T.x0+ux*nhi, y1:T.y0+uy*nhi, av:T.av||S.av, prio:Math.max(T.prio,S.prio), media:T.media||S.media};
          usados.add(q); creció = true; break; } }
      out.push({...T, c}); } }
  return out; }
function tramosDe(col){ const t = ETQ_COL.get(col); if (t) return t; if (!ETQ_EN_COLA.has(col)){ ETQ_EN_COLA.add(col); ETQ_COLA.push(col); trabajarEtq(); } return null; }
function trabajarEtq(){ if (etqTrabajando) return; etqTrabajando = true;
  const paso = dl=>{ const fin = performance.now()+10;
    while(ETQ_COLA.length && (dl? dl.timeRemaining()>1 : performance.now()<fin)){ const col = ETQ_COLA.shift(); ETQ_COL.set(col, tramosColonia(col)); ETQ_EN_COLA.delete(col); }
    if (ETQ_COLA.length){ enRatos(paso); return; }
    etqTrabajando = false; clearTimeout(etqAviso); etqAviso = setTimeout(()=>{ if (window.SIA_LISTO && viewState.zoom>=15) rerender(); }, 60); };
  enRatos(paso); }

// ---------- tramos rectos de las vialidades primarias (una vez) ----------
let ETQ_VP = null;
function tramosVP(){ if (ETQ_VP) return ETQ_VP; ETQ_VP = [];
  for(let i=0;i<NV;i++){ const a=vstart[i], b=vstart[i+1]; if (b-a<2) continue; const c=Math.cos(VPOS[2*a+1]*Math.PI/180);
    const P=[]; for(let k=a;k<b;k++) P.push([VPOS[2*k]*111320*c, VPOS[2*k+1]*110540]);
    // simplificación (Douglas-Peucker, 4 m): cada segmento que queda es un tramo recto
    const marca = new Uint8Array(P.length); marca[0]=marca[P.length-1]=1;
    const dp = (s,e)=>{ let dm=0, im=-1; const dx=P[e][0]-P[s][0], dy=P[e][1]-P[s][1], L=Math.hypot(dx,dy)||1;
      for(let k=s+1;k<e;k++){ const d=Math.abs((P[k][0]-P[s][0])*dy-(P[k][1]-P[s][1])*dx)/L; if (d>dm){ dm=d; im=k; } }
      if (dm>4){ marca[im]=1; dp(s,im); dp(im,e); } };
    dp(0, P.length-1); let prev=0;
    for(let k=1;k<P.length;k++) if (marca[k]){ const L=Math.hypot(P[k][0]-P[prev][0], P[k][1]-P[prev][1]);
      if (L>=40) ETQ_VP.push({nid:'vp'+VP.nom[i], texto:String(VPC.nomenclat[VP.nom[i]]||''), x0:P[prev][0], y0:P[prev][1], x1:P[k][0], y1:P[k][1], c, av:true, prio:VP.prio[i], media:true, vp:true});
      prev=k; } }
  ETQ_VP = ETQ_VP.filter(t=>t.texto && !/^sin nombre$/i.test(t.texto)); return ETQ_VP; }

// ---------- acomodo ----------
let ETQ_Z = null;   // zoom redondeado del último acomodo
function rectsUI(){ const m = mapEl.getBoundingClientRect(), out=[];
  for(const id of ['mapsum','panel-toggle','leymini','scalebar','legend','card','locchips']){ const el=$(id); if (!el || el.hidden) continue; const r=el.getBoundingClientRect();
    if (!r.width || !r.height || r.right<m.left || r.left>m.right || r.bottom<m.top || r.top>m.bottom) continue;
    if (getComputedStyle(el).visibility==='hidden' || getComputedStyle(el).display==='none') continue;
    out.push([r.left-m.left, r.top-m.top, r.right-m.left, r.bottom-m.top]); }
  return out; }
function colocarNombres(){
  const z = viewState.zoom, zr = Math.round(z/ETQ_PASO)*ETQ_PASO, k = Math.pow(2, z-zr);
  const W = mapEl.clientWidth||800, H = mapEl.clientHeight||600; const [cx, cy] = aMundo(viewState.longitude, viewState.latitude, zr);
  const vx0 = cx-W/2/k, vy0 = cy-H/2/k, vx1 = cx+W/2/k, vy1 = cy+H/2/k;   // la vista, en píxeles del mundo a zr
  const mx = (vx1-vx0)*0.3, my = (vy1-vy0)*0.3;                             // margen: lo que está cerca de la orilla se decide igual al moverse
  const dentro = (x,y,m=0)=> x>=vx0-m && x<=vx1+m && y>=vy0-m && y<=vy1+m;
  // rejilla de choques: celdas de 32 px con los círculos ya puestos
  const R = ETQ_TAM/2 + ETQ_HOLGURA, G = new Map(), CEL = 32;
  const choca = cs=>{ for(const [x,y,r] of cs){ const gx=Math.floor(x/CEL), gy=Math.floor(y/CEL);
      for(let a=gx-1;a<=gx+1;a++) for(let b=gy-1;b<=gy+1;b++){ const l=G.get(a*1e6+b); if(!l) continue; for(const [x2,y2,r2] of l) if ((x-x2)*(x-x2)+(y-y2)*(y-y2) < (r+r2)*(r+r2)) return true; } }
    return false; };
  const pon = cs=>{ for(const p of cs){ const key=Math.floor(p[0]/CEL)*1e6+Math.floor(p[1]/CEL); let l=G.get(key); if(!l){ l=[]; G.set(key,l); } l.push(p); } };
  const fila = (x,y,ang,w,r)=>{ const ux=Math.cos(ang), uy=-Math.sin(ang), n=Math.max(1, Math.ceil(w/r)); const cs=[];
    for(let q=0;q<=n;q++){ const t=-w/2+w*q/n; cs.push([x+ux*t, y+uy*t, r]); } return cs; };
  // los paneles sobre el mapa son obstáculos (en píxeles del mundo)
  for(const [a,b,c2,d] of rectsUI()){ const x0=vx0+a/k, y0=vy0+b/k, x1=vx0+c2/k, y1=vy0+d/k;
    for(let x=x0; x<=x1; x+=R) for(let y=y0; y<=y1; y+=R) pon([[x,y,R*0.75]]); }
  const out = {alc:[], col:[], st:[]};
  // 1. alcaldías (de lejos)
  if (z<14){ const t = z<11.5? 13 : 15;
    for(const l of ALC_LABELS){ const [x,y]=aMundo(l.pos[0], l.pos[1], zr); const w=anchoTexto(l.text, `600 ${t}px Cabin, Roboto, sans-serif`);
      const cs=fila(x,y,0,w,t/2+ETQ_HOLGURA); if (!choca(cs)){ pon(cs); out.alc.push(l); } } }
  // 2. colonias (la elegida primero; luego las de mayor superficie)
  if (z>=13.6 && !isGC()){ const ls = colLabelsFor(sel).slice().sort((a,b)=> (b.i===selCol)-(a.i===selCol) || colArea(b.i)-colArea(a.i));
    for(const l of ls){ const [x,y]=aMundo(l.pos[0], l.pos[1], zr); if (!dentro(x,y,Math.max(mx,my))) continue; const w=anchoTexto(l.text.toUpperCase(), FUENTE_COL);
      const cs=fila(x,y,0,w,5.25+ETQ_HOLGURA); if (!choca(cs)){ pon(cs); out.col.push(l); } } }
  // 3. calles y vialidades primarias (zoom ≥ 15)
  lblCenter = z>=13.6? [viewState.longitude, viewState.latitude] : null;
  if (z>=15 && showFrB){
    const mpp = 40075016.686*Math.cos(viewState.latitude*Math.PI/180)/(512*Math.pow(2,zr));   // metros por píxel del mundo a zr
    const tramos = [];
    if (!isGC()){ const b = new WebMercatorViewport({...viewState, width:W, height:H}).getBounds(); const ex=(b[2]-b[0])*0.3, ey=(b[3]-b[1])*0.3;
      for(const cc of COLS){ if (sel!==null && munIndex[cc.mun]!==sel) continue; const bb=colBB(cc.i); if (bb[2]<b[0]-ex||bb[0]>b[2]+ex||bb[3]<b[1]-ey||bb[1]>b[3]+ey) continue;
        const ts = tramosDe(cc.i); if (ts) for(const t of ts) if (visible[t.prio]) tramos.push(t); } }
    for(const t of tramosVP()) if (!isGC() || visible[t.prio]) tramos.push(t);
    const nidSel = nidResaltado();
    const cands = [];
    for(const t of tramos){
      const texto = t.vp? t.texto : META.names[t.nid]; const w = anchoTexto(texto, FUENTE_CALLE);
      const [ax,ay] = aMundo(t.x0/(111320*t.c), t.y0/110540, zr), [bx,by] = aMundo(t.x1/(111320*t.c), t.y1/110540, zr);
      const L = Math.hypot(bx-ax, by-ay); if (L < 1.05*w) continue;   // el nombre no cabe en el tramo
      if (!dentro((ax+bx)/2, (ay+by)/2, Math.max(mx,my)+L/2)) continue;
      let ang = Math.atan2(-(by-ay), bx-ax); if (ang>Math.PI/2) ang-=Math.PI; if (ang<-Math.PI/2) ang+=Math.PI;
      const grupo = t.nid===nidSel? 0 : t.vp? 1 : t.av? 2 : 3;
      // posiciones posibles del centro (cada 30 m), y de ellas la más cercana a un nodo de la cuadrícula fija
      const s0 = w/2, s1 = L-w/2, paso = Math.max(30/mpp, 8); let mejor=null;
      for(let s=s0; s<=s1+1e-6; s+=paso){ const x=ax+(bx-ax)*s/L, y=ay+(by-ay)*s/L;
        const gx=Math.round(x/ETQ_CUAD)*ETQ_CUAD, gy=Math.round(y/ETQ_CUAD)*ETQ_CUAD, d=Math.hypot(x-gx, y-gy); if (!mejor || d<mejor.d) mejor={x,y,d}; }
      if (s1<s0){ mejor={x:(ax+bx)/2, y:(ay+by)/2, d:0}; }
      cands.push({t, texto, w, ang, L, grupo, ...mejor}); }
    cands.sort((a,b)=> a.grupo-b.grupo || a.d-b.d || b.L-a.L || a.x-b.x || a.y-b.y);
    const puestos = new Map();   // nid → posiciones ya puestas (para no repetir la calle a menos de ETQ_REPITE)
    for(const c of cands){ if (!dentro(c.x, c.y)) continue;
      const ya = puestos.get(c.t.nid); if (ya && ya.some(([x,y])=>Math.hypot(x-c.x, y-c.y) < ETQ_REPITE)) continue;
      const cs = fila(c.x, c.y, c.ang, c.w, R); if (choca(cs)) continue; pon(cs);
      if (ya) ya.push([c.x,c.y]); else puestos.set(c.t.nid, [[c.x,c.y]]);
      const s = 512*Math.pow(2,zr), lon = c.x/s*360-180, lat = Math.atan(Math.sinh(Math.PI*(1-2*c.y/s)))*180/Math.PI;
      out.st.push({pos:[lon,lat], text:c.texto, ang:c.ang*180/Math.PI, media:c.t.media, vp:!!c.t.vp}); } }
  ETQ_Z = zr; return out; }
const COL_AREA = new Map();
function colArea(i){ let a=COL_AREA.get(i); if (a===undefined){ a=0; for(const cc of COLS) if (cc.i===i) for(const p of cc.paths) a+=areaAnillo(p); COL_AREA.set(i,a); } return a; }
// ¿hay que volver a acomodar los nombres? (otro paso de zoom, o la vista se alejó de donde se acomodaron)
const etqDesfasado = vs=> (ETQ_Z!==null && Math.round(vs.zoom/ETQ_PASO)*ETQ_PASO!==ETQ_Z) || lblDesfasado(vs);
