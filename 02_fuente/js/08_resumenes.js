// Estadísticas por colonia, avenida y ámbito; cifras principales, barras por prioridad y textos de contexto del panel.
// estadísticas por colonia (frentes a cargo de la alcaldía)
// cv: cepas vacantes del inventario en los frentes prioritarios (orden «más cepas vacantes» de «Dónde empezar»); cvt: en todos sus frentes, de
// cualquier prioridad (el total que acompaña a cada renglón de ese orden). Los dos valen 0 hasta que se carga ESP_CV
let COLSTAT = null, COLSTAT_B = null;   // se rehace al cambiar el filtro de banqueta o el de espacio, y al llegar las cepas
function colStat(id){ const clave = filtroClave() + (ESP_CV? '|cv' : ''); if(!COLSTAT || COLSTAT_B!==clave){ COLSTAT = new Map(); COLSTAT_B = clave; for(let i=0;i<N;i++){ const c=F.col[i]; if(!c || F.gc[i] || !pasaFiltros(i)) continue; let s=COLSTAT.get(c); if(!s){ s={n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,cv:0,cvt:0}; COLSTAT.set(c,s); } const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; if (ESP_CV) s.cvt+=ESP_CV[i]; if(esPrio(p)){ s.kmp+=k; s.np++; if (ESP_CV) s.cv+=ESP_CV[i]; } } }
  return COLSTAT.get(id) || {n:[0,0,0,0,0],km:[0,0,0,0,0],kmp:0,np:0,cv:0,cvt:0}; }
// estadísticas por avenida (NOMENCLAT), toda la ciudad, calculadas una vez
let AVSTAT = null;
function avStat(id){ if(!AVSTAT){ AVSTAT=new Map(); for(let i=0;i<NV;i++){ const a=VP.nom[i]; let s=AVSTAT.get(a); if(!s){ s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; AVSTAT.set(a,s); } const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(esPrio(p)){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); } } const s=AVSTAT.get(id); return s? {...s, km:s.kmt, kmByP:s.km} : {idx:[],n:[0,0,0,0,0],km:0,kmByP:[0,0,0,0,0],kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()}; }
// Vialidades distintas que comparten nombre: las partes de una avenida se agrupan por continuidad espacial;
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
// estadísticas de toda la avenida en la ciudad con el filtro «Espacio» (ficha de avenida); sin filtro, las de siempre (avStat)
function avStatEsp(id){ if (!filtroEsp) return avStat(id);
  const s={idx:[],n:[0,0,0,0,0],km:[0,0,0,0,0],kmt:0,kmp:0,recs:new Set(),recsp:new Set(),muns:new Set(),nombres:new Set()};
  for (const i of avStat(id).idx){ if (!pasaEspacioVP(i)) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.idx.push(i); s.n[p]++; s.km[p]+=k; s.kmt+=k; s.recs.add(VP.rec[i]); if(esPrio(p)){ s.kmp+=k; s.recsp.add(VP.rec[i]); } s.muns.add(VP.mun[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); }
  return {...s, km:s.kmt, kmByP:s.km}; }
// resumen de vialidades en un ámbito (alcaldía y/o avenida), con el filtro «Espacio» (enAmbitoVP)
function vpSumm(){ const s={n:[0,0,0,0,0],km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; for(let i=0;i<NV;i++){ if(!enAmbitoVP(i)) continue; const p=VP.prio[i], k=VP.len[i]/1000; s.n[p]++; s.km[p]+=k; s.recs.add(VP.rec[i]); if(esPrio(p)) s.recsp.add(VP.rec[i]); } return s; }

// ---------- reparto por responsable ----------
// Kilómetros de FRENTE DE MANZANA por responsable (0 = alcaldía, 1 = Gobierno Central) y prioridad en un ámbito:
// total (km), sin arbolado (sa) y sin arbolado con banqueta registrada por INEGI (sb). Con colonia manda la colonia, igual que enAmbito().
// Cada responsable con su regla (pasaFiltros, prioFr): los frentes del Gobierno Central no se filtran por banqueta, el «Espacio» se les
// aplica por su tramo y su prioridad es la del tramo; así la columna coincide con «Equivalen a…» de su bloque (gcFrente).
// Lo usan la tabla de comparación del Resumen (compHtml), el diccionario de los Excel y las fichas (sb, solo estos dos).
const REP_CACHE = new Map();
function repStat(mun, col){
  const key = mun+'|'+col+'|'+filtroClave(); let r = REP_CACHE.get(key); if (r) return r;
  r = {km:[[0,0,0,0,0],[0,0,0,0,0]], sa:[[0,0,0,0,0],[0,0,0,0,0]], sb:[[0,0,0,0,0],[0,0,0,0,0]]};
  for(let i=0;i<N;i++){ if ((col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun)) || !pasaFiltros(i)) continue;
    const g=F.gc[i], p=prioFr(i), k=F.len[i]/1000, fl=F.flags[i]; r.km[g][p]+=k;
    if ((fl&7)===1){ r.sa[g][p]+=k; if (((fl>>3)&7)===0) r.sb[g][p]+=k; } }
  if (REP_CACHE.size>40) REP_CACHE.clear(); REP_CACHE.set(key, r); return r; }
// Equivalente en km de FRENTE DE MANZANA (aceras con manzana enfrente) de las vialidades primarias de un ámbito.
// La cifra oficial del Gobierno Central es el km de vialidad medido sobre el eje; el km de frente es su dato complementario
// y la única unidad con la que se compara o se suma con las alcaldías. Con el filtro «Espacio», solo los frentes de los tramos que pasan.
// Lo prioritario es lo que da a tramos prioritarios (prioFr): una avenida sin km prioritarios no tiene km de frente prioritarios.
const GCF_CACHE = new Map();
function gcFrente(mun, av){ const key=mun+'|'+av+'|'+filtroEsp; let r=GCF_CACHE.get(key); if (r) return r; r={km:[0,0,0,0,0]};
  for(let i=0;i<N;i++){ if(!F.gc[i]) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; if (!pasaEspacioVP(F.vp[i])) continue; r.km[prioFr(i)]+=F.len[i]/1000; }
  if (GCF_CACHE.size>60) GCF_CACHE.clear(); GCF_CACHE.set(key,r); return r; }
const gcFrenteTxt = (mun, av) => { const g=gcFrente(mun, av); return `Equivalen a ${kmFull(sum(g.km))} de frente de manzana (aceras con manzana enfrente), ${kmFull(kmPrio(g))} sobre tramos prioritarios`; };
// Banqueta del Gobierno Central, solo como referencia (no filtra): la de los frentes de manzana que dan a sus tramos prioritarios,
// con la misma clasificación de INEGI 2020 que la fila «Banqueta» de las alcaldías
const GCB_CACHE = new Map();
function gcBanq(mun, av){ const key=mun+'|'+av+'|'+filtroEsp; let r=GCB_CACHE.get(key); if (r) return r; r=[0,0,0];
  for(let i=0;i<N;i++){ if(!F.gc[i] || !esPrio(prioFr(i))) continue; if (mun!==null && F.mun[i]!==mun) continue; if (av!==null && (F.vp[i]<0 || VP.nom[F.vp[i]]!==av)) continue; if (!pasaEspacioVP(F.vp[i])) continue;
    const b=(F.flags[i]>>3)&7; r[b===0? 0 : b===1? 1 : 2] += F.len[i]/1000; }
  if (GCB_CACHE.size>60) GCB_CACHE.clear(); GCB_CACHE.set(key,r); return r; }
const gcBanqTxt = (mun, av) => { const d=gcBanq(mun, av), t=d[0]+d[1]+d[2]; if (!t) return '';
  return `Banqueta, como referencia: de los ${kmFull(t)} de frente de manzana que dan a sus tramos prioritarios, ${kmFull(d[0])} tienen banqueta (${pct(d[0],t)}), ${kmFull(d[1])} no la tienen y ${kmFull(d[2])} están por verificar, según INEGI 2020. Los tramos sin manzanas al lado (accesos controlados, puentes y entronques) no tienen este dato. No es un filtro: la fila «Banqueta» solo aplica a las calles de las alcaldías.`; };
// ---------- comparación de la alcaldía y el Gobierno Central (al final del Resumen) ----------
// Km de frente de manzana por responsable (repStat: los mismos frentes y filtros de siempre) y espacios para plantar del inventario de
// arbolado: los puntos asignados a frentes de la alcaldía que pasan enAmbito(i) (ESP_FRN) y, del Gobierno Central, los de las partes de
// vialidad primaria del ámbito que pasan enAmbitoVP(i), por sus frentes y en el camellón (ESP_VPN), igual que las listas y los Excel. En una
// colonia, del Gobierno Central cuentan solo los puntos de sus frentes en la colonia: el camellón no tiene colonia.
const kmComp = v => v>0 && v<0.5? '<1' : fmt0.format(v);   // km sin decimales
function espComp(){ const a=[0,0,0], g=[0,0,0];
  for(let i=0;i<N;i++){ if (!enAmbito(i)) continue; const t = !F.gc[i]? a : selCol!==null? g : null; if (t) for(let k=0;k<3;k++) t[k]+=ESP_FRN[3*i+k]; }
  if (selCol===null) for(let i=0;i<NV;i++){ if (enAmbitoVP(i)) for(let k=0;k<3;k++) g[k]+=ESP_VPN[3*i+k]; }
  return {a, g}; }
// renglones de los espacios para plantar: con los datos, cargando o con la falla
function espCompHtml(err){
  if (ESP_FRN && ESP_VPN){ const E = espComp();
    return INV_TIPOS.map((t,k)=>`<tr><th scope="row">${t.pl}</th><td>${fmt.format(E.a[k])}</td><td>${fmt.format(E.g[k])}</td><td>${fmt.format(E.a[k]+E.g[k])}</td></tr>`).join(''); }
  return `<tr><td colspan="4" class="rp-estado${err? ' warn' : ''}">${err? (err.sesion? SESION_TXT : 'no se pudo cargar el inventario') : 'cargando…'}</td></tr>`; }
// puntos del inventario que no cuentan para nadie (sin frente a 20 m ni vialidad primaria a 25 m): la cifra existe solo para toda la ciudad
const espSinContar = ()=> sel===null && INV.sinc!==undefined? `Los ${fmt.format(INV.sinc)} puntos de la ciudad que no tienen un frente de manzana a ${INV.dist} m o menos ni una vialidad primaria a ${INV.vp.dist} m o menos no se cuentan.` : 'Algunos puntos que no tienen un frente de manzana ni una vialidad primaria cerca no se cuentan.';
function compHtml(){
  const R = repStat(sel, selCol), fila = (lab, a, g, cls) => `<tr${cls? ` class="${cls}"` : ''}><th scope="row">${lab}</th><td>${kmComp(a)}</td><td>${kmComp(g)}</td><td>${kmComp(a+g)}</td></tr>`;
  const grupo = t => `<tr class="grupo"><th scope="colgroup" colspan="4">${t}</th></tr>`;
  let h = `<table class="reparto"><thead><tr><td></td><th scope="col">${sel===null? 'Alcaldías' : 'Alcaldía'}</th><th scope="col">Gobierno Central</th><th scope="col">Total</th></tr></thead>
    <tbody>${grupo('Km de frente de manzana')}${fila('Prioritario', sumPrio(R.km[0]), sumPrio(R.km[1]))}${fila('De lo prioritario, sin arbolado', sumPrio(R.sa[0]), sumPrio(R.sa[1]), 'sub')}${fila('Todos los frentes', sum(R.km[0]), sum(R.km[1]))}</tbody>`;
  if (INV) h += `<tbody>${grupo('Espacios para plantar (inventario en curso)')}</tbody><tbody id="rp-esp">${espCompHtml()}</tbody>`;
  h += '</table>';
  const det = ['Los km de frente de manzana cuentan cada acera por separado; no se suman con los km de vialidad primaria del Gobierno Central, que se miden sobre el eje.',
    'Prioritario reúne las prioridades Muy Alta, Alta y Media; «sin arbolado» es la clase del modelo. Los frentes del Gobierno Central llevan la prioridad de su tramo de vialidad primaria.',
    INV? `Los espacios para plantar son los puntos del ${INV.fuente}: a la alcaldía le cuentan los de sus frentes de manzana (a ${INV.dist} m o menos) y al Gobierno Central, los de sus frentes y los del camellón (a ${INV.vp.dist} m o menos del eje de una vialidad primaria).${selCol!==null? ' En una colonia, del Gobierno Central cuentan solo los de sus frentes: el camellón no se asigna a una colonia.' : ''} ${espSinContar()}` : '',
    hayFiltro()? `Con los filtros activos, cuentan solo los frentes y los tramos que pasan.${filtroBanq!=='todas'? ' La banqueta solo filtra las calles de las alcaldías.' : ''}${filtroEsp? ' Del Gobierno Central cuentan sus tramos con ' + espLista() + ', en sus frentes o en el camellón.' : ''}` : ''].filter(Boolean).join(' ');
  return h + `<div class="note">${INV? `Inventario en curso (corte: ${INV.corte}).` : ''}${masDet(det)}</div>`; }
// pinta los renglones de los espacios (al llegar el inventario o si falla) sin rehacer el resto del Resumen
function espCompPinta(err){ const b = $('rp-esp'); if (b) b.innerHTML = espCompHtml(err); }
// al abrir el Resumen se piden los datos del inventario, sin bloquear: la tabla muestra los km enseguida y los espacios al llegar
function espCompPide(){ if (!INV || $('tp-res').hidden || !$('rp-esp')) return;
  if (ESP_FRN && ESP_VPN){ espCompPinta(); return; }
  espCargar().then(()=> espCompPinta(), e=>{ console.warn('espacios para plantar del Resumen', e); espCompPinta(e); }); }

// ---------- resumen del ámbito consultado ----------
const POB = (()=>{ const alc = META.muns.map(()=>({t:0,p:0})); let t=0,p=0;
  for(let i=1;i<META.colonias.length;i++){ const c=META.colonias[i]; if(!c.n) continue; const m=munIndex[c.m]; if(m===undefined) continue;
    const pb=c.pob||0; alc[m].t+=pb; t+=pb; if(esPrio(c.p)){ alc[m].p+=pb; p+=pb; } }
  return {alc, city:{t,p}}; })();
const hab = n => n>=1e6? fmt1.format(n/1e6)+' millones de habitantes' : fmt.format(n)+' habitantes';
const habC = n => n>=1e6? fmt1.format(n/1e6)+' M' : fmt.format(n);
const CITY = META.city;
const cityPrioKm = kmPrio(CITY), cityTotKm = sum(CITY.km);
const VCITY = VPC.city, vCityPrioKm = kmPrio(VCITY), vCityTotKm = sum(VCITY.km);
// Participación de una alcaldía en los km prioritarios de la ciudad (no un lugar entre las 16 alcaldías):
// describe dónde se concentra la necesidad sin ordenar a las alcaldías como si fuera una calificación.
const partTxt = (i, gc) => pct(kmPrio((gc? VPC.summ : META.summ)[META.muns[i]]), gc? vCityPrioKm : cityPrioKm) + ' de los km prioritarios de la ciudad';
// Las dos alcaldías con más km prioritarios, calculadas de los datos.
const top2Txt = (S, tot) => { const o = META.muns.map((m,i)=>[i, kmPrio(S[m])]).sort((a,b)=>b[1]-a[1]);
  return `${META.munNames[o[0][0]]} y ${META.munNames[o[1][0]]} concentran ${pct(o[0][1]+o[1][1], tot)} de los km prioritarios de la ciudad.`; };
function frSumm(){
  if (selCol!==null || hayFiltro()){ const s={n:[0,0,0,0,0], km:[0,0,0,0,0]}; for(let i=0;i<N;i++){ if(F.gc[i] || !enAmbito(i)) continue; const p=F.prio[i], k=F.len[i]/1000; s.n[p]++; s.km[p]+=k; } return s; }
  return sel===null? CITY : META.summ[META.muns[sel]];
}
// Desglose por banqueta de los km prioritarios a cargo de la alcaldía en el territorio consultado, SIN importar el filtro:
// [con banqueta, sin banqueta, por verificar]. Se muestra siempre, para que «con banqueta» no se confunda con el total.
const BD_CACHE = new Map();
function banqDesglose(mun, col){ const key=mun+'|'+col; let r=BD_CACHE.get(key); if (r) return r; r=[0,0,0];
  for(let i=0;i<N;i++){ if (F.gc[i] || !esPrio(F.prio[i]) || (col!==null? F.col[i]!==col : (mun!==null && F.mun[i]!==mun))) continue;
    const b=(F.flags[i]>>3)&7; r[b===0? 0 : b===1? 1 : 2] += F.len[i]/1000; }
  if (BD_CACHE.size>40) BD_CACHE.clear(); BD_CACHE.set(key, r); return r; }
const banqDesgloseTxt = (mun, col) => { const d=banqDesglose(mun, col), t=d[0]+d[1]+d[2];
  return `De los ${kmFull(t)} prioritarios de frente: ${kmFull(d[0])} con banqueta (${pct(d[0],t)}), ${kmFull(d[1])} sin banqueta y ${kmFull(d[2])} por verificar (conjunto habitacional o sin dato), según INEGI 2020. Sin banqueta no significa descartado: requiere reconocimiento en sitio.`; };
// «Más detalles»: en el celular, el texto de apoyo queda plegado; en la computadora va abierto y sin el botón (css/10_dos_pantallas.css).
// siempre = plegado también en la computadora, con su botón a la vista (lo que mezcla unidades o es solo de referencia)
const plegado = ()=> matchMedia(MQ_TEL).matches;
const masDet = (html, rot='Más detalles', siempre=false) => html? `<details class="mas${siempre? ' siempre' : ''}"${siempre || plegado()? '' : ' open'}><summary>${rot}</summary><div>${html}</div></details>` : '';
function notaPlegable(el, txt){ el.replaceChildren(); if (!txt) return;
  const d=document.createElement('details'), s=document.createElement('summary'), t=document.createElement('div');
  d.className='mas'; d.open=!plegado(); s.textContent='Más detalles'; t.textContent=txt; d.append(s,t); el.append(d); }
// tres cifras de un bloque: km prioritarios, su porcentaje del total y lo prioritario contado (frentes o tramos). Las etiquetas son cortas
// y no repiten el ámbito: lo dicen el título de la respuesta y el encabezado del bloque
function kpiHtml(s, opts){
  const tot = sum(s.km); const prio = kmPrio(s); const nprio = opts.nprio;
  return `<div class="kpi"><div class="v">${kmTxt(prio)}<small>${kmUn(prio)}</small></div><div class="l">${opts.l1}</div></div>
    <div class="kpi"><div class="v">${tot? fmt1.format(100*prio/tot):'0'}<small>%</small></div><div class="l">de ${kmFull(tot)}</div></div>
    <div class="kpi"><div class="v">${nprio>=10000? fmt1.format(nprio/1000)+'<small>mil</small>' : fmt.format(nprio)}</div><div class="l">${opts.l3}</div></div>`;
}
function barsHtml(s){ const tot=sum(s.km); const max = Math.max(...s.km, 0.001); return META.prio.map((p,k)=>`
    <div class="lab"><i data-st="background:var(--p${k})"></i>${p}</div>
    <div class="track"><div class="fill" data-st="width:${100*s.km[k]/max}%;background:var(--p${k})"></div></div>
    <div class="val">${kmFull(s.km[k])}<small>${pct(s.km[k],tot)}</small></div>`).reverse().join(''); }
function renderSummary(){
  const scopeName = selAv!==null? VPC.nomenclat[selAv] : selCol!==null? META.colonias[selCol].n : sel===null? 'Ciudad de México' : META.munNames[sel];
  const amb = selCol!==null?'de la colonia':sel===null?'de la ciudad':'de la alcaldía';
  const fs = frSumm(); const nprioF = sumPrio(fs.n);
  const emptyCol = selCol!==null && sum(fs.n)===0;  // colonia sin frentes a cargo de la alcaldía
  const EMPTY_MSG = 'Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. Puede ser una unidad habitacional o un predio sin vía pública propia.';
  // Resumen en bloques (v1.27): «Prioritario = …» una vez arriba; un bloque por red (encabezado, unidad y cifras con etiquetas cortas que no
  // repiten el ámbito) y al final la comparación de los dos responsables. Con una sola red, su bloque y la comparación.
  const kFr = emptyCol? `<div class="kpi-empty"><b>Sin frentes a cargo de la alcaldía</b>${EMPTY_MSG.replace('Esta colonia no tiene frentes de manzana a cargo de la alcaldía en el modelo. ','')}</div>` : kpiHtml(fs, {nprio:nprioF, l1:`km prioritarios${hayFiltro()? '<br><b class="banq-tag">'+filtroTxt()+'</b>' : ''}`, l3:'frentes prioritarios'});
  const vs = (resp!=='alc')? vpSumm() : null;
  const ambV1 = selAv!==null? (sel===null? 'de la avenida' : 'de la avenida en la alcaldía') : sel===null? 'de la ciudad' : 'de la alcaldía';
  const kVp = vs? kpiHtml(vs, {nprio:vs.recsp.size, l1:`km prioritarios${filtroEsp? '<br><b class="banq-tag">'+espTxtVP()+'</b>' : ''}`, l3:`de ${fmt.format(vs.recs.size)} tramos prioritarios`}) : '';
  // encabezados de los bloques: quién atiende (en mayúsculas por estilo) y qué se mide
  const cabAlc = sel===null? 'Alcaldías' : 'Alcaldía', subAlc = `Frentes de manzana${selCol!==null? ' en la colonia' : ''} · km por cada acera`;
  const subGC = `${selAv!==null? (sel===null? 'Toda la avenida' : 'La avenida en la alcaldía') : 'Vialidades primarias'} · km sobre el eje${resp==='both' && selCol!==null? ' · de toda la alcaldía' : ''}`;
  $('res-cab').textContent = resp==='gc'? 'Gobierno Central' : cabAlc; $('res-sub').textContent = resp==='gc'? subGC : subAlc;
  $('res-sub2').textContent = subGC;
  // población: una línea; la nota del censo, en «Más detalles»
  const pobLine = (()=>{ if (isGC() || selAv!==null) return '';
    const nota = 'Población residente (Censo 2020); no equivale a población atendida.';
    if (selCol!==null){ const c=META.colonias[selCol]; if(!c.pob) return '';
      return `<div class="pobline"><div><span><b>${hab(c.pob)}</b> en la colonia${c.ids? ` · su unidad territorial tiene desarrollo social ${c.ids.toLowerCase()}`:''}</span>${masDet(nota)}</div></div>`; }
    const P = sel===null? POB.city : POB.alc[sel];
    return `<div class="pobline"><div><span><b>${hab(P.p)}</b> en colonias prioritarias (${pct(P.p,P.t)})</span>${masDet(nota + ' Colonias prioritarias: las de prioridad Muy Alta, Alta o Media; el porcentaje es de la población ' + (sel===null? 'de la ciudad.' : 'de la alcaldía.'))}</div></div>`; })();
  const pb = $('pobbox'); if (pb){ pb.innerHTML = pobLine; pb.hidden = !pb.innerHTML; }
  // desglose por banqueta (alcaldías) y equivalencia en km de frente con la banqueta de referencia (Gobierno Central), cada uno en su bloque
  const ub = $('univbox'), ub2 = $('univbox2');
  const gcEq = ()=>{ const gb = gcBanqTxt(sel, selAv);
    return masDet(`${gb? `<div class="univline banq gcbanq"><span>${gb}</span></div>` : ''}<div class="univline eq"><span>${gcFrenteTxt(sel, selAv)}. Los kilómetros de vialidad se miden sobre el eje de la avenida; los de frente, por cada acera. Para comparar o sumar con las alcaldías se usa el kilómetro de frente.</span></div>`, 'Equivalencia en km de frente y banqueta de referencia', true); };
  ub.innerHTML = resp==='gc'? gcEq() : emptyCol? '' : masDet(`<div class="univline banq"><span>${banqDesgloseTxt(sel, selCol)}</span></div>`, 'Banqueta de lo prioritario');
  ub.hidden = !ub.innerHTML;
  ub2.innerHTML = resp==='both'? gcEq() : ''; ub2.hidden = !ub2.innerHTML;
  // comparación de los dos responsables; con solo Gobierno Central, plegada también en la computadora (es en km de frente)
  const rp = $('reparto'); rp.hidden = selAv!==null;
  rp.innerHTML = rp.hidden? '' : resp==='gc'? masDet(compHtml(), `Comparar con ${sel===null? 'las alcaldías' : 'la alcaldía'} (km de frente y espacios)`, true)
    : `<h2 class="res-cab">${cabAlc} y Gobierno Central</h2><p class="res-sub">Comparación en km de frente de manzana${selCol!==null? ', en la colonia' : ''}</p>${compHtml()}`;
  espCompPide();
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
      stats = `<div class="st"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} prioritarios ${scV2}${espCorto()}</small></div>
        <div class="st opt"><b>${pct(kmPrio(vs),t2)}</b><small>de ${kmFull(t2)} ${scV2}</small></div>
        <div class="st opt"><b>${fmt.format(vs.recsp.size)}</b><small>tramos prioritarios ${scV2}</small></div>`;
    } else if (resp==='both'){
      // en una colonia no hay cifra de vialidades primarias: se muestra su población en su lugar
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} de frente prioritarios · a cargo de la Alcaldía${filtroCorto()}</small></div>
        ${selCol!==null? '' : `<div class="st opt"><b>${kmTxt(kmPrio(vs))}</b><small>${kmUn(kmPrio(vs))} de vialidad prioritarios · a cargo del Gob. Central${espCorto()}</small></div>`}
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    } else if (emptyCol){
      stats = `<div class="st"><b>Sin frentes</b><small>a cargo de la alcaldía en esta colonia</small></div>
        <div class="st opt"><b>${habC(META.colonias[selCol].pob||0)}</b><small>habitantes de la colonia</small></div>`;
    } else {
      const t2 = sum(fs.km);
      stats = `<div class="st"><b>${kmTxt(kmPrio(fs))}</b><small>${kmUn(kmPrio(fs))} prioritarios de frente${filtroCorto()}</small></div>
        <div class="st opt"><b>${pct(kmPrio(fs),t2)}</b><small>de ${kmFull(t2)} de frentes ${amb}</small></div>
        <div class="st opt"><b>${habC(selCol!==null? (META.colonias[selCol].pob||0) : P.p)}</b><small>${selCol!==null? 'habitantes de la colonia' : 'habitantes en colonias prioritarias'}</small></div>`;
    }
    const scopeTxt = (selAv!==null && sel!==null)? `${scopeName} · ${META.munNames[sel]}` : scopeName;
    ms.innerHTML = `<div class="scope"><span>${tag}</span><b>${dcol? `<i data-st="background:rgb(${dcol[0]},${dcol[1]},${dcol[2]})"></i>`:''}${scopeTxt}</b></div><div class="sep"></div>${stats}`;
  }
  // km por categoría del ámbito consultado, en la leyenda
  { const ls = resp==='gc'? vs : fs; document.querySelectorAll('#legend-rows .lg-km').forEach(e=>{ e.textContent = kmFull(ls.km[+e.dataset.k]); });
    $('lg-scope').textContent = resp==='gc' ? `Prioridad · km de vialidad primaria ${ambV1}${espCorto()}` : `Prioridad · km de frente ${amb}${filtroCorto()}`; }   // con filtro, la leyenda dice que sus km son los filtrados
  // barras «Por prioridad» de cada bloque (los títulos ya no repiten el ámbito: lo dice el encabezado del bloque)
  $('kpis').innerHTML = resp==='gc'? kVp : kFr; $('bars').innerHTML = resp==='gc'? barsHtml(vs) : emptyCol? '' : barsHtml(fs);
  $('bars2').hidden = resp!=='both';
  $('kpis2').innerHTML = resp==='both'? kVp : ''; $('bars2-rows').innerHTML = resp==='both'? barsHtml(vs) : '';
  let txt;
  if (resp==='gc'){
    const tot=sum(vs.km);
    txt = sel===null
      ? `En toda la ciudad, ${pct(vCityPrioKm,vCityTotKm)} de los ${fmt0.format(vCityTotKm)} km de vialidades primarias a cargo del Gobierno Central son prioritarios. ${top2Txt(VPC.summ, vCityPrioKm)}`
      : `${selAv!==null? 'En toda la ciudad, '+pct(vCityPrioKm,vCityTotKm)+' de la red primaria es prioritaria. ' : ''}${fmt.format(vs.recsp.size)} de ${fmt.format(vs.recs.size)} tramos ${selAv!==null? (sel===null? 'de la avenida':'de la avenida en la alcaldía '+META.munNames[sel]) : 'de vialidad primaria en la alcaldía '+META.munNames[sel]}${filtroEsp? ' con '+espLista() : ''} son prioritarios (${pct(kmPrio(vs),tot)} de sus km).`;
    // con el filtro «Espacio», las cifras de arriba son las filtradas: se dice qué cuenta y que el inventario está en curso
    if (filtroEsp) txt += ' Cifras de arriba con el filtro «Espacio»: ' + espNotaVP().charAt(0).toLowerCase() + espNotaVP().slice(1);
  } else if (emptyCol){
    txt = EMPTY_MSG;
  } else {
    txt = (sel===null
      ? `En toda la ciudad, ${pct(cityPrioKm,cityTotKm)} del frente de manzana a cargo de las alcaldías es prioritario. ${top2Txt(META.summ, cityPrioKm)}`
      : `${selCol!==null? 'En la alcaldía '+META.munNames[sel]+', '+pct(kmPrio(META.summ[META.muns[sel]]), sum(META.summ[META.muns[sel]].km))+' del frente a cargo de la alcaldía es prioritario. ' : 'En toda la ciudad, '+pct(cityPrioKm,cityTotKm)+' del frente a cargo de las alcaldías es prioritario. '}${selCol!==null? fmt0.format(sumPrio(fs.n))+' de '+fmt0.format(sum(fs.n))+' frentes de esta colonia son prioritarios.' : ''}`)
      + (selCol===null && sinColStat().n? ` ${fmt.format(sinColStat().n)} frente${sinColStat().n===1? '' : 's'} (${kmFull(sinColStat().km)}) ${sel===null?'de la ciudad':'de la alcaldía'}${hayFiltro()? ' que pasan los filtros' : ''} no tienen colonia asignada en el catálogo: se cuentan aquí, pero no aparecen en las consultas por colonia.` : '')
      // lo del Gobierno Central con su propia regla (gcFrente): sin banqueta, con el «Espacio» de su tramo y la prioridad del tramo
      + (resp==='alc' && selCol===null? (g=>` Además, ${fmt0.format(sum(g.km))} km de frentes sobre vialidades primarias ${sel===null?'de la ciudad':'de la alcaldía'}${filtroEsp? ' en tramos con '+espLista() : ''} (${fmt0.format(kmPrio(g))} km sobre tramos prioritarios) quedan a cargo del Gobierno Central y no se cuentan aquí.`)(gcFrente(sel, null)) : '');
  }
  notaPlegable($('bars-note'), txt);
}
