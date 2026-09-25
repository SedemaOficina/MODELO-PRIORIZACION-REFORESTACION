// Listados de la pestaña "Listado": calles dentro de su colonia, avenidas, colonias y alcaldías.
// ---------- índices de calles y avenidas ----------
let streetIdx = null; // Map clave -> {nid, col, idx:[], km, kmp, np, tipos:Set, cols:Set}; clave = calle dentro de su colonia
let sinNombre = {km:0, kmp:0, n:0};  // frentes sin nombre de vialidad en INEGI dentro del ámbito
function buildStreets(){
  streetIdx = new Map(); sinNombre = {km:0, kmp:0, n:0};
  for(let i=0;i<N;i++){ if (F.gc[i]) continue; if (sel!==null && F.mun[i]!==sel) continue; if (selCol!==null && F.col[i]!==selCol) continue; const nid=F.name[i];
    if (PLACEHOLDER.has(nid)){ const k=F.len[i]/1000; sinNombre.km+=k; sinNombre.n++; if(F.prio[i]>=3) sinNombre.kmp+=k; continue; }
    const col=F.col[i]; const key = nid*4096 + col; let s=streetIdx.get(key); if(!s){ s={nid, col, idx:[],km:0,kmp:0,np:0,tipos:new Set(),cols:new Set()}; streetIdx.set(key,s); }
    s.idx.push(i); s.km+=F.len[i]/1000; if(F.prio[i]>=3){ s.kmp+=F.len[i]/1000; s.np++; } s.tipos.add(META.tipos[F.tipo[i]]); if(col) s.cols.add(META.colonias[col].n); }
}
let avIdx = null; // Map nomId -> {idx:[], km, kmp, recs:Set, recsp:Set, nombres:Set, muns:Set, tipos:Set}
function buildAvenues(){
  avIdx = new Map();
  for(let i=0;i<NV;i++){ if (sel!==null && VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=avIdx.get(a); if(!s){ s={idx:[],km:0,kmp:0,recs:new Set(),recsp:new Set(),nombres:new Set(),muns:new Set(),tipos:new Set()}; avIdx.set(a,s); }
    const k=VP.len[i]/1000; s.idx.push(i); s.km+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.nombres.add(VPC.nombres[VP.nombre[i]]); s.muns.add(VP.mun[i]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const NAMES_N = META.names.map(norm);
const AV_N = VPC.nomenclat.map(norm), NOMBRE_N = VPC.nombres.map(norm);
const PLACEHOLDER = new Set(META.names.map((n,i)=>[norm(n),i]).filter(([n])=> n==='' || n==='ninguno' || n==='sin referencia' || n.startsWith('manzana o edificacion')).map(x=>x[1]));
function renderAlcRanking(){
  const items = META.muns.map((m,i)=>i).sort((a,b)=> rankOf(a)-rankOf(b));
  $('search-title').textContent = isGC()? 'Alcaldías ordenadas por km prioritarios de vialidad primaria' : 'Alcaldías ordenadas por km de frente prioritario'; $('search-count').textContent='16 alcaldías de la ciudad';
  const ul=$('results'); ul.innerHTML='';
  for(const i of items){ const s=summOf(i); const tot=sum(s.km); const d=domOf(i); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${dot(pc)}${rankOf(i)}. ${META.munNames[i]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${pct(kmPrio(s),tot)} de ${isGC()? 'sus km de vialidad primaria':'sus km de frente'} es prioritario</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${isGC()? fmt.format(VP_RECS[i].rp.size)+' de '+fmt.format(VP_RECS[i].r.size)+' tramos prioritarios' : fmt.format(s.n[3]+s.n[4])+' frentes prioritarios'} en la alcaldía</small></div>`;
    const go=()=>{ selEl.value=String(i); setSel(String(i)); }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
function renderColoniaRanking(){
  const m = sel===null? null : META.muns[sel]; const items=[];
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n || (m && c.m!==m)) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); }
  items.sort((a,b)=> b[1].kmp-a[1].kmp);
  $('search-title').textContent = `Colonias con más km de frente prioritario ${sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel]}`; $('search-count').textContent = `${fmt.format(items.length)} colonia${items.length===1?'':'s'} con frente prioritario`;
  const ul=$('results'); ul.innerHTML='';
  for(const [i,s] of items.slice(0,10)){ const c=META.colonias[i]; const pc=c.p>=0? T.prio[c.p]:null; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${pc? dot(pc):''}${c.n}</div><div class="t">${sel===null? META.munNames[munIndex[c.m]]+' · ':''}Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}${c.ids? ' · Desarrollo social '+c.ids.toLowerCase():''}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${fmt.format(s.np)} de ${fmt.format(sum(s.n))} frentes de la colonia son prioritarios</small></div>`;
    const go=()=>pickColonia(i); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
  if(!items.length) ul.innerHTML='<li class="empty">Sin colonias con frente prioritario.</li>';
}
function renderAvenueByAlc(){
  // avenida seleccionada: desglose por alcaldía
  const per = new Map();
  for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); }
  const items=[...per.entries()].sort((a,b)=> kmPrio(b[1])-kmPrio(a[1]));
  $('search-title').textContent=`Tramos de ${VPC.nomenclat[selAv]} por alcaldía`; $('search-count').textContent=`cruza ${items.length} alcaldía${items.length===1?'':'s'}`;
  const ul=$('results'); ul.innerHTML='';
  for(const [m,s] of items){ const d=dom(s); const pc=T.prio[d]; const li=document.createElement('li'); li.tabIndex=0;
    li.innerHTML = `<div><div class="n">${dot(pc)}${META.munNames[m]}</div><div class="t">Prioridad predominante ${META.prio[d]} · ${fmt1.format(sum(s.km))} km de la avenida en esta alcaldía</div></div>
      <div class="k">${kmFull(kmPrio(s))}<small>${s.recsp.size} de ${s.recs.size} tramos prioritarios aquí</small></div>`;
    const go=()=>{ if(sel!==m){ selEl.value=String(m); sel=m; refresh(); } }; li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
}
function renderResults(){
  const q = norm($('q').value.trim());
  if (alcOnly() && sel===null && q.length<2){ renderAlcRanking(); return; }
  if (colOnly() && selCol===null && q.length<2){ renderColoniaRanking(); return; }
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
    if(!items.length){ ul.innerHTML=`<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>`; return; }
    for(const [a,s] of items){ const li=document.createElement('li'); li.tabIndex=0; const nb=[...s.nombres]; const ms=[...s.muns];
      li.innerHTML = `<div><div class="n">${VPC.nomenclat[a]}</div><div class="t">${nb.slice(0,2).join(', ')}${nb.length>2?' +'+(nb.length-2):''}${sel===null? ' · '+ms.slice(0,2).map(m=>META.munNames[m]).join(', ')+(ms.length>2?' +'+(ms.length-2):''):''}</div></div>
        <div class="k">${kmFull(s.kmp)}<small>${s.recsp.size} de ${s.recs.size} tramos de la avenida son prioritarios</small></div>`;
      if (selAv===a) li.classList.add('active');
      const go=()=>pickAvenida(a); li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter') go(); }; ul.appendChild(li); }
    return;
  }
  let items = [];
  const scF = selCol!==null? 'en la colonia '+META.colonias[selCol].n : sel===null? 'en toda la ciudad' : 'en la alcaldía '+META.munNames[sel];
  if (q.length<2 && sel===null && selCol===null){ $('search-title').textContent='Buscar una calle'; $('search-count').textContent=''; ul.innerHTML='<li class="empty">Elige una alcaldía o una colonia arriba para ver sus calles con más frente prioritario, o escribe el nombre de una calle para consultarla en toda la ciudad.</li>'; return; }
  if (q.length>=2){ for(const [key,s] of streetIdx){ if (NAMES_N[s.nid].includes(q)) items.push([key,s]); } $('search-title').textContent=`Calles encontradas ${scF}`; }
  else { for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } $('search-title').textContent=`Calles con más km de frente prioritario ${scF}`; }
  items.sort((a,b)=> b[1].kmp-a[1].kmp || b[1].km-a[1].km);
  const total = items.length; items = items.slice(0, q.length>=2? 40 : 10);
  $('search-count').textContent = selCol!==null
    ? `${fmt.format(total)} calle${total===1?'':'s'}${q.length>=2?'':' con frente prioritario'}`
    : q.length>=2 ? `${fmt.format(total)} resultado${total===1?'':'s'}, cada uno en su colonia`
    : `${fmt.format(total)} calles con frente prioritario, contadas por colonia`;
  if(!items.length){ ul.innerHTML = `<li class="empty">Sin coincidencias${sel!==null?' en '+META.munNames[sel]:''}.</li>`; return; }
  for(const [key,s] of items){
    const li = document.createElement('li'); li.tabIndex=0;
    const tl=[...s.tipos].filter(Boolean); const tipos = tl.slice(0,2).join(', ')+(tl.length>2?' +'+(tl.length-2):'');
    const donde = selCol!==null? '' : (s.col? META.colonias[s.col].n : 'Colonia no identificada') + (sel===null? ' · '+META.munNames[F.mun[s.idx[0]]] : '');
    li.innerHTML = `<div><div class="n">${META.names[s.nid]||'Sin nombre'}</div><div class="t">${donde? donde+' · ':''}${tipos}</div></div>
      <div class="k">${kmFull(s.kmp)}<small>${s.np} de ${s.idx.length} frentes prioritarios</small></div>`;
    if (highlight && highlight.nameId===key) li.classList.add('active');
    const go = ()=>{ highlightStreet(key, s); [...ul.children].forEach(x=>x.classList.remove('active')); li.classList.add('active'); };
    li.onclick=go; li.onkeydown=e=>{ if(e.key==='Enter'){ go(); } };
    ul.appendChild(li);
  }
  if (q.length<2 && sinNombre.kmp>0){ const li=document.createElement('li'); li.className='empty sinnombre';
    li.textContent = `Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${selCol!==null?'de esta colonia':'de la alcaldía'} no tienen nombre de vialidad en INEGI ("Ninguno" o "Manzana o edificación contigua"). No aparecen en esta lista, pero sí en el Excel de frentes.`; ul.appendChild(li); }
}
function highlightStreet(nid, s){
  highlight = {nameId:nid, idx:s.idx};
  let w=180,sN=90,e=-180,n=-90; for(const i of s.idx){ for(let k=start[i];k<start[i+1];k++){ const x=POS[2*k],y=POS[2*k+1]; if(x<w)w=x; if(x>e)e=x; if(y<sN)sN=y; if(y>n)n=y; } }
  const pad = 0.0015; const vs = fitTo([w-pad,sN-pad,e+pad,n+pad], 60); vs.zoom = Math.min(vs.zoom, 16.5);
  hideCard(); collapseSheet(); flyTo(vs, 1000); rerender();
}
$('q').addEventListener('input', renderResults);
