// Selección de alcaldía, colonia y avenida, y refresh(): recalcula colores, cifras y listados del ámbito.
// ---------- selección de alcaldía y refresh() ----------
const selEl = $('alc');
META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const o=document.createElement('option'); o.value=i; o.textContent=META.munNames[i]; selEl.appendChild(o); });
function renderAlcInfo(){
  const box=$('alcinfo'); if (sel===null){ box.hidden=true; return; }
  const s=summOf(sel); const tot=sum(s.km); const d=domOf(sel); const pc=T.prio[d];
  const gcs = META.summ_gc[META.muns[sel]]; const vs = VPC.summ[META.muns[sel]];
  box.classList.toggle('secundaria', selCol!==null || selAv!==null);   // en el celular, con colonia o avenida solo se ve el recuadro de lo consultado
  box.hidden=false; box.innerHTML = isGC()
    ? `${dot(pc)}<b>Vialidades primarias · prioridad predominante: ${META.prio[d]}</b>${masDet(`${pct(s.km[d],tot)} de los km de vialidad primaria de la alcaldía<br>${partTxt(sel,true)} · ${fmt0.format(tot)} km de vialidad primaria en toda la alcaldía`)}`
    : `${dot(pc)}<b>Prioridad predominante: ${META.prio[d]}</b>${masDet(`${pct(s.km[d],tot)} de los km de frente de la alcaldía<br>${partTxt(sel,false)} · ${fmt0.format(tot)} km de frentes en toda la alcaldía`)}`
      // lo del Gobierno Central mezcla km de vialidad y km de frente: va plegado también en la computadora
      + (resp==='alc'? masDet(`<span class="gcline">Gobierno Central atiende en esta alcaldía ${fmt0.format(sum(vs.km))} km de vialidades primarias medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); en frentes de manzana son ${fmt0.format(sum(gcs.km))} km.</span>`, 'Lo que atiende el Gobierno Central aquí', true) : '');
}
function renderColInfo(){
  const box = $('colinfo'); if (selCol===null){ box.hidden=true; return; }
  const c = META.colonias[selCol]; const pc = c.p>=0? T.prio[c.p] : null;
  box.hidden=false; box.innerHTML = `${pc? dot(pc):''}<b>Prioridad de la colonia: ${c.p>=0? META.prio[c.p] : '—'}</b>${masDet(`Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' hab.':''}${c.ut? `<br><span class="utline">Unidad territorial ${c.ut}: ${fmt.format(c.utpob||0)} hab., ${fmt.format(c.nbi||0)} en pobreza (NBI)</span>`:''}`)}`;
}
function renderAvInfo(){
  const box=$('avinfo'); if (selAv===null){ box.hidden=true; return; }
  const s=avStat(selAv); const d=dom({km:s.kmByP}); const pc=T.prio[d];
  const vsA = vpSumm(); const kmA = sum(vsA.km), kmpA = kmPrio(vsA);
  box.hidden=false; box.innerHTML = `${dot(pc)}<b>Prioridad predominante de la avenida: ${META.prio[d]}</b>${masDet(`${pct(s.kmByP[d], s.km)} de los km de la avenida en toda la ciudad<br>${redesTxt(s.nombres, 9)? 'Red vial: '+redesTxt(s.nombres, 9)+' · ' : ''}${fmt1.format(s.km)} km de la avenida en toda la ciudad · Cruza: ${[...s.muns].map(m=>META.munNames[m]).join(', ')}`)}${sel!==null? `<br><span class="gcline">Las cifras de abajo son solo del tramo en la alcaldía ${META.munNames[sel]}${filtroEsp? ', '+espTxtVP() : ''}: ${kmFull(kmA)} de esta avenida, ${kmFull(kmpA)} prioritarios${kmpA===0? (filtroEsp? ' (ningún tramo con '+espLista()+' de esta avenida en la alcaldía resultó Muy Alta, Alta o Media)' : ' (ningún tramo de esta avenida en la alcaldía resultó Muy Alta, Alta o Media)'):''}.</span>`:''}${avGruposTxt(selAv)? `<br><span class="gcline">${avGruposTxt(selAv)}; elige una alcaldía para consultar una sola.</span>`:''}`;
}
let keepView = false;
// Anuncio para lectores de pantalla: al cambiar la consulta se dice el ámbito y su cifra principal; con una calle consultada, la calle,
// su colonia y sus km prioritarios.
let anuncioT = null;
function anunciaAmbito(){ clearTimeout(anuncioT); anuncioT = setTimeout(()=>{ const m=$('mapsum'), s=$('sr-estado'); if (!m || !s) return;
  const c = calleSel(), l = c? tramosSel() : null;
  const t = c? `Calle ${c.nombre}${selCol!==null? ', colonia '+META.colonias[selCol].n : sel!==null? ', '+META.munNames[sel] : ''}${l? ', '+kmFull(l.reduce((a, x)=>a+sumPrio(x.km), 0))+' prioritarios' : ''}`
    : m.innerText.replace(/\s+/g,' ').trim();
  if (t && s.textContent!==t) s.textContent = t; }, 250); }
function refresh(){ if (!locSel && !restaurando) locManual();   // un cambio de ámbito hecho a mano manda sobre Mi ubicación
  buildColors(); buildVP(); buildStreets(); buildAvenues(); renderSummary(); iniN = 10; renderInicio(); renderAlcInfo(); renderColInfo(); renderAvInfo(); renderLegendNote(); invNota(); espAviso(); rerender(); if (!keepView) flyTo(scopeView());
  anunciaAmbito(); rotuloInfo();
  const gc = isGC();
  // Descargas: un bloque por red. Las calles de las alcaldías piden una alcaldía; toda la ciudad tiene el Excel de las 16 alcaldías
  const conAlc = respOn.alc && sel!==null;
  $('dl-g-ciudad').hidden = sel!==null; $('dl-g-alc').hidden = !conAlc; $('dl-g-gc').hidden = !respOn.gc;
  $('dl-frentes').hidden = $('dl-calles').hidden = !conAlc; $('dl-tramos').hidden = $('dl-avenidas').hidden = !respOn.gc;
  // sin registros que entregar: el botón se deshabilita y se dice por qué, en lugar de entregar un archivo vacío
  const fsD = (respOn.alc && sel!==null)? frSumm() : null; const nFrD = fsD? sum(fsD.n) : 1, nPrD = fsD? sumPrio(fsD.n) : 1;
  const nTrD = respOn.gc? vpSumm().recsp.size : 1;
  $('dl-frentes').disabled = $('dl-calles').disabled = (sel===null || nPrD===0);
  $('dl-ficha').disabled = nFrD===0; $('dl-tramos').disabled = nTrD===0;
  $('dl-kml').disabled = $('dl-geojson').disabled = !((respOn.alc && sel!==null && nPrD>0) || (respOn.gc && selCol===null && nTrD>0));
  $('dl-status').textContent = (respOn.alc && sel===null)? 'Para la lista de calles de una alcaldía, elígela arriba.'
    : nFrD===0? 'Este ámbito no tiene frentes de manzana a cargo de la alcaldía: no hay listado ni ficha PDF que descargar.'
    : nPrD===0? 'Este ámbito no tiene frentes de prioridad Muy Alta, Alta o Media: el listado de frentes prioritarios estaría vacío.'
    : nTrD===0? `Este ámbito no tiene tramos de vialidad primaria de prioridad Muy Alta, Alta o Media${filtroEsp? ' con '+espLista()+' (filtro «Espacio»)' : ''}: el listado de tramos prioritarios estaría vacío.` : '';
  $('dl-ficha').hidden = !(respOn.alc && selCol!==null); $('dl-ficha-alc').hidden = !(respOn.alc && sel!==null && selCol===null);
  $('dl-ficha-vpalc').hidden = !(respOn.gc && sel!==null && selAv===null); $('dl-ficha-av').hidden = !(gc && selAv!==null);  renderCrumb(); renderScopeTitle(); renderActions(); syncCalleBtns(); guardaURL(); usoConsulta(); }
// Registro de usos (solo con sesión): una consulta es el ámbito en que la persona se detiene (1.5 s), no cada clic intermedio.
// No se anotan toda la ciudad (vista inicial) ni los cambios que hace «Seguirme» al caminar.
let usoUlt = '', usoT = null;
function usoConsulta(){ if (!USO_URL || restaurando || locSel) return; clearTimeout(usoT);
  usoT = setTimeout(()=>{ if (sel===null && selAv===null) return; const a = ambitoUso(), k = JSON.stringify(a); if (k===usoUlt) return; usoUlt = k; avisaUso({ evento:'consulta', ...a }); }, 1500); }
// ---------- la consulta queda en la dirección ----------
// r = quién atiende (gc | both), a = clave de la alcaldía, c = colonia, v = avenida, b = banqueta (con | sin), e = espacio (cv, to, am separados
// por coma: cepa vacante, tocón, árbol muerto; un código desconocido se ignora; también con r=gc). Atrás y Adelante recorren las consultas,
// la consulta sobrevive a una recarga y la dirección se puede compartir.
function urlEstado(){ const p = new URLSearchParams(location.search); ['r','a','c','v','b','e'].forEach(k=>p.delete(k));
  if (resp!=='alc') p.set('r', resp);
  if (filtroBanq!=='todas' && resp!=='gc') p.set('b', filtroBanq);
  if (filtroEsp) p.set('e', espCodigo());
  if (selCol!==null) p.set('c', selCol); else { if (sel!==null) p.set('a', META.muns[sel]); if (selAv!==null) p.set('v', selAv); }
  const q = p.toString().replace(/%2C/g, ','); return location.pathname + (q? '?'+q : '') + location.hash; }
// La última alcaldía y la red consultadas se recuerdan en este navegador: la siguiente visita abre ahí. No son datos personales.
const CLAVE_INICIO = 'cp_inicio';
const leeInicio = ()=>{ try { return localStorage.getItem(CLAVE_INICIO); } catch(e){ return null; } };
const CLAVE_RED = 'cp_red';   // red consultada: alc | gc | both
const leeRed = ()=>{ try { const r = localStorage.getItem(CLAVE_RED); return r==='gc' || r==='both'? r : 'alc'; } catch(e){ return 'alc'; } };
const recuerdaInicio = ()=>{ try { localStorage.setItem(CLAVE_INICIO, sel===null? 'ciudad' : META.muns[sel]); localStorage.setItem(CLAVE_RED, resp); } catch(e){} };
function guardaURL(){ if (restaurando) return; recuerdaInicio(); const u = urlEstado(); if (u === location.pathname + location.search + location.hash) return;
  try { history.pushState({consulta:true}, '', u); } catch(e){} }
function aplicarURL(){ const p = new URLSearchParams(location.search); const r = p.get('r')==='gc'? 'gc' : p.get('r')==='both'? 'both' : 'alc';
  const a = munIndex[p.get('a')], c = +p.get('c'), v = +p.get('v'); const m = a===undefined? null : a; const antes = restaurando; restaurando = true;
  try {
    if (resp!==r) setResp(r);
    if (p.has('c') && r!=='gc' && Number.isInteger(c) && c>0 && META.colonias[c] && META.colonias[c].n){ if (selCol!==c) pickColonia(c); }
    else if (p.has('v') && r==='gc' && Number.isInteger(v) && v>0 && VPC.nomenclat[v]){ if (sel!==m){ sel=m; selEl.value = m===null? '' : String(m); } if (selAv!==v) pickAvenida(v); else refresh(); }
    else if (sel!==m || selCol!==null || selAv!==null){ selEl.value = m===null? '' : String(m); setSel(selEl.value); }
    const b = r!=='gc' && (p.get('b')==='con' || p.get('b')==='sin')? p.get('b') : 'todas'; if (b!==filtroBanq) setBanq(b);   // con r=gc la banqueta no aplica
    const e = espDeTexto(p.get('e')); if (e!==espQuiero) setEspacio(e);
  } finally { restaurando = antes; } }
addEventListener('popstate', ()=>{ if (history.state && history.state.ayuda) return; aplicarURL(); });
function syncCalleBtns(){ renderTramos(); renderCrumb(); const c = calleSel(); $('dl-g-calle').hidden = $('dl-calle').hidden = $('dl-ficha-calle').hidden = !c;
  const h = callesHomonimas(); if (h && !isGC()) $('dl-status').textContent = `Hay calles con este nombre en ${fmt.format(h)} colonias. Elige una en la lista de «Dónde empezar» para descargar su Excel o su ficha PDF.`; }
function setSel(v){
  sel = v===''? null : +v; selCol=null; selAv=null; highlight=null; hideCard(); $('q').value='';
  alaRespuesta(); refresh();
}
// ---------- selección de colonia y avenida (la búsqueda está en el buscador único, más abajo) ----------
// el catálogo de colonias trae abreviaturas (Pgal, Sto, Ampl…); el buscador las expande
const ABREV = {pgal:'pedregal', sto:'santo', sta:'santa', ampl:'ampliacion', ampliacion:'ampliacion', secc:'seccion', ote:'oriente', pte:'poniente', nte:'norte', gral:'general', prol:'prolongacion', fracc:'fraccionamiento', cjto:'conjunto', uh:'unidad habitacional', bo:'barrio', pblo:'pueblo'};
function pickColonia(id){
  if (isGC()) setResp('alc', true);
  const c = META.colonias[id]; const m = munIndex[c.m];
  if (sel!==m){ sel=m; selEl.value=String(m); }
  selCol=id; selAv=null; highlight=null; hideCard(); $('q').value=''; if (isPhone() && !showFrB) setLayer('fr', true); alaRespuesta(); refresh(); showCard('col', id);
}
function clearColonia(){ if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } }
function pickAvenida(a){
  if (!isGC()) setResp('gc', true);
  // si la avenida no cruza la alcaldía elegida (tarjeta, buscador o dirección), se consulta en toda la ciudad
  if (sel!==null && !avStat(a).muns.has(sel)){ sel=null; selEl.value=''; }
  selAv=a; selCol=null; hideCard(); $('q').value='';
  const s=avStat(a); highlight={avId:a, idx:s.idx}; if (!restaurando) verMapa({desdeLista:PANTALLA==='info'}); refresh();
}
function clearAvenida(){ if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } }
selEl.onchange = e=> setSel(e.target.value);
$('n-total').textContent = `${fmt.format(N)} frentes de manzana y ${fmt.format(VPC.cov.registros)} tramos de vialidad primaria (${fmt0.format(VPC.cov.km_total)} km).`;
$('ver-line').textContent = VERSION_TXT + '.';
$('cita-calles').textContent = CITA_CALLES;
