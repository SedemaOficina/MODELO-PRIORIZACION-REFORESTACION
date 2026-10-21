// Descargas: CSV y Excel (SheetJS bajo demanda) con diccionario de datos.
// ---------- descargas ----------
// CSV de respaldo: se neutralizan las celdas que una hoja de cálculo interpretaría como fórmula
function csvEsc(v){ v=String(v??''); if (/^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) v = "'" + v; return /[",\r\n;]/.test(v)? '"'+v.replace(/"/g,'""')+'"' : v; }
// Fechas de la Ciudad de México, sea cual sea la zona del equipo (B8-02): AAAAMMDD en el nombre de cada archivo entregado y
// «20 de octubre de 2026» en el diccionario y las fichas. Si el navegador no conoce la zona, la del equipo.
const TZ_CDMX = 'America/Mexico_City';
function fechaCDMX(){ try { const p = {}; for (const x of new Intl.DateTimeFormat('en-CA', {timeZone:TZ_CDMX, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date())) p[x.type] = x.value; return p.year + p.month + p.day; }
  catch(e){ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; } }
function hoyCDMX(){ const o = {day:'numeric', month:'long', year:'numeric'}; try { return new Date().toLocaleDateString('es-MX', {...o, timeZone:TZ_CDMX}); } catch(e){ return new Date().toLocaleDateString('es-MX', o); } }
const conFecha = name => name.replace(/(\.[a-z0-9]+)$/i, `_${fechaCDMX()}$1`);
// ámbito de la consulta para el registro de usos (solo se envía con sesión; ver avisaUso en 01_utilidades.js)
function ambitoUso(){ const c = calleSel(); return { red: resp, alcaldia: sel!==null? META.munNames[sel] : '', colonia: selCol!==null? colNombre(selCol) : '',
  avenida: selAv!==null? VPC.nomenclat[selAv] : '', calle: c? c.nombre : '', banqueta: filtroBanq, ...(filtroEsp? {espacio: espCodigo()} : {}) }; }
// los nombres de archivo dicen lo mismo que su botón; el tipo se conserva para que el reporte de usos siga comparable
const TIPO_ARCHIVO = [[/^frente_por_frente_calle_/, 'excel_calle'], [/^frente_por_frente_/, 'excel_frentes'], [/^lista_de_calles_/, 'excel_calles'], [/^tramo_por_tramo_/, 'excel_tramos'],
  [/^las_16_alcaldias/, 'excel_alcaldias'], [/^lista_de_avenidas_/, 'excel_avenidas'], [/^ficha_alcaldia_/, 'ficha_alcaldia'], [/^ficha_colonia_/, 'ficha_colonia'],
  [/^ficha_vialidades_primarias_/, 'ficha_vialidades'], [/^ficha_avenida_/, 'ficha_avenida'], [/^ficha_calle_/, 'ficha_calle']];
// uso: el ámbito de cuando se pidió el archivo (si se cambió de alcaldía mientras se preparaba, se anota el que se descargó)
function usoDescarga(nombre, uso){ if (!USO_URL || /_diccionario\.csv$/.test(nombre)) return;   // el diccionario del CSV acompaña al archivo: no es otra descarga
  const ext = (nombre.match(/\.([a-z0-9]+)$/i) || [])[1];
  const tipo = ext==='kml'? 'kml' : ext==='geojson'? 'geojson' : ext==='csv'? 'csv' : (TIPO_ARCHIVO.find(([r])=>r.test(nombre)) || [0, 'otro'])[1];
  avisaUso({ evento:'descarga', tipo, archivo:nombre, ...(uso || ambitoUso()) }); }
async function deliver(filename, text, uso){ filename = conFecha(filename); usoDescarga(filename, uso);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const blob = new Blob(['\uFEFF'+text], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  st.textContent = `Descargado: ${filename}`;
}
async function deliverBlob(filename, blob, uso){ if (!/_\d{8}\.[a-z0-9]+$/i.test(filename)) filename = conFecha(filename); usoDescarga(filename, uso);
  const st = $('dl-status'); st.textContent='Preparando archivo…';
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); st.textContent=`Descargado: ${filename}`;
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
// los filtros de banqueta y de espacio van en el nombre: dos archivos de la misma consulta con distinto filtro no se confunden
const espSlug = ()=> filtroEsp? '_con_' + ESP_TIPOS.filter((_, t)=> filtroEsp & (1<<t)).map(e=>e.s).join('_') : '';
const filtroSlug = ()=> (filtroBanq==='con'? '_con_banqueta' : filtroBanq==='sin'? '_sin_banqueta' : '') + espSlug();
// las descargas de vialidades primarias no se filtran por colonia ni por banqueta: su nombre y su ámbito tampoco lo declaran; sí el espacio
const scopeSlugVP = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '') + espSlug();
const scopeSlug = ()=> (sel===null? 'ciudad' : slug(META.munNames[sel])) + (selCol!==null? '_'+slug(colNombre(selCol)) : '') + (selAv!==null? '_'+slug(VPC.nomenclat[selAv]) : '') + filtroSlug();
// ---------- diccionario de datos ----------
const NOTAS_COMUNES = [
  'Prioritario = prioridades Muy Alta, Alta y Media de la escala de cinco niveles (Muy Alta, Alta, Media, Baja, Muy Baja).',
  'Una calle no es una sola línea: se divide en tramos. En la red de las alcaldías cada tramo es el frente de una manzana y los dos lados de la calle son tramos distintos; en las vialidades primarias cada tramo va de cruce a cruce y se corta al cambiar de alcaldía.',
  'Los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y no aparecen en los listados, cifras ni fichas PDF de las alcaldías.',
  'Coordenadas en grados decimales, WGS84 (EPSG:4326), del punto a media longitud del frente o del tramo, medido sobre su línea (no el promedio de sus extremos).',
  'Cobertura: la herramienta incluye los frentes de manzana del ámbito urbano de INEGI. Algunos frentes no tienen colonia asignada en el catálogo: se cuentan en las cifras de su alcaldía y en su Excel «Frente por frente», pero no en las consultas por colonia.',
  'El contexto social se reporta con el Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX. El modelo de priorización vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020; la actualización del modelo con el IDS está en proceso.',
  `La meta de vialidades primarias se mide sobre los ${fmt.format(Math.round(VPC.cov.km_total))} km de la red completa, incluidos los tramos sin manzanas al frente.`,
  'Dos unidades: las vialidades primarias del Gobierno Central se reportan en kilómetros de vialidad, medidos sobre el eje de la avenida; la red de las alcaldías, en kilómetros de frente de manzana, una medida por cada acera. Para comparar o sumar lo que atiende cada quien se usa siempre el kilómetro de frente.',
  'Los kilómetros prioritarios describen dónde es mayor la necesidad de arbolado según el modelo; no son una meta ni una obligación de plantación.',
  'De lo prioritario se reportan los kilómetros de frente sin arbolado y los que además tienen banqueta. «Sin arbolado» es la clase del modelo; «con banqueta» es el registro de INEGI 2020 y no garantiza espacio de plantación.',
  'El Índice de Desarrollo Social y la población en pobreza corresponden a la unidad territorial de EVALÚA CDMX en la que se ubica la colonia, no a la colonia; no deben sumarse entre colonias.'
];
const FUENTES = 'Fuentes: INEGI, Características del Entorno Urbano 2020 (frentes de manzana); SEDEMA, modelo de priorización de frentes de manzana, Sistema de Información Ambiental (noviembre de 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (agosto de 2026); EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial; CONAPO, índice de marginación urbana 2020 (criterio de rezago social del modelo vigente); catálogo de colonias SEDEMA-SIA.' + (INV? ` Espacios para plantar (cepas vacantes, tocones y árboles muertos): ${INV.fuente}, en curso; corte: ${INV.corte}.` : '');
const DIC = {
  frentes: { titulo:'Frente por frente', contenido:'Un renglón por frente de manzana con prioridad Muy Alta, Alta o Media a cargo de la alcaldía.',
    cols:[10,11,30,16,13,28,28,7,16,18,26,14,18,20,11,20,11,11],
    campos:[
      ['id_frente','Identificador del frente de manzana en esta versión de los datos (ver «Corte de los datos»). Permite cruzar el renglón con la capa geográfica y detectar duplicados; no cambia mientras no cambie el corte.','Entero'],
      ['prioridad','Prioridad del frente de manzana.','Muy Alta, Alta o Media'],
      ['vialidad','Nombre de la calle a la que da el frente. Cuando INEGI no registra un nombre de calle («Ninguno», «Sin Referencia», «Manzana o Edificación Contigua»), dice «Frente sin nombre de calle (INEGI)».','Texto'],
      ['tipo_vialidad','Tipo de vialidad registrado por INEGI.','Calle, Avenida, Cerrada, Calzada, Eje Vial…'],
      ['quien_atiende','Quién atiende el frente: la alcaldía o el Gobierno Central.','Alcaldía'],
      ['colonia','Colonia en la que cae el punto medio del frente, con acentos y sin abreviaturas.','Texto'],
      ['colonia_catalogo','Nombre de la colonia tal como viene en el catálogo de origen (sin acentos, con abreviaturas). Sirve para cruzar con otras capas.','Texto'],
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
  calle: { titulo:'Frente por frente de la calle', contenido:'Un renglón por frente de manzana de la calle consultada, en todas las prioridades, a cargo de la alcaldía. La calle es la de la colonia indicada en el ámbito; las calles con el mismo nombre en otras colonias no se incluyen.',
    cols:[10,11,30,16,13,28,28,7,16,18,26,14,18,20,11,20,8,44,11,11], campos:null },
  calles: { titulo:'Lista de calles', contenido:'Un renglón por calle dentro de su colonia, con la suma de sus frentes de manzana: las mismas calles y en el mismo orden que la lista «Dónde empezar» con «Mostrar» en calles (ver «Orden»). Dos calles con el mismo nombre en colonias distintas son renglones distintos. Los frentes sin nombre de vialidad en INEGI no se incluyen; están en el Excel «Frente por frente».',
    cols:[30,30,30,8,22,20,13,15,12,13,11,15,11,24,11],
    campos:[
      ['vialidad','Nombre de la calle.','Texto'],
      ['colonia','Colonia en la que está este tramo de la calle, con acentos y sin abreviaturas.','Texto'],
      ['colonia_catalogo','Nombre de la colonia tal como viene en el catálogo de origen. Sirve para cruzar con otras capas.','Texto'],
      ['cp','Código postal de la colonia.','Texto de 5 dígitos'],
      ['tipos_vialidad','Tipos de vialidad que aparecen en sus tramos.','Texto separado por punto y coma'],
      ['alcaldia','Demarcación territorial.','Texto'],
      ['frentes_total','Número de frentes de manzana con ese nombre en el ámbito.','Entero'],
      ['frentes_muy_alta','Frentes con prioridad Muy Alta.','Entero'],
      ['frentes_alta','Frentes con prioridad Alta.','Entero'],
      ['frentes_media','Frentes con prioridad Media.','Entero'],
      ['km_muy_alta','Kilómetros de frente con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros de frente con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros de frente con prioridad Media.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta, Alta y Media.','Kilómetros'],
      ['km_total','Kilómetros de frente de la calle en el ámbito, en todas las prioridades.','Kilómetros'] ] },
  tramos: { titulo:'Tramo por tramo', contenido:'Un renglón por parte de tramo de vialidad primaria o de acceso controlado con prioridad Muy Alta, Alta o Media, a cargo del Gobierno Central. Un tramo (id_tramo) ocupa más de un renglón cuando cruza un límite de alcaldía o su trazo tiene varias partes; la herramienta cuenta los tramos por id_tramo, por eso el número de renglones puede ser mayor que el número de tramos que muestra la pantalla. Los kilómetros coinciden.',
    cols:[10,11,30,24,22,9,26,20,24,11,11,17,11,11],
    campos:[
      ['id_tramo','Identificador del tramo en la capa de vialidades primarias. Se repite cuando el tramo ocupa varios renglones.','Entero'],
      ['prioridad','Prioridad del tramo en la capa de vialidades primarias.','Muy Alta, Alta o Media'],
      ['vialidad','Nombre en calle del tramo.','Texto'],
      ['nombre_red_vial','Identificador del tramo dentro de la red vial primaria.','Eje, Radial, Ruta, Circuito, Anillo Periférico…'],
      ['tipo','Clasificación de la vialidad.','Vía primaria o Vía de acceso controlado'],
      ['carriles','Número de carriles del tramo.','Entero'],
      ['circulacion','Sentido de circulación.','Un sentido, Dos sentidos, Un sentido con carril de contraflujo'],
      ['alcaldia','Alcaldía en la que cae el punto medio del tramo.','Texto'],
      ['alcaldia_capa','Alcaldía tal como viene en la capa fuente; puede indicar dos cuando el tramo es limítrofe.','Texto'],
      ['clave','Clave registrada en la capa de vialidades primarias. No identifica al tramo: varios tramos comparten la misma clave.','Texto, por ejemplo BJU-024'],
      ['longitud_m','Longitud de la parte del tramo de este renglón.','Metros'],
      ['quien_atiende','Quién atiende el tramo: la alcaldía o el Gobierno Central.','Gobierno Central'],
      ['lat','Latitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'],
      ['lon','Longitud del punto a media longitud del tramo, sobre su línea.','Grados decimales'] ] },
  avenidas: { titulo:'Lista de avenidas', contenido:'Un renglón por avenida o eje, con la suma de sus tramos de vialidad primaria en el ámbito consultado: las mismas avenidas y en el mismo orden que la lista «Dónde empezar» con «Mostrar» en avenidas (ver «Orden»).',
    cols:[30,30,24,34,13,18,13,11,11,11,13,15,11],
    campos:[
      ['vialidad','Nombre en calle de la avenida o eje.','Texto'],
      ['nombres_red_vial','Identificadores de la red vial asociados a esa avenida.','Texto separado por punto y coma'],
      ['tipos','Clasificación de sus tramos.','Vía primaria y/o Vía de acceso controlado'],
      ['alcaldias','Alcaldías que cruza dentro del ámbito consultado.','Texto separado por punto y coma'],
      ['tramos_total','Número de tramos de la avenida en el ámbito.','Entero'],
      ['tramos_prioritarios','Tramos con prioridad Muy Alta, Alta o Media.','Entero'],
      ['km_muy_alta','Kilómetros con prioridad Muy Alta.','Kilómetros'],
      ['km_alta','Kilómetros con prioridad Alta.','Kilómetros'],
      ['km_media','Kilómetros con prioridad Media.','Kilómetros'],
      ['km_baja','Kilómetros con prioridad Baja.','Kilómetros'],
      ['km_muy_baja','Kilómetros con prioridad Muy Baja.','Kilómetros'],
      ['km_prioritario','Suma de Muy Alta, Alta y Media.','Kilómetros'],
      ['km_total','Kilómetros de la avenida en el ámbito.','Kilómetros'] ] }
};
DIC.alcaldias = { titulo:'Las 16 alcaldías', contenido:'Un renglón por alcaldía con sus cifras y las del Gobierno Central dentro de ella, con los filtros de la consulta. Las columnas de la alcaldía son de los frentes de manzana a su cargo; las del Gobierno Central, de las vialidades primarias que pasan por ella. Para comparar o sumar lo que atiende cada quien se usa siempre el kilómetro de frente (km_frente_prioritario_total), como en la tabla de comparación del Resumen.',
  cols:[22,16,12,10,11,16,16,16,22,18,20,18,20,18],
  campos:[
    ['alcaldia','Demarcación territorial.','Texto'],
    ['frentes_prioritarios_alcaldia','Frentes de manzana con prioridad Muy Alta, Alta o Media a cargo de la alcaldía.','Entero'],
    ['km_muy_alta','Kilómetros de frente con prioridad Muy Alta a cargo de la alcaldía.','Kilómetros'],
    ['km_alta','Kilómetros de frente con prioridad Alta a cargo de la alcaldía.','Kilómetros'],
    ['km_media','Kilómetros de frente con prioridad Media a cargo de la alcaldía.','Kilómetros'],
    ['km_frente_prioritario_alcaldia','Suma de Muy Alta, Alta y Media a cargo de la alcaldía.','Kilómetros de frente'],
    ['km_frente_total_alcaldia','Kilómetros de frente a cargo de la alcaldía, en todas las prioridades.','Kilómetros de frente'],
    ['km_prioritario_sin_arbolado','De lo prioritario de la alcaldía, km de frente sin arbolado (ver «Notas»).','Kilómetros de frente'],
    ['km_prioritario_sin_arbolado_con_banqueta','De lo anterior, km con banqueta registrada por INEGI 2020. No garantiza espacio de plantación.','Kilómetros de frente'],
    ['tramos_prioritarios_gobierno_central','Tramos de vialidad primaria con prioridad Muy Alta, Alta o Media dentro de la alcaldía (por id_tramo).','Entero'],
    ['km_vialidad_prioritaria_gobierno_central','Kilómetros de vialidad primaria prioritaria dentro de la alcaldía, medidos sobre el eje.','Kilómetros de vialidad'],
    ['km_vialidad_total_gobierno_central','Kilómetros de vialidad primaria dentro de la alcaldía, en todas las prioridades, medidos sobre el eje.','Kilómetros de vialidad'],
    ['km_frente_prioritario_gobierno_central','Km de frente de manzana a cargo del Gobierno Central sobre tramos prioritarios (sin filtro de banqueta; el espacio, por su tramo).','Kilómetros de frente'],
    ['km_frente_prioritario_total','Suma de km_frente_prioritario_alcaldia y km_frente_prioritario_gobierno_central.','Kilómetros de frente'] ] };
DIC.calle.campos = DIC.frentes.campos.map(f=> f[0]==='prioridad'? ['prioridad','Prioridad del frente de manzana.','Muy Baja a Muy Alta'] : f);
DIC.calle.campos.splice(DIC.calle.campos.findIndex(f=>f[0]==='lat'), 0,
  ['tramo','Número del tramo de la calle al que pertenece el frente. Un tramo va de esquina a esquina y reúne los frentes de sus dos lados; se numera a lo largo de la calle. Se arma con una regla geométrica (frentes casi paralelos, en lados opuestos y traslapados) y debe confirmarse en campo.','Entero'],
  ['tramo_entre','Vialidades más cercanas a los extremos del tramo.','Texto']);
function calleAmbito(c){ const cols=[...new Set(c.idx.map(i=>F.col[i]).filter(Boolean))].map(k=>META.colonias[k].n); const muns=[...new Set(c.idx.map(i=>F.mun[i]))].map(m=>META.munNames[m]);
  return `Calle ${c.nombre} · ${cols.length>4? cols.length+' colonias' : cols.join(', ')} · ${muns.join(', ')}`; }
function ambitoTxt(key){
  const vp = key==='tramos' || key==='avenidas';
  if (selAv!==null && (vp || isGC())) return VPC.nomenclat[selAv] + (sel!==null? ' · '+META.munNames[sel] : ' · toda la ciudad') + (filtroEsp? ' · ' + espTxtVP() : '');
  const b = vp? (filtroEsp? ' · ' + espTxtVP() : '') : hayFiltro()? ' · ' + filtroTxt() : '';
  if (selCol!==null && !vp) return colNombre(selCol) + ' · ' + META.munNames[sel] + b;
  return (sel===null? 'Ciudad de México' : META.munNames[sel]) + b;
}
// Foto de la consulta al pedir el archivo (B3-01): el ámbito, el filtro y el registro de usos se toman antes de esperar al inventario o a la
// librería, para que un cambio de alcaldía durante la espera no cambie lo que dice el archivo
function fotoDic(key){ const vp = key==='tramos' || key==='avenidas', c = calleSel();
  const ambito = (key==='calle' && c)? calleAmbito(c) : key==='alcaldias'? 'Ciudad de México, por alcaldía' + (hayFiltro()? ' · ' + filtroTxt() : '') : ambitoTxt(key);
  return { ambito, esp: filtroEsp? [['Filtro «Espacio»', vp? espNotaVP() : key==='alcaldias'? espNota() + ' En las vialidades primarias: ' + espNotaVP() : espNota()]] : [],
    titulo: DIC[key].titulo + ' · ' + ambito, uso: ambitoUso() }; }
// mas: {campos, cols} de las columnas que se agregan al final (las de espacios para plantar, si llegaron)
function dictAoa(key, nreg, archivo, extra, mas, foto){
  const d = DIC[key], f = foto || fotoDic(key);
  const a = [['Modelo de priorización de reforestación urbana — Diccionario de datos'], [],
    ['Archivo', archivo], ['Contenido', d.contenido], ['Ámbito consultado', f.ambito], ...f.esp,
    ['Elaboración', 'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA)'],
    ['Registros', nreg], ...(extra||[]), ['Fecha de generación', hoyCDMX()], ['Versión de la herramienta', VERSION.v], ['Última actualización de la herramienta', VERSION.fecha], ['Corte de los datos', VERSION.corte], [],
    ['Campo', 'Descripción', 'Valores o unidad']];
  for (const f of d.campos.concat(mas? mas.campos : [])) a.push(f);
  a.push([], ['Notas']);
  for (const n of NOTAS_COMUNES) a.push([n]);
  a.push([], [FUENTES]);
  return a;
}
// ---------- exportación a Excel (datos + diccionario) ----------
// librerías bajo demanda: de docs/libs en el sitio (window.SIA_LIBS) o, en la versión de un solo archivo, de la copia
// incrustada en la propia página (<script id="lib-ARCHIVO-b64">). Ninguna versión pide librerías a terceros.
function libIncrustada(file){ const el = document.getElementById('lib-' + file + '-b64'); if (!el) return null;
  const bin = atob(el.textContent.trim()), u8 = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u8], {type:'text/javascript'})); }
const LIB_EN_CURSO = {};   // una sola descarga por librería aunque se pida varias veces
// huella de versión de cada librería (la escribe construir.py en config.js): tras una actualización nunca se usa una copia anterior
const libV = file => (window.SIA_LIBS_V && window.SIA_LIBS_V[file]) ? '?v=' + window.SIA_LIBS_V[file] : '';
function loadLib(file, glob){
  if (window[glob]) return Promise.resolve(window[glob]);
  if (LIB_EN_CURSO[file]) return LIB_EN_CURSO[file];
  return LIB_EN_CURSO[file] = new Promise((res, rej)=>{
    const s = document.createElement('script');
    const src = window.SIA_LIBS ? window.SIA_LIBS + file + libV(file) : libIncrustada(file);
    if (!src) return rej(new Error('la librería ' + file + ' no viene en esta copia'));
    s.src = src;
    // si no llega, se averigua por qué: una sesión vencida no es una falla de conexión
    const fallo = ()=>{ delete LIB_EN_CURSO[file]; s.remove(); causaFalla(src).then(c => rej(Object.assign(new Error('no se pudo cargar la librería ' + file), {causa:c}))); };
    s.onload = ()=> window[glob] ? res(window[glob]) : fallo();
    s.onerror = fallo;
    document.head.appendChild(s);
  });
}
let XL = null;
function loadXL(){
  if (XL) return Promise.resolve(XL);
  return loadLib('xlsx.js', 'XLSX').then(x => (XL = x));
}
const wch = ws => ws.map(w=>({wch:w}));
// Excel en un proceso auxiliar: la página sigue respondiendo mientras se arma el archivo
// Propiedades del libro: título, autoría e idioma
const propsExcel = (base, titulo) => ({ Title: titulo || base.replace(/_/g,' '), Subject:'Priorización de calles para reforestación urbana', Author:'Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental', Company:'Secretaría del Medio Ambiente de la Ciudad de México', Language:'es-MX', Comments:'Modelo de priorización de reforestación urbana, versión ' + VERSION.v, CreatedDate: new Date() });
function excelAparte(aoa, cols, dic, props){ return new Promise((res, rej)=>{ let w; try { w = new Worker(window.SIA_LIBS + 'excel_worker.js' + libV('excel_worker.js') + (libV('xlsx.js')? '&x=' + window.SIA_LIBS_V['xlsx.js'] : '')); } catch(e){ return rej(e); }
  w.onmessage = e=>{ w.terminate(); e.data && e.data.ok? res(e.data.buf) : rej(new Error(e.data && e.data.msg || 'proceso auxiliar')); };
  w.onerror = e=>{ w.terminate(); rej(new Error('proceso auxiliar')); }; w.postMessage({aoa, cols, dic, props}); }); }
const GRANDE = 20000;   // renglones a partir de los cuales se avisa del tamaño y de la espera
const avisaPreparando = nreg => { $('dl-status').textContent = nreg>GRANDE? `Preparando un archivo grande: ${fmt.format(nreg)} renglones, alrededor de ${fmt0.format(Math.max(1, nreg*0.19/1000))} MB. Puede tardar hasta un minuto…` : 'Preparando archivo…'; };
async function deliverTable(base, key, aoa, extra, mas, foto){
  const nreg = aoa.length - 1, cols = DIC[key].cols.concat(mas? mas.cols : []); foto = foto || fotoDic(key);
  const st = $('dl-status'); avisaPreparando(nreg);
  if (window.SIA_LIBS && window.Worker){
    try { const buf = await excelAparte(aoa, cols, dictAoa(key, nreg, base + '.xlsx', extra, mas, foto), propsExcel(base, foto.titulo));
      await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), foto.uso); return; }
    catch(e){ console.warn('Excel en proceso auxiliar no disponible; se genera en la página', e); }
  }
  let X; try { X = await loadXL(); }
  catch(e){ if (e && e.causa==='sesion'){ avisoSesion(st); return; }   // sesión vencida: no se entrega nada y se dice por qué
    // no se pudo cargar la librería de Excel: se entrega CSV, con el diccionario en un segundo archivo
    st.textContent = (e && e.causa==='red')? 'Sin conexión para generar el Excel; se descarga en CSV.' : 'No se pudo cargar el programa que arma el Excel; se descarga en CSV.';
    const csv = aoa.map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '.csv', csv, foto.uso);
    const dic = dictAoa(key, nreg, base + '.csv', [...(extra||[]), ['Nota sobre el formato CSV', 'El código postal es un texto de 5 dígitos: al abrir el archivo en una hoja de cálculo, importar esa columna como texto para no perder los ceros iniciales.']], mas, foto).map(r=>r.map(csvEsc).join(',')).join('\r\n');
    await deliver(base + '_diccionario.csv', dic, foto.uso);
    st.textContent = 'Descargado en CSV (dos archivos: listado y diccionario), porque no se pudo cargar el generador de Excel.';
    return;
  }
  const wb = X.utils.book_new(); wb.Props = propsExcel(base, foto.titulo);
  const ws = X.utils.aoa_to_sheet(aoa);
  ws['!cols'] = wch(cols);
  ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,aoa.length-1), c:aoa[0].length-1} }) };
  ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
  X.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = X.utils.aoa_to_sheet(dictAoa(key, nreg, base + '.xlsx', extra, mas, foto));
  wd['!cols'] = wch([26, 78, 46]);
  X.utils.book_append_sheet(wb, wd, 'Diccionario');
  const buf = X.write(wb, { bookType:'xlsx', type:'array', compression:true });
  await deliverBlob(base + '.xlsx', new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), foto.uso);
}
const num = v => { const n = Number(v); return Number.isFinite(n)? n : v; };
// equivalente en km de frente del ámbito de vialidades primarias, para el diccionario de los Excel del Gobierno Central
function gcExtra(){ const g = gcFrente(sel, selAv);
  return [['Unidad de las longitudes', 'Metros o kilómetros de vialidad, medidos sobre el eje'],
    ['Equivalente del ámbito en km de frente de manzana (aceras con manzana enfrente)', num(sum(g.km).toFixed(2))],
    ['Equivalente en km de frente de manzana de los tramos prioritarios (Muy Alta, Alta y Media)', num(kmPrio(g).toFixed(2))]]; }
// cifras de lo prioritario del ámbito consultado, para el diccionario de los Excel de la red de las alcaldías
function prioExtra(){ const R = repStat(sel, selCol); const k = v => num(v.toFixed(2));
  return [['Prioritario del ámbito (Muy Alta, Alta y Media), km de frente a cargo de la alcaldía', k(sumPrio(R.km[0]))],
    ['De lo prioritario, km de frente sin arbolado', k(sumPrio(R.sa[0]))],
    ['De lo prioritario, km de frente sin arbolado y con banqueta (INEGI)', k(sumPrio(R.sb[0]))],
    ['Km de frente a cargo del Gobierno Central sobre tramos prioritarios (sin filtro de banqueta; el espacio, por su tramo)', k(sumPrio(R.km[1]))]]; }
// ---------- espacios para plantar en las descargas ----------
// Tres columnas al final de cada Excel (y tres propiedades en el GeoJSON y el KML): cepas vacantes, tocones y árboles muertos del
// inventario de arbolado. Por frente de manzana, los puntos asignados a ese frente (ESP_FRN); por parte de vialidad primaria, los de sus
// frentes del Gobierno Central y los del camellón (ESP_VPN); en los resúmenes por calle y por avenida, la suma de sus frentes o partes del
// ámbito, de cualquier prioridad. Si el inventario no se ha bajado, se baja antes de armar el archivo (espCargar); si no llega, o tarda más
// de ESP_ESPERA (una conexión que se queda a medias, B5-03), el archivo sale sin esas columnas, el diccionario lo dice y la pantalla lo
// avisa: la descarga nunca se cae por el inventario. Las listas de calles, avenidas y alcaldías llevan antes cepas_vacantes_prioritario,
// las de sus frentes o tramos prioritarios, que es lo que ordena «Mostrar» por cepas (C1-01).
const ESP_COLS = ['cepas_vacantes', 'tocones', 'arboles_muertos'], ESP_ANCHOS = [15, 9, 16], ESP_ESPERA = 15000;
const ESP_FILA = 'Espacios para plantar (inventario de arbolado)';
async function espDescarga(){ if (!INV) return {ok:false, unico:true};
  let t; const tarde = new Promise(res=> { t = setTimeout(()=> res('tarde'), ESP_ESPERA); });
  try { return (await Promise.race([espCargar(), tarde]))==='tarde'? {ok:false, tarde:true} : {ok:true}; }
  catch(e){ console.warn('descarga sin espacios para plantar', e); return {ok:false}; }
  finally { clearTimeout(t); } }
const espDeFrente = i => [ESP_FRN[3*i], ESP_FRN[3*i+1], ESP_FRN[3*i+2]];
const espDeParte = i => [ESP_VPN[3*i], ESP_VPN[3*i+1], ESP_VPN[3*i+2]];
const espSuma = (idx, de) => idx.reduce((a, i)=>{ const c = de(i); return [a[0]+c[0], a[1]+c[1], a[2]+c[2]]; }, [0,0,0]);
// cepas vacantes de lo prioritario de una lista de frentes (fr) o de partes de vialidad primaria (vp)
const cepasPrio = (idx, red) => red==='vp'? idx.reduce((t, i)=> t + (esPrio(VP.prio[i])? ESP_VPN[3*i] : 0), 0) : idx.reduce((t, i)=> t + (esPrio(F.prio[i])? ESP_FRN[3*i] : 0), 0);
// campos del diccionario; que: 'frente', 'tramo', 'calle', 'avenida' o 'alcaldia'
function espCampos(que){ const d = INV.dist, dv = INV.vp.dist;
  const donde = que==='frente'? `en este frente de manzana (puntos a ${d} m o menos del frente)`
    : que==='tramo'? `que cuentan para esta parte del tramo: los de sus frentes de manzana a cargo del Gobierno Central (a ${d} m o menos) y los del camellón (puntos sin frente de manzana a ${dv} m o menos del eje)`
    : que==='calle'? 'en todos los frentes de manzana de la calle en el ámbito, de cualquier prioridad (como frentes_total y km_total): suma de sus frentes'
    : que==='alcaldia'? 'en todos los frentes de manzana a cargo de la alcaldía, de cualquier prioridad (como km_frente_total_alcaldia): suma de sus frentes'
    : 'en todos los tramos de la avenida en el ámbito, de cualquier prioridad (como tramos_total y km_total): suma de sus partes, por sus frentes de manzana a cargo del Gobierno Central y en el camellón';
  const prio = que==='calle' || que==='alcaldia'? [['cepas_vacantes_prioritario', `Cepas vacantes del inventario de arbolado en sus frentes de manzana prioritarios (Muy Alta, Alta y Media)${que==='calle'? '. Es el número que ordena «Mostrar: Calles · más cepas vacantes»' : ''}.`, 'Entero']]
    : que==='avenida'? [['cepas_vacantes_prioritario', 'Cepas vacantes del inventario de arbolado en sus tramos prioritarios (Muy Alta, Alta y Media), por sus frentes de manzana a cargo del Gobierno Central y en el camellón. Es el número que ordena «Mostrar: Avenidas · más cepas vacantes».', 'Entero']] : [];
  return [...prio, ['cepas_vacantes', `Cepas vacantes del inventario de arbolado ${donde}. Ahí se puede plantar directo.`, 'Entero; 0 = ninguna registrada hasta el corte'],
    ['tocones', `Tocones del inventario de arbolado ${donde}. Hay que retirar el tocón antes de plantar.`, 'Entero'],
    ['arboles_muertos', `Árboles muertos del inventario de arbolado ${donde}. Requieren sustitución.`, 'Entero']]; }
// renglón del diccionario: fuente, corte y regla de asignación, o por qué no vienen las columnas
const espFilaDic = esp => [ESP_FILA, esp.ok
  ? `Columnas cepas_vacantes, tocones y arboles_muertos. Fuente: Inventario de arbolado de la Ciudad de México, CIGA-UNAM y SEDEMA; en curso. Corte: ${INV.corte}. Regla de asignación: cada punto cuenta para el frente de manzana a ${INV.dist} m o menos; en vialidades primarias, también los del camellón (puntos sin frente de manzana) a ${INV.vp.dist} m o menos del eje. Un 0 puede ser un lugar que aún no se ha inventariado.`
  : esp.unico? 'Esta copia (archivo único) no trae el inventario: sin columnas de espacios' : esp.tarde? `El inventario no llegó en ${ESP_ESPERA/1000} segundos: sin columnas de espacios` : 'No se pudo cargar el inventario: sin columnas de espacios'];
// aviso en pantalla cuando el archivo salió sin las columnas (solo si sí se entregó)
function espAvisoDescarga(esp){ const st = $('dl-status'); if (esp.ok || !/^Descargado/.test(st.textContent)) return;
  st.append(esp.unico? ' Va sin las columnas de espacios para plantar: esta copia no trae el inventario de arbolado.' : esp.tarde? ' Va sin las columnas de espacios para plantar: el inventario de arbolado tardó demasiado en llegar (revisa la conexión a internet).' : ' Va sin las columnas de espacios para plantar: no se pudo cargar el inventario de arbolado (revisa la conexión a internet).'); }
// entrega una tabla con las tres columnas al final: ids[k] es el frente, la parte o la calle del renglón k+1 y cuenta(ids[k]) sus tres
// conteos; prio(ids[k]), si se da, las cepas de lo prioritario (una columna antes de las tres). El aviso de «Preparando…» sale antes de
// esperar al inventario (la persona ve de inmediato el tamaño del archivo); la foto de la consulta, también antes (B3-01).
async function deliverConEsp(base, key, rows, extra, ids, cuenta, que, prio){
  const foto = fotoDic(key);
  avisaPreparando(rows.length - 1);
  const esp = await espDescarga();
  if (esp.ok){ rows[0].push(...(prio? ['cepas_vacantes_prioritario'] : []), ...ESP_COLS); ids.forEach((x, k)=> rows[k+1].push(...(prio? [prio(x)] : []), ...cuenta(x))); }
  await deliverTable(base, key, rows, [...(extra||[]), espFilaDic(esp)], esp.ok? {campos:espCampos(que), cols:[...(prio? [17] : []), ...ESP_ANCHOS]} : null, foto);
  espAvisoDescarga(esp); }
$('dl-frentes').onclick = ()=>{
  if (sel===null) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','quien_atiende','colonia','colonia_catalogo','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','lat','lon']];
  const idx=[]; for(let i=0;i<N;i++) if(esPrio(F.prio[i]) && !F.gc[i] && enAmbito(i)) idx.push(i);
  idx.sort((a,b)=> F.prio[b]-F.prio[a] || (META.names[F.name[a]]||'').localeCompare(META.names[F.name[b]]||'') );
  for(const i of idx){ const c=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', c.n, c.cat||c.n, c.cp? c.cp.padStart(5,'0'):'', c.p>=0? META.prio[c.p]:'', c.ids||'', c.ut||'', c.n? (c.pob||0) : '', c.n? (c.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const sn = idx.filter(sinNombreFr);
  deliverConEsp(`frente_por_frente_${scopeSlug()}`, 'frentes', rows, [['Quién atiende todos los renglones', 'Alcaldía (los frentes sobre vialidades primarias corresponden al Gobierno Central y no se incluyen)'], ['Frentes sin nombre de calle (INEGI) en este archivo', sn.length], ['Km de esos frentes sin nombre de calle', num((sn.reduce((t,i)=>t+F.len[i],0)/1000).toFixed(2))], ...prioExtra()],
    idx, espDeFrente, 'frente');
};
$('dl-calle').onclick = ()=>{
  const c = calleSel(); if (!c) return;
  const rows=[['id_frente','prioridad','vialidad','tipo_vialidad','quien_atiende','colonia','colonia_catalogo','cp','prioridad_colonia','desarrollo_social_ids','unidad_territorial','poblacion_colonia','poblacion_pobreza_nbi','alcaldia','longitud_m','banqueta_inegi','tramo','tramo_entre','lat','lon']];
  const tr = tramoDeFrente(); const nt = i => tr.has(i)? tr.get(i).n : 0;
  const idx=[...c.idx].sort((a,b)=> nt(a)-nt(b) || F.prio[b]-F.prio[a]);
  for(const i of idx){ const k=META.colonias[F.col[i]]; rows.push([i, META.prio[F.prio[i]], nomFrente(i), META.tipos[F.tipo[i]], 'Alcaldía', k.n, k.cat||k.n, k.cp? k.cp.padStart(5,'0'):'', k.p>=0? META.prio[k.p]:'', k.ids||'', k.ut||'', k.n? (k.pob||0) : '', k.n? (k.nbi||0) : '', META.munNames[F.mun[i]], F.len[i], META.disp[(F.flags[i]>>3)&7], nt(i)||'', tr.has(i)? tramoTxt(tr.get(i)) : '', num(midLat(i).toFixed(6)), num(midLon(i).toFixed(6))]); }
  const muns=[...new Set(c.idx.map(i=>F.mun[i]))];
  deliverConEsp(`frente_por_frente_calle_${slug(c.nombre)}_${muns.length===1? slug(META.munNames[muns[0]]) : 'ciudad'}${selCol!==null? '_'+slug(colNombre(selCol)) : ''}${filtroSlug()}`, 'calle', rows, [['Tramos de la calle', new Set([...tr.values()].map(t=>t.n)).size]],
    idx, espDeFrente, 'frente');
};
$('dl-calles').onclick = ()=>{
  if (sel===null) return;
  const cepas = ordenCepas('calles'), lista = ordenaLista(callesLista(cepas), cepas);
  const rows=[['vialidad','colonia','colonia_catalogo','cp','tipos_vialidad','alcaldia','frentes_total','frentes_muy_alta','frentes_alta','frentes_media','km_muy_alta','km_alta','km_media','km_prioritario','km_total']];
  for (const [, s] of lista){ const n=[0,0,0,0,0]; for(const i of s.idx) n[F.prio[i]]++;
    const c = s.col? META.colonias[s.col] : null;
    rows.push([META.names[s.nid], c? c.n : 'Colonia no identificada', c? (c.cat||c.n) : '', c && c.cp? c.cp.padStart(5,'0') : '', [...s.tipos].filter(Boolean).join('; '), META.munNames[F.mun[s.idx[0]]], s.idx.length, n[4], n[3], n[2], num(s.kp[4].toFixed(2)), num(s.kp[3].toFixed(2)), num(s.kp[2].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  deliverConEsp(`lista_de_calles_${scopeSlug()}`, 'calles', rows, [['Orden', ordenTxt(cepas, 'Calles', 'calles', 'frentes')], ['Km de frente prioritario sin nombre de calle (INEGI), no incluidos en esta lista', num(sinNombre.kmp.toFixed(2))], ['Frentes prioritarios sin nombre de calle, no incluidos', sinNombre.np], ...prioExtra()],
    lista.map(x=> x[1]), s=> espSuma(s.idx, espDeFrente), 'calle', s=> cepasPrio(s.idx, 'fr'));
};
// el renglón «Orden» del diccionario de las listas: el mismo de «Mostrar»
const ordenTxt = (cepas, Que, que, en) => cepas
  ? `Como «Mostrar: ${Que} · más cepas vacantes»: por cepas vacantes en sus ${en} prioritarios (cepas_vacantes_prioritario); con el mismo número, por km prioritarios y por km en total. Al final, las ${que} sin km prioritarios que tienen cepas.`
  : `Como «Mostrar: ${Que} · más km prioritarios»: por km prioritarios y, con el mismo número, por km en total.`;
$('dl-tramos').onclick = ()=>{
  const rows=[['id_tramo','prioridad','vialidad','nombre_red_vial','tipo','carriles','circulacion','alcaldia','alcaldia_capa','clave','longitud_m','quien_atiende','lat','lon']];
  const idx=[]; for(let i=0;i<NV;i++) if(esPrio(VP.prio[i]) && enAmbitoVP(i)) idx.push(i);
  idx.sort((a,b)=> VP.prio[b]-VP.prio[a] || VPC.nomenclat[VP.nom[a]].localeCompare(VPC.nomenclat[VP.nom[b]],'es'));
  for(const i of idx){ rows.push([VP.rec[i], META.prio[VP.prio[i]], VPC.nomenclat[VP.nom[i]], VPC.nombres[VP.nombre[i]], VPC.tipos[VP.tipo[i]], VP.car[i], VPC.circula[VP.circ[i]], META.munNames[VP.mun[i]], VPC.alctxt[VP.alct[i]], VPC.claves[VP.clave[i]], VP.len[i], 'Gobierno Central', num(vpMid(i)[0].toFixed(6)), num(vpMid(i)[1].toFixed(6))]); }
  const nTramos = new Set(idx.map(i=>VP.rec[i])).size;
  deliverConEsp(`tramo_por_tramo_vialidades_primarias_${scopeSlugVP()}`, 'tramos', rows, [['Tramos distintos (id_tramo)', nTramos], ...gcExtra()], idx, espDeParte, 'tramo');
};
// Lista de avenidas: las de «Mostrar» y en su orden (C1-01); con una avenida elegida, solo esa
$('dl-avenidas').onclick = ()=>{
  const cepas = selAv===null && ordenCepas('av'), lista = selAv!==null? [...avIdx].filter(([a])=> a===selAv) : ordenaLista(avenidasLista(cepas), cepas);
  const rows=[['vialidad','nombres_red_vial','tipos','alcaldias','tramos_total','tramos_prioritarios','km_muy_alta','km_alta','km_media','km_baja','km_muy_baja','km_prioritario','km_total']];
  for (const [a, s] of lista){ const km=[0,0,0,0,0]; for(const i of s.idx) km[VP.prio[i]]+=VP.len[i]/1000;
    rows.push([VPC.nomenclat[a], [...s.nombres].join('; '), [...s.tipos].join('; '), [...s.muns].map(m=>META.munNames[m]).join('; '), s.recs.size, s.recsp.size, num(km[4].toFixed(2)), num(km[3].toFixed(2)), num(km[2].toFixed(2)), num(km[1].toFixed(2)), num(km[0].toFixed(2)), num(s.kmp.toFixed(2)), num(s.km.toFixed(2))]); }
  deliverConEsp(`lista_de_avenidas_${scopeSlugVP()}`, 'avenidas', rows, [...(selAv===null? [['Orden', ordenTxt(cepas, 'Avenidas', 'avenidas', 'tramos')]] : []), ...gcExtra()],
    lista.map(x=> x[1]), s=> espSuma(s.idx, espDeParte), 'avenida', s=> cepasPrio(s.idx, 'vp'));
};
// Las 16 alcaldías (C1-03): una fila por alcaldía con las cifras de las dos redes y los filtros del momento, con las reglas de la tabla
// de comparación del Resumen (repStat): la banqueta solo a las calles de las alcaldías; el «Espacio» a las dos, al Gobierno Central por su
// tramo. Ordenadas por km de frente prioritario a cargo de la alcaldía, como «Alcaldías · más km prioritarios».
$('dl-alcaldias').onclick = ()=>{
  const A = META.munNames.map(()=>({idx:[], np:0, vkm:0, vkmp:0, rp:new Set()}));
  for (let i=0;i<N;i++){ if (F.gc[i] || !pasaFiltros(i)) continue; const a=A[F.mun[i]]; a.idx.push(i); if (esPrio(F.prio[i])) a.np++; }
  for (let i=0;i<NV;i++){ if (!pasaEspacioVP(i)) continue; const a=A[VP.mun[i]], k=VP.len[i]/1000; a.vkm+=k; if (esPrio(VP.prio[i])){ a.vkmp+=k; a.rp.add(VP.rec[i]); } }
  const k2 = v => num(v.toFixed(2));
  const filas = A.map((a, m)=>{ const R = repStat(m, null); return {a, m, R, kpA:sumPrio(R.km[0]), kpG:sumPrio(R.km[1])}; }).sort((x, y)=> y.kpA-x.kpA);
  const rows=[['alcaldia','frentes_prioritarios_alcaldia','km_muy_alta','km_alta','km_media','km_frente_prioritario_alcaldia','km_frente_total_alcaldia','km_prioritario_sin_arbolado','km_prioritario_sin_arbolado_con_banqueta','tramos_prioritarios_gobierno_central','km_vialidad_prioritaria_gobierno_central','km_vialidad_total_gobierno_central','km_frente_prioritario_gobierno_central','km_frente_prioritario_total']];
  for (const {a, m, R, kpA, kpG} of filas) rows.push([META.munNames[m], a.np, k2(R.km[0][4]), k2(R.km[0][3]), k2(R.km[0][2]), k2(kpA), k2(sum(R.km[0])), k2(sumPrio(R.sa[0])), k2(sumPrio(R.sb[0])), a.rp.size, k2(a.vkmp), k2(a.vkm), k2(kpG), k2(kpA + kpG)]);
  deliverConEsp(`las_16_alcaldias${filtroSlug()}`, 'alcaldias', rows, [['Orden', 'Por km de frente prioritario a cargo de la alcaldía, como «Mostrar: Alcaldías · más km prioritarios».'], ['Unidades', 'Km de frente de manzana (una medida por cada acera) para las alcaldías y para comparar o sumar; km de vialidad (sobre el eje) para el Gobierno Central, que es su cifra oficial.']],
    filas.map(f=> f.a), a=> espSuma(a.idx, espDeFrente), 'alcaldia', a=> cepasPrio(a.idx, 'fr'));
};

document.fonts && document.fonts.ready.then(()=> rerender());

// ---------- exportación geográfica: las calles prioritarias de la consulta como líneas ----------
// Mismos registros que «frentes prioritarios» y «tramos prioritarios» en Excel: frentes de alcaldía Muy Alta, Alta y Media del ámbito
// (requiere alcaldía o colonia) y, con Gobierno Central activo, tramos prioritarios de vialidad primaria.
// KML para Google Earth; GeoJSON (RFC 7946, WGS 84) para un sistema de información geográfica. Solo se descarga: nada se captura.
function geoSel(){ const fr=[], vp=[];
  if (respOn.alc && sel!==null) for(let i=0;i<N;i++) if(esPrio(F.prio[i]) && !F.gc[i] && enAmbito(i)) fr.push(i);
  // con una colonia elegida no van las vialidades primarias: no se filtran por colonia y llegarían las de toda la alcaldía
  if (respOn.gc && selCol===null) for(let i=0;i<NV;i++) if(esPrio(VP.prio[i]) && enAmbitoVP(i)) vp.push(i);
  return {fr, vp}; }
const geoCoord = (A, k) => [+A[2*k].toFixed(6), +A[2*k+1].toFixed(6)];
// conEsp: con las propiedades de espacios para plantar al final (cepas_vacantes, tocones, arboles_muertos), como las columnas del Excel
const espProps = c => ({ cepas_vacantes:c[0], tocones:c[1], arboles_muertos:c[2] });
const geoFr = (i, conEsp) => ({ id_frente:i, prioridad:META.prio[F.prio[i]], vialidad:nomFrente(i), tipo_vialidad:META.tipos[F.tipo[i]]||'', quien_atiende:'Alcaldía', colonia:(META.colonias[F.col[i]]||{}).n||'', alcaldia:META.munNames[F.mun[i]], longitud_m:F.len[i], ...(conEsp? espProps(espDeFrente(i)) : {}) });
const geoVp = (i, conEsp) => ({ id_tramo:VP.rec[i], prioridad:META.prio[VP.prio[i]], vialidad:VPC.nomenclat[VP.nom[i]], nombre_red_vial:VPC.nombres[VP.nombre[i]]||'', quien_atiende:'Gobierno Central', alcaldia:META.munNames[VP.mun[i]], longitud_m:VP.len[i], ...(conEsp? espProps(espDeParte(i)) : {}) });
// con las dos redes, cada filtro se declara para la red a la que aplica (la banqueta, solo a los frentes de las alcaldías)
const geoConFr = () => respOn.alc && sel!==null, geoConVp = () => respOn.gc && selCol===null;
// al final, la frase de los espacios para plantar: fuente, corte y regla, o por qué no vienen las propiedades
const geoEspTxt = esp => !esp? '' : esp.ok
  ? ` Propiedades cepas_vacantes, tocones y arboles_muertos: Inventario de arbolado de la Ciudad de México, CIGA-UNAM y SEDEMA; en curso, corte: ${INV.corte}. Cada punto cuenta para el frente de manzana a ${INV.dist} m o menos; en vialidades primarias, también los del camellón (puntos sin frente de manzana) a ${INV.vp.dist} m o menos del eje.`
  : esp.unico? ' Esta copia (archivo único) no trae el inventario: sin propiedades de espacios (cepas_vacantes, tocones, arboles_muertos).'
  : esp.tarde? ` El inventario no llegó en ${ESP_ESPERA/1000} segundos: sin propiedades de espacios (cepas_vacantes, tocones, arboles_muertos).` : ' No se pudo cargar el inventario: sin propiedades de espacios (cepas_vacantes, tocones, arboles_muertos).';
const ambitoGeoBase = () => selCol!==null? `Colonia ${colNombre(selCol)}, ${META.munNames[sel]}` : selAv!==null? VPC.nomenclat[selAv] + (sel!==null? ', '+META.munNames[sel] : '') : sel!==null? META.munNames[sel] : 'Ciudad de México';
const ambitoGeo = () => ambitoGeoBase() + (hayFiltro() && geoConFr()? ' · ' + filtroTxt() : '') + (filtroEsp && geoConVp()? ' · ' + espTxtVP() : '');
// foto de la consulta al pedir el mapa (B3-01): nombre, ámbito y notas se toman antes de esperar a la sesión y al inventario
function geoFoto(){ return { amb: ambitoGeo(), uso: ambitoUso(),
  notas: `${filtroEsp && geoConFr()? ' ' + espNota() : ''}${filtroEsp && geoConVp()? ' ' + espNotaVP() : ''} ${FUENTES}${respOn.gc && selCol!==null? ' Con una colonia elegida no se incluyen las vialidades primarias, que no se dividen por colonia: se descargan desde la alcaldía.' : ''}` }; }
const geoNota = (esp, f) => `Modelo de priorización de reforestación urbana · ${f.amb} · prioridades Muy Alta, Alta y Media.${f.notas} ${VERSION_TXT}.${geoEspTxt(esp)}`;
const xmlEsc = v => String(v??'').replace(/[<>&"']/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
// El KML y el GeoJSON de una alcaldía grande pesan decenas de MB: se arman en partes, cediendo el paso entre bloques para que la página
// no se detenga (B3-03), y el archivo se entrega como una lista de partes, sin juntarlas en un solo texto.
const GEO_BLOQUE = 1500;
async function geoPartes(items, una){ const out = []; for (let k=0; k<items.length; k++){ out.push(una(items[k])); if ((k+1)%GEO_BLOQUE===0) await new Promise(r=> setTimeout(r, 0)); } return out; }
async function geoJSON(g, esp, f){ const e = !!(esp && esp.ok);
  const linea = (A, a, b) => { const c = []; for(let k=a;k<b;k++) c.push(geoCoord(A,k)); return c; };
  const fr = await geoPartes(g.fr, i=> JSON.stringify({type:'Feature', properties:geoFr(i, e), geometry:{type:'LineString', coordinates:linea(POS, start[i], start[i+1])}}));
  const vp = await geoPartes(g.vp, i=> JSON.stringify({type:'Feature', properties:geoVp(i, e), geometry:{type:'LineString', coordinates:linea(VPOS, vstart[i], vstart[i+1])}}));
  const todas = fr.concat(vp).map((x, k)=> k? ',\n' + x : x);
  return [`{"type":"FeatureCollection","name":${JSON.stringify('Modelo de priorización de reforestación urbana · '+f.amb)},"descripcion":${JSON.stringify(geoNota(esp, f))},"features":[\n`, ...todas, '\n]}\n']; }
async function geoKML(g, esp, f){ const e = !!(esp && esp.ok); const kc = p => { const c = T.prio[p]; const h = v => v.toString(16).padStart(2,'0'); return 'ff' + h(c[2]) + h(c[1]) + h(c[0]); };   // KML: aabbggrr
  const marca = (pr, p, A, a, b, ancho) => { let cs = ''; for(let k=a;k<b;k++){ const q = geoCoord(A,k); cs += q[0]+','+q[1]+',0 '; }
    return `<Placemark><name>${xmlEsc(pr.vialidad)}</name><styleUrl>#p${p}${ancho}</styleUrl><ExtendedData>${Object.entries(pr).map(([k,v])=>`<Data name="${k}"><value>${xmlEsc(v)}</value></Data>`).join('')}</ExtendedData><LineString><tessellate>1</tessellate><coordinates>${cs.trim()}</coordinates></LineString></Placemark>\n`; };
  const estilos = META.prio.map((_,p)=>p).filter(esPrio).map(p=> `<Style id="p${p}f"><LineStyle><color>${kc(p)}</color><width>3</width></LineStyle></Style><Style id="p${p}v"><LineStyle><color>${kc(p)}</color><width>5</width></LineStyle></Style>`).join('');
  const carpeta = (nombre, marcas) => marcas.length? [`<Folder><name>${xmlEsc(nombre)}</name>\n`, ...marcas, '</Folder>\n'] : [];
  const fr = await geoPartes(g.fr, i=> marca(geoFr(i, e), F.prio[i], POS, start[i], start[i+1], 'f'));
  const vp = await geoPartes(g.vp, i=> marca(geoVp(i, e), VP.prio[i], VPOS, vstart[i], vstart[i+1], 'v'));
  return [`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc('Modelo de priorización de reforestación urbana · '+f.amb)}</name><description>${xmlEsc(geoNota(esp, f))}</description>${estilos}\n`,
    ...carpeta('Frentes de manzana a cargo de la alcaldía (Muy Alta, Alta y Media)', fr),
    ...carpeta('Vialidades primarias a cargo del Gobierno Central (Muy Alta, Alta y Media)', vp),
    '</Document></kml>\n']; }
function geoDescarga(tipo){ const st = $('dl-status'); const g = geoSel(); const n = g.fr.length + g.vp.length;
  if (!n){ st.textContent = (respOn.alc && sel===null && !respOn.gc)? 'Elige una alcaldía o una colonia para descargar sus calles como mapa.' : 'Este ámbito no tiene calles de prioridad Muy Alta, Alta o Media que descargar.'; return; }
  // en teléfono un archivo de decenas de miles de líneas pesa demasiado: se pide acotar a una colonia (mismo criterio que el Excel)
  if (isPhone() && n>GRANDE){ st.textContent = `El mapa de este ámbito tendría ${fmt.format(n)} líneas y es demasiado pesado para un celular. Elige una colonia o descárgalo desde una computadora.`; return; }
  st.textContent = n>GRANDE? `Preparando un archivo grande: ${fmt.format(n)} líneas, alrededor de ${fmt0.format(Math.max(1, n*(tipo==='kml'? 0.0006 : 0.00033)))} MB…` : 'Preparando archivo…';
  // el nombre dice qué trae (B3-02): calles de la alcaldía, vialidades primarias o las dos
  const base = g.fr.length && g.vp.length? `mapa_calles_y_vialidades_primarias_${scopeSlug()}` : g.fr.length? `mapa_calles_prioritarias_${scopeSlug()}` : `mapa_vialidades_primarias_prioritarias_${scopeSlugVP()}`;
  const f = geoFoto();
  // primero la sesión (si venció, se avisa como en el Excel) y los conteos del inventario (si no llegan, el archivo sale sin esas propiedades y lo dice)
  sesionViva().then(viva=> viva? espDescarga() : null).then(async esp=> { if (!esp){ avisoSesion(st); return; }
    try {
      const blob = tipo==='kml'? new Blob(await geoKML(g, esp, f), {type:'application/vnd.google-earth.kml+xml'}) : new Blob(await geoJSON(g, esp, f), {type:'application/geo+json'});
      await deliverBlob(`${base}.${tipo==='kml'? 'kml' : 'geojson'}`, blob, f.uso);
      if (n>2000 && tipo==='kml') st.textContent += ` · ${fmt.format(n)} líneas. Google Earth lo abre completo; «Mis mapas» de Google admite hasta 2,000 por capa: para ese uso, descarga por colonia.`;
      espAvisoDescarga(esp);
    } catch(e){ console.error(e); st.textContent = 'No fue posible preparar el archivo. Intenta con un ámbito más pequeño (una colonia).'; } }); }
$('dl-kml').onclick = ()=>geoDescarga('kml');
$('dl-geojson').onclick = ()=>geoDescarga('geojson');
