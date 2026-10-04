// Listados de la pestaña "Listado": calles dentro de su colonia, avenidas, colonias y alcaldías.
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
// Nombre de un frente, igual en tarjeta, listados, Mi ubicación, Excel y fichas (auditoría H-008): los nombres genéricos de INEGI
// («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua» y variantes como «Privada Ninguno») no son nombres de calle.
const SIN_NOMBRE = 'Frente sin nombre de calle (INEGI)';
const sinNombreFr = i => PLACEHOLDER.has(F.name[i]) || !META.names[F.name[i]];
const nomFrente = i => sinNombreFr(i)? SIN_NOMBRE : META.names[F.name[i]];
// frentes de alcaldía sin colonia asignada (auditoría H-028): no aparecen en ninguna consulta por colonia
const SINCOL = (()=>{ const a = META.muns.map(()=>({n:0, km:0, kmp:0})); for(let i=0;i<N;i++){ if (F.col[i] || F.gc[i]) continue; const s=a[F.mun[i]], k=F.len[i]/1000; s.n++; s.km+=k; if (esPrio(F.prio[i])) s.kmp+=k; } return a; })();
const sinColStat = () => sel!==null? SINCOL[sel] : SINCOL.reduce((t,s)=>({n:t.n+s.n, km:t.km+s.km, kmp:t.kmp+s.kmp}), {n:0,km:0,kmp:0});
function renderAlcRanking(){
  const items = META.muns.map((m,i)=>i).sort((a,b)=> rankOf(a)-rankOf(b));
  $('search-title').textContent = isGC()? 'Alcaldías ordenadas por km prioritarios de vialidad primaria' : 'Alcaldías ordenadas por km de frente prioritario'; $('search-count').textContent='16 alcaldías de la ciudad';
  const ul=$('results'); ul.innerHTML='';
  for(const i of items){ const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
    li.innerHTML = `<div><div class="n">${dot(pc)}${META.munNames[i]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${pct(kmPrio(s),tot)} de ${isGC()? 'sus km de vialidad primaria':'sus km de frente'} es prioritario</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${isGC()? fmt.format(VP_RECS[i].rp.size)+' de '+fmt.format(VP_RECS[i].r.size)+' tramos prioritarios' : fmt.format(sumPrio(s.n))+' frentes prioritarios'} en la alcaldía</small></div>`;
    const go=()=>{ selEl.value=String(i); setSel(String(i)); }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
function renderColoniaRanking(){
  const m = sel===null? null : META.muns[sel]; const items=[];
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); }
  items.sort((a,b)=> b[1].kmp-a[1].kmp);
  $('search-title').textContent = `Colonias con más km de frente prioritario ${sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel]}`; $('search-count').textContent = `${fmt.format(items.length)} colonia${items.length===1?'':'s'} con frente prioritario`;
  const ul=$('results'); ul.innerHTML='';
  for(const [i,s] of items.slice(0,10)){ const c=META.colonias[i]; const pc=c.p>=0? T.prio[c.p]:null; const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
    li.innerHTML = `<div><div class="n">${pc? dot(pc):''}${c.n}</div><div class="t">${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.ids? ' · Unidad territorial con desarrollo social '+c.ids.toLowerCase():''}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes de la colonia son prioritarios</small></div>`;
    const go=()=>pickColonia(i); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if(!items.length) ul.innerHTML='<li class="empty">Este ámbito no tiene colonias con frente prioritario.</li>';
  { const sc = sinColStat(); if (sc.n){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${fmt.format(sc.n)} frentes (${kmFull(sc.km)}; ${kmFull(sc.kmp)} prioritarios) ${sel===null? 'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo y no aparecen en las consultas por colonia. Sí se cuentan en las cifras de la alcaldía y en su Excel de frentes.`; ul.appendChild(li); } }
}
function renderAvenueByAlc(){
  // avenida seleccionada: desglose por alcaldía
  const per = new Map();
  for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); }
  const items=[...per.entries()].sort((a,b)=> kmPrio(b[1])-kmPrio(a[1]));
  $('search-title').textContent=`Tramos de ${VPC.nomenclat[selAv]} por alcaldía`; $('search-count').textContent=`cruza ${items.length} alcaldía${items.length===1?'':'s'}`;
  const ul=$('results'); ul.innerHTML='';
  for(const [m,s] of items){ const d=dom(s); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
    li.innerHTML = `<div><div class="n">${dot(pc)}${META.munNames[m]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${fmt1.format(sum(s.km))} km de la avenida en esta alcaldía</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${s.recsp.size} de ${s.recs.size} tramos prioritarios aquí</small></div>`;
    const go=()=>{ if(sel!==m){ selEl.value=String(m); sel=m; refresh(); } }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
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
function renderUbicar(items, qRaw){
  const ul=$('results'); const uno = new Set(items.map(x=>x[1].nid)).size===1;
  $('search-title').textContent = uno? `${fmt.format(items.length)} calles se llaman ${META.names[items[0][1].nid]}` : `${fmt.format(items.length)} calles coinciden con «${qRaw}»`;
  $('search-count').textContent = 'Elige la alcaldía o la colonia';
  const porMun = new Map(); for (const [,s] of items){ const m=F.mun[s.idx[0]]; porMun.set(m, (porMun.get(m)||0)+1); }
  locChips('<span class="lc-cap">¿En qué alcaldía?</span>' + [...porMun.entries()].sort((a,b)=>META.munNames[a[0]].localeCompare(META.munNames[b[0]],'es')).map(([m,n])=>`<button type="button" class="lchip" data-m="${m}">${META.munNames[m]} <b>${n}</b></button>`).join(''));
  // orden por ubicación: con Mi ubicación, la más cercana primero; si no, por alcaldía y colonia
  const c0 = myPos? Math.cos(myPos.lat*Math.PI/180) : 0;
  const dist = s => { let d=Infinity; for (const i of s.idx){ const dd=Math.hypot((midLon(i)-myPos.lon)*111320*c0, (midLat(i)-myPos.lat)*110540); if(dd<d) d=dd; } return d; };
  const filas = items.map(([key,s])=>({key, s, m:F.mun[s.idx[0]], col: s.col? META.colonias[s.col].n : 'Colonia no identificada', d: myPos? dist(s) : 0}));
  filas.sort((a,b)=> myPos? a.d-b.d : (META.munNames[a.m].localeCompare(META.munNames[b.m],'es') || a.col.localeCompare(b.col,'es') || (META.names[a.s.nid]||'').localeCompare(META.names[b.s.nid]||'','es')));
  const MAXF = 40;
  for (const f of filas.slice(0, MAXF)){ const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button'); li.className='ubica';
    const tl=[...f.s.tipos].filter(Boolean).slice(0,2).join(', ');
    li.innerHTML = `<div><div class="n">${META.names[f.s.nid]||'Sin nombre'}</div><div class="t">${f.col} · ${META.munNames[f.m]}${tl? ' · '+tl : ''}</div></div><div class="k"><small>${myPos? 'a '+distTxt(f.d) : ''}</small></div>`;
    // al elegir, la consulta queda en la alcaldía de la calle y la calle resaltada
    const go = ()=>{ selEl.value=String(f.m); sel=f.m; selCol=null; selAv=null; highlight=null; hideCard(); keepView=true; refresh(); keepView=false;
      const st=streetIdx.get(f.key); if (st){ highlightStreet(f.key, st); renderResults(); } };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if (filas.length>MAXF){ const li=document.createElement('li'); li.className='empty'; li.textContent=`Se muestran ${MAXF} de ${fmt.format(filas.length)}. Elige una alcaldía para acotar la lista.`; ul.appendChild(li); }
}
function renderResults(){
  const q = norm($('q').value.trim()); locChips('');
  if (alcOnly() && sel===null && q.length<2){ renderAlcRanking(); return; }
  if (colLista() && selCol===null && q.length<2){ renderColoniaRanking(); return; }   // depende de las casillas, no del zoom (auditoría H-075)
  if (isGC() && selAv!==null && q.length<2){ renderAvenueByAlc(); return; }
  const ul = $('results'); ul.innerHTML='';
  if (isGC()){
    let items=[];
    const scV = sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
    if (q.length<2 && sel===null && selAv===null){ $('search-title').textContent='Buscar una avenida'; $('search-count').textContent=''; ul.innerHTML='<li class="empty">Elige una alcaldía arriba para ver sus avenidas con más km prioritarios, o escribe el nombre de una avenida para consultarla en toda la ciudad.</li>'; return; }
    if (q.length>=2){ for(const [a,s] of avIdx){ if (AV_N[a].includes(q) || [...s.nombres].some(n=>norm(n).includes(q))) items.push([a,s]); } $('search-title').textContent=`Avenidas encontradas ${scV}`; }
    else { for(const [a,s] of avIdx){ if(s.kmp>0) items.push([a,s]); } $('search-title').textContent=`Avenidas con más km prioritarios ${scV}`; }
    items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
    const total=items.length; items = items.slice(0, q.length>=2? 40 : 10);
    $('search-count').textContent = `${fmt.format(total)} avenida${total===1?'':'s'}${q.length>=2?'':' con km prioritarios'}`;
    if(!items.length){ ul.innerHTML = q.length>=2? `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>` : '<li class="empty">Este ámbito no tiene avenidas con kilómetros prioritarios (Muy Alta o Alta).</li>'; return; }
    for(const [a,s] of items){ const li=document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button'); const nb=[...s.nombres]; const ms=[...s.muns];
      li.innerHTML = `<div><div class="n">${VPC.nomenclat[a]}</div><div class="t">${nb.slice(0,2).join(', ')}${nb.length>2?' +'+(nb.length-2):''}${sel===null? ' · '+ms.slice(0,2).map(m=>META.munNames[m]).join(', ')+(ms.length>2?' +'+(ms.length-2):''):''}</div></div>
        <div class="k">${kmFull(s.kmp)}<small>${s.recsp.size} de ${s.recs.size} tramos de la avenida son prioritarios</small></div>`;
      if (selAv===a) li.classList.add('active');
      const go=()=>pickAvenida(a); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
    return;
  }
  let items = [];
  const scF = selCol!==null? 'en la colonia '+META.colonias[selCol].n : sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
  if (q.length<2 && sel===null && selCol===null){ $('search-title').textContent='Buscar una calle'; $('search-count').textContent=''; ul.innerHTML='<li class="empty">Elige una alcaldía o una colonia arriba para ver sus calles con más frente prioritario, o escribe el nombre de una calle para consultarla en toda la ciudad.</li>'; return; }
  if (q.length>=2){ for(const [key,s] of streetIdx){ if (calleCoincide(s, q)) items.push([key,s]); } $('search-title').textContent=`Calles encontradas ${scF}`;
    if (sel===null && selCol===null && new Set(items.map(x=>x[1].col)).size>1){ renderUbicar(items, $('q').value.trim()); return; }
    if (sel!==null && selCol===null) locChips(`<button type="button" class="lchip" data-m="">Buscar «${$('q').value.trim().replace(/[<>&"]/g,'')}» en otra alcaldía</button>`); }
  else { for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } $('search-title').textContent=`Calles con más km de frente prioritario ${scF}`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length; items = items.slice(0, q.length>=2? 40 : 10);
  $('search-count').textContent = selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q.length>=2?'':' con frente prioritario'}`
    : q.length>=2 ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  if(!items.length){ ul.innerHTML = q.length>=2? `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>` : '<li class="empty">Este ámbito no tiene calles con frente prioritario (Muy Alta o Alta).</li>'; return; }
  for(const [key,s] of items){
    const li = document.createElement('li'); li.tabIndex=0; li.setAttribute('role','button');
    const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    li.innerHTML = `<div><div class="n">${META.names[s.nid]||'Sin nombre'}</div><div class="t">${donde? donde+' · ':''}${tipos}</div>${desgHtml(s)}</div>
      <div class="k">${kmFull(s.kmp)}<small>${s.np} de ${s.idx.length} frentes prioritarios</small></div>`;
    if (highlight && highlight.nameId===key) li.classList.add('active');
    const go = ()=>{ highlightStreet(key, s); [...ul.children].forEach(x=>x.classList.remove('active')); li.classList.add('active'); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter'){ go(); } };
    ul.appendChild(li);
  }
  if (q.length<2 && sinNombre.kmp>0){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI ("Ninguno" o "Manzana o edificación contigua"). No aparecen en esta lista, pero sí en el Excel de frentes.`; ul.appendChild(li); }
}
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
  hideCard(); collapseSheet(); flyTo(vs, 1000); rerender(); renderActions(); syncCalleBtns();
}
$('q').addEventListener('input', renderResults);
// Renglones de los listados (auditoría H-049): se activan también con la barra espaciadora y, como el listado se vuelve a
// armar al elegir, el foco pasa al título de la respuesta (cambio de ámbito) o regresa al renglón elegido (calle consultada).
for (const id of ['results','tramos']) $(id).addEventListener('keydown', e=>{ const li = e.target; if (!li.matches || !li.matches('li[tabindex]')) return;
  if (e.key===' '){ e.preventDefault(); li.click(); } if (e.key!==' ' && e.key!=='Enter') return;
  setTimeout(()=>{ const a = document.activeElement; if (a && a!==document.body && a.isConnected) return;
    ($('results').querySelector('li.active') || $('scope-title')).focus(); }, 60); });
