// Panel de administración: cuentas (alta, baja, restablecer, permiso) y reporte de usos. Habla con /api/calles/admin/.
// Todo el texto que viene del servidor se inserta como texto (textContent), nunca como HTML.
'use strict';
(function () {
  const API = '/api/calles/';
  const $ = id => document.getElementById(id);
  const ALC = { '002': 'Azcapotzalco', '003': 'Coyoacán', '004': 'Cuajimalpa de Morelos', '005': 'Gustavo A. Madero', '006': 'Iztacalco', '007': 'Iztapalapa',
    '008': 'La Magdalena Contreras', '009': 'Milpa Alta', '010': 'Álvaro Obregón', '011': 'Tláhuac', '012': 'Tlalpan', '013': 'Xochimilco', '014': 'Benito Juárez',
    '015': 'Cuauhtémoc', '016': 'Miguel Hidalgo', '017': 'Venustiano Carranza' };
  const ARCHIVO = { excel_frentes: 'Excel · frentes prioritarios', excel_calles: 'Excel · resumen por calle', excel_tramos: 'Excel · tramos de vialidad primaria',
    excel_avenidas: 'Excel · resumen de avenidas', excel_calle: 'Excel · frentes de una calle', csv: 'CSV (sin conexión para Excel)', ficha_alcaldia: 'Ficha PDF · alcaldía',
    ficha_colonia: 'Ficha PDF · colonia', ficha_vialidades: 'Ficha PDF · vialidades primarias', ficha_avenida: 'Ficha PDF · avenida', ficha_calle: 'Ficha PDF · calle',
    kml: 'Mapa KML (Google Earth)', geojson: 'Mapa GeoJSON (SIG)', otro: 'Otro' };
  const fmt = new Intl.NumberFormat('es-MX'), fecha = d => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt !== undefined && txt !== null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const celda = (tr, txt, cls) => { const td = el('td', txt, cls); tr.appendChild(td); return td; };
  async function llama(ruta, metodo, cuerpo) {
    const r = await fetch(API + ruta, { method: metodo || 'GET', credentials: 'same-origin', headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (r.status === 401) { location.assign('../?vencida=1'); throw new Error('sin sesión'); }
    return { ok: r.ok, status: r.status, d };
  }

  // ---------- pestañas (teclado: flechas) ----------
  const tabs = [$('t-personas'), $('t-usos')];
  const elige = t => { tabs.forEach(b => { const si = b === t; b.setAttribute('aria-selected', String(si)); b.tabIndex = si ? 0 : -1; $(b.getAttribute('aria-controls')).hidden = !si; });
    if (t.id === 't-usos' && !$('cifras').children.length) cargaUsos(); };
  tabs.forEach((b, i) => { b.addEventListener('click', () => elige(b)); b.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; elige(n); n.focus(); } }); });

  // ---------- personas ----------
  Object.entries(ALC).sort((a, b) => a[1].localeCompare(b[1], 'es')).forEach(([k, v]) => { const o = el('option', v); o.value = k; $('a-alc').appendChild(o); });
  const syncAlc = () => { const alc = $('a-inst').value === 'Alcaldía'; $('a-alc').disabled = !alc; if (!alc) $('a-alc').value = ''; };
  $('a-inst').addEventListener('change', syncAlc); syncAlc();
  let PERSONAS = [], YO = null;
  const muestraClave = (titulo, persona, clave) => { const c = $('clave'); c.textContent = '';
    c.appendChild(el('b', titulo)); c.appendChild(el('span', ` Contraseña temporal de ${persona} (se muestra una sola vez):`));
    c.appendChild(el('code', clave));
    c.appendChild(el('span', 'Compártela por un medio institucional y por separado del correo de la cuenta. Al entrar, la herramienta le pedirá crear su propia contraseña.'));
    const b = el('button', 'Copiar', 'btn chico secundario'); b.type = 'button';
    b.addEventListener('click', () => navigator.clipboard.writeText(clave).then(() => { b.textContent = 'Copiada'; }, () => { b.textContent = 'Selecciónala y cópiala'; }));
    c.appendChild(b); c.hidden = false; c.scrollIntoView({ block: 'nearest' }); };
  $('f-alta').addEventListener('submit', async e => { e.preventDefault(); const err = $('alta-err'); err.hidden = true;
    const datos = { correo: $('a-correo').value.trim(), nombre: $('a-nombre').value.trim(), institucion: $('a-inst').value, alcaldia_cve: $('a-alc').value || null, rol: $('a-rol').value };
    if (datos.institucion === 'Alcaldía' && !datos.alcaldia_cve) { err.textContent = 'Elige la alcaldía de la persona.'; err.hidden = false; $('a-alc').focus(); return; }
    const r = await llama('admin/usuarios', 'POST', datos);
    if (!r.ok) { err.textContent = r.d.error || 'No fue posible dar de alta la cuenta.'; err.hidden = false; return; }
    muestraClave('Cuenta creada.', r.d.usuario.nombre, r.d.contrasena_temporal); e.target.querySelectorAll('input').forEach(i => { i.value = ''; }); cargaPersonas(); });

  async function accion(u, tipo) {
    const aviso = $('personas-aviso'); aviso.hidden = true;
    if (tipo === 'baja' && !confirm(`¿Dar de baja a ${u.nombre}? Su sesión se cierra en este momento y ya no podrá entrar. Puedes reactivarla después.`)) return;
    if (tipo === 'restablecer' && !confirm(`¿Restablecer la contraseña de ${u.nombre}? Se generará una temporal y se cerrarán sus sesiones.`)) return;
    const r = tipo === 'restablecer' ? await llama(`admin/usuarios/${u.id}/restablecer`, 'POST')
      : await llama(`admin/usuarios/${u.id}`, 'PATCH', tipo === 'baja' ? { activo: false } : tipo === 'alta' ? { activo: true } : { rol: u.rol === 'admin' ? 'usuario' : 'admin' });
    if (!r.ok) { aviso.className = 'aviso alerta'; aviso.textContent = r.d.error || 'No fue posible hacer el cambio.'; aviso.hidden = false; return; }
    if (tipo === 'restablecer') muestraClave('Contraseña restablecida.', u.nombre, r.d.contrasena_temporal);
    else { aviso.className = 'aviso ok'; aviso.textContent = { baja: `${u.nombre} quedó dada de baja.`, alta: `${u.nombre} está activa de nuevo.`, rol: `Permiso de ${u.nombre} actualizado.` }[tipo]; aviso.hidden = false; }
    cargaPersonas(); }
  function pintaPersonas() {
    const q = $('buscar').value.trim().toLowerCase(), f = $('filtro').value, tb = $('personas'); tb.textContent = '';
    const lista = PERSONAS.filter(u => (f === 'todas' || (f === 'activas') === u.activo) && (!q || [u.nombre, u.correo, u.alcaldia, u.institucion].join(' ').toLowerCase().includes(q)));
    $('personas-cap').textContent = `Cuentas · ${fmt.format(lista.length)} de ${fmt.format(PERSONAS.length)}`;
    if (!lista.length) { const tr = el('tr'); const td = celda(tr, 'No hay cuentas con ese criterio.'); td.colSpan = 6; tb.appendChild(tr); return; }
    for (const u of lista) { const tr = el('tr', null, u.activo ? '' : 'inactiva');
      const p = celda(tr); p.appendChild(el('b', u.nombre)); p.appendChild(el('br')); p.appendChild(el('span', u.correo));
      celda(tr, u.institucion + (u.alcaldia ? ' · ' + u.alcaldia : ''));
      celda(tr).appendChild(el('span', u.rol === 'admin' ? 'Administración' : 'Consulta', 'etiqueta' + (u.rol === 'admin' ? ' admin' : '')));
      celda(tr).appendChild(el('span', !u.activo ? 'De baja' : u.bloqueado ? 'Detenida por intentos' : u.debe_cambiar ? 'Pendiente de primer acceso' : 'Activa',
        'etiqueta' + (!u.activo ? ' baja' : (u.bloqueado || u.debe_cambiar) ? ' pendiente' : '')));
      celda(tr, fecha(u.ultimo_acceso));
      const ac = el('div', null, 'acciones'); celda(tr).appendChild(ac);
      const boton = (txt, tipo, etiqueta) => { const b = el('button', txt, 'btn chico secundario'); b.type = 'button'; b.setAttribute('aria-label', `${etiqueta} · ${u.nombre}`); b.addEventListener('click', () => accion(u, tipo)); ac.appendChild(b); };
      if (u.activo) { boton('Restablecer contraseña', 'restablecer', 'Restablecer contraseña'); if (!YO || YO.correo !== u.correo) { boton(u.rol === 'admin' ? 'Quitar administración' : 'Hacer administración', 'rol', 'Cambiar permiso'); boton('Dar de baja', 'baja', 'Dar de baja'); } }
      else boton('Reactivar', 'alta', 'Reactivar');
      tb.appendChild(tr); } }
  async function cargaPersonas() { const r = await llama('admin/usuarios'); if (r.ok) { PERSONAS = r.d; pintaPersonas(); } }
  $('buscar').addEventListener('input', pintaPersonas); $('filtro').addEventListener('change', pintaPersonas);

  // ---------- alta masiva desde CSV ----------
  // Excel en español puede guardar el CSV en Windows-1252 en lugar de UTF-8: se intenta UTF-8 y, si no es válido, Windows-1252
  const leeArchivo = async f => { const b = await f.arrayBuffer(); try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); } };
  const descarga = (nombre, texto) => { const a = el('a'); a.href = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  $('m-plantilla').addEventListener('click', e => { e.preventDefault();
    descarga('plantilla_alta_masiva.csv', 'correo,nombre,institucion,alcaldia,rol\r\nana.garcia@correo.com,Ana García López,Alcaldía,Tlalpan,usuario\r\nluis.perez@cdmx.gob.mx,Luis Pérez Ruiz,Gobierno Central,,usuario\r\n'); });
  let CSV = '';
  async function masiva(aplicar) {
    const err = $('m-err'), out = $('m-resultado'); err.hidden = true;
    if (!aplicar) { const f = $('m-archivo').files[0]; if (!f) { err.textContent = 'Elige un archivo CSV.'; err.hidden = false; $('m-archivo').focus(); return; }
      if (f.size > 300 * 1024) { err.textContent = 'El archivo es demasiado grande: divídelo en partes de hasta 500 personas.'; err.hidden = false; return; }
      CSV = await leeArchivo(f); out.textContent = 'Revisando…'; }
    const r = await llama('admin/usuarios/masiva', 'POST', { csv: CSV, aplicar });
    out.textContent = '';
    if (!r.ok) { err.textContent = r.d.error || 'No fue posible leer el archivo.'; err.hidden = false; return; }
    if (!r.d.aplicado) {
      const nuevas = r.d.validas.filter(v => !v.existe), ya = r.d.validas.filter(v => v.existe);
      out.appendChild(el('p', `${fmt.format(r.d.validas.length)} renglones válidos (${fmt.format(nuevas.length)} cuentas nuevas, ${fmt.format(ya.length)} ya existen y no se tocarán) · ${fmt.format(r.d.errores.length)} con errores.`, 'aviso ' + (r.d.errores.length ? 'alerta' : 'ok')));
      if (r.d.errores.length) { const ul = el('ul'); r.d.errores.forEach(x => ul.appendChild(el('li', x))); out.appendChild(ul);
        out.appendChild(el('p', 'Corrige esos renglones en el archivo y vuelve a revisarlo. No se dio de alta a nadie.', 'nota')); return; }
      const tw = el('div', null, 'tabla-envoltura'), t = el('table'), th = el('thead'), tb = el('tbody'); t.append(th, tb); tw.appendChild(t);
      const h = el('tr'); ['Correo', 'Nombre', 'Institución', 'Permiso', ''].forEach(x => { const c = el('th', x); c.scope = 'col'; h.appendChild(c); }); th.appendChild(h);
      r.d.validas.forEach(v => { const tr = el('tr', null, v.existe ? 'inactiva' : ''); [v.correo, v.nombre, v.institucion + (v.alcaldia ? ' · ' + v.alcaldia : ''), v.rol === 'admin' ? 'Administración' : 'Consulta', v.existe ? 'Ya existe' : 'Nueva'].forEach(x => celda(tr, x)); tb.appendChild(tr); });
      out.appendChild(tw);
      if (nuevas.length) { const b = el('button', `Dar de alta ${fmt.format(nuevas.length)} cuenta${nuevas.length === 1 ? '' : 's'}`, 'btn'); b.type = 'button';
        b.addEventListener('click', () => { if (confirm(`¿Dar de alta ${nuevas.length} cuenta(s)? Se generará una contraseña temporal para cada una.`)) masiva(true); }); out.appendChild(b); }
      return; }
    // aplicado: contraseñas temporales una sola vez, en un CSV que se arma aquí
    const filas = ['correo,nombre,institucion,alcaldia,contrasena_temporal'].concat(r.d.hechas.map(c => [c.correo, c.nombre, c.institucion, c.alcaldia || '', c.contrasena_temporal].map(q).join(',')));
    const nombre = `cuentas_con_contrasenas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    out.appendChild(el('p', `Listo: ${fmt.format(r.d.hechas.length)} cuentas creadas${r.d.existentes.length ? `; ${fmt.format(r.d.existentes.length)} ya existían y no se tocaron` : ''}.`, 'aviso ok'));
    const caja = el('div', null, 'clave'); caja.appendChild(el('b', 'Contraseñas temporales (se muestran una sola vez). '));
    caja.appendChild(el('span', 'Descarga el archivo, repártelas por un medio seguro y por separado del correo de cada cuenta, y bórralo después. Al entrar, cada persona creará su propia contraseña.'));
    const b = el('button', 'Descargar contraseñas (CSV)', 'btn'); b.type = 'button'; b.addEventListener('click', () => descarga(nombre, filas.join('\r\n'))); caja.appendChild(b);
    out.appendChild(caja); $('m-archivo').value = ''; CSV = ''; cargaPersonas(); }
  $('m-revisar').addEventListener('click', () => masiva(false));

  // ---------- usos ----------
  const hoy = new Date(), iso = d => d.toISOString().slice(0, 10);
  $('u-hasta').value = iso(hoy); $('u-desde').value = iso(new Date(hoy - 90 * 864e5));
  const fila = (tb, celdas) => { const tr = el('tr'); celdas.forEach(c => { if (c instanceof Node) { const td = el('td'); td.appendChild(c); tr.appendChild(td); } else celda(tr, c === undefined ? '—' : typeof c === 'number' ? fmt.format(c) : c, typeof c === 'number' ? 'n' : ''); }); tb.appendChild(tr); };
  const vacia = (tb, n) => { const tr = el('tr'); const td = celda(tr, 'Sin registros en estas fechas.'); td.colSpan = n; tb.appendChild(tr); };
  async function cargaUsos() {
    const desde = $('u-desde').value, hasta = $('u-hasta').value; $('usos-err').hidden = true;
    $('u-csv').href = API + 'admin/usos.csv?desde=' + encodeURIComponent(desde);
    const r = await llama(`admin/usos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
    if (!r.ok) { $('usos-err').textContent = r.d.error || 'No fue posible leer los usos.'; $('usos-err').hidden = false; return; }
    const d = r.d, suma = k => d.por_grupo.reduce((t, g) => t + (g[k] || 0), 0);
    const cif = $('cifras'); cif.textContent = '';
    [[d.cuentas.activas, 'cuentas activas'], [d.por_persona.length, 'personas usaron la herramienta'], [suma('accesos'), 'inicios de sesión'], [suma('consultas'), 'consultas de alcaldía o colonia'], [suma('descargas'), 'archivos descargados']]
      .forEach(([n, t]) => { const c = el('div', null, 'cifra'); c.appendChild(el('b', fmt.format(n))); c.appendChild(el('span', t)); cif.appendChild(c); });
    const maxD = Math.max(1, ...d.por_grupo.map(g => g.descargas));
    const tg = $('u-grupo'); tg.textContent = ''; if (!d.por_grupo.length) vacia(tg, 7);
    d.por_grupo.forEach(g => { const barra = el('div', null, 'barra-hbar'); barra.style.width = Math.round(100 * g.descargas / maxD) + '%'; barra.setAttribute('aria-hidden', 'true');
      fila(tg, [g.institucion, g.alcaldia || '—', g.personas, g.accesos, g.consultas, g.descargas, barra]); });
    const tt = $('u-territorio'); tt.textContent = ''; if (!d.alcaldias_consultadas.length) vacia(tt, 3); d.alcaldias_consultadas.forEach(a => fila(tt, [a.alcaldia, a.consultas, a.descargas]));
    const ta = $('u-archivos'); ta.textContent = ''; if (!d.archivos.length) vacia(ta, 2); d.archivos.forEach(a => fila(ta, [ARCHIVO[a.tipo] || a.tipo, a.n]));
    const tp = $('u-persona'); tp.textContent = ''; if (!d.por_persona.length) vacia(tp, 6);
    d.por_persona.forEach(p => { const n = el('span'); n.appendChild(el('b', p.nombre)); n.appendChild(el('br')); n.appendChild(el('span', p.correo));
      fila(tp, [n, p.institucion + (p.alcaldia ? ' · ' + p.alcaldia : ''), p.accesos, p.consultas, p.descargas, fecha(p.ultimo)]); });
  }
  $('f-usos').addEventListener('submit', e => { e.preventDefault(); cargaUsos(); });

  // ---------- al abrir: solo con sesión y permiso de administración ----------
  llama('yo').then(r => { YO = r.d;
    if (r.d.debe_cambiar) { location.assign('../?cambiar=1'); return; }
    $('yo').textContent = `${r.d.nombre} · ${r.d.correo}`;
    if (r.d.rol !== 'admin') { const s = $('sin-permiso'); s.textContent = 'Tu cuenta no tiene permiso de administración. Si lo necesitas, pídelo a quien administra la herramienta.'; s.hidden = false; return; }
    $('panel').hidden = false; cargaPersonas(); }).catch(() => {});
})();
