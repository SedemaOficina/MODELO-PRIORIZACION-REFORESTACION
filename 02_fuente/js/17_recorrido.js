// Recorrido guiado (v17.36): una visita de un minuto por la herramienta. Un foco ilumina cada control y un globo explica para qué
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
  for(let i=0;i<NV;i++){ if (!esPrio(VP.prio[i]) || (sel!==null && VP.mun[i]!==sel) || (selAv!==null && VP.nom[i]!==selAv)) continue; const s = VP.prio[i]*1e6 + VP.len[i]; if (s>bs){ bs=s; b=i; } }
  return b; }
function recFicha(){ if (isGC()){ const i = recTramo(); if (i<0) return false; const [la,lo] = vpMid(i); flyTo({...viewState, longitude:lo, latitude:la, zoom:Math.max(viewState.zoom, 16)}, 0); showCard('vp', i); }
  else { const i = recFrente(); if (i<0) return false; flyTo({...viewState, longitude:midLon(i), latitude:midLat(i), zoom:Math.max(viewState.zoom, 16.5)}, 0); showCard('fr', i); }
  REC.ficha = true; return true; }

// pasos: sel = control que se ilumina (el primero visible de la lista); panel/mapa = qué debe verse en teléfono; si = condición
const REC_PASOS = [
  { titulo:'Calles prioritarias para reforestar', texto:'En un minuto te mostramos cómo encontrar las calles que conviene reforestar primero, cómo separar las que tienen banqueta y cómo revisarlas antes de salir a campo.' },
  { sel:'.omni', panel:true, titulo:'Busca un lugar', texto:'Escribe una alcaldía, una colonia, una avenida o una calle. Bastan algunas palabras y se reconocen abreviaturas como «Av.» o «Calz.».' },
  { sel:'.resp-row', panel:true, titulo:'Quién atiende', texto:'Alcaldías: las calles y frentes de manzana que planta cada alcaldía. Gobierno Central: las vialidades primarias. Puedes activar las dos.' },
  { sel:'#banq-row', panel:true, si:()=>!isGC(), titulo:'Banqueta: decide qué visitar', texto:'«Con banqueta» reúne los frentes donde INEGI 2020 registra banqueta: son los de plantación directa. «Sin o por verificar» reúne los que no la registran o no tienen dato: no se descartan, requieren reconocimiento en sitio. El mapa, las cifras y las descargas siguen la opción que elijas; el Resumen muestra siempre el desglose completo.' },
  { sel:'#crumb', panel:true, titulo:'Tu territorio', texto:'Aquí cambias de alcaldía o vuelves a toda la ciudad. Cuando eliges una colonia o una calle, aparece en esta ruta y puedes quitarla con la ×.' },
  { sel:'#share', panel:true, titulo:'Comparte la consulta', texto:'«Compartir» copia la dirección de lo que estás viendo (alcaldía, colonia, calle, red y filtro de banqueta) para mandarla a tu equipo: quien la abra verá la misma consulta' + (SESION.inicio? ', después de entrar con su cuenta' : '') + '. «Reiniciar» vuelve al inicio.' },
  { sel:'.tabs', panel:true, titulo:'Dónde empezar, cifras y listados', texto:'«Dónde empezar» propone un orden de atención. «Resumen» da las cifras y el desglose por banqueta. El listado reúne las calles o colonias del ámbito. «Descargas» tiene los archivos.' },
  { sel:'#leymini, #zcapas', mapa:true, titulo:'Colores del mapa y capas', texto:'Del rojo oscuro (Muy Alta) al crema (Muy Baja): es la prioridad de reforestación de cada colonia y de cada calle. Toca esta barra o el botón de capas para elegir qué ver (alcaldías, colonias o calles), ocultar prioridades y encender un mapa de fondo de calles o satélite.' },
  { sel:'#card .field-acts a[href*="pano"]', mapa:true, lado:'#card', prep:recFicha, titulo:'Pre-evalúa con Street View', texto:'Toca cualquier calle del mapa para abrir su ficha: prioridad, banqueta según INEGI y coordenadas. Antes de salir, abre Street View y revisa si hay banqueta, si su ancho permite plantar y si hay cocheras, postes, cables o árboles. Así decides qué calles visitar y cuáles necesitan reconocimiento en sitio.' },
  { sel:'#panel-actions', panel:true, titulo:'Tu lista de campo', texto:'Descarga el listado en Excel o el mapa para Google Earth (KML), y la ficha PDF del ámbito. Todos respetan el filtro de banqueta.' },
  { sel:'#zloc', mapa:true, titulo:'En campo', texto:'«Mi ubicación» dice en qué colonia estás y qué calles prioritarias tienes cerca. Tu ubicación no sale del teléfono.' },
  { sel:'#open-info, #info-btn', panel:true, titulo:'Cuando lo necesites', texto:'En «Cómo funciona» está la explicación del modelo y el botón para repetir este recorrido.' },
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
  if (isPhone()) setSheetState(p.mapa? 'peek' : p.panel? 'full' : sheetState);
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
  if (R.ficha) hideCard(); if (isPhone()) setSheetState('half');
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
