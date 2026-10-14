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
// índice del nombre de la calle resaltada (el de su primer frente, como calleSel); null si no hay calle resaltada
function nidResaltado(){ return highlight && highlight.avId===undefined && highlight.idx && highlight.idx.length? F.name[highlight.idx[0]] : null; }
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
  // los frentes sin colonia se explican en el Resumen (nota de las barras); aquí no se repite
  iniNota(o.nota, cv? cepasDet('la colonia', 'frentes') + ' ' + cepasNota('una colonia') : '');
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
