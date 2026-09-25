// Buscador único: alcaldías, colonias, avenidas y calles, con abreviaturas y tolerancia a errores.
// ---------- buscador único (auditoría C6) ----------
const omni=$('omni'), omniList=$('omni-list'), omniClear=$('omni-clear');
const OMNI_AB = Object.assign({}, ABREV, {calz:'calzada', clz:'calzada', av:'avenida', avda:'avenida', ave:'avenida', blvd:'boulevard', cda:'cerrada', priv:'privada', and:'andador', circ:'circuito', cto:'circuito', dr:'doctor', ing:'ingeniero', lic:'licenciado', mtro:'maestro', pdte:'presidente', fco:'francisco', gpe:'guadalupe', ma:'maria', col:'colonia'});
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
  OM = { alc: META.munNames.map(toks), col: META.colonias.map(c=> c.n? toks(c.n) : null), colUT: META.colonias.map(c=> c.ut? toks(c.ut) : null), av: VPC.nomenclat.map(toks), avRV: [] };
  const stat = new Map();
  for(let i=0;i<N;i++){ if (F.gc[i]) continue; const nid=F.name[i]; if (PLACEHOLDER.has(nid)) continue; let s=stat.get(nid); if(!s){ s={cols:new Map(), kmp:0, muns:new Set()}; stat.set(nid,s); }
    const k = F.prio[i]>=3? F.len[i]/1000 : 0; s.kmp+=k; s.cols.set(F.col[i], (s.cols.get(F.col[i])||0)+k); s.muns.add(F.mun[i]); }
  OM.stStat = stat; OM.stIds = [...stat.keys()]; OM.st = OM.stIds.map(nid=>toks(META.names[nid]));
  // colonias homónimas (mismo nombre, CP y alcaldía): se numeran
  const seen = new Map(); OM.part = new Map();
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const k=c.n+'|'+(c.cp||'')+'|'+c.m; const a=seen.get(k)||[]; a.push(i); seen.set(k,a); }
  for(const a of seen.values()) if (a.length>1) a.forEach((id,k)=>OM.part.set(id, [k+1, a.length]));
  return OM; }
let omniItems=[], omniActive=-1, omniQ='';
function omniSearch(q){
  const qt = toks(q).filter(t=>!STOP.has(t)); if (!qt.length || q.trim().length<2) return null;
  const I = omniIndex(); omniTypo=false; const R = {alc:[], col:[], av:[], st:[]};
  I.alc.forEach((ct,i)=>{ const s=omniMatch(qt,ct); if(s) R.alc.push({t:'alc', i, s: s+1.5}); });
  for(let i=1;i<I.col.length;i++){ if(!I.col[i]) continue; let s=omniMatch(qt,I.col[i]), via=''; if(!s && I.colUT[i]){ s=omniMatch(qt,I.colUT[i]); if(s){ s-=1; via=META.colonias[i].ut; } } if(s) R.col.push({t:'col', i, s: s+0.5, via}); }
  I.av.forEach((ct,a)=>{ let s=omniMatch(qt,ct), via='';
    if(!s){ if(!I.avRV[a]) I.avRV[a] = [...avStat(a).nombres].map(n=>[n,toks(n)]); for(const [n,rt] of I.avRV[a]){ const s2=omniMatch(qt,rt); if(s2){ s=s2-0.5; via=n; break; } } }
    if(s) R.av.push({t:'av', a, s: s+1.5, via}); });
  I.st.forEach((ct,k)=>{ const s=omniMatch(qt,ct); if(s) R.st.push({t:'st', nid:I.stIds[k], s}); });
  const kmpOf = it => it.t==='st'? I.stStat.get(it.nid).kmp : it.t==='av'? avStat(it.a).kmp : it.t==='col'? colStat(it.i).kmp : 0;
  for (const k in R) R[k].sort((x,y)=> y.s-x.s || kmpOf(y)-kmpOf(x));
  R.alc=R.alc.slice(0,3); R.col=R.col.slice(0,6); R.av=R.av.slice(0,4); R.st=R.st.slice(0,5);
  const expanded = norm(q).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(t=>OMNI_AB[t] && OMNI_AB[t]!==t).map(t=>`«${t}» como «${OMNI_AB[t]}»`);
  R.qt = qt; R.why = [expanded.length? 'Se reconoció '+expanded.join(', ')+'.' : '', omniTypo? 'Incluye coincidencias aproximadas (una letra de diferencia).' : ''].filter(Boolean).join(' ');
  return R; }
function omniMark(name, qt){ return name.split(/(\s+)/).map(w=>{ const n=toks(w)[0]||''; return (n && qt.some(q=>tokScore(q,n)>=1.5))? `<mark>${w}</mark>` : w; }).join(''); }
function omniRender(){
  const R = omniSearch(omni.value); omniList.innerHTML=''; omniItems=[]; omniActive=-1;
  if (!R){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); return; }
  const groups = [['alc','Alcaldías'],['col','Colonias'],['av','Avenidas · Gobierno Central'],['st','Calles · alcaldías']].filter(([k])=>R[k].length).sort((a,b)=> R[b[0]][0].s - R[a[0]][0].s);
  if (!groups.length){ omniList.innerHTML = `<li class="empty">Sin coincidencias. Prueba con menos palabras o con otra forma del nombre.</li>`; omniList.hidden=false; omni.setAttribute('aria-expanded','true'); return; }
  const I = omniIndex();
  for (const [k,title] of groups){ const g=document.createElement('li'); g.className='grp'; g.setAttribute('role','presentation'); g.textContent=title; omniList.appendChild(g);
    for (const it of R[k]){ const li=document.createElement('li'); li.className='opt'; li.setAttribute('role','option'); li.id='om-'+omniItems.length; let html='';
      if (it.t==='alc'){ const d=domOf(it.i); html = `<span class="ty">Alc</span><span class="nm">${omniMark(META.munNames[it.i], R.qt)}</span><span class="k">${kmFull(kmPrio(summOf(it.i)))} prior.</span><span class="m">Prioridad predominante ${META.prio[d]}</span>`; }
      else if (it.t==='col'){ const c=META.colonias[it.i]; const pt=I.part.get(it.i); html = `<span class="ty">Col</span><span class="nm">${omniMark(c.n, R.qt)}${pt? ` <small>· parte ${pt[0]} de ${pt[1]}</small>`:''}</span><span class="k">${c.p>=0? META.prio[c.p] : '—'}</span><span class="m">${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${it.via? ` · coincide con su unidad territorial: ${it.via}`:''}</span>`; }
      else if (it.t==='av'){ const s=avStat(it.a); html = `<span class="ty">Av</span><span class="nm">${omniMark(VPC.nomenclat[it.a], R.qt)}</span><span class="k">${kmFull(s.kmp)} prior.</span><span class="m">${[...s.nombres].slice(0,2).join(', ')} · cruza ${s.muns.size} alcaldía${s.muns.size===1?'':'s'}${it.via? ` · coincide con la red vial ${it.via}`:''}</span>`; }
      else { const s=I.stStat.get(it.nid); const cols=[...s.cols.keys()].filter(Boolean); const one = cols.length===1;
        html = `<span class="ty">Calle</span><span class="nm">${omniMark(META.names[it.nid], R.qt)}</span><span class="k">${kmFull(s.kmp)} prior.</span><span class="m">${one? META.colonias[cols[0]].n+' · '+META.munNames[[...s.muns][0]] : `${fmt.format(cols.length)} calles con este nombre en distintas colonias · ver en el listado`}</span>`; }
      li.innerHTML = html; const n=omniItems.length; omniItems.push(it);
      li.onmousedown = e=>{ e.preventDefault(); omniPick(omniItems[n]); }; omniList.appendChild(li); } }
  if (R.why){ const w=document.createElement('li'); w.className='why'; w.setAttribute('role','presentation'); w.textContent=R.why; omniList.appendChild(w); }
  omniList.hidden=false; omni.setAttribute('aria-expanded','true'); }
function omniSetActive(i){ const lis=[...omniList.querySelectorAll('li.opt')]; if(!lis.length) return; omniActive=(i+lis.length)%lis.length;
  lis.forEach((l,k)=>l.classList.toggle('active',k===omniActive)); lis[omniActive].scrollIntoView({block:'nearest'}); omni.setAttribute('aria-activedescendant', lis[omniActive].id); }
function omniClose(){ omniList.hidden=true; omni.setAttribute('aria-expanded','false'); omni.removeAttribute('aria-activedescendant'); }
function omniPick(it){
  omniClose(); omni.value=''; omniClear.hidden=true; omni.blur();
  if (it.t==='alc'){ if (isGC() && selAv!==null){ selAv=null; highlight=null; } selEl.value=String(it.i); setSel(String(it.i)); }
  else if (it.t==='col'){ pickColonia(it.i); }
  else if (it.t==='av'){ if (sel!==null && !avStat(it.a).muns.has(sel)){ sel=null; selEl.value=''; } pickAvenida(it.a); }
  else { const s=omniIndex().stStat.get(it.nid); if (isGC()) setResp('alc');
    const cols=[...s.cols.keys()].filter(Boolean);
    if (cols.length===1){ pickColonia(cols[0]); const key=it.nid*4096+cols[0]; const st=streetIdx.get(key); if (st){ highlightStreet(key, st); } setTab('list'); renderResults(); }
    else { const muns=[...s.muns]; if (muns.length===1){ if (sel!==muns[0] || selCol!==null){ selEl.value=String(muns[0]); setSel(String(muns[0])); } } else if (sel!==null || selCol!==null){ selEl.value=''; setSel(''); }
      $('q').value = META.names[it.nid]; renderResults(); setTab('list'); } }
  collapseSheet(); }
omni.addEventListener('input', ()=>{ omniClear.hidden = !omni.value; omniRender(); });
omni.addEventListener('focus', ()=>{ if (isPhone() && sheetState==='peek') setSheetState('full'); if (omni.value.trim().length>=2) omniRender(); });
omni.addEventListener('blur', ()=> setTimeout(omniClose, 150));
omni.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ e.preventDefault(); if (omniList.hidden) omniRender(); omniSetActive(omniActive+1); }
  else if (e.key==='ArrowUp'){ e.preventDefault(); omniSetActive(omniActive-1); }
  else if (e.key==='Enter'){ if (!omniList.hidden && omniItems.length){ e.preventDefault(); omniPick(omniItems[omniActive>=0? omniActive : 0]); } }
  else if (e.key==='Escape'){ if (!omniList.hidden){ e.stopPropagation(); omniClose(); } else if (omni.value){ omni.value=''; omniClear.hidden=true; } } });
omniClear.onclick = ()=>{ omni.value=''; omniClear.hidden=true; omniClose(); omni.focus(); };
