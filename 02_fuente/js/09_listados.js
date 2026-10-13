// Lista de «Dónde empezar»: colonias, calles dentro de su colonia, avenidas y alcaldías, con orden elegible, filtro por nombre y paso de
// ubicación de las calles cuyo nombre se repite; calle consultada (la resaltada).
// ---------- índices de calles y avenidas ----------
let streetIdx = null; // Map clave -> {nid, col, idx:[], km, kmp, np, tipos:Set, cols:Set}; clave = calle dentro de su colonia
let sinNombre = {km:0, kmp:0, n:0, np:0};  // frentes sin nombre de vialidad en INEGI dentro del ámbito
function buildStreets(){
  streetIdx = new Map(); sinNombre = {km:0, kmp:0, n:0, np:0};
  for(let i=0;i<N;i++){ if (F.gc[i] || !enAmbito(i)) continue; const nid=F.name[i];
    if (PLACEHOLDER.has(nid)){ const k=F.len[i]/1000; sinNombre.km+=k; sinNombre.n++; if(esPrio(F.prio[i])){ sinNombre.kmp+=k; sinNombre.np++; } continue; }
    const col=F.col[i]; const key = nid*4096 + col; let s=streetIdx.get(key); if(!s){ s={nid, col, idx:[],km:0,kmp:0,np:0,kp:[0,0,0,0,0],tipos:new Set(),cols:new Set()}; streetIdx.set(key,s); }
    s.idx.push(i); s.km+=F.len[i]/1000; s.kp[F.prio[i]]+=F.len[i]/1000; if(esPrio(F.prio[i])){ s.kmp+=F.len[i]/1000; s.np++; } s.tipos.add(META.tipos[F.tipo[i]]); if(col) s.cols.add(META.colonias[col].n); }
}
// Corredor de la red vial de una avenida, para mostrar: los «Ruta N» de la capa de vialidades primarias son una numeración interna
// que no le dice nada a quien consulta. Se omiten en pantalla y en las fichas; en las descargas van completos, para cruzar con la capa.
const redVisible = n => !!n && !/^ruta\s/i.test(String(n).trim());
const redesTxt = (ns, max=2)=>{ const v=[...ns].filter(redVisible); return v.slice(0,max).join(', ') + (v.length>max? ' +'+(v.length-max) : ''); };
let avIdx = null; // Map nomId -> {idx:[], km, kmp, recs:Set, recsp:Set, nombres:Set, muns:Set, tipos:Set}
function buildAvenues(){
  avIdx = new Map();
  for(let i=0;i<NV;i++){ if (sel!==null && VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=avIdx.get(a); if(!s){ s={idx:[],km:0,kmp:0,recs:new Set(),recsp:new Set(),nombres:new Set(),muns:new Set(),tipos:new Set()}; avIdx.set(a,s); }
    const k=VP.len[i]/1000; s.idx.push(i); s.km+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.nombres.add(VPC.nombres[VP.nombre[i]]); s.muns.add(VP.mun[i]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
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
const INI_VISTA = {
  kmp: { op:'Colonias con más kilómetros prioritarios', tit:'por kilómetros de frente prioritario', val:s=>s.kmp, nota:'Prioritario = categorías Muy Alta, Alta y Media. Selecciona una colonia para ver sus calles.' },
  pct: { op:'Colonias con mayor porcentaje prioritario', tit:'por porcentaje de frente prioritario', val:s=>s.kmp/(sum(s.km)||1), nota:'Porcentaje del frente de la colonia que es prioritario. Una colonia pequeña puede aparecer arriba con pocos kilómetros: revisa la cifra en kilómetros de cada renglón.' },
  pob: { op:'Colonias con más habitantes', tit:'por habitantes', val:(s,c)=>c.pob||0, nota:'Población residente de la colonia (Censo 2020) entre las colonias con frente prioritario; no equivale a población atendida.' },
  pl:  { op:'Colonias con más kilómetros sin arbolado y con banqueta', tit:'por kilómetros sin arbolado y con banqueta', val:s=>s.pl, nota:'Frentes de prioridad Muy Alta, Alta o Media sin arbolado y con banqueta según INEGI 2020: orienta sobre dónde es más probable poder plantar. La banqueta debe verificarse en campo.' },
  calles: { op:'Calles con más kilómetros prioritarios' },
  alc: { op:'Alcaldías con más kilómetros prioritarios' },
  av: { op:'Avenidas con más kilómetros prioritarios' } };
// lo que se puede mostrar en el ámbito consultado (la primera opción es la de siempre); con una sola, no se ofrece el selector
function iniVistas(){
  if (isGC()) return selAv!==null? ['avalc'] : sel===null? ['av','alc'] : ['av'];
  if (selCol!==null) return ['calles'];
  return ['kmp','pct','pob','pl', sel===null? 'alc' : 'calles']; }
function iniFila(pos, nombre, sub, k, small, go, dotc, extra=''){ const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
  li.innerHTML = `<div><div class="n"><span class="pos">${pos}</span>${dotc? dot(dotc):''}${nombre}</div>${sub? `<div class="t">${sub}</div>` : ''}${extra}</div><div class="k">${k}<small>${small}</small></div>`;
  li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; return li; }
const iniVacio = (ul, t) => { ul.innerHTML = `<li class="empty">${t}</li>`; return 0; };
// nota bajo la lista; lo complementario va en «Más detalles» (plegado en el celular)
function iniNota(txt, extra){ const n=$('ini-note'); n.textContent = txt; if (extra) n.insertAdjacentHTML('beforeend', masDet(extra)); }
function filasColonias(ul, ord){
  const o = INI_VISTA[ord], m = sel===null? null : META.muns[sel];
  $('ini-title').textContent = `Colonias ${sel===null? 'de la ciudad' : 'de '+META.munNames[sel]} por atender primero`;
  const items=[]; for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const s=colStat(i); if (ord==='pl'? s.pl>0 : s.kmp>0) items.push([i,s,c,o.val(s,c)]); }
  items.sort((a,b)=> b[3]-a[3] || b[1].kmp-a[1].kmp);
  $('ini-count').textContent = `${fmt.format(items.length)} colonia${items.length===1?'':'s'}, ${o.tit}`;
  const sc = sinColStat();
  iniNota(o.nota, sc.n? `Además, ${fmt.format(sc.n)} frentes (${kmFull(sc.km)}; ${kmFull(sc.kmp)} prioritarios) ${sel===null? 'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo y no aparecen en esta lista. Sí se cuentan en las cifras de la alcaldía y en su Excel de frentes.` : '');
  if(!items.length) return iniVacio(ul, ord==='pl' && filtroBanq==='sin'? 'Este orden cuenta solo frentes con banqueta y el filtro de banqueta muestra los que no la tienen: elige otro orden o la opción «Todas» de Banqueta.' : filtroEsp? `Ninguna colonia de este ámbito tiene frentes prioritarios con ${espLista()} inventariados hasta ahora. El inventario de arbolado está en curso.` : 'Este ámbito no tiene colonias con frente prioritario.');
  items.slice(0,iniN).forEach(([i,s,c],k)=>{ const tot=sum(s.km);
    const [v,sm] = ord==='pct'? [pct(s.kmp,tot), `${kmFull(s.kmp)} de ${kmFull(tot)} de frente`]
      : ord==='pob'? [fmt.format(c.pob||0)+' hab.', `${kmFull(s.kmp)} de frente prioritario`]
      : ord==='pl'? [kmFull(s.pl), `sin arbolado y con banqueta · ${kmFull(s.kmp)} prioritarios`]
      : [kmFull(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes son prioritarios`];
    ul.appendChild(iniFila(k+1, c.n, `${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.pob && ord!=='pob'? ' · '+fmt.format(c.pob)+' hab.':''}`, v, sm, ()=>pickColonia(i), c.p>=0? T.prio[c.p]:null)); });
  return items.length; }
// calles de la colonia o de la alcaldía (cada una dentro de su colonia), o las que coinciden con el filtro
function filasCalles(ul, q, qRaw){
  const lugar = selCol!==null? 'la colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'la alcaldía '+META.munNames[sel];
  const items = [];
  if (q){ for(const [key,s] of streetIdx){ if (calleCoincide(s, q)) items.push([key,s]); }
    if (sel===null && selCol===null && new Set(items.map(x=>x[1].col)).size>1) return renderUbicar(ul, items, qRaw);
    if (sel!==null && selCol===null) locChips(`<button type="button" class="lchip" data-m="">Buscar «${qRaw.replace(/[<>&"]/g,'')}» en otra alcaldía</button>`);
    $('ini-title').textContent = `Calles encontradas en ${lugar}`; }
  else { for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); }
    $('ini-title').textContent = `Calles de ${selCol!==null? META.colonias[selCol].n : META.munNames[sel]} por atender primero`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length;
  $('ini-count').textContent = selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q?'':' con frente prioritario'}`
    : q ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  iniNota(q? 'Prioritario = categorías Muy Alta, Alta y Media. Selecciona una calle para ubicarla en el mapa y ver sus tramos.'
    : selCol!==null? 'Calles de la colonia ordenadas por kilómetros de frente prioritario (Muy Alta, Alta y Media). Selecciona una calle para ubicarla en el mapa y ver sus tramos.'
    : 'Calles de la alcaldía ordenadas por kilómetros de frente prioritario (Muy Alta, Alta y Media); una calle que pasa por varias colonias aparece una vez en cada una. Selecciona una calle para ubicarla en el mapa y ver sus tramos.',
    !q && sinNombre.kmp>0? `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI («Ninguno» o «Manzana o edificación contigua»). No aparecen en esta lista, pero sí en el Excel de frentes.` : '');
  if (!total) return iniVacio(ul, q? `Sin coincidencias en ${lugar}.` : `${selCol!==null? 'Esta colonia' : 'Este ámbito'} no tiene calles con frente prioritario (Muy Alta, Alta o Media).`);
  items.slice(0,iniN).forEach(([key,s],k)=>{ const d=dom({km:s.kp}); const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    const li = iniFila(k+1, META.names[s.nid]||'Sin nombre', [donde, tipos].filter(Boolean).join(' · '), kmFull(s.kmp), `${s.np} de ${s.idx.length} frentes prioritarios`, ()=>{ highlightStreet(key, s); renderInicio(); }, T.prio[d], desgHtml(s));
    if (highlight && highlight.nameId===key) li.classList.add('active');
    ul.appendChild(li); });
  return total; }
// avenidas del ámbito (Gobierno Central), o las que coinciden con el filtro
function filasAvenidas(ul, q){
  const en = sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
  const items = [];
  if (q){ for(const [a,s] of avIdx){ if (AV_N[a].includes(q) || [...s.nombres].some(n=>norm(n).includes(q))) items.push([a,s]); } $('ini-title').textContent = `Avenidas encontradas ${en}`; }
  else { for(const [a,s] of avIdx){ if(s.kmp>0) items.push([a,s]); } $('ini-title').textContent = `Avenidas ${sel===null? 'de la ciudad' : 'de la alcaldía '+META.munNames[sel]} por atender primero`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length;
  $('ini-count').textContent = `${fmt.format(total)} avenida${total===1?'':'s'}${q?'':' con km prioritarios'}`;
  iniNota('Vialidades primarias a cargo del Gobierno Central, ordenadas por kilómetros prioritarios (Muy Alta, Alta y Media) medidos sobre el eje. Selecciona una avenida para consultarla.');
  if (!total) return iniVacio(ul, q? `Sin coincidencias ${en}.` : 'Este ámbito no tiene avenidas con kilómetros prioritarios (Muy Alta, Alta o Media).');
  items.slice(0,iniN).forEach(([a,s],k)=>{ const ms=[...s.muns];
    const li = iniFila(k+1, VPC.nomenclat[a], [redesTxt(s.nombres), sel===null? ms.slice(0,2).map(m=>META.munNames[m]).join(', ')+(ms.length>2?' +'+(ms.length-2):'') : ''].filter(Boolean).join(' · '), kmFull(s.kmp), `${s.recsp.size} de ${s.recs.size} tramos son prioritarios`, ()=>pickAvenida(a));
    if (selAv===a) li.classList.add('active');
    ul.appendChild(li); });
  return total; }
// avenida elegida: las alcaldías que cruza, por km prioritarios
function filasAvAlc(ul){
  const per = new Map();
  for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); }
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
  iniNota(isGC()? 'Kilómetros de vialidad primaria de prioridad Muy Alta, Alta y Media en cada alcaldía, medidos sobre el eje. Dice dónde se concentra la necesidad; no es una calificación. Selecciona una alcaldía para ver sus avenidas.'
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
  const vistas = iniVistas(), v = vistas.includes(iniOrden)? iniOrden : vistas[0];
  if (sv.dataset.ops!==vistas.join()){ sv.innerHTML = vistas.filter(k=>INI_VISTA[k]).map(k=>`<option value="${k}">${INI_VISTA[k].op}</option>`).join(''); sv.dataset.ops = vistas.join(); }
  if (INI_VISTA[v]) sv.value = v;
  box.hidden = !!q || vistas.length<2;   // al filtrar por nombre, la lista es la de lo que coincide
  const total = q? (isGC()? filasAvenidas(ul, q) : filasCalles(ul, q, qRaw))
    : v==='avalc'? filasAvAlc(ul) : v==='av'? filasAvenidas(ul, '') : v==='alc'? filasAlcaldias(ul) : v==='calles'? filasCalles(ul, '', '') : filasColonias(ul, v);
  mas.hidden = total<=iniN; if(!mas.hidden) mas.textContent = `Ver ${Math.min(10,total-iniN)} más`;
}
$('q').addEventListener('input', ()=>{ iniN = 10; renderInicio(); });
$('ini-orden').onchange = e=>{ iniOrden = INI_VISTA[e.target.value]? e.target.value : 'kmp'; iniN = 10; renderInicio(); };
$('ini-mas').onclick = ()=>{ const n = iniN; iniN += 10; renderInicio(); const li = $('ini-list').children[n]; if (li) li.focus(); };
// Renglones de la lista y de los tramos: se activan también con la barra espaciadora y, como la lista se vuelve a armar al elegir,
// el foco pasa al título de la respuesta (cambio de ámbito) o regresa al renglón elegido (calle consultada).
for (const id of ['ini-list','tramos']) $(id).addEventListener('keydown', e=>{ const li = e.target; if (!li.matches || !li.matches('li[tabindex]')) return;
  if (e.key===' '){ e.preventDefault(); li.click(); } if (e.key!==' ' && e.key!=='Enter') return;
  setTimeout(()=>{ const a = document.activeElement; if (a && a!==document.body && a.isConnected) return;
    ($('ini-list').querySelector('li.active') || $('scope-title')).focus(); }, 60); });
