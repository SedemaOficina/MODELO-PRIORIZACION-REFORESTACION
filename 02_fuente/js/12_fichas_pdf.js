// Fichas PDF (jsPDF bajo demanda) de colonia, alcaldía, vialidades primarias de la alcaldía y avenida.
// abre la ficha después de cargar jsPDF (de libs/ en el sitio; del CDN en el artefacto)
function conPDF(kind){
  loadLib('jspdf.js', 'jspdf', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js')
    .then(()=> fichaPDF(kind))
    .catch(()=>{ const st = $('dl-status'); if (st) st.textContent = 'No se pudo cargar el generador de PDF; revisa tu conexión.'; });
}
// ---------- fichas (PDF) ----------
const LOGO_IMG = document.querySelector('.panel-head .logo'), LOGO_W = 1400, LOGO_H = 142;  // jsPDF acepta la imagen ya cargada (incrustada o en img/)
function alcBounds(i){ let w=180,s=90,e=-180,n=-90; for(const part of ALC_PARTS){ if(part.i!==i) continue; for(const q of part.poly){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } } const fb=META.bounds[META.muns[i]]; return [Math.min(w,fb[0]),Math.min(s,fb[1]),Math.max(e,fb[2]),Math.max(n,fb[3])]; }
function fichaPDF(kind){
  // kind: 'col' | 'alc' | 'vpalc' | 'vpav'
  if (!window.jspdf) return;
  const isCol = kind==='col', isAlc = kind==='alc', isVpAlc = kind==='vpalc', isVpAv = kind==='vpav'; const isVP = isVpAlc || isVpAv;
  if ((isCol && selCol===null) || ((isAlc||isVpAlc) && sel===null) || (isVpAv && selAv===null)) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'});
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const c = isCol? META.colonias[selCol] : null; const av = isVpAv? avStat(selAv) : null;
  let cs;
  if (isCol) cs = colStat(selCol);
  else if (isAlc){ const s=META.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:s.n[3]+s.n[4]}; }
  else if (isVpAlc){ const s=VPC.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:VP_RECS[sel].rp.size, ntot:VP_RECS[sel].r.size}; }
  else { cs={n:av.n, km:av.kmByP, kmp:av.kmp, np:av.recsp.size, ntot:av.recs.size}; }
  const tot = sum(cs.km); const ntot = isVP? cs.ntot : sum(cs.n);
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const unit = isVP? 'tramos' : 'frentes';
  // encabezado
  const lw = 118, lh = lw*LOGO_H/LOGO_W; doc.addImage(LOGO_IMG, 'PNG', M, 9, lw, lh);
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text(isCol? 'Ficha de colonia' : isAlc? 'Ficha de alcaldía' : isVpAlc? 'Ficha de vialidades primarias' : 'Ficha de avenida', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Calles prioritarias para reforestar', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  const title = isCol? c.n : isVpAv? VPC.nomenclat[selAv] : META.munNames[sel];
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(title.length>34? 17 : 22); doc.text(title, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = isCol? `${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' habitantes beneficiados':''}`
    : isAlc? `Ciudad de México · ${fmt.format(ntot)} frentes de manzana a cargo de la alcaldía · ${fmt0.format(tot)} km de frentes`
    : isVpAlc? `Ciudad de México · ${fmt.format(ntot)} tramos de vialidad primaria a cargo del Gobierno Central · ${fmt0.format(tot)} km`
    : `${[...av.nombres].join(', ')} · ${[...av.muns].map(m=>META.munNames[m]).join(', ')} · ${fmt1.format(tot)} km · ${fmt.format(ntot)} tramos`;
  doc.text(doc.splitTextToSize(sub, W-2*M)[0], M, 44);
  const pk = isCol? c.p : isAlc? ALC_DOM[sel] : isVpAlc? VP_DOM[sel] : dom({km:av.kmByP}); const pc = pk>=0? T.prio[pk] : GRIS;
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = isCol? `Prioridad de la colonia: ${pk>=0? META.prio[pk]:'—'}` : `Prioridad predominante: ${META.prio[pk]} (${pct(cs.km[pk],tot)} de los ${isVpAv? 'km de la avenida' : isVP? 'km de vialidad primaria de la alcaldía' : 'frentes de la alcaldía'})`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5);
  const tw = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = isCol? `Desarrollo social (IDS) de la colonia: ${c.ids||'—'}` : isAlc? `${rank[sel]}.º de 16 alcaldías en km prioritarios` : isVpAlc? `${rankVP[sel]}.º de 16 alcaldías en km prioritarios` : `${VPC.tipos[VP.tipo[av.idx[0]]]}`;
  const l2x = M+6+tw+8; if (l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5); else doc.text(doc.splitTextToSize(l2, W-2*M-6)[0], M+6, 56.4);
  // KPIs
  const kp = [[kmFull(cs.kmp), isVP? `de vialidad primaria prioritaria ${ampP()} (Muy Alta + Alta)` : `de frente prioritario ${ampP()} (Muy Alta + Alta)`],[fmt1.format(tot? 100*cs.kmp/tot:0)+' %','de los '+kmFull(tot)+' '+(isCol?'de frentes de la colonia':isAlc?'de frentes de la alcaldía':isVpAlc?'de vialidad primaria de la alcaldía':'de la avenida')],[fmt.format(cs.np), `${unit} prioritarios, de los ${fmt.format(ntot)} ${unit} ${ampP()}`]];
  function ampP(){ return isCol? 'de la colonia' : isVpAv? 'de la avenida' : 'de la alcaldía'; }
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  // línea de responsabilidad complementaria
  if (isAlc){ const vs=VPC.summ[META.muns[sel]]; const top=[]; for(const [a,s] of (()=>{ const m=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; m.set(a,(m.get(a)||0)+(VP.prio[i]>=3? VP.len[i]/1000:0)); } return m; })()) top.push([a,s]); top.sort((x,y)=>y[1]-x[1]);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); doc.text(doc.splitTextToSize(`Gobierno Central atiende además ${fmt0.format(sum(vs.km))} km de vialidades primarias en la alcaldía (${fmt0.format(kmPrio(vs))} km prioritarios); no se cuentan arriba. Principales: ${top.slice(0,3).map(t=>VPC.nomenclat[t[0]]).join(', ')}.`, W-2*M).slice(0,2), M, 81.5, {lineHeightFactor:1.25}); }
  if (isVpAlc){ const fs=META.summ[META.muns[sel]]; doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); doc.text(`La alcaldía atiende por su parte ${fmt0.format(sum(fs.km))} km de frentes de manzana (${fmt0.format(kmPrio(fs))} km prioritarios); ver ficha de alcaldía.`, M, 82.5); }
  // barras + mapa
  y=89; const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.text(isVP? `KILÓMETROS DE VIALIDAD PRIMARIA POR PRIORIDAD ${isVpAv? 'DE LA AVENIDA':'DE LA ALCALDÍA'}` : `KILÓMETROS DE FRENTE POR PRIORIDAD ${isCol? 'DE LA COLONIA':'DE LA ALCALDÍA'}`, M, y);
  const max=Math.max(...cs.km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*cs.km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(cs.km[k])} · ${tot? fmt1.format(100*cs.km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
  doc.setDrawColor(...LINE); doc.setFillColor(255,255,255); doc.rect(mx,my,mw,mh,'FD');
  doc.saveGraphicsState(); doc.rect(mx,my,mw,mh,null); doc.clip(); doc.discardPath();
  let b = isCol? colBounds(selCol) : isVpAv? avBounds(selAv) : alcBounds(sel);
  if (isVpAv){ const pad=Math.max(0.004, 0.08*Math.max(b[2]-b[0], b[3]-b[1])); b=[b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad]; }
  const cosl=Math.cos((b[1]+b[3])/2*Math.PI/180);
  const dx=(b[2]-b[0])*cosl, dy=(b[3]-b[1]); const pad=3; const sc=Math.min((mw-2*pad)/dx,(mh-2*pad)/dy);
  const ox=mx+(mw-dx*sc)/2, oy=my+(mh-dy*sc)/2;
  const X=lon=>ox+(lon-b[0])*cosl*sc, Y=lat=>oy+(b[3]-lat)*sc;
  const drawAlcOutline = (i)=>{ for(const part of ALC_PARTS){ if(part.i!==i) continue; const p=part.poly; for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } };
  if (isCol){
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(k>=3?0.55:0.35);
      for(let i=0;i<N;i++){ if(F.col[i]!==selCol || F.prio[i]!==k || F.gc[i]) continue; for(let v=start[i];v<start[i+1]-1;v++){ doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); } } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6);
    for(const cc of COLS){ if(cc.i!==selCol) continue; for(const p of cc.paths){ for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } }
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('Frentes de manzana por prioridad · contorno de la colonia', mx+2, my+mh-2);
  } else if (isAlc){
    const m = META.muns[sel]; doc.setLineWidth(0.15); doc.setDrawColor(255,255,255);
    for(const cc of COLS){ if(cc.mun!==m || cc.prio<0) continue; const col=T.prio[cc.prio]; doc.setFillColor(col[0],col[1],col[2]);
      for(const p of cc.paths){ if(p.length<3) continue; const segs=[]; for(let q=1;q<p.length;q++) segs.push([(X(p[q][0])-X(p[q-1][0])), (Y(p[q][1])-Y(p[q-1][1]))]); doc.lines(segs, X(p[0][0]), Y(p[0][1]), [1,1], 'FD', true); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); drawAlcOutline(sel);
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('Colonias por prioridad · contorno de la alcaldía', mx+2, my+mh-2);
  } else {
    // vialidades primarias por prioridad
    doc.setDrawColor(200,196,190); doc.setLineWidth(0.25);
    if (isVpAv) for(const m of av.muns) drawAlcOutline(m); else { for(let i=0;i<16;i++){ if(i!==sel) drawAlcOutline(i); } }
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(k>=3? 0.9 : 0.6);
      for(let i=0;i<NV;i++){ if(VP.prio[i]!==k) continue; if(isVpAlc && VP.mun[i]!==sel) continue; if(isVpAv && VP.nom[i]!==selAv) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); if (isVpAlc) drawAlcOutline(sel);
    doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text(isVpAlc? 'Vialidades primarias por prioridad · contorno de la alcaldía' : 'Tramos de la avenida por prioridad · alcaldías que cruza', mx+2, my+mh-2);
  }
  doc.restoreGraphicsState();
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla
  y=y+62; doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  let rows, cols;
  if (isCol){
    doc.text('CALLES CON MÁS FRENTE PRIORITARIO EN LA COLONIA', M, y);
    const items=[]; for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Vialidad'],[M+96,'Tipo'],[M+134,'Km prior.'],[M+158,'Frentes prior.']];
    rows = items.slice(0,14).map(([key,s])=>[META.names[s.nid], [...s.tipos].filter(Boolean).slice(0,2).join(', '), f2.format(s.kmp), `${s.np} de ${s.idx.length}`]);
  } else if (isAlc){
    doc.text('COLONIAS CON MÁS FRENTE PRIORITARIO EN LA ALCALDÍA', M, y);
    const m=META.muns[sel]; const items=[]; for(let i=1;i<META.colonias.length;i++){ const cc=META.colonias[i]; if(!cc.n || cc.m!==m) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Colonia'],[M+78,'Prioridad'],[M+106,'Desarrollo social'],[M+140,'Km prior.'],[M+161,'Frentes prior.']];
    rows = items.slice(0,14).map(([i,s])=>{ const cc=META.colonias[i]; return [cc.n, cc.p>=0? META.prio[cc.p]:'—', cc.ids||'—', f2.format(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))}`]; });
  } else if (isVpAlc){
    doc.text('AVENIDAS CON MÁS KILÓMETROS PRIORITARIOS EN LA ALCALDÍA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=per.get(a); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set(),nombres:new Set(),tipos:new Set()}; per.set(a,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
    const items=[...per.entries()].filter(([a,s])=>kmPrio(s)>0).sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Vialidad'],[M+70,'Red vial'],[M+108,'Predominante'],[M+134,'Km prior.'],[M+158,'Tramos prior.']];
    rows = items.slice(0,14).map(([a,s])=>[VPC.nomenclat[a], [...s.nombres].slice(0,2).join(', '), META.prio[dom(s)], f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  } else {
    doc.text('TRAMOS DE LA AVENIDA POR ALCALDÍA QUE CRUZA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(VP.prio[i]>=3) s.recsp.add(VP.rec[i]); }
    const items=[...per.entries()].sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Alcaldía'],[M+62,'Predominante'],[M+92,'Km en la alcaldía'],[M+126,'Km prior.'],[M+150,'Tramos prior.']];
    rows = items.map(([m,s])=>[META.munNames[m], META.prio[dom(s)], f2.format(sum(s.km)), f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if(!rows.length){ doc.setTextColor(...GRIS); doc.text('Sin registros prioritarios.', M+1.5, y+6); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,262,W-M,262); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const fuentes = isVP
    ? `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros. Las vialidades primarias y de acceso controlado corresponden al Gobierno de la Ciudad de México. Fuentes: SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); modelo de priorización del Sistema de Información Ambiental. La meta se mide sobre los 2,267 km de la red primaria completa. Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar.`
    : `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. ${isCol?'':'Prioridad predominante = categoría con más kilómetros de frente en la alcaldía. '}Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025) y capa de vialidades primarias (ago. 2026); catálogo de colonias SEDEMA-SIA e Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX). Generado el ${hoy} desde la herramienta Calles prioritarias para reforestar.`;
  doc.text(doc.splitTextToSize(fuentes, W-2*M), M, 266);
  const fname = isCol? `ficha_colonia_${slug(META.munNames[sel])}_${slug(c.n)}.pdf` : isAlc? `ficha_alcaldia_${slug(META.munNames[sel])}.pdf` : isVpAlc? `ficha_vialidades_primarias_${slug(META.munNames[sel])}.pdf` : `ficha_avenida_${slug(VPC.nomenclat[selAv])}${sel!==null? '_'+slug(META.munNames[sel]):''}.pdf`;
  deliverBlob(fname, doc.output('blob'));
}
$('dl-ficha').onclick = ()=>conPDF('col');
$('dl-ficha-alc').onclick = ()=>conPDF('alc');
$('dl-ficha-vpalc').onclick = ()=>conPDF('vpalc');
$('dl-ficha-av').onclick = ()=>conPDF('vpav');
