// Selección de alcaldía, colonia y avenida, y refresh(): recalcula colores, cifras y listados del ámbito.
// ---------- selección de alcaldía y refresh() ----------
const selEl = $('alc');
META.muns.map((m,i)=>i).sort((a,b)=>META.munNames[a].localeCompare(META.munNames[b],'es')).forEach(i=>{ const o=document.createElement('option'); o.value=i; o.textContent=META.munNames[i]; selEl.appendChild(o); });
function renderAlcInfo(){
  const box=$('alcinfo'); if (sel===null){ box.hidden=true; return; }
  const s=summOf(sel); const tot=sum(s.km); const d=domOf(sel); const pc=T.prio[d];
  const gcs = META.summ_gc[META.muns[sel]]; const vs = VPC.summ[META.muns[sel]];
  box.hidden=false; box.innerHTML = isGC()
    ? `${dot(pc)}<b>Vialidades primarias · prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los km de vialidad primaria de la alcaldía)<br>${rankVP[sel]}.º lugar de 16 alcaldías en km prioritarios de vialidad primaria · ${fmt0.format(tot)} km de vialidad primaria en toda la alcaldía`
    : `${dot(pc)}<b>Prioridad predominante: ${META.prio[d]}</b> (${pct(s.km[d],tot)} de los frentes de la alcaldía)<br>${rank[sel]}.º lugar de 16 alcaldías en km prioritarios · ${fmt0.format(tot)} km de frentes en toda la alcaldía${resp==='alc'? `<br><span class="gcline">Gobierno Central atiende en esta alcaldía ${fmt0.format(sum(vs.km))} km de vialidades primarias (${fmt0.format(kmPrio(vs))} km prioritarios).</span>`:''}`;
}
function renderColInfo(){
  const box = $('colinfo'); if (selCol===null){ box.hidden=true; return; }
  const c = META.colonias[selCol]; const pc = c.p>=0? T.prio[c.p] : null;
  box.hidden=false; box.innerHTML = `${pc? dot(pc):''}<b>Prioridad de la colonia: ${c.p>=0? META.prio[c.p] : '—'}</b><br>Desarrollo social (IDS): ${c.ids||'—'}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' hab.':''}${c.ut? `<br><span class="utline">Unidad territorial ${c.ut}: ${fmt.format(c.utpob||0)} hab., ${fmt.format(c.nbi||0)} en pobreza (NBI)</span>`:''}`;
}
function renderAvInfo(){
  const box=$('avinfo'); if (selAv===null){ box.hidden=true; return; }
  const s=avStat(selAv); const d=dom({km:s.kmByP}); const pc=T.prio[d];
  const vsA = vpSumm(); const kmA = sum(vsA.km), kmpA = kmPrio(vsA);
  box.hidden=false; box.innerHTML = `${dot(pc)}<b>Prioridad predominante de la avenida: ${META.prio[d]}</b> (${pct(s.kmByP[d], s.km)} de los km de la avenida en toda la ciudad)<br>Red vial: ${[...s.nombres].join(', ')} · ${fmt1.format(s.km)} km de la avenida en toda la ciudad · Cruza: ${[...s.muns].map(m=>META.munNames[m]).join(', ')}${sel!==null? `<br><span class="gcline">Las cifras de abajo son solo del tramo en la alcaldía ${META.munNames[sel]}: ${kmFull(kmA)} de esta avenida, ${kmFull(kmpA)} prioritarios${kmpA===0? ' (ningún tramo de esta avenida en la alcaldía resultó Muy Alta o Alta)':''}.</span>`:''}`;
}
let keepView = false;
function refresh(){ buildColors(); buildVP(); buildStreets(); buildAvenues(); renderSummary(); renderResults(); renderAlcInfo(); renderColInfo(); renderAvInfo(); renderLegendNote(); rerender(); if (!keepView) flyTo(scopeView());
  const gc = isGC();
  $('dl-frentes').hidden = !respOn.alc; $('dl-calles').hidden = !respOn.alc; $('dl-tramos').hidden = !respOn.gc; $('dl-avenidas').hidden = !respOn.gc;
  $('dl-frentes').disabled = $('dl-calles').disabled = (sel===null);
  $('dl-status').textContent = (respOn.alc && sel===null)? 'Selecciona una alcaldía para descargar su listado.' : '';
  $('dl-ficha').hidden = !(respOn.alc && selCol!==null); $('dl-ficha-alc').hidden = !(respOn.alc && sel!==null && selCol===null);
  $('dl-ficha-vpalc').hidden = !(respOn.gc && sel!==null && selAv===null); $('dl-ficha-av').hidden = !(gc && selAv!==null);  renderCrumb(); renderScopeTitle(); updTabLabel(); renderActions(); }
function setSel(v){
  sel = v===''? null : +v; selCol=null; selAv=null; highlight=null; hideCard(); $('q').value='';
  collapseSheet(); refresh();
}
// ---------- selección de colonia y avenida (la búsqueda está en el buscador único, más abajo) ----------
// el catálogo de colonias trae abreviaturas (Pgal, Sto, Ampl…); el buscador las expande
const ABREV = {pgal:'pedregal', sto:'santo', sta:'santa', ampl:'ampliacion', ampliacion:'ampliacion', secc:'seccion', ote:'oriente', pte:'poniente', nte:'norte', gral:'general', prol:'prolongacion', fracc:'fraccionamiento', cjto:'conjunto', uh:'unidad habitacional', bo:'barrio', pblo:'pueblo'};
function pickColonia(id){
  if (isGC()) setResp('alc');
  const c = META.colonias[id]; const m = munIndex[c.m];
  if (sel!==m){ sel=m; selEl.value=String(m); }
  selCol=id; selAv=null; highlight=null; hideCard(); $('q').value=''; if (isPhone() && !showFrB) setLayer('fr', true); collapseSheet(); refresh(); showCard('col', id);
}
function clearColonia(){ if(selCol!==null){ selCol=null; highlight=null; hideCard(); refresh(); } }
function pickAvenida(a){
  if (!isGC()) setResp('gc');
  selAv=a; selCol=null; hideCard(); $('q').value='';
  const s=avStat(a); highlight={avId:a, idx:s.idx}; collapseSheet(); refresh();
}
function clearAvenida(){ if(selAv!==null){ selAv=null; highlight=null; hideCard(); refresh(); } }
selEl.onchange = e=> setSel(e.target.value);
$('n-total').textContent = `${fmt.format(N)} frentes de manzana y ${fmt.format(VPC.cov.registros)} tramos de vialidad primaria (${fmt0.format(VPC.cov.km_total)} km).`;
