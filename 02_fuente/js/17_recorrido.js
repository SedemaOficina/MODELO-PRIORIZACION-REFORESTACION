// Recorrido guiado: una visita de unos dos minutos por la herramienta. Un foco ilumina cada control y un globo explica para qué
// sirve. Arranca solo la primera vez (después de la entrada, si la hay) y se repite desde «Cómo funciona». Insiste en la banqueta, en los
// espacios para plantar del inventario de arbolado y en Street View: la pre-evaluación desde la oficina decide qué calles se visitan y
// cuáles requieren reconocimiento en sitio. Lo único que guarda es que ya se vio (cp_recorrido en este navegador).
const CLAVE_REC = 'cp_recorrido';
const recVisto = ()=>{ try { return !!localStorage.getItem(CLAVE_REC); } catch(e){ return true; } };   // sin almacenamiento no se impone en cada visita
const recMarca = ()=>{ try { localStorage.setItem(CLAVE_REC, 'visto'); } catch(e){} };
let REC = null;   // recorrido en curso: {k, velo, foco, globo, origen, ficha, punto, leyenda, cuenta, lista}

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

// Espacio para plantar real para el paso del mapa: un punto del inventario de la consulta (alcaldía, colonia o avenida, con sus filtros),
// de preferencia una cepa vacante en un frente prioritario, donde se vean juntos varios tipos. Se ilumina el punto, sin abrir su ficha.
// Sin inventario (archivo único) o sin puntos en la consulta, el paso ilumina la sección «Espacios para plantar» del panel de capas.
function recCvePunto(){ if (sel!==null) return META.muns[sel];
  if (isGC() && selAv!==null){ const i = recTramo(); return i<0? null : META.muns[VP.mun[i]]; }
  let m = null, mv = -1; for (const [c, n] of Object.entries(INV.n)) if (n[0]>mv){ mv = n[0]; m = c; }   // toda la ciudad: la alcaldía con más cepas
  return m; }
function recEnConsulta(p){ const f = p.fr;
  const alc = f>=0 && !F.gc[f] && enAmbito(f), gc = (f>=0 && F.gc[f] && F.vp[f]>=0 && enAmbitoVP(F.vp[f])) || (f<0 && p.vp>=0 && enAmbitoVP(p.vp));
  return resp==='alc'? alc : resp==='gc'? gc : alc || gc; }
async function recPunto(){ if (!INV || !invOn.some(Boolean)) return null; const cve = recCvePunto(); if (!cve) return null;
  let P; try { P = await invDeAlc(cve); } catch(e){ return null; }
  // cuadrícula de unos 100 m: qué tipos y cuántos puntos hay alrededor; otra de unos 10 m: el punto elegido no debe quedar encimado
  // con otros (se cuentan los de su celda y las ocho vecinas, unos 30 m)
  const celda = (p, d) => Math.round(p.lon/d) + ',' + Math.round(p.lat/d), C = new Map(), E = new Map(), D = 1e-4;
  for (const p of P){ const k = celda(p, 1e-3), c = C.get(k) || {t:0, n:0}; c.t |= 1<<p.t; c.n++; C.set(k, c); const j = celda(p, D); E.set(j, (E.get(j) || 0) + 1); }
  const vecinos = p => { const x = Math.round(p.lon/D), y = Math.round(p.lat/D); let n = -1;
    for (let i=-1;i<=1;i++) for (let j=-1;j<=1;j++) n += E.get((x+i) + ',' + (y+j)) || 0; return n; };
  let b = null, bs = -Infinity;
  for (const p of P){ if (!invOn[p.t] || !recEnConsulta(p)) continue; const c = C.get(celda(p, 1e-3)), v = p.fr>=0? (F.gc[p.fr]? F.vp[p.fr] : -1) : p.vp;
    const pr = v>=0? VP.prio[v] : p.fr>=0? F.prio[p.fr] : 0;   // del Gobierno Central cuenta la prioridad del tramo, como en su ficha
    const s = (p.t===0? 4e4 : 0) + (esPrio(pr)? 2e4 : 0) + ((c.t&1) + (c.t>>1&1) + (c.t>>2&1))*1e3 + Math.min(c.n, 30)*10 - vecinos(p)*1.5e3;
    if (s>bs){ bs = s; b = p; } }
  return b; }
// marca invisible sobre el punto (el foco del recorrido la ilumina); se recoloca si cambia el tamaño de la pantalla
function recMarcaPunto(){ const m = REC && REC.punto; if (!m) return; const p = m.p, r = mapEl.getBoundingClientRect();
  const [x, y] = new WebMercatorViewport({...viewState, width:mapEl.clientWidth||800, height:mapEl.clientHeight||600}).project([p.lon, p.lat]);
  m.el.style.left = Math.round(r.left + x - 20) + 'px'; m.el.style.top = Math.round(r.top + y - 20) + 'px'; }
async function recEspacios(){ if (pinned) hideCard();
  const p = await recPunto();
  if (!REC || REC.lista[REC.k].prep!==recEspacios) return;   // ya se pasó a otro paso mientras llegaban los datos
  if (!p){ setLegend(true); REC.leyenda = true; return; }
  // el punto queda arriba del centro del mapa (a un tercio del alto): debajo cabe el globo y no lo tapa el aviso «Dibujando calles…»
  const z = invZ() + 1, w = mapEl.clientWidth||800, h = mapEl.clientHeight||600;
  const [lo, la] = new WebMercatorViewport({longitude:p.lon, latitude:p.lat, zoom:z, width:w, height:h}).unproject([w/2, h/2 + h/6]);
  flyTo({...viewState, longitude:lo, latitude:la, zoom:z}, 0); rerender();
  const el = document.createElement('div'); el.className = 'rec-punto'; el.setAttribute('aria-hidden', 'true');
  el.dataset.clave = invClave(p); el.dataset.tipo = INV_TIPOS[p.t].n; el.dataset.alc = p.a; document.body.append(el);
  REC.punto = {p, el}; recMarcaPunto(); }

// «Mi cuenta»: el menú se abre para que se vean sus opciones; recDeshace lo cierra (siguiente, anterior o salir)
function recCuenta(){ cuentaMenu(true); REC.cuenta = true; }

// pasos: sel = control que se ilumina (el primero visible de la lista); con = lo que se ilumina junto con él (el menú de «Mi cuenta»);
// panel/mapa = qué debe verse en teléfono; si = condición;
// prep = lo que se prepara antes (puede ser asíncrono: el globo se recoloca al terminar); texto puede depender de la consulta (función).
const REC_PASOS = [
  { titulo:'Modelo de priorización de reforestación urbana', texto:'En dos minutos te mostramos cómo encontrar las calles que conviene reforestar primero, dónde ya hay espacio para plantar y cómo revisarlas antes de salir a campo.' },
  { sel:'.omni', panel:true, titulo:'Busca un lugar', texto:'Escribe una alcaldía, una colonia, una avenida o una calle; bastan algunas palabras. También puedes pegar coordenadas o un enlace de Google Maps.' },
  { sel:'#crumb', panel:true, titulo:'Tu territorio', texto:'Aquí cambias de alcaldía o regresas a toda la ciudad. Cuando eliges una colonia, una calle o una avenida, aparece en esta ruta y la quitas con la ×.' },
  { sel:'.resp-row', panel:true, titulo:'Quién atiende', texto:'En «Atiende», «Alcaldías» muestra las calles y frentes de manzana que planta cada alcaldía, y «Gobierno Central», las vialidades primarias. Puedes marcar las dos.' },
  { sel:'#banq-row', panel:true, si:()=>!isGC(), titulo:'Banqueta: decide qué visitar', texto:'En «Banqueta», «Con» deja los frentes donde INEGI 2020 registra banqueta; ahí se planta directo. «Sin» deja los que no la registran o no tienen dato; no se descartan, requieren reconocimiento en sitio. El mapa, las cifras y las descargas siguen lo que elijas.' },
  { sel:'#esp-row', panel:true, si:()=>!!INV, titulo:'Espacio: dónde ya hay lugar', texto:'Marca «Cepa vacante», «Tocón» o «Árbol muerto» para dejar solo las calles donde el inventario de arbolado ya registró alguno: ahí ya hubo un árbol. Puedes marcar varios. El inventario está en curso: una calle sin registro puede no haberse revisado todavía.' },
  { sel:'.tabs', panel:true, titulo:'Dónde empezar, cifras y descargas', texto:()=> (isGC()
      ? '«Dónde empezar» propone un orden. En «Mostrar» eliges cómo: «Avenidas · más km prioritarios» o «Avenidas · más cepas vacantes», que pone primero las que ya tienen cepas en tramos prioritarios.'
      : '«Dónde empezar» propone un orden. En «Mostrar» eliges cómo: por ejemplo, «Colonias · más km prioritarios» o «Colonias · más cepas vacantes», que pone primero donde ya hay cepas en calles prioritarias.')
      + ' «Resumen» da las cifras' + (isGC()? ' del Gobierno Central' : ' de la alcaldía y del Gobierno Central') + '; «Más detalles» amplía cada dato. «Descargas» tiene los archivos.' },
  { sel:'#ver-mapa', panel:true, si:()=>isPhone(), titulo:'Información y mapa', texto:'En el celular son dos pantallas. «Ver el mapa» te lleva al mapa; ahí, el botón de abajo, «Volver a la información», te regresa a las cifras y listas, y dice qué lugar consultas.' },
  { sel:'#leymini, #zcapas', mapa:true, titulo:'Colores del mapa y capas', texto:'Del rojo oscuro (Muy Alta) al crema (Muy Baja): es la prioridad de cada colonia y de cada calle. Toca esta barra o el botón de capas para elegir qué ver, ocultar prioridades, poner el fondo «Calles» o «Satélite» y mostrar u ocultar los espacios para plantar.' },
  { sel:'#card .field-acts a[href*="pano"]', mapa:true, lado:'#card', prep:recFicha, titulo:'Pre-evalúa con Street View', texto:'Toca una calle del mapa para abrir su ficha: prioridad, banqueta según INEGI y coordenadas. Antes de salir, abre Street View y revisa si hay banqueta, si su ancho permite plantar y si hay cocheras, postes, cables o árboles. Así decides qué calles visitar y cuáles necesitan reconocimiento en sitio.' },
  { sel:'.rec-punto, #inv-sec', mapa:true, prep:recEspacios, titulo:'Espacios para plantar', texto:'Al acercar el mapa a nivel de calle aparecen los espacios del inventario de arbolado: cepa vacante (anillo verde), tocón (círculo café) y árbol muerto (círculo gris con ×). Toca uno para ver su ficha y revisarlo en Street View. Se ocultan con el botón de capas, en «Espacios para plantar».' },
  { sel:'#panel-actions, #tab-dl', panel:true, titulo:'Tu lista de campo', texto:()=> (isGC()
      ? 'Elige una alcaldía o una avenida y descarga su lista de avenidas en Excel, en el mismo orden que ves, y su ficha en PDF.'
      : 'Elige una alcaldía o una colonia y descarga su lista de calles en Excel, en el mismo orden que ves, y su ficha en PDF.')
      + ' En «Descargas» cada archivo dice qué trae y para qué sirve; al final están los de Google Earth (KML). Todos respetan los filtros. Los Excel y los archivos para mapas traen además las cepas vacantes, los tocones y los árboles muertos de cada calle; la ficha PDF no los trae.' },
  { sel:'#zloc', mapa:true, titulo:'En campo', texto:'«Mi ubicación» dice en qué colonia estás y qué calles prioritarias tienes cerca. Tu ubicación no sale del teléfono.' },
  { sel:'#cuenta-btn', con:'#cuenta-menu', panel:true, si:()=>!!SESION.cierre, prep:recCuenta, titulo:'Mi cuenta', texto:()=> SESION.inicio
      ? 'En «Mi cuenta» puedes cambiar tu contraseña o cerrar sesión. Al cambiarla regresas a la misma consulta.'
      : 'En «Mi cuenta» puedes cerrar sesión.' },
  { sel:'#open-info, #info-btn', panel:true, titulo:'Cuando lo necesites', texto:'En «Cómo funciona» están la ayuda, la metodología del modelo y el botón para repetir este recorrido.' },
];
const recVisible = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden'; };
const recObjetivo = sel => { for (const s of sel.split(',')){ const e = document.querySelector(s.trim()); if (recVisible(e)) return e; } return null; };
const recPasos = () => REC_PASOS.filter(p => !p.si || p.si());
const recTexto = p => typeof p.texto==='function'? p.texto() : p.texto;

function recColoca(){ if (!REC) return; const p = REC.lista[REC.k], g = REC.globo, f = REC.foco;
  recMarcaPunto();
  const e = p.sel? recObjetivo(p.sel) : null; const W = innerWidth, H = innerHeight, M = 12;
  REC.velo.classList.toggle('sin-foco', !e); f.hidden = !e; f.classList.toggle('redondo', !!e && e.classList.contains('rec-punto'));
  const gw = Math.min(380, W - 2*M); g.style.width = gw + 'px'; const gh = g.offsetHeight;
  if (!e){ g.style.left = Math.round((W-gw)/2) + 'px'; g.style.top = Math.round(Math.max(M, (H-gh)/2)) + 'px'; return; }
  let r = e.getBoundingClientRect(); const pad = 6;
  const junto = p.con? document.querySelector(p.con) : null;   // el foco abarca también lo que va junto (y el globo no lo tapa)
  if (junto && recVisible(junto)){ const q = junto.getBoundingClientRect(), x = Math.min(r.left, q.left), y = Math.min(r.top, q.top);
    r = {left:x, top:y, right:Math.max(r.right, q.right), bottom:Math.max(r.bottom, q.bottom), width:Math.max(r.right, q.right)-x, height:Math.max(r.bottom, q.bottom)-y}; }
  f.style.left = (r.left-pad) + 'px'; f.style.top = (r.top-pad) + 'px'; f.style.width = (r.width+2*pad) + 'px'; f.style.height = (r.height+2*pad) + 'px';
  // junto a un bloque que debe verse completo (la ficha del paso de Street View): a su izquierda, si hay espacio
  const c = p.lado? document.querySelector(p.lado) : null;
  if (c && recVisible(c)){ const q = c.getBoundingClientRect(); if (q.left - gw - 2*M >= 0){
    g.style.left = Math.round(q.left - gw - M) + 'px'; g.style.top = Math.round(Math.min(Math.max(M, r.bottom - gh), H - gh - M)) + 'px'; return; } }
  let top = r.bottom + pad + M; if (top + gh > H - M) top = r.top - pad - M - gh;   // abajo del control; si no cabe, arriba
  if (top < M) top = Math.max(M, H - gh - M);                                        // ni abajo ni arriba: al pie de la pantalla
  const left = Math.min(Math.max(M, r.left + r.width/2 - gw/2), W - gw - M);
  g.style.left = Math.round(left) + 'px'; g.style.top = Math.round(top) + 'px'; }

// lo que dejó preparado el paso anterior: la ficha abierta, la marca del punto, el panel de capas y el menú de «Mi cuenta»
function recDeshace(){ if (REC.ficha){ hideCard(); REC.ficha = false; }
  if (REC.cuenta){ cuentaMenu(false); REC.cuenta = false; }
  if (REC.punto){ REC.punto.el.remove(); REC.punto = null; }
  if (REC.leyenda){ setLegend(false); REC.leyenda = false; } }
function recPaso(k){ const L = REC.lista; REC.k = k = Math.max(0, Math.min(k, L.length-1)); const p = L[k];
  recDeshace();
  if (isPhone() && (p.mapa || p.panel)) pantalla(p.mapa? 'mapa' : 'info');
  if (p.panel && document.body.classList.contains('panel-off')) $('panel-toggle').click();
  const g = REC.globo; g.querySelector('.rec-paso').textContent = `Paso ${k+1} de ${L.length}`;
  g.querySelector('h3').textContent = p.titulo; g.querySelector('p').textContent = recTexto(p);
  g.querySelector('.rec-ant').hidden = k===0; g.querySelector('.rec-sig').textContent = k===L.length-1? 'Terminar' : 'Siguiente';
  // de nuevo cuando terminan de moverse la hoja, el mapa o el desplazamiento, y cuando llega lo que el paso prepara
  const listo = ()=>{ if (!REC || REC.lista[REC.k]!==p) return; const e = p.sel? recObjetivo(p.sel) : null; if (e) e.scrollIntoView({block:'center', inline:'nearest'});
    recColoca(); setTimeout(recColoca, 380); };
  const r = p.prep? p.prep() : null;
  listo(); if (r && typeof r.then==='function') r.then(listo, listo);
  g.querySelector('h3').focus(); }

function recorrido(){ if (REC) return; if (!entradaEl.hidden || !infoModal.hidden) return;
  const velo = document.createElement('div'); velo.className = 'rec-velo';
  const foco = document.createElement('div'); foco.className = 'rec-foco'; foco.setAttribute('aria-hidden', 'true');
  const globo = document.createElement('div'); globo.className = 'rec-globo'; globo.setAttribute('role', 'dialog'); globo.setAttribute('aria-modal', 'true'); globo.setAttribute('aria-labelledby', 'rec-titulo');
  globo.innerHTML = `<div class="rec-paso"></div><h3 id="rec-titulo" tabindex="-1"></h3><p aria-live="polite"></p>
    <div class="rec-acc"><button type="button" class="rec-salir">Salir del recorrido</button><button type="button" class="btn secondary rec-ant">Anterior</button><button type="button" class="btn rec-sig">Siguiente</button></div>`;
  document.body.append(velo, foco, globo);
  REC = { k:0, velo, foco, globo, origen:document.activeElement, ficha:false, punto:null, leyenda:false, cuenta:false, lista:recPasos() };
  appEl.inert = true; document.body.classList.add('recorrido');
  globo.querySelector('.rec-salir').onclick = recFin;
  globo.querySelector('.rec-ant').onclick = ()=> recPaso(REC.k-1);
  globo.querySelector('.rec-sig').onclick = ()=> REC.k===REC.lista.length-1? recFin() : recPaso(REC.k+1);
  recPaso(0); }
function recFin(){ if (!REC) return; recDeshace(); const R = REC; REC = null; recMarca();
  R.velo.remove(); R.foco.remove(); R.globo.remove(); appEl.inert = false; document.body.classList.remove('recorrido');
  if (isPhone()) verInfo();
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
