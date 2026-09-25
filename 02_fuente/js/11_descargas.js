// Descargas: CSV y Excel (SheetJS bajo demanda) con diccionario de datos.
// ---------- descargas ----------
let downloads; try { downloads = await claude.use('downloads'); } catch(e){ downloads = null; }
function csvEsc(v){ v=String(v??''); return /[",\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
async function deliver(filename, text){
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const blob = new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'});
  if (downloads){
    try{ await downloads.save({filename, data:blob}); st.textContent = `Guardado: ${filename}`; }
    catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  st.textContent = `Descargado: ${filename}`;
}
async function deliverBlob(filename, blob){
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  if (downloads){ try{ await downloads.save({filename, data:blob}); st.textContent=`Guardado: ${filename}`; } catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(META.colonias[selCol].n) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = clases Muy Alta y Alta de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas de las alcaldías.',
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), correspondientes al punto medio del tramo.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  'La meta de vialidades primarias se mide sobre los 2,267 km de la red completa, incluidos los tramos sin manzanas al frente.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.';
const DIC = {
  frentes: { titulo:'Frentes de manzana prioritarios', contenido:'Un renglón por frente de manzana con prioridad Muy Alta o Alta a cargo de la alcaldía.',
    cols:[11,30,16,13,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['prioridad','Clase de prioridad del frente de manzana.','Muy Alta o Alta'],
      ['vialidad','Nombre de la calle a la que da el frente.','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['responsable','Orden de gobierno que atiende el frente.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente.','Texto'],
      ['cp','Código postal de la colonia.','5 dígitos'],
      ['prioridad_colonia','Prioridad de la colonia: combinación de calor, rezago social y sombra.','Muy Baja a Muy Alta'],
      ['desarrollo_social_ids','Estrato del Índice de Desarrollo Social de la unidad territorial donde se ubica la colonia (EVALÚA CDMX).','Muy bajo a Muy alto'],
      ['unidad_territorial','Unidad territorial de EVALÚA CDMX de la que provienen el estrato de desarrollo social y la población en pobreza. No coincide necesariamente con los límites de la colonia.','Texto'],
      ['poblacion_colonia','Población total de la colonia (Censo 2020).','Habitantes'],
      ['poblacion_pobreza_nbi','Población en pobreza por necesidades básicas insatisfechas de la unidad territorial —no de la colonia— (EVALÚA CDMX).','Personas'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['longitud_m','Longitud del frente de manzana.','Metros'],
      ['banqueta_inegi','Disponibilidad de banqueta registrada por INEGI.','Dispone, No dispone, Conjunto habitacional, No aplica, No especificado'],
      ['lat','Latitud del punto medio del frente.','Grados decimales'],
      ['lon','Longitud del punto medio del frente.','Grados decimales'] ] },
  calles: { titulo:'Resumen por calle', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana. Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel de frentes.',
    cols:[30,30,8,22,20,13,15,12,13,11,15,11],
    campos:[
      ['vialidad','Nombre de la calle.','Texto'],
      ['colonia','Colonia en la que está este tramo de la calle.','Texto'],
      ['cp','Código postal de la colonia.','Texto de 5 dígitos'],
      ['tipos_vialidad','Tipos de vialidad que aparecen en sus tramos.','Texto separado por punto y coma'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['frentes_total','Número de frentes de manzana con ese nombre en el ámbito.','Entero'],
      ['frentes_muy_alta','Frentes con prioridad Muy Alta.','Entero'],
      ['frentes_alta','Frentes con prioridad Alta.','Entero'],
      ['km_muy_alta','Kilómetros de frente con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros de frente con prioridad Alta.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta y Alta.','Kilómetros'],
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las clases.','Kilómetros'] ] },
  tramos: { titulo:'Tramos prioritarios de vialidades primarias', contenido:'Un renglón por tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta o Alta, a cargo del Gobierno de la Ciudad.',
    cols:[11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['prioridad','Clase de prioridad del tramo en la capa de vialidades primarias.','Muy Alta o Alta'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave del tramo en la capa de vialidades primarias.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud del tramo.','Metros'],
      ['responsable','Orden de gobierno que atiende el tramo.','Gobierno Central'],
      ['lat','Latitud del punto medio del tramo.','Grados decimales'],
      ['lon','Longitud del punto medio del tramo.','Grados decimales'] ] },
  avenidas: { titulo:'Resumen por avenida', contenido:'Un renglón por avenida o eje, con la suma de sus tramos de vialidad primaria en el ámbito consultado.',
    cols:[30,30,24,34,13,18,13,11,11,11,13,15,11],
    campos:[
      ['vialidad','Nombre en calle de la avenida o eje.','Texto'],
      ['nombres_red_vial','Identificadores de la red vial asociados a esa avenida.','Texto separado por punto y coma'],
      ['tipos','Clasificación de sus tramos.','Vía primaria y/o Vía de acceso controlado'],
      ['alcaldias','Alcaldías que cruza dentro del ámbito consultado.','Texto separado por punto y coma'],
      ['tramos_total','Número de tramos de la avenida en el ámbito.','Entero'],
      ['tramos_prioritarios','Tramos con prioridad Muy Alta o Alta.','Entero'],
      ['km_muy_alta','Kilómetros con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros con prioridad Media.','Kilómetros'],
      ['km_baja','Kilómetros con prioridad Baja.','Kilómetros'],
      ['km_muy_baja','Kilómetros con prioridad Muy Baja.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta y Alta.','Kilómetros'],
      ['km_total','Kilómetros de la avenida en el ámbito.','Kilómetros'] ] }
};
function ambitoTxt(){
  if (selAv!==null) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad');
  if (selCol!==null) return META.colonias[selCol].n + ' · ' + META.munNames[sel];
  return sel===null? 'Ciudad de México' : META.munNames[sel];
}
function dictAoa(key, nreg, archivo){
  const d = DIC[key];
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const a = [['Calles prioritarias para reforestar — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', ambitoTxt()],
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ['Fecha de generación', hoy], [],
    ['Campo', 'Descripción', 'Valores o unidad']];
  for (const f of d.campos) a.push(f);
  a.push([], ['Notas']);
  for (const n of NOTAS_COMUNES) a.push([n]);
  a.push([], [FUENTES]);
  return a;
}
// ---------- exportación a Excel (datos + diccionario) ----------
// librerías bajo demanda: de docs/libs en la versión del sitio (window.SIA_LIBS) o del CDN en el artefacto
function loadLib(file, glob, cdn){
  if (window[glob]) return Promise.resolve(window[glob]);
  return new Promise((res, rej)=>{
    const s = document.createElement('script');
    s.src = window.SIA_LIBS ? window.SIA_LIBS + file : cdn;
    s.onload = ()=> window[glob] ? res(window[glob]) : rej(new Error('sin ' + glob));
    s.onerror = ()=> rej(new Error('no se pudo cargar la librería'));
    document.head.appendChild(s);
  });
}
let XL = null;
function loadXL(){
  if (XL) return Promise.resolve(XL);
  return loadLib('xlsx.js', 'XLSX', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').then(x => (XL = x));
}
const wch = ws => ws.map(w=>({wch:w}));
async function deliverTable(base, key, aoa){
  const st = $('dl-status'); st.textContent = 'Preparando archivo…';
  const nreg = aoa.length - 1;
  let X; try { X = await loadXL(); }
  catch(e){ // sin conexión al CDN: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = 'Sin conexión para generar el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '.csv', csv);
    const dic = dictAoa(key, nreg, base + '.csv').map(r=>r.map(csvEsc).join(',')).join('\n');
    await deliver(base + '_diccionario.csv', dic);
    return;
  }
  const wb = X.utils.book_new();
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(DIC[key].cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx'));
  wd['!cols'] = wch([26, 78, 46]);
  X.utils.book_append_sheet(wb, wd, 'Diccionario');
  const buf = X.write(wb, { bookType:'xlsx', type:'array', compression:true });
  await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
const num = v => { const n = Number(v); return Number.isFinite(n)? n : v; };
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(F.mun[i]===sel && F.prio[i]>=3 && !F.gc[i] && (selCol===null || F.col[i]===selCol)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([META.prio[F.prio[i]], META.names[F.name[i]], META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.pob||0, c.nbi||0, META.munNames[sel], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  deliverTable(`frentes_prioritarios_${scopeSlug()}`, 'frentes', rows);
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const rows=[['vialidad','colonia','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','km_muy_alta','km_alta','km_prioritario','km_total']];
  const items=[]; for(const [key,s] of streetIdx){ if(!s.kmp) continue; let ma=0,a=0,kma=0,ka=0; for(const i of s.idx){ if(F.prio[i]===4){ma++;kma+=F.len[i]/1000;} else if(F.prio[i]===3){a++;ka+=F.len[i]/1000;} }
    const c = s.col? META.colonias[s.col] : null;
    items.push([META.names[s.nid], c? c.n : 'Colonia no identificada', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[sel], s.idx.length, ma, a, num(kma.toFixed(2)), num(ka.toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[10]-x[10]); for(const r of items) rows.push(r);
  deliverTable(`resumen_calles_prioritarias_${scopeSlug()}`, 'calles', rows);
};
$('dl-tramos').onclick = ()=>{
  const rows=[['prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','responsable','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(VP.prio[i]>=3 && (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ const a=vstart[i], b=vstart[i+1]-1; rows.push([META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(((VPOS[2*a+1]+VPOS[2*b+1])/2).toFixed(6)), num(((VPOS[2*a]+VPOS[2*b])/2).toFixed(6))]); }
  deliverTable(`tramos_prioritarios_vialidades_primarias_${scopeSlug()}`, 'tramos', rows);
};
$('dl-avenidas').onclick = ()=>{
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  const items=[]; for(const [a,s] of avIdx){ const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    items.push([VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[11]-x[11]); for(const r of items) rows.push(r);
  deliverTable(`resumen_avenidas_prioritarias_${scopeSlug()}`, 'avenidas', rows);
};

document.fonts && document.fonts.ready.then(()=> rerender());
