// «Mi perfil»: los datos de la cuenta con la sesión abierta, solo para ver (los corrige quien administra). Lee /priorizacion-reforestacion/api/yo.
// Todo el texto que viene del servidor se inserta como texto (textContent), nunca como HTML.
'use strict';
(function () {
  const HERRAMIENTA = '/priorizacion-reforestacion/', API = HERRAMIENTA + 'api/';
  const $ = id => document.getElementById(id);
  // a dónde regresar: la consulta de la herramienta de la que se vino (solo páginas de la herramienta, no su acceso ni su API)
  const crudo = (location.search.match(/[?&]volver=(.*)$/) || [])[1] || '';
  const v = (() => { try { return decodeURIComponent(crudo); } catch (e) { return ''; } })();
  const volver = v && v.startsWith(HERRAMIENTA) && !v.startsWith(HERRAMIENTA + 'acceso/') && !v.startsWith(API) && !v.startsWith('//') ? v : HERRAMIENTA;
  $('p-volver').href = volver;
  $('p-clave').href = '../?cambiar=1&volver=' + encodeURIComponent(volver);
  const ETQ = { 'Alcaldía': 'Alcaldía', 'Gobierno Central': 'Dependencia', 'Organización de la sociedad civil': 'Organización', Privado: 'Empresa', Otra: 'Institución' };
  const pon = (id, t) => { $(id).textContent = t || 'Sin capturar'; $(id).classList.toggle('tenue', !t); };
  fetch(API + 'yo', { credentials: 'same-origin', cache: 'no-store' }).then(async r => {
    if (r.status === 401) { location.assign('../?volver=' + encodeURIComponent(HERRAMIENTA)); return; }
    const d = await r.json();
    if (d.debe_cambiar) { location.assign('../?cambiar=1'); return; }
    pon('p-nombre', d.nombre); pon('p-correo', d.correo); pon('p-area', d.area); pon('p-cargo', d.cargo); pon('p-inst', d.institucion);
    $('p-perten-etq').textContent = ETQ[d.institucion] || 'Alcaldía, dependencia u organización'; pon('p-perten', d.alcaldia || d.entidad);
    pon('p-rol', d.rol === 'admin' ? 'Administración (consulta y administra cuentas)' : 'Consulta');
    $('p-admin').hidden = d.rol !== 'admin';
    $('perfil').setAttribute('aria-busy', 'false');
  }).catch(() => { const e = $('perfil-err'); e.textContent = 'No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo.'; e.hidden = false; });
})();
