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
// Reglas de negocio en un solo lugar. Clases de prioridad: 0 Muy Baja … 4 Muy Alta.
//  · «prioritario» = Muy Alta, Alta y Media (clase ≥ PRIO_MIN).
const PRIO_MIN = 2;
const esPrio = p => p >= PRIO_MIN;
const sumPrio = a => { let t = 0; for (let k = PRIO_MIN; k < a.length; k++) t += a[k]; return t; };   // suma de un arreglo por clase sobre las clases prioritarias
// Versión de la herramienta y corte de los datos: los fija construir.py (VERSION y CORTE_DATOS) y se muestran en el panel, las fichas y los Excel.
const VERSION = Object.assign({v:'', fecha:'', corte:''}, window.SIA_VERSION || {});
const VERSION_TXT = `Versión ${VERSION.v}${VERSION.fecha? ' · Última actualización: '+VERSION.fecha : ''} · Datos: ${VERSION.corte}`;
// Errores con mensaje para la persona usuaria: `amable` es lo que se muestra; el detalle técnico va a la consola.
function errAmable(msg, detalle){ const e = new Error(detalle || msg); e.amable = msg; return e; }
// ---------- política de seguridad de contenido ----------
// Una política estricta rechaza los atributos style escritos en el HTML. Los estilos calculados (color de cada prioridad, ancho
// de cada barra) se escriben en las plantillas como data-st="propiedad:valor" y aquí se aplican por programa, que sí está permitido.
function aplicaSt(n){ const f = el => { for (const par of el.getAttribute('data-st').split(';')){ const k = par.indexOf(':'); if (k>0) el.style.setProperty(par.slice(0,k).trim(), par.slice(k+1).trim()); } el.removeAttribute('data-st'); };
  if (n.hasAttribute && n.hasAttribute('data-st')) f(n); if (n.querySelectorAll) n.querySelectorAll('[data-st]').forEach(f); }
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType===1) aplicaSt(n); }).observe(document.documentElement, {childList:true, subtree:true});
aplicaSt(document.documentElement);
// ---------- sesión ----------
// En el SIA la herramienta puede quedar detrás de un inicio de sesión. Las direcciones las fija construir.py (SESION_*); vacías = sin sesión.
const SESION = Object.assign({inicio:'', cierre:'', usuario:'', uso:''}, window.SIA_SESION || {});
// Registro de usos: SOLO detrás del inicio de sesión del SIA. Avisa al servidor qué ámbito se consulta y qué archivo se descarga,
// para el reporte de usos por alcaldía (ver 08_entrega_sia/login/). Sin sesión configurada (GitHub Pages, archivo único) no envía nada.
const USO_URL = SESION.uso || (SESION.inicio ? '/priorizacion-reforestacion/api/uso' : '');
function avisaUso(datos){ if (!USO_URL || !navigator.sendBeacon) return; try { navigator.sendBeacon(USO_URL, JSON.stringify(datos)); } catch(e){} }
const SESION_TXT = 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.';
// Una sesión vencida se reconoce por la respuesta 401 o 403, o porque llega una página (HTML) donde se esperaba un archivo de datos o un programa.
const esSesion = r => !!r && (r.status===401 || r.status===403 || (r.ok && (r.headers.get('content-type')||'').toLowerCase().includes('text/html')));
const errSesion = detalle => { const e = errAmable(SESION_TXT, detalle); e.sesion = true; return e; };
// por qué no llegó un archivo: 'sesion', 'red' (sin conexión) o 'servidor' (el archivo no está o el servidor falló)
async function causaFalla(url){ if (/^blob:|^data:/.test(url)) return 'servidor'; try { const r = await fetch(url, {cache:'no-store'}); return esSesion(r)? 'sesion' : r.ok? 'otra' : 'servidor'; } catch(e){ return 'red'; } }
function avisoSesion(el){ el.textContent = SESION_TXT + ' '; if (SESION.inicio){ const a = document.createElement('a'); a.href = SESION.inicio; a.textContent = 'Iniciar sesión'; el.appendChild(a); } }
// Los textos de los catálogos se interpolan en HTML en muchos puntos: se neutralizan al entrar.
// Un nombre con marcado es un error del insumo; se muestra con comillas angulares simples y no puede ejecutar código.
// Además, los espacios raros del catálogo (no separables, dobles, al inicio o al final) quedan como un espacio normal: se ven igual y no estorban a la búsqueda
const limpioCat = s => typeof s==='string'? s.replace(/</g,'‹').replace(/>/g,'›').replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]+/g,' ').trim() : s;
// aviso no bloqueante sobre el mapa (errores de dibujo, contexto gráfico perdido, errores inesperados)
// sin mapa (el contexto gráfico se perdió o deck.gl falló al dibujar): en el celular queda solo la información (pantalla() en 13_interfaz.js)
let HAY_MAPA = true;
function sinMapa(){ HAY_MAPA = false; document.body.classList.add('sin-mapa'); try { pantalla('info'); } catch(e){ /* todavía no hay pantallas: al crearse ya ven HAY_MAPA */ } }
function avisoMapa(html, conRecarga){ if (conRecarga) sinMapa(); const p = document.querySelector('.mapwrap'); if (!p || p.querySelector('.aviso-error')) return;
  const n = document.createElement('div'); n.className = 'aviso-ligero aviso-error'; n.setAttribute('role','alert');
  n.innerHTML = html + (conRecarga? ' <button type="button" class="recarga">Recargar la página</button>' : '') + '<button type="button" class="cierra" aria-label="Cerrar aviso">×</button>';
  n.querySelector('.cierra').onclick = ()=> n.remove(); const r = n.querySelector('.recarga'); if (r) r.onclick = ()=> location.reload(); p.appendChild(n); }
const NAVEGADORES = 'Chrome o Edge 80, Firefox 79, Safari 15 o posteriores';
if (typeof deck === 'undefined') throw errAmable(`No se pudo cargar el componente del mapa. Puede ser una descarga interrumpida o un navegador antiguo (se requiere ${NAVEGADORES}).`, 'deck.gl no está definido');
if (!(()=>{ try { return !!document.createElement('canvas').getContext('webgl2'); } catch(e){ return false; } })())
  throw errAmable(`Este navegador o equipo no puede dibujar el mapa: no tiene disponible WebGL 2. Usa ${NAVEGADORES}, y revisa que la aceleración gráfica esté activada.`, 'sin WebGL2');
// Disposición de teléfono (hoja inferior): pantallas angostas. Un teléfono en horizontal (poco alto, más de 600 px de ancho)
// usa la disposición de panel lateral, más angosto. La misma consulta está en las hojas de estilo.
const MQ_TEL = '(max-width:860px) and (min-height:481px), (max-width:600px)';

// Datos: descarga (sitio) o lectura (archivo único) de meta.bin, data.bin y vp.bin, descompresión y decodificación a arreglos (frentes F, geometría POS, vialidades primarias VP).
// ---------- lectura y decodificación ----------
function b64ToBytes(s){ const bin = atob(s); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
async function gunzip(bytes){
  // Si un servidor intermedio ya descomprimió el archivo (no trae la firma gzip 1f 8b), se usa tal cual
  if (bytes.length>1 && !(bytes[0]===0x1f && bytes[1]===0x8b)) return bytes;
  if (typeof DecompressionStream !== 'undefined'){
    try{ const ds = new DecompressionStream('gzip'); const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer(); return new Uint8Array(ab); }
    catch(e){ console.warn('DecompressionStream falló, usando pako', e); }
  }
  try { const out = pako.inflate(bytes); if (!out || !out.length) throw new Error('descompresión vacía'); return out; }
  catch(e){ throw errAmable('Un archivo de datos llegó dañado o incompleto. Suele deberse a una descarga interrumpida.', 'descompresión: ' + (e && e.message || e)); }
}
// La barra se reparte según lo que tarda cada etapa: la descarga de los datos es casi toda la espera
const setLoad = (msg, p)=>{ $('load-msg').textContent = msg; const b=$('load-bar'); b.parentElement.classList.remove('indet'); b.style.width = (p*100)+'%'; b.parentElement.setAttribute('aria-valuenow', String(Math.round(p*100))); };
// datos: incrustados en la página (archivo único) o en archivos aparte (docs/datos)
const DATOS = window.SIA_DATOS || null;
let dlDone = 0, dlShow = true;
function showDl(){ if (!dlShow || !DATOS) return; const mb = v => fmt1.format(v/1048576); setLoad('Descargando datos: ' + mb(dlDone) + ' de ' + mb(DATOS.total) + ' MB', .03 + .72*Math.min(1, dlDone/DATOS.total)); }
async function fetchBytes(name){
  let r;
  try { r = await fetch('datos/' + name + '?v=' + DATOS.v[name]); }
  catch(e){ throw errAmable(location.protocol==='file:' ? 'Esta versión se abre desde un servidor web (GitHub Pages o el SIA). Para abrirla con doble clic usa _local/priorizacion_reforestacion.html.' : 'No se pudieron descargar los datos. Revisa tu conexión a internet.', 'fetch ' + name + ': ' + (e && e.message || e)); }
  if (esSesion(r)) throw errSesion(name + ' ' + r.status + ' ' + (r.headers.get('content-type')||''));
  if (!r.ok) throw errAmable(`No se encontró un archivo de datos en el servidor (${name}, respuesta ${r.status}).`, name + ' ' + r.status);
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
// El lector falla si se acaban los bytes: un archivo cortado no pasa por completo
const DATOS_CORTOS = () => errAmable('Un archivo de datos llegó incompleto: su contenido termina antes de lo declarado. Suele deberse a una descarga interrumpida.', 'datos cortos');
function reader(raw){ let rp=0; const f = ()=>{ let res=0, shift=0, b; do{ if (rp>=raw.length) throw DATOS_CORTOS(); b=raw[rp++]; res += (b & 0x7f) * Math.pow(2,shift); shift+=7; }while(b & 0x80); return (res % 2) ? -((res+1)/2) : res/2; }; f.pos = ()=>rp; return f; }

setLoad(DATOS ? 'Descargando datos…' : 'Descomprimiendo catálogos…', .02);
let META; try { META = JSON.parse(new TextDecoder().decode(await gunzip(await pMeta))); }
catch(e){ throw e.amable? e : errAmable('El catálogo de la herramienta (meta.bin) llegó dañado o incompleto.', 'meta: ' + (e && e.message || e)); }
// catálogos: se neutraliza cualquier marcado antes de usarlos en la interfaz
META.names = META.names.map(limpioCat); META.munNames = META.munNames.map(limpioCat);
META.colonias.forEach(c=>{ c.n = limpioCat(c.n); c.ut = limpioCat(c.ut); c.ids = limpioCat(c.ids); c.cp = limpioCat(c.cp); });
// nombre de colonia para mostrar (acentos, abreviaturas; 03_procesamiento_datos/7_nombres_colonias.py); el del catálogo queda en c.cat
// para los Excel y la búsqueda
for (const [k, n] of Object.entries(window.SIA_NOMBRES_COL || {})){ const c = META.colonias[+k]; if (c && c.n){ c.cat = c.n; c.n = n; } }
['nomenclat','nombres','alctxt','claves','tipos','circula'].forEach(k=>{ if (Array.isArray(META.vp[k])) META.vp[k] = META.vp[k].map(limpioCat); });
['prio','disp','tipos'].forEach(k=>{ META[k] = META[k].map(limpioCat); });
const Q = META.Q;
const rawGz = await pData; dlShow = false;
setLoad('Descomprimiendo 372 mil frentes…', .78);
const raw = await gunzip(rawGz);
setLoad('Construyendo geometría…', .84);
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
// el archivo debe traer exactamente los frentes declarados y no sobrar ni faltar bytes
if (N!==META.N || rv.pos()!==raw.length) throw errAmable('El archivo de frentes de manzana no corresponde con su catálogo o llegó incompleto. Recarga la página.', `data.bin: N=${N} META.N=${META.N} pos=${rv.pos()} de ${raw.length}`);
const POS = tmpPos.slice(0, vcount*2);
const V = vcount;
// Punto a media longitud SOBRE la línea (no el promedio de sus extremos, que en una curva cae fuera de la calle).
// Es la única regla de «punto medio» de la herramienta: tarjeta, Excel, enlaces de campo y Mi ubicación.
function puntoMedio(P, a, b){ const c=Math.cos(P[2*a+1]*Math.PI/180); let L=0; for(let k=a;k<b-1;k++) L+=Math.hypot((P[2*k+2]-P[2*k])*c, P[2*k+3]-P[2*k+1]);
  if (!L) return [P[2*a], P[2*a+1]]; let h=L/2;
  for(let k=a;k<b-1;k++){ const d=Math.hypot((P[2*k+2]-P[2*k])*c, P[2*k+3]-P[2*k+1]); if (h<=d){ const t=d? h/d : 0; return [P[2*k]+(P[2*k+2]-P[2*k])*t, P[2*k+1]+(P[2*k+3]-P[2*k+1])*t]; } h-=d; }
  return [P[2*(b-1)], P[2*(b-1)+1]]; }
const midLon = i => puntoMedio(POS, start[i], start[i+1])[0];
const midLat = i => puntoMedio(POS, start[i], start[i+1])[1];

// vialidades primarias (Gobierno Central)
setLoad('Cargando vialidades primarias…', .9);
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
setLoad('Preparando capas…', .95);
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
  T.inv = ['--inv-cepa','--inv-tocon','--inv-muerto'].map(v=>hex(css(v)));   // espacios para plantar (05_inventario.js)
  T.manzana = hex(css('--fondo-manzana')); T.fverde = hex(css('--fondo-verde')); T.fagua = hex(css('--fondo-agua'));
}
readTokens();

// ---------- estado de la consulta ----------
let resp = 'alc';         // 'alc' | 'gc' | 'both'  → responsable consultado
let sel = null;           // índice de alcaldía o null
let selCol = null;        // id de colonia o null
let selAv = null;         // id de avenida (NOMENCLAT) o null — solo modo Gobierno Central
let highlight = null;     // {nameId, idx:[...]} (calles) | {avId, idx:[...]} (vialidades)
let pinned = null;        // {kind:'fr'|'vp'|'col'|'inv'|'loc'|'pto', i}  (inv: i es el punto del inventario)
let viewState = null;
let locSel = false;       // true mientras Mi ubicación cambia el ámbito por sí misma (no es un cambio hecho a mano)
let restaurando = true;   // mientras arranca o se restaura una consulta desde la dirección no se escribe en el historial
const LOC_BLUE = hex(css('--loc')).slice(0,3);   // azul de Mi ubicación (variable --loc en 01_variables.css)
let myPos = null;          // Mi ubicación: {lon, lat, acc, t}; nunca sale del teléfono
let ptoBuscado = null;     // punto buscado por coordenadas: {lon, lat}; se marca en el mapa hasta otra búsqueda o al cerrar su ficha
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
// Espacio: frentes con al menos un punto del inventario de arbolado (a 20 m o menos) de los tipos elegidos. filtroEsp guarda los tipos en
// bits (1 cepa vacante, 2 tocón, 4 árbol muerto; 0 = sin filtro); ESP_FR (Uint8Array de N) trae los tipos de cada frente y lo carga
// espCargar() (05_inventario.js) la primera vez que se pide el filtro: filtroEsp solo cambia cuando ESP_FR ya está. Igual que la banqueta,
// forma parte del filtro único y se combina con ella. El inventario está en curso: donde no hay puntos puede que aún no se haya inventariado.
// ESP_CV (Uint16Array de N), del mismo archivo, trae las cepas vacantes de cada frente: las cuenta el orden «más cepas vacantes» de
// «Dónde empezar» (09_listados.js) en los frentes que pasan enAmbito(i): las de los prioritarios ordenan y las de cualquier prioridad dan el total del renglón.
// ESP_FRN (Uint16Array de 3·N), también de ese archivo, trae cuántas cepas vacantes, tocones y árboles muertos tiene cada frente: las
// columnas de los Excel, el GeoJSON y el KML (11_descargas.js).
let filtroEsp = 0, ESP_FR = null, ESP_CV = null, ESP_FRN = null;
const ESP_TIPOS = [{k:'cv', n:'cepa vacante', s:'cepa_vacante'}, {k:'to', n:'tocón', s:'tocon'}, {k:'am', n:'árbol muerto', s:'arbol_muerto'}];
const pasaEspacio = i => filtroEsp===0 || (ESP_FR!==null && (ESP_FR[i] & filtroEsp)!==0);
const enAmbito = i => enTerritorio(i) && pasaBanq(i) && pasaEspacio(i);
// El mismo filtro para el Gobierno Central (v1.24): una parte de vialidad primaria pasa si tiene al menos un punto de los tipos elegidos.
// Cuentan los puntos de sus frentes de manzana a cargo del Gobierno Central y los del camellón (sin frente y a 25 m o menos de su eje);
// los de los frentes de las alcaldías no. ESP_VP (Uint8Array de NV) trae los tipos de cada parte y ESP_VPN (Uint16Array de 3·NV) cuántos
// puntos de cada tipo (ficha del tramo y orden «Avenidas con más cepas vacantes»); los baja espCargar() junto con ESP_FR. pasaEspacioVP es la
// única condición del filtro para las vialidades: la usan enAmbitoVP(i) (mapa, cifras, listas, descargas y fichas) y lo que acota por
// alcaldía o por avenida sin enAmbitoVP. La banqueta no aplica a las vialidades primarias.
let ESP_VP = null, ESP_VPN = null;
const pasaEspacioVP = i => filtroEsp===0 || (ESP_VP!==null && i>=0 && (ESP_VP[i] & filtroEsp)!==0);
const enAmbitoVP = i => (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv) && pasaEspacioVP(i);
// texto que acompaña al ámbito cuando el filtro de banqueta está activo
const banqTxt = () => filtroBanq==='con'? 'solo frentes con banqueta (INEGI 2020)' : filtroBanq==='sin'? 'solo frentes sin banqueta o por verificar (INEGI 2020)' : '';
// tipos elegidos en «Espacio», en palabras: «cepa vacante», «cepa vacante o tocón», «cepa vacante, tocón o árbol muerto»
const espLista = (m = filtroEsp) => { const n = ESP_TIPOS.filter((_, t)=> m & (1<<t)).map(e=>e.n); return n.length<2? n.join('') : n.slice(0,-1).join(', ') + ' o ' + n[n.length-1]; };
// en la dirección (e=cv,to,am) y en el registro de usos; un código desconocido se ignora
const espCodigo = (m = filtroEsp) => ESP_TIPOS.filter((_, t)=> m & (1<<t)).map(e=>e.k).join(',');
const espDeTexto = t => String(t||'').split(/[\s,.;_-]+/).reduce((m, k)=>{ const t2 = ESP_TIPOS.findIndex(e=>e.k===k.toLowerCase()); return t2<0? m : m | (1<<t2); }, 0);
const espTxt = () => filtroEsp?`solo frentes con ${espLista()} (inventario de arbolado)` : '';
// lo mismo para las vialidades primarias (el filtro de banqueta no les aplica): etiqueta larga y corta
const espTxtVP = () => filtroEsp?`solo tramos con ${espLista()} (inventario de arbolado)` : '';
const espCorto = () => filtroEsp? ' · con ' + espLista() : '';
// los dos filtros juntos: lo dicen las cifras, el resumen del mapa, los archivos y las fichas; con los dos apagados, nada cambia
const hayFiltro = () => filtroBanq!=='todas' || filtroEsp!==0;
const filtroTxt = () => filtroBanq!=='todas' && filtroEsp? `${banqTxt()} y con ${espLista()} (inventario de arbolado)` : banqTxt() || espTxt();
const filtroCorto = () => (filtroBanq==='con'? ' · con banqueta' : filtroBanq==='sin'? ' · sin banqueta o por verificar' : '') + (filtroEsp? ' · con ' + espLista() : '');
const filtroClave = () => filtroBanq + '|' + filtroEsp;   // las cifras guardadas en caché se rehacen al cambiar cualquiera de los dos
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
    const inS = enAmbitoVP(i);
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
// mapa de fondo: 'no' | 'calles' | 'sat'. Al abrir, el propio «Calles» (las calles se ven como el hueco entre manzanas); en el archivo
// único, que no trae sus datos, sin fondo
const FONDO_INICIAL = window.SIA_FONDO? 'calles' : 'no';
let fondo = FONDO_INICIAL;
const ZOOM_LIGERO = 13;
const frVisibles = ()=> showFrB && !(modoLigero && viewState.zoom < ZOOM_LIGERO);
const showCol = ()=> showColB && !isGC(), showFr = ()=> showFrB, colOnly = ()=> showColB && !frVisibles() && !isGC(), alcOnly = ()=> showAlcB && !showColB && !showFrB;
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
  L.push(...invCapas());   // espacios para plantar del inventario de arbolado (05_inventario.js), debajo de los nombres
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
    const nidSel = highlight && highlight.nameId!==undefined? highlight.nameId : null;
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

// Espacios para plantar: cepas vacantes, tocones y árboles muertos del inventario de arbolado (CIGA-UNAM y SEDEMA).
// Es una capa de oportunidad ENCIMA del modelo: no cambia ninguna prioridad, cifra, lista ni descarga. Cada punto trae el frente de
// manzana más cercano (a 20 m o menos), del que toma calle, colonia, alcaldía y prioridad para su ficha.
// Aparte, el filtro «Espacio» (07_leyenda_y_capas.js, filtroEsp en 03_estado.js) sí acota cifras, listas y descargas cuando la persona lo
// prende: usa espacios_frentes.bin (puntos de cada tipo por frente), que se pide con espCargar() la primera vez que se usa. El mismo
// archivo da las cepas vacantes por frente (ESP_CV) del orden «más cepas vacantes» de «Dónde empezar» (09_listados.js). Con él llega
// espacios_vp.bin (v1.24): los puntos de cada tipo de cada parte de vialidad primaria del Gobierno Central (ESP_VP, ESP_VPN), por sus frentes
// a cargo del Gobierno Central o en el camellón; los puntos del camellón traen en su archivo la parte de vialidad (p.vp) para su ficha.
// Datos en datos/inventario/ (03_procesamiento_datos/9_inventario_espacios.py): un archivo por alcaldía que se pide al acercar el mapa
// (desde INV_Z; en modo ligero, desde INV_Z_LIGERO) y solo de las alcaldías a la vista, como las manzanas del fondo propio.
// window.SIA_INVENTARIO (config.js) trae la huella de cada archivo, el corte, los puntos por tipo y el avance del inventario por alcaldía.
// El archivo único no lo trae: allí la sección del panel de capas lo dice.
const INV = window.SIA_INVENTARIO || null;
const INV_ESCALA = 200000, INV_Z = 15, INV_Z_LIGERO = 16;   // coordenadas en 1/200,000 de grado (ESCALA en 9_inventario_espacios.py)
const INV_TIPOS = [
  {id:'cepa', n:'Cepa vacante', pl:'Cepas vacantes', que:'Se puede plantar directo'},
  {id:'tocon', n:'Tocón', pl:'Tocones', que:'Hay que retirar el tocón antes de plantar'},
  {id:'muerto', n:'Árbol muerto', pl:'Árboles muertos', que:'Requiere sustitución'}];
const INV_CAPAS = ['inv-cepa', 'inv-tocon', 'inv-muerto'];   // las capas que se pueden tocar (una por tipo)
const invOn = [true, true, true];                            // casillas del panel de capas
const INVD = {mz:new Map(), pend:new Set(), fallo:new Set(), cache:null};
const invZ = ()=> modoLigero? INV_Z_LIGERO : INV_Z;
const invVisible = ()=> !!INV && invOn.some(Boolean) && viewState.zoom >= invZ();
// lee el archivo de una alcaldía (formato 2): FORMATO, n y por punto dx, dy, tipo, dfrente, dletras, duga, dnúmero (en diferencias) y la
// parte de vialidad primaria + 1 de un punto del camellón (0 en los demás; no va en diferencias)
async function invLeer(cve){ const n = 'inv_' + cve + '.bin', v = INV.v[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/inventario/' + n + '?v=' + v); if (esSesion(r)) throw errSesion(n); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); const rv = reader(b);
  const formato = rv(), k = rv(); if (formato!==2) throw new Error(n + ': formato ' + formato);
  const P = new Array(k); let x=0, y=0, fr=0, pre=0, uga=0, num=0;
  for(let i=0;i<k;i++){ x+=rv(); y+=rv(); const t=rv(); fr+=rv(); pre+=rv(); uga+=rv(); num+=rv(); const vp = rv()-1;
    P[i] = {lon:x/INV_ESCALA, lat:y/INV_ESCALA, t, fr:fr-1, pre, uga, num, a:cve, vp: vp>=0 && vp<NV? vp : -1}; }
  if (rv.pos()!==b.length) throw new Error(n + ': sobran bytes');
  return P; }
// clave del inventario (AAA-000-0000): las letras vienen como número en base 26
const invClave = p => String.fromCharCode(65+Math.floor(p.pre/676), 65+Math.floor(p.pre/26)%26, 65+p.pre%26) + '-' + String(p.uga).padStart(3,'0') + '-' + String(p.num).padStart(4,'0');
function invAviso(e){ const n = $('inv-falla'); if (!n) return; n.hidden = false;
  if (e && e.sesion) avisoSesion(n); else n.textContent = 'No fue posible cargar los espacios para plantar de esta zona (revisa la conexión a internet).'; }
// capas del mapa: pide los archivos de las alcaldías a la vista y dibuja cada tipo con su símbolo (sin depender del color):
// cepa = anillo verde con centro hueco; tocón = círculo café relleno; árbol muerto = círculo gris oscuro con «×». Todos con contorno
// blanco, para verse sobre el fondo «Calles» y sobre el satélite.
function invCapas(){ const L = []; const zn = $('inv-zoom'); if (zn) zn.hidden = !INV || viewState.zoom >= invZ();
  if (!invVisible()) return L;
  const b = new WebMercatorViewport({...viewState, width:mapEl.clientWidth||800, height:mapEl.clientHeight||600}).getBounds(); const cves = [];
  ALC.forEach((a,k)=>{ const bb = ALC_BB[k]; if (bb[2]<b[0] || bb[0]>b[2] || bb[3]<b[1] || bb[1]>b[3]) return;
    if (INVD.mz.has(a.cve)) cves.push(a.cve);
    else if (!INVD.pend.has(a.cve) && !INVD.fallo.has(a.cve)){ INVD.pend.add(a.cve);
      invLeer(a.cve).then(P=>{ INVD.mz.set(a.cve, P); INVD.pend.delete(a.cve); if (invVisible()) rerender(); })
        .catch(e=>{ console.warn('inventario', a.cve, e); INVD.pend.delete(a.cve); INVD.fallo.add(a.cve); invAviso(e); }); } });
  // un objeto de datos por tipo; se rehace solo si cambian las alcaldías cargadas a la vista (deck.gl reprocesa cada objeto nuevo)
  const key = cves.join(',');
  if (!INVD.cache || INVD.cache.key!==key){ const D = [[],[],[]]; for (const c of cves) for (const p of INVD.mz.get(c)) D[p.t].push(p); INVD.cache = {key, D}; }
  const D = INVD.cache.D, pos = d=>[d.lon, d.lat], blanco = [255,255,255,235];
  const punto = (id, data, o)=> new deck.ScatterplotLayer({id, data, getPosition:pos, radiusUnits:'pixels', lineWidthUnits:'pixels', ...o});
  if (invOn[0] && D[0].length){
    L.push(punto('inv-cepa-halo', D[0], {getRadius:6, filled:false, stroked:true, getLineWidth:6, getLineColor:blanco, pickable:false}));
    L.push(punto('inv-cepa', D[0], {getRadius:6, filled:false, stroked:true, getLineWidth:3, getLineColor:T.inv[0], pickable:true, autoHighlight:true, highlightColor:T.gold, updateTriggers:{getLineColor:[T.inv[0]]}})); }
  if (invOn[1] && D[1].length)
    L.push(punto('inv-tocon', D[1], {getRadius:6, filled:true, stroked:true, getFillColor:T.inv[1], getLineWidth:2, getLineColor:blanco, pickable:true, autoHighlight:true, highlightColor:T.gold, updateTriggers:{getFillColor:[T.inv[1]]}}));
  if (invOn[2] && D[2].length){
    L.push(punto('inv-muerto', D[2], {getRadius:7, filled:true, stroked:true, getFillColor:T.inv[2], getLineWidth:1.5, getLineColor:blanco, pickable:true, autoHighlight:true, highlightColor:T.gold, updateTriggers:{getFillColor:[T.inv[2]]}}));
    L.push(new TextLayer({id:'inv-muerto-x', data:D[2], getPosition:pos, getText:()=>'×', getSize:15, getColor:[255,255,255,255], characterSet:['×'],
      fontFamily:'Roboto, sans-serif', fontWeight:700, getTextAnchor:'middle', getAlignmentBaseline:'center', pickable:false})); }
  return L; }
// al tocar el mapa, un punto del inventario gana al frente que tenga debajo (radio mayor con el dedo)
let invToque = false;
mapEl.addEventListener('pointerdown', e=>{ invToque = e.pointerType==='touch' || e.pointerType==='pen'; }, true);
function invPick(x, y){ if (!invVisible()) return null; const ids = INV_CAPAS.filter((_, t)=> invOn[t]);
  const p = dk.pickObject({x, y, radius: invToque? 16 : 9, layerIds: ids}); return p && p.object? p.object : null; }
// ficha de un punto (compact: descripción emergente al pasar el ratón). Un punto del camellón (sin frente, a 25 m o menos del eje de una
// vialidad primaria) dice su avenida y que lo atiende el Gobierno Central, con la prioridad del tramo.
function invHtml(p, compact){ const ti = INV_TIPOS[p.t], fr = p.fr, hay = fr>=0 && fr<N, cam = !hay && p.vp>=0 && p.vp<NV;
  const sim = `<i class="inv-sim ${ti.id}" aria-hidden="true"></i>`;
  const tp = hay? (META.tipos[F.tipo[fr]] || '—') : '—', calle = hay? ((sinNombreFr(fr) || tp==='—')? '' : tp+' ') + nomFrente(fr) : '';
  const col = hay? META.colonias[F.col[fr]] : null, colTxt = col && col.n? col.n : 'Colonia no identificada';
  const alc = hay? META.munNames[F.mun[fr]] : (META.munNames[munIndex[p.a]] || ''), avCam = cam? VPC.nomenclat[VP.nom[p.vp]] : '';
  if (compact) return `${sim}<b>${ti.n}</b><br><span class="m">${hay? calle + ' · ' : cam? 'Camellón de ' + avCam + ' · ' : ''}${ti.que}</span>`;
  const pr = hay? F.prio[fr] : cam? VP.prio[p.vp] : -1;
  const prioTxt = hay || cam? `${dot(T.prio[pr])}${META.prio[pr]}${esPrio(pr)? ' (prioritario)' : ''}` : `Sin frente de manzana a ${INV.dist} m o menos`;
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill inv-pill">${sim}${ti.n}</span>
    <h3>${ti.que}</h3>
    <div class="sub">${hay? `${calle} · ${colTxt} · ${alc}` : cam? `Camellón o vialidad primaria: ${avCam} · a cargo del Gobierno Central` : `${alc} · lejos de los frentes de manzana del modelo`}</div>
    <dl><dt>Clave del inventario</dt><dd>${invClave(p)}</dd>
    <dt>${cam? 'Prioridad del tramo de vialidad primaria' : 'Prioridad del frente'}</dt><dd>${prioTxt}</dd>
    ${hay? `<dt>Quién atiende</dt><dd>${F.gc[fr]? 'Gobierno Central' + (F.vp[fr]>=0? ' · sobre ' + VPC.nomenclat[VP.nom[F.vp[fr]]] : '') : 'Alcaldía'}</dd>` : ''}
    ${cam? `<dt>Quién atiende</dt><dd>Gobierno Central</dd><dt>Alcaldía</dt><dd>${META.munNames[VP.mun[p.vp]]}</dd>` : ''}
    <dt>Coordenadas</dt><dd>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</dd></dl>
    <div class="cardnote">${INV.fuente}, corte: ${INV.corte}. Confirma en sitio antes de plantar: el inventario se hizo con imágenes de calle.</div>
    ${fieldActs(p.lat, p.lon)}`; }
// ---------- sección del panel de capas: casillas, conteos y avance del inventario ----------
function invNota(){ if (!INV) return; const cve = sel!==null? META.muns[sel] : null, todas = Object.values(INV.n);
  const n = cve? INV.n[cve] : [0,1,2].map(t=> todas.reduce((s,a)=>s+a[t], 0));
  INV_TIPOS.forEach((_, k)=>{ const e = $('inv-n'+k); if (e) e.textContent = fmt.format(n[k]); });
  const av = Object.entries(INV.avance).sort((a,b)=>a[1]-b[1]), nom = c=> META.munNames[munIndex[c]];
  $('inv-avance').textContent = cve
    ? `En esta alcaldía van ${fmt.format(INV.avance[cve]||0)} registros del inventario (árboles, cepas, tocones y árboles muertos).`
    : `En toda la ciudad van ${fmt.format(av.reduce((s,a)=>s+a[1], 0))} registros del inventario. El avance es desigual: de ${fmt.format(av[0][1])} en ${nom(av[0][0])} a ${fmt.format(av[av.length-1][1])} en ${nom(av[av.length-1][0])}.`; }
function invReinicia(){ for (let t=0;t<3;t++) invOn[t] = true; document.querySelectorAll('#inv-sec input[data-inv]').forEach(c=>{ c.checked = true; }); }
if (!INV){ const s = $('inv-sec'); if (s){ s.querySelectorAll('.inv-casillas, #inv-nota, #inv-zoom').forEach(e=>{ e.hidden = true; }); $('inv-avance').textContent = 'Los espacios para plantar no vienen en el archivo único: ábrelo desde el sitio.'; } }
else { $('inv-corte').textContent = INV.corte;
  document.querySelectorAll('#inv-sec input[data-inv]').forEach(c=>{ c.onchange = ()=>{ invOn[+c.dataset.inv] = c.checked;
    if (pinned && pinned.kind==='inv' && !invOn[pinned.i.t]) hideCard(); rerender(); }; }); }
// ---------- filtro «Espacio» y orden por cepas: puntos de cada tipo asignados a cada frente (todos los frentes, no solo los de la vista) ----------
// espacios_frentes.bin (formato 2): FORMATO, n y por frente con al menos un punto, el índice en diferencias y cuántas cepas vacantes,
// tocones y árboles muertos tiene. De ahí salen ESP_FR (tipos en bits: 1 cepa, 2 tocón, 4 muerto; el filtro), ESP_CV (cepas vacantes; el
// orden de «Dónde empezar») y ESP_FRN (puntos de cada tipo; columnas de las descargas). Se pide una vez; si falla, se puede volver a pedir.
// Comprueba las cifras de control de config.js (INV.fr).
let ESP_P = null;
async function espLeer(){ const fr = INV.fr, n = fr.archivo, v = INV.v[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/inventario/' + n + '?v=' + v); if (esSesion(r)) throw errSesion(n); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); const rv = reader(b);
  const formato = rv(), k = rv(); if (formato!==fr.formato || formato!==2 || k!==fr.n) throw new Error(n + ': formato ' + formato + ', ' + k + ' frentes');
  const A = new Uint8Array(N), CV = new Uint16Array(N), C = new Uint16Array(3*N), frentes = [0,0,0], puntos = [0,0,0]; let f = -1;
  for(let j=0;j<k;j++){ f += rv(); if (f<0 || f>=N) throw new Error(n + ': frente ' + f); let bits = 0;
    for(let t=0;t<3;t++){ const c = rv(); if (c<0 || c>65535) throw new Error(n + ': frente ' + f); if (c){ bits |= 1<<t; frentes[t]++; puntos[t] += c; } C[3*f+t] = c; if (t===0) CV[f] = c; }
    if (!bits) throw new Error(n + ': frente ' + f + ' sin puntos'); A[f] = bits; }
  if (rv.pos()!==b.length || frentes.join()!==fr.tipos.join() || puntos.join()!==fr.puntos.join()) throw new Error(n + ': no cuadra con las cifras de control');
  return {A, CV, C}; }
// espacios_vp.bin (formato 1): lo mismo por parte de vialidad primaria (índice en diferencias y puntos de cada tipo, por sus frentes del
// Gobierno Central o en el camellón). De ahí ESP_VP (tipos en bits, el filtro) y ESP_VPN (puntos de cada tipo: ficha del tramo y orden por
// cepas de las avenidas). Comprueba las cifras de control de config.js (INV.vp).
async function espLeerVP(){ const vc = INV.vp, n = vc.archivo, v = INV.v[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/inventario/' + n + '?v=' + v); if (esSesion(r)) throw errSesion(n); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); const rv = reader(b);
  const formato = rv(), k = rv(); if (formato!==vc.formato || formato!==1 || k!==vc.n) throw new Error(n + ': formato ' + formato + ', ' + k + ' partes');
  const A = new Uint8Array(NV), C = new Uint16Array(3*NV), partes = [0,0,0], puntos = [0,0,0]; let f = -1;
  for(let j=0;j<k;j++){ f += rv(); if (f<0 || f>=NV) throw new Error(n + ': parte ' + f); let bits = 0;
    for(let t=0;t<3;t++){ const c = rv(); if (c<0 || c>65535) throw new Error(n + ': parte ' + f); if (c){ bits |= 1<<t; partes[t]++; puntos[t] += c; } C[3*f+t] = c; }
    if (!bits) throw new Error(n + ': parte ' + f + ' sin puntos'); A[f] = bits; }
  if (rv.pos()!==b.length || partes.join()!==vc.tipos.join() || puntos.join()!==vc.puntos.join()) throw new Error(n + ': no cuadra con las cifras de control');
  return {A, C}; }
// los dos archivos se piden juntos (el filtro aplica a las dos redes); si uno falla, se puede volver a pedir
function espCargar(){ if (!INV) return Promise.reject(new Error('El archivo único no trae el inventario de arbolado'));
  if (!ESP_P) ESP_P = Promise.all([espLeer(), espLeerVP()]).then(([d, v])=>{ ESP_FR = d.A; ESP_CV = d.CV; ESP_FRN = d.C; ESP_VP = v.A; ESP_VPN = v.C; return d; }, e=>{ ESP_P = null; throw e; });
  return ESP_P; }
// lo que declaran el Excel, el GeoJSON y el KML cuando el filtro está activo
const espNota = ()=> `Solo frentes con al menos un punto de ${espLista()} a ${INV.dist} m o menos, según el ${INV.fuente}, corte: ${INV.corte}. El inventario está en curso: un frente sin puntos puede no haberse inventariado aún.`;
// lo mismo para las vialidades primarias (Excel de tramos y de avenidas, GeoJSON, KML, fichas y Resumen del Gobierno Central)
const espNotaVP = ()=> `Solo tramos de vialidad primaria con al menos un punto de ${espLista()}: en sus frentes de manzana a cargo del Gobierno Central (a ${INV.dist} m o menos) o en el camellón (puntos sin frente de manzana a ${INV.vp.dist} m o menos del eje del tramo), según el ${INV.fuente}, corte: ${INV.corte}. El inventario está en curso: un tramo sin puntos puede no haberse inventariado aún.`;
// ficha de una parte de vialidad primaria: cuántos espacios para plantar cuentan para ella (null mientras no llega el archivo)
const espVpTxt = i => { if (!ESP_VPN) return null; const c = [0,1,2].map(t=> ESP_VPN[3*i+t]);
  return !c.some(Boolean)? `Ninguno registrado hasta ${INV.corte} (inventario en curso)`
    : c.map((v, t)=> fmt.format(v) + ' ' + (v===1? INV_TIPOS[t].n : INV_TIPOS[t].pl).toLowerCase()).join(' · ') + ` · en sus frentes y en el camellón; corte: ${INV.corte}`; };
// al abrir la ficha de un tramo sin el archivo, se pide y el renglón se completa al llegar (la ficha no se vuelve a armar: no pierde el foco)
function espFichaVP(i){ if (!INV || ESP_VPN) return;
  const pon = t=>{ const d = $('card-esp'); if (d && pinned && pinned.kind==='vp' && pinned.i===i) d.textContent = t; };
  espCargar().then(()=> pon(espVpTxt(i)), e=>{ console.warn('ficha del tramo', e); pon(e && e.sesion? SESION_TXT : 'No fue posible cargar el inventario de arbolado (revisa la conexión a internet).'); }); }

// Solo para las pruebas automáticas (04_pruebas/prueba_inventario_espacios.js): con window.SIA_PRUEBA se puede leer el estado de la capa.
if (window.SIA_PRUEBA===true) window.__INV = { cargadas: ()=>[...INVD.mz.keys()], pendientes: ()=>INVD.pend.size, fallas: ()=>[...INVD.fallo],
  puntos: cve=> (INVD.mz.get(cve) || []).map(p=>({...p, clave:invClave(p)})), z: ()=>invZ(), on: ()=>invOn.slice(),
  capas: ()=> dk.props.layers.filter(l=>l && l.id.startsWith('inv-')).map(l=>({id:l.id, n:l.props.data.length})),
  mide: async cve=>{ const t = performance.now(); const P = await invLeer(cve); return {ms: Math.round(performance.now()-t), n: P.length}; },
  px: (lon, lat)=> dk.getViewports()[0].project([lon, lat]), ficha: p=> showCard('inv', p),
  frenteBajo: (x, y)=>{ const p = dk.pickObject({x, y, radius:6, layerIds:['fronts']}); return p && p.index>=0? frReal(p.index) : null; },
  esp: ()=>({ cargado: !!ESP_FR, filtro: filtroEsp, casillas: espQuiero, cepas: ESP_CV? ESP_CV.reduce((s, c)=>s+c, 0) : null, orden: iniOrden, pendiente: iniPend,
    cepasVP: ESP_VPN? ESP_VPN.reduce((s, c, k)=> s + (k%3===0? c : 0), 0) : null }),
  fichaVP: i=> showCard('vp', i), esGC: f=> !!F.gc[f] && F.vp[f]>=0, lee: async cve=> (await invLeer(cve)).map(p=>({...p, clave:invClave(p)})) };

// Contenido de las tarjetas del mapa: frente, tramo de vialidad primaria y colonia, con acciones de campo.
const dot = c => `<i class="dot" data-st="background:rgb(${c[0]},${c[1]},${c[2]})"></i>`;
function featHtml(i, compact){
  const c = T.prio[F.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nm = nomFrente(i); const tp = META.tipos[F.tipo[i]] || '—'; const pre = (sinNombreFr(i) || tp==='—')? '' : tp+' '; const col = META.colonias[F.col[i]];
  const ban = META.disp[(F.flags[i]>>3)&7];
  const cpTxt = col.cp ? col.cp.padStart(5,'0') : ''; const colTxt = col.n ? `${col.n}${cpTxt? ' · CP '+cpTxt : ''}` : 'Colonia no identificada';
  if (compact) return `<span class="pr" data-st="background:${rgb}"></span><b>${pre}${nm}</b><br><span class="m">${col.n||'Colonia no identificada'} · ${fmt.format(F.len[i])} m · Prioridad ${META.prio[F.prio[i]]}</span>`;
  const cp = col.p>=0 ? META.prio[col.p] : '—';
  const cc = col.p>=0 ? T.prio[col.p] : null;
  const respTxt = (F.gc[i]? `Gobierno Central · sobre ${VPC.nomenclat[VP.nom[F.vp[i]]]}` : 'Alcaldía');
  // si la colonia del frente ya es la consultada, sus datos están en el panel: no se repiten aquí
  const dupCol = (selCol!==null && F.col[i]===selCol);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i data-st="background:${rgb}"></i>Prioridad ${META.prio[F.prio[i]]}</span>
    <h3>${pre}${nm}</h3>
    <div class="sub">${colTxt} · ${META.munNames[F.mun[i]]}</div>
    <dl><dt>Quién atiende</dt><dd>${respTxt}</dd>
    <dt>Tipo de vialidad</dt><dd>${tp}</dd>
    <dt>Longitud del frente</dt><dd>${fmt.format(F.len[i])} m</dd>
    <dt>Banqueta (INEGI 2020)</dt><dd>${ban}</dd>
    ${dupCol? '' : `<dt>Prioridad de la colonia</dt><dd>${cc? dot(cc):''}${cp}</dd>
    <dt>Desarrollo social (IDS) de su unidad territorial</dt><dd>${col.ids||'—'}</dd>
    <dt>Población de la colonia</dt><dd>${col.pob? fmt.format(col.pob)+' hab.' : '—'}</dd>`}
    <dt>Coordenadas del frente</dt><dd>${midLat(i).toFixed(5)}, ${midLon(i).toFixed(5)}</dd></dl>
    ${dupCol? '<div class="cardnote">Los datos de la colonia se muestran arriba, en Resultados.</div>' : ''}
    ${fieldActs(midLat(i), midLon(i))}`;
}
// Banqueta de los frentes de manzana que dan a cada tramo de vialidad primaria (m: con, sin, por verificar), solo informativa
let VPB = null;
function vpBanq(i){ if (!VPB){ VPB = new Float32Array(3*NV); for(let f=0;f<N;f++){ if (!F.gc[f] || F.vp[f]<0) continue; const b=(F.flags[f]>>3)&7; VPB[3*F.vp[f]+(b===0? 0 : b===1? 1 : 2)] += F.len[f]; } }
  return [VPB[3*i], VPB[3*i+1], VPB[3*i+2]]; }
function vpBanqTxt(i){ const d = vpBanq(i); if (d[0]+d[1]+d[2] < 1) return 'Sin manzanas al lado: sin dato';
  return `${fmt.format(Math.round(d[0]))} m con banqueta · ${fmt.format(Math.round(d[1]))} m sin · ${fmt.format(Math.round(d[2]))} m por verificar (INEGI 2020)`; }
function vpHtml(i, compact){
  const c = T.prio[VP.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nom = VPC.nomenclat[VP.nom[i]], nombre = VPC.nombres[VP.nombre[i]];
  if (compact){
    if (resp==='alc') return `<b>${nom}</b><br><span class="m">Vialidad primaria · a cargo de Gobierno Central${redVisible(nombre)? ' · '+nombre : ''}</span>`;
    return `<span class="pr" data-st="background:${rgb}"></span><b>${nom}</b><br><span class="m">${redVisible(nombre)? nombre+' · ' : ''}${VPC.tipos[VP.tipo[i]]} · ${fmt.format(VP.len[i])} m · Prioridad ${META.prio[VP.prio[i]]}</span>`;
  }
  const s = avStat(VP.nom[i]);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i data-st="background:${rgb}"></i>Prioridad ${META.prio[VP.prio[i]]}</span>
    <h3>${nom}</h3>
    <div class="sub">${redVisible(nombre)? nombre+' · ' : ''}${META.munNames[VP.mun[i]]}</div>
    <dl><dt>Quién atiende</dt><dd>Gobierno Central</dd>
    <dt>Tipo</dt><dd>${VPC.tipos[VP.tipo[i]]}</dd>
    <dt>Carriles</dt><dd>${VP.car[i]} · ${VPC.circula[VP.circ[i]].toLowerCase()}</dd>
    <dt>Longitud del tramo</dt><dd>${fmt.format(VP.len[i])} m</dd>
    <dt>Banqueta al lado</dt><dd>${vpBanqTxt(i)}</dd>
    ${INV? `<dt>Espacios para plantar (inventario de arbolado)</dt><dd id="card-esp">${espVpTxt(i) ?? 'Cargando el inventario de arbolado…'}</dd>` : ''}
    <dt>Toda la avenida</dt><dd>${fmt1.format(s.km)} km · ${fmt1.format(s.kmp)} km prioritarios</dd>
    <dt>Alcaldías</dt><dd>${[...s.muns].map(m=>META.munNames[m]).join(', ')}</dd></dl>
    ${fieldActs(...vpMid(i))}
    ${isGC()? `<button class="btn secondary act" id="card-av" type="button">Ver toda la avenida</button>` : ''}`;
}
// acciones para salir a campo (enlaces externos y copia de coordenadas)
function fieldActs(lat, lon){ const ll = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return `<div class="field-acts">
    <a class="fa" href="https://www.google.com/maps/dir/?api=1&destination=${ll}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>Cómo llegar</a>
    <a class="fa" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="3"/><path d="M8 21v-5l-2-3 3-3h6l3 3-2 3v5"/></svg>Street View</a>
    <button class="fa" type="button" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg><span>Copiar coordenadas</span></button>
  </div>`; }
const vpMid = i => { const m = puntoMedio(VPOS, vstart[i], vstart[i+1]); return [m[1], m[0]]; };   // [lat, lon]
function colHtml(id){
  const c = META.colonias[id]; const s = colStat(id); const tot = sum(s.km); const ntot = sum(s.n);
  const pc = c.p>=0? T.prio[c.p] : null; const rgb = pc? `rgb(${pc[0]},${pc[1]},${pc[2]})` : 'transparent';
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i data-st="background:${rgb}"></i>Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}</span>
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
const ZOOM_CORTES = [11.5, 12, 12.2, 13, 13.6, 14, 15, 16];   // 15 y 16: espacios para plantar (INV_Z e INV_Z_LIGERO)
const zoomBand = z => ZOOM_CORTES.filter(c => z >= c).length;
const dk = new DeckGL({
  container: mapEl, views: new MapView({repeat:false}), controller:{dragRotate:false, touchRotate:false, minZoom:9.4, maxZoom:18.5},
  initialViewState: viewState, layers: NOMAP? [] : layers(), style:{background:'transparent'},   // en las pruebas con #nomap no se dibuja nada: abren en segundos aun sin tarjeta gráfica
  useDevicePixels: Math.min(window.devicePixelRatio || 1, 1.5),   // pantallas de alta densidad: menos píxeles por dibujar
  onLoad: ()=> revisarRendimiento(),
  // un error al dibujar no deja el mapa en blanco sin explicación
  onError: e=>{ console.error(e); avisoMapa('<b>El mapa tuvo un problema al dibujarse.</b> Las cifras, los listados y las descargas siguen disponibles.', true); },
  onViewStateChange: ({viewState:vs})=>{ vs = {...vs, longitude: Math.min(Math.max(vs.longitude, CITY_BOUNDS[0]-0.05), CITY_BOUNDS[2]+0.05), latitude: Math.min(Math.max(vs.latitude, CITY_BOUNDS[1]-0.04), CITY_BOUNDS[3]+0.04)}; const zc = zoomBand(vs.zoom); const prev = zoomBand(viewState.zoom); viewState = vs; if (zc!==prev) rerender(); else if (etqDesfasado(vs)) rerenderNombres(); updateScale(); return vs; },
  getTooltip: info => {
    if (info.index<0 || !info.layer) return null; const st = {background:'transparent',padding:0,border:0,boxShadow:'none'};
    if (info.layer.id.startsWith('alcaldias')){ const i=info.object.i; const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; return {html:`<div class="tip"><span class="pr" data-st="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></span><b>${META.munNames[i]}</b><br><span class="m">${isGC()? 'Vialidades primarias: prioridad predominante':'Prioridad predominante'} ${META.prio[d]} (${pct(s.km[d],tot)}) · ${fmt0.format(kmPrio(s))} km prioritarios · ${partTxt(i,isGC())}</span></div>`, style:st}; }
    if (info.layer.id.startsWith('col-fill')){ const id=info.object.i; const c=META.colonias[id]; if (sel!==null && munIndex[c.m]!==sel) return null; const cs=colStat(id); const pc=c.p>=0? T.prio[c.p]:null; return {html:`<div class="tip">${pc? `<span class="pr" data-st="background:rgb(${pc[0]},${pc[1]},${pc[2]})"></span>`:''}<b>${c.n}</b><br><span class="m">${META.munNames[munIndex[c.m]]} · Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'} · ${fmt1.format(cs.kmp)} km prioritarios</span></div>`, style:st}; }
    if (INV_CAPAS.includes(info.layer.id) && !pinned) return {html:`<div class="tip">${invHtml(info.object,true)}</div>`, style:st};
    if (info.layer.id==='vias' && !pinned) return {html:`<div class="tip">${vpHtml(info.index,true)}</div>`, style:st};
    return (info.layer.id==='fronts' && !pinned && enAmbito(frReal(info.index))) ? {html:`<div class="tip">${featHtml(frReal(info.index),true)}</div>`, style:st} : null;
  },
});
// si el equipo o el navegador retiran el contexto gráfico (memoria, suspensión, cambio de tarjeta), el mapa queda en blanco: se avisa
mapEl.addEventListener('webglcontextlost', ()=> avisoMapa('<b>El equipo liberó la memoria gráfica y el mapa dejó de dibujarse.</b> Las cifras siguen disponibles; para recuperar el mapa hay que recargar.', true), true);
let pdown = null;
mapEl.addEventListener('pointerdown', e=>{ pdown=[e.clientX,e.clientY]; });
// Dedos «fantasma» en teléfonos (sobre todo iPhone): el mapa lleva la lista de dedos puestos y quita cada uno cuando el navegador
// avisa que se levantó. Si ese aviso se pierde, el dedo se queda en la lista: con uno de más, un solo dedo hace zoom; con dos, el
// mapa no responde a ningún gesto. Al empezar un toque como primer dedo, al quedar la pantalla sin dedos y al salir de la página
// se cancelan los que sigan anotados. La lista es interna de deck.gl 9.4 (mjolnir): si cambia de lugar, esto no hace nada.
const dedosDelMapa = ()=>{ try { return dk.eventManager.manager.input.store; } catch(e){ return null; } };
const soltarDedos = salvo=>{ const st = dedosDelMapa(); if (!st || !st.length) return;
  for (const id of st.map(x=>x.pointerId).filter(id=>id!==salvo)) window.dispatchEvent(new PointerEvent('pointercancel', {pointerId:id, pointerType:'touch', bubbles:true})); };
mapEl.addEventListener('pointerdown', e=>{ if (e.isPrimary) soltarDedos(e.pointerId); }, true);
for (const t of ['touchend', 'touchcancel']) addEventListener(t, e=>{ if (!e.touches.length) setTimeout(()=>soltarDedos(), 0); }, true);
addEventListener('blur', ()=>soltarDedos()); document.addEventListener('visibilitychange', ()=>{ if (document.hidden) soltarDedos(); });
// Solo para las pruebas automáticas (04_pruebas/prueba_nombres_mapa.js): con window.SIA_PRUEBA se puede leer el estado del mapa.
if (window.SIA_PRUEBA===true) window.__MAPA = { dedos: ()=>{ const st=dedosDelMapa(); return st? st.length : -1; }, etiquetas: ()=>({ALC, ALC_LABELS, COLS, COL_LABELS, charset}),
  capa: id=>{ const l=dk.props.layers.find(x=>x && x.id===id); return l? l.props : null; }, ir: (vs, ms=0)=>flyTo(vs, ms), lblCenter: ()=>lblCenter, colPosListas: ()=>colPosListas, etqPendientes: ()=>ETQ_COLA.length + (etqTrabajando? 1 : 0),
  clavesCalles: ()=>[...streetIdx.keys()], kmCalle: k=>{ const s=streetIdx.get(k); return s? s.km : null; }, tramosDe: k=>{ const s=streetIdx.get(k); return s? tramosDeCalle(s.idx).map(t=>({n:t.n, largo:t.largo, lados:t.lados, lado:t.lado||'', entre:entreTxt(t), texto:tramoTxt(t), m:t.m})) : null; } };
mapEl.addEventListener('click', e=>{
  if (pdown && Math.hypot(e.clientX-pdown[0], e.clientY-pdown[1])>5) return;
  const r = mapEl.getBoundingClientRect();
  const pi = invPick(e.clientX-r.left, e.clientY-r.top); if (pi){ showCard('inv', pi); return; }   // un punto del inventario gana al frente de debajo
  const p = dk.pickObject({x:e.clientX-r.left, y:e.clientY-r.top, radius:6});
  if (p && p.layer && p.layer.id.startsWith('alcaldias') && p.object){ const i=p.object.i; if (sel!==i || selCol!==null || selAv!==null){ selEl.value=String(i); setSel(String(i)); } return; }
  if (p && p.layer && p.layer.id.startsWith('col-fill') && p.object){ const id=p.object.i; pickColonia(id); showCard('col', id); return; }
  if (p && p.layer && p.layer.id==='vias' && p.index>=0){ showCard('vp', p.index); return; }
  if (p && p.layer && p.layer.id==='fronts' && p.index>=0){ const i=frReal(p.index), cid=F.col[i];
    if (cid && cid!==selCol) pickColonia(cid); else if (!cid && sel!==null && F.mun[i]!==sel){ selEl.value=String(F.mun[i]); setSel(String(F.mun[i])); }
    showCard('fr', i); } else hideCard();
});
// En modo ligero, dibujar las calles puede tardar: se avisa ANTES de empezar, porque durante el dibujo la página no responde
let dibT = null;
function rerender(){ if (NOMAP) return;
  if (modoLigero && frVisibles() && showsFrontsMode()){ const d = $('dibujando'); d.hidden = false; clearTimeout(dibT);
    dibT = setTimeout(()=>{ dk.setProps({layers: layers()}); requestAnimationFrame(()=>requestAnimationFrame(()=>{ d.hidden = true; })); }, 40); return; }
  dk.setProps({layers: layers()}); }
// solo cambian los nombres (otro paso de zoom o la vista se alejó): sin el aviso de «dibujando» del modo ligero
function rerenderNombres(){ if (NOMAP) return; dk.setProps({layers: layers()}); }
$('loader').hidden = true; window.SIA_LISTO = true; updateScale();
// el lienzo del mapa, que es el que recibe el teclado, lleva nombre y rol
{ const cv = mapEl.querySelector('canvas'); if (cv){ cv.setAttribute('role','application'); cv.setAttribute('aria-label', mapEl.dataset.nombre); cv.tabIndex = 0; } }

// La ficha recibe el foco al abrirse y lo devuelve al cerrarse. cardOrigen = control desde el que se abrió.
let cardOrigen = null;
function enfocaFicha(){ const c=$('card'); const a=document.activeElement; if (a && a!==document.body && !c.contains(a)) cardOrigen = a;
  const h=c.querySelector('h3'); c.setAttribute('aria-label', 'Ficha: ' + (h? h.textContent : 'elemento seleccionado')); try { c.focus({preventScroll:true}); } catch(e){ c.focus(); } }
function showCard(kind, i){ if (kind==='loc') return showLoc(); pinned={kind,i}; const c=$('card');
  c.innerHTML = kind==='vp'? vpHtml(i,false) : kind==='col'? colHtml(i) : kind==='inv'? invHtml(i,false) : featHtml(i,false);
  c.hidden=false; c.querySelector('.close').onclick=()=>hideCard(true); enfocaFicha();
  const b=c.querySelector('#card-av'); if(b) b.onclick=()=>pickAvenida(VP.nom[i]);
  if (kind==='vp') espFichaVP(i);   // espacios para plantar del tramo: si el archivo no ha llegado, se pide y el renglón se completa
  const ba=c.querySelector('#card-alc'); if(ba) ba.onclick=()=>{ clearColonia(); };
  const bc=c.querySelector('#card-calles'); if(bc) bc.onclick=()=>{ setLayer('fr',true); rerender(); showCard('col', i); };
  const bf=c.querySelector('#card-ficha'); if(bf) bf.onclick=()=>$('dl-ficha').click();
  const bcp=c.querySelector('[data-copy]'); if(bcp) bcp.onclick=()=>{ const t=bcp.dataset.copy, lab=bcp.querySelector('span');
    const ok=()=>{ lab.textContent='Coordenadas copiadas'; setTimeout(()=>{ lab.textContent='Copiar coordenadas'; }, 1800); };
    const fb=()=>{ const r=document.createRange(); r.selectNodeContents(lab); lab.textContent=t; const sl=getSelection(); sl.removeAllRanges(); sl.addRange(r); };
    try { navigator.clipboard.writeText(t).then(ok, fb); } catch(e){ fb(); } };
}
function hideCard(devuelve){ const c=$('card'); const dentro = c.contains(document.activeElement) || document.activeElement===c; pinned=null; c.hidden=true;
  if (devuelve===true || dentro){ const o = cardOrigen && cardOrigen.isConnected && cardOrigen.offsetParent!==null? cardOrigen : $('scope-title'); cardOrigen=null; try { o.focus({preventScroll:true}); } catch(e){} } }
// En el celular sin mapa, la ficha se abre sobre la información: si el foco llega a un control tapado, la ficha se cierra (WCAG 2.4.11).
// Con mapa no pasa: la ficha es de la pantalla del mapa y mientras se ve, el panel está inerte.
document.addEventListener('focusin', e=>{ const c=$('card'); if (c.hidden || !isPhone() || c.contains(e.target) || !e.target.closest || !e.target.closest('.panel')) return;
  const a=e.target.getBoundingClientRect(), b=c.getBoundingClientRect(); if (a.bottom>b.top+4 && a.top<b.bottom-4) hideCard(); });
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
  $('lvl-note').textContent = 'Modo ligero: las calles se dibujan al acercarte y solo las del ámbito elegido.';
  // etiqueta fija: recuerda que las calles se dibujan solo al acercarse y permite volver a leer el aviso
  const et = document.createElement('button'); et.type = 'button'; et.className = 'etq-ligero'; et.textContent = 'Modo ligero'; et.title = 'El mapa se dibuja sin aceleración gráfica: las calles aparecen al acercarte y solo las del ámbito elegido'; mapEl.parentElement.appendChild(et);
  const yaVisto = (()=>{ try { return localStorage.getItem('sia.avisoLigero')==='1'; } catch(e){ return false; } })();
  et.onclick = ()=> avisoLigero(true);
  if (pedido!=='ligero' && !yaVisto) avisoLigero(false);
}
// aviso de modo ligero; al cerrarlo se recuerda en este navegador para no repetirlo en cada carga (solo esa preferencia)
function avisoLigero(aPeticion){ if (document.querySelector('.aviso-ligero:not(.aviso-error)')) return;
  { const n = document.createElement('div'); n.className = 'aviso-ligero'; n.setAttribute('role','status');
    n.innerHTML = '<b>Tu navegador está dibujando el mapa sin aceleración gráfica.</b> Para que no se trabe, las calles aparecen al acercarte y las colonias muestran la prioridad. Para verlo completo y fluido, activa la aceleración por hardware del navegador (en Chrome: Configuración › Sistema › "Usar aceleración de gráficos") y recarga la página. <button type="button" aria-label="Cerrar aviso">×</button>';
    n.querySelector('button').onclick = ()=>{ n.remove(); try { localStorage.setItem('sia.avisoLigero','1'); } catch(e){} }; mapEl.parentElement.appendChild(n); }
}
function scopeView(){ const P = matchMedia(MQ_TEL).matches? 0.45 : 1;
  if (selAv!==null){ const b=avBounds(selAv, sel); const pad=0.003; const vs=fitTo([b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad], 60*P); vs.zoom=Math.min(vs.zoom,15.5); return vs; }
  return selCol!==null? fitTo(colBounds(selCol), 60*P) : sel===null? fitTo(CITY_BOUNDS,24*P) : fitTo(META.bounds[META.muns[sel]], 40*P); }
// botón de la casa: regresa a toda la ciudad y reinicia la consulta (alcaldía, colonia y avenida); conserva
// quién atiende, las capas y la leyenda
$('zcity').onclick = ()=>{ if (locFollow) stopFollow(true); hideCard();
  if (sel!==null || selCol!==null || selAv!==null){ selEl.value=''; setSel(''); } else flyTo(scopeView()); };
// el crédito del satélite va debajo del resumen del mapa, que cambia de alto según la consulta; en el celular, un toque lo abre completo
{ const mb = document.querySelector('.mapbar'), mw = document.querySelector('.mapwrap');
  if (mb && mw && window.ResizeObserver) new ResizeObserver(()=> mw.style.setProperty('--mapbar-alto', mb.offsetHeight+'px')).observe(mb);
  $('attrib').addEventListener('click', e=>{ if (!e.target.closest('a')) document.body.classList.toggle('credito-abierto', $('attrib').classList.toggle('abierta')); }); }

// Leyenda-filtro por prioridad, filas "Atiende" (alcaldías / Gobierno Central), "Banqueta" y "Espacio", y casillas de capas.
// ---------- leyenda-filtro ----------
const lg = $('legend-rows');
META.prio.slice().reverse().forEach((p, ri)=>{
  const k = 4-ri; const row = document.createElement('div'); row.className='row'; row.tabIndex=0; row.setAttribute('role','checkbox'); row.setAttribute('aria-checked','true');
  row.innerHTML = `<b class="lg-cb" aria-hidden="true"></b><i data-st="background:var(--p${k})"></i><span>${p}</span><em class="lg-km" data-k="${k}"></em>`;
  const toggle = ()=>{ visible[k]=!visible[k]; row.classList.toggle('off',!visible[k]); row.setAttribute('aria-checked',String(visible[k])); buildFilter(); buildVP(); rerender(); notaFiltro(); };
  row.onclick = toggle; row.onkeydown = e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); } };
  lg.appendChild(row);
});
// aviso solo cuando no queda ninguna prioridad visible
function notaFiltro(){ const n=$('lg-filter-note'); if(!n) return; n.hidden = visible.some(Boolean);
  n.textContent = n.hidden? '' : 'Ninguna prioridad está visible: el mapa no muestra calles. Activa al menos una casilla.'; }
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
// sinRefresh: quien la llama refresca después (pickColonia, pickAvenida, buscador); así no queda un paso intermedio en el historial
function setResp(v, sinRefresh){
  respOn.alc = v!=='gc'; respOn.gc = v!=='alc';
  document.querySelectorAll('button[data-resp]').forEach(b=>b.setAttribute('aria-pressed', String(respOn[b.dataset.resp])));
  $('banq-row').hidden = v==='gc';   // la banqueta es de los frentes de las alcaldías
  $('esp-row').hidden = !INV;   // el espacio aplica a las dos redes desde la v1.24 (el archivo único no trae el inventario)
  espTitulos(v);
  if (resp===v) return; resp=v;
  document.body.dataset.resp = v;
  if (isGC()){ colBefore = showColB; if (showColB && !showFrB){ setLayer('col',false); setLayer('fr',true); } else if (showColB) setLayer('col',false); selCol=null; }
  else { selAv=null; if (colBefore && !showColB && !showAlcB) setLayer('col',true); colBefore=false; if(!showAlcB && !showColB && !showFrB) setLayer('col',true); }
  highlight=null; hideCard(); $('q').value='';
  document.querySelector('.seg.lvl button[data-lvl="col"]').hidden = isGC();
  document.querySelector('.seg.lvl button[data-lvl="fr"]').innerHTML = isGC()? '<i></i>Vialidades' : '<i></i>Calles';
  document.querySelector('.seg.lvl').classList.toggle('two', isGC());
  if (modoLigero){ $('lvl-note').textContent = 'Modo ligero: las calles se dibujan al acercarte y solo las del ámbito elegido.'; }
  else $('lvl-note').textContent = isGC()? 'Alcaldías va sola, con la prioridad de sus vialidades primarias.' : 'Colonias y Calles se combinan; Alcaldías va sola.';
  $('resp-note').textContent = v==='alc' ? 'Frentes de manzana que plantan las alcaldías; las vialidades primarias aparecen en gris. Puedes activar las dos.'
    : v==='gc' ? 'Vialidades primarias y de acceso controlado que atiende el Gobierno de la Ciudad, con su propia prioridad.'
    : 'Las dos redes juntas: cifras, barras y descargas se muestran por separado para las alcaldías y para el Gobierno Central.';
  buildVP(); if (!sinRefresh) refresh();
}

// ---------- fila «Banqueta»: filtra los frentes de las alcaldías según INEGI 2020; ver filtroBanq en 03_estado.js ----------
const banqBtns = document.querySelectorAll('button[data-banq]');
function setBanq(v){ if (v!=='con' && v!=='sin') v = 'todas'; if (filtroBanq===v) return; filtroBanq = v;
  banqBtns.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.banq===v)));
  highlight = null; hideCard(); refresh(); }   // la calle resaltada se arma con el filtro anterior: se suelta
banqBtns.forEach(b=>{ b.onclick = ()=> setBanq(b.dataset.banq); });

// ---------- fila «Espacio»: frentes con cepa vacante, tocón o árbol muerto del inventario de arbolado; ver filtroEsp en 03_estado.js ----------
// Tres casillas independientes, como «Atiende»: todas apagadas = sin filtro; con una o varias, los frentes que tienen al menos un punto de
// alguno de esos tipos. Se combina con «Banqueta». La primera vez se piden los datos (espCargar): las casillas cambian al instante y las
// cifras cuando llegan; espQuiero es lo que marcan las casillas y filtroEsp lo que ya se aplica.
// Con Gobierno Central (v1.24) acota los tramos de vialidad primaria (pasaEspacioVP); con las dos redes, a las dos.
const espBtns = document.querySelectorAll('button[data-esp]');
// la descripción de cada casilla dice qué acota según la red consultada
const ESP_QUE = ['al menos una cepa vacante del inventario de arbolado: se puede plantar directo', 'al menos un tocón del inventario de arbolado: hay que retirarlo antes de plantar', 'al menos un árbol muerto del inventario de arbolado: requiere sustitución'];
function espTitulos(v){ const quien = v==='gc'? 'Tramos de vialidad primaria (en sus frentes o en el camellón)' : v==='both'? 'Frentes de manzana y tramos de vialidad primaria' : 'Frentes';
  espBtns.forEach(b=>{ b.title = `${quien} con ${ESP_QUE[+b.dataset.esp]}`; }); }
let espQuiero = 0;
const espBotones = ()=> espBtns.forEach(b=> b.setAttribute('aria-pressed', String(!!(espQuiero & (1<<+b.dataset.esp)))));
function setEspacio(m){ m = INV? (m & 7) : 0; espQuiero = m; espBotones();
  if (m && !ESP_FR){ espAviso('carga');
    espCargar().then(()=>{ if (espQuiero===m) setEspacio(m); }, e=>{ console.warn('filtro de espacio', e); if (espQuiero!==m) return; espQuiero = filtroEsp; espBotones(); espAviso(e); });
    return; }
  if (filtroEsp===m){ espAviso(); return; }
  filtroEsp = m; espAviso(); highlight = null; hideCard(); refresh(); }   // como con la banqueta, la calle resaltada se suelta
espBtns.forEach(b=>{ b.onclick = ()=> setEspacio(espQuiero ^ (1<<+b.dataset.esp)); });
// aviso bajo la fila mientras el filtro está activo: el inventario está en curso (corte y registros de la alcaldía consultada)
function espAviso(estado){ const n = $('esp-aviso'); if (!n) return; n.classList.toggle('warn', !!(estado && estado!=='carga'));
  if (estado==='carga'){ n.hidden = false; n.textContent = 'Cargando el inventario de arbolado…'; return; }
  if (estado){ n.hidden = false; if (estado.sesion) avisoSesion(n); else n.textContent = 'No fue posible cargar el inventario de arbolado para el filtro (revisa la conexión a internet).'; return; }
  n.hidden = !filtroEsp; if (n.hidden){ n.textContent = ''; return; }
  const cve = sel!==null? META.muns[sel] : null, reg = cve? (INV.avance[cve]||0) : Object.values(INV.avance).reduce((s,a)=>s+a, 0);
  n.textContent = `El filtro solo incluye lo inventariado hasta ${INV.corte} (inventario en curso); ${cve? 'en esta alcaldía' : 'en toda la ciudad'} van ${fmt.format(reg)} registros.`; }
function espReinicia(){ espQuiero = filtroEsp = 0; espBotones(); espAviso(); }
if (!INV) $('esp-row').hidden = true;

const LAY = { alc: ()=>showAlcB, col: ()=>showColB, fr: ()=>showFrB };
function setLayer(k, v){ if(k==='alc') showAlcB=v; else if(k==='col') showColB=v; else showFrB=v; document.querySelector(`.seg.lvl button[data-lvl="${k}"]`).setAttribute('aria-pressed', String(v)); }
document.querySelectorAll('.seg.lvl button').forEach(b=>{ b.onclick = ()=>{
  const k=b.dataset.lvl, cur=LAY[k]();
  if (k==='alc'){ if (cur) return; setLayer('alc',true); setLayer('col',false); setLayer('fr',false); }
  else if (isGC()){ if (cur) return; setLayer('alc',false); setLayer('fr',true); }
  else { if (showAlcB){ setLayer('alc',false); setLayer(k,true); } else { const other = k==='col'? showFrB : showColB; if (cur && !other) return; setLayer(k, !cur); } }
  hideCard(); rerender(); }; });   // la lista de «Dónde empezar» no depende de las capas
// opacidad de las capas de prioridad (alcaldías, colonias, calles y vialidades primarias)
$('op-prio').oninput = e=>{ opPrio = Math.min(1, Math.max(0.2, (+e.target.value||100)/100)); $('op-val').textContent = Math.round(opPrio*100)+' %'; rerender(); };
// mapa de fondo: sin fondo, calles (el predeterminado, FONDO_INICIAL) o satélite
const ATRIB_BASE = $('attrib').innerHTML;
function setFondo(k){ fondoUI(k); rerender(); }
// botones, atribución y nota del fondo elegido (sin redibujar: al abrir, el mapa ya se armó con él)
function fondoUI(k){ fondo = k; fondoFallas = 0; const f = FONDOS[k], con = k!=='no';
  document.querySelectorAll('.seg.fondo button').forEach(b=> b.setAttribute('aria-pressed', String(b.dataset.fondo===k)));
  $('attrib').innerHTML = con? f.atrib : ATRIB_BASE; $('attrib').classList.toggle('sat', con); document.body.classList.toggle('fondo-sat', con); document.body.classList.toggle('fondo-propio', !!(f && f.propio));
  const n = $('fondo-note'), nota = con? f.nota : ''; n.hidden = !nota; n.textContent = nota;
  ajustaEscala(); }
// la atribución del fondo ocupa una o varias líneas: la barra de escala se coloca justo encima
function ajustaEscala(){ $('scalebar').style.bottom = (fondo!=='no' && !isPhone())? (16 + $('attrib').offsetHeight + 6)+'px' : ''; }
addEventListener('resize', ajustaEscala);
function avisoFondo(){ const n = $('fondo-note'); n.hidden = false; n.textContent = 'No fue posible cargar el mapa de fondo (revisa la conexión a internet).'; }
document.querySelectorAll('.seg.fondo button').forEach(b=>{ b.onclick = ()=>{ if (b.dataset.fondo!==fondo) setFondo(b.dataset.fondo); }; });
$('reset-all').onclick = ()=>{ invReinicia(); espReinicia();
  filtroBanq = 'todas'; banqBtns.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.banq==='todas')));   // «Reiniciar» apaga los dos filtros (setSel redibuja)
  opPrio=1; $('op-prio').value=100; $('op-val').textContent='100 %'; setResp('alc'); setLayer('alc',false); setLayer('col',true); setLayer('fr',true); for(let k=0;k<5;k++) visible[k]=true; document.querySelectorAll('.legend .row').forEach(r=>{ r.classList.remove('off'); r.setAttribute('aria-checked','true'); }); buildFilter(); buildVP(); notaFiltro(); if (fondo!=='no') setFondo(FONDO_INICIAL); selEl.value=''; setSel(''); };

// Estadísticas por colonia, avenida y ámbito; cifras principales, barras por prioridad y textos de contexto del panel.
// estadísticas por colonia (frentes a cargo de la alcaldía)
// cv: cepas vacantes del inventario en los frentes prioritarios (orden «más cepas vacantes» de «Dónde empezar»); cvt: en todos sus frentes, de
// cualquier prioridad (el total que acompaña a cada renglón de ese orden). Los dos valen 0 hasta que se carga ESP_CV
let COLSTAT = null, COLSTAT_B = null;   // se rehace al cambiar el filtro de banqueta o el de espacio, y al llegar las cepas
function colStat(id){ const clave = filtroClave() + (ESP_CV? '|cv' : ''); if(!COLSTAT || COLSTAT_B!==clave){ COLSTAT = new Map(); COLSTAT_B = clave; for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i] || !pasaBanq(i) || !pasaEspacio(i)) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,cv:0,cvt:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; if (ESP_CV) s.cvt+=ESP_CV[i]; if(esPrio(p)){ s.kmp+=k; s.np++; if (ESP_CV) s.cv+=ESP_CV[i]; } } }
  return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,cv:0,cvt:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(esPrio(p)){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// Vialidades distintas que comparten nombre: las partes de una avenida se agrupan por continuidad espacial;
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
// estadísticas de toda la avenida en la ciudad con el filtro «Espacio» (ficha de avenida); sin filtro, las de siempre (avStat)
function avStatEsp(id){ if (!filtroEsp) return avStat(id);
  const s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()};
  for (const i of avStat(id).idx){ if (!pasaEspacioVP(i)) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(esPrio(p)){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); }
  return {...s, km:s.kmt, kmByP:s.km}; }
// resumen de vialidades en un ámbito (alcaldía y/o avenida), con el filtro «Espacio» (enAmbitoVP)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(!enAmbitoVP(i)) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(esPrio(p)) s.recsp.add(VP.rec[i]); } return s; }

// ---------- reparto por responsable ----------
// Kilómetros de FRENTE DE MANZANA por responsable (0 = alcaldía, 1 = Gobierno Central) y prioridad en un ámbito:
// total (km), sin arbolado (sa) y sin arbolado con banqueta registrada por INEGI (sb). Con colonia manda la colonia, igual que enAmbito().
// Lo usan la tabla de comparación del Resumen (compHtml), el diccionario de los Excel y las fichas (sb, solo estos dos).
const REP_CACHE = new Map();
function repStat(mun, col){
  const key = mun+'|'+col+'|'+filtroClave(); let r = REP_CACHE.get(key); if (r) return r;
  r = {km:[[0,0,0,0,0],[0,0,0,0,0]], sa:[[0,0,0,0,0],[0,0,0,0,0]], sb:[[0,0,0,0,0],[0,0,0,0,0]]};
  for(let i=0;i<N;i++){ if ((col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun)) || !pasaBanq(i) || !pasaEspacio(i)) continue;
    const g=F.gc[i], p=F.prio[i], k=F.len[i]/1000, fl=F.flags[i]; r.km[g][p]+=k;
    if ((fl&7)===1){ r.sa[g][p]+=k; if (((fl>>3)&7)===0) r.sb[g][p]+=k; } }
  if (REP_CACHE.size>40) REP_CACHE.clear(); REP_CACHE.set(key, r); return r; }
// Equivalente en km de FRENTE DE MANZANA (aceras con manzana enfrente) de las vialidades primarias de un ámbito.
// La cifra oficial del Gobierno Central es el km de vialidad medido sobre el eje; el km de frente es su dato complementario
// y la única unidad con la que se compara o se suma con las alcaldías. Con el filtro «Espacio», solo los frentes de los tramos que pasan.
const GCF_CACHE = new Map();
function gcFrente(mun, av){ const key=mun+'|'+av+'|'+filtroEsp; let r=GCF_CACHE.get(key); if (r) return r; r={km:[0,0,0,0,0]};
  for(let i=0;i<N;i++){ if(!F.gc[i]) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; if (!pasaEspacioVP(F.vp[i])) continue; r.km[F.prio[i]]+=F.len[i]/1000; }
  if (GCF_CACHE.size>60) GCF_CACHE.clear(); GCF_CACHE.set(key,r); return r; }
const gcFrenteTxt = (mun, av) => { const g=gcFrente(mun, av); return `Equivalen a ${kmFull(sum(g.km))} de frente de manzana (aceras con manzana enfrente), ${kmFull(kmPrio(g))} prioritarios`; };
// Banqueta del Gobierno Central, solo como referencia (no filtra): la de los frentes de manzana prioritarios que dan a sus
// vialidades primarias, con la misma clasificación de INEGI 2020 que la fila «Banqueta» de las alcaldías
const GCB_CACHE = new Map();
function gcBanq(mun, av){ const key=mun+'|'+av+'|'+filtroEsp; let r=GCB_CACHE.get(key); if (r) return r; r=[0,0,0];
  for(let i=0;i<N;i++){ if(!F.gc[i] || !esPrio(F.prio[i])) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; if (!pasaEspacioVP(F.vp[i])) continue;
    const b=(F.flags[i]>>3)&7; r[b===0? 0 : b===1? 1 : 2] += F.len[i]/1000; }
  if (GCB_CACHE.size>60) GCB_CACHE.clear(); GCB_CACHE.set(key,r); return r; }
const gcBanqTxt = (mun, av) => { const d=gcBanq(mun, av), t=d[0]+d[1]+d[2]; if (!t) return '';
  return `Banqueta, como referencia: de los ${kmFull(t)} de frente de manzana prioritario que dan a estas vialidades, ${kmFull(d[0])} tienen banqueta (${pct(d[0],t)}), ${kmFull(d[1])} no la tienen y ${kmFull(d[2])} están por verificar, según INEGI 2020. Los tramos sin manzanas al lado (accesos controlados, puentes y entronques) no tienen este dato. No es un filtro: la fila «Banqueta» solo aplica a las calles de las alcaldías.`; };
// ---------- comparación de la alcaldía y el Gobierno Central (al final del Resumen) ----------
// Km de frente de manzana por responsable (repStat: los mismos frentes y filtros de siempre) y espacios para plantar del inventario de
// arbolado: los puntos asignados a frentes de la alcaldía que pasan enAmbito(i) (ESP_FRN) y, del Gobierno Central, los de las partes de
// vialidad primaria del ámbito que pasan enAmbitoVP(i), por sus frentes y en el camellón (ESP_VPN), igual que las listas y los Excel. En una
// colonia, del Gobierno Central cuentan solo los puntos de sus frentes en la colonia: el camellón no tiene colonia.
const kmComp = v => v>0 && v<0.5? '<1' : fmt0.format(v);   // km sin decimales
function espComp(){ const a=[0,0,0], g=[0,0,0];
  for(let i=0;i<N;i++){ if (!enAmbito(i)) continue; const t = !F.gc[i]? a : selCol!==null? g : null; if (t) for(let k=0;k<3;k++) t[k]+=ESP_FRN[3*i+k]; }
  if (selCol===null) for(let i=0;i<NV;i++){ if (enAmbitoVP(i)) for(let k=0;k<3;k++) g[k]+=ESP_VPN[3*i+k]; }
  return {a, g}; }
// renglones de los espacios para plantar: con los datos, cargando o con la falla
function espCompHtml(err){
  if (ESP_FRN && ESP_VPN){ const E = espComp();
    return INV_TIPOS.map((t,k)=>`<tr><th scope="row">${t.pl}</th><td>${fmt.format(E.a[k])}</td><td>${fmt.format(E.g[k])}</td><td>${fmt.format(E.a[k]+E.g[k])}</td></tr>`).join(''); }
  return `<tr><td colspan="4" class="rp-estado${err? ' warn' : ''}">${err? (err.sesion? SESION_TXT : 'no se pudo cargar el inventario') : 'cargando…'}</td></tr>`; }
// puntos del inventario que no cuentan para nadie (sin frente a 20 m ni vialidad primaria a 25 m): la cifra existe solo para toda la ciudad
const espSinContar = ()=> sel===null && INV.sinc!==undefined? `Los ${fmt.format(INV.sinc)} puntos de la ciudad que no tienen un frente de manzana a ${INV.dist} m o menos ni una vialidad primaria a ${INV.vp.dist} m o menos no se cuentan.` : 'Algunos puntos que no tienen un frente de manzana ni una vialidad primaria cerca no se cuentan.';
function compHtml(){
  const R = repStat(sel, selCol), fila = (lab, a, g, cls) => `<tr${cls? ` class="${cls}"` : ''}><th scope="row">${lab}</th><td>${kmComp(a)}</td><td>${kmComp(g)}</td><td>${kmComp(a+g)}</td></tr>`;
  const grupo = t => `<tr class="grupo"><th scope="colgroup" colspan="4">${t}</th></tr>`;
  let h = `<table class="reparto"><thead><tr><td></td><th scope="col">${sel===null? 'Alcaldías' : 'Alcaldía'}</th><th scope="col">Gobierno Central</th><th scope="col">Total</th></tr></thead>
    <tbody>${grupo('Km de frente de manzana')}${fila('Prioritario', sumPrio(R.km[0]), sumPrio(R.km[1]))}${fila('De lo prioritario, sin arbolado', sumPrio(R.sa[0]), sumPrio(R.sa[1]), 'sub')}${fila('Todos los frentes', sum(R.km[0]), sum(R.km[1]))}</tbody>`;
  if (INV) h += `<tbody>${grupo('Espacios para plantar (inventario en curso)')}</tbody><tbody id="rp-esp">${espCompHtml()}</tbody>`;
  h += '</table>';
  const det = ['Los km de frente de manzana cuentan cada acera por separado; no se suman con los km de vialidad primaria del Gobierno Central, que se miden sobre el eje.',
    'Prioritario reúne las prioridades Muy Alta, Alta y Media; «sin arbolado» es la clase del modelo.',
    INV? `Los espacios para plantar son los puntos del ${INV.fuente}: a la alcaldía le cuentan los de sus frentes de manzana (a ${INV.dist} m o menos) y al Gobierno Central, los de sus frentes y los del camellón (a ${INV.vp.dist} m o menos del eje de una vialidad primaria).${selCol!==null? ' En una colonia, del Gobierno Central cuentan solo los de sus frentes: el camellón no se asigna a una colonia.' : ''} ${espSinContar()}` : '',
    hayFiltro()? 'Con los filtros activos, cuentan solo los frentes y los tramos que pasan.' : ''].filter(Boolean).join(' ');
  return h + `<div class="note">${INV? `Inventario en curso (corte: ${INV.corte}).` : ''}${masDet(det)}</div>`; }
// pinta los renglones de los espacios (al llegar el inventario o si falla) sin rehacer el resto del Resumen
function espCompPinta(err){ const b = $('rp-esp'); if (b) b.innerHTML = espCompHtml(err); }
// al abrir el Resumen se piden los datos del inventario, sin bloquear: la tabla muestra los km enseguida y los espacios al llegar
function espCompPide(){ if (!INV || $('tp-res').hidden || !$('rp-esp')) return;
  if (ESP_FRN && ESP_VPN){ espCompPinta(); return; }
  espCargar().then(()=> espCompPinta(), e=>{ console.warn('espacios para plantar del Resumen', e); espCompPinta(e); }); }

// ---------- resumen del ámbito consultado ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0})); let t=0,p=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(esPrio(c.p)){ alc[m].p+=pb; p+=pb; } }
  return {alc, city:{t,p}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
// Participación de una alcaldía en los km prioritarios de la ciudad (no un lugar entre las 16 alcaldías):
// describe dónde se concentra la necesidad sin ordenar a las alcaldías como si fuera una calificación.
const partTxt = (i, gc) => pct(kmPrio((gc? VPC.summ : META.summ)[META.muns[i]]), gc? vCityPrioKm : cityPrioKm) + ' de los km prioritarios de la ciudad';
// Las dos alcaldías con más km prioritarios, calculadas de los datos.
const top2Txt = (S, tot) => { const o = META.muns.map((m,i)=>[i, kmPrio(S[m])]).sort((a,b)=>b[1]-a[1]);
  return `${META.munNames[o[0][0]]} y ${META.munNames[o[1][0]]} concentran ${pct(o[0][1]+o[1][1], tot)} de los km prioritarios de la ciudad.`; };
function frSumm(){
  if (selCol!==null || hayFiltro()){ const s={n:[0,0,0,0,0], km:[0,0,0,0,0]}; for(let i=0;i<N;i++){ if(F.gc[i] || !enAmbito(i)) continue; const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; } return s; }
  return sel===null? CITY : META.summ[META.muns[sel]];
}
// Desglose por banqueta de los km prioritarios a cargo de la alcaldía en el territorio consultado, SIN importar el filtro:
// [con banqueta, sin banqueta, por verificar]. Se muestra siempre, para que «con banqueta» no se confunda con el total.
const BD_CACHE = new Map();
function banqDesglose(mun, col){ const key=mun+'|'+col; let r=BD_CACHE.get(key); if (r) return r; r=[0,0,0];
  for(let i=0;i<N;i++){ if (F.gc[i] || !esPrio(F.prio[i]) || (col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun))) continue;
    const b=(F.flags[i]>>3)&7; r[b===0? 0 : b===1? 1 : 2] += F.len[i]/1000; }
  if (BD_CACHE.size>40) BD_CACHE.clear(); BD_CACHE.set(key, r); return r; }
const banqDesgloseTxt = (mun, col) => { const d=banqDesglose(mun, col), t=d[0]+d[1]+d[2];
  return `De los ${kmFull(t)} prioritarios de frente: ${kmFull(d[0])} con banqueta (${pct(d[0],t)}), ${kmFull(d[1])} sin banqueta y ${kmFull(d[2])} por verificar (conjunto habitacional o sin dato), según INEGI 2020. Sin banqueta no significa descartado: requiere reconocimiento en sitio.`; };
// «Más detalles»: en el celular, el texto de apoyo queda plegado; en la computadora va abierto y sin el botón (css/10_dos_pantallas.css).
// siempre = plegado también en la computadora, con su botón a la vista (lo que mezcla unidades o es solo de referencia)
const plegado = ()=> matchMedia(MQ_TEL).matches;
const masDet = (html, rot='Más detalles', siempre=false) => html? `<details class="mas${siempre? ' siempre' : ''}"${siempre || plegado()? '' : ' open'}><summary>${rot}</summary><div>${html}</div></details>` : '';
function notaPlegable(el, txt){ el.replaceChildren(); if (!txt) return;
  const d=document.createElement('details'), s=document.createElement('summary'), t=document.createElement('div');
  d.className='mas'; d.open=!plegado(); s.textContent='Más detalles'; t.textContent=txt; d.append(s,t); el.append(d); }
// tres cifras de un bloque: km prioritarios, su porcentaje del total y lo prioritario contado (frentes o tramos). Las etiquetas son cortas
// y no repiten el ámbito: lo dicen el título de la respuesta y el encabezado del bloque
function kpiHtml(s, opts){
  const tot = sum(s.km); const prio = kmPrio(s); const nprio = opts.nprio;
  return `<div class="kpi"><div class="v">${kmTxt(prio)}<small>${kmUn(prio)}</small></div><div class="l">${opts.l1}</div></div>
    <div class="kpi"><div class="v">${tot? fmt1.format(100*prio/tot):'0'}<small>%</small></div><div class="l">de ${kmFull(tot)}</div></div>
    <div class="kpi"><div class="v">${nprio>=10000? fmt1.format(nprio/1000)+'<small>mil</small>' : fmt.format(nprio)}</div><div class="l">${opts.l3}</div></div>`;
}
function barsHtml(s){ const tot=sum(s.km); const max = Math.max(...s.km, 0.001); return META.prio.map((p,k)=>`
    <div class="lab"><i data-st="background:var(--p${k})"></i>${p}</div>
    <div class="track"><div class="fill" data-st="width:${100*s.km[k]/max}%;background:var(--p${k})"></div></div>
    <div class="val">${kmFull(s.km[k])}<small>${pct(s.km[k],tot)}</small></div>`).reverse().join(''); }
function renderSummary(){
  const scopeName = selAv!==null? VPC.nomenclat[selAv] : selCol!==null? META.colonias[selCol].n : sel===null? 'Ciudad de México' : META.munNames[sel];
  const amb = selCol!==null?'de la colonia':sel===null?'de la ciudad':'de la alcaldía';
  const fs = frSumm(); const nprioF = sumPrio(fs.n);
  const emptyCol = selCol!==null && sum(fs.n)===0;  // colonia sin frentes a cargo de la alcaldía
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  // Resumen en bloques (v1.27): «Prioritario = …» una vez arriba; un bloque por red (encabezado, unidad y cifras con etiquetas cortas que no
  // repiten el ámbito) y al final la comparación de los dos responsables. Con una sola red, su bloque y la comparación.
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`km prioritarios${hayFiltro()? '<br><b class="banq-tag">'+filtroTxt()+'</b>' : ''}`, l3:'frentes prioritarios'});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`km prioritarios${filtroEsp? '<br><b class="banq-tag">'+espTxtVP()+'</b>' : ''}`, l3:`de ${fmt.format(vs.recs.size)} tramos prioritarios`}) : '';
  // encabezados de los bloques: quién atiende (en mayúsculas por estilo) y qué se mide
  const cabAlc = sel===null? 'Alcaldías' : 'Alcaldía', subAlc = `Frentes de manzana${selCol!==null? ' en la colonia' : ''} · km por cada acera`;
  const subGC = `${selAv!==null? (sel===null? 'Toda la avenida' : 'La avenida en la alcaldía') : 'Vialidades primarias'} · km sobre el eje${resp==='both' && selCol!==null? ' · de toda la alcaldía' : ''}`;
  $('res-cab').textContent = resp==='gc'? 'Gobierno Central' : cabAlc; $('res-sub').textContent = resp==='gc'? subGC : subAlc;
  $('res-sub2').textContent = subGC;
  // población: una línea; la nota del censo, en «Más detalles»
  const pobLine = (()=>{ if (isGC() || selAv!==null) return '';
    const nota = 'Población residente (Censo 2020); no equivale a población atendida.';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><div><span><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · su unidad territorial tiene desarrollo social ${c.ids.toLowerCase()}`:''}</span>${masDet(nota)}</div></div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><div><span><b>${hab(P.p)}</b> en colonias prioritarias (${pct(P.p,P.t)})</span>${masDet(nota + ' Colonias prioritarias: las de prioridad Muy Alta, Alta o Media; el porcentaje es de la población ' + (sel===null? 'de la ciudad.' : 'de la alcaldía.'))}</div></div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = pobLine; pb.hidden = !pb.innerHTML; }
  // desglose por banqueta (alcaldías) y equivalencia en km de frente con la banqueta de referencia (Gobierno Central), cada uno en su bloque
  const ub = $('univbox'), ub2 = $('univbox2');
  const gcEq = ()=>{ const gb = gcBanqTxt(sel, selAv);
    return masDet(`${gb? `<div class="univline banq gcbanq"><span>${gb}</span></div>` : ''}<div class="univline eq"><span>${gcFrenteTxt(sel, selAv)}. Los kilómetros de vialidad se miden sobre el eje de la avenida; los de frente, por cada acera. Para comparar o sumar con las alcaldías se usa el kilómetro de frente.</span></div>`, 'Equivalencia en km de frente y banqueta de referencia', true); };
  ub.innerHTML = resp==='gc'? gcEq() : emptyCol? '' : masDet(`<div class="univline banq"><span>${banqDesgloseTxt(sel, selCol)}</span></div>`, 'Banqueta de lo prioritario');
  ub.hidden = !ub.innerHTML;
  ub2.innerHTML = resp==='both'? gcEq() : ''; ub2.hidden = !ub2.innerHTML;
  // comparación de los dos responsables; con solo Gobierno Central, plegada también en la computadora (es en km de frente)
  const rp = $('reparto'); rp.hidden = selAv!==null;
  rp.innerHTML = rp.hidden? '' : resp==='gc'? masDet(compHtml(), `Comparar con ${sel===null? 'las alcaldías' : 'la alcaldía'} (km de frente y espacios)`, true)
    : `<h2 class="res-cab">${cabAlc} y Gobierno Central</h2><p class="res-sub">Comparación en km de frente de manzana${selCol!==null? ', en la colonia' : ''}</p>${compHtml()}`;
  espCompPide();
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
      stats = `<div class="st"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios ${scV2}${espCorto()}</small></div>
        <div class="st opt"><b>${pct(kmPrio(vs),t2)}</b><small>de ${kmFull(t2)} ${scV2}</small></div>
        <div class="st opt"><b>${fmt.format(vs.recsp.size)}</b><small>tramos prioritarios ${scV2}</small></div>`;
    } else if (resp==='both'){
      // en una colonia no hay cifra de vialidades primarias: se muestra su población en su lugar
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} de frente prioritarios · a cargo de la Alcaldía${filtroCorto()}</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} de vialidad prioritarios · a cargo del Gob. Central${espCorto()}</small></div>`}
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    } else if (emptyCol){
      stats = `<div class="st"><b>Sin frentes</b><small>a cargo de la alcaldía en esta colonia</small></div>
        <div class="st opt"><b>${habC(META.colonias[selCol].pob||0)}</b><small>habitantes de la colonia</small></div>`;
    } else {
      const t2 = sum(fs.km);
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios de frente${filtroCorto()}</small></div>
        <div class="st opt"><b>${pct(kmPrio(fs),t2)}</b><small>de ${kmFull(t2)} de frentes ${amb}</small></div>
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    }
    const scopeTxt = (selAv!==null && sel!==null)? `${scopeName} · ${META.munNames[sel]}` : scopeName;
    ms.innerHTML = `<div class="scope"><span>${tag}</span><b>${dcol? `<i data-st="background:rgb(${dcol[0]},${dcol[1]},${dcol[2]})"></i>`:''}${scopeTxt}</b></div><div class="sep"></div>${stats}`;
  }
  // km por categoría del ámbito consultado, en la leyenda
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmFull(ls.km[+e.dataset.k]); });
    $('lg-scope').textContent = resp==='gc' ? `Prioridad · km de vialidad primaria ${ambV1}` : `Prioridad · km de frente ${amb}`; }
  // barras «Por prioridad» de cada bloque (los títulos ya no repiten el ámbito: lo dice el encabezado del bloque)
  $('kpis').innerHTML = resp==='gc'? kVp : kFr; $('bars').innerHTML = resp==='gc'? barsHtml(vs) : emptyCol? '' : barsHtml(fs);
  $('bars2').hidden = resp!=='both';
  $('kpis2').innerHTML = resp==='both'? kVp : ''; $('bars2-rows').innerHTML = resp==='both'? barsHtml(vs) : '';
  const gcs = sel===null? META.city_gc : META.summ_gc[META.muns[sel]];
  let txt;
  if (resp==='gc'){
    const tot=sum(vs.km);
    txt = sel===null
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. ${top2Txt(VPC.summ, vCityPrioKm)}`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]}${filtroEsp? ' con '+espLista() : ''} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
    // con el filtro «Espacio», las cifras de arriba son las filtradas: se dice qué cuenta y que el inventario está en curso
    if (filtroEsp) txt += ' Cifras de arriba con el filtro «Espacio»: ' + espNotaVP().charAt(0).toLowerCase() + espNotaVP().slice(1);
  } else if (emptyCol){
    txt = EMPTY_MSG;
  } else {
    txt = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. ${top2Txt(META.summ, cityPrioKm)}`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(sumPrio(fs.n))+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (selCol===null && sinColStat().n? ` ${fmt.format(sinColStat().n)} frentes (${kmFull(sinColStat().km)}) ${sel===null?'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo: se cuentan aquí, pero no aparecen en las consultas por colonia.` : '')
      + (resp==='alc' && selCol===null? ` Además, ${fmt0.format(sum(gcs.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'} (${fmt0.format(kmPrio(gcs))} km prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.` : '');
  }
  notaPlegable($('bars-note'), txt);
}

// Lista de «Dónde empezar»: colonias, calles dentro de su colonia, avenidas y alcaldías, con orden elegible, filtro por nombre y paso de
// ubicación de las calles cuyo nombre se repite; calle consultada (la resaltada).
// ---------- índices de calles y avenidas ----------
let streetIdx = null; // Map clave -> {nid, col, idx:[], km, kmp, np, cv, cvt, tipos:Set, cols:Set}; clave = calle dentro de su colonia
// cv: cepas vacantes del inventario en sus frentes prioritarios (el orden por cepas); cvt: en todos sus frentes del ámbito, de cualquier
// prioridad (el total que acompaña al renglón). Valen 0 mientras no se cargue espacios_frentes.bin (ESP_CV en 03_estado.js)
let sinNombre = {km:0, kmp:0, n:0, np:0};  // frentes sin nombre de vialidad en INEGI dentro del ámbito
function buildStreets(){
  streetIdx = new Map(); sinNombre = {km:0, kmp:0, n:0, np:0};
  for(let i=0;i<N;i++){ if (F.gc[i] || !enAmbito(i)) continue; const nid=F.name[i];
    if (PLACEHOLDER.has(nid)){ const k=F.len[i]/1000; sinNombre.km+=k; sinNombre.n++; if(esPrio(F.prio[i])){ sinNombre.kmp+=k; sinNombre.np++; } continue; }
    const col=F.col[i]; const key = nid*4096 + col; let s=streetIdx.get(key); if(!s){ s={nid, col, idx:[],km:0,kmp:0,np:0,cv:0,cvt:0,kp:[0,0,0,0,0],tipos:new Set(),cols:new Set()}; streetIdx.set(key,s); }
    s.idx.push(i); s.km+=F.len[i]/1000; s.kp[F.prio[i]]+=F.len[i]/1000; if (ESP_CV) s.cvt+=ESP_CV[i]; if(esPrio(F.prio[i])){ s.kmp+=F.len[i]/1000; s.np++; if (ESP_CV) s.cv+=ESP_CV[i]; } s.tipos.add(META.tipos[F.tipo[i]]); if(col) s.cols.add(META.colonias[col].n); }
}
// Corredor de la red vial de una avenida, para mostrar: los «Ruta N» de la capa de vialidades primarias son una numeración interna
// que no le dice nada a quien consulta. Se omiten en pantalla y en las fichas; en las descargas van completos, para cruzar con la capa.
const redVisible = n => !!n && !/^ruta\s/i.test(String(n).trim());
const redesTxt = (ns, max=2)=>{ const v=[...ns].filter(redVisible); return v.slice(0,max).join(', ') + (v.length>max? ' +'+(v.length-max) : ''); };
let avIdx = null; // Map nomId -> {idx:[], km, kmp, cv, cvt, recs:Set, recsp:Set, nombres:Set, muns:Set, tipos:Set}
// avenidas de la alcaldía (o de la ciudad) con el filtro «Espacio»; cv: cepas vacantes de sus partes prioritarias (el orden); cvt: de todas
// sus partes del ámbito, de cualquier prioridad (el total del renglón). Por sus frentes del Gobierno Central y en el camellón; valen 0 mientras no se cargue
// espacios_vp.bin (ESP_VPN en 03_estado.js)
function buildAvenues(){
  avIdx = new Map();
  for(let i=0;i<NV;i++){ if ((sel!==null && VP.mun[i]!==sel) || !pasaEspacioVP(i)) continue; const a=VP.nom[i]; let s=avIdx.get(a); if(!s){ s={idx:[],km:0,kmp:0,cv:0,cvt:0,recs:new Set(),recsp:new Set(),nombres:new Set(),muns:new Set(),tipos:new Set()}; avIdx.set(a,s); }
    const k=VP.len[i]/1000; s.idx.push(i); s.km+=k; s.recs.add(VP.rec[i]); if (ESP_VPN) s.cvt+=ESP_VPN[3*i]; if(esPrio(VP.prio[i])){ s.kmp+=k; s.recsp.add(VP.rec[i]); if (ESP_VPN) s.cv+=ESP_VPN[3*i]; } s.nombres.add(VPC.nombres[VP.nombre[i]]); s.muns.add(VP.mun[i]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const NAMES_N = META.names.map(norm);
const AV_N = VPC.nomenclat.map(norm);
// desglose de una calle por prioridad: una calle reúne frentes de prioridades distintas, por eso no tiene una sola
function desgHtml(s){ const d = dom({km:s.kp}); const partes = []; for(let p=4;p>=0;p--) if (s.kp[p]>0) partes.push(`<span><i data-st="background:var(--p${p})"></i>${META.prio[p]} ${kmFull(s.kp[p])}</span>`);
  return `<div class="desg" aria-label="Kilómetros de frente de la calle por prioridad">${partes.join('')}</div>${partes.length>1? `<div class="t">Prioridad predominante: ${META.prio[d]} · ${kmFull(s.km)} de frente en total</div>` : ''}`; }
const PLACEHOLDER = new Set(META.names.map((n,i)=>[norm(n),i]).filter(([n])=> n==='' || n==='sin referencia' || n==='sin nombre' || n.startsWith('ninguno') || / ninguno$/.test(n) || n.startsWith('manzana o edificacion')).map(x=>x[1]));
// Nombre de un frente, igual en tarjeta, listados, Mi ubicación, Excel y fichas: los nombres genéricos de INEGI
// («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua» y variantes como «Privada Ninguno») no son nombres de calle.
const SIN_NOMBRE = 'Frente sin nombre de calle (INEGI)';
const sinNombreFr = i => PLACEHOLDER.has(F.name[i]) || !META.names[F.name[i]];
const nomFrente = i => sinNombreFr(i)? SIN_NOMBRE : META.names[F.name[i]];
// frentes de alcaldía sin colonia asignada: no aparecen en ninguna consulta por colonia
let SINCOL = null, SINCOL_B = null;   // se rehace al cambiar el filtro de banqueta o el de espacio
const sinColBase = () => { if (!SINCOL || SINCOL_B!==filtroClave()){ SINCOL_B = filtroClave(); SINCOL = META.muns.map(()=>({n:0, km:0, kmp:0})); for(let i=0;i<N;i++){ if (F.col[i] || F.gc[i] || !pasaBanq(i) || !pasaEspacio(i)) continue; const s=SINCOL[F.mun[i]], k=F.len[i]/1000; s.n++; s.km+=k; if (esPrio(F.prio[i])) s.kmp+=k; } } return SINCOL; };
const sinColStat = () => sel!==null? sinColBase()[sel] : sinColBase().reduce((t,s)=>({n:t.n+s.n, km:t.km+s.km, kmp:t.kmp+s.kmp}), {n:0,km:0,kmp:0});
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
function renderUbicar(ul, items, qRaw){
  const uno = new Set(items.map(x=>x[1].nid)).size===1;
  $('ini-title').textContent = uno? `${fmt.format(items.length)} calles se llaman ${META.names[items[0][1].nid]}` : `${fmt.format(items.length)} calles coinciden con «${qRaw}»`;
  $('ini-count').textContent = 'Elige la alcaldía o la colonia';
  iniNota('Elige la alcaldía arriba o una de las calles de la lista para ver sus cifras y sus tramos.');
  const porMun = new Map(); for (const [,s] of items){ const m=F.mun[s.idx[0]]; porMun.set(m, (porMun.get(m)||0)+1); }
  locChips('<span class="lc-cap">¿En qué alcaldía?</span>' + [...porMun.entries()].sort((a,b)=>META.munNames[a[0]].localeCompare(META.munNames[b[0]],'es')).map(([m,n])=>`<button type="button" class="lchip" data-m="${m}">${META.munNames[m]} <b>${n}</b></button>`).join(''));
  // orden por ubicación: con Mi ubicación, la más cercana primero; si no, por alcaldía y colonia
  const c0 = myPos? Math.cos(myPos.lat*Math.PI/180) : 0;
  const dist = s => { let d=Infinity; for (const i of s.idx){ const dd=Math.hypot((midLon(i)-myPos.lon)*111320*c0, (midLat(i)-myPos.lat)*110540); if(dd<d) d=dd; } return d; };
  const filas = items.map(([key,s])=>({key, s, m:F.mun[s.idx[0]], col: s.col? META.colonias[s.col].n : 'Colonia no identificada', d: myPos? dist(s) : 0}));
  filas.sort((a,b)=> myPos? a.d-b.d : (META.munNames[a.m].localeCompare(META.munNames[b.m],'es') || a.col.localeCompare(b.col,'es') || (META.names[a.s.nid]||'').localeCompare(META.names[b.s.nid]||'','es')));
  for (const f of filas.slice(0, iniN)){ const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button'); li.className='ubica';
    const tl=[...f.s.tipos].filter(Boolean).slice(0,2).join(', ');
    li.innerHTML = `<div><div class="n">${META.names[f.s.nid]||'Sin nombre'}</div><div class="t">${f.col} · ${META.munNames[f.m]}${tl? ' · '+tl : ''}</div></div><div class="k"><small>${myPos? 'a '+distTxt(f.d) : ''}</small></div>`;
    // al elegir, la consulta queda en la alcaldía de la calle y la calle resaltada
    const go = ()=>{ selEl.value=String(f.m); sel=f.m; selCol=null; selAv=null; highlight=null; hideCard(); keepView=true; refresh(); keepView=false;
      const st=streetIdx.get(f.key); if (st){ highlightStreet(f.key, st); renderInicio(); } };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  return filas.length; }
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
  hideCard(); if (!restaurando) verMapa({desdeLista:true}); flyTo(vs, 1000); rerender(); renderActions(); syncCalleBtns(); rotuloInfo();
}

// ---------- pestaña «Dónde empezar»: la lista del ámbito ----------
// Una sola lista, que no depende de las casillas de capas: colonias del ámbito (con orden elegible), calles de la alcaldía o de la colonia,
// alcaldías de la ciudad, avenidas cuando solo se consulta al Gobierno Central y, con una avenida elegida, las alcaldías que cruza.
// El campo de filtro busca calles (o avenidas) del ámbito por nombre; un nombre repetido en toda la ciudad pide primero dónde.
// Con una calle consultada, sus tramos van arriba de la lista (09_tramos.js).
let iniOrden = 'kmp', iniN = 10;
// Orden por cepas vacantes (inventario de arbolado): 'cv' son las colonias por cepas y, con una colonia elegida, sus calles por cepas (así el
// orden se conserva al bajar de la alcaldía a la colonia y al volver); 'callescv', las calles de la alcaldía por cepas; 'avcv', las avenidas
// del Gobierno Central por cepas de sus partes prioritarias en el ámbito, con el filtro «Espacio» (buildAvenues). Ordena por las cepas de los
// frentes (o tramos) prioritarios que pasan enAmbito(i), con los filtros de banqueta y espacio; cada renglón dice además el total de
// cualquier prioridad, y lo que no tiene km prioritarios pero sí cepas va al final (v1.27, en lugar de los órdenes «(todas)» de la v1.25).
// Necesita espacios_frentes.bin: se baja la primera vez que se elige (espCargar); mientras llega, la lista sigue con el orden anterior y un
// aviso dice que está cargando. El archivo único no trae el inventario y no lo ofrece. La vista «Alcaldías» de la ciudad no se ordena por
// cepas: el inventario avanza muy distinto en cada alcaldía y ese orden diría más del avance del inventario que de dónde plantar.
const INI_CV = new Set(['cv', 'callescv', 'avcv']);
let iniPend = null;   // orden por cepas pedido mientras baja el archivo
// renglón del orden por cepas: las de lo prioritario (las que ordenan) y el total de cualquier prioridad, «48 cepas vacantes · 62 en total»;
// cada cifra con su texto no se parte entre renglones (espacios no separables) y la cifra puede ocupar dos (span.cep)
const cepasTxt = (cv, cvt) => { const n = (v, t) => (fmt.format(v) + ' ' + t).replace(/ /g, '\u00a0');
  return cv? n(cv, `cepa${cv===1? '' : 's'} vacante${cv===1? '' : 's'}`) + (cvt? ' · ' + n(cvt, 'en total') : '')
    : cvt? 'sin cepas en lo prioritario · ' + n(cvt, 'en total') : 'sin cepas registradas'; };
const cepasK = (cv, cvt) => `<span class="cep">${cepasTxt(cv, cvt)}</span>`;
const cepasNota = que => `Cuenta solo lo inventariado hasta ${INV.corte} (inventario en curso): ${que} con 0 puede no estar inventariada todavía.`;
// opciones de «Mostrar»: cortas, para que la lista desplegable no se salga del panel en el celular
const INI_VISTA = {
  kmp: { op:'Colonias · más km prioritarios', tit:'por kilómetros de frente prioritario', val:s=>s.kmp, nota:'Prioritario = categorías Muy Alta, Alta y Media. Selecciona una colonia para ver sus calles.' },
  cv:  { op:'Colonias · más cepas vacantes', opCol:'Calles · más cepas vacantes', tit:'por cepas vacantes en frentes prioritarios', val:s=>s.cv, nota:'Ordenadas por cepas vacantes del inventario de arbolado en los frentes prioritarios (Muy Alta, Alta y Media) a cargo de la alcaldía: ahí se puede plantar directo. Selecciona una colonia para ver sus calles.' },
  pob: { op:'Colonias · más habitantes', tit:'por habitantes', val:(s,c)=>c.pob||0, nota:'Población residente de la colonia (Censo 2020) entre las colonias con frente prioritario; no equivale a población atendida.' },
  calles: { op:'Calles · más km prioritarios' },
  callescv: { op:'Calles · más cepas vacantes' },
  alc: { op:'Alcaldías · más km prioritarios' },
  av: { op:'Avenidas · más km prioritarios' },
  avcv: { op:'Avenidas · más cepas vacantes' } };
// lo que dicen «Más detalles» del orden por cepas: el total del renglón y lo que va al final
const cepasDet = (que, en) => `«En total» suma las cepas vacantes de todos sus ${en}, de cualquier prioridad. Con el mismo número, va primero ${que} con más kilómetros prioritarios; al final, las que solo tienen cepas en ${en} no prioritarios.`;
// lo que se puede mostrar en el ámbito consultado (la primera opción es la de siempre); con una sola, no se ofrece el selector
function iniVistas(){
  const cv = INV? ['cv'] : [];   // el archivo único no trae el inventario
  if (isGC()) return selAv!==null? ['avalc'] : ['av', ...(INV? ['avcv'] : []), ...(sel===null? ['alc'] : [])];
  if (selCol!==null) return ['calles', ...cv];
  return ['kmp', ...cv, 'pob', ...(sel===null? ['alc'] : ['calles', ...(INV? ['callescv'] : [])])]; }
// el nombre de la opción: con una colonia elegida, «cv» son sus calles por cepas
const iniOp = k => k==='cv' && selCol!==null? INI_VISTA[k].opCol : INI_VISTA[k].op;
function iniFila(pos, nombre, sub, k, small, go, dotc, extra=''){ const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
  li.innerHTML = `<div><div class="n"><span class="pos">${pos}</span>${dotc? dot(dotc):''}${nombre}</div>${sub? `<div class="t">${sub}</div>` : ''}${extra}</div><div class="k">${k}<small>${small}</small></div>`;
  li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; return li; }
const iniVacio = (ul, t) => { ul.innerHTML = `<li class="empty">${t}</li>`; return 0; };
// nota bajo la lista; lo complementario va en «Más detalles» (plegado en el celular)
function iniNota(txt, extra){ const n=$('ini-note'); n.textContent = txt; if (extra) n.insertAdjacentHTML('beforeend', masDet(extra)); }
function filasColonias(ul, ord){
  const o = INI_VISTA[ord], m = sel===null? null : META.muns[sel];
  $('ini-title').textContent = `Colonias ${sel===null? 'de la ciudad' : 'de '+META.munNames[sel]} por atender primero`;
  const cv = ord==='cv';
  const items=[]; for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const s=colStat(i); if (s.kmp>0 || (cv && s.cvt>0)) items.push([i,s,c,o.val(s,c)]); }
  // con el mismo valor, la de más km prioritarios; en «cv», las de 0 cepas en lo prioritario quedan al final y, después de ellas, las que no
  // tienen km prioritarios pero sí cepas (por su total; lo que tiene km prioritarios conserva el orden de siempre)
  items.sort((a,b)=> b[3]-a[3] || b[1].kmp-a[1].kmp || (cv && !a[1].kmp? b[1].cvt-a[1].cvt : 0));
  $('ini-count').textContent = `${fmt.format(items.length)} colonia${items.length===1?'':'s'}, ${o.tit}`;
  const sc = sinColStat();
  iniNota(o.nota, [cv? cepasDet('la colonia', 'frentes') + ' ' + cepasNota('una colonia') : '', sc.n? `Además, ${fmt.format(sc.n)} frentes (${kmFull(sc.km)}; ${kmFull(sc.kmp)} prioritarios) ${sel===null? 'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo y no aparecen en esta lista. Sí se cuentan en las cifras de la alcaldía y en su Excel de frentes.` : ''].filter(Boolean).join(' '));
  if(!items.length) return iniVacio(ul, filtroEsp? `Ninguna colonia de este ámbito tiene frentes ${cv? '' : 'prioritarios '}con ${espLista()} inventariados hasta ahora. El inventario de arbolado está en curso.` : cv? 'Este ámbito no tiene colonias con frente prioritario ni con cepas vacantes registradas.' : 'Este ámbito no tiene colonias con frente prioritario.');
  items.slice(0,iniN).forEach(([i,s,c],k)=>{
    const [v,sm] = ord==='pob'? [fmt.format(c.pob||0)+' hab.', `${kmFull(s.kmp)} de frente prioritario`]
      : cv? [cepasK(s.cv, s.cvt), `${kmFull(s.kmp)} de frente prioritario`]
      : [kmFull(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes son prioritarios`];
    ul.appendChild(iniFila(k+1, c.n, `${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.pob && ord!=='pob'? ' · '+fmt.format(c.pob)+' hab.':''}`, v, sm, ()=>pickColonia(i), c.p>=0? T.prio[c.p]:null)); });
  return items.length; }
// calles de la colonia o de la alcaldía (cada una dentro de su colonia), o las que coinciden con el filtro; con cepas, por cepas vacantes de
// sus frentes prioritarios, con el total de cualquier prioridad en el renglón; al final, las calles sin km prioritarios que tienen cepas
function filasCalles(ul, q, qRaw, cepas=false){
  const lugar = selCol!==null? 'la colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'la alcaldía '+META.munNames[sel];
  const items = [];
  if (q){ for(const [key,s] of streetIdx){ if (calleCoincide(s, q)) items.push([key,s]); }
    if (sel===null && selCol===null && new Set(items.map(x=>x[1].col)).size>1) return renderUbicar(ul, items, qRaw);
    if (sel!==null && selCol===null) locChips(`<button type="button" class="lchip" data-m="">Buscar «${qRaw.replace(/[<>&"]/g,'')}» en otra alcaldía</button>`);
    $('ini-title').textContent = `Calles encontradas en ${lugar}`; }
  else { for(const [key,s] of streetIdx){ if((s.kmp>0 || (cepas && s.cvt>0)) && META.names[s.nid]) items.push([key,s]); }
    $('ini-title').textContent = `Calles de ${selCol!==null? META.colonias[selCol].n : META.munNames[sel]} por atender primero`; }
  // con las mismas cepas, por km prioritarios y por km en total (como siempre); las que no tienen km prioritarios, al final, por su total
  if (cepas) items.sort((a,b)=> b[1].cv-a[1].cv || b[1].kmp-a[1].kmp || (a[1].kmp? 0 : b[1].cvt-a[1].cvt) || b[1].km-a[1].km);
  else items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length;
  $('ini-count').textContent = cepas? `${fmt.format(total)} calle${total===1?'':'s'}${selCol!==null? '' : ', contadas por colonia'}, por cepas vacantes en frentes prioritarios`
    : selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q?'':' con frente prioritario'}`
    : q ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  const sinNom = !q && sinNombre.kmp>0? `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI («Ninguno» o «Manzana o edificación contigua»). No aparecen en esta lista, pero sí en el Excel de frentes.` : '';
  if (cepas) iniNota(`Calles ${selCol!==null? 'de la colonia' : 'de la alcaldía'} ordenadas por cepas vacantes del inventario de arbolado en sus frentes prioritarios (Muy Alta, Alta y Media): ahí se puede plantar directo.${selCol!==null? '' : ' Una calle que pasa por varias colonias aparece una vez en cada una.'} Selecciona una calle para ubicarla en el mapa y ver sus tramos.`,
    [cepasDet('la calle', 'frentes'), cepasNota('una calle'), sinNom].filter(Boolean).join(' '));
  else iniNota(q? 'Prioritario = categorías Muy Alta, Alta y Media. Selecciona una calle para ubicarla en el mapa y ver sus tramos.'
    : selCol!==null? 'Calles de la colonia ordenadas por kilómetros de frente prioritario (Muy Alta, Alta y Media). Selecciona una calle para ubicarla en el mapa y ver sus tramos.'
    : 'Calles de la alcaldía ordenadas por kilómetros de frente prioritario (Muy Alta, Alta y Media); una calle que pasa por varias colonias aparece una vez en cada una. Selecciona una calle para ubicarla en el mapa y ver sus tramos.',
    sinNom);
  if (!total) return iniVacio(ul, q? `Sin coincidencias en ${lugar}.` : `${selCol!==null? 'Esta colonia' : 'Este ámbito'} no tiene calles con frente prioritario (Muy Alta, Alta o Media)${cepas? ' ni con cepas vacantes registradas' : ''}.`);
  items.slice(0,iniN).forEach(([key,s],k)=>{ const d=dom({km:s.kp}); const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    const li = iniFila(k+1, META.names[s.nid]||'Sin nombre', [donde, tipos].filter(Boolean).join(' · '), cepas? cepasK(s.cv, s.cvt) : kmFull(s.kmp), cepas? `${kmFull(s.kmp)} de frente prioritario` : `${s.np} de ${s.idx.length} frentes prioritarios`, ()=>{ highlightStreet(key, s); renderInicio(); }, T.prio[d], desgHtml(s));
    if (highlight && highlight.nameId===key) li.classList.add('active');
    ul.appendChild(li); });
  return total; }
// avenidas del ámbito (Gobierno Central), o las que coinciden con el filtro; con cepas, por cepas vacantes de sus tramos prioritarios, con el
// total de cualquier prioridad en el renglón; al final, las avenidas sin km prioritarios que tienen cepas
function filasAvenidas(ul, q, cepas=false){
  const en = sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
  const items = [];
  if (q){ for(const [a,s] of avIdx){ if (AV_N[a].includes(q) || [...s.nombres].some(n=>norm(n).includes(q))) items.push([a,s]); } $('ini-title').textContent = `Avenidas encontradas ${en}`; }
  else { for(const [a,s] of avIdx){ if(s.kmp>0 || (cepas && s.cvt>0)) items.push([a,s]); } $('ini-title').textContent = `Avenidas ${sel===null? 'de la ciudad' : 'de la alcaldía '+META.munNames[sel]} por atender primero`; }
  // con las mismas cepas, por km prioritarios y por km en total (como siempre); las que no tienen km prioritarios, al final, por su total
  if (cepas) items.sort((a,b)=> b[1].cv-a[1].cv || b[1].kmp-a[1].kmp || (a[1].kmp? 0 : b[1].cvt-a[1].cvt) || b[1].km-a[1].km);
  else items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length;
  $('ini-count').textContent = cepas? `${fmt.format(total)} avenida${total===1?'':'s'}, por cepas vacantes en tramos prioritarios`
    : `${fmt.format(total)} avenida${total===1?'':'s'}${q?'':' con km prioritarios'}`;
  if (cepas) iniNota('Vialidades primarias a cargo del Gobierno Central, ordenadas por cepas vacantes del inventario de arbolado en sus tramos prioritarios (Muy Alta, Alta y Media): las de sus frentes de manzana y las del camellón. Ahí se puede plantar directo. Selecciona una avenida para consultarla.', cepasDet('la avenida', 'tramos') + ' ' + cepasNota('una avenida'));
  else iniNota('Vialidades primarias a cargo del Gobierno Central, ordenadas por kilómetros prioritarios (Muy Alta, Alta y Media) medidos sobre el eje. Selecciona una avenida para consultarla.');
  if (!total) return iniVacio(ul, q? `Sin coincidencias ${en}.` : filtroEsp? `Ninguna avenida de este ámbito tiene tramos ${cepas? '' : 'prioritarios '}con ${espLista()} inventariados hasta ahora. El inventario de arbolado está en curso.` : `Este ámbito no tiene avenidas con kilómetros prioritarios (Muy Alta, Alta o Media)${cepas? ' ni con cepas vacantes registradas' : ''}.`);
  items.slice(0,iniN).forEach(([a,s],k)=>{ const ms=[...s.muns];
    const li = iniFila(k+1, VPC.nomenclat[a], [redesTxt(s.nombres), sel===null? ms.slice(0,2).map(m=>META.munNames[m]).join(', ')+(ms.length>2?' +'+(ms.length-2):'') : ''].filter(Boolean).join(' · '),
      cepas? cepasK(s.cv, s.cvt) : kmFull(s.kmp), cepas? `${kmFull(s.kmp)} prioritarios · ${s.recsp.size} de ${s.recs.size} tramos` : `${s.recsp.size} de ${s.recs.size} tramos son prioritarios`, ()=>pickAvenida(a));
    if (selAv===a) li.classList.add('active');
    ul.appendChild(li); });
  return total; }
// avenida elegida: las alcaldías que cruza, por km prioritarios
function filasAvAlc(ul){
  const per = new Map();
  for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv || !pasaEspacioVP(i)) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); }
  const items=[...per.entries()].sort((a,b)=> kmPrio(b[1])-kmPrio(a[1]));
  $('ini-title').textContent = `Tramos de ${VPC.nomenclat[selAv]} por alcaldía`; $('ini-count').textContent = `cruza ${items.length} alcaldía${items.length===1?'':'s'}`;
  iniNota('Kilómetros prioritarios (Muy Alta, Alta y Media) de la avenida en cada alcaldía, medidos sobre el eje. Selecciona una alcaldía para consultar solo la parte de la avenida que está en ella.');
  items.slice(0,iniN).forEach(([m,s],k)=>{ const d=dom(s);
    const li = iniFila(k+1, META.munNames[m], `Prioridad predominante ${META.prio[d]} · ${fmt1.format(sum(s.km))} km de la avenida en esta alcaldía`, kmFull(kmPrio(s)), `${s.recsp.size} de ${s.recs.size} tramos prioritarios aquí`, ()=>{ if(sel!==m){ selEl.value=String(m); sel=m; refresh(); } }, T.prio[d]);
    if (sel===m) li.classList.add('active');
    ul.appendChild(li); });
  return items.length; }
// alcaldías de la ciudad: dónde se concentra lo prioritario (no es una calificación)
function filasAlcaldias(ul){
  const items = META.muns.map((m,i)=>i).sort((a,b)=> rankOf(a)-rankOf(b));
  $('ini-title').textContent = isGC()? 'Alcaldías por kilómetros prioritarios de vialidad primaria' : 'Alcaldías por kilómetros de frente prioritario';
  $('ini-count').textContent = `${META.muns.length} alcaldías de la ciudad`;
  iniNota(isGC()? `Kilómetros de vialidad primaria de prioridad Muy Alta, Alta y Media en cada alcaldía, medidos sobre el eje. Dice dónde se concentra la necesidad; no es una calificación.${filtroEsp? ' Esta lista no aplica el filtro de espacio.' : ''} Selecciona una alcaldía para ver sus avenidas.`
    : `Kilómetros de frente de prioridad Muy Alta, Alta y Media a cargo de cada alcaldía. Dice dónde se concentra la necesidad; no es una calificación.${filtroBanq!=='todas' && filtroEsp? ' Esta lista no aplica los filtros de banqueta ni de espacio.' : filtroBanq!=='todas'? ' Esta lista no aplica el filtro de banqueta.' : filtroEsp? ' Esta lista no aplica el filtro de espacio.' : ''} Selecciona una alcaldía para ver sus colonias.`);
  items.slice(0,iniN).forEach((i,k)=>{ const s=summOf(i), tot=sum(s.km), d=domOf(i);
    ul.appendChild(iniFila(k+1, META.munNames[i], `Prioridad predominante ${META.prio[d]} · ${pct(kmPrio(s),tot)} de ${isGC()? 'sus km de vialidad primaria':'sus km de frente'} es prioritario`, kmFull(kmPrio(s)),
      isGC()? `${fmt.format(VP_RECS[i].rp.size)} de ${fmt.format(VP_RECS[i].r.size)} tramos prioritarios` : `${fmt.format(sumPrio(s.n))} frentes prioritarios`, ()=>{ selEl.value=String(i); setSel(String(i)); }, T.prio[d])); });
  return items.length; }
function renderInicio(){
  const ul=$('ini-list'), box=$('ini-orden-box'), sv=$('ini-orden'), mas=$('ini-mas'), qEl=$('q'); if(!ul) return;
  ul.innerHTML=''; locChips('');
  const qRaw = qEl.value.trim(), q = qRaw.length>=2? norm(qRaw) : '';
  const ph = isGC()? `Buscar una avenida ${sel===null? 'de la ciudad' : 'de la alcaldía'}` : `Buscar una calle ${selCol!==null? 'de la colonia' : sel===null? 'de la ciudad' : 'de la alcaldía'}`;
  if (qEl.placeholder!==ph){ qEl.placeholder = ph; qEl.setAttribute('aria-label', ph); }
  const vistas = iniVistas();
  let v = vistas.includes(iniOrden)? iniOrden : iniOrden==='callescv' && selCol!==null? 'cv' : vistas[0];
  if (INI_CV.has(v) && !ESP_CV) v = vistas[0];   // sin las cepas cargadas no hay números que mostrar
  const ops = vistas.join() + (selCol!==null? '|col' : '');
  if (sv.dataset.ops!==ops){ sv.innerHTML = vistas.filter(k=>INI_VISTA[k]).map(k=>`<option value="${k}">${iniOp(k)}</option>`).join(''); sv.dataset.ops = ops; }
  // mientras bajan las cepas, el selector muestra lo pedido y la lista sigue con el orden anterior (con sus cifras reales)
  const ve = iniPend && vistas.includes(iniPend)? iniPend : v;
  if (INI_VISTA[ve]) sv.value = ve;
  box.hidden = !!q || vistas.length<2;   // al filtrar por nombre, la lista es la de lo que coincide
  const total = q? (isGC()? filasAvenidas(ul, q) : filasCalles(ul, q, qRaw))
    : v==='avalc'? filasAvAlc(ul) : v==='av'? filasAvenidas(ul, '') : v==='avcv'? filasAvenidas(ul, '', true)
    : v==='alc'? filasAlcaldias(ul) : v==='calles'? filasCalles(ul, '', '')
    : v==='callescv' || (v==='cv' && selCol!==null)? filasCalles(ul, '', '', true) : filasColonias(ul, v);
  mas.hidden = total<=iniN; if(!mas.hidden) mas.textContent = `Ver ${Math.min(10,total-iniN)} más`;
}
$('q').addEventListener('input', ()=>{ iniN = 10; renderInicio(); });
$('ini-orden').onchange = e=>{ const k = INI_VISTA[e.target.value]? e.target.value : 'kmp'; iniN = 10;
  if (INI_CV.has(k) && !ESP_CV){ iniCepas(k); return; }
  // las cepas pudieron llegar después de armar los índices (por ejemplo, desde la ficha de un tramo): se vuelven a contar
  iniPend = null; iniCarga(); iniOrden = k; if (INI_CV.has(k)){ buildStreets(); buildAvenues(); } renderInicio(); };
// aviso bajo el selector mientras bajan las cepas vacantes (estado: 'carga', un error o nada)
function iniCarga(estado){ const n = $('ini-carga'); if (!n) return; n.classList.toggle('warn', !!(estado && estado!=='carga')); n.hidden = !estado;
  if (!estado) n.textContent = '';
  else if (estado==='carga') n.textContent = 'Cargando las cepas vacantes del inventario de arbolado…';
  else if (estado.sesion) avisoSesion(n);
  else n.textContent = 'No fue posible cargar las cepas vacantes del inventario (revisa la conexión a internet). Elige otra vez el orden para volver a intentarlo.'; }
// la primera vez que se pide un orden por cepas: se baja espacios_frentes.bin (el mismo del filtro «Espacio») y, al llegar, se ordena
function iniCepas(k){ iniPend = k; iniCarga('carga');
  espCargar().then(()=>{ if (iniPend!==k) return; iniPend = null; iniCarga(); iniOrden = k; buildStreets(); buildAvenues(); renderInicio(); },
    e=>{ console.warn('orden por cepas vacantes', e); if (iniPend!==k) return; iniPend = null; iniCarga(e); renderInicio(); }); }
$('ini-mas').onclick = ()=>{ const n = iniN; iniN += 10; renderInicio(); const li = $('ini-list').children[n]; if (li) li.focus(); };
// Renglones de la lista y de los tramos: se activan también con la barra espaciadora y, como la lista se vuelve a armar al elegir,
// el foco pasa al título de la respuesta (cambio de ámbito) o regresa al renglón elegido (calle consultada).
for (const id of ['ini-list','tramos']) $(id).addEventListener('keydown', e=>{ const li = e.target; if (!li.matches || !li.matches('li[tabindex]')) return;
  if (e.key===' '){ e.preventDefault(); li.click(); } if (e.key!==' ' && e.key!=='Enter') return;
  setTimeout(()=>{ const a = document.activeElement; if (a && a!==document.body && a.isConnected) return;
    ($('ini-list').querySelector('li.active') || $('scope-title')).focus(); }, 60); });

// Tramos de una calle de la red de las alcaldías: agrupa los frentes de manzana de la calle consultada en tramos
// (de esquina a esquina, con sus dos lados) y nombra las vialidades que los delimitan. Se calcula al consultar la calle,
// a partir de la geometría de los frentes; no cambia los datos ni el catálogo.
// Regla: dos frentes de la misma calle forman un tramo cuando son casi paralelos (≤ 30°), están en lados opuestos
// a no más de TR_ANCHO metros y se traslapan a lo largo de la calle. Es una aproximación geométrica: se verifica en campo.
const TR_ANCHO = 45, TR_COS = Math.cos(30*Math.PI/180), TR_ESQ = 28, TR_JUNTA = 60;
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
  for(let p=0;p<n;p++) for(let q=p+1;q<n;q++) if (trEnfrente(fr[p], fr[q])) par[find(p)] = find(q);
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
    // a lo largo de la calle y de lado: sobre el eje general (pos, a0–a1) y su perpendicular (off)
    let a0=Infinity, a1=-Infinity, off=0; for(const f of g){ for(const p of [f.a,f.b]){ const t=(p[0]-e0[0])*ex+(p[1]-e0[1])*ey; if(t<a0) a0=t; if(t>a1) a1=t; } off += ((f.m[0]-e0[0])*-ey + (f.m[1]-e0[1])*ex)/g.length; }
    out.push({idx:g.map(f=>f.i), m, largo:Math.round(tmax-tmin), lados, km, entre:[ca,cb], bounds:[w,s,e,nn], pos, a0, a1, off}); }
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
  //    el tramo vecino que también llega a X
  for(let k=0;k<out.length;k++){ const t=out[k], x=t.entre[0]; if (x===null || x!==t.entre[1] || t.largo>=TR_JUNTA) continue;
    const v = [out[k-1], out[k+1]].filter(u=>u && u.entre.includes(x)).sort((u,w)=>Math.abs(u.pos-t.pos)-Math.abs(w.pos-t.pos))[0];
    if (v){ if (t.lados===2 || (v.ladoS && t.ladoS && v.ladoS!==t.ladoS)){ v.lados=2; v.ladoS=0; } junta(v, t); out.splice(k,1); k--; } }
  // 2. los dos lados de una misma cuadra que no se emparejaron (frentes desfasados): tramos seguidos, de un lado cada uno, en lados
  //    opuestos, con el mismo «entre» y a menos de TR_JUNTA m, se juntan en uno de dos lados
  for(let k=0;k+1<out.length;k++){ const a=out[k], b=out[k+1];
    if (a.lados===1 && b.lados===1 && a.ladoS && b.ladoS && a.ladoS!==b.ladoS && a.entre[0]===b.entre[0] && a.entre[1]===b.entre[1] && Math.abs(a.pos-b.pos)<TR_JUNTA){
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
      return `<li tabindex="0" role="button" data-t="${t.n-1}"><b>${t.n}</b><div><div class="n">${tramoTxt(t)}</div><div class="desg">${partes.join('')}</div><div class="t">${fmt.format(t.largo)} m de calle · ${t.lados===2? 'dos lados' : 'un lado'} · ${t.idx.length} frente${t.idx.length===1?'':'s'}${partes.length>1? ' · predominante '+META.prio[pd] : ''}</div></div></li>`; }).join('')}</ol>
    <div class="note">${masDet('Un tramo va de esquina a esquina y reúne los frentes de sus dos lados. Se arma con una regla geométrica a partir de los frentes de manzana; las vialidades que lo delimitan son las más cercanas a sus extremos y deben confirmarse en campo. Selecciona un tramo para ubicarlo en el mapa y abrir la ficha de su frente de mayor prioridad.')}</div>`;
  box.querySelectorAll('li').forEach(li=>{ const go=()=>{ const t=l[+li.dataset.t]; const pad=0.0008; const vs=fitTo([t.bounds[0]-pad,t.bounds[1]-pad,t.bounds[2]+pad,t.bounds[3]+pad], 60); vs.zoom=Math.min(vs.zoom, 17.5);
      box.querySelectorAll('li').forEach(x=>x.classList.remove('active')); li.classList.add('active'); verMapa({desdeLista:true}); flyTo(vs, 800);
      // ficha del frente de mayor prioridad del tramo (el más largo si hay varios): así la ficha de un frente se alcanza sin el puntero
      const rep = t.idx.reduce((a,b)=> (F.prio[b]>F.prio[a] || (F.prio[b]===F.prio[a] && F.len[b]>F.len[a]))? b : a, t.idx[0]); showCard('fr', rep); };
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
  box.classList.toggle('secundaria', selCol!==null || selAv!==null);   // en el celular, con colonia o avenida solo se ve el recuadro de lo consultado
  box.hidden=false; box.innerHTML = isGC()
    ? `${dot(pc)}<b>Vialidades primarias · prioridad predominante: ${META.prio[d]}</b>${masDet(`${pct(s.km[d],tot)} de los km de vialidad primaria de la alcaldía<br>${partTxt(sel,true)} · ${fmt0.format(tot)} km de vialidad primaria en toda la alcaldía`)}`
    : `${dot(pc)}<b>Prioridad predominante: ${META.prio[d]}</b>${masDet(`${pct(s.km[d],tot)} de los km de frente de la alcaldía<br>${partTxt(sel,false)} · ${fmt0.format(tot)} km de frentes en toda la alcaldía`)}`
      // lo del Gobierno Central mezcla km de vialidad y km de frente: va plegado también en la computadora
      + (resp==='alc'? masDet(`<span class="gcline">Gobierno Central atiende en esta alcaldía ${fmt0.format(sum(vs.km))} km de vialidades primarias medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); en frentes de manzana son ${fmt0.format(sum(gcs.km))} km.</span>`, 'Lo que atiende el Gobierno Central aquí', true) : '');
}
function renderColInfo(){
  const box = $('colinfo'); if (selCol===null){ box.hidden=true; return; }
  const c = META.colonias[selCol]; const pc = c.p>=0? T.prio[c.p] : null;
  box.hidden=false; box.innerHTML = `${pc? dot(pc):''}<b>Prioridad de la colonia: ${c.p>=0? META.prio[c.p] : '—'}</b>${masDet(`Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' hab.':''}${c.ut? `<br><span class="utline">Unidad territorial ${c.ut}: ${fmt.format(c.utpob||0)} hab., ${fmt.format(c.nbi||0)} en pobreza (NBI)</span>`:''}`)}`;
}
function renderAvInfo(){
  const box=$('avinfo'); if (selAv===null){ box.hidden=true; return; }
  const s=avStat(selAv); const d=dom({km:s.kmByP}); const pc=T.prio[d];
  const vsA = vpSumm(); const kmA = sum(vsA.km), kmpA = kmPrio(vsA);
  box.hidden=false; box.innerHTML = `${dot(pc)}<b>Prioridad predominante de la avenida: ${META.prio[d]}</b>${masDet(`${pct(s.kmByP[d], s.km)} de los km de la avenida en toda la ciudad<br>${redesTxt(s.nombres, 9)? 'Red vial: '+redesTxt(s.nombres, 9)+' · ' : ''}${fmt1.format(s.km)} km de la avenida en toda la ciudad · Cruza: ${[...s.muns].map(m=>META.munNames[m]).join(', ')}`)}${sel!==null? `<br><span class="gcline">Las cifras de abajo son solo del tramo en la alcaldía ${META.munNames[sel]}${filtroEsp? ', '+espTxtVP() : ''}: ${kmFull(kmA)} de esta avenida, ${kmFull(kmpA)} prioritarios${kmpA===0? (filtroEsp? ' (ningún tramo con '+espLista()+' de esta avenida en la alcaldía resultó Muy Alta, Alta o Media)' : ' (ningún tramo de esta avenida en la alcaldía resultó Muy Alta, Alta o Media)'):''}.</span>`:''}${avGruposTxt(selAv)? `<br><span class="gcline">${avGruposTxt(selAv)}; elige una alcaldía para consultar una sola.</span>`:''}`;
}
let keepView = false;
// Anuncio para lectores de pantalla: al cambiar la consulta se dice el ámbito y su cifra principal.
let anuncioT = null;
function anunciaAmbito(){ clearTimeout(anuncioT); anuncioT = setTimeout(()=>{ const m=$('mapsum'), s=$('sr-estado'); if (!m || !s) return;
  const t = m.innerText.replace(/\s+/g,' ').trim(); if (t && s.textContent!==t) s.textContent = t; }, 250); }
function refresh(){ if (!locSel && !restaurando) locManual();   // un cambio de ámbito hecho a mano manda sobre Mi ubicación
  buildColors(); buildVP(); buildStreets(); buildAvenues(); renderSummary(); iniN = 10; renderInicio(); renderAlcInfo(); renderColInfo(); renderAvInfo(); renderLegendNote(); invNota(); espAviso(); rerender(); if (!keepView) flyTo(scopeView());
  anunciaAmbito(); rotuloInfo();
  const gc = isGC();
  $('dl-frentes').hidden = !respOn.alc; $('dl-calles').hidden = !respOn.alc; $('dl-tramos').hidden = !respOn.gc; $('dl-avenidas').hidden = !respOn.gc;
  // sin registros que entregar: el botón se deshabilita y se dice por qué, en lugar de entregar un archivo vacío
  const fsD = (respOn.alc && sel!==null)? frSumm() : null; const nFrD = fsD? sum(fsD.n) : 1, nPrD = fsD? sumPrio(fsD.n) : 1;
  const nTrD = respOn.gc? vpSumm().recsp.size : 1;
  $('dl-frentes').disabled = $('dl-calles').disabled = (sel===null || nPrD===0);
  $('dl-ficha').disabled = nFrD===0; $('dl-tramos').disabled = nTrD===0;
  $('dl-kml').disabled = $('dl-geojson').disabled = !((respOn.alc && sel!==null && nPrD>0) || (respOn.gc && selCol===null && nTrD>0));
  $('dl-status').textContent = (respOn.alc && sel===null)? 'Selecciona una alcaldía para descargar su listado.'
    : nFrD===0? 'Este ámbito no tiene frentes de manzana a cargo de la alcaldía: no hay listado ni ficha que descargar.'
    : nPrD===0? 'Este ámbito no tiene frentes de prioridad Muy Alta, Alta o Media: el listado de frentes prioritarios estaría vacío.'
    : nTrD===0? `Este ámbito no tiene tramos de vialidad primaria de prioridad Muy Alta, Alta o Media${filtroEsp? ' con '+espLista()+' (filtro «Espacio»)' : ''}: el listado de tramos prioritarios estaría vacío.` : '';
  $('dl-ficha').hidden = !(respOn.alc && selCol!==null); $('dl-ficha-alc').hidden = !(respOn.alc && sel!==null && selCol===null);
  $('dl-ficha-vpalc').hidden = !(respOn.gc && sel!==null && selAv===null); $('dl-ficha-av').hidden = !(gc && selAv!==null);  renderCrumb(); renderScopeTitle(); renderActions(); syncCalleBtns(); guardaURL(); usoConsulta(); }
// Registro de usos (solo con sesión): una consulta es el ámbito en que la persona se detiene (1.5 s), no cada clic intermedio.
// No se anotan toda la ciudad (vista inicial) ni los cambios que hace «Seguirme» al caminar.
let usoUlt = '', usoT = null;
function usoConsulta(){ if (!USO_URL || restaurando || locSel) return; clearTimeout(usoT);
  usoT = setTimeout(()=>{ if (sel===null && selAv===null) return; const a = ambitoUso(), k = JSON.stringify(a); if (k===usoUlt) return; usoUlt = k; avisaUso({ evento:'consulta', ...a }); }, 1500); }
// ---------- la consulta queda en la dirección ----------
// r = quién atiende (gc | both), a = clave de la alcaldía, c = colonia, v = avenida, b = banqueta (con | sin), e = espacio (cv, to, am separados
// por coma: cepa vacante, tocón, árbol muerto; un código desconocido se ignora; desde la v1.24 también con r=gc). Atrás y Adelante recorren las consultas,
// la consulta sobrevive a una recarga y la dirección se puede compartir.
function urlEstado(){ const p = new URLSearchParams(location.search); ['r','a','c','v','b','e'].forEach(k=>p.delete(k));
  if (resp!=='alc') p.set('r', resp);
  if (filtroBanq!=='todas' && resp!=='gc') p.set('b', filtroBanq);
  if (filtroEsp) p.set('e', espCodigo());
  if (selCol!==null) p.set('c', selCol); else { if (sel!==null) p.set('a', META.muns[sel]); if (selAv!==null) p.set('v', selAv); }
  const q = p.toString().replace(/%2C/g, ','); return location.pathname + (q? '?'+q : '') + location.hash; }
// La última alcaldía y la red consultadas se recuerdan en este navegador: la siguiente visita abre ahí. No son datos personales.
const CLAVE_INICIO = 'cp_inicio';
const leeInicio = ()=>{ try { return localStorage.getItem(CLAVE_INICIO); } catch(e){ return null; } };
const CLAVE_RED = 'cp_red';   // red consultada: alc | gc | both
const leeRed = ()=>{ try { const r = localStorage.getItem(CLAVE_RED); return r==='gc' || r==='both'? r : 'alc'; } catch(e){ return 'alc'; } };
const recuerdaInicio = ()=>{ try { localStorage.setItem(CLAVE_INICIO, sel===null? 'ciudad' : META.muns[sel]); localStorage.setItem(CLAVE_RED, resp); } catch(e){} };
function guardaURL(){ if (restaurando) return; recuerdaInicio(); const u = urlEstado(); if (u === location.pathname + location.search + location.hash) return;
  try { history.pushState({consulta:true}, '', u); } catch(e){} }
function aplicarURL(){ const p = new URLSearchParams(location.search); const r = p.get('r')==='gc'? 'gc' : p.get('r')==='both'? 'both' : 'alc';
  const a = munIndex[p.get('a')], c = +p.get('c'), v = +p.get('v'); const m = a===undefined? null : a; const antes = restaurando; restaurando = true;
  try {
    if (resp!==r) setResp(r);
    if (p.has('c') && r!=='gc' && Number.isInteger(c) && c>0 && META.colonias[c] && META.colonias[c].n){ if (selCol!==c) pickColonia(c); }
    else if (p.has('v') && r==='gc' && Number.isInteger(v) && v>0 && VPC.nomenclat[v]){ if (sel!==m){ sel=m; selEl.value = m===null? '' : String(m); } if (selAv!==v) pickAvenida(v); else refresh(); }
    else if (sel!==m || selCol!==null || selAv!==null){ selEl.value = m===null? '' : String(m); setSel(selEl.value); }
    const b = p.get('b')==='con' || p.get('b')==='sin'? p.get('b') : 'todas'; if (b!==filtroBanq) setBanq(b);
    const e = espDeTexto(p.get('e')); if (e!==espQuiero) setEspacio(e);
  } finally { restaurando = antes; } }
addEventListener('popstate', ()=>{ if (history.state && history.state.ayuda) return; aplicarURL(); });
function syncCalleBtns(){ renderTramos(); renderCrumb(); const c = calleSel(); $('dl-calle').hidden = !c; $('dl-ficha-calle').hidden = !c;
  const h = callesHomonimas(); if (h && !isGC()) $('dl-status').textContent = `Hay calles con este nombre en ${fmt.format(h)} colonias. Elige una en la lista de «Dónde empezar» para descargar su Excel o su ficha.`; }
function setSel(v){
  sel = v===''? null : +v; selCol=null; selAv=null; highlight=null; hideCard(); $('q').value='';
  alaRespuesta(); refresh();
}
// ---------- selección de colonia y avenida (la búsqueda está en el buscador único, más abajo) ----------
// el catálogo de colonias trae abreviaturas (Pgal, Sto, Ampl…); el buscador las expande
const ABREV = {pgal:'pedregal', sto:'santo', sta:'santa', ampl:'ampliacion', ampliacion:'ampliacion', secc:'seccion', ote:'oriente', pte:'poniente', nte:'norte', gral:'general', prol:'prolongacion', fracc:'fraccionamiento', cjto:'conjunto', uh:'unidad habitacional', bo:'barrio', pblo:'pueblo'};
function pickColonia(id){
  if (isGC()) setResp('alc', true);
  const c = META.colonias[id]; const m = munIndex[c.m];
  if (sel!==m){ sel=m; selEl.value=String(m); }
  selCol=id; selAv=null; highlight=null; hideCard(); $('q').value=''; if (isPhone() && !showFrB) setLayer('fr', true); alaRespuesta(); refresh(); showCard('col', id);
}
function clearColonia(){ if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } }
function pickAvenida(a){
  if (!isGC()) setResp('gc', true);
  // si la avenida no cruza la alcaldía elegida (tarjeta, buscador o dirección), se consulta en toda la ciudad
  if (sel!==null && !avStat(a).muns.has(sel)){ sel=null; selEl.value=''; }
  selAv=a; selCol=null; hideCard(); $('q').value='';
  const s=avStat(a); highlight={avId:a, idx:s.idx}; if (!restaurando) verMapa({desdeLista:PANTALLA==='info'}); refresh();
}
function clearAvenida(){ if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } }
selEl.onchange = e=> setSel(e.target.value);
$('n-total').textContent = `${fmt.format(N)} frentes de manzana y ${fmt.format(VPC.cov.registros)} tramos de vialidad primaria (${fmt0.format(VPC.cov.km_total)} km).`;
$('ver-line').textContent = VERSION_TXT + '.';

// Descargas: CSV y Excel (SheetJS bajo demanda) con diccionario de datos.
// ---------- descargas ----------
// CSV de respaldo: se neutralizan las celdas que una hoja de cálculo interpretaría como fórmula
function csvEsc(v){ v=String(v??''); if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = "'" + v; return /[",\r\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
// fecha AAAAMMDD en el nombre de cada archivo entregado
const conFecha = name => { const d=new Date(), f=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return name.replace(/(\.[a-z0-9]+)$/i, `_${f}$1`); };
// ámbito de la consulta para el registro de usos (solo se envía con sesión; ver avisaUso en 01_utilidades.js)
function ambitoUso(){ const c = calleSel(); return { red: resp, alcaldia: sel!==null? META.munNames[sel] : '', colonia: selCol!==null? colNombre(selCol) : '',
  avenida: selAv!==null? VPC.nomenclat[selAv] : '', calle: c? c.nombre : '', banqueta: filtroBanq, ...(filtroEsp? {espacio: espCodigo()} : {}) }; }
const TIPO_ARCHIVO = [[/^frentes_prioritarios_/, 'excel_frentes'], [/^resumen_calles_prioritarias_/, 'excel_calles'], [/^tramos_prioritarios_/, 'excel_tramos'],
  [/^resumen_avenidas_prioritarias_/, 'excel_avenidas'], [/^frentes_calle_/, 'excel_calle'], [/^ficha_alcaldia_/, 'ficha_alcaldia'], [/^ficha_colonia_/, 'ficha_colonia'],
  [/^ficha_vialidades_primarias_/, 'ficha_vialidades'], [/^ficha_avenida_/, 'ficha_avenida'], [/^ficha_calle_/, 'ficha_calle']];
function usoDescarga(nombre){ if (!USO_URL || /_diccionario\.csv$/.test(nombre)) return;   // el diccionario del CSV acompaña al archivo: no es otra descarga
  const ext = (nombre.match(/\.([a-z0-9]+)$/i) || [])[1];
  const tipo = ext==='kml'? 'kml' : ext==='geojson'? 'geojson' : ext==='csv'? 'csv' : (TIPO_ARCHIVO.find(([r])=>r.test(nombre)) || [0, 'otro'])[1];
  avisaUso({ evento:'descarga', tipo, archivo:nombre, ...ambitoUso() }); }
async function deliver(filename, text){ filename = conFecha(filename); usoDescarga(filename);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const blob = new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  st.textContent = `Descargado: ${filename}`;
}
async function deliverBlob(filename, blob){ if (!/_\d{8}\.[a-z0-9]+$/i.test(filename)) filename = conFecha(filename); usoDescarga(filename);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
// los filtros de banqueta y de espacio van en el nombre: dos archivos de la misma consulta con distinto filtro no se confunden
const espSlug = ()=> filtroEsp? '_con_' + ESP_TIPOS.filter((_, t)=> filtroEsp & (1<<t)).map(e=>e.s).join('_') : '';
const filtroSlug = ()=> (filtroBanq==='con'? '_con_banqueta' : filtroBanq==='sin'? '_sin_banqueta' : '') + espSlug();
// las descargas de vialidades primarias no se filtran por colonia ni por banqueta: su nombre y su ámbito tampoco lo declaran; sí el espacio
const scopeSlugVP = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '') + espSlug();
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(colNombre(selCol)) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '') + filtroSlug();
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = clases Muy Alta, Alta y Media de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas de las alcaldías.',
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), del punto a media longitud del frente o del tramo, medido sobre su línea (no el promedio de sus extremos).',
  'Cobertura: la herramienta incluye los frentes de manzana del ámbito urbano de INEGI. Algunos frentes no tienen colonia asignada en el catálogo: se cuentan en las cifras de su alcaldía y en su Excel de frentes, pero no en las consultas por colonia.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  `La meta de vialidades primarias se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red completa, incluidos los tramos sin manzanas al frente.`,
  'Dos unidades: las vialidades primarias del Gobierno Central se reportan en kilómetros de vialidad, medidos sobre el eje de la avenida; la red de las alcaldías, en kilómetros de frente de manzana, una medida por cada acera. Para comparar o sumar lo que atiende cada quien se usa siempre el kilómetro de frente.',
  'Los kilómetros prioritarios describen dónde es mayor la necesidad de arbolado según el modelo; no son una meta ni una obligación de plantación.',
  'De lo prioritario se reportan los kilómetros de frente sin arbolado y los que además tienen banqueta. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación.',
  'El Índice de Desarrollo Social y la población en pobreza corresponden a la unidad territorial de EVALÚA CDMX en la que se ubica la colonia, no a la colonia; no deben sumarse entre colonias.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.';
const DIC = {
  frentes: { titulo:'Frentes de manzana prioritarios', contenido:'Un renglón por frente de manzana con prioridad Muy Alta, Alta o Media a cargo de la alcaldía.',
    cols:[10,11,30,16,13,28,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['id_frente','Identificador del frente de manzana en esta versión de los datos (ver «Corte de los datos»). Permite cruzar el renglón con la capa geográfica y detectar duplicados; no cambia mientras no cambie el corte.','Entero'],
      ['prioridad','Clase de prioridad del frente de manzana.','Muy Alta, Alta o Media'],
      ['vialidad','Nombre de la calle a la que da el frente. Cuando INEGI no registra un nombre de calle («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua»), dice «Frente sin nombre de calle (INEGI)».','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['quien_atiende','Quién atiende el frente: la alcaldía o el Gobierno Central.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente, con acentos y sin abreviaturas.','Texto'],
      ['colonia_catalogo','Nombre de la colonia tal como viene en el catálogo de origen (sin acentos, con abreviaturas). Sirve para cruzar con otras capas.','Texto'],
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
    cols:[10,11,30,16,13,28,28,7,16,18,26,14,18,20,11,20,8,44,11,11], campos:null },
  calles: { titulo:'Resumen por calle', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana. Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel de frentes.',
    cols:[30,30,30,8,22,20,13,15,12,13,11,15,11,24,11],
    campos:[
      ['vialidad','Nombre de la calle.','Texto'],
      ['colonia','Colonia en la que está este tramo de la calle, con acentos y sin abreviaturas.','Texto'],
      ['colonia_catalogo','Nombre de la colonia tal como viene en el catálogo de origen. Sirve para cruzar con otras capas.','Texto'],
      ['cp','Código postal de la colonia.','Texto de 5 dígitos'],
      ['tipos_vialidad','Tipos de vialidad que aparecen en sus tramos.','Texto separado por punto y coma'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['frentes_total','Número de frentes de manzana con ese nombre en el ámbito.','Entero'],
      ['frentes_muy_alta','Frentes con prioridad Muy Alta.','Entero'],
      ['frentes_alta','Frentes con prioridad Alta.','Entero'],
      ['frentes_media','Frentes con prioridad Media.','Entero'],
      ['km_muy_alta','Kilómetros de frente con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros de frente con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros de frente con prioridad Media.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta, Alta y Media.','Kilómetros'],
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las clases.','Kilómetros'] ] },
  tramos: { titulo:'Tramos prioritarios de vialidades primarias', contenido:'Un renglón por parte de tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta, Alta o Media, a cargo del Gobierno de la Ciudad. Un tramo (id_tramo) ocupa más de un renglón cuando cruza un límite de alcaldía o su trazo tiene varias partes; la herramienta cuenta los tramos por id_tramo, por eso el número de renglones puede ser mayor que el número de tramos que muestra la pantalla. Los kilómetros coinciden.',
    cols:[10,11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['id_tramo','Identificador del tramo en la capa de vialidades primarias. Se repite cuando el tramo ocupa varios renglones.','Entero'],
      ['prioridad','Clase de prioridad del tramo en la capa de vialidades primarias.','Muy Alta, Alta o Media'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave registrada en la capa de vialidades primarias. No identifica al tramo: varios tramos comparten la misma clave.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud de la parte del tramo de este renglón.','Metros'],
      ['quien_atiende','Quién atiende el tramo: la alcaldía o el Gobierno Central.','Gobierno Central'],
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
      ['tramos_prioritarios','Tramos con prioridad Muy Alta, Alta o Media.','Entero'],
      ['km_muy_alta','Kilómetros con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros con prioridad Media.','Kilómetros'],
      ['km_baja','Kilómetros con prioridad Baja.','Kilómetros'],
      ['km_muy_baja','Kilómetros con prioridad Muy Baja.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta, Alta y Media.','Kilómetros'],
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
  if (selAv!==null && (vp || isGC())) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad') + (filtroEsp? ' · ' + espTxtVP() : '');
  const b = vp? (filtroEsp? ' · ' + espTxtVP() : '') : hayFiltro()? ' · ' + filtroTxt() : '';
  if (selCol!==null && !vp) return colNombre(selCol) + ' · ' + META.munNames[sel] + b;
  return (sel===null? 'Ciudad de México' : META.munNames[sel]) + b;
}
// mas: {campos, cols} de las columnas que se agregan al final (las de espacios para plantar, si llegaron)
function dictAoa(key, nreg, archivo, extra, mas){
  const d = DIC[key];
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const a = [['Modelo de priorización de reforestación urbana — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', (key==='calle' && calleSel())? calleAmbito(calleSel()) : ambitoTxt(key)], ...(filtroEsp? [['Filtro «Espacio»', key==='tramos' || key==='avenidas'? espNotaVP() : espNota()]] : []),
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ...(extra||[]), ['Fecha de generación', hoy], ['Versión de la herramienta', VERSION.v], ['Última actualización de la herramienta', VERSION.fecha], ['Corte de los datos', VERSION.corte], [],
    ['Campo', 'Descripción', 'Valores o unidad']];
  for (const f of d.campos.concat(mas? mas.campos : [])) a.push(f);
  a.push([], ['Notas']);
  for (const n of NOTAS_COMUNES) a.push([n]);
  a.push([], [FUENTES]);
  return a;
}
// ---------- exportación a Excel (datos + diccionario) ----------
// librerías bajo demanda: de docs/libs en el sitio (window.SIA_LIBS) o, en la versión de un solo archivo, de la copia
// incrustada en la propia página (<script id="lib-ARCHIVO-b64">). Ninguna versión pide librerías a terceros.
function libIncrustada(file){ const el = document.getElementById('lib-' + file + '-b64'); if (!el) return null;
  const bin = atob(el.textContent.trim()), u8 = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u8], {type:'text/javascript'})); }
const LIB_EN_CURSO = {};   // una sola descarga por librería aunque se pida varias veces
// huella de versión de cada librería (la escribe construir.py en config.js): tras una actualización nunca se usa una copia anterior
const libV = file => (window.SIA_LIBS_V && window.SIA_LIBS_V[file]) ? '?v=' + window.SIA_LIBS_V[file] : '';
function loadLib(file, glob){
  if (window[glob]) return Promise.resolve(window[glob]);
  if (LIB_EN_CURSO[file]) return LIB_EN_CURSO[file];
  return LIB_EN_CURSO[file] = new Promise((res, rej)=>{
    const s = document.createElement('script');
    const src = window.SIA_LIBS ? window.SIA_LIBS + file + libV(file) : libIncrustada(file);
    if (!src) return rej(new Error('la librería ' + file + ' no viene en esta copia'));
    s.src = src;
    // si no llega, se averigua por qué: una sesión vencida no es una falla de conexión
    const fallo = ()=>{ delete LIB_EN_CURSO[file]; s.remove(); causaFalla(src).then(c => rej(Object.assign(new Error('no se pudo cargar la librería ' + file), {causa:c}))); };
    s.onload = ()=> window[glob] ? res(window[glob]) : fallo();
    s.onerror = fallo;
    document.head.appendChild(s);
  });
}
let XL = null;
function loadXL(){
  if (XL) return Promise.resolve(XL);
  return loadLib('xlsx.js', 'XLSX').then(x => (XL = x));
}
const wch = ws => ws.map(w=>({wch:w}));
// Excel en un proceso auxiliar: la página sigue respondiendo mientras se arma el archivo
// Propiedades del libro: título, autoría e idioma
const propsExcel = base => ({ Title: base.replace(/_/g,' '), Subject:'Priorización de calles para reforestación urbana', Author:'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental', Company:'Secretaría del Medio Ambiente de la Ciudad de México', Language:'es-MX', Comments:'Modelo de priorización de reforestación urbana, versión ' + VERSION.v, CreatedDate: new Date() });
function excelAparte(aoa, cols, dic, props){ return new Promise((res, rej)=>{ let w; try { w = new Worker(window.SIA_LIBS + 'excel_worker.js' + libV('excel_worker.js') + (libV('xlsx.js')? '&x=' + window.SIA_LIBS_V['xlsx.js'] : '')); } catch(e){ return rej(e); }
  w.onmessage = e=>{ w.terminate(); e.data && e.data.ok? res(e.data.buf) : rej(new Error(e.data && e.data.msg || 'proceso auxiliar')); };
  w.onerror = e=>{ w.terminate(); rej(new Error('proceso auxiliar')); }; w.postMessage({aoa, cols, dic, props}); }); }
const GRANDE = 20000;   // renglones a partir de los cuales se avisa del tamaño y de la espera
const avisaPreparando = nreg => { $('dl-status').textContent = nreg>GRANDE? `Preparando un archivo grande: ${fmt.format(nreg)} renglones, alrededor de ${fmt0.format(Math.max(1, nreg*0.19/1000))} MB. Puede tardar hasta un minuto…` : 'Preparando archivo…'; };
async function deliverTable(base, key, aoa, extra, mas){
  const nreg = aoa.length - 1, cols = DIC[key].cols.concat(mas? mas.cols : []);
  const st = $('dl-status'); avisaPreparando(nreg);
  if (window.SIA_LIBS && window.Worker){
    try { const buf = await excelAparte(aoa, cols, dictAoa(key, nreg, base + '.xlsx', extra, mas), propsExcel(base));
      await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); return; }
    catch(e){ console.warn('Excel en proceso auxiliar no disponible; se genera en la página', e); }
  }
  let X; try { X = await loadXL(); }
  catch(e){ if (e && e.causa==='sesion'){ avisoSesion(st); return; }   // sesión vencida: no se entrega nada y se dice por qué
    // no se pudo cargar la librería de Excel: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = (e && e.causa==='red')? 'Sin conexión para generar el Excel; se descarga en CSV.' : 'No se pudo cargar el programa que arma el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '.csv', csv);
    const dic = dictAoa(key, nreg, base + '.csv', [...(extra||[]), ['Nota sobre el formato CSV', 'El código postal es un texto de 5 dígitos: al abrir el archivo en una hoja de cálculo, importar esa columna como texto para no perder los ceros iniciales.']], mas).map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '_diccionario.csv', dic);
    st.textContent = 'Descargado en CSV (dos archivos: listado y diccionario), porque no se pudo cargar el generador de Excel.';
    return;
  }
  const wb = X.utils.book_new(); wb.Props = propsExcel(base);
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx', extra, mas));
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
    ['Equivalente prioritario (Muy Alta, Alta y Media) en km de frente de manzana', num(kmPrio(g).toFixed(2))]]; }
// cifras de lo prioritario del ámbito consultado, para el diccionario de los Excel de la red de las alcaldías
function prioExtra(){ const R = repStat(sel, selCol); const k = v => num(v.toFixed(2));
  return [['Prioritario del ámbito (Muy Alta, Alta y Media), km de frente a cargo de la alcaldía', k(sumPrio(R.km[0]))],
    ['De lo prioritario, km de frente sin arbolado', k(sumPrio(R.sa[0]))],
    ['De lo prioritario, km de frente sin arbolado y con banqueta (INEGI)', k(sumPrio(R.sb[0]))],
    ['Prioritario del ámbito, km de frente a cargo del Gobierno Central', k(sumPrio(R.km[1]))]]; }
// ---------- espacios para plantar en las descargas (v1.25) ----------
// Tres columnas al final de cada Excel (y tres propiedades en el GeoJSON y el KML): cepas vacantes, tocones y árboles muertos del
// inventario de arbolado. Por frente de manzana, los puntos asignados a ese frente (ESP_FRN); por parte de vialidad primaria, los de sus
// frentes del Gobierno Central y los del camellón (ESP_VPN); en los resúmenes por calle y por avenida, la suma de sus frentes o partes del
// ámbito, de cualquier prioridad. Si el inventario no se ha bajado, se baja antes de armar el archivo (espCargar); si no llega, el archivo
// sale sin esas columnas, el diccionario lo dice y la pantalla lo avisa: la descarga nunca se cae por el inventario.
const ESP_COLS = ['cepas_vacantes', 'tocones', 'arboles_muertos'], ESP_ANCHOS = [15, 9, 16];
const ESP_FILA = 'Espacios para plantar (inventario de arbolado)';
async function espDescarga(){ if (!INV) return {ok:false, unico:true};
  try { await espCargar(); return {ok:true}; } catch(e){ console.warn('descarga sin espacios para plantar', e); return {ok:false}; } }
const espDeFrente = i => [ESP_FRN[3*i], ESP_FRN[3*i+1], ESP_FRN[3*i+2]];
const espDeParte = i => [ESP_VPN[3*i], ESP_VPN[3*i+1], ESP_VPN[3*i+2]];
const espSuma = (idx, de) => idx.reduce((a, i)=>{ const c = de(i); return [a[0]+c[0], a[1]+c[1], a[2]+c[2]]; }, [0,0,0]);
// campos del diccionario; que: 'frente', 'tramo', 'calle' o 'avenida'
function espCampos(que){ const d = INV.dist, dv = INV.vp.dist;
  const donde = que==='frente'? `en este frente de manzana (puntos a ${d} m o menos del frente)`
    : que==='tramo'? `que cuentan para esta parte del tramo: los de sus frentes de manzana a cargo del Gobierno Central (a ${d} m o menos) y los del camellón (puntos sin frente de manzana a ${dv} m o menos del eje)`
    : que==='calle'? 'en todos los frentes de manzana de la calle en el ámbito, de cualquier prioridad (como frentes_total y km_total): suma de sus frentes'
    : 'en todos los tramos de la avenida en el ámbito, de cualquier prioridad (como tramos_total y km_total): suma de sus partes, por sus frentes de manzana a cargo del Gobierno Central y en el camellón';
  return [['cepas_vacantes', `Cepas vacantes del inventario de arbolado ${donde}. Ahí se puede plantar directo.`, 'Entero; 0 = ninguna registrada hasta el corte'],
    ['tocones', `Tocones del inventario de arbolado ${donde}. Hay que retirar el tocón antes de plantar.`, 'Entero'],
    ['arboles_muertos', `Árboles muertos del inventario de arbolado ${donde}. Requieren sustitución.`, 'Entero']]; }
// renglón del diccionario: fuente, corte y regla de asignación, o por qué no vienen las columnas
const espFilaDic = esp => [ESP_FILA, esp.ok
  ? `Columnas cepas_vacantes, tocones y arboles_muertos. Fuente: Inventario de arbolado de la Ciudad de México, CIGA-UNAM y SEDEMA; en curso. Corte: ${INV.corte}. Regla de asignación: cada punto cuenta para el frente de manzana a ${INV.dist} m o menos; en vialidades primarias, también los del camellón (puntos sin frente de manzana) a ${INV.vp.dist} m o menos del eje. Un 0 puede ser un lugar que aún no se ha inventariado.`
  : esp.unico? 'Esta copia (archivo único) no trae el inventario: sin columnas de espacios' : 'No se pudo cargar el inventario: sin columnas de espacios'];
// aviso en pantalla cuando el archivo salió sin las columnas (solo si sí se entregó)
function espAvisoDescarga(esp){ const st = $('dl-status'); if (esp.ok || !/^Descargado/.test(st.textContent)) return;
  st.append(esp.unico? ' Va sin las columnas de espacios para plantar: esta copia no trae el inventario de arbolado.' : ' Va sin las columnas de espacios para plantar: no se pudo cargar el inventario de arbolado (revisa la conexión a internet).'); }
// entrega una tabla con las tres columnas al final: ids[k] es el frente, la parte o la calle del renglón k+1 y cuenta(ids[k]) sus tres
// conteos. El aviso de «Preparando…» sale antes de esperar al inventario (la persona ve de inmediato el tamaño del archivo).
async function deliverConEsp(base, key, rows, extra, ids, cuenta, que){
  avisaPreparando(rows.length - 1);
  const esp = await espDescarga();
  if (esp.ok){ rows[0].push(...ESP_COLS); ids.forEach((x, k)=> rows[k+1].push(...cuenta(x))); }
  await deliverTable(base, key, rows, [...(extra||[]), espFilaDic(esp)], esp.ok? {campos:espCampos(que), cols:ESP_ANCHOS} : null);
  espAvisoDescarga(esp); }
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','quien_atiende','colonia','colonia_catalogo','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(esPrio(F.prio[i]) && !F.gc[i] && enAmbito(i)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cat||c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.n? (c.pob||0) : '', c.n? (c.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const sn = idx.filter(sinNombreFr);
  deliverConEsp(`frentes_prioritarios_${scopeSlug()}`, 'frentes', rows, [['Quién atiende todos los renglones', 'Alcaldía (los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen)'], ['Frentes sin nombre de calle (INEGI) en este archivo', sn.length], ['Km de esos frentes sin nombre de calle', num((sn.reduce((t,i)=>t+F.len[i],0)/1000).toFixed(2))], ...prioExtra()],
    idx, espDeFrente, 'frente');
};
$('dl-calle').onclick = ()=>{
  const c = calleSel(); if (!c) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','quien_atiende','colonia','colonia_catalogo','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','tramo','tramo_entre','lat','lon']];
  const tr = tramoDeFrente(); const nt = i => tr.has(i)? tr.get(i).n : 0;
  const idx=[...c.idx].sort((a,b)=> nt(a)-nt(b) || F.prio[b]-F.prio[a]);
  for(const i of idx){ const k=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', k.n, k.cat||k.n, k.cp? k.cp.padStart(5,'0'):'', k.p>=0? META.prio[k.p]:'', k.ids||'', k.ut||'', k.n? (k.pob||0) : '', k.n? (k.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], nt(i)||'', tr.has(i)? tramoTxt(tr.get(i)) : '', num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const muns=[...new Set(c.idx.map(i=>F.mun[i]))];
  deliverConEsp(`frentes_calle_${slug(c.nombre)}_${muns.length===1? slug(META.munNames[muns[0]]) : 'ciudad'}${selCol!==null? '_'+slug(colNombre(selCol)) : ''}${filtroSlug()}`, 'calle', rows, [['Tramos de la calle', new Set([...tr.values()].map(t=>t.n)).size]],
    idx, espDeFrente, 'frente');
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const rows=[['vialidad','colonia','colonia_catalogo','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','frentes_media','km_muy_alta','km_alta','km_media','km_prioritario','km_total']];
  const items=[], deCalle = new Map(); for(const s of streetIdx.values()){ if(!s.kmp) continue; const n=[0,0,0,0,0]; for(const i of s.idx) n[F.prio[i]]++;
    const c = s.col? META.colonias[s.col] : null;
    const r = [META.names[s.nid], c? c.n : 'Colonia no identificada', c? (c.cat||c.n) : '', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[F.mun[s.idx[0]]], s.idx.length, n[4], n[3], n[2], num(s.kp[4].toFixed(2)), num(s.kp[3].toFixed(2)), num(s.kp[2].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))];
    items.push(r); deCalle.set(r, s); }
  items.sort((x,y)=> y[13]-x[13]); for(const r of items) rows.push(r);   // por km_prioritario (columna 13), como el resumen por avenida
  deliverConEsp(`resumen_calles_prioritarias_${scopeSlug()}`, 'calles', rows, [['Km de frente prioritario sin nombre de calle (INEGI), no incluidos en este resumen', num(sinNombre.kmp.toFixed(2))], ['Frentes prioritarios sin nombre de calle, no incluidos', sinNombre.np], ...prioExtra()],
    items.map(r=> deCalle.get(r)), s=> espSuma(s.idx, espDeFrente), 'calle');
};
$('dl-tramos').onclick = ()=>{
  const rows=[['id_tramo','prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','quien_atiende','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(esPrio(VP.prio[i]) && enAmbitoVP(i)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ rows.push([VP.rec[i], META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(vpMid(i)[0].toFixed(6)), num(vpMid(i)[1].toFixed(6))]); }
  const nTramos = new Set(idx.map(i=>VP.rec[i])).size;
  deliverConEsp(`tramos_prioritarios_vialidades_primarias_${scopeSlugVP()}`, 'tramos', rows, [['Tramos distintos (id_tramo)', nTramos], ...gcExtra()], idx, espDeParte, 'tramo');
};
$('dl-avenidas').onclick = ()=>{
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  const items=[], deAv = new Map(); for(const [a,s] of avIdx){ if (selAv!==null && a!==selAv) continue; const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    const r = [VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))];
    items.push(r); deAv.set(r, s); }
  items.sort((x,y)=> y[11]-x[11]); for(const r of items) rows.push(r);
  deliverConEsp(`resumen_avenidas_prioritarias_${scopeSlugVP()}`, 'avenidas', rows, gcExtra(), items.map(r=> deAv.get(r)), s=> espSuma(s.idx, espDeParte), 'avenida');
};

document.fonts && document.fonts.ready.then(()=> rerender());

// ---------- exportación geográfica: las calles prioritarias de la consulta como líneas ----------
// Mismos registros que «frentes prioritarios» y «tramos prioritarios» en Excel: frentes de alcaldía Muy Alta, Alta y Media del ámbito
// (requiere alcaldía o colonia) y, con Gobierno Central activo, tramos prioritarios de vialidad primaria.
// KML para Google Earth; GeoJSON (RFC 7946, WGS 84) para un sistema de información geográfica. Solo se descarga: nada se captura.
function geoSel(){ const fr=[], vp=[];
  if (respOn.alc && sel!==null) for(let i=0;i<N;i++) if(esPrio(F.prio[i]) && !F.gc[i] && enAmbito(i)) fr.push(i);
  // con una colonia elegida no van las vialidades primarias: no se filtran por colonia y llegarían las de toda la alcaldía
  if (respOn.gc && selCol===null) for(let i=0;i<NV;i++) if(esPrio(VP.prio[i]) && enAmbitoVP(i)) vp.push(i);
  return {fr, vp}; }
const geoCoord = (A, k) => [+A[2*k].toFixed(6), +A[2*k+1].toFixed(6)];
// conEsp: con las propiedades de espacios para plantar al final (cepas_vacantes, tocones, arboles_muertos), como las columnas del Excel
const espProps = c => ({ cepas_vacantes:c[0], tocones:c[1], arboles_muertos:c[2] });
const geoFr = (i, conEsp) => ({ id_frente:i, prioridad:META.prio[F.prio[i]], vialidad:nomFrente(i), tipo_vialidad:META.tipos[F.tipo[i]]||'', quien_atiende:'Alcaldía', colonia:(META.colonias[F.col[i]]||{}).n||'', alcaldia:META.munNames[F.mun[i]], longitud_m:F.len[i], ...(conEsp? espProps(espDeFrente(i)) : {}) });
const geoVp = (i, conEsp) => ({ id_tramo:VP.rec[i], prioridad:META.prio[VP.prio[i]], vialidad:VPC.nomenclat[VP.nom[i]], nombre_red_vial:VPC.nombres[VP.nombre[i]]||'', quien_atiende:'Gobierno Central', alcaldia:META.munNames[VP.mun[i]], longitud_m:VP.len[i], ...(conEsp? espProps(espDeParte(i)) : {}) });
// con las dos redes, cada filtro se declara para la red a la que aplica (la banqueta, solo a los frentes de las alcaldías)
const geoConFr = () => respOn.alc && sel!==null, geoConVp = () => respOn.gc && selCol===null;
// al final, la frase de los espacios para plantar (v1.25): fuente, corte y regla, o por qué no vienen las propiedades
const geoEspTxt = esp => !esp? '' : esp.ok
  ? ` Propiedades cepas_vacantes, tocones y arboles_muertos: Inventario de arbolado de la Ciudad de México, CIGA-UNAM y SEDEMA; en curso, corte: ${INV.corte}. Cada punto cuenta para el frente de manzana a ${INV.dist} m o menos; en vialidades primarias, también los del camellón (puntos sin frente de manzana) a ${INV.vp.dist} m o menos del eje.`
  : esp.unico? ' Esta copia (archivo único) no trae el inventario: sin propiedades de espacios (cepas_vacantes, tocones, arboles_muertos).' : ' No se pudo cargar el inventario: sin propiedades de espacios (cepas_vacantes, tocones, arboles_muertos).';
const geoNota = esp => `Modelo de priorización de reforestación urbana · ${ambitoGeo()} · prioridades Muy Alta, Alta y Media.${filtroEsp && geoConFr()? ' ' + espNota() : ''}${filtroEsp && geoConVp()? ' ' + espNotaVP() : ''} ${FUENTES}${respOn.gc && selCol!==null? ' Con una colonia elegida no se incluyen las vialidades primarias, que no se dividen por colonia: se descargan desde la alcaldía.' : ''} ${VERSION_TXT}.${geoEspTxt(esp)}`;
const ambitoGeoBase = () => selCol!==null? `Colonia ${colNombre(selCol)}, ${META.munNames[sel]}` : selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ', '+META.munNames[sel] : '') : sel!==null? META.munNames[sel] : 'Ciudad de México';
const ambitoGeo = () => ambitoGeoBase() + (hayFiltro() && geoConFr()? ' · ' + filtroTxt() : '') + (filtroEsp && geoConVp()? ' · ' + espTxtVP() : '');
const xmlEsc = v => String(v??'').replace(/[<>&"']/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function geoJSON(g, esp){ const f = [], e = !!(esp && esp.ok);
  const linea = (A, a, b) => { const c = []; for(let k=a;k<b;k++) c.push(geoCoord(A,k)); return c; };
  for (const i of g.fr) f.push(JSON.stringify({type:'Feature', properties:geoFr(i, e), geometry:{type:'LineString', coordinates:linea(POS, start[i], start[i+1])}}));
  for (const i of g.vp) f.push(JSON.stringify({type:'Feature', properties:geoVp(i, e), geometry:{type:'LineString', coordinates:linea(VPOS, vstart[i], vstart[i+1])}}));
  return `{"type":"FeatureCollection","name":${JSON.stringify('Modelo de priorización de reforestación urbana · '+ambitoGeo())},"descripcion":${JSON.stringify(geoNota(esp))},"features":[\n${f.join(',\n')}\n]}\n`; }
function geoKML(g, esp){ const e = !!(esp && esp.ok); const kc = p => { const c = T.prio[p]; const h = v => v.toString(16).padStart(2,'0'); return 'ff' + h(c[2]) + h(c[1]) + h(c[0]); };   // KML: aabbggrr
  const marca = (pr, p, A, a, b, ancho) => { let cs = ''; for(let k=a;k<b;k++){ const q = geoCoord(A,k); cs += q[0]+','+q[1]+',0 '; }
    return `<Placemark><name>${xmlEsc(pr.vialidad)}</name><styleUrl>#p${p}${ancho}</styleUrl><ExtendedData>${Object.entries(pr).map(([k,v])=>`<Data name="${k}"><value>${xmlEsc(v)}</value></Data>`).join('')}</ExtendedData><LineString><tessellate>1</tessellate><coordinates>${cs.trim()}</coordinates></LineString></Placemark>`; };
  const estilos = META.prio.map((_,p)=>p).filter(esPrio).map(p=> `<Style id="p${p}f"><LineStyle><color>${kc(p)}</color><width>3</width></LineStyle></Style><Style id="p${p}v"><LineStyle><color>${kc(p)}</color><width>5</width></LineStyle></Style>`).join('');
  const carpeta = (nombre, marcas) => marcas.length? `<Folder><name>${xmlEsc(nombre)}</name>\n${marcas.join('\n')}\n</Folder>\n` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc('Modelo de priorización de reforestación urbana · '+ambitoGeo())}</name><description>${xmlEsc(geoNota(esp))}</description>${estilos}\n`
    + carpeta('Frentes de manzana a cargo de la alcaldía (Muy Alta, Alta y Media)', g.fr.map(i=>marca(geoFr(i, e), F.prio[i], POS, start[i], start[i+1], 'f')))
    + carpeta('Vialidades primarias a cargo del Gobierno Central (Muy Alta, Alta y Media)', g.vp.map(i=>marca(geoVp(i, e), VP.prio[i], VPOS, vstart[i], vstart[i+1], 'v')))
    + '</Document></kml>\n'; }
function geoDescarga(tipo){ const st = $('dl-status'); const g = geoSel(); const n = g.fr.length + g.vp.length;
  if (!n){ st.textContent = (respOn.alc && sel===null && !respOn.gc)? 'Elige una alcaldía o una colonia para descargar sus calles como mapa.' : 'Este ámbito no tiene calles de prioridad Muy Alta, Alta o Media que descargar.'; return; }
  // en teléfono un archivo de decenas de miles de líneas pesa demasiado: se pide acotar a una colonia (mismo criterio que el Excel)
  if (isPhone() && n>GRANDE){ st.textContent = `El mapa de este ámbito tendría ${fmt.format(n)} líneas y es demasiado pesado para un teléfono. Elige una colonia o descárgalo desde una computadora.`; return; }
  st.textContent = n>GRANDE? `Preparando un archivo grande: ${fmt.format(n)} líneas, alrededor de ${fmt0.format(Math.max(1, n*(tipo==='kml'? 0.0006 : 0.00033)))} MB…` : 'Preparando archivo…';
  const base = `calles_prioritarias_mapa_${g.fr.length? scopeSlug() : 'vialidades_primarias_'+scopeSlugVP()}`;
  // primero los conteos del inventario (si no llegan, el archivo sale sin esas propiedades y lo dice)
  espDescarga().then(esp=> setTimeout(()=>{ try {
      const blob = tipo==='kml'? new Blob([geoKML(g, esp)], {type:'application/vnd.google-earth.kml+xml'}) : new Blob([geoJSON(g, esp)], {type:'application/geo+json'});
      deliverBlob(`${base}.${tipo==='kml'? 'kml' : 'geojson'}`, blob).then(()=>{ if (n>2000 && tipo==='kml') st.textContent += ` · ${fmt.format(n)} líneas. Google Earth lo abre completo; «Mis mapas» de Google admite hasta 2,000 por capa: para ese uso, descarga por colonia.`; espAvisoDescarga(esp); });
    } catch(e){ console.error(e); st.textContent = 'No fue posible preparar el archivo. Intenta con un ámbito más pequeño (una colonia).'; } }, 30)); }
$('dl-kml').onclick = ()=>geoDescarga('kml');
$('dl-geojson').onclick = ()=>geoDescarga('geojson');

// Fichas PDF (jsPDF bajo demanda) de colonia, alcaldía, vialidades primarias de la alcaldía, avenida y calle.
// abre la ficha después de cargar jsPDF (de libs/ en el sitio; incrustada en el archivo único)
function conPDF(kind){
  loadLib('jspdf.js', 'jspdf')
    .then(()=> generaFicha(()=> fichaPDF(kind)), e=>{ const st = $('dl-status'); if (e && e.causa==='sesion') avisoSesion(st); else st.textContent = 'No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'; });
}
// «no cargó la librería» y «falló la generación» son errores distintos y se dicen distinto
function generaFicha(f){ try { f(); } catch(e){ console.error(e); $('dl-status').textContent = 'No fue posible generar la ficha por un error interno. Recarga la página e inténtalo de nuevo; si persiste, avisa al Sistema de Información Ambiental.'; } }
// ---------- fichas (PDF) ----------
// texto en una sola línea: si no cabe, se recorta con puntos suspensivos en lugar de cortarse en seco
function cortaTxt(doc, t, w){ const ls = doc.splitTextToSize(t, w); if (ls.length<2) return t; let x = ls[0]; while (x.length>1 && doc.getTextWidth(x+'…')>w) x = x.slice(0,-1); return x.replace(/[\s·,;(]+$/,'')+'…'; }
// título de ficha: se reduce hasta caber en el ancho útil
// Propiedades del documento: idioma, autoría y, al titular la ficha, su título. La librería no puede etiquetar el PDF.
function propsPDF(doc){ try { doc.setLanguage('es-MX'); doc.setProperties({ author:'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental', creator:'Modelo de priorización de reforestación urbana, versión ' + VERSION.v, subject:'Priorización de calles para reforestación urbana', keywords:'reforestación, arbolado urbano, Ciudad de México, frentes de manzana' }); } catch(e){} }
function tituloFicha(doc, t, w, x, y){ try { doc.setProperties({ title: 'Ficha · ' + t }); } catch(e){} let fs=22; doc.setFontSize(fs); while (fs>13 && doc.getTextWidth(t)>w){ fs-=1; doc.setFontSize(fs); } doc.text(cortaTxt(doc, t, w), x, y); }
const LOGO_IMG = document.querySelector('.panel-head .logo'), LOGO_W = 2229, LOGO_H = 142;  // jsPDF acepta la imagen ya cargada (incrustada o en img/)
function alcBounds(i){ let w=180,s=90,e=-180,n=-90; for(const part of ALC_PARTS){ if(part.i!==i) continue; for(const q of part.poly){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } } const fb=META.bounds[META.muns[i]]; return [Math.min(w,fb[0]),Math.min(s,fb[1]),Math.max(e,fb[2]),Math.max(n,fb[3])]; }
// El logotipo se entrega a jsPDF como lienzo ya dibujado. Si se le pasa el elemento <img>, jsPDF vuelve a pedir el archivo
// con una solicitud síncrona, que falla sin conexión y bloquea la página; así, además, la ficha se genera aunque el logotipo no cargue.
let LOGO_LIENZO = null;
function ponLogo(doc, x, y, w, h){ try { if (!LOGO_LIENZO && LOGO_IMG && LOGO_IMG.naturalWidth){ const c = document.createElement('canvas'); c.width = LOGO_IMG.naturalWidth; c.height = LOGO_IMG.naturalHeight; c.getContext('2d').drawImage(LOGO_IMG, 0, 0); LOGO_LIENZO = c; }
  if (LOGO_LIENZO) doc.addImage(LOGO_LIENZO, 'PNG', x, y, w, h); } catch(e){ console.warn('ficha sin logotipo', e); } }
function fichaPDF(kind){
  // kind: 'col' | 'alc' | 'vpalc' | 'vpav'
  if (!window.jspdf) return;
  const isCol = kind==='col', isAlc = kind==='alc', isVpAlc = kind==='vpalc', isVpAv = kind==='vpav'; const isVP = isVpAlc || isVpAv;
  if ((isCol && selCol===null) || ((isAlc||isVpAlc) && sel===null) || (isVpAv && selAv===null)) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'}); propsPDF(doc);
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  // con el filtro «Espacio», las fichas de vialidades y de avenida cuentan solo los tramos que pasan (pasaEspacioVP); sin él, las cifras de siempre
  const espVP = isVP && filtroEsp!==0;
  const c = isCol? META.colonias[selCol] : null; const av = isVpAv? avStatEsp(selAv) : null;
  let cs;
  if (isCol) cs = colStat(selCol);
  else if (isAlc){ const s=frSumm(); cs={n:s.n, km:s.km, kmp:kmPrio(s), np:sumPrio(s.n)}; }   // frSumm respeta el filtro de banqueta
  else if (isVpAlc && espVP){ const s=vpSumm(); cs={n:s.n, km:s.km, kmp:kmPrio(s), np:s.recsp.size, ntot:s.recs.size}; }   // vpSumm respeta el filtro (selAv es null)
  else if (isVpAlc){ const s=VPC.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:VP_RECS[sel].rp.size, ntot:VP_RECS[sel].r.size}; }
  else { cs={n:av.n, km:av.kmByP, kmp:av.kmp, np:av.recsp.size, ntot:av.recs.size}; }
  const tot = sum(cs.km); const ntot = isVP? cs.ntot : sum(cs.n);
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const unit = isVP? 'tramos' : 'frentes';
  // encabezado
  const lw = 108, lh = lw*LOGO_H/LOGO_W; ponLogo(doc, M, 12, lw, lh);   // logotipo en una fila: Gobierno · SEDEMA · SIA · Reforestación Urbana
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text(isCol? 'Ficha de colonia' : isAlc? 'Ficha de alcaldía' : isVpAlc? 'Ficha de vialidades primarias' : 'Ficha de avenida', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Modelo de priorización de reforestación urbana', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  const title = isCol? colNombre(selCol) : isVpAv? VPC.nomenclat[selAv] : META.munNames[sel];
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); tituloFicha(doc, title, W-2*M, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = isCol? `${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' habitantes (Censo 2020)':''}`
    : isAlc? `Ciudad de México · ${fmt.format(ntot)} frentes de manzana a cargo de la alcaldía · ${fmt0.format(tot)} km de frentes`
    : isVpAlc? `Ciudad de México · ${fmt.format(ntot)} tramos de vialidad primaria a cargo del Gobierno Central · ${fmt0.format(tot)} km`
    : `${redesTxt(av.nombres, 9)? redesTxt(av.nombres, 9)+' · ' : ''}${[...av.muns].map(m=>META.munNames[m]).join(', ')} · ${fmt1.format(tot)} km · ${fmt.format(ntot)} tramos`;
  // con filtro de banqueta o de espacio las cifras de la ficha son las filtradas: el subtítulo lo dice primero, para que no se corte
  const subB = (isCol||isAlc) && hayFiltro()? filtroTxt().replace(/^solo frentes /, 'Solo ') + ' · ' : espVP? espTxtVP().replace(/^solo tramos /, 'Solo tramos ') + ' · ' : '';
  doc.text(cortaTxt(doc, subB + sub, W-2*M), M, 44);
  const pk = isCol? c.p : isAlc? (hayFiltro()? dom({km:cs.km}) : ALC_DOM[sel]) : isVpAlc? (espVP? dom({km:cs.km}) : VP_DOM[sel]) : dom({km:av.kmByP}); const pc = pk>=0? T.prio[pk] : GRIS;
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = isCol? `Prioridad de la colonia: ${pk>=0? META.prio[pk]:'—'}` : `Prioridad predominante: ${META.prio[pk]} (${pct(cs.km[pk],tot)} de los ${isVpAv? 'km de la avenida' : isVP? 'km de vialidad primaria de la alcaldía' : 'km de frente de la alcaldía'})`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5);
  const tw = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = isCol? `Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}` : isAlc? `Concentra ${partTxt(sel,false)}` : isVpAlc? `Concentra ${partTxt(sel,true)}` : `${VPC.tipos[VP.tipo[avStat(selAv).idx[0]]]}`;
  const l2x = M+6+tw+8; if (l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5); else doc.text(doc.splitTextToSize(l2, W-2*M-6)[0], M+6, 56.4);
  // KPIs
  const kp = [[kmFull(cs.kmp), isVP? `de vialidad primaria prioritaria ${ampP()} (Muy Alta, Alta y Media)` : `de frente prioritario ${ampP()} (Muy Alta, Alta y Media)`],[fmt1.format(tot? 100*cs.kmp/tot:0)+' %','de los '+kmFull(tot)+' '+(isCol?'de frentes de la colonia':isAlc?'de frentes de la alcaldía':isVpAlc?'de vialidad primaria de la alcaldía':'de la avenida')],[fmt.format(cs.np), isVP? `${unit} prioritarios, de los ${fmt.format(ntot)} ${unit} ${ampP()}` : (isCol? `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la colonia` : `frentes prioritarios, de los ${fmt.format(ntot)} a cargo de la alcaldía`)]];
  function ampP(){ return isCol? 'de la colonia' : isVpAv? 'de la avenida' : 'de la alcaldía'; }
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  // nota complementaria: se mide su alto real y la gráfica se coloca debajo, sin encimarse
  let notaFin = 0; const nota = t => { doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); const ls = doc.splitTextToSize(t, W-2*M).slice(0,4); doc.text(ls, M, 81.5, {lineHeightFactor:1.2}); notaFin = 81.5 + (ls.length-1)*3.6; };
  if (isAlc){ const vs=VPC.summ[META.muns[sel]]; const top=[]; for(const [a,s] of (()=>{ const m=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; m.set(a,(m.get(a)||0)+(esPrio(VP.prio[i])? VP.len[i]/1000:0)); } return m; })()) top.push([a,s]); top.sort((x,y)=>y[1]-x[1]);
    nota(`Gobierno Central atiende además ${fmt0.format(sum(vs.km))} km de vialidades primarias en la alcaldía, medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); no se cuentan arriba. Principales: ${top.slice(0,3).map(t=>VPC.nomenclat[t[0]]).join(', ')}.`); }
  // con el filtro «Espacio», la nota de las fichas de vialidades primarias empieza por decirlo (y el corte del inventario)
  const espFicha = espVP? `Consulta filtrada: ${espTxtVP()}, en sus frentes o en el camellón; inventario en curso, corte: ${INV.corte}. ` : '';
  if (isVpAlc){ const fs=META.summ[META.muns[sel]]; nota(`${espFicha}Los kilómetros de esta ficha se miden sobre el eje de la vialidad. ${gcFrenteTxt(sel, null)}. La alcaldía atiende por su parte ${fmt0.format(sum(fs.km))} km de frentes de manzana (${fmt0.format(kmPrio(fs))} km prioritarios); ver ficha de alcaldía.`); }
  if (isVpAv){
    // la frase de la alcaldía elegida va primero: es la consultada y no debe quedar fuera si la nota es larga
    let t = espFicha;
    if (sel!==null){ const va=vpSumm(); t += `En ${META.munNames[sel]}: ${kmFull(sum(va.km))} de la avenida, ${kmFull(kmPrio(va))} prioritarios, ${fmt.format(va.recsp.size)} de ${fmt.format(va.recs.size)} tramos prioritarios. `; }
    t += `${avGruposTxt(selAv)? avGruposTxt(selAv)+'. ' : ''}Las cifras de esta ficha corresponden a la avenida completa, en todas las alcaldías que cruza, medidas sobre el eje. ${gcFrenteTxt(null, selAv)}.`;
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
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(esPrio(k)?0.55:0.35);
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
    if (isVpAv) for(const m of avStat(selAv).muns) drawAlcOutline(m); else { for(let i=0;i<16;i++){ if(i!==sel) drawAlcOutline(i); } }
    const delAmbito = i => !(isVpAlc && VP.mun[i]!==sel) && !(isVpAv && VP.nom[i]!==selAv);
    // con el filtro «Espacio», los tramos que no pasan van en gris claro, de contexto
    if (espVP){ doc.setDrawColor(214,209,201); doc.setLineWidth(0.5);
      for(let i=0;i<NV;i++){ if(!delAmbito(i) || pasaEspacioVP(i)) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(esPrio(k)? 0.9 : 0.6);
      for(let i=0;i<NV;i++){ if(VP.prio[i]!==k || !delAmbito(i) || !pasaEspacioVP(i)) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); if (isVpAlc) drawAlcOutline(sel);
    capMapa = (isVpAlc? 'Vialidades primarias por prioridad · contorno de la alcaldía' : 'Tramos de la avenida por prioridad · alcaldías que cruza') + (espVP? ` · en gris, sin ${espLista()}` : '');
  }
  doc.restoreGraphicsState();
  doc.setFillColor(255,255,255); doc.rect(mx+0.3,my+mh-5.2,mw-0.6,4.9,'F'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text(cortaTxt(doc, capMapa, mw-4), mx+2, my+mh-2);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla
  y=y+62;
  // lo prioritario (Muy Alta, Alta y Media) del ámbito de la ficha: sin arbolado, Gobierno Central y desglose por banqueta, en km de frente de manzana
  const NR = (isCol||isAlc)? (sinNombre.kmp>0? 9 : 10) : 14;   // en colonia y alcaldía, menos renglones: el párrafo lleva el desglose por banqueta
  if (isCol||isAlc){ const R = repStat(sel, isCol? selCol : null);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
    const ug = sumPrio(R.km[1]);
    // el filtro de banqueta, si está activo, y el desglose por banqueta de los km prioritarios, siempre
    const lsU = doc.splitTextToSize(`${hayFiltro()? 'Consulta filtrada: '+filtroTxt()+'. ' : ''}${filtroEsp? 'Inventario en curso, corte: '+INV.corte+'. ' : ''}De lo prioritario a cargo de la alcaldía, ${kmFull(sumPrio(R.sa[0]))} no tienen arbolado.${ug>0? ` Gobierno Central: ${kmFull(ug)} de frente prioritario sobre vialidades primarias ${isCol?'de la colonia':'de la alcaldía'}.`:''} ${banqDesgloseTxt(sel, isCol? selCol : null)}`, W-2*M).slice(0,5);
    doc.text(lsU, M, y+2, {lineHeightFactor:1.25});
    y += 16 + Math.max(0, lsU.length-3)*4.4; }
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
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel || !pasaEspacioVP(i)) continue; const a=VP.nom[i]; let s=per.get(a); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set(),nombres:new Set(),tipos:new Set()}; per.set(a,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
    const items=[...per.entries()].filter(([a,s])=>kmPrio(s)>0).sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Vialidad'],[M+70,'Red vial'],[M+108,'Predominante'],[M+134,'Km prior.'],[M+158,'Tramos prior.']];
    rows = items.slice(0,14).map(([a,s])=>[VPC.nomenclat[a], redesTxt(s.nombres), META.prio[dom(s)], f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  } else {
    doc.text('TRAMOS DE LA AVENIDA POR ALCALDÍA QUE CRUZA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv || !pasaEspacioVP(i)) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); }
    const items=[...per.entries()].sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Alcaldía'],[M+62,'Predominante'],[M+92,'Km en la alcaldía'],[M+126,'Km prior.'],[M+150,'Tramos prior.']];
    rows = items.map(([m,s])=>[META.munNames[m], META.prio[dom(s)], f2.format(sum(s.km)), f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if(!rows.length){ doc.setTextColor(...GRIS); doc.text('Sin registros prioritarios.', M+1.5, y+6); }
  // frentes prioritarios sin nombre de calle: no caben en una tabla por calle, pero se reportan
  if ((isCol||isAlc) && sinNombre.kmp>0){ doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(`Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${isCol?'de la colonia':'de la alcaldía'} no tienen nombre de calle en INEGI (${fmt.format(sinNombre.np)} frentes); no aparecen en los listados por calle, pero sí en el Excel de frentes.`, W-2*M-3).slice(0,2), M+1.5, y+6+Math.max(rows.length,1)*6.2-1.5, {lineHeightFactor:1.2}); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,254,W-M,254); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const fuentes = isVP
    ? `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta, Alta y Media. Prioridad predominante = categoría con más kilómetros. Las vialidades primarias y de acceso controlado corresponden al Gobierno de la Ciudad de México. Fuentes: SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); modelo de priorización del Sistema de Información Ambiental. La meta se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red primaria completa.${espVP? ` Filtro «Espacio»: ${INV.fuente}, corte: ${INV.corte}.` : ''} Generado el ${hoy} desde la herramienta Modelo de priorización de reforestación urbana. ${VERSION_TXT}.`
    : `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta, Alta y Media. ${isCol?'':'Prioridad predominante = categoría con más kilómetros de frente en la alcaldía. '}Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025) y capa de vialidades primarias (ago. 2026); catálogo de colonias SEDEMA-SIA e Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX). Generado el ${hoy} desde la herramienta Modelo de priorización de reforestación urbana. ${VERSION_TXT}.`;
  doc.text(doc.splitTextToSize(fuentes, W-2*M), M, 258);
  const fname = isCol? `ficha_colonia_${slug(META.munNames[sel])}_${slug(colNombre(selCol))}${filtroSlug()}.pdf` : isAlc? `ficha_alcaldia_${slug(META.munNames[sel])}${filtroSlug()}.pdf` : isVpAlc? `ficha_vialidades_primarias_${slug(META.munNames[sel])}${espSlug()}.pdf` : `ficha_avenida_${slug(VPC.nomenclat[selAv])}_toda_la_ciudad${espSlug()}.pdf`;
  deliverBlob(fname, doc.output('blob'));
}
// ---------- ficha de calle (red de las alcaldías) ----------
// Misma composición que las demás fichas: encabezado, cifras, barras por prioridad, mapa y tabla por colonia.
function fichaCallePDF(){
  const c = calleSel(); if (!c || !window.jspdf) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'}); propsPDF(doc);
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const idx = c.idx, enCalle = new Set(idx);
  const km=[0,0,0,0,0], n=[0,0,0,0,0]; let banq=0; const tipos=new Set(), porCol=new Map(), munSet=new Set();
  for(const i of idx){ const k=F.len[i]/1000, p=F.prio[i]; km[p]+=k; n[p]++; if (META.disp[(F.flags[i]>>3)&7]==='Dispone') banq++; if (META.tipos[F.tipo[i]]) tipos.add(META.tipos[F.tipo[i]]); munSet.add(F.mun[i]);
    let s=porCol.get(F.col[i]); if(!s){ s={km:0,kmp:0,n:0,np:0}; porCol.set(F.col[i],s); } s.km+=k; s.n++; if(esPrio(p)){ s.kmp+=k; s.np++; } }
  const tot=sum(km), kmp=sumPrio(km), ntot=idx.length, np=sumPrio(n);
  const muns=[...munSet].map(m=>META.munNames[m]); const colNoms=[...porCol.keys()].filter(Boolean).map(k=>META.colonias[k].n);
  // encabezado
  const lw = 108, lh = lw*LOGO_H/LOGO_W; ponLogo(doc, M, 12, lw, lh);   // logotipo en una fila: Gobierno · SEDEMA · SIA · Reforestación Urbana
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text('Ficha de calle', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Modelo de priorización de reforestación urbana', W-M, 19, {align:'right'});
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
  const kp = [[kmFull(kmp), 'de frente prioritario de la calle (Muy Alta, Alta y Media)'],[fmt1.format(tot? 100*kmp/tot:0)+' %','de los '+kmFull(tot)+' de frentes de la calle'],[fmt.format(np), `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la calle`]];
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA);
  doc.text(doc.splitTextToSize(`${hayFiltro()? 'Consulta filtrada: '+filtroTxt()+(filtroEsp? ', corte: '+INV.corte : '')+'. ' : ''}Banqueta (INEGI): ${fmt.format(banq)} de ${fmt.format(ntot)} frentes registran banqueta; el espacio de plantación se verifica en campo. Cada frente es un lado de la calle frente a una manzana.`, W-2*M).slice(0,2), M, 80.6, {lineHeightFactor:1.2});
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
    rows = items.slice(0,14).map(t=>[t.n, tramoTxt(t), fmt.format(t.largo), t.lados, META.prio[dom({km:t.km})], f2.format(sumPrio(t.km))]);
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
  doc.text(doc.splitTextToSize('Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta, Alta y Media. Prioridad predominante = categoría con más kilómetros de frente en la calle. Una calle se compone de frentes de manzana: cada lado de la calle frente a una manzana es un frente. Los tramos se arman con una regla geométrica y sus vialidades delimitantes son aproximadas; se confirman en campo. Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025); catálogo de colonias SEDEMA-SIA. Generada el ' + new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}) + '. ' + VERSION_TXT + '.', W-2*M), M, 258);
  deliverBlob(`ficha_calle_${slug(c.nombre)}_${munSet.size===1? slug(muns[0]) : 'ciudad'}${selCol!==null? '_'+slug(colNombre(selCol)) : ''}${filtroSlug()}.pdf`, doc.output('blob'));
}
$('dl-ficha-calle').onclick = ()=> loadLib('jspdf.js', 'jspdf')
  .then(()=> generaFicha(fichaCallePDF), e=>{ const st = $('dl-status'); if (e && e.causa==='sesion') avisoSesion(st); else st.textContent = 'No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'; });
$('dl-ficha').onclick = ()=>conPDF('col');
$('dl-ficha-alc').onclick = ()=>conPDF('alc');
$('dl-ficha-vpalc').onclick = ()=>conPDF('vpalc');
$('dl-ficha-av').onclick = ()=>conPDF('vpav');

// ---------- estado de las descargas visible desde donde se piden, y un archivo por clic ----------
// El aviso de estado vive en la pestaña Descargas; el pie fijo lo repite, porque sus botones funcionan desde cualquier pestaña.
// Mientras un archivo se prepara, los botones de descarga no aceptan otro clic.
let GENERANDO = false, genT = null;
const EN_CURSO = /^Preparando/;
function finGenera(){ GENERANDO = false; clearTimeout(genT); document.body.classList.remove('generando'); }
new MutationObserver(()=>{ const t = $('dl-status').textContent.trim(); const a = $('act-status');
  const esDescarga = /^(Preparando|Descargado|Guardado|Descarga cancelada|No fue posible|No se pudo)/.test(t);
  if (a){ a.textContent = esDescarga? t : ''; a.hidden = !esDescarga; }
  if (GENERANDO && !EN_CURSO.test(t)) finGenera();
}).observe($('dl-status'), {childList:true, characterData:true, subtree:true});
['dl-frentes','dl-calles','dl-tramos','dl-avenidas','dl-calle','dl-ficha-calle','dl-ficha-vpalc','dl-ficha-av','dl-ficha-alc','dl-ficha','dl-kml','dl-geojson'].forEach(id=>{ const b = $(id), h = b.onclick; if (!h) return;
  b.onclick = e=>{ if (GENERANDO || b.disabled) return; GENERANDO = true; document.body.classList.add('generando'); $('dl-status').textContent = 'Preparando archivo…';
    // un Excel grande en un equipo lento puede pasar de 90 s: primero se avisa que sigue en proceso y solo a los 5 min se da por fallido
    // (darlo por fallido antes soltaría los botones y el archivo llegaría después: la persona lo pediría dos veces)
    genT = setTimeout(()=>{ if (!GENERANDO) return;
      if (EN_CURSO.test($('dl-status').textContent)) $('dl-status').textContent = 'Preparando archivo… es grande y en este equipo tarda; sigue en proceso.';
      genT = setTimeout(()=>{ if (GENERANDO){ finGenera(); if (EN_CURSO.test($('dl-status').textContent)) $('dl-status').textContent = 'No fue posible preparar el archivo. Inténtalo de nuevo.'; } }, 210000); }, 90000);
    h.call(b, e); }; });

// Interfaz: ventana de metodología, hoja inferior en teléfono, pestañas, acciones fijas y ruta de navegación.
// ---------- metodología ----------
const infoModal = $('info-modal'); let lastFocus = null;
// La ventana se cierra con la × (siempre visible), con "Volver al mapa" al final, con Esc, tocando fuera
// de ella o con el botón Atrás del teléfono (se registra un paso en el historial al abrirla).
// Mientras la ayuda está abierta, el resto de la página queda inerte: el foco no sale de la ventana
const appEl = document.querySelector('.app');
function openInfo(){ lastFocus=document.activeElement; infoModal.hidden=false; appEl.inert = true; infoModal.querySelector('.modal-card').scrollTop=0; $('info-close').focus();
  try { history.pushState({ayuda:true}, ''); } catch(e){} }
function hideInfo(){ infoModal.hidden=true; appEl.inert = false; if(lastFocus && lastFocus.isConnected) lastFocus.focus(); }
function closeInfo(){ if (history.state && history.state.ayuda){ history.back(); setTimeout(()=>{ if(!infoModal.hidden) hideInfo(); }, 400); } else hideInfo(); }
addEventListener('popstate', ()=>{ if (!infoModal.hidden) hideInfo(); });
$('open-info').onclick = openInfo; $('info-btn').onclick = openInfo; $('info-close').onclick = closeInfo; $('info-back').onclick = closeInfo;
infoModal.addEventListener('click', e=>{ if(e.target===infoModal) closeInfo(); });
// Esc cierra, en este orden: la ayuda, la ficha abierta y el panel de capas; el foco vuelve al control que los abrió
addEventListener('keydown', e=>{ if (e.key!=='Escape' || e.defaultPrevented) return;
  if (!entradaEl.hidden) return cierraEntrada(null);
  if (!infoModal.hidden) return closeInfo();
  if (!$('card').hidden){ e.preventDefault(); return hideCard(true); }
  if (legendEl.classList.contains('open') && legendEl.contains(document.activeElement)){ setLegend(false); capasBtn.focus(); } });
// cifras del cruce en la metodología
$('m-vp-km').textContent = fmt0.format(VPC.cov.km_total); $('m-vp-prio').textContent = fmt0.format(vCityPrioKm); $('m-vp-pct').textContent = pct(vCityPrioKm, vCityTotKm);
$('m-n-fr').textContent = fmt.format(N); $('m-n-alc').textContent = $('m-n-alc2').textContent = fmt.format(N - META.cruce.frentes_gc);
$('m-alc-km').textContent = fmt0.format(cityTotKm); $('m-alc-prio').textContent = fmt0.format(cityPrioKm); $('m-alc-pct').textContent = pct(cityPrioKm, cityTotKm);   // red de las alcaldías
$('m-gc-fr').textContent = fmt.format(META.cruce.frentes_gc); $('m-gc-km').textContent = fmt0.format(META.cruce.km_gc); $('m-cov').textContent = pct(VPC.cov.km_con_frente, VPC.cov.km_total); $('m-vp-tramos').textContent = fmt.format(VPC.cov.registros); $('m-vp-km2').textContent = fmt0.format(VPC.cov.km_total);

// ---------- celular: información y mapa en dos pantallas ----------
const isPhone = ()=> matchMedia(MQ_TEL).matches;
// En el celular la información y el mapa son dos pantallas completas que se cambian con un botón («Ver el mapa» en el encabezado del
// panel; en el mapa, abajo, el que dice qué se verá al regresar). La que no se ve queda inerte: sin foco, toques ni lector de pantalla.
// Qué lleva a qué pantalla: buscar o elegir alcaldía o colonia, filtros, pestañas y descargas se quedan en la información; elegir una
// calle, una avenida o un tramo de una lista, o un punto por coordenadas, va al mapa con lo elegido; tocar el mapa se queda en el mapa;
// «atrás» del navegador desde el mapa regresa a la información. En la computadora no cambia nada.
let PANTALLA = 'info';
const panelEl = document.querySelector('.panel'), mapaEl = document.querySelector('.mapwrap');
function pantalla(p, op={}){
  if (!HAY_MAPA) p = 'info';
  const antes = PANTALLA, tel = isPhone(), b = document.body; PANTALLA = p;
  b.classList.toggle('ver-mapa', p==='mapa'); b.classList.toggle('ver-info', p==='info');
  panelEl.inert = tel && p==='mapa'; mapaEl.inert = tel && p==='info' && HAY_MAPA;
  rotuloInfo();
  if (tel && antes!==p){ const f = document.activeElement;
    if (op.foco || (f && f!==document.body && (p==='mapa'? panelEl : mapaEl).contains(f))) $(p==='mapa'? 'ver-info' : 'ver-mapa').focus({preventScroll:true});
    // lo elegido desde una lista: «atrás» regresa a la lista
    if (p==='mapa' && op.desdeLista) history.pushState({...(history.state || {}), pantalla:'mapa'}, ''); } }
const verMapa = op=> pantalla('mapa', op), verInfo = op=> pantalla('info', op);
// el botón del mapa dice «Volver a la información» y, abajo, el lugar consultado
function rotuloInfo(){ const t = $('ver-info-t'); if (!t) return;
  const s = highlight && highlight.avId!==undefined? VPC.nomenclat[highlight.avId] : highlight? (META.names[highlight.nameId] || 'Calle sin nombre')
    : selAv!==null? VPC.nomenclat[selAv] : selCol!==null? 'Col. '+META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México';
  if (t.textContent!==s) t.textContent = s; }
// al elegir desde el panel en el celular, la respuesta queda a la vista (sin cambiar de pantalla: desde el mapa, se sigue en el mapa)
const alaRespuesta = ()=>{ if (!isPhone() || PANTALLA!=='info') return; const k=$('answer'); if (k) setTimeout(()=>k.scrollIntoView({block:'start'}), 300); };
$('ver-mapa').onclick = ()=> verMapa({foco:true});
$('ver-info').onclick = ()=> verInfo({foco:true});
matchMedia(MQ_TEL).addEventListener('change', ()=>{ pantalla(PANTALLA); if (!isPhone()) document.querySelectorAll('details.mas:not(.siempre)').forEach(d=> d.open = true); });
// plegables de la plantilla (fuentes, archivos de mapa): abiertos en la computadora, cerrados en el celular
if (isPhone()) document.querySelectorAll('details.mas').forEach(d=> d.open = false);
addEventListener('popstate', e=>{ if (isPhone() && PANTALLA==='mapa' && !(e.state && e.state.pantalla==='mapa')) verInfo(); });
// alto real de la pantalla: en iOS 26, con 100dvh o height:100%, Safari dejaba una franja vacía abajo (--alto, en 10_dos_pantallas.css);
// --vvh es el alto visible, que se reduce con el teclado abierto
{ const vv = ()=>{ const r = document.documentElement.style; r.setProperty('--alto', innerHeight+'px'); if (window.visualViewport) r.setProperty('--vvh', visualViewport.height+'px'); };
  vv(); addEventListener('resize', vv); if (window.visualViewport) visualViewport.addEventListener('resize', vv); }
const panelBtn = $('panel-toggle');
panelBtn.onclick = ()=>{ const off = document.body.classList.toggle('panel-off');
  panelBtn.setAttribute('aria-expanded', String(!off));
  panelBtn.title = panelBtn.ariaLabel = off? 'Mostrar el panel de consulta' : 'Ocultar el panel de consulta';
  setTimeout(()=>{ if(!NOMAP) dk.redraw(true); }, 120); };
const legendEl = document.querySelector('.legend'), legendBtn = $('legend-toggle');
// el panel de capas se abre y se cierra con el botón de capas de la barra de herramientas; su × lo cierra
const capasBtn = $('zcapas');
function setLegend(open){ legendEl.classList.toggle('open', open); legendBtn.setAttribute('aria-expanded', String(open)); capasBtn.setAttribute('aria-expanded', String(open)); capasBtn.classList.toggle('on', open); }
legendBtn.onclick = ()=>{ setLegend(false); capasBtn.focus(); };
capasBtn.onclick = ()=> setLegend(!legendEl.classList.contains('open'));
setLegend(false);   // el panel de capas empieza cerrado: la leyenda compacta dice los colores y lo abre
$('leymini').onclick = ()=>{ setLegend(true); legendBtn.focus(); };

// ---------- pestañas Dónde empezar / Resumen / Descargas ----------
// La antigua pestaña del listado se fundió en «Dónde empezar»: cualquier otro nombre (por ejemplo, el «list» de antes) abre «Dónde empezar».
const PESTANAS = ['ini','res','dl'];
function setTab(t){ if (!PESTANAS.includes(t)) t = 'ini';
  document.body.classList.toggle('tab-dl', t==='dl');   // en Descargas la barra inferior sobra: repite los mismos botones
  document.querySelectorAll('.tabs [role=tab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.tab===t))); PESTANAS.forEach(k=>{ $('tp-'+k).hidden = k!==t; });
  if (t==='res') espCompPide(); }   // el Resumen pide el inventario para su comparación (sin bloquear)
document.querySelectorAll('.tabs [role=tab]').forEach(b=>{ b.onclick=()=>setTab(b.dataset.tab); });
function renderScopeTitle(){
  $('scope-title').textContent = selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : '')
    : selCol!==null? 'Col. '+META.colonias[selCol].n : sel!==null? META.munNames[sel] : 'Ciudad de México'; }   // «Col.» para que se sepa que es una colonia
// ---------- acciones fijas al pie del panel ----------
function renderActions(){
  const m=$('act-main'), f=$('act-ficha'), lbl=$('act-main-lbl'), hint=$('act-hint');
  let main=null, ficha=null, txt='', why='';
  if (isGC()){ main='dl-tramos'; txt='Descargar tramos prioritarios (Excel)'; if ($('dl-tramos').disabled) why='Este ámbito no tiene tramos de prioridad Muy Alta, Alta o Media que descargar.'; ficha = selAv!==null? 'dl-ficha-av' : sel!==null? 'dl-ficha-vpalc' : null; }
  else {
    txt='Descargar frentes prioritarios (Excel)';
    const vacia = selCol!==null && sum(colStat(selCol).n)===0;
    main = (sel!==null && !vacia)? 'dl-frentes' : null;
    ficha = vacia? null : selCol!==null? 'dl-ficha' : sel!==null? 'dl-ficha-alc' : null;
    why = vacia? 'Esta colonia no tiene frentes a cargo de la alcaldía que descargar.' : sel===null? 'Elige una alcaldía o una colonia para descargar su listado.' : '';
    // en teléfono, un listado de decenas de miles de frentes pesa demasiado: se ofrece primero el resumen por calle
    if (main==='dl-frentes' && isPhone() && selCol===null){ const fsG = frSumm(), nG = sumPrio(fsG.n);
      if (nG>GRANDE){ main='dl-calles'; txt='Descargar resumen por calle (Excel)'; why=`En teléfono se ofrece primero el resumen por calle. El listado completo (${fmt.format(nG)} frentes) está en la pestaña Descargas.`; } }
    // con una calle consultada, los botones principales son los de la calle
    const calle = calleSel();
    if (calle){ main='dl-calle'; ficha='dl-ficha-calle'; txt='Descargar frentes de la calle (Excel)';
      why = `Calle consultada: ${calle.nombre}. ` + (sel===null? 'Para descargar un ámbito completo, elige primero una alcaldía.' : `Los archivos de la ${selCol!==null? 'colonia' : 'alcaldía'} completa están en la pestaña Descargas.`); }
  }
  lbl.textContent = txt; m.disabled = !main || $(main).disabled; m.dataset.target = main||''; f.hidden = !ficha; f.dataset.target = ficha||'';
  $('panel-actions').classList.toggle('sin-descarga', m.disabled && f.hidden);   // en el celular el pie no ocupa lugar si no hay nada que descargar
  hint.hidden = !why; hint.textContent = why;
  // Descargas: si nada se puede descargar (toda la ciudad con «Alcaldías»), queda solo el motivo, arriba, sin botones apagados
  const dls = [...document.querySelectorAll('#tp-dl .btns button')].filter(b=> !b.hidden);
  $('tp-dl').classList.toggle('sin-descarga', dls.length>0 && dls.every(b=> b.disabled)); }
$('act-main').onclick = ()=>{ const t=$('act-main').dataset.target; if(t) $(t).click(); };
$('act-ficha').onclick = ()=>{ const t=$('act-ficha').dataset.target; if(t) $(t).click(); };
// «Mi cuenta»: solo aparece si la instalación define el cierre de sesión. Abre un menú pequeño (botón con aria-expanded; Esc lo cierra y
// regresa el foco al botón; un clic fuera o salir con el tabulador lo cierra) con «Cambiar contraseña» (la pantalla de acceso con ?cambiar=1,
// que con la sesión abierta pide la actual y la nueva y, al terminar, regresa a esta misma consulta: volver=…) y «Cerrar sesión».
if (SESION.cierre){ const c = $('cuenta'), b = $('cuenta-btn'), m = $('cuenta-menu'), clave = $('cuenta-clave');
  $('cuenta-salir').href = SESION.cierre;
  if (!SESION.inicio) clave.parentElement.remove();
  // volver va al final: la pantalla de acceso toma como dirección de regreso todo lo que sigue a «volver=»
  const claveHref = ()=> SESION.inicio + (SESION.inicio.includes('?')? '&' : '?') + 'cambiar=1&volver=' + encodeURIComponent(location.pathname + location.search);
  const abre = si => { m.hidden = !si; b.setAttribute('aria-expanded', String(si)); if (si && SESION.inicio) clave.href = claveHref(); };
  b.onclick = ()=> abre(m.hidden);
  document.addEventListener('keydown', e=>{ if (e.key==='Escape' && !m.hidden){ e.stopPropagation(); abre(false); b.focus(); } }, true);
  document.addEventListener('pointerdown', e=>{ if (!m.hidden && !c.contains(e.target)) abre(false); }, true);
  c.addEventListener('focusout', e=>{ if (!m.hidden && e.relatedTarget && !c.contains(e.relatedTarget)) abre(false); });
  c.hidden = false; document.body.classList.add('con-sesion'); }
// ---------- títulos de lista: la palabra de lo que se consulta (Colonias, Calles, Avenidas, Tramos, Alcaldías) va destacada ----------
const UNIDAD_RX = /(Colonias|Calles|Avenidas|Tramos|Alcaldías|calles)/;
function resaltaUnidad(el){ if (!el || el.querySelector('b.unidad')) return; const t = el.textContent, m = t.match(UNIDAD_RX); if (!m) return;
  const b = document.createElement('b'); b.className = 'unidad'; b.textContent = m[1]; el.replaceChildren(t.slice(0, m.index), b, t.slice(m.index + m[1].length)); }
for (const id of ['ini-title']){ const el = $(id); if (!el) continue; resaltaUnidad(el); new MutationObserver(()=>resaltaUnidad(el)).observe(el, {childList:true, characterData:true, subtree:true}); }
// ---------- entrada en dos pasos ----------
// Primera visita sin consulta en la dirección. Paso 1: qué red se consulta (alcaldías o Gobierno Central), con el mismo peso.
// Paso 2: el territorio (una alcaldía o toda la ciudad). Esc o «Ver toda la ciudad» dejan la ciudad completa.
const entradaEl = $('entrada'); let entradaRed = 'alc';
let trasEntrada = null;   // lo que sigue a la entrada en la primera visita: el recorrido guiado (17_recorrido.js)
function cierraEntrada(m){ entradaEl.hidden = true; appEl.inert = false;
  if (resp!==entradaRed) setResp(entradaRed);
  if (m!==null){ selEl.value = String(m); setSel(String(m)); } else recuerdaInicio();
  $('scope-title').focus();
  if (trasEntrada){ const f = trasEntrada; trasEntrada = null; setTimeout(f, 700); } }
function entradaPaso(n){ $('entrada-p1').hidden = n!==1; $('entrada-p2').hidden = n!==2;
  if (n===1) entradaEl.querySelector('.entrada-red[data-red="'+entradaRed+'"]').focus();
  else { $('entrada-q').textContent = entradaRed==='gc'? '¿En qué alcaldía quieres ver las vialidades primarias?' : '¿Qué alcaldía quieres revisar?'; $('entrada-q').focus(); } }
function abreEntrada(){ const g = $('entrada-grid');
  if (!g.children.length) META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const b = document.createElement('button'); b.type = 'button'; b.className = 'entrada-op'; b.textContent = META.munNames[i]; b.onclick = ()=>cierraEntrada(i); g.appendChild(b); });
  entradaEl.hidden = false; appEl.inert = true; entradaPaso(1); }
entradaEl.querySelectorAll('.entrada-red').forEach(b=>{ b.onclick = ()=>{ entradaRed = b.dataset.red; entradaPaso(2); }; });
$('entrada-volver').onclick = ()=>entradaPaso(1);
$('entrada-cdmx').onclick = ()=>cierraEntrada(null);
// ---------- ruta de navegación ----------
function renderCrumb(){
  const atRoot = sel===null && selCol===null && selAv===null;
  $('cr-city').setAttribute('aria-current', atRoot? 'page' : 'false');
  $('cr-city').title = atRoot? '' : 'Volver a toda la ciudad';
  selEl.classList.toggle('unset', sel===null);
  const rest=$('cr-rest'); let h='';
  if (selCol!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>Col. ${META.colonias[selCol].n}</span><button type="button" class="cr-up" data-up="col" title="Quitar la colonia y volver a ${META.munNames[sel]}" aria-label="Quitar la colonia y volver a ${META.munNames[sel]}">×</button></span>`;
  else if (selAv!==null) h = `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${VPC.nomenclat[selAv]}</span><button type="button" class="cr-up" data-up="av" title="Quitar la avenida" aria-label="Quitar la avenida">×</button></span>`;
  // la calle consultada es el último nivel de la ruta y se puede soltar
  const cs = calleSel(); if (cs) h += `<span class="cr-sep" aria-hidden="true">›</span><span class="cr-item"><span>${cs.nombre}</span><button type="button" class="cr-up" data-up="calle" title="Quitar la calle" aria-label="Quitar la calle consultada">×</button></span>`;
  rest.innerHTML = h; rest.querySelectorAll('.cr-up').forEach(up=>{ up.onclick = ()=>{ const k=up.dataset.up;
    if (k==='calle'){ highlight=null; hideCard(); rerender(); renderInicio(); renderActions(); syncCalleBtns(); } else if (k==='col') clearColonia(); else clearAvenida(); }; });
}
$('cr-city').onclick = ()=>{ if (sel===null && selCol===null && selAv===null) return; selAv=null; highlight=null; selEl.value=''; setSel(''); };

// Buscador único: alcaldías, colonias, avenidas y calles, con abreviaturas y tolerancia a errores.
// ---------- buscador único ----------
const omni=$('omni'), omniList=$('omni-list'), omniClear=$('omni-clear');
const OMNI_AB = Object.assign({}, ABREV, {calz:'calzada', clz:'calzada', av:'avenida', avda:'avenida', ave:'avenida', blvd:'boulevard', cda:'cerrada', priv:'privada', and:'andador', circ:'circuito', cto:'circuito', dr:'doctor', ing:'ingeniero', lic:'licenciado', mtro:'maestro', pdte:'presidente', fco:'francisco', gpe:'guadalupe', ma:'maria', col:'colonia', sn:'san', sta:'santa', sto:'santo'});
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
  OM = { alc: META.munNames.map(toks), col: META.colonias.map(c=> c.n? toks(c.n + (c.cat? ' '+c.cat : '')) : null), colUT: META.colonias.map(c=> c.ut? toks(c.ut) : null), av: VPC.nomenclat.map(toks), avRV: [] };
  const stat = new Map();
  for(let i=0;i<N;i++){ if (F.gc[i]) continue; const nid=F.name[i]; if (PLACEHOLDER.has(nid)) continue; let s=stat.get(nid); if(!s){ s={cols:new Map(), kmp:0, muns:new Set()}; stat.set(nid,s); }
    const k = esPrio(F.prio[i])? F.len[i]/1000 : 0; s.kmp+=k; s.cols.set(F.col[i], (s.cols.get(F.col[i])||0)+k); s.muns.add(F.mun[i]); }
  OM.stStat = stat; OM.stIds = [...stat.keys()]; OM.st = OM.stIds.map(nid=>toks(META.names[nid]));
  // colonias homónimas (mismo nombre, CP y alcaldía): se numeran
  const seen = new Map(); OM.part = new Map();
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const k=c.n+'|'+(c.cp||'')+'|'+c.m; const a=seen.get(k)||[]; a.push(i); seen.set(k,a); }
  for(const a of seen.values()) if (a.length>1) a.forEach((id,k)=>OM.part.set(id, [k+1, a.length]));
  // mismo nombre en la misma alcaldía, con otro CP
  const nm = new Map(); for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const k=c.n+'|'+c.m; nm.set(k, (nm.get(k)||0)+1); }
  OM.nomRep = new Set([...nm].filter(([,n])=>n>1).map(([k])=>k));
  return OM; }
// Nombre de una colonia que no se confunde con otra de su alcaldía: «parte k de n» si comparte nombre y CP, o su CP
// si solo comparte el nombre. Se usa en nombres de archivo, títulos de fichas y «Ámbito consultado».
function colNombre(id){ const c = META.colonias[id]; if (!c) return ''; const I = omniIndex(); const pt = I.part.get(id);
  if (pt) return `${c.n} (parte ${pt[0]} de ${pt[1]})`;
  if (I.nomRep.has(c.n+'|'+c.m) && c.cp) return `${c.n} (CP ${c.cp.padStart(5,'0')})`;
  return c.n; }
let omniItems=[], omniActive=-1, omniTodas=false;
function omniSearch(q){
  let qt = toks(q).filter(t=>!STOP.has(t)); if (!qt.length || q.trim().length<2) return null;
  // «col.» o «colonia» delante del nombre es una forma de hablar, no parte del nombre
  const qtCol = (qt.length>1 && qt[0]==='colonia')? qt.slice(1) : qt;
  const I = omniIndex(); omniTypo=false; const R = {alc:[], col:[], av:[], st:[]};
  I.alc.forEach((ct,i)=>{ const s=omniMatch(qt,ct); if(s) R.alc.push({t:'alc', i, s: s+1.5}); });
  for(let i=1;i<I.col.length;i++){ if(!I.col[i]) continue; let s=omniMatch(qtCol,I.col[i]), via='';
    // colonia + alcaldía: «los reyes coyoacan». Parte de las palabras nombra la colonia y el resto, su alcaldía
    if(!s && qtCol.length>=2){ const al = I.alc[munIndex[META.colonias[i].m]] || []; const enCol = qtCol.filter(t=>I.col[i].some(c=>tokScore(t,c)>=1.5)), resto = qtCol.filter(t=>!enCol.includes(t));
      if (enCol.length && resto.length && omniMatch(resto, al)){ s = omniMatch(enCol, I.col[i]); if (s) s += 0.4; } }
    if (s && sel!==null && munIndex[META.colonias[i].m]===sel) s += 0.3;   // primero las de la alcaldía consultada
    if(!s && I.colUT[i]){ s=omniMatch(qt,I.colUT[i]); if(s){ s-=1; via=META.colonias[i].ut; } } if(s) R.col.push({t:'col', i, s: s+0.5, via}); }
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
  R.alc=R.alc.slice(0,3); R.nCol = R.col.length; R.col=R.col.slice(0, omniTodas? 40 : 6); R.av=R.av.slice(0,4); R.st=R.st.slice(0,5);
  const expanded = norm(q).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>OMNI_AB[t] && OMNI_AB[t]!==t).map(t=>`«${t}» como «${OMNI_AB[t]}»`);
  R.qt = qt; R.why = [expanded.length? 'Se reconoció '+expanded.join(', ')+'.' : '', omniTypo? 'Incluye coincidencias aproximadas (una letra de diferencia).' : ''].filter(Boolean).join(' ');
  return R; }
// Coordenadas pegadas en el buscador: decimales («19.3000, -99.1019», también con ; o al revés), grados-minutos-segundos
// («19°14'29.7"N 98°59'59.1"W»), enlaces largos de Google Maps (…?q=lat,lon · …/@lat,lon,17z · …!3dlat!4dlon · ll=) y «geo:lat,lon».
// Devuelve {lat, lon}, {corto:true} (enlace corto: no trae las coordenadas) o null.
function leeCoordenadas(q){
  const s = q.trim(); if (s.length<5) return null;
  const par = (a, b)=>{ a=+a; b=+b; if (!isFinite(a) || !isFinite(b)) return null;
    if (Math.abs(a)>90 && Math.abs(b)<=90) [a, b] = [b, a];                                   // longitud primero
    if (a<-97 && a>-100.5 && b>18 && b<21) [a, b] = [b, a];                                   // en México, -99 es longitud
    return Math.abs(a)<=90 && Math.abs(b)<=180? {lat:a, lon:b} : null; };
  const N = '(-?\\d+(?:\\.\\d+)?)';
  if (/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(s)) return {corto:true};
  let m = s.match(new RegExp('!3d'+N+'!4d'+N)) || s.match(new RegExp('@'+N+','+N)) || s.match(new RegExp('[?&](?:q|query|ll|destination|center)='+N+'(?:,|%2C)\\s*'+N, 'i')) || s.match(new RegExp('^geo:'+N+','+N, 'i'));
  if (m) return par(m[1], m[2]);
  const g = [...s.matchAll(/(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′’]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:["″”]|'')\s*)?([NSEOW])/gi)];
  if (g.length===2){ const v = x=> (+x[1] + (+x[2]||0)/60 + (+x[3]||0)/3600) * (/[SWO]/i.test(x[4])? -1 : 1), esLat = x=> /[NS]/i.test(x[4]);
    if (esLat(g[0])!==esLat(g[1])) return esLat(g[0])? par(v(g[0]), v(g[1])) : par(v(g[1]), v(g[0])); }
  const D = '(-?\\d+\\.\\d+)';   // sueltos, con punto decimal: «19 99» o «10 20» son parte de una dirección, no coordenadas
  m = s.match(new RegExp('^\\(?\\s*'+D+'\\s*(?:[,;]\\s*|\\s+)'+D+'\\s*\\)?$'));
  return m? par(m[1], m[2]) : null; }
function omniMark(name, qt){ return name.split(/(\s+)/).map(w=>{ const n=toks(w)[0]||''; return (n && qt.some(q=>tokScore(q,n)>=1.5))? `<mark>${w}</mark>` : w; }).join(''); }
function omniRender(){
  omniList.innerHTML=''; omniItems=[]; omniActive=-1;
  const co = leeCoordenadas(omni.value);
  if (co){ const li=document.createElement('li');
    if (co.corto){ li.className='empty'; li.textContent='Ese enlace corto no trae las coordenadas: ábrelo en Google Maps, toca el punto y copia los números que aparecen (por ejemplo, 19.3000, -99.1019).'; }
    else { const w = whereAmI(co.lon, co.lat); li.className='opt'; li.setAttribute('role','option'); li.setAttribute('aria-selected','false'); li.id='om-0';
      li.innerHTML = `<span class="ty">Punto</span><span class="nm">Ir a ${crd(co.lat)}, ${crd(co.lon)}</span><span class="m">${w.alc===null? 'Fuera de la Ciudad de México' : (w.col!==null? META.colonias[w.col].n+' · ' : '')+META.munNames[w.alc]}</span>`;
      omniItems.push({t:'pto', ...co}); li.onmousedown = e=>{ e.preventDefault(); omniPick(omniItems[0]); }; }
    omniList.appendChild(li); omniMuestra(); return; }
  const R = omniSearch(omni.value);
  if (!R){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); return; }
  const groups = [['alc','Alcaldías'],['col','Colonias'],['av','Avenidas · Gobierno Central'],['st','Calles · alcaldías']].filter(([k])=>R[k].length).sort((a,b)=> R[b[0]][0].s - R[a[0]][0].s);
  if (!groups.length){ omniList.innerHTML = `<li class="empty">Sin coincidencias. Prueba con menos palabras o con otra forma del nombre.</li>`; omniMuestra(); return; }
  const I = omniIndex();
  for (const [k,title] of groups){ const g=document.createElement('li'); g.className='grp'; g.setAttribute('role','presentation'); g.textContent=title; omniList.appendChild(g);
    for (const it of R[k]){ const li=document.createElement('li'); li.className='opt'; li.setAttribute('role','option'); li.setAttribute('aria-selected','false'); li.id='om-'+omniItems.length; let html='';
      if (it.t==='alc'){ const d=domOf(it.i); html = `<span class="ty">Alc</span><span class="nm">${omniMark(META.munNames[it.i], R.qt)}</span><span class="k">${kmFull(kmPrio(summOf(it.i)))} prior.</span><span class="m">Prioridad predominante ${META.prio[d]}</span>`; }
      else if (it.t==='col'){ const c=META.colonias[it.i]; const pt=I.part.get(it.i); html = `<span class="ty">Col</span><span class="nm">${omniMark(c.n, R.qt)}${pt? ` <small>· parte ${pt[0]} de ${pt[1]}</small>`:''}</span><span class="k">${c.p>=0? META.prio[c.p] : '—'}</span><span class="m">${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${it.via? ` · coincide con su unidad territorial: ${it.via}`:''}</span>`; }
      else if (it.t==='av'){ const s=avStat(it.a); html = `<span class="ty">Av</span><span class="nm">${omniMark(VPC.nomenclat[it.a], R.qt)}</span><span class="k">${kmFull(s.kmp)} prior.</span><span class="m">${redesTxt(s.nombres)? redesTxt(s.nombres)+' · ' : ''}cruza ${s.muns.size} alcaldía${s.muns.size===1?'':'s'}${it.via? ` · coincide con la red vial ${it.via}`:''}</span>`; }
      else { const s=I.stStat.get(it.nid); const cols = it.col? [it.col] : [...s.cols.keys()].filter(Boolean); const one = cols.length===1;
        html = `<span class="ty">Calle</span><span class="nm">${omniMark(META.names[it.nid], R.qt)}</span><span class="k">${kmFull(it.col? s.cols.get(it.col) : s.kmp)} prior.</span><span class="m">${one? META.colonias[cols[0]].n+' · '+META.munNames[it.col? munIndex[META.colonias[it.col].m] : [...s.muns][0]] : `${fmt.format(cols.length)} calles con este nombre en ${s.muns.size===1? 'distintas colonias' : fmt.format(s.muns.size)+' alcaldías'} · elige cuál en «Dónde empezar»`}</span>`; }
      li.innerHTML = html; const n=omniItems.length; omniItems.push(it);
      li.onmousedown = e=>{ e.preventDefault(); omniPick(omniItems[n]); }; omniList.appendChild(li); } }
  if (R.nCol>R.col.length){ const v=document.createElement('li'); v.className='mas'; v.setAttribute('role','option'); v.textContent=`Ver las ${fmt.format(Math.min(R.nCol,40))} colonias que coinciden`; v.onmousedown=e=>{ e.preventDefault(); omniTodas=true; omniRender(); }; omniList.appendChild(v); }
  if (R.why){ const w=document.createElement('li'); w.className='why'; w.setAttribute('role','presentation'); w.textContent=R.why; omniList.appendChild(w); }
  omniMuestra(); }
// la lista llega hasta el borde de lo visible (en el celular, hasta el teclado) y avisa si hay más resultados abajo
function omniAlto(){ if (omniList.hidden) return; const v = window.visualViewport, fondo = v? v.offsetTop + v.height : innerHeight;
  document.documentElement.style.setProperty('--omni-max', Math.max(140, Math.floor(fondo - omniList.getBoundingClientRect().top - 8))+'px'); omniMas(); }
function omniMas(){ omniList.classList.toggle('hay-mas', omniList.scrollTop + omniList.clientHeight < omniList.scrollHeight - 6); }
function omniMuestra(){ omniList.hidden=false; omni.setAttribute('aria-expanded','true'); omniList.scrollTop=0; omniAlto(); }
omniList.addEventListener('scroll', omniMas, {passive:true}); addEventListener('resize', omniAlto);
if (window.visualViewport){ visualViewport.addEventListener('resize', omniAlto); visualViewport.addEventListener('scroll', omniAlto); }
function omniSetActive(i){ const lis=[...omniList.querySelectorAll('li.opt')]; if(!lis.length) return; omniActive=(i+lis.length)%lis.length;
  lis.forEach((l,k)=>{ l.classList.toggle('active',k===omniActive); l.setAttribute('aria-selected', String(k===omniActive)); }); lis[omniActive].scrollIntoView({block:'nearest'}); omni.setAttribute('aria-activedescendant', lis[omniActive].id); }
function omniClose(){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); omni.removeAttribute('aria-activedescendant'); }
function omniPick(it){
  omniClose(); omni.value=''; omniClear.hidden=true; omni.blur();
  if (it.t==='pto'){ irAPunto(it.lon, it.lat); return; }
  if (ptoBuscado){ ptoBuscado = null; rerender(); }
  if (it.t==='alc'){ if (isGC() && selAv!==null){ selAv=null; highlight=null; } selEl.value=String(it.i); setSel(String(it.i)); }
  else if (it.t==='col'){ pickColonia(it.i); }
  else if (it.t==='av'){ pickAvenida(it.a); }
  else { const s=omniIndex().stStat.get(it.nid); if (isGC()) setResp('alc');
    const cols = it.col? [it.col] : [...s.cols.keys()].filter(Boolean);
    if (cols.length===1){ pickColonia(cols[0]); const key=it.nid*4096+cols[0]; const st=streetIdx.get(key); if (st){ highlightStreet(key, st); } setTab('ini'); renderInicio(); }
    else { const muns=[...s.muns]; if (muns.length===1){ if (sel!==muns[0] || selCol!==null){ selEl.value=String(muns[0]); setSel(String(muns[0])); } } else if (sel!==null || selCol!==null){ selEl.value=''; setSel(''); }
      $('q').value = META.names[it.nid]; iniN = 10; renderInicio(); setTab('ini');
      // varias calles con el mismo nombre: se resaltan todas y el mapa se acerca a ellas
      const idx = []; for (const st of streetIdx.values()) if (st.nid===it.nid) for (const i of st.idx) idx.push(i);
      if (idx.length) highlightStreet('nombre-'+it.nid, {idx}); } }
  if (it.t==='st') verMapa({desdeLista:true}); else alaRespuesta();
  // el foco pasa al título de la respuesta: quien usa teclado o lector de pantalla continúa desde ahí
  setTimeout(()=>{ try { $('scope-title').focus({preventScroll: isPhone()}); } catch(e){} }, 0); }
omni.addEventListener('input', ()=>{ omniClear.hidden = !omni.value; omniTodas=false; omniRender(); });
omni.addEventListener('focus', ()=>{ if (isPhone()) document.body.classList.add('buscando'); if (omni.value.trim().length>=2) omniRender(); });
omni.addEventListener('blur', ()=> setTimeout(()=>{ omniClose(); document.body.classList.remove('buscando'); }, 150));
omni.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ e.preventDefault(); if (omniList.hidden) omniRender(); omniSetActive(omniActive+1); }
  else if (e.key==='ArrowUp'){ e.preventDefault(); omniSetActive(omniActive-1); }
  else if (e.key==='Enter'){ if (!omniList.hidden && omniItems.length){ e.preventDefault(); omniPick(omniItems[omniActive>=0? omniActive : 0]); } }
  else if (e.key==='Escape'){ if (!omniList.hidden){ e.stopPropagation(); omniClose(); } else if (omni.value){ omni.value=''; omniClear.hidden=true; } } });
omniClear.onclick = ()=>{ omni.value=''; omniClear.hidden=true; omniClose(); omni.focus(); };

// Mi ubicación: GPS del teléfono, colonia donde está la persona y tramos prioritarios cercanos. La posición no sale del dispositivo.
// ---------- Mi ubicación (GPS del teléfono; la posición no sale del dispositivo) ----------
let locFollow = false, locWatch = null, locLastSel = null, locLastUpd = 0;
// Reglas de prudencia: con más de LOC_PRECISO metros de incertidumbre la respuesta se presenta como aproximada;
// una respuesta del GPS que llega después de que la persona hizo otra consulta se ignora (locReq);
// y si la persona cambia de ámbito a mano, el seguimiento deja de mover la consulta (locAuto).
const LOC_PRECISO = 100; let locReq = 0, locAuto = true;
function locManual(){ locAuto = false; if (locBtn.classList.contains('busy')){ locReq++; locBtn.classList.remove('busy'); } }
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
      if (esPrio(F.prio[i]) && d<=R) out.push({k:'fr', i, d, dx, dy}); }
    if (respOn.gc) for(let i=0;i<NV;i++){ const x=VMID[2*i], y=VMID[2*i+1]; if (Math.abs(x-lon)>dLon+0.01 || Math.abs(y-lat)>dLat+0.01) continue;
      const [d,dx,dy] = pathDist(VPOS, vstart[i], vstart[i+1], lon, lat); if (d<any.d){ any.d=d; any.k='vp'; any.i=i; any.dx=dx; any.dy=dy; }
      if (esPrio(VP.prio[i]) && d<=R) out.push({k:'vp', i, d, dx, dy}); } };
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
// Colonia, «junto a» y calles prioritarias cercanas de un punto: el de la persona (Mi ubicación, yo = true) o uno buscado por
// coordenadas. Devuelve {fuera, html}; quien llama pone el encabezado, sus avisos y sus botones.
function zonaHtml(lon, lat, yo, aviso=''){
  const w = whereAmI(lon, lat);
  if (w.alc===null) return {fuera:true, html:`<h3>${yo? 'Estás fuera' : 'El punto está fuera'} de la Ciudad de México</h3><div class="empty-note"><b>La herramienta solo cubre las 16 alcaldías.</b> ${yo? 'Acércate a la ciudad o busca un territorio con el buscador.' : 'Revisa las coordenadas: primero va la latitud (19.xx) y después la longitud (−99.xx).'}</div>`};
  const col = w.col!==null? META.colonias[w.col] : null;
  const nb = nearby(lon, lat);
  const aqui = nb.any? (()=>{ const t = tramoLine(nb.any); return `<div class="loc-here">${yo? 'Junto a ti' : 'Junto al punto'}: <b>${t.nm}</b> · prioridad ${t.sub.split(' · ')[0]} · a ${distTxt(nb.any.d)}</div>`; })() : '';
  const cerca = yo? 'cerca de ti' : 'cerca del punto'; const tit = respOn.alc && respOn.gc? 'Tramos prioritarios '+cerca : respOn.gc? 'Vialidades primarias prioritarias '+cerca : 'Calles prioritarias '+cerca;
  const items = nb.list.map(o=>{ const t = tramoLine(o); return `<li><button type="button" data-k="${o.k}" data-i="${o.i}"><span class="pr" data-st="background:rgb(${t.c[0]},${t.c[1]},${t.c[2]})"></span><span class="t"><b>${t.nm}</b><span class="m">${t.sub}</span></span><span class="d">${distTxt(o.d)}<br><span class="m">${rumbo(o.dx, o.dy)}</span></span></button></li>`; }).join('');
  const lista = nb.list.length? `${nb.R>300? `<div class="cardnote">No hay tramos prioritarios a menos de 300 m; estos son los más cercanos.</div>`:''}<ol class="loc-list">${items}</ol>`
    : `<div class="empty-note"><b>No hay tramos prioritarios a menos de 1.5 km.</b> La zona ${yo? 'donde estás' : 'del punto'} no tiene frentes de prioridad Muy Alta, Alta o Media${respOn.gc && !respOn.alc? ' en vialidades primarias' : ''}.</div>`;
  return {fuera:false, html:`<h3>${yo? 'Estás en' : 'El punto está en'} ${col? col.n : 'una zona sin colonia identificada'}</h3><div class="sub">${META.munNames[w.alc]}${col && col.cp? ' · CP '+col.cp.padStart(5,'0') : ''}</div>`
    + aviso + aqui + `<h4 class="loc-h">${tit}</h4>` + lista};
}
function locHtml(){
  if (!myPos) return '';
  const p = myPos;
  const accTxt = `precisión ±${fmt0.format(Math.max(1, Math.round(p.acc)))} m`;
  const head = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i data-st="background:rgb(${LOC_BLUE})"></i>Tu ubicación · ${accTxt}</span>`;
  const privacy = `<div class="cardnote">Tu ubicación solo se usa en este teléfono; la herramienta no la envía ni la guarda. Si enciendes el satélite, su proveedor (Esri) recibe la zona del mapa que estás viendo.</div>`;
  // con cualquier precisión se responde colonia y calles cercanas (en computadora la ubicación viene de la red y puede errar cientos de metros); el aviso dice cuánto confiar
  const aviso = p.acc > LOC_PRECISO? `<div class="empty-note"><b>Ubicación aproximada (±${fmt0.format(Math.round(p.acc))} m).</b> En computadora la ubicación se calcula por la red y puede no ser exacta: la colonia y las calles son las del punto que indica el navegador. Si no es tu zona, busca la colonia por su nombre.</div>`
    : p.acc>50? `<div class="empty-note"><b>Ubicación aproximada.</b> El GPS indica ±${fmt0.format(Math.round(p.acc))} m; al aire libre la precisión mejora. Confirma el tramo en la calle.</div>` : '';
  const z = zonaHtml(p.lon, p.lat, true, aviso);
  return head + z.html + (z.fuera? '' : `<div class="acts"><button class="btn secondary act" id="loc-follow" type="button" aria-pressed="${locFollow}">${locFollow? 'Dejar de seguirme' : 'Seguirme mientras camino'}</button></div>`) + privacy;
}
function locMsg(title, body){ const c=$('card'); pinned={kind:'loc', i:0}; c.innerHTML = `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i data-st="background:rgb(${LOC_BLUE})"></i>Tu ubicación</span><h3>${title}</h3><div class="empty-note">${body}</div><div class="cardnote">Tu ubicación solo se usa en este teléfono; la herramienta no la envía ni la guarda. Si enciendes el satélite, su proveedor (Esri) recibe la zona del mapa que estás viendo.</div>`; const era=c.hidden; c.hidden=false; c.querySelector('.close').onclick=hideCard; if (era) enfocaFicha(); }
function wireLocCard(c){
  c.querySelectorAll('.loc-list button').forEach(b=> b.onclick = ()=>{ const k=b.dataset.k, i=+b.dataset.i; stopFollow();
    if (k==='fr'){ const cid=F.col[i]; if (cid && cid!==selCol){ keepView=true; pickColonia(cid); keepView=false; } showCard('fr', i); flyTo({...viewState, longitude:midLon(i), latitude:midLat(i), zoom:Math.max(viewState.zoom, 17.5)}, 700); }
    else { showCard('vp', i); const [la,lo]=vpMid(i); flyTo({...viewState, longitude:lo, latitude:la, zoom:Math.max(viewState.zoom, 17)}, 700); } });
  const f = c.querySelector('#loc-follow'); if (f) f.onclick = ()=> locFollow? stopFollow(true) : (locAuto = true, startFollow());
  const rt = c.querySelector('#loc-retry'); if (rt) rt.onclick = ()=>{ stopFollow(); locate(); };
}
function selectHere(){ // selecciona la colonia (modo Alcaldías) o la alcaldía (modo Gobierno Central) donde está la persona
  if (!locAuto) return;
  // con la ficha de un frente, tramo o colonia abierta no se cambia de colonia: se la cerraría a quien la está leyendo en campo.
  // Al cerrarla, la siguiente posición selecciona donde esté la persona.
  if (pinned && pinned.kind!=='loc') return;
  const w = whereAmI(myPos.lon, myPos.lat); const key = w.alc+'_'+w.col; if (key===locLastSel) return; locLastSel = key;
  if (w.alc===null) return;
  keepView = true; locSel = true;
  if (!isGC() && w.col!==null){ if (isPhone() && !showFrB) setLayer('fr', true); if (selCol!==w.col) pickColonia(w.col); }
  else if (sel!==w.alc || selCol!==null || selAv!==null){ selEl.value=String(w.alc); setSel(String(w.alc)); }
  keepView = false; locSel = false;
}
function showLoc(){ const c=$('card'); pinned={kind:'loc', i:0}; const era=c.hidden; c.innerHTML = locHtml(); c.hidden=false; c.querySelector('.close').onclick=hideCard; wireLocCard(c); if (era) enfocaFicha(); }
function onPos(pos, first){
  myPos = {lon:pos.coords.longitude, lat:pos.coords.latitude, acc:pos.coords.accuracy||0, t:Date.now()};
  locBtn.classList.add('on');
  const w = whereAmI(myPos.lon, myPos.lat); const wasLoc = first || (pinned && pinned.kind==='loc');
  const zAprox = Math.max(10.5, Math.min(15, 16 - Math.log2(Math.max(myPos.acc,1)/100)));   // con poca precisión, el mapa muestra toda la zona posible
  if (w.alc!==null){ selectHere(); if (first || locFollow) flyTo({...viewState, longitude:myPos.lon, latitude:myPos.lat, zoom: myPos.acc>LOC_PRECISO? zAprox : first? Math.max(viewState.zoom, 17) : viewState.zoom, bearing:0, pitch:0}, first? 900 : 500); }
  rerender();
  if (wasLoc || (pinned && pinned.kind==='loc')) showLoc();
}
function locError(e){
  locBtn.classList.remove('busy'); stopFollow();
  const enMarco = window.self!==window.top;
  if (e && e.code===1) locMsg('No se permitió usar tu ubicación', enMarco? '<b>Esta vista incrustada no puede pedir la ubicación.</b> Abre la herramienta directamente en el navegador de tu teléfono.' :
    '<b>Actívala y vuelve a tocar el botón.</b> Android (Chrome): toca el candado junto a la dirección › Permisos › Ubicación › Permitir. iPhone: Ajustes › Privacidad y seguridad › Localización › Safari › Mientras se usa la app; después recarga la página.');
  else if (e && e.code===3) locMsg('El GPS tardó demasiado', '<b>Intenta de nuevo al aire libre.</b> Dentro de edificios la señal es débil.');
  else locMsg('No se pudo obtener tu ubicación', '<b>Revisa que la ubicación del teléfono esté encendida</b> y vuelve a intentarlo.');
}
function locate(){
  if (!navigator.geolocation || !window.isSecureContext){ locMsg('Tu navegador no permite usar la ubicación', '<b>Abre la herramienta desde su dirección segura (https)</b> en Chrome o Safari.'); return; }
  locBtn.classList.add('busy'); locMsg('Buscando tu ubicación…', 'El navegador puede pedirte permiso. <b>Tu ubicación solo se usa en este teléfono.</b><div class="acts"><button class="btn secondary act" id="loc-cancel" type="button">Cancelar</button></div>');
  locLastSel = null; locAuto = true; const req = ++locReq;
  const cn = $('card').querySelector('#loc-cancel'); if (cn) cn.onclick = ()=>{ locReq++; locBtn.classList.remove('busy'); hideCard(); };
  // si mientras tanto la persona hizo otra consulta o canceló, la respuesta del GPS ya no se aplica
  navigator.geolocation.getCurrentPosition(p=>{ if (req!==locReq) return; locBtn.classList.remove('busy'); onPos(p, true); }, e=>{ if (req!==locReq) return; locError(e); }, {enableHighAccuracy:true, timeout:20000, maximumAge:15000});
}
function startFollow(){ if (!navigator.geolocation) return; locFollow = true; locBtn.classList.add('follow'); locBtn.setAttribute('aria-pressed','true'); locBtn.title='Dejar de seguir mi ubicación';
  if (myPos) flyTo({...viewState, longitude:myPos.lon, latitude:myPos.lat}, 500);
  if (locWatch===null) locWatch = navigator.geolocation.watchPosition(p=>{ const now=Date.now(); const moved = !myPos || Math.hypot(...metersXY(p.coords.longitude, p.coords.latitude, myPos.lon, myPos.lat)) > 8; if (!moved && now-locLastUpd<4000) return; locLastUpd = now; onPos(p, false); }, e=>{ if (e && e.code===1) locError(e); /* sin señal momentánea: se conserva la última posición */ }, {enableHighAccuracy:true, maximumAge:5000, timeout:30000});
  if (pinned && pinned.kind==='loc') showLoc(); }
function stopFollow(redraw){ locFollow = false; locBtn.classList.remove('follow'); locBtn.setAttribute('aria-pressed','false'); locBtn.title='Mi ubicación';
  if (locWatch!==null){ navigator.geolocation.clearWatch(locWatch); locWatch = null; }
  if (redraw && pinned && pinned.kind==='loc') showLoc(); }
locBtn.onclick = ()=>{ if (locBtn.classList.contains('busy')) return; if (!myPos) locate(); else if (!locFollow) { locLastSel = null; locAuto = true; startFollow(); if (!(pinned && pinned.kind==='loc')) showLoc(); } else stopFollow(true); };
// arrastrar el mapa suspende el seguimiento, como en las apps de mapas
mapEl.addEventListener('pointermove', e=>{ if (locFollow && e.buttons && pdown && Math.hypot(e.clientX-pdown[0], e.clientY-pdown[1])>12) stopFollow(true); });
// ---------- punto buscado por coordenadas (buscador) ----------
// La gente comparte ubicaciones por WhatsApp desde Google Maps: el buscador acepta esas coordenadas (leeCoordenadas en 14_buscador.js)
// y responde como «Mi ubicación»: colonia, lo que hay junto al punto y las calles prioritarias cercanas. Las coordenadas no salen del navegador.
const crd = (v, n=5)=> v.toFixed(n).replace('-', '−');
function puntoHtml(){ const p = ptoBuscado; if (!p) return '';
  const z = zonaHtml(p.lon, p.lat, false);
  return `<button class="close" aria-label="Cerrar">×</button><span class="pill"><i data-st="background:var(--guinda)"></i>Punto buscado · ${crd(p.lat)}, ${crd(p.lon)}</span>` + z.html
    + `<div class="cardnote">Las coordenadas se buscan en este navegador; la herramienta no las envía ni las guarda.</div>`; }
function irAPunto(lon, lat){
  stopFollow(); ptoBuscado = {lon, lat}; const w = whereAmI(lon, lat);
  if (w.alc!==null){ keepView = true;
    if (!isGC() && w.col!==null){ if (selCol!==w.col) pickColonia(w.col); }
    else if (sel!==w.alc || selCol!==null || selAv!==null){ selEl.value=String(w.alc); setSel(String(w.alc)); }
    keepView = false;
    flyTo({...viewState, longitude:lon, latitude:lat, zoom:Math.max(viewState.zoom, 17), bearing:0, pitch:0}, 900); }
  rerender();
  const c=$('card'); pinned={kind:'pto', i:0}; c.innerHTML = puntoHtml(); c.hidden=false;
  c.querySelector('.close').onclick = ()=>{ ptoBuscado = null; hideCard(); rerender(); }; wireLocCard(c); verMapa({desdeLista:true}); enfocaFicha(); }

// Arranque: estado inicial de la herramienta.
// ---------- arranque ----------
if (isPhone()) setLayer('fr', false);   // en pantallas chicas se dibujan primero las colonias
document.body.dataset.resp = resp;
fondoUI(fondo);   // botones y atribución del fondo con que abre (FONDO_INICIAL)
setSel('');
setTab('ini');
pantalla('info');   // la página se abre en la información
// consulta indicada en la dirección (enlace compartido o recarga); después, cada cambio de consulta se anota en el historial.
// Con el filtro «Espacio» en la dirección (e=), sus datos se esperan antes: así la página abre ya filtrada (si no llegan, lo avisa).
if (INV && espDeTexto(new URLSearchParams(location.search).get('e'))) await espCargar().catch(()=>{});
aplicarURL();
// sin consulta en la dirección: se abre en la última alcaldía consultada; si es la primera visita, se pregunta el territorio
let preguntaEntrada = false;
{ const p = new URLSearchParams(location.search); if (!['a','c','v','r'].some(k=>p.has(k))){ const g = leeInicio(), m = g===null? undefined : munIndex[g];
    if (m!==undefined || g==='ciudad'){ const r = leeRed(); if (resp!==r) setResp(r); if (m!==undefined){ selEl.value = String(m); setSel(String(m)); } } else preguntaEntrada = true; } }
restaurando = false;
usoConsulta();   // la alcaldía con que abre (recordada o del enlace) también es una consulta (solo con sesión)
try { history.replaceState({consulta:true}, '', urlEstado()); } catch(e){}
// errores inesperados después de cargar: se avisa en lugar de fallar en silencio
addEventListener('unhandledrejection', e=>{ console.error(e.reason); avisoMapa('<b>Ocurrió un error inesperado.</b> Si algo dejó de responder, recarga la página.', true); });
// Uso sin conexión después de la primera visita: un proceso de servicio guarda en este navegador los
// archivos de la propia herramienta (programas, datos, tipografías y generadores de Excel y PDF). No guarda consultas ni datos personales.
// Detrás de un inicio de sesión (SESION.inicio definido) NO se guarda copia: una copia local se abriría sin sesión. Si quedó una
// de antes, se retira.
if ('serviceWorker' in navigator && window.SIA_LIBS && /^https?:$/.test(location.protocol) && window.self===window.top){
  if (SESION.inicio){ navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(()=>{});
    if (window.caches) caches.keys().then(ks => ks.filter(k => k.startsWith('calles-')).forEach(k => caches.delete(k))).catch(()=>{}); }
  else navigator.serviceWorker.register('sw.js').catch(()=>{}); }
if (preguntaEntrada) abreEntrada();

// Recorrido guiado: una visita de un minuto por la herramienta. Un foco ilumina cada control y un globo explica para qué
// sirve. Arranca solo la primera vez (después de la entrada, si la hay) y se repite desde «Cómo funciona». Insiste en la banqueta y
// en Street View: la pre-evaluación desde la oficina decide qué calles se visitan y cuáles requieren reconocimiento en sitio.
// Lo único que guarda es que ya se vio (cp_recorrido en este navegador).
const CLAVE_REC = 'cp_recorrido';
const recVisto = ()=>{ try { return !!localStorage.getItem(CLAVE_REC); } catch(e){ return true; } };   // sin almacenamiento no se impone en cada visita
const recMarca = ()=>{ try { localStorage.setItem(CLAVE_REC, 'visto'); } catch(e){} };
let REC = null;   // recorrido en curso: {k, velo, foco, globo, origen, ficha}

// frente prioritario de la consulta para mostrar una ficha real: con nombre de calle, el de mayor prioridad, con banqueta si hay, y el más largo
function recFrente(){ let b = -1, bs = -1;
  for(let i=0;i<N;i++){ if (F.gc[i] || !esPrio(F.prio[i]) || !enAmbito(i) || sinNombreFr(i)) continue; const s = F.prio[i]*1e6 + (conBanq(i)? 5e5 : 0) + F.len[i]; if (s>bs){ bs=s; b=i; } }
  return b; }
function recTramo(){ let b = -1, bs = -1;
  for(let i=0;i<NV;i++){ if (!esPrio(VP.prio[i]) || !enAmbitoVP(i)) continue; const s = VP.prio[i]*1e6 + VP.len[i]; if (s>bs){ bs=s; b=i; } }
  return b; }
function recFicha(){ if (isGC()){ const i = recTramo(); if (i<0) return false; const [la,lo] = vpMid(i); flyTo({...viewState, longitude:lo, latitude:la, zoom:Math.max(viewState.zoom, 16)}, 0); showCard('vp', i); }
  else { const i = recFrente(); if (i<0) return false; flyTo({...viewState, longitude:midLon(i), latitude:midLat(i), zoom:Math.max(viewState.zoom, 16.5)}, 0); showCard('fr', i); }
  REC.ficha = true; return true; }

// pasos: sel = control que se ilumina (el primero visible de la lista); panel/mapa = qué debe verse en teléfono; si = condición;
const REC_PASOS = [
  { titulo:'Modelo de priorización de reforestación urbana', texto:'En un minuto te mostramos cómo encontrar las calles que conviene reforestar primero, cómo separar las que tienen banqueta y cómo revisarlas antes de salir a campo.' },
  { sel:'.omni', panel:true, titulo:'Busca un lugar', texto:'Escribe una alcaldía, una colonia, una avenida o una calle. Bastan algunas palabras y se reconocen abreviaturas como «Av.» o «Calz.».' },
  { sel:'.resp-row', panel:true, titulo:'Quién atiende', texto:'Alcaldías: las calles y frentes de manzana que planta cada alcaldía. Gobierno Central: las vialidades primarias. Puedes activar las dos.' },
  { sel:'#banq-row', panel:true, si:()=>!isGC(), titulo:'Banqueta: decide qué visitar', texto:'«Con banqueta» reúne los frentes donde INEGI 2020 registra banqueta: son los de plantación directa. «Sin banqueta» reúne los que no la registran o no tienen dato: no se descartan, requieren reconocimiento en sitio. El mapa, las cifras y las descargas siguen la opción que elijas; el Resumen muestra siempre el desglose completo. Debajo, «Espacio» deja solo los frentes con cepa vacante, tocón o árbol muerto ya inventariados.' },
  { sel:'#crumb', panel:true, titulo:'Tu territorio', texto:'Aquí cambias de alcaldía o vuelves a toda la ciudad. Cuando eliges una colonia o una calle, aparece en esta ruta y puedes quitarla con la ×.' },
  { sel:'.tabs', panel:true, titulo:'Dónde empezar, cifras y descargas', texto:'«Dónde empezar» propone un orden de atención; con «Mostrar» eliges si ver colonias, calles, avenidas o alcaldías, y puedes buscar una calle por su nombre. Al elegir una calle aparecen sus tramos. «Resumen» da las cifras y el desglose por banqueta; «Más detalles» amplía cada dato. «Descargas» tiene los archivos.' },
  { sel:'#ver-mapa', panel:true, si:()=>isPhone(), titulo:'Información y mapa', texto:'En el celular son dos pantallas. «Ver el mapa» te lleva al mapa; desde ahí, el botón de abajo «Volver a la información» te regresa a las cifras y listas, y dice qué lugar consultas.' },
  { sel:'#leymini, #zcapas', mapa:true, titulo:'Colores del mapa y capas', texto:'Del rojo oscuro (Muy Alta) al crema (Muy Baja): es la prioridad de reforestación de cada colonia y de cada calle. Toca esta barra o el botón de capas para elegir qué ver (alcaldías, colonias o calles), ocultar prioridades y encender un mapa de fondo de calles o satélite.' },
  { sel:'#card .field-acts a[href*="pano"]', mapa:true, lado:'#card', prep:recFicha, titulo:'Pre-evalúa con Street View', texto:'Toca cualquier calle del mapa para abrir su ficha: prioridad, banqueta según INEGI y coordenadas. Antes de salir, abre Street View y revisa si hay banqueta, si su ancho permite plantar y si hay cocheras, postes, cables o árboles. Así decides qué calles visitar y cuáles necesitan reconocimiento en sitio.' },
  { sel:'#panel-actions, #tab-dl', panel:true, titulo:'Tu lista de campo', texto:'Elige una alcaldía o una colonia y descarga su listado en Excel y su ficha PDF. En «Descargas» también están los archivos para abrir en Google Earth (KML). Todos respetan los filtros de banqueta y de espacio.' },
  { sel:'#zloc', mapa:true, titulo:'En campo', texto:'«Mi ubicación» dice en qué colonia estás y qué calles prioritarias tienes cerca. Tu ubicación no sale del teléfono.' },
  { sel:'#open-info, #info-btn', panel:true, titulo:'Cuando lo necesites', texto:'En «Cómo funciona» están la ayuda, la metodología del modelo y el botón para repetir este recorrido.' },
];
const recVisible = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
const recObjetivo = sel => { for (const s of sel.split(',')){ const e = document.querySelector(s.trim()); if (recVisible(e)) return e; } return null; };
const recPasos = () => REC_PASOS.filter(p => !p.si || p.si());

function recColoca(){ if (!REC) return; const p = REC.lista[REC.k], g = REC.globo, f = REC.foco;
  const e = p.sel? recObjetivo(p.sel) : null; const W = innerWidth, H = innerHeight, M = 12;
  REC.velo.classList.toggle('sin-foco', !e); f.hidden = !e;
  const gw = Math.min(380, W - 2*M); g.style.width = gw + 'px'; const gh = g.offsetHeight;
  if (!e){ g.style.left = Math.round((W-gw)/2) + 'px'; g.style.top = Math.round(Math.max(M, (H-gh)/2)) + 'px'; return; }
  const r = e.getBoundingClientRect(), pad = 6;
  f.style.left = (r.left-pad) + 'px'; f.style.top = (r.top-pad) + 'px'; f.style.width = (r.width+2*pad) + 'px'; f.style.height = (r.height+2*pad) + 'px';
  // junto a un bloque que debe verse completo (la ficha del paso de Street View): a su izquierda, si hay espacio
  const c = p.lado? document.querySelector(p.lado) : null;
  if (c && recVisible(c)){ const q = c.getBoundingClientRect(); if (q.left - gw - 2*M >= 0){
    g.style.left = Math.round(q.left - gw - M) + 'px'; g.style.top = Math.round(Math.min(Math.max(M, r.bottom - gh), H - gh - M)) + 'px'; return; } }
  let top = r.bottom + pad + M; if (top + gh > H - M) top = r.top - pad - M - gh;   // abajo del control; si no cabe, arriba
  if (top < M) top = Math.max(M, H - gh - M);                                        // ni abajo ni arriba: al pie de la pantalla
  const left = Math.min(Math.max(M, r.left + r.width/2 - gw/2), W - gw - M);
  g.style.left = Math.round(left) + 'px'; g.style.top = Math.round(top) + 'px'; }

function recPaso(k){ const L = REC.lista; REC.k = k = Math.max(0, Math.min(k, L.length-1)); const p = L[k];
  if (REC.ficha && !p.prep){ hideCard(); REC.ficha = false; }
  if (isPhone() && (p.mapa || p.panel)) pantalla(p.mapa? 'mapa' : 'info');
  if (p.panel && document.body.classList.contains('panel-off')) $('panel-toggle').click();
  if (p.prep) p.prep();
  const g = REC.globo; g.querySelector('.rec-paso').textContent = `Paso ${k+1} de ${L.length}`;
  g.querySelector('h3').textContent = p.titulo; g.querySelector('p').textContent = p.texto;
  g.querySelector('.rec-ant').hidden = k===0; g.querySelector('.rec-sig').textContent = k===L.length-1? 'Terminar' : 'Siguiente';
  const e = p.sel? recObjetivo(p.sel) : null; if (e) e.scrollIntoView({block:'center', inline:'nearest'});
  recColoca(); setTimeout(recColoca, 380);   // de nuevo cuando terminan de moverse la hoja, el mapa o el desplazamiento
  g.querySelector('h3').focus(); }

function recorrido(){ if (REC) return; if (!entradaEl.hidden || !infoModal.hidden) return;
  const velo = document.createElement('div'); velo.className = 'rec-velo';
  const foco = document.createElement('div'); foco.className = 'rec-foco'; foco.setAttribute('aria-hidden', 'true');
  const globo = document.createElement('div'); globo.className = 'rec-globo'; globo.setAttribute('role', 'dialog'); globo.setAttribute('aria-modal', 'true'); globo.setAttribute('aria-labelledby', 'rec-titulo');
  globo.innerHTML = `<div class="rec-paso"></div><h3 id="rec-titulo" tabindex="-1"></h3><p aria-live="polite"></p>
    <div class="rec-acc"><button type="button" class="rec-salir">Salir del recorrido</button><button type="button" class="btn secondary rec-ant">Anterior</button><button type="button" class="btn rec-sig">Siguiente</button></div>`;
  document.body.append(velo, foco, globo);
  REC = { k:0, velo, foco, globo, origen:document.activeElement, ficha:false, lista:recPasos() };
  appEl.inert = true; document.body.classList.add('recorrido');
  globo.querySelector('.rec-salir').onclick = recFin;
  globo.querySelector('.rec-ant').onclick = ()=> recPaso(REC.k-1);
  globo.querySelector('.rec-sig').onclick = ()=> REC.k===REC.lista.length-1? recFin() : recPaso(REC.k+1);
  recPaso(0); }
function recFin(){ if (!REC) return; const R = REC; REC = null; recMarca();
  R.velo.remove(); R.foco.remove(); R.globo.remove(); appEl.inert = false; document.body.classList.remove('recorrido');
  if (R.ficha) hideCard(); if (isPhone()) verInfo();
  const o = R.origen; if (o && o.isConnected && o!==document.body) o.focus(); else $('scope-title').focus(); }
// teclado: Esc sale, flechas avanzan y retroceden, Tab no sale del globo. En captura, antes que el Esc general de 13_interfaz.js.
document.addEventListener('keydown', e=>{ if (!REC) return;
  if (e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); return recFin(); }
  if (e.key==='ArrowRight' && !e.altKey){ e.preventDefault(); return REC.k===REC.lista.length-1? recFin() : recPaso(REC.k+1); }
  if (e.key==='ArrowLeft' && !e.altKey){ e.preventDefault(); return recPaso(REC.k-1); }
  if (e.key==='Tab'){ const b = [...REC.globo.querySelectorAll('button')].filter(x=>!x.hidden); const i = b.indexOf(document.activeElement);
    e.preventDefault(); b[(i + (e.shiftKey? -1 : 1) + b.length) % b.length].focus(); } }, true);
addEventListener('resize', ()=>{ if (REC) recColoca(); });
// desde «Cómo funciona»
$('rec-abrir').onclick = ()=>{ closeInfo(); setTimeout(recorrido, 500); };
// primera vez: después de la entrada si se pregunta el territorio; si no, en cuanto se ve el mapa. En las pruebas automáticas
// solo arranca si se pide (window.SIA_RECORRIDO), para que no tape lo que revisan las demás pruebas.
if (!recVisto() && (!window.SIA_PRUEBA || window.SIA_RECORRIDO)){ if (preguntaEntrada) trasEntrada = recorrido; else setTimeout(recorrido, 900); }
})().catch(err=>{ console.error(err); window.SIA_LISTO = true; const l=document.getElementById('loader'); l.hidden=false; const d=l.querySelector('div'); d.textContent=''; const t=document.createElement('div'); t.className='cabin ld-tit'; t.textContent='No fue posible cargar la herramienta'; d.appendChild(t); const m=document.createElement('div'); m.className='ld-err'; m.setAttribute('role','alert'); m.textContent=(err && err.sesion)? err.amable + ' ' : ((err && err.amable) || 'Ocurrió un error al preparar la herramienta.') + ' Si el problema continúa, avisa al Sistema de Información Ambiental.'; d.appendChild(m); if (err && err.sesion && window.SIA_SESION && window.SIA_SESION.inicio){ const a=document.createElement('a'); a.href=window.SIA_SESION.inicio; a.textContent='Iniciar sesión'; m.appendChild(a); } const b=document.createElement('button'); b.type='button'; b.className='reintenta'; b.textContent='Reintentar'; b.onclick=()=>location.reload(); d.appendChild(b); });
