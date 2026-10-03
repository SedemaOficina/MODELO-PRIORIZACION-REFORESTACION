// Descargas: CSV y Excel (SheetJS bajo demanda) con diccionario de datos.
// ---------- descargas ----------
// Integración opcional con el visor de artefactos (solo existe ahí); en el sitio publicado no hay tal objeto.
let downloads = null; if (typeof claude !== 'undefined' && claude && claude.use){ try { downloads = await claude.use('downloads'); } catch(e){ downloads = null; } }
// CSV de respaldo: se neutralizan las celdas que una hoja de cálculo interpretaría como fórmula (auditoría H-090)
function csvEsc(v){ v=String(v??''); if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = "'" + v; return /[",\r\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
// fecha AAAAMMDD en el nombre de cada archivo entregado (auditoría H-088)
const conFecha = name => { const d=new Date(), f=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; return name.replace(/(\.[a-z0-9]+)$/i, `_${f}$1`); };
async function deliver(filename, text){ filename = conFecha(filename);
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
async function deliverBlob(filename, blob){ if (!/_\d{8}\.[a-z0-9]+$/i.test(filename)) filename = conFecha(filename);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  if (downloads){ try{ await downloads.save({filename, data:blob}); st.textContent=`Guardado: ${filename}`; } catch(err){ st.textContent = err && err.code==='declined' ? 'Descarga cancelada.' : 'No fue posible guardar el archivo en este visor.'; } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
// las descargas de vialidades primarias no se filtran por colonia: su nombre y su ámbito tampoco la declaran
const scopeSlugVP = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(META.colonias[selCol].n) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '');
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = clases Muy Alta y Alta de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas de las alcaldías. ' + PRELIM_TXT,
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), del punto a media longitud del frente o del tramo, medido sobre su línea (no el promedio de sus extremos).',
  'Cobertura: la herramienta incluye los frentes de manzana del ámbito urbano de INEGI. Algunos frentes no tienen colonia asignada en el catálogo: se cuentan en las cifras de su alcaldía y en su Excel de frentes, pero no en las consultas por colonia.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  `La meta de vialidades primarias se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red completa, incluidos los tramos sin manzanas al frente.`,
  'Dos unidades: las vialidades primarias del Gobierno Central se reportan en kilómetros de vialidad, medidos sobre el eje de la avenida; la red de las alcaldías, en kilómetros de frente de manzana, una medida por cada acera. Para comparar o sumar lo que atiende cada quien se usa siempre el kilómetro de frente.',
  'Los kilómetros prioritarios describen dónde es mayor la necesidad de arbolado según el modelo; no son una meta ni una obligación de plantación.',
  'Universo de intervención = clases Muy Alta, Alta y Media. Se reporta en kilómetros de frente de manzana (cada lado de la calle frente a una manzana cuenta por separado), que no son comparables con los kilómetros de vialidad primaria medidos sobre el eje. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación.',
  'El Índice de Desarrollo Social y la población en pobreza corresponden a la unidad territorial de EVALÚA CDMX en la que se ubica la colonia, no a la colonia; no deben sumarse entre colonias.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.';
const DIC = {
  frentes: { titulo:'Frentes de manzana prioritarios', contenido:'Un renglón por frente de manzana con prioridad Muy Alta o Alta a cargo de la alcaldía.',
    cols:[10,11,30,16,13,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['id_frente','Identificador del frente de manzana en esta versión de los datos (ver «Corte de los datos»). Permite cruzar el renglón con la capa geográfica y detectar duplicados; no cambia mientras no cambie el corte.','Entero'],
      ['prioridad','Clase de prioridad del frente de manzana.','Muy Alta o Alta'],
      ['vialidad','Nombre de la calle a la que da el frente. Cuando INEGI no registra un nombre de calle («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua»), dice «Frente sin nombre de calle (INEGI)».','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['responsable','Orden de gobierno que atiende el frente.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente.','Texto'],
      ['cp','Código postal de la colonia.','5 dígitos'],
      ['prioridad_colonia','Prioridad de la colonia: combinación de calor, rezago social y sombra.','Muy Baja a Muy Alta'],
      ['desarrollo_social_ids','Estrato del Índice de Desarrollo Social de la unidad territorial donde se ubica la colonia (EVALÚA CDMX).','Muy bajo a Muy alto'],
      ['unidad_territorial','Unidad territorial de EVALÚA CDMX de la que provienen el estrato de desarrollo social y la población en pobreza. No coincide necesariamente con los límites de la colonia.','Texto'],
      ['poblacion_colonia','Población total de la colonia (Censo 2020). Vacío si el frente no tiene colonia asignada.','Habitantes'],
      ['poblacion_pobreza_nbi','Población en pobreza por necesidades básicas insatisfechas de la unidad territorial —no de la colonia— (EVALÚA CDMX).','Personas'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['longitud_m','Longitud del frente de manzana.','Metros'],
      ['banqueta_inegi','Disponibilidad de banqueta registrada por INEGI (2020). Es una condición por verificar: no indica ancho, estado ni espacio de plantación.','Dispone, No dispone, Conjunto habitacional, No aplica, No especificado'],
      ['lat','Latitud del punto a media longitud del frente, sobre su línea.','Grados decimales'],
      ['lon','Longitud del punto a media longitud del frente, sobre su línea.','Grados decimales'] ] },
  calle: { titulo:'Frentes de manzana de la calle consultada', contenido:'Un renglón por frente de manzana de la calle consultada, en todas las clases de prioridad, a cargo de la alcaldía. La calle es la de la colonia indicada en el ámbito; las calles con el mismo nombre en otras colonias no se incluyen.',
    cols:[10,11,30,16,13,28,7,16,18,26,14,18,20,11,20,8,44,11,11], campos:null },
  calles: { titulo:'Resumen por calle', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana. Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel de frentes.',
    cols:[30,30,8,22,20,13,15,12,13,11,15,11,24,11],
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
      ['km_media','Kilómetros de frente con prioridad Media.','Kilómetros'],
      ['km_universo_intervencion','Universo de intervención: suma de Muy Alta, Alta y Media.','Kilómetros'],
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las clases.','Kilómetros'] ] },
  tramos: { titulo:'Tramos prioritarios de vialidades primarias', contenido:'Un renglón por parte de tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta o Alta, a cargo del Gobierno de la Ciudad. Un tramo (id_tramo) ocupa más de un renglón cuando cruza un límite de alcaldía o su trazo tiene varias partes; la herramienta cuenta los tramos por id_tramo, por eso el número de renglones puede ser mayor que el número de tramos que muestra la pantalla. Los kilómetros coinciden.',
    cols:[10,11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['id_tramo','Identificador del tramo en la capa de vialidades primarias. Se repite cuando el tramo ocupa varios renglones.','Entero'],
      ['prioridad','Clase de prioridad del tramo en la capa de vialidades primarias.','Muy Alta o Alta'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave registrada en la capa de vialidades primarias. No identifica al tramo: varios tramos comparten la misma clave.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud de la parte del tramo de este renglón.','Metros'],
      ['responsable','Orden de gobierno que atiende el tramo.','Gobierno Central'],
      ['lat','Latitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'],
      ['lon','Longitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'] ] },
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
DIC.calle.campos = DIC.frentes.campos.map(f=> f[0]==='prioridad'? ['prioridad','Clase de prioridad del frente de manzana.','Muy Baja a Muy Alta'] : f);
DIC.calle.campos.splice(DIC.calle.campos.findIndex(f=>f[0]==='lat'), 0,
  ['tramo','Número del tramo de la calle al que pertenece el frente. Un tramo va de esquina a esquina y reúne los frentes de sus dos lados; se numera a lo largo de la calle. Se arma con una regla geométrica (frentes casi paralelos, en lados opuestos y traslapados) y debe confirmarse en campo.','Entero'],
  ['tramo_entre','Vialidades más cercanas a los extremos del tramo.','Texto']);
function calleAmbito(c){ const cols=[...new Set(c.idx.map(i=>F.col[i]).filter(Boolean))].map(k=>META.colonias[k].n); const muns=[...new Set(c.idx.map(i=>F.mun[i]))].map(m=>META.munNames[m]);
  return `Calle ${c.nombre} · ${cols.length>4? cols.length+' colonias' : cols.join(', ')} · ${muns.join(', ')}`; }
function ambitoTxt(key){
  const vp = key==='tramos' || key==='avenidas';
  if (selAv!==null && (vp || isGC())) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad');
  if (selCol!==null && !vp) return META.colonias[selCol].n + ' · ' + META.munNames[sel];
  return sel===null? 'Ciudad de México' : META.munNames[sel];
}
function dictAoa(key, nreg, archivo, extra){
  const d = DIC[key];
  const hoy = new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const a = [['Calles prioritarias para reforestar — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', (key==='calle' && calleSel())? calleAmbito(calleSel()) : ambitoTxt(key)],
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ...(extra||[]), ['Fecha de generación', hoy], ['Versión de la herramienta', VERSION.v], ['Corte de los datos', VERSION.corte], [],
    ['Campo', 'Descripción', 'Valores o unidad']];
  for (const f of d.campos) a.push(f);
  a.push([], ['Notas']);
  for (const n of NOTAS_COMUNES) a.push([n]);
  a.push([], [FUENTES]);
  return a;
}
// ---------- exportación a Excel (datos + diccionario) ----------
// librerías bajo demanda: de docs/libs en el sitio (window.SIA_LIBS) o, en la versión de un solo archivo, de la copia
// incrustada en la propia página (<script id="lib-ARCHIVO-b64">). Ninguna versión pide librerías a terceros (auditoría H-058, H-095).
function libIncrustada(file){ const el = document.getElementById('lib-' + file + '-b64'); if (!el) return null;
  const bin = atob(el.textContent.trim()), u8 = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u8], {type:'text/javascript'})); }
const LIB_EN_CURSO = {};   // una sola descarga por librería aunque se pida varias veces (auditoría H-036)
function loadLib(file, glob){
  if (window[glob]) return Promise.resolve(window[glob]);
  if (LIB_EN_CURSO[file]) return LIB_EN_CURSO[file];
  return LIB_EN_CURSO[file] = new Promise((res, rej)=>{
    const s = document.createElement('script');
    const src = window.SIA_LIBS ? window.SIA_LIBS + file : libIncrustada(file);
    if (!src) return rej(new Error('la librería ' + file + ' no viene en esta copia'));
    s.src = src;
    s.onload = ()=> window[glob] ? res(window[glob]) : rej(new Error('sin ' + glob));
    s.onerror = ()=>{ delete LIB_EN_CURSO[file]; s.remove(); rej(new Error('no se pudo cargar la librería')); };
    document.head.appendChild(s);
  });
}
let XL = null;
function loadXL(){
  if (XL) return Promise.resolve(XL);
  return loadLib('xlsx.js', 'XLSX').then(x => (XL = x));
}
const wch = ws => ws.map(w=>({wch:w}));
// Excel en un proceso auxiliar: la página sigue respondiendo mientras se arma el archivo (auditoría H-045)
// Propiedades del libro (auditoría H-052): título, autoría e idioma
const propsExcel = base => ({ Title: base.replace(/_/g,' '), Subject:'Priorización de calles para reforestación urbana', Author:'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental', Company:'Secretaría del Medio Ambiente de la Ciudad de México', Language:'es-MX', Comments:'Calles prioritarias para reforestar, versión ' + VERSION.v, CreatedDate: new Date() });
function excelAparte(aoa, cols, dic, props){ return new Promise((res, rej)=>{ let w; try { w = new Worker(window.SIA_LIBS + 'excel_worker.js'); } catch(e){ return rej(e); }
  w.onmessage = e=>{ w.terminate(); e.data && e.data.ok? res(e.data.buf) : rej(new Error(e.data && e.data.msg || 'proceso auxiliar')); };
  w.onerror = e=>{ w.terminate(); rej(new Error('proceso auxiliar')); }; w.postMessage({aoa, cols, dic, props}); }); }
const GRANDE = 20000;   // renglones a partir de los cuales se avisa del tamaño y de la espera
async function deliverTable(base, key, aoa, extra){
  const nreg = aoa.length - 1;
  const st = $('dl-status'); st.textContent = nreg>GRANDE? `Preparando un archivo grande: ${fmt.format(nreg)} renglones, alrededor de ${fmt0.format(Math.max(1, nreg*0.19/1000))} MB. Puede tardar hasta un minuto…` : 'Preparando archivo…';
  if (window.SIA_LIBS && window.Worker){
    try { const buf = await excelAparte(aoa, DIC[key].cols, dictAoa(key, nreg, base + '.xlsx', extra), propsExcel(base));
      await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); return; }
    catch(e){ console.warn('Excel en proceso auxiliar no disponible; se genera en la página', e); }
  }
  let X; try { X = await loadXL(); }
  catch(e){ // no se pudo cargar la librería de Excel: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = 'Sin conexión para generar el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '.csv', csv);
    const dic = dictAoa(key, nreg, base + '.csv', [...(extra||[]), ['Nota sobre el formato CSV', 'El código postal es un texto de 5 dígitos: al abrir el archivo en una hoja de cálculo, importar esa columna como texto para no perder los ceros iniciales.']]).map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '_diccionario.csv', dic);
    st.textContent = 'Descargado en CSV (dos archivos: listado y diccionario), porque no se pudo cargar el generador de Excel.';
    return;
  }
  const wb = X.utils.book_new(); wb.Props = propsExcel(base);
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(DIC[key].cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx', extra));
  wd['!cols'] = wch([26, 78, 46]);
  X.utils.book_append_sheet(wb, wd, 'Diccionario');
  const buf = X.write(wb, { bookType:'xlsx', type:'array', compression:true });
  await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
const num = v => { const n = Number(v); return Number.isFinite(n)? n : v; };
// equivalente en km de frente del ámbito de vialidades primarias, para el diccionario de los Excel del Gobierno Central
function gcExtra(){ const g = gcFrente(sel, selAv);
  return [['Unidad de las longitudes', 'Metros o kilómetros de vialidad, medidos sobre el eje'],
    ['Equivalente del ámbito en km de frente de manzana (aceras con manzana enfrente)', num(sum(g.km).toFixed(2))],
    ['Equivalente prioritario (Muy Alta y Alta) en km de frente de manzana', num(kmPrio(g).toFixed(2))]]; }
// cifras del universo de intervención del ámbito consultado, para el diccionario de los Excel de la red de las alcaldías
function univExtra(){ const R = repStat(sel, selCol); const k = v => num(v.toFixed(2));
  return [['Universo de intervención del ámbito (Muy Alta, Alta y Media), km de frente a cargo de la alcaldía', k(univ3(R.km[0]))],
    ['De ese universo, km de frente sin arbolado', k(univ3(R.sa[0]))],
    ['De ese universo, km de frente sin arbolado y con banqueta (INEGI)', k(univ3(R.sb[0]))],
    ['Universo de intervención del ámbito, km de frente a cargo del Gobierno Central', k(univ3(R.km[1]))]]; }
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(F.prio[i]>=3 && !F.gc[i] && enAmbito(i)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.n? (c.pob||0) : '', c.n? (c.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const sn = idx.filter(sinNombreFr);
  deliverTable(`frentes_prioritarios_${scopeSlug()}`, 'frentes', rows, [['Responsable de todos los renglones', 'Alcaldía (los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen)'], ['Frentes sin nombre de calle (INEGI) en este archivo', sn.length], ['Km de esos frentes sin nombre de calle', num((sn.reduce((t,i)=>t+F.len[i],0)/1000).toFixed(2))], ...univExtra()]);
};
$('dl-calle').onclick = ()=>{
  const c = calleSel(); if (!c) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','responsable','colonia','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','tramo','tramo_entre','lat','lon']];
  const tr = tramoDeFrente(); const nt = i => tr.has(i)? tr.get(i).n : 0;
  const idx=[...c.idx].sort((a,b)=> nt(a)-nt(b) || F.prio[b]-F.prio[a]);
  for(const i of idx){ const k=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', k.n, k.cp? k.cp.padStart(5,'0'):'', k.p>=0? META.prio[k.p]:'', k.ids||'', k.ut||'', k.n? (k.pob||0) : '', k.n? (k.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], nt(i)||'', tr.has(i)? entreTxt(tr.get(i)) : '', num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const muns=[...new Set(c.idx.map(i=>F.mun[i]))];
  deliverTable(`frentes_calle_${slug(c.nombre)}_${muns.length===1? slug(META.munNames[muns[0]]) : 'ciudad'}${selCol!==null? '_'+slug(META.colonias[selCol].n) : ''}`, 'calle', rows, [['Tramos de la calle', new Set([...tr.values()].map(t=>t.n)).size]]);
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const rows=[['vialidad','colonia','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','km_muy_alta','km_alta','km_prioritario','km_media','km_universo_intervencion','km_total']];
  const items=[]; for(const [key,s] of streetIdx){ if(!s.kmp) continue; let ma=0,a=0,kma=0,ka=0; for(const i of s.idx){ if(F.prio[i]===4){ma++;kma+=F.len[i]/1000;} else if(F.prio[i]===3){a++;ka+=F.len[i]/1000;} }
    const c = s.col? META.colonias[s.col] : null;
    items.push([META.names[s.nid], c? c.n : 'Colonia no identificada', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[F.mun[s.idx[0]]], s.idx.length, ma, a, num(kma.toFixed(2)), num(ka.toFixed(2)), num(s.kmp.toFixed(2)), num(s.kp[2].toFixed(2)), num((s.kmp+s.kp[2]).toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[10]-x[10]); for(const r of items) rows.push(r);
  deliverTable(`resumen_calles_prioritarias_${scopeSlug()}`, 'calles', rows, [['Km de frente prioritario sin nombre de calle (INEGI), no incluidos en este resumen', num(sinNombre.kmp.toFixed(2))], ['Frentes prioritarios sin nombre de calle, no incluidos', sinNombre.np], ...univExtra()]);
};
$('dl-tramos').onclick = ()=>{
  const rows=[['id_tramo','prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','responsable','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(VP.prio[i]>=3 && (sel===null || VP.mun[i]===sel) && (selAv===null || VP.nom[i]===selAv)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ const a=vstart[i], b=vstart[i+1]-1; rows.push([VP.rec[i], META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(vpMid(i)[0].toFixed(6)), num(vpMid(i)[1].toFixed(6))]); }
  const nTramos = new Set(idx.map(i=>VP.rec[i])).size;
  deliverTable(`tramos_prioritarios_vialidades_primarias_${scopeSlugVP()}`, 'tramos', rows, [['Tramos distintos (id_tramo)', nTramos], ...gcExtra()]);
};
$('dl-avenidas').onclick = ()=>{
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  const items=[]; for(const [a,s] of avIdx){ if (selAv!==null && a!==selAv) continue; const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    items.push([VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  items.sort((x,y)=> y[11]-x[11]); for(const r of items) rows.push(r);
  deliverTable(`resumen_avenidas_prioritarias_${scopeSlugVP()}`, 'avenidas', rows, gcExtra());
};

document.fonts && document.fonts.ready.then(()=> rerender());
