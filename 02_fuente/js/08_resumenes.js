// Estadísticas por colonia, avenida y ámbito; cifras principales, barras por prioridad y textos de contexto del panel.
// estadísticas por colonia (frentes a cargo de la alcaldía)
let COLSTAT = null;
function colStat(id){ if(!COLSTAT){ COLSTAT = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i]) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,pl:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000, fl=F.flags[i]; s.n[p]++; s.km[p]+=k; if(esPrio(p)){ s.kmp+=k; s.np++; }
      if (p>=UNIV_MIN && (fl&7)===1 && ((fl>>3)&7)===0) s.pl+=k; } }   // pl: universo de intervención sin arbolado y con banqueta (INEGI), igual que repStat()
  return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,pl:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(p>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// Vialidades distintas que comparten nombre (auditoría H-044): las partes de una avenida se agrupan por continuidad espacial;
// dos grupos separados por más de AV_SEP metros son vialidades distintas y la consulta lo advierte.
const AV_SEP = 1500, AVG = new Map();
function avGrupos(a){ let g=AVG.get(a); if (g) return g; const idx=avStat(a).idx, n=idx.length, c=Math.cos(19.35*Math.PI/180);
  const E = idx.map(i=>{ const p=vstart[i], q=vstart[i+1]-1; return [VPOS[2*p]*111320*c, VPOS[2*p+1]*110540, VPOS[2*q]*111320*c, VPOS[2*q+1]*110540]; });
  const par = idx.map((_,k)=>k); const find = k=>{ while(par[k]!==k){ par[k]=par[par[k]]; k=par[k]; } return k; };
  for(let p=0;p<n;p++) for(let q=p+1;q<n;q++){ const A=E[p], B=E[q];
    const d = Math.min(Math.hypot(A[0]-B[0],A[1]-B[1]), Math.hypot(A[0]-B[2],A[1]-B[3]), Math.hypot(A[2]-B[0],A[3]-B[1]), Math.hypot(A[2]-B[2],A[3]-B[3])); if (d<=AV_SEP) par[find(p)]=find(q); }
  const M = new Map(); idx.forEach((i,k)=>{ const r=find(k); let s=M.get(r); if(!s){ s={km:0, muns:new Set()}; M.set(r,s); } s.km+=VP.len[i]/1000; s.muns.add(VP.mun[i]); });
  g = [...M.values()].sort((x,y)=>y.km-x.km); AVG.set(a,g); return g; }
const avGruposTxt = a => { const g=avGrupos(a); return g.length<2? '' : `Atención: con este nombre hay ${g.length} vialidades separadas entre sí por más de ${fmt1.format(AV_SEP/1000)} km (${g.map(x=>[...x.muns].map(m=>META.munNames[m]).join(' y ')+', '+kmFull(x.km)).join('; ')}). Las cifras las suman`; };
// resumen de vialidades en un ámbito (alcaldía y/o avenida)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(sel!==null && VP.mun[i]!==sel) continue; if(selAv!==null && VP.nom[i]!==selAv) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(p>=3) s.recsp.add(VP.rec[i]); } return s; }

// ---------- reparto por responsable y universo de intervención ----------
// Universo de intervención = prioridades Muy Alta, Alta y Media. «Prioritario» sigue siendo Muy Alta + Alta.
const kmUniv = s => s.km[2]+sumPrio(s.km);
// Kilómetros de FRENTE DE MANZANA por responsable (0 = alcaldía, 1 = Gobierno Central) y prioridad en un ámbito:
// total (km), sin arbolado (sa) y sin arbolado con banqueta registrada por INEGI (sb). Con colonia manda la colonia, igual que enAmbito().
const REP_CACHE = new Map();
function repStat(mun, col){
  const key = mun+'|'+col; let r = REP_CACHE.get(key); if (r) return r;
  r = {km:[[0,0,0,0,0],[0,0,0,0,0]], sa:[[0,0,0,0,0],[0,0,0,0,0]], sb:[[0,0,0,0,0],[0,0,0,0,0]]};
  for(let i=0;i<N;i++){ if (col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun)) continue;
    const g=F.gc[i], p=F.prio[i], k=F.len[i]/1000, fl=F.flags[i]; r.km[g][p]+=k;
    if ((fl&7)===1){ r.sa[g][p]+=k; if (((fl>>3)&7)===0) r.sb[g][p]+=k; } }
  if (REP_CACHE.size>40) REP_CACHE.clear(); REP_CACHE.set(key, r); return r; }
const univ3 = sumUniv;
// Equivalente en km de FRENTE DE MANZANA (aceras con manzana enfrente) de las vialidades primarias de un ámbito.
// La cifra oficial del Gobierno Central es el km de vialidad medido sobre el eje; el km de frente es su dato complementario
// y la única unidad con la que se compara o se suma con las alcaldías (auditoría H-018).
const GCF_CACHE = new Map();
function gcFrente(mun, av){ const key=mun+'|'+av; let r=GCF_CACHE.get(key); if (r) return r; r={km:[0,0,0,0,0]};
  for(let i=0;i<N;i++){ if(!F.gc[i]) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; r.km[F.prio[i]]+=F.len[i]/1000; }
  if (GCF_CACHE.size>60) GCF_CACHE.clear(); GCF_CACHE.set(key,r); return r; }
const gcFrenteTxt = (mun, av) => { const g=gcFrente(mun, av); return `Equivalen a ${kmFull(sum(g.km))} de frente de manzana (aceras con manzana enfrente), ${kmFull(kmPrio(g))} prioritarios`; };
const km1 = v => v>0 && v<0.05? '<0.1' : fmt1.format(v);   // cuadro de reparto: siempre en km con un decimal
function repartoHtml(){
  const R = repStat(sel, selCol);
  const amb = selCol!==null? 'colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
  const fila = (lab, a, g, cls, sw) => `<tr${cls? ' class="'+cls+'"':''}><th scope="row">${sw!==undefined? `<i data-st="background:var(--p${sw})"></i>`:''}${lab}</th><td>${km1(a)}</td><td>${km1(g)}</td><td>${km1(a+g)}</td></tr>`;
  let h = `<div class="section-title"><h2>Quién atiende · km de frente de manzana</h2><span>${amb}</span></div>
    <table class="reparto"><thead><tr><th scope="col">Prioridad</th><th scope="col">${sel===null? 'Alcaldías':'Alcaldía'}</th><th scope="col">Gobierno Central</th><th scope="col">Total</th></tr></thead><tbody>`;
  for(let p=4;p>=0;p--) h += fila(META.prio[p], R.km[0][p], R.km[1][p], '', p);
  h += fila('Total', sum(R.km[0]), sum(R.km[1]), 'tot');
  h += fila('Universo de intervención <small>Muy Alta, Alta y Media</small>', univ3(R.km[0]), univ3(R.km[1]), 'univ');
  h += fila('<span>de ese universo,</span> sin arbolado', univ3(R.sa[0]), univ3(R.sa[1]), 'sub');
  h += fila('<span>de ese universo,</span> sin arbolado y con banqueta <small>INEGI</small>', univ3(R.sb[0]), univ3(R.sb[1]), 'sub');
  h += `</tbody></table><p class="note">Cifras en kilómetros de frente de manzana: cada lado de la calle frente a una manzana cuenta por separado. No son comparables con los kilómetros de vialidad primaria, que se miden sobre el eje de la vialidad. El universo de intervención reúne las prioridades Muy Alta, Alta y Media; «prioritario» se reserva para Muy Alta y Alta. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación, que debe verificarse en campo. La asignación entre alcaldía y Gobierno Central es preliminar.</p>`;
  return h;
}
function univHtml(fs, vs, amb, ambV){
  const linea = (km, tot, txt) => `<div class="univline"><b>${kmFull(km)}</b><span>${txt} · ${pct(km,tot)}</span></div>`;
  let h='';
  if (fs && sum(fs.km)>0) h += linea(kmUniv(fs), sum(fs.km), `de frente en el universo de intervención (Muy Alta, Alta y Media) ${amb}`);
  if (vs) h += linea(kmUniv(vs), sum(vs.km), `de vialidad primaria en el universo de intervención (Muy Alta, Alta y Media) ${ambV}`);
  return h;
}

// ---------- resumen del ámbito consultado ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0,u:0,nbi:0})); let t=0,p=0,u=0,nbi=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(c.p>=UNIV_MIN){ alc[m].u+=pb; u+=pb; } if(esPrio(c.p)){ alc[m].p+=pb; p+=pb; alc[m].nbi+=c.nbi||0; nbi+=c.nbi||0; } }
  return {alc, city:{t,p,u,nbi}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
// Participación de una alcaldía en los km prioritarios de la ciudad. Sustituye al «lugar entre 16 alcaldías»:
// describe dónde se concentra la necesidad sin ordenar a las alcaldías como si fuera una calificación (auditoría H-072).
const partTxt = (i, gc) => pct(kmPrio((gc? VPC.summ : META.summ)[META.muns[i]]), gc? vCityPrioKm : cityPrioKm) + ' de los km prioritarios de la ciudad';
// Las dos alcaldías con más km prioritarios, calculadas de los datos (antes estaban escritas a mano).
const top2Txt = (S, tot) => { const o = META.muns.map((m,i)=>[i, kmPrio(S[m])]).sort((a,b)=>b[1]-a[1]);
  return `${META.munNames[o[0][0]]} y ${META.munNames[o[1][0]]} concentran ${pct(o[0][1]+o[1][1], tot)} de los km prioritarios de la ciudad.`; };
function frSumm(){
  if (selCol!==null){ const s={n:[0,0,0,0,0], km:[0,0,0,0,0]}; for(let i=0;i<N;i++){ if(F.col[i]!==selCol || F.gc[i]) continue; const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; } return s; }
  return sel===null? CITY : META.summ[META.muns[sel]];
}
function kpiHtml(s, opts){
  const tot = sum(s.km); const prio = kmPrio(s); const nprio = opts.nprio;
  return `<div class="kpi"><div class="v">${kmTxt(prio)}<small>${kmUn(prio)}</small></div><div class="l">${opts.l1}</div></div>
    <div class="kpi"><div class="v">${tot? fmt1.format(100*prio/tot):'0'}<small>%</small></div><div class="l">de los ${kmFull(tot)} ${opts.l2}</div></div>
    <div class="kpi"><div class="v">${nprio>=10000? fmt1.format(nprio/1000)+'<small>mil</small>' : fmt.format(nprio)}</div><div class="l">${opts.l3}</div></div>`;
}
function barsHtml(s){ const tot=sum(s.km); const max = Math.max(...s.km, 0.001); return META.prio.map((p,k)=>`
    <div class="lab"><i data-st="background:var(--p${k})"></i>${p}</div>
    <div class="track"><div class="fill" data-st="width:${100*s.km[k]/max}%;background:var(--p${k})"></div></div>
    <div class="val">${kmFull(s.km[k])}<small>${pct(s.km[k],tot)}</small></div>`).reverse().join(''); }
function renderSummary(){
  const scopeName = selAv!==null? VPC.nomenclat[selAv] : selCol!==null? META.colonias[selCol].n : sel===null? 'Ciudad de México' : META.munNames[sel];
  $('scope-label').textContent = scopeName;
  const amb = selCol!==null?'de la colonia':sel===null?'de la ciudad':'de la alcaldía';
  const fs = frSumm(); const nprioF = sumPrio(fs.n);
  const emptyCol = selCol!==null && sum(fs.n)===0;  // colonia sin frentes a cargo de la alcaldía (auditoría I3)
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`de frente prioritario ${amb}<br>(Muy Alta + Alta)`, l2:`de frentes ${amb}`, l3:`frentes prioritarios ${amb}`+(sel!==null && selCol===null? '<br>'+partTxt(sel,false):'')});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV = selAv!==null? (sel===null? 'de la avenida en toda la ciudad' : 'de la avenida dentro de la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`de vialidad primaria prioritaria ${ambV1}<br>(Muy Alta + Alta)`, l2:ambV, l3:`tramos prioritarios ${ambV1}<br>de ${fmt.format(vs.recs.size)} tramos`+(sel!==null && selAv===null? '<br>'+partTxt(sel,true):'')}) : '';
  const pobLine = (()=>{ if (isGC()) return '';
    if (selAv!==null) return '';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · su unidad territorial tiene desarrollo social ${c.ids.toLowerCase()}`:''}</div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><b>${hab(P.p)}</b><span>residen en colonias de prioridad Alta o Muy Alta ${sel===null?'de la ciudad':'de la alcaldía'} · ${pct(P.p,P.t)} de su población<small class="pobnota">Con las colonias de prioridad Media, el universo de intervención reúne ${hab(P.u)} (${pct(P.u,P.t)}). Población residente (Censo 2020); no equivale a población atendida.</small></span></div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = (resp==='both')? '' : pobLine; pb.hidden = !pb.innerHTML; }
  // universo de intervención (Muy Alta, Alta y Media) y cuadro de reparto por responsable
  const ub = $('univbox'); if (ub){ ub.innerHTML = univHtml(resp!=='gc' && !emptyCol? fs : null, (vs && !(resp==='both' && selCol!==null))? vs : null, amb, ambV1); ub.hidden = !ub.innerHTML; }
  if (ub && vs && resp==='gc'){ ub.innerHTML += `<div class="univline eq"><span>${gcFrenteTxt(sel, selAv)}. Los kilómetros de vialidad se miden sobre el eje de la avenida; los de frente, por cada acera. Para comparar o sumar con las alcaldías se usa el kilómetro de frente.</span></div>`; ub.hidden=false; }
  const rp = $('reparto'); if (rp){ rp.hidden = selAv!==null; rp.innerHTML = rp.hidden? '' : repartoHtml(); }
  // resumen compacto sobre el mapa
  const ms = $('mapsum');
  if (ms){
    const tag = selAv!==null? (sel===null? 'Avenida' : 'Avenida en alcaldía') : selCol!==null? 'Colonia' : sel===null? 'Resumen' : 'Alcaldía';
    const dcol = selCol!==null? (META.colonias[selCol].p>=0? T.prio[META.colonias[selCol].p] : null)
      : sel!==null? T.prio[domOf(sel)] : null;
    const P = sel===null? POB.city : POB.alc[sel];
    let stats;
    if (isGC()){
      const t2 = sum(vs.km);
      const scV2 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
      stats = `<div class="st"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios ${scV2}</small></div>
        <div class="st opt"><b>${pct(kmPrio(vs),t2)}</b><small>de ${kmFull(t2)} ${scV2}</small></div>
        <div class="st opt"><b>${fmt.format(vs.recsp.size)}</b><small>tramos prioritarios ${scV2}</small></div>`;
    } else if (resp==='both'){
      // en una colonia no hay cifra de vialidades primarias: se muestra su población en su lugar
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} de frente prioritarios · a cargo de la Alcaldía</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} de vialidad prioritarios · a cargo del Gob. Central</small></div>`}
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    } else if (emptyCol){
      stats = `<div class="st"><b>Sin frentes</b><small>a cargo de la alcaldía en esta colonia</small></div>
        <div class="st opt"><b>${habC(META.colonias[selCol].pob||0)}</b><small>habitantes de la colonia</small></div>`;
    } else {
      const t2 = sum(fs.km);
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios de frente</small></div>
        <div class="st opt"><b>${pct(kmPrio(fs),t2)}</b><small>de ${kmFull(t2)} de frentes ${amb}</small></div>
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    }
    const scopeTxt = (selAv!==null && sel!==null)? `${scopeName} · ${META.munNames[sel]}` : scopeName;
    ms.innerHTML = `<div class="scope"><span>${tag}</span><b>${dcol? `<i data-st="background:rgb(${dcol[0]},${dcol[1]},${dcol[2]})"></i>`:''}${scopeTxt}</b></div><div class="sep"></div>${stats}`;
  }
  // km por categoría del ámbito consultado, en la leyenda (auditoría M1)
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmFull(ls.km[+e.dataset.k]); });
    $('lg-scope').textContent = resp==='gc' ? `Prioridad · km de vialidad primaria ${ambV1}` : `Prioridad · km de frente ${amb}`; }
  const b2t = $('bars2-title');
  if (resp==='alc'){ $('kpis').innerHTML = kFr; $('kpis').className='kpis'; $('bars').innerHTML = emptyCol? '' : barsHtml(fs); $('bars-title').textContent=`Kilómetros de frente de manzana por prioridad ${amb}`; $('bars2').hidden=true; }
  else if (resp==='gc'){ $('kpis').innerHTML = kVp; $('kpis').className='kpis'; $('bars').innerHTML = barsHtml(vs); $('bars-title').textContent=`Kilómetros de vialidad primaria por prioridad ${ambV1}`; $('bars2').hidden=true; }
  else {
    const ambN = selCol!==null? 'colonia '+META.colonias[selCol].n : sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
    const ambG = sel===null? 'toda la ciudad' : 'alcaldía '+META.munNames[sel];
    const avisoCol = selCol!==null? ' · sin desglose por colonia' : '';
    $('kpis').className='kpis dual';
    $('kpis').innerHTML = `<div class="cap">Frentes de manzana · a cargo de la Alcaldía · ${ambN}</div>${kFr}${pobLine? '<div class="cap pob">'+pobLine+'</div>':''}<div class="cap">Vialidades primarias · a cargo del Gobierno Central · ${ambG}${avisoCol}</div>${kVp}`;
    $('bars-title').textContent=`Km por prioridad · frentes de manzana (Alcaldía) · ${ambN}`;
    if(b2t) b2t.textContent=`Km por prioridad · vialidades primarias (Gobierno Central) · ${ambG}${avisoCol}`;
    $('bars').innerHTML = barsHtml(fs); $('bars2').hidden=false; $('bars2-rows').innerHTML = barsHtml(vs); }
  const gcs = sel===null? META.city_gc : META.summ_gc[META.muns[sel]];
  const note = $('bars-note');
  if (resp==='gc'){
    const tot=sum(vs.km);
    note.textContent = sel===null
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. ${top2Txt(VPC.summ, vCityPrioKm)}`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
  } else if (emptyCol){
    note.textContent = EMPTY_MSG;
  } else {
    note.textContent = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. ${top2Txt(META.summ, cityPrioKm)}`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(sumPrio(fs.n))+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (selCol===null && sinColStat().n? ` ${fmt.format(sinColStat().n)} frentes (${kmFull(sinColStat().km)}) ${sel===null?'de la ciudad':'de la alcaldía'} no tienen colonia asignada en el catálogo: se cuentan aquí, pero no aparecen en las consultas por colonia.` : '')
      + (resp==='alc' && selCol===null? ` Además, ${fmt0.format(sum(gcs.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'} (${fmt0.format(kmPrio(gcs))} km prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.` : '');
  }
}
