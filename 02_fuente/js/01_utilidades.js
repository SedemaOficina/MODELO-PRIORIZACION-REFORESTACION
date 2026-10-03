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
// Versión de la herramienta y corte de los datos: los fija construir.py (VERSION y CORTE_DATOS) y se muestran en el panel, las fichas y los Excel.
const VERSION = Object.assign({v:'', corte:''}, window.SIA_VERSION || {});
const VERSION_TXT = `Versión ${VERSION.v} · Datos: ${VERSION.corte}`;
const PRELIM_TXT = 'La asignación de cada frente a la alcaldía o al Gobierno Central es preliminar: resulta de una regla geométrica en validación.';
// Errores con mensaje para la persona usuaria (auditoría H-035): `amable` es lo que se muestra; el detalle técnico va a la consola.
function errAmable(msg, detalle){ const e = new Error(detalle || msg); e.amable = msg; return e; }
const esc = s => String(s==null? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Los textos de los catálogos se interpolan en HTML en muchos puntos: se neutralizan al entrar (auditoría H-037).
// Un nombre con marcado es un error del insumo; se muestra con comillas angulares simples y no puede ejecutar código.
const limpioCat = s => typeof s==='string'? s.replace(/</g,'‹').replace(/>/g,'›') : s;
// aviso no bloqueante sobre el mapa (errores de dibujo, contexto gráfico perdido, errores inesperados)
function avisoMapa(html, conRecarga){ const p = document.querySelector('.mapwrap'); if (!p || p.querySelector('.aviso-error')) return;
  const n = document.createElement('div'); n.className = 'aviso-ligero aviso-error'; n.setAttribute('role','alert');
  n.innerHTML = html + (conRecarga? ' <button type="button" class="recarga">Recargar la página</button>' : '') + '<button type="button" class="cierra" aria-label="Cerrar aviso">×</button>';
  n.querySelector('.cierra').onclick = ()=> n.remove(); const r = n.querySelector('.recarga'); if (r) r.onclick = ()=> location.reload(); p.appendChild(n); }
const NAVEGADORES = 'Chrome o Edge 80, Firefox 79, Safari 15 o posteriores';
if (typeof deck === 'undefined') throw errAmable(`No se pudo cargar el componente del mapa. Puede ser una descarga interrumpida o un navegador antiguo (se requiere ${NAVEGADORES}).`, 'deck.gl no está definido');
if (!(()=>{ try { return !!document.createElement('canvas').getContext('webgl2'); } catch(e){ return false; } })())
  throw errAmable(`Este navegador o equipo no puede dibujar el mapa: no tiene disponible WebGL 2. Usa ${NAVEGADORES}, y revisa que la aceleración gráfica esté activada.`, 'sin WebGL2');
// Disposición de teléfono (hoja inferior): pantallas angostas. Un teléfono en horizontal (poco alto, más de 600 px de ancho)
// usa la disposición de panel lateral, más angosto (auditoría H-056). La misma consulta está en las hojas de estilo.
const MQ_TEL = '(max-width:860px) and (min-height:481px), (max-width:600px)';
