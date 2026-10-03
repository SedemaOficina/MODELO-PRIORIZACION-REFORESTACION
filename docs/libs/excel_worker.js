// Genera el archivo de Excel fuera del hilo principal de la página (auditoría H-045): un listado de 56 mil renglones
// tardaba decenas de segundos y congelaba el navegador. Lo usa 02_fuente/js/11_descargas.js; recibe los datos ya armados.
importScripts('xlsx.js');
onmessage = function(e){
  try {
    var d = e.data, X = XLSX, wb = X.utils.book_new(); if (d.props) wb.Props = d.props;
    var ws = X.utils.aoa_to_sheet(d.aoa);
    ws['!cols'] = d.cols.map(function(w){ return {wch:w}; });
    ws['!autofilter'] = { ref: X.utils.encode_range({ s:{r:0,c:0}, e:{r:Math.max(1,d.aoa.length-1), c:d.aoa[0].length-1} }) };
    ws['!freeze'] = { xSplit:'0', ySplit:'1', topLeftCell:'A2', activePane:'bottomLeft', state:'frozen' };
    X.utils.book_append_sheet(wb, ws, 'Datos');
    var wd = X.utils.aoa_to_sheet(d.dic); wd['!cols'] = [26, 78, 46].map(function(w){ return {wch:w}; });
    X.utils.book_append_sheet(wb, wd, 'Diccionario');
    var buf = X.write(wb, { bookType:'xlsx', type:'array', compression:true });
    postMessage({ ok:true, buf:buf }, [buf]);
  } catch(err){ postMessage({ ok:false, msg:String(err && err.message || err) }); }
};
