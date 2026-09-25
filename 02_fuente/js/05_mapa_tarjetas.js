// Contenido de las tarjetas del mapa: frente, tramo de vialidad primaria y colonia, con acciones de campo.
const dot = c => `<i class="dot" style="background:rgb(${c[0]},${c[1]},${c[2]})"></i>`;
function featHtml(i, compact){
  const c = T.prio[F.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nm = META.names[F.name[i]] || 'Sin nombre'; const tp = META.tipos[F.tipo[i]] || '—'; const col = META.colonias[F.col[i]];
  const ban = META.disp[(F.flags[i]>>3)&7];
  const cpTxt = col.cp ? col.cp.padStart(5,'0') : ''; const colTxt = col.n ? `${col.n}${cpTxt? ' · CP '+cpTxt : ''}` : 'Colonia no identificada';
  if (compact) return `<span class="pr" style="background:${rgb}"></span><b>${tp!=='—'? tp+' ':''}${nm}</b><br><span class="m">${col.n||'Colonia no identificada'} · ${F.len[i]} m · Prioridad ${META.prio[F.prio[i]]}</span>`;
  const cp = col.p>=0 ? META.prio[col.p] : '—';
  const cc = col.p>=0 ? T.prio[col.p] : null;
  const respTxt = F.gc[i]? `Gobierno Central · sobre ${VPC.nomenclat[VP.nom[F.vp[i]]]}` : 'Alcaldía';
  // si la colonia del frente ya es la consultada, sus datos están en el panel: no se repiten aquí
  const dupCol = (selCol!==null && F.col[i]===selCol);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad ${META.prio[F.prio[i]]}</span>
    <h3>${tp!=='—'? tp+' ':''}${nm}</h3>
    <div class="sub">${colTxt} · ${META.munNames[F.mun[i]]}</div>
    <dl><dt>Responsable</dt><dd>${respTxt}</dd>
    <dt>Tipo de vialidad</dt><dd>${tp}</dd>
    <dt>Longitud del frente</dt><dd>${fmt.format(F.len[i])} m</dd>
    <dt>Banqueta (INEGI)</dt><dd>${ban}</dd>
    ${dupCol? '' : `<dt>Prioridad de la colonia</dt><dd>${cc? dot(cc):''}${cp}</dd>
    <dt>Desarrollo social (IDS) de la colonia</dt><dd>${col.ids||'—'}</dd>
    <dt>Población de la colonia</dt><dd>${col.pob? fmt.format(col.pob)+' hab.' : '—'}</dd>`}
    <dt>Coordenadas del frente</dt><dd>${midLat(i).toFixed(5)}, ${midLon(i).toFixed(5)}</dd></dl>
    ${dupCol? '<div class="cardnote">Los datos de la colonia se muestran arriba, en Resultados.</div>' : ''}
    ${fieldActs(midLat(i), midLon(i))}`;
}
function vpHtml(i, compact){
  const c = T.prio[VP.prio[i]]; const rgb=`rgb(${c[0]},${c[1]},${c[2]})`;
  const nom = VPC.nomenclat[VP.nom[i]], nombre = VPC.nombres[VP.nombre[i]];
  if (compact){
    if (resp==='alc') return `<b>${nom}</b><br><span class="m">Vialidad primaria · a cargo de Gobierno Central · ${nombre}</span>`;
    return `<span class="pr" style="background:${rgb}"></span><b>${nom}</b><br><span class="m">${nombre} · ${VPC.tipos[VP.tipo[i]]} · ${fmt.format(VP.len[i])} m · Prioridad ${META.prio[VP.prio[i]]}</span>`;
  }
  const s = avStat(VP.nom[i]);
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad ${META.prio[VP.prio[i]]}</span>
    <h3>${nom}</h3>
    <div class="sub">${nombre} · ${META.munNames[VP.mun[i]]}</div>
    <dl><dt>Responsable</dt><dd>Gobierno Central</dd>
    <dt>Tipo</dt><dd>${VPC.tipos[VP.tipo[i]]}</dd>
    <dt>Carriles</dt><dd>${VP.car[i]} · ${VPC.circula[VP.circ[i]].toLowerCase()}</dd>
    <dt>Longitud del tramo</dt><dd>${fmt.format(VP.len[i])} m</dd>
    <dt>Toda la avenida</dt><dd>${fmt1.format(s.km)} km · ${fmt1.format(s.kmp)} km prioritarios</dd>
    <dt>Alcaldías</dt><dd>${[...s.muns].map(m=>META.munNames[m]).join(', ')}</dd></dl>
    ${fieldActs(...vpMid(i))}
    ${isGC()? `<button class="btn secondary act" id="card-av" type="button">Ver toda la avenida</button>` : ''}`;
}
// acciones para salir a campo (enlaces externos y copia de coordenadas) (auditoría I5)
function fieldActs(lat, lon){ const ll = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return `<div class="field-acts">
    <a class="fa" href="https://www.google.com/maps/dir/?api=1&destination=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>Cómo llegar</a>
    <a class="fa" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6.5" r="3"/><path d="M8 21v-5l-2-3 3-3h6l3 3-2 3v5"/></svg>Street View</a>
    <button class="fa" type="button" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg><span>Copiar coordenadas</span></button>
  </div>`; }
const vpMid = i => { const a=vstart[i], b=vstart[i+1]-1, m=Math.floor((a+b)/2); return [VPOS[2*m+1], VPOS[2*m]]; };
function colHtml(id){
  const c = META.colonias[id]; const s = colStat(id); const tot = sum(s.km); const ntot = sum(s.n);
  const pc = c.p>=0? T.prio[c.p] : null; const rgb = pc? `rgb(${pc[0]},${pc[1]},${pc[2]})` : 'transparent';
  return `<button class="close" aria-label="Cerrar">×</button>
    <span class="pill"><i style="background:${rgb}"></i>Prioridad de colonia ${c.p>=0? META.prio[c.p]:'—'}</span>
    <h3>${c.n}</h3>
    <div class="sub">${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}</div>
    ${ntot? '' : `<div class="empty-note"><b>Sin frentes de manzana a cargo de la alcaldía.</b> El modelo no registra calles con frente en esta colonia; puede ser una unidad habitacional o un predio sin vía pública propia.</div>`}
    <dl>${ntot? `<dt>Frente prioritario</dt><dd>${kmFull(s.kmp)}${tot? ' · '+pct(s.kmp,tot):''}</dd>
    <dt>Frentes prioritarios</dt><dd>${fmt.format(s.np)} de ${fmt.format(ntot)}</dd>
    <dt>Frente total</dt><dd>${kmFull(tot)}</dd>` : ''}
    <dt>Población</dt><dd>${c.pob? fmt.format(c.pob)+' hab.' : '—'}</dd>
    <dt>Desarrollo social (IDS)</dt><dd>${c.ids||'—'}</dd>
    ${c.nbi? `<dt>Pobreza (NBI)</dt><dd>${fmt.format(c.nbi)} personas en su unidad territorial</dd>`:''}</dl>
    <div class="acts">${!ntot? '<button class="btn secondary act" id="card-alc" type="button">Ver la alcaldía</button>' : showFrB? '' : '<button class="btn secondary act" id="card-calles" type="button">Ver sus calles</button>'}${ntot? '<button class="btn secondary act" id="card-ficha" type="button">Ficha (PDF)</button>' : ''}</div>`;
}
