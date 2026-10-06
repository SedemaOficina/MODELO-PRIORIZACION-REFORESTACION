// Fichas PDF (jsPDF bajo demanda) de colonia, alcaldía, vialidades primarias de la alcaldía, avenida y calle.
// abre la ficha después de cargar jsPDF (de libs/ en el sitio; del CDN en el artefacto)
function conPDF(kind){
  loadLib('jspdf.js', 'jspdf')
    .then(()=> generaFicha(()=> fichaPDF(kind)), e=>{ const st = $('dl-status'); if (e && e.causa==='sesion') avisoSesion(st); else st.textContent = 'No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'; });
}
// «no cargó la librería» y «falló la generación» son errores distintos y se dicen distinto (auditoría H-035)
function generaFicha(f){ try { f(); } catch(e){ console.error(e); $('dl-status').textContent = 'No fue posible generar la ficha por un error interno. Recarga la página e inténtalo de nuevo; si persiste, avisa al Sistema de Información Ambiental.'; } }
// ---------- fichas (PDF) ----------
// texto en una sola línea: si no cabe, se recorta con puntos suspensivos en lugar de cortarse en seco (auditoría H-046)
function cortaTxt(doc, t, w){ const ls = doc.splitTextToSize(t, w); if (ls.length<2) return t; let x = ls[0]; while (x.length>1 && doc.getTextWidth(x+'…')>w) x = x.slice(0,-1); return x.replace(/[\s·,;(]+$/,'')+'…'; }
// título de ficha: se reduce hasta caber en el ancho útil
// Propiedades del documento (auditoría H-052): idioma, autoría y, al titular la ficha, su título. La librería no puede etiquetar el PDF.
function propsPDF(doc){ try { doc.setLanguage('es-MX'); doc.setProperties({ author:'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental', creator:'Modelo de priorización de reforestación urbana, versión ' + VERSION.v, subject:'Priorización de calles para reforestación urbana', keywords:'reforestación, arbolado urbano, Ciudad de México, frentes de manzana' }); } catch(e){} }
function tituloFicha(doc, t, w, x, y){ try { doc.setProperties({ title: 'Ficha · ' + t }); } catch(e){} let fs=22; doc.setFontSize(fs); while (fs>13 && doc.getTextWidth(t)>w){ fs-=1; doc.setFontSize(fs); } doc.text(cortaTxt(doc, t, w), x, y); }
const LOGO_IMG = document.querySelector('.panel-head .logo'), LOGO_W = 1199, LOGO_H = 318;  // jsPDF acepta la imagen ya cargada (incrustada o en img/)
function alcBounds(i){ let w=180,s=90,e=-180,n=-90; for(const part of ALC_PARTS){ if(part.i!==i) continue; for(const q of part.poly){ if(q[0]<w)w=q[0]; if(q[0]>e)e=q[0]; if(q[1]<s)s=q[1]; if(q[1]>n)n=q[1]; } } const fb=META.bounds[META.muns[i]]; return [Math.min(w,fb[0]),Math.min(s,fb[1]),Math.max(e,fb[2]),Math.max(n,fb[3])]; }
// El logotipo se entrega a jsPDF como lienzo ya dibujado. Si se le pasa el elemento <img>, jsPDF vuelve a pedir el archivo
// con una solicitud síncrona, que falla sin conexión y bloquea la página; así, además, la ficha se genera aunque el logotipo no cargue.
let LOGO_LIENZO = null;
function ponLogo(doc, x, y, w, h){ try { if (!LOGO_LIENZO && LOGO_IMG && LOGO_IMG.naturalWidth){ const c = document.createElement('canvas'); c.width = LOGO_IMG.naturalWidth; c.height = LOGO_IMG.naturalHeight; c.getContext('2d').drawImage(LOGO_IMG, 0, 0); LOGO_LIENZO = c; }
  if (LOGO_LIENZO) doc.addImage(LOGO_LIENZO, 'PNG', x, y, w, h); } catch(e){ console.warn('ficha sin logotipo', e); } }
function fichaPDF(kind){
  // kind: 'col' | 'alc' | 'vpalc' | 'vpav'
  if (!window.jspdf) return;
  const isCol = kind==='col', isAlc = kind==='alc', isVpAlc = kind==='vpalc', isVpAv = kind==='vpav'; const isVP = isVpAlc || isVpAv;
  if ((isCol && selCol===null) || ((isAlc||isVpAlc) && sel===null) || (isVpAv && selAv===null)) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'}); propsPDF(doc);
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const c = isCol? META.colonias[selCol] : null; const av = isVpAv? avStat(selAv) : null;
  let cs;
  if (isCol) cs = colStat(selCol);
  else if (isAlc){ const s=frSumm(); cs={n:s.n, km:s.km, kmp:kmPrio(s), np:sumPrio(s.n)}; }   // frSumm respeta el filtro de banqueta
  else if (isVpAlc){ const s=VPC.summ[META.muns[sel]]; cs={n:s.n, km:s.km, kmp:kmPrio(s), np:VP_RECS[sel].rp.size, ntot:VP_RECS[sel].r.size}; }
  else { cs={n:av.n, km:av.kmByP, kmp:av.kmp, np:av.recsp.size, ntot:av.recs.size}; }
  const tot = sum(cs.km); const ntot = isVP? cs.ntot : sum(cs.n);
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const unit = isVP? 'tramos' : 'frentes';
  // encabezado
  const lh = 15.5, lw = lh*LOGO_W/LOGO_H; ponLogo(doc, M, 9.5, lw, lh);   // logotipo en dos renglones (v17.39)
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text(isCol? 'Ficha de colonia' : isAlc? 'Ficha de alcaldía' : isVpAlc? 'Ficha de vialidades primarias' : 'Ficha de avenida', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Modelo de priorización de reforestación urbana', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  const title = isCol? colNombre(selCol) : isVpAv? VPC.nomenclat[selAv] : META.munNames[sel];
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); tituloFicha(doc, title, W-2*M, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = isCol? `${META.munNames[munIndex[c.m]]}${c.cp? ' · CP '+c.cp.padStart(5,'0'):''}${c.pob? ' · '+fmt.format(c.pob)+' habitantes (Censo 2020)':''}`
    : isAlc? `Ciudad de México · ${fmt.format(ntot)} frentes de manzana a cargo de la alcaldía · ${fmt0.format(tot)} km de frentes`
    : isVpAlc? `Ciudad de México · ${fmt.format(ntot)} tramos de vialidad primaria a cargo del Gobierno Central · ${fmt0.format(tot)} km`
    : `${[...av.nombres].join(', ')} · ${[...av.muns].map(m=>META.munNames[m]).join(', ')} · ${fmt1.format(tot)} km · ${fmt.format(ntot)} tramos`;
  // con filtro de banqueta (v17.35) las cifras de la ficha son las filtradas: el subtítulo lo dice primero, para que no se corte
  const subB = (isCol||isAlc) && filtroBanq!=='todas'? (filtroBanq==='con'? 'Solo con banqueta (INEGI 2020) · ' : 'Solo sin banqueta o por verificar (INEGI 2020) · ') : '';
  doc.text(cortaTxt(doc, subB + sub, W-2*M), M, 44);
  const pk = isCol? c.p : isAlc? (filtroBanq!=='todas'? dom({km:cs.km}) : ALC_DOM[sel]) : isVpAlc? VP_DOM[sel] : dom({km:av.kmByP}); const pc = pk>=0? T.prio[pk] : GRIS;
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = isCol? `Prioridad de la colonia: ${pk>=0? META.prio[pk]:'—'}` : `Prioridad predominante: ${META.prio[pk]} (${pct(cs.km[pk],tot)} de los ${isVpAv? 'km de la avenida' : isVP? 'km de vialidad primaria de la alcaldía' : 'km de frente de la alcaldía'})`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5);
  const tw = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = isCol? `Desarrollo social (IDS) de su unidad territorial: ${c.ids||'—'}` : isAlc? `Concentra ${partTxt(sel,false)}` : isVpAlc? `Concentra ${partTxt(sel,true)}` : `${VPC.tipos[VP.tipo[av.idx[0]]]}`;
  const l2x = M+6+tw+8; if (l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5); else doc.text(doc.splitTextToSize(l2, W-2*M-6)[0], M+6, 56.4);
  // KPIs
  const kp = [[kmFull(cs.kmp), isVP? `de vialidad primaria prioritaria ${ampP()} (Muy Alta + Alta)` : `de frente prioritario ${ampP()} (Muy Alta + Alta)`],[fmt1.format(tot? 100*cs.kmp/tot:0)+' %','de los '+kmFull(tot)+' '+(isCol?'de frentes de la colonia':isAlc?'de frentes de la alcaldía':isVpAlc?'de vialidad primaria de la alcaldía':'de la avenida')],[fmt.format(cs.np), isVP? `${unit} prioritarios, de los ${fmt.format(ntot)} ${unit} ${ampP()}` : (isCol? `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la colonia` : `frentes prioritarios, de los ${fmt.format(ntot)} a cargo de la alcaldía`)]];
  function ampP(){ return isCol? 'de la colonia' : isVpAv? 'de la avenida' : 'de la alcaldía'; }
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  // nota complementaria: se mide su alto real y la gráfica se coloca debajo, sin encimarse (auditoría H-046)
  let notaFin = 0; const nota = t => { doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA); const ls = doc.splitTextToSize(t, W-2*M).slice(0,4); doc.text(ls, M, 81.5, {lineHeightFactor:1.2}); notaFin = 81.5 + (ls.length-1)*3.6; };
  if (isAlc){ const vs=VPC.summ[META.muns[sel]]; const top=[]; for(const [a,s] of (()=>{ const m=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; m.set(a,(m.get(a)||0)+(esPrio(VP.prio[i])? VP.len[i]/1000:0)); } return m; })()) top.push([a,s]); top.sort((x,y)=>y[1]-x[1]);
    nota(`Gobierno Central atiende además ${fmt0.format(sum(vs.km))} km de vialidades primarias en la alcaldía, medidos sobre el eje (${fmt0.format(kmPrio(vs))} km prioritarios); no se cuentan arriba. Principales: ${top.slice(0,3).map(t=>VPC.nomenclat[t[0]]).join(', ')}.`); }
  if (isVpAlc){ const fs=META.summ[META.muns[sel]]; nota(`Los kilómetros de esta ficha se miden sobre el eje de la vialidad. ${gcFrenteTxt(sel, null)}. La alcaldía atiende por su parte ${fmt0.format(sum(fs.km))} km de frentes de manzana (${fmt0.format(kmPrio(fs))} km prioritarios); ver ficha de alcaldía.`); }
  if (isVpAv){
    // la frase de la alcaldía elegida va primero: es la que se pidió y no debe quedar fuera si la nota es larga
    let t = '';
    if (sel!==null){ const va=vpSumm(); t = `En ${META.munNames[sel]}: ${kmFull(sum(va.km))} de la avenida, ${kmFull(kmPrio(va))} prioritarios, ${fmt.format(va.recsp.size)} de ${fmt.format(va.recs.size)} tramos prioritarios. `; }
    t += `${avGruposTxt(selAv)? avGruposTxt(selAv)+'. ' : ''}Las cifras de esta ficha corresponden a la avenida completa, en todas las alcaldías que cruza, medidas sobre el eje. ${gcFrenteTxt(null, selAv)}.`;
    nota(t); }
  // barras + mapa
  y = Math.max(89, notaFin + 5.5); const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); const tBar = doc.splitTextToSize(isVP? `KILÓMETROS DE VIALIDAD PRIMARIA POR PRIORIDAD ${isVpAv? 'DE LA AVENIDA':'DE LA ALCALDÍA'}` : `KILÓMETROS DE FRENTE POR PRIORIDAD ${isCol? 'DE LA COLONIA':'DE LA ALCALDÍA'}`, colW-2); doc.text(tBar, M, y, {lineHeightFactor:1.15}); const dyT = (tBar.length-1)*4;
  const max=Math.max(...cs.km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+dyT+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*cs.km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(cs.km[k])} · ${tot? fmt1.format(100*cs.km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
  let capMapa='';
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
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(esPrio(k)?0.55:0.35);
      for(let i=0;i<N;i++){ if(F.col[i]!==selCol || F.prio[i]!==k || F.gc[i]) continue; for(let v=start[i];v<start[i+1]-1;v++){ doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); } } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6);
    for(const cc of COLS){ if(cc.i!==selCol) continue; for(const p of cc.paths){ for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } }
    capMapa = 'Frentes de manzana por prioridad · contorno de la colonia';
  } else if (isAlc){
    const m = META.muns[sel]; doc.setLineWidth(0.15); doc.setDrawColor(255,255,255);
    for(const cc of COLS){ if(cc.mun!==m || cc.prio<0) continue; const col=T.prio[cc.prio]; doc.setFillColor(col[0],col[1],col[2]);
      for(const p of cc.paths){ if(p.length<3) continue; const segs=[]; for(let q=1;q<p.length;q++) segs.push([(X(p[q][0])-X(p[q-1][0])), (Y(p[q][1])-Y(p[q-1][1]))]); doc.lines(segs, X(p[0][0]), Y(p[0][1]), [1,1], 'FD', true); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); drawAlcOutline(sel);
    capMapa = 'Colonias por prioridad · contorno de la alcaldía';
  } else {
    // vialidades primarias por prioridad
    doc.setDrawColor(200,196,190); doc.setLineWidth(0.25);
    if (isVpAv) for(const m of av.muns) drawAlcOutline(m); else { for(let i=0;i<16;i++){ if(i!==sel) drawAlcOutline(i); } }
    for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(esPrio(k)? 0.9 : 0.6);
      for(let i=0;i<NV;i++){ if(VP.prio[i]!==k) continue; if(isVpAlc && VP.mun[i]!==sel) continue; if(isVpAv && VP.nom[i]!==selAv) continue; for(let v=vstart[i];v<vstart[i+1]-1;v++) doc.line(X(VPOS[2*v]),Y(VPOS[2*v+1]),X(VPOS[2*v+2]),Y(VPOS[2*v+3])); } }
    doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.6); if (isVpAlc) drawAlcOutline(sel);
    capMapa = isVpAlc? 'Vialidades primarias por prioridad · contorno de la alcaldía' : 'Tramos de la avenida por prioridad · alcaldías que cruza';
  }
  doc.restoreGraphicsState();
  doc.setFillColor(255,255,255); doc.rect(mx+0.3,my+mh-5.2,mw-0.6,4.9,'F'); doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text(cortaTxt(doc, capMapa, mw-4), mx+2, my+mh-2);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla
  y=y+62;
  // universo de intervención (Muy Alta, Alta y Media) del ámbito de la ficha, en km de frente de manzana
  const NR = (isCol||isAlc)? (sinNombre.kmp>0? 9 : 10) : 14;   // dos renglones menos desde la v17.35: el párrafo del universo lleva el desglose por banqueta
  if (isCol||isAlc){ const R = repStat(sel, isCol? selCol : null); const ua=univ3(R.km[0]);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
    const ug = univ3(R.km[1]);
    // v17.35: el filtro de banqueta, si está activo, y el desglose por banqueta de los km prioritarios, siempre
    const lsU = doc.splitTextToSize(`${filtroBanq!=='todas'? 'Consulta filtrada: '+banqTxt()+'. ' : ''}Universo de intervención (Muy Alta, Alta y Media): ${kmFull(ua)} de frente a cargo de la alcaldía (${pct(ua,sum(R.km[0]))} de sus frentes ${isCol?'en la colonia':'en la alcaldía'}); de ellos, ${kmFull(univ3(R.sa[0]))} sin arbolado.${ug>0? ` Gobierno Central: ${kmFull(ug)} de frente de ese universo, sobre vialidades primarias.`:''} ${banqDesgloseTxt(sel, isCol? selCol : null)}`, W-2*M).slice(0,5);
    doc.text(lsU, M, y+2, {lineHeightFactor:1.25});
    y += 16 + Math.max(0, lsU.length-3)*4.4; }
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  let rows, cols;
  if (isCol){
    doc.text('CALLES CON MÁS FRENTE PRIORITARIO EN LA COLONIA', M, y);
    const items=[]; for(const [key,s] of streetIdx){ if(s.kmp>0 && META.names[s.nid]) items.push([key,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Vialidad'],[M+96,'Tipo'],[M+134,'Km prior.'],[M+158,'Frentes prior.']];
    rows = items.slice(0,NR).map(([key,s])=>[META.names[s.nid], [...s.tipos].filter(Boolean).slice(0,2).join(', '), f2.format(s.kmp), `${s.np} de ${s.idx.length}`]);
  } else if (isAlc){
    doc.text('COLONIAS CON MÁS FRENTE PRIORITARIO EN LA ALCALDÍA', M, y);
    const m=META.muns[sel]; const items=[]; for(let i=1;i<META.colonias.length;i++){ const cc=META.colonias[i]; if(!cc.n || cc.m!==m) continue; const s=colStat(i); if(s.kmp>0) items.push([i,s]); } items.sort((a,b)=>b[1].kmp-a[1].kmp);
    cols=[[M,'Colonia'],[M+78,'Prioridad'],[M+106,'IDS de su U. T.'],[M+140,'Km prior.'],[M+161,'Frentes prior.']];
    rows = items.slice(0,NR).map(([i,s])=>{ const cc=META.colonias[i]; return [cc.n, cc.p>=0? META.prio[cc.p]:'—', cc.ids||'—', f2.format(s.kmp), `${fmt.format(s.np)} de ${fmt.format(sum(s.n))}`]; });
  } else if (isVpAlc){
    doc.text('AVENIDAS CON MÁS KILÓMETROS PRIORITARIOS EN LA ALCALDÍA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.mun[i]!==sel) continue; const a=VP.nom[i]; let s=per.get(a); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set(),nombres:new Set(),tipos:new Set()}; per.set(a,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); s.nombres.add(VPC.nombres[VP.nombre[i]]); s.tipos.add(VPC.tipos[VP.tipo[i]]); }
    const items=[...per.entries()].filter(([a,s])=>kmPrio(s)>0).sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Vialidad'],[M+70,'Red vial'],[M+108,'Predominante'],[M+134,'Km prior.'],[M+158,'Tramos prior.']];
    rows = items.slice(0,14).map(([a,s])=>[VPC.nomenclat[a], [...s.nombres].slice(0,2).join(', '), META.prio[dom(s)], f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  } else {
    doc.text('TRAMOS DE LA AVENIDA POR ALCALDÍA QUE CRUZA', M, y);
    const per=new Map(); for(let i=0;i<NV;i++){ if(VP.nom[i]!==selAv) continue; const m=VP.mun[i]; let s=per.get(m); if(!s){ s={km:[0,0,0,0,0],recs:new Set(),recsp:new Set()}; per.set(m,s); } const k=VP.len[i]/1000; s.km[VP.prio[i]]+=k; s.recs.add(VP.rec[i]); if(esPrio(VP.prio[i])) s.recsp.add(VP.rec[i]); }
    const items=[...per.entries()].sort((a,b)=>kmPrio(b[1])-kmPrio(a[1]));
    cols=[[M,'Alcaldía'],[M+62,'Predominante'],[M+92,'Km en la alcaldía'],[M+126,'Km prior.'],[M+150,'Tramos prior.']];
    rows = items.map(([m,s])=>[META.munNames[m], META.prio[dom(s)], f2.format(sum(s.km)), f2.format(kmPrio(s)), `${s.recsp.size} de ${s.recs.size}`]);
  }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if(!rows.length){ doc.setTextColor(...GRIS); doc.text('Sin registros prioritarios.', M+1.5, y+6); }
  // frentes prioritarios sin nombre de calle: no caben en una tabla por calle, pero se reportan (auditoría H-008)
  if ((isCol||isAlc) && sinNombre.kmp>0){ doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(`Además, ${kmFull(sinNombre.kmp)} de frente prioritario ${isCol?'de la colonia':'de la alcaldía'} no tienen nombre de calle en INEGI (${fmt.format(sinNombre.np)} frentes); no aparecen en los listados por calle, pero sí en el Excel de frentes.`, W-2*M-3).slice(0,2), M+1.5, y+6+Math.max(rows.length,1)*6.2-1.5, {lineHeightFactor:1.2}); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,254,W-M,254); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  const fuentes = isVP
    ? `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros. Las vialidades primarias y de acceso controlado corresponden al Gobierno de la Ciudad de México. Fuentes: SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); modelo de priorización del Sistema de Información Ambiental. La meta se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red primaria completa. ${PRELIM_TXT} Generado el ${hoy} desde la herramienta Modelo de priorización de reforestación urbana. ${VERSION_TXT}.`
    : `Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. ${isCol?'':'Prioridad predominante = categoría con más kilómetros de frente en la alcaldía. '}Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025) y capa de vialidades primarias (ago. 2026); catálogo de colonias SEDEMA-SIA e Índice de Desarrollo Social por unidad territorial (EVALÚA CDMX). ${PRELIM_TXT} Generado el ${hoy} desde la herramienta Modelo de priorización de reforestación urbana. ${VERSION_TXT}.`;
  doc.text(doc.splitTextToSize(fuentes, W-2*M), M, 258);
  const fname = isCol? `ficha_colonia_${slug(META.munNames[sel])}_${slug(colNombre(selCol))}${banqSlug()}.pdf` : isAlc? `ficha_alcaldia_${slug(META.munNames[sel])}${banqSlug()}.pdf` : isVpAlc? `ficha_vialidades_primarias_${slug(META.munNames[sel])}.pdf` : `ficha_avenida_${slug(VPC.nomenclat[selAv])}_toda_la_ciudad.pdf`;
  deliverBlob(fname, doc.output('blob'));
}
// ---------- ficha de calle (red de las alcaldías) ----------
// Misma composición que las demás fichas: encabezado, cifras, barras por prioridad, mapa y tabla por colonia.
function fichaCallePDF(){
  const c = calleSel(); if (!c || !window.jspdf) return;
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:'mm', format:'letter'}); propsPDF(doc);
  const W=215.9, M=15, GUINDA=[157,33,72], PIZARRA=[39,58,69], GRIS=[85,88,90], INK=[36,38,42], LINE=[226,221,213], PANEL=[248,246,242];
  const f2 = new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
  const idx = c.idx, enCalle = new Set(idx);
  const km=[0,0,0,0,0], n=[0,0,0,0,0]; let banq=0; const tipos=new Set(), porCol=new Map(), munSet=new Set();
  for(const i of idx){ const k=F.len[i]/1000, p=F.prio[i]; km[p]+=k; n[p]++; if (META.disp[(F.flags[i]>>3)&7]==='Dispone') banq++; if (META.tipos[F.tipo[i]]) tipos.add(META.tipos[F.tipo[i]]); munSet.add(F.mun[i]);
    let s=porCol.get(F.col[i]); if(!s){ s={km:0,kmp:0,n:0,np:0}; porCol.set(F.col[i],s); } s.km+=k; s.n++; if(esPrio(p)){ s.kmp+=k; s.np++; } }
  const tot=sum(km), kmp=sumPrio(km), ntot=idx.length, np=sumPrio(n);
  const muns=[...munSet].map(m=>META.munNames[m]); const colNoms=[...porCol.keys()].filter(Boolean).map(k=>META.colonias[k].n);
  // encabezado
  const lh = 15.5, lw = lh*LOGO_W/LOGO_H; ponLogo(doc, M, 9.5, lw, lh);   // logotipo en dos renglones (v17.39)
  doc.setTextColor(...GUINDA); doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.text('Ficha de calle', W-M, 14, {align:'right'});
  doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text('Modelo de priorización de reforestación urbana', W-M, 19, {align:'right'});
  doc.setFontSize(7); doc.text('Secretaría del Medio Ambiente · Sistema de Información Ambiental', W-M, 23.2, {align:'right'});
  doc.setDrawColor(...GUINDA); doc.setLineWidth(0.8); doc.line(M, 26.5, W-M, 26.5);
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); tituloFicha(doc, c.nombre, W-2*M, M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  const sub = `${colNoms.length>3? colNoms.length+' colonias' : colNoms.join(', ')} · ${muns.join(', ')} · ${fmt.format(ntot)} frentes de manzana · ${kmFull(tot)}`;
  doc.text(cortaTxt(doc, sub, W-2*M), M, 44);
  const pk = dom({km}); const pc = T.prio[pk];
  doc.setFillColor(pc[0],pc[1],pc[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.circle(M+2, 51.2, 1.8, 'FD');
  const l1 = `Prioridad predominante: ${META.prio[pk]} (${pct(km[pk],tot)} de los km de la calle)`;
  doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l1, M+6, 52.5); const tw1 = doc.getTextWidth(l1);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const l2 = [...tipos].slice(0,2).join(', '); const l2x = M+6+tw1+8; if (l2 && l2x + doc.getTextWidth(l2) <= W-M) doc.text(l2, l2x, 52.5);
  // cifras
  const kp = [[kmFull(kmp), 'de frente prioritario de la calle (Muy Alta + Alta)'],[fmt1.format(tot? 100*kmp/tot:0)+' %','de los '+kmFull(tot)+' de frentes de la calle'],[fmt.format(np), `frentes prioritarios a cargo de la alcaldía, de ${fmt.format(ntot)} en la calle`]];
  const kw=(W-2*M-8)/3; let y=58;
  kp.forEach((k,i)=>{ const x=M+i*(kw+4); doc.setFillColor(...PANEL); doc.setDrawColor(...LINE); doc.roundedRect(x,y,kw,20,2,2,'FD'); doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(k[0], x+4, y+9); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(k[1], kw-8), x+4, y+14); });
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GUINDA);
  doc.text(doc.splitTextToSize(`${filtroBanq!=='todas'? 'Consulta filtrada: '+banqTxt()+'. ' : ''}Banqueta (INEGI): ${fmt.format(banq)} de ${fmt.format(ntot)} frentes registran banqueta; el espacio de plantación se verifica en campo. Cada frente es un lado de la calle frente a una manzana.`, W-2*M).slice(0,2), M, 80.6, {lineHeightFactor:1.2});
  // barras + mapa
  y=90.5; const colW=(W-2*M)*0.46;
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.text('KILÓMETROS POR PRIORIDAD EN LA CALLE', M, y);
  const max=Math.max(...km,0.001); const barX=M+22, barW=colW-22-24;
  for(let k=4;k>=0;k--){ const yy=y+6+(4-k)*9; const col=T.prio[k]; doc.setFillColor(col[0],col[1],col[2]); doc.setDrawColor(200,194,184); doc.setLineWidth(0.15); doc.rect(M,yy-3,3.5,3.5,'FD'); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK); doc.text(META.prio[k], M+5, yy);
    doc.setFillColor(...PANEL); doc.rect(barX,yy-3.2,barW,4,'F'); doc.setFillColor(col[0],col[1],col[2]); doc.rect(barX,yy-3.2,Math.max(0.6,barW*km[k]/max),4,'FD');
    doc.setTextColor(...GRIS); doc.text(`${kmFull(km[k])} · ${tot? fmt1.format(100*km[k]/tot):'0'} %`, barX+barW+2, yy); }
  const mx=M+colW+6, my=y-4, mw=W-M-mx, mh=62;
  doc.setDrawColor(...LINE); doc.setFillColor(255,255,255); doc.rect(mx,my,mw,mh,'FD');
  doc.saveGraphicsState(); doc.rect(mx,my,mw,mh,null); doc.clip(); doc.discardPath();
  let w=180,s0=90,e=-180,nn=-90; for(const i of idx){ for(let v=start[i];v<start[i+1];v++){ const x=POS[2*v], yv=POS[2*v+1]; if(x<w)w=x; if(x>e)e=x; if(yv<s0)s0=yv; if(yv>nn)nn=yv; } }
  const pd=Math.max(0.0025, 0.15*Math.max(e-w, nn-s0)); const b=[w-pd,s0-pd,e+pd,nn+pd];
  const cosl=Math.cos((b[1]+b[3])/2*Math.PI/180); const dx=(b[2]-b[0])*cosl, dy=(b[3]-b[1]); const sc=Math.min((mw-6)/dx,(mh-6)/dy);
  // la vista del mapa se amplía hasta llenar el recuadro, para dar contexto alrededor de la calle
  const cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2, hw=mw/2/sc/cosl, hh=mh/2/sc; const vb=[cx-hw,cy-hh,cx+hw,cy+hh];
  const X=lon=>mx+mw/2+(lon-cx)*cosl*sc, Y=lat=>my+mh/2-(lat-cy)*sc;
  // contexto: demás frentes de la zona en gris claro y contorno de las colonias de la calle
  doc.setDrawColor(214,209,201); doc.setLineWidth(0.2);
  for(let i=0;i<N;i++){ if (enCalle.has(i) || !munSet.has(F.mun[i])) continue; const a=start[i]; const x=POS[2*a], yv=POS[2*a+1]; if (x<vb[0]||x>vb[2]||yv<vb[1]||yv>vb[3]) continue;
    for(let v=start[i];v<start[i+1]-1;v++) doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); }
  doc.setDrawColor(...PIZARRA); doc.setLineWidth(0.3);
  for(const cc of COLS){ if(!porCol.has(cc.i)) continue; for(const p of cc.paths){ for(let q=0;q<p.length-1;q++) doc.line(X(p[q][0]),Y(p[q][1]),X(p[q+1][0]),Y(p[q+1][1])); } }
  for(let k=0;k<5;k++){ const col=T.prio[k]; doc.setDrawColor(col[0],col[1],col[2]); doc.setLineWidth(1.1);
    for(const i of idx){ if(F.prio[i]!==k) continue; for(let v=start[i];v<start[i+1]-1;v++) doc.line(X(POS[2*v]),Y(POS[2*v+1]),X(POS[2*v+2]),Y(POS[2*v+3])); } }
  doc.restoreGraphicsState();
  doc.setFillColor(255,255,255); doc.rect(mx+0.3,my+mh-5.2,mw-0.6,4.9,'F');
  doc.setFontSize(7.5); doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.text('La calle por prioridad · en gris, calles vecinas · contorno de sus colonias', mx+2, my+mh-2);
  doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(mx,my,mw,mh,'D');
  // tabla por colonia
  // tabla: tramos de la calle (de esquina a esquina); si la calle abarca varias colonias, por colonia
  y=y+62; doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  const trs = porCol.size===1? tramosDeCalle(idx) : null;
  let items, cols, rows;
  if (trs){ doc.text('TRAMOS DE LA CALLE, DE ESQUINA A ESQUINA', M, y); items = trs;
    cols=[[M,'Tramo'],[M+13,'Ubicación'],[M+104,'Metros de calle'],[M+130,'Lados'],[M+144,'Predominante'],[M+168,'Km prior.']];
    rows = items.slice(0,14).map(t=>[t.n, entreTxt(t), fmt.format(t.largo), t.lados, META.prio[dom({km:t.km})], f2.format(sumPrio(t.km))]);
  } else { doc.text('LA CALLE POR COLONIA', M, y);
    items=[...porCol.entries()].sort((a,b2)=>b2[1].kmp-a[1].kmp || b2[1].km-a[1].km);
    cols=[[M,'Colonia'],[M+70,'Prioridad de la colonia'],[M+112,'Km de frente'],[M+138,'Km prior.'],[M+160,'Frentes prior.']];
    rows = items.slice(0,14).map(([k,st])=>{ const cc=META.colonias[k]; return [k? cc.n : 'Colonia no identificada', k && cc.p>=0? META.prio[cc.p] : '—', f2.format(st.km), f2.format(st.kmp), `${st.np} de ${st.n}`]; }); }
  y+=6; doc.setFillColor(...PANEL); doc.rect(M,y-4,W-2*M,6,'F'); doc.setFontSize(7.5); cols.forEach(([x,h])=>doc.text(h.toUpperCase(),x+1.5,y));
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  rows.forEach((r,i)=>{ const yy=y+6+i*6.2; if(i%2){ doc.setFillColor(252,251,249); doc.rect(M,yy-4.2,W-2*M,6.2,'F'); }
    r.forEach((v,k)=>{ const wcol = (k<cols.length-1? cols[k+1][0] : W-M) - cols[k][0] - 3; doc.text(doc.splitTextToSize(String(v), wcol)[0]||'', cols[k][0]+1.5, yy); }); });
  if (items.length>14){ doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(`Se muestran 14 de ${items.length} ${trs? 'tramos; el Excel de la calle trae todos' : 'colonias; el Excel de la calle trae todas'}.`, M+1.5, y+6+14*6.2); }
  // pie
  doc.setDrawColor(...LINE); doc.line(M,254,W-M,254); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
  doc.text(doc.splitTextToSize('Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA). Prioritario = categorías Muy Alta y Alta. Prioridad predominante = categoría con más kilómetros de frente en la calle. Una calle se compone de frentes de manzana: cada lado de la calle frente a una manzana es un frente. Los tramos se arman con una regla geométrica y sus vialidades delimitantes son aproximadas; se confirman en campo. Los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen. Fuentes: INEGI, Características del Entorno Urbano 2020; SEDEMA, modelo de priorización de frentes de manzana (nov. 2025); catálogo de colonias SEDEMA-SIA. ' + PRELIM_TXT + ' Generada el ' + new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}) + '. ' + VERSION_TXT + '.', W-2*M), M, 258);
  deliverBlob(`ficha_calle_${slug(c.nombre)}_${munSet.size===1? slug(muns[0]) : 'ciudad'}${selCol!==null? '_'+slug(colNombre(selCol)) : ''}${banqSlug()}.pdf`, doc.output('blob'));
}
$('dl-ficha-calle').onclick = ()=> loadLib('jspdf.js', 'jspdf')
  .then(()=> generaFicha(fichaCallePDF), e=>{ const st = $('dl-status'); if (e && e.causa==='sesion') avisoSesion(st); else st.textContent = 'No se pudo cargar el generador de PDF. Revisa tu conexión e inténtalo de nuevo.'; });
$('dl-ficha').onclick = ()=>conPDF('col');
$('dl-ficha-alc').onclick = ()=>conPDF('alc');
$('dl-ficha-vpalc').onclick = ()=>conPDF('vpalc');
$('dl-ficha-av').onclick = ()=>conPDF('vpav');

// ---------- estado de las descargas visible desde donde se piden, y un archivo por clic (auditoría H-036) ----------
// El aviso de estado vive en la pestaña Descargas; el pie fijo lo repite, porque sus botones funcionan desde cualquier pestaña.
// Mientras un archivo se prepara, los botones de descarga no aceptan otro clic.
let GENERANDO = false, genT = null;
const EN_CURSO = /^Preparando/;
function finGenera(){ GENERANDO = false; clearTimeout(genT); document.body.classList.remove('generando'); }
new MutationObserver(()=>{ const t = $('dl-status').textContent.trim(); const a = $('act-status');
  const esDescarga = /^(Preparando|Descargado|Guardado|Descarga cancelada|No fue posible|No se pudo)/.test(t);
  if (a){ a.textContent = esDescarga? t : ''; a.hidden = !esDescarga; }
  if (GENERANDO && !EN_CURSO.test(t)) finGenera();
}).observe($('dl-status'), {childList:true, characterData:true, subtree:true});
['dl-frentes','dl-calles','dl-tramos','dl-avenidas','dl-calle','dl-ficha-calle','dl-ficha-vpalc','dl-ficha-av','dl-ficha-alc','dl-ficha','dl-kml','dl-geojson'].forEach(id=>{ const b = $(id), h = b.onclick; if (!h) return;
  b.onclick = e=>{ if (GENERANDO || b.disabled) return; GENERANDO = true; document.body.classList.add('generando'); $('dl-status').textContent = 'Preparando archivo…';
    // un Excel grande en un equipo lento puede pasar de 90 s: primero se avisa que sigue en proceso y solo a los 5 min se da por fallido
    // (antes se decía «No fue posible» a los 90 s, se liberaban los botones y el archivo llegaba después: la persona lo pedía dos veces)
    genT = setTimeout(()=>{ if (!GENERANDO) return;
      if (EN_CURSO.test($('dl-status').textContent)) $('dl-status').textContent = 'Preparando archivo… es grande y en este equipo tarda; sigue en proceso.';
      genT = setTimeout(()=>{ if (GENERANDO){ finGenera(); if (EN_CURSO.test($('dl-status').textContent)) $('dl-status').textContent = 'No fue posible preparar el archivo. Inténtalo de nuevo.'; } }, 210000); }, 90000);
    h.call(b, e); }; });
