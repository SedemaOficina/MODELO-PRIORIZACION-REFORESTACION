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
// Reglas de negocio en un solo lugar (auditoría H-038). Clases de prioridad: 0 Muy Baja … 4 Muy Alta.
//  · «prioritario» = Alta y Muy Alta (clase ≥ PRIO_MIN) · «universo de intervención» = Media, Alta y Muy Alta (clase ≥ UNIV_MIN)
const PRIO_MIN = 3, UNIV_MIN = 2;
const esPrio = p => p >= PRIO_MIN;
const sumPrio = a => { let t = 0; for (let k = PRIO_MIN; k < a.length; k++) t += a[k]; return t; };   // suma de un arreglo por clase sobre las clases prioritarias
const sumUniv = a => { let t = 0; for (let k = UNIV_MIN; k < a.length; k++) t += a[k]; return t; };
// Versión de la herramienta y corte de los datos: los fija construir.py (VERSION y CORTE_DATOS) y se muestran en el panel, las fichas y los Excel.
const VERSION = Object.assign({v:'', fecha:'', corte:''}, window.SIA_VERSION || {});
const VERSION_TXT = `Versión ${VERSION.v}${VERSION.fecha? ' · Última actualización: '+VERSION.fecha : ''} · Datos: ${VERSION.corte}`;
const PRELIM_TXT = 'La asignación de cada frente a la alcaldía o al Gobierno Central es preliminar: resulta de una regla geométrica en validación.';
// Errores con mensaje para la persona usuaria (auditoría H-035): `amable` es lo que se muestra; el detalle técnico va a la consola.
function errAmable(msg, detalle){ const e = new Error(detalle || msg); e.amable = msg; return e; }
// ---------- política de seguridad de contenido (auditoría H-001) ----------
// Una política estricta rechaza los atributos style escritos en el HTML. Los estilos calculados (color de cada prioridad, ancho
// de cada barra) se escriben en las plantillas como data-st="propiedad:valor" y aquí se aplican por programa, que sí está permitido.
function aplicaSt(n){ const f = el => { for (const par of el.getAttribute('data-st').split(';')){ const k = par.indexOf(':'); if (k>0) el.style.setProperty(par.slice(0,k).trim(), par.slice(k+1).trim()); } el.removeAttribute('data-st'); };
  if (n.hasAttribute && n.hasAttribute('data-st')) f(n); if (n.querySelectorAll) n.querySelectorAll('[data-st]').forEach(f); }
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType===1) aplicaSt(n); }).observe(document.documentElement, {childList:true, subtree:true});
aplicaSt(document.documentElement);
// ---------- sesión (Fase 2; auditoría H-014 y H-078) ----------
// En el SIA la herramienta puede quedar detrás de un inicio de sesión. Las direcciones las fija construir.py (SESION_*); vacías = sin sesión.
const SESION = Object.assign({inicio:'', cierre:'', usuario:'', uso:''}, window.SIA_SESION || {});
// Registro de usos (v17.37): SOLO detrás del inicio de sesión del SIA. Avisa al servidor qué ámbito se consulta y qué archivo se descarga,
// para el reporte de usos por alcaldía (ver 08_entrega_sia/login/). Sin sesión configurada (GitHub Pages, archivo único) no envía nada.
const USO_URL = SESION.uso || (SESION.inicio ? '/api/calles/uso' : '');
function avisaUso(datos){ if (!USO_URL || !navigator.sendBeacon) return; try { navigator.sendBeacon(USO_URL, JSON.stringify(datos)); } catch(e){} }
const SESION_TXT = 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.';
// Una sesión vencida se reconoce por la respuesta 401 o 403, o porque llega una página (HTML) donde se esperaba un archivo de datos o un programa.
const esSesion = r => !!r && (r.status===401 || r.status===403 || (r.ok && (r.headers.get('content-type')||'').toLowerCase().includes('text/html')));
const errSesion = detalle => { const e = errAmable(SESION_TXT, detalle); e.sesion = true; return e; };
// por qué no llegó un archivo: 'sesion', 'red' (sin conexión) o 'servidor' (el archivo no está o el servidor falló)
async function causaFalla(url){ if (/^blob:|^data:/.test(url)) return 'servidor'; try { const r = await fetch(url, {cache:'no-store'}); return esSesion(r)? 'sesion' : r.ok? 'otra' : 'servidor'; } catch(e){ return 'red'; } }
function avisoSesion(el){ el.textContent = SESION_TXT + ' '; if (SESION.inicio){ const a = document.createElement('a'); a.href = SESION.inicio; a.textContent = 'Iniciar sesión'; el.appendChild(a); } }
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
