// Espacios para plantar: cepas vacantes, tocones y árboles muertos del inventario de arbolado (CIGA-UNAM y SEDEMA).
// Es una capa de oportunidad ENCIMA del modelo: no cambia ninguna prioridad, cifra, lista ni descarga. Cada punto trae el frente de
// manzana más cercano (a 20 m o menos), del que toma calle, colonia, alcaldía y prioridad para su ficha.
// Aparte, el filtro «Espacio» (07_leyenda_y_capas.js, filtroEsp en 03_estado.js) sí acota cifras, listas y descargas cuando la persona lo
// prende: usa espacios_frentes.bin (tipos de punto de cada frente), que se pide con espCargar() la primera vez que se usa.
// Datos en datos/inventario/ (03_procesamiento_datos/9_inventario_espacios.py): un archivo por alcaldía que se pide al acercar el mapa
// (desde INV_Z; en modo ligero, desde INV_Z_LIGERO) y solo de las alcaldías a la vista, como las manzanas del fondo propio.
// window.SIA_INVENTARIO (config.js) trae la huella de cada archivo, el corte, los puntos por tipo y el avance del inventario por alcaldía.
// El archivo único no lo trae: allí la sección del panel de capas lo dice.
const INV = window.SIA_INVENTARIO || null;
const INV_ESCALA = 200000, INV_Z = 15, INV_Z_LIGERO = 16;   // coordenadas en 1/200,000 de grado (ESCALA en 9_inventario_espacios.py)
const INV_TIPOS = [
  {id:'cepa', n:'Cepa vacante', pl:'Cepas vacantes', que:'Se puede plantar directo'},
  {id:'tocon', n:'Tocón', pl:'Tocones', que:'Hay que retirar el tocón antes de plantar'},
  {id:'muerto', n:'Árbol muerto', pl:'Árboles muertos', que:'Requiere derribo y reposición'}];
const INV_CAPAS = ['inv-cepa', 'inv-tocon', 'inv-muerto'];   // las capas que se pueden tocar (una por tipo)
const invOn = [true, true, true];                            // casillas del panel de capas
const INVD = {mz:new Map(), pend:new Set(), fallo:new Set(), cache:null};
const invZ = ()=> modoLigero? INV_Z_LIGERO : INV_Z;
const invVisible = ()=> !!INV && invOn.some(Boolean) && viewState.zoom >= invZ();
// lee el archivo de una alcaldía: FORMATO, n y por punto dx, dy, tipo, dfrente, dletras, duga, dnúmero (todo en diferencias)
async function invLeer(cve){ const n = 'inv_' + cve + '.bin', v = INV.v[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/inventario/' + n + '?v=' + v); if (esSesion(r)) throw errSesion(n); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); const rv = reader(b);
  const formato = rv(), k = rv(); if (formato!==1) throw new Error(n + ': formato ' + formato);
  const P = new Array(k); let x=0, y=0, fr=0, pre=0, uga=0, num=0;
  for(let i=0;i<k;i++){ x+=rv(); y+=rv(); const t=rv(); fr+=rv(); pre+=rv(); uga+=rv(); num+=rv(); P[i] = {lon:x/INV_ESCALA, lat:y/INV_ESCALA, t, fr:fr-1, pre, uga, num, a:cve}; }
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
// ficha de un punto (compact: descripción emergente al pasar el ratón)
function invHtml(p, compact){ const ti = INV_TIPOS[p.t], fr = p.fr, hay = fr>=0 && fr<N;
  const sim = `<i class="inv-sim ${ti.id}" aria-hidden="true"></i>`;
  const tp = hay? (META.tipos[F.tipo[fr]] || '—') : '—', calle = hay? ((sinNombreFr(fr) || tp==='—')? '' : tp+' ') + nomFrente(fr) : '';
  const col = hay? META.colonias[F.col[fr]] : null, colTxt = col && col.n? col.n : 'Colonia no identificada';
  const alc = hay? META.munNames[F.mun[fr]] : (META.munNames[munIndex[p.a]] || '');
  if (compact) return `${sim}<b>${ti.n}</b><br><span class="m">${hay? calle + ' · ' : ''}${ti.que}</span>`;
  const pr = hay? F.prio[fr] : -1;
  const prioTxt = hay? `${dot(T.prio[pr])}${META.prio[pr]}${esPrio(pr)? ' (prioritario)' : ''}` : `Sin frente de manzana a ${INV.dist} m o menos`;
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill inv-pill">${sim}${ti.n}</span>
    <h3>${ti.que}</h3>
    <div class="sub">${hay? `${calle} · ${colTxt} · ${alc}` : `${alc} · lejos de los frentes de manzana del modelo`}</div>
    <dl><dt>Clave del inventario</dt><dd>${invClave(p)}</dd>
    <dt>Prioridad del frente</dt><dd>${prioTxt}</dd>
    ${hay? `<dt>Quién atiende</dt><dd>${F.gc[fr]? 'Gobierno Central' : 'Alcaldía'}</dd>` : ''}
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
// ---------- filtro «Espacio»: tipos de punto asignados a cada frente (todos los frentes, no solo los de la vista) ----------
// espacios_frentes.bin: FORMATO, n y por frente con al menos un punto, el índice en diferencias y los tipos en bits (1 cepa, 2 tocón, 4 muerto).
// Se pide una vez; si falla, se puede volver a pedir. Comprueba las cifras de control que trae config.js (INV.fr).
let ESP_P = null;
async function espLeer(){ const fr = INV.fr, n = fr.archivo, v = INV.v[n]; if (!v) throw new Error('sin ' + n);
  const r = await fetch('datos/inventario/' + n + '?v=' + v); if (esSesion(r)) throw errSesion(n); if (!r.ok) throw new Error(n + ': ' + r.status);
  const b = await gunzip(new Uint8Array(await r.arrayBuffer())); const rv = reader(b);
  const formato = rv(), k = rv(); if (formato!==fr.formato || k!==fr.n) throw new Error(n + ': formato ' + formato + ', ' + k + ' frentes');
  const A = new Uint8Array(N), cuenta = [0,0,0]; let f = -1;
  for(let j=0;j<k;j++){ f += rv(); const bits = rv(); if (f<0 || f>=N || bits<1 || bits>7) throw new Error(n + ': frente ' + f); A[f] = bits; for(let t=0;t<3;t++) if (bits & (1<<t)) cuenta[t]++; }
  if (rv.pos()!==b.length || cuenta.join()!==fr.tipos.join()) throw new Error(n + ': no cuadra con las cifras de control');
  return A; }
function espCargar(){ if (!INV) return Promise.reject(new Error('El archivo único no trae el inventario de arbolado'));
  if (!ESP_P) ESP_P = espLeer().then(A=>{ ESP_FR = A; return A; }, e=>{ ESP_P = null; throw e; });
  return ESP_P; }
// lo que declaran el Excel, el GeoJSON y el KML cuando el filtro está activo
const espNota = ()=> `Solo frentes con al menos un punto de ${espLista()} a ${INV.dist} m o menos, según el ${INV.fuente}, corte: ${INV.corte}. El inventario está en curso: un frente sin puntos puede no haberse inventariado aún.`;

// Solo para las pruebas automáticas (04_pruebas/prueba_inventario_espacios.js): con window.SIA_PRUEBA se puede leer el estado de la capa.
if (window.SIA_PRUEBA===true) window.__INV = { cargadas: ()=>[...INVD.mz.keys()], pendientes: ()=>INVD.pend.size, fallas: ()=>[...INVD.fallo],
  puntos: cve=> (INVD.mz.get(cve) || []).map(p=>({...p, clave:invClave(p)})), z: ()=>invZ(), on: ()=>invOn.slice(),
  capas: ()=> dk.props.layers.filter(l=>l && l.id.startsWith('inv-')).map(l=>({id:l.id, n:l.props.data.length})),
  mide: async cve=>{ const t = performance.now(); const P = await invLeer(cve); return {ms: Math.round(performance.now()-t), n: P.length}; },
  px: (lon, lat)=> dk.getViewports()[0].project([lon, lat]), ficha: p=> showCard('inv', p),
  frenteBajo: (x, y)=>{ const p = dk.pickObject({x, y, radius:6, layerIds:['fronts']}); return p && p.index>=0? frReal(p.index) : null; },
  esp: ()=>({ cargado: !!ESP_FR, filtro: filtroEsp, casillas: espQuiero }) };
