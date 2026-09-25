// Estadísticas por colonia, avenida y ámbito; cifras principales, barras por prioridad y textos de contexto del panel.
// estadísticas por colonia (frentes a cargo de la alcaldía)
let COLSTAT = null;
function colStat(id){ if(!COLSTAT){ COLSTAT = new Map(); for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i]) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; if(p>=3){ s.kmp+=k; s.np++; } } } return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(p>=3){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// resumen de vialidades en un ámbito (alcaldía y/o avenida)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(sel!==null && VP.mun[i]!==sel) continue; if(selAv!==null && VP.nom[i]!==selAv) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(p>=3) s.recsp.add(VP.rec[i]); } return s; }

// ---------- resumen del ámbito consultado ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0,nbi:0})); let t=0,p=0,nbi=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(c.p>=3){ alc[m].p+=pb; p+=pb; alc[m].nbi+=c.nbi||0; nbi+=c.nbi||0; } }
  return {alc, city:{t,p,nbi}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
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
    <div class="lab"><i style="background:var(--p${k})"></i>${p}</div>
    <div class="track"><div class="fill" style="width:${100*s.km[k]/max}%;background:var(--p${k})"></div></div>
    <div class="val">${kmFull(s.km[k])}<small>${pct(s.km[k],tot)}</small></div>`).reverse().join(''); }
function renderSummary(){
  const scopeName = selAv!==null? VPC.nomenclat[selAv] : selCol!==null? META.colonias[selCol].n : sel===null? 'Ciudad de México' : META.munNames[sel];
  $('scope-label').textContent = scopeName;
  const amb = selCol!==null?'de la colonia':sel===null?'de la ciudad':'de la alcaldía';
  const fs = frSumm(); const nprioF = fs.n[3]+fs.n[4];
  const emptyCol = selCol!==null && sum(fs.n)===0;  // colonia sin frentes a cargo de la alcaldía (auditoría I3)
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`de frente prioritario ${amb}<br>(Muy Alta + Alta)`, l2:`de frentes ${amb}`, l3:`frentes prioritarios ${amb}`+(sel!==null && selCol===null? '<br>'+rank[sel]+'.º lugar de 16 alcaldías en km prioritarios':'')});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV = selAv!==null? (sel===null? 'de la avenida en toda la ciudad' : 'de la avenida dentro de la alcaldía') : sel===null? 'de vialidad primaria de la ciudad' : 'de vialidad primaria de la alcaldía';
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`de vialidad primaria prioritaria ${ambV1}<br>(Muy Alta + Alta)`, l2:ambV, l3:`tramos prioritarios ${ambV1}<br>de ${fmt.format(vs.recs.size)} tramos`+(sel!==null && selAv===null? '<br>'+rankVP[sel]+'.º lugar de 16 alcaldías en km prioritarios':'')}) : '';
  const pobLine = (()=>{ if (isGC()) return '';
    if (selAv!==null) return '';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · desarrollo social ${c.ids.toLowerCase()}`:''}</div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><b>${hab(P.p)}</b> viven en colonias prioritarias ${sel===null?'de la ciudad':'de la alcaldía'} · ${pct(P.p,P.t)} de su población</div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = (resp==='both')? '' : pobLine; pb.hidden = !pb.innerHTML; }
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
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios · a cargo de la Alcaldía</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios · a cargo del Gob. Central</small></div>`}
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
    ms.innerHTML = `<div class="scope"><span>${tag}</span><b>${dcol? `<i style="background:rgb(${dcol[0]},${dcol[1]},${dcol[2]})"></i>`:''}${scopeTxt}</b></div><div class="sep"></div>${stats}`;
  }
  // km por categoría del ámbito consultado, en la leyenda (auditoría M1)
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmTxt(ls.km[+e.dataset.k]); });
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
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. Iztapalapa y Gustavo A. Madero concentran ${pct(kmPrio(VPC.summ['007'])+kmPrio(VPC.summ['005']), vCityPrioKm)} de los km prioritarios de la ciudad.`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
  } else if (emptyCol){
    note.textContent = EMPTY_MSG;
  } else {
    note.textContent = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. Iztapalapa y Gustavo A. Madero concentran ${pct(kmPrio(META.summ['007'])+kmPrio(META.summ['005']), cityPrioKm)} de los km prioritarios de la ciudad.`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(fs.n[3]+fs.n[4])+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (resp==='alc' && selCol===null? ` Además, ${fmt0.format(sum(gcs.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'} (${fmt0.format(kmPrio(gcs))} km prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.` : '');
  }
}
