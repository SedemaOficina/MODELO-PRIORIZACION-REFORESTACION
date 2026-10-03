// Datos: descarga (sitio) o lectura (archivo único) de meta.bin, data.bin y vp.bin, descompresión y decodificación a arreglos (frentes F, geometría POS, vialidades primarias VP).
// ---------- lectura y decodificación ----------
function b64ToBytes(s){ const bin = atob(s); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
async function gunzip(bytes){
  if (typeof DecompressionStream !== 'undefined'){
    try{ const ds = new DecompressionStream('gzip'); const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer(); return new Uint8Array(ab); }
    catch(e){ console.warn('DecompressionStream falló, usando pako', e); }
  }
  try { const out = pako.inflate(bytes); if (!out || !out.length) throw new Error('descompresión vacía'); return out; }
  catch(e){ throw errAmable('Un archivo de datos llegó dañado o incompleto. Suele deberse a una descarga interrumpida.', 'descompresión: ' + (e && e.message || e)); }
}
const setLoad = (msg, p)=>{ $('load-msg').textContent = msg; $('load-bar').style.width = (p*100)+'%'; };
// datos: incrustados en la página (artefacto, versión de un solo archivo) o en archivos aparte (docs/datos)
const DATOS = window.SIA_DATOS || null;
let dlDone = 0, dlShow = true;
function showDl(){ if (!dlShow || !DATOS) return; const mb = v => fmt1.format(v/1048576); setLoad('Descargando datos: ' + mb(dlDone) + ' de ' + mb(DATOS.total) + ' MB', .02 + .2*Math.min(1, dlDone/DATOS.total)); }
async function fetchBytes(name){
  let r;
  try { r = await fetch('datos/' + name + '?v=' + DATOS.v[name]); }
  catch(e){ throw errAmable(location.protocol==='file:' ? 'Esta versión se abre desde un servidor web (GitHub Pages o el SIA). Para abrirla con doble clic usa _local/calles_prioritarias.html.' : 'No se pudieron descargar los datos. Revisa tu conexión a internet.', 'fetch ' + name + ': ' + (e && e.message || e)); }
  if (!r.ok) throw errAmable(r.status===401 || r.status===403 ? 'El servidor no permitió descargar los datos (acceso denegado). Si la herramienta pide sesión, vuelve a entrar.' : `No se encontró un archivo de datos en el servidor (${name}, respuesta ${r.status}).`, name + ' ' + r.status);
  if (!r.body || !r.body.getReader){ const b = new Uint8Array(await r.arrayBuffer()); dlDone += b.length; showDl(); return b; }
  const rd = r.body.getReader(), parts = []; let n = 0;
  for(;;){ const {done, value} = await rd.read(); if (done) break; parts.push(value); n += value.length; dlDone += value.length; showDl(); }
  const out = new Uint8Array(n); let o = 0; for (const q of parts){ out.set(q, o); o += q.length; } return out;
}
const blk = (id, name) => { const el = $(id); if (el) return Promise.resolve(b64ToBytes(el.textContent.trim()));
  if (!DATOS) return Promise.reject(errAmable('Falta el archivo de configuración del sitio (config.js): la herramienta no sabe dónde están sus datos. Avisa al Sistema de Información Ambiental.', 'sin window.SIA_DATOS'));
  return fetchBytes(name); };
const pMeta = blk('meta-b64','meta.bin'), pData = blk('data-b64','data.bin'), pVp = blk('vp-b64','vp.bin');
pMeta.catch(()=>{}); pData.catch(()=>{}); pVp.catch(()=>{});
// El lector falla si se acaban los bytes (antes devolvía ceros y un archivo cortado pasaba por completo; auditoría H-033)
const DATOS_CORTOS = () => errAmable('Un archivo de datos llegó incompleto: su contenido termina antes de lo declarado. Suele deberse a una descarga interrumpida.', 'datos cortos');
function reader(raw){ let rp=0; const f = ()=>{ let res=0, shift=0, b; do{ if (rp>=raw.length) throw DATOS_CORTOS(); b=raw[rp++]; res += (b & 0x7f) * Math.pow(2,shift); shift+=7; }while(b & 0x80); return (res % 2) ? -((res+1)/2) : res/2; }; f.pos = ()=>rp; return f; }

setLoad(DATOS ? 'Descargando datos…' : 'Descomprimiendo catálogos…', .02);
let META; try { META = JSON.parse(new TextDecoder().decode(await gunzip(await pMeta))); }
catch(e){ throw e.amable? e : errAmable('El catálogo de la herramienta (meta.bin) llegó dañado o incompleto.', 'meta: ' + (e && e.message || e)); }
// catálogos: se neutraliza cualquier marcado antes de usarlos en la interfaz (auditoría H-037)
META.names = META.names.map(limpioCat); META.munNames = META.munNames.map(limpioCat);
META.colonias.forEach(c=>{ c.n = limpioCat(c.n); c.ut = limpioCat(c.ut); c.ids = limpioCat(c.ids); c.cp = limpioCat(c.cp); });
['nomenclat','nombres','alctxt','claves','tipos','circula'].forEach(k=>{ if (Array.isArray(META.vp[k])) META.vp[k] = META.vp[k].map(limpioCat); });
['prio','disp','tipos'].forEach(k=>{ META[k] = META[k].map(limpioCat); });
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
// el archivo debe traer exactamente los frentes declarados y no sobrar ni faltar bytes (auditoría H-033)
if (N!==META.N || rv.pos()!==raw.length) throw errAmable('El archivo de frentes de manzana no corresponde con su catálogo o llegó incompleto. Recarga la página.', `data.bin: N=${N} META.N=${META.N} pos=${rv.pos()} de ${raw.length}`);
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
if (NV!==+META.vp.n || rv.pos()!==vraw.length) throw errAmable('El archivo de vialidades primarias no corresponde con su catálogo o llegó incompleto. Recarga la página.', `vp.bin: NV=${NV} META.vp.n=${META.vp.n} pos=${rv.pos()} de ${vraw.length}`);
vstart[NV]=vc; const VPOS = vtmp.slice(0, vc*2); const VV = vc;
const VPC = META.vp; // catálogos de la capa
setLoad('Preparando capas…', .85);
await new Promise(r=>setTimeout(r,20));
