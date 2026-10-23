// Panel de administración: cuentas (alta, edición, baja, restablecer, permiso; filtros y orden por columna), reporte de usos y catálogos
// (dependencias, organizaciones, empresas y otras instituciones). Habla con /priorizacion-reforestacion/api/admin/.
// Todo el texto que viene del servidor se inserta como texto (textContent), nunca como HTML.
'use strict';
(function () {
  const API = '/priorizacion-reforestacion/api/';
  const $ = id => document.getElementById(id);
  const ALC = { '002': 'Azcapotzalco', '003': 'Coyoacán', '004': 'Cuajimalpa de Morelos', '005': 'Gustavo A. Madero', '006': 'Iztacalco', '007': 'Iztapalapa',
    '008': 'La Magdalena Contreras', '009': 'Milpa Alta', '010': 'Álvaro Obregón', '011': 'Tláhuac', '012': 'Tlalpan', '013': 'Xochimilco', '014': 'Benito Juárez',
    '015': 'Cuauhtémoc', '016': 'Miguel Hidalgo', '017': 'Venustiano Carranza' };
  const ARCHIVO = { excel_frentes: 'Excel · frente por frente', excel_calles: 'Excel · lista de calles', excel_tramos: 'Excel · tramo por tramo (vialidades primarias)',
    excel_avenidas: 'Excel · lista de avenidas', excel_calle: 'Excel · frente por frente de una calle', excel_alcaldias: 'Excel · las 16 alcaldías', csv: 'CSV (sin conexión para Excel)', ficha_alcaldia: 'Ficha PDF · alcaldía',
    ficha_colonia: 'Ficha PDF · colonia', ficha_vialidades: 'Ficha PDF · vialidades primarias', ficha_avenida: 'Ficha PDF · avenida', ficha_calle: 'Ficha PDF · calle',
    kml: 'Mapa KML (Google Earth)', geojson: 'Mapa GeoJSON (SIG)', otro: 'Otro' };
  const fmt = new Intl.NumberFormat('es-MX'), fecha = d => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt !== undefined && txt !== null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const celda = (tr, txt, cls) => { const td = el('td', txt, cls); tr.appendChild(td); return td; };
  // sin sesión lleva a la pantalla de acceso, salvo con «quedarse» (alta masiva: primero se descargan las contraseñas recibidas)
  async function llama(ruta, metodo, cuerpo, quedarse) {
    const r = await fetch(API + ruta, { method: metodo || 'GET', credentials: 'same-origin', headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (r.status === 401 && !quedarse) { location.assign('../?vencida=1'); throw new Error('sin sesión'); }
    return { ok: r.ok, status: r.status, d };
  }

  // ---------- pestañas (teclado: flechas) ----------
  const tabs = [$('t-personas'), $('t-usos'), $('t-catalogos')];
  const elige = t => { tabs.forEach(b => { const si = b === t; b.setAttribute('aria-selected', String(si)); b.tabIndex = si ? 0 : -1; $(b.getAttribute('aria-controls')).hidden = !si; });
    if (t.id === 't-usos' && !$('cifras').children.length) cargaUsos(); if (t.id === 't-catalogos') pintaCatalogos(); };
  tabs.forEach((b, i) => { b.addEventListener('click', () => elige(b)); b.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; elige(n); n.focus(); } }); });

  // tablas que se recorren de lado en pantallas angostas: se pueden enfocar con el teclado y llevan nombre (su título o el de su sección)
  const recorrible = (tw, nombre) => { tw.tabIndex = 0; tw.setAttribute('role', 'region'); tw.setAttribute('aria-label', nombre); };
  document.querySelectorAll('.tabla-envoltura').forEach(tw => { const c = tw.querySelector('caption'); recorrible(tw, c ? c.textContent : 'Tabla'); });

  // ---------- ventanas (<dialog>): el navegador mantiene el foco dentro y Esc las cierra; al cerrar, el foco vuelve a quien las abrió ----------
  const abreVentana = (d, foco) => { d._origen = document.activeElement; d.showModal(); if (foco) $(foco).focus(); };
  document.querySelectorAll('dialog.dialogo').forEach(d => {
    // la × , «Cancelar» y un clic en el fondo oscuro pasan por «cancel», igual que Esc: así una ventana puede pedir confirmación antes de cerrarse
    const cierra = () => { if (d.dispatchEvent(new Event('cancel', { cancelable: true }))) d.close(); };
    d.querySelectorAll('[data-cierra]').forEach(b => b.addEventListener('click', cierra));
    d.addEventListener('close', () => { if (d._origen && d._origen.isConnected) d._origen.focus(); });
    d.addEventListener('click', e => { if (e.target === d) cierra(); });
  });

  // ---------- personas ----------
  // Fuera de las alcaldías, cada cuenta lleva una entrada del catálogo de su tipo de institución (pestaña «Catálogos»)
  const ETQ = { 'Gobierno Central': 'Dependencia', 'Organización de la sociedad civil': 'Organización', Privado: 'Empresa', Otra: 'Institución' };
  const ALC_ORDEN = Object.entries(ALC).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  ALC_ORDEN.forEach(([k, v]) => { const o = el('option', v); o.value = k; $('a-alc').appendChild(o); });
  let PERSONAS = [], YO = null, CAT = { tipos: [], entradas: [] }, EDITA = null;
  // las entradas activas del tipo; al editar, también la que ya tiene la cuenta aunque esté desactivada
  function llenaEnt(inst, actual) { const s = $('a-ent'); s.textContent = ''; s.appendChild(el('option', '— Elige —')).value = '';
    CAT.entradas.filter(c => c.tipo === inst && (c.activo || c.id === actual)).forEach(c => { const o = el('option', c.nombre + (c.activo ? '' : ' (desactivada)')); o.value = String(c.id); s.appendChild(o); });
    s.value = actual ? String(actual) : ''; }
  function syncInst(actual) { const inst = $('a-inst').value, alc = inst === 'Alcaldía';
    $('c-alc').hidden = !alc; $('c-ent').hidden = alc;
    if (!alc) { $('a-ent-etq').textContent = ETQ[inst]; llenaEnt(inst, actual); } }
  $('a-inst').addEventListener('change', () => syncInst()); syncInst();
  const pertenencia = u => u.alcaldia || u.entidad || '';
  const rolElegido = () => (document.querySelector('input[name="a-rol"]:checked') || {}).value || 'usuario';
  const ponRol = v => document.querySelectorAll('input[name="a-rol"]').forEach(i => { i.checked = i.value === v; });
  // sugerencias de área: las que ya están capturadas, para no escribir la misma de varias formas
  const pintaAreas = () => { const d = $('areas'); d.textContent = '';
    [...new Set(PERSONAS.map(u => (u.area || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')).forEach(a => d.appendChild(el('option')).value = a); };
  // la misma ventana sirve para agregar y para editar (con el correo fijo)
  function abreAlta() { EDITA = null; $('alta-titulo').textContent = 'Agregar cuenta'; $('a-guardar').textContent = 'Dar de alta'; $('alta-err').hidden = true;
    $('a-correo').disabled = false; $('f-alta').querySelectorAll('input:not([type=radio])').forEach(i => { i.value = ''; }); ponRol('usuario'); $('a-inst').value = 'Alcaldía'; $('a-alc').value = ''; syncInst();
    abreVentana($('d-cuenta'), 'a-nombre'); }
  function editar(u) { EDITA = u; $('alta-err').hidden = true;
    $('alta-titulo').textContent = 'Editar cuenta'; $('a-guardar').textContent = 'Guardar cambios';
    $('a-correo').value = u.correo; $('a-correo').disabled = true; $('a-nombre').value = u.nombre; $('a-area').value = u.area || ''; $('a-cargo').value = u.cargo || '';
    $('a-inst').value = u.institucion; $('a-alc').value = u.alcaldia_cve || ''; ponRol(u.rol); syncInst(u.entidad_id);
    abreVentana($('d-cuenta'), 'a-nombre'); }
  $('b-agregar').addEventListener('click', abreAlta);
  const avisoPersonas = (t, ok) => { const a = $('personas-aviso'); a.className = 'aviso ' + (ok ? 'ok' : 'alerta'); a.textContent = t; a.hidden = false; };
  // contraseña temporal: en su propia ventana, una sola vez
  const muestraClave = (titulo, persona, clave) => { const c = $('clave'); c.textContent = ''; $('clave-titulo').textContent = titulo;
    c.appendChild(el('span', `Contraseña temporal de ${persona} (se muestra una sola vez):`));
    c.appendChild(el('code', clave));
    c.appendChild(el('span', 'Compártela por un medio institucional y por separado del correo de la cuenta. Al entrar, la herramienta le pedirá crear su propia contraseña.'));
    const b = el('button', 'Copiar', 'btn chico secundario'); b.type = 'button';
    b.addEventListener('click', () => navigator.clipboard.writeText(clave).then(() => { b.textContent = 'Copiada'; }, () => { b.textContent = 'Selecciónala y cópiala'; }));
    c.appendChild(b); abreVentana($('d-clave')); b.focus(); };
  $('f-alta').addEventListener('submit', async e => { e.preventDefault(); const err = $('alta-err'); err.hidden = true;
    const falta = (t, id) => { err.textContent = t; err.hidden = false; $(id).focus(); };
    const inst = $('a-inst').value, alc = inst === 'Alcaldía';
    const datos = { correo: $('a-correo').value.trim(), nombre: $('a-nombre').value.trim(), area: $('a-area').value.trim(), cargo: $('a-cargo').value.trim(), institucion: inst,
      alcaldia_cve: alc ? $('a-alc').value || null : null, entidad_id: alc ? null : +$('a-ent').value || null, rol: rolElegido() };
    if (!datos.nombre) return falta('Escribe el nombre.', 'a-nombre');
    if (!EDITA && !datos.correo) return falta('Escribe el correo.', 'a-correo');
    if (!datos.area) return falta('Escribe el área.', 'a-area');
    if (!datos.cargo) return falta('Escribe el cargo.', 'a-cargo');
    if (alc && !datos.alcaldia_cve) return falta('Elige la alcaldía de la persona.', 'a-alc');
    if (!alc && !datos.entidad_id) return falta(`Elige la ${ETQ[inst].toLowerCase()}. Si no aparece, agrégala en «Catálogos».`, 'a-ent');
    const g = $('a-guardar'); g.disabled = true;
    try {
      if (EDITA) {   // solo lo que cambió
        const u = EDITA, cambios = {};
        for (const k of ['nombre', 'area', 'cargo', 'institucion', 'alcaldia_cve', 'entidad_id', 'rol']) if ((datos[k] ?? null) !== (u[k] ?? null)) cambios[k] = datos[k];
        if (!Object.keys(cambios).length) { $('d-cuenta').close(); return; }
        const r = await llama(`admin/usuarios/${u.id}`, 'PATCH', cambios);
        if (!r.ok) return falta(r.d.error || 'No fue posible guardar los cambios.', 'a-guardar');
        $('d-cuenta').close(); avisoPersonas(`Se guardaron los cambios de ${r.d.nombre}.`, true); cargaPersonas(); return;
      }
      const r = await llama('admin/usuarios', 'POST', datos);
      if (!r.ok) return falta(r.d.error || 'No fue posible dar de alta la cuenta.', 'a-guardar');
      $('d-cuenta').close(); muestraClave('Cuenta creada', r.d.usuario.nombre, r.d.contrasena_temporal); cargaPersonas();
    } catch (x) { falta('No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo.', 'a-guardar'); } finally { g.disabled = false; } });

  async function accion(u, tipo) {
    $('personas-aviso').hidden = true;
    if (tipo === 'baja' && !confirm(`¿Dar de baja a ${u.nombre}? Su sesión se cierra en este momento y ya no podrá entrar. Puedes reactivarla después.`)) return;
    if (tipo === 'restablecer' && !confirm(`¿Restablecer la contraseña de ${u.nombre}? Se generará una temporal y se cerrarán sus sesiones.`)) return;
    const r = tipo === 'restablecer' ? await llama(`admin/usuarios/${u.id}/restablecer`, 'POST')
      : await llama(`admin/usuarios/${u.id}`, 'PATCH', tipo === 'baja' ? { activo: false } : tipo === 'alta' ? { activo: true } : { rol: u.rol === 'admin' ? 'usuario' : 'admin' });
    if (!r.ok) { avisoPersonas(r.d.error || 'No fue posible hacer el cambio.'); return; }
    if (tipo === 'restablecer') muestraClave('Contraseña restablecida', u.nombre, r.d.contrasena_temporal);
    else avisoPersonas({ baja: `${u.nombre} quedó dada de baja.`, alta: `${u.nombre} está activa de nuevo.`, rol: `Permiso de ${u.nombre} actualizado.` }[tipo], true);
    cargaPersonas(); }
  // menú «Más acciones» de cada renglón: uno abierto a la vez; Esc o un clic fuera lo cierran y el foco vuelve a su botón
  let MENU = null;
  const cierraMenu = foco => { if (!MENU) return; MENU.m.hidden = true; MENU.b.setAttribute('aria-expanded', 'false'); if (foco) MENU.b.focus(); MENU = null; };
  document.addEventListener('click', e => { if (MENU && !MENU.m.contains(e.target) && e.target !== MENU.b) cierraMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && MENU) { e.preventDefault(); cierraMenu(true); } });
  // el menú flota sobre la página (la tabla se recorre de lado y lo recortaría): se coloca junto a su botón, abajo o, si no cabe, arriba
  const colocaMenu = (m, b) => { const r = b.getBoundingClientRect(), alto = m.offsetHeight;
    m.style.right = Math.max(8, innerWidth - r.right) + 'px';
    m.style.top = (r.bottom + 4 + alto > innerHeight - 8 ? Math.max(8, r.top - 4 - alto) : r.bottom + 4) + 'px'; };
  addEventListener('scroll', () => cierraMenu(false), true); addEventListener('resize', () => cierraMenu(false));
  // filtro «Alcaldía, dependencia u organización»: sus opciones siguen a la institución elegida (a:clave de alcaldía, e:entrada del catálogo)
  function llenaPerten() { const s = $('f-perten'), antes = s.value, inst = $('f-inst').value; s.textContent = ''; s.appendChild(el('option', 'Todas')).value = '';
    const grupo = (etq, ops) => { if (!ops.length) return; const g = el('optgroup'); g.label = etq; ops.forEach(([v, t]) => { g.appendChild(el('option', t)).value = v; }); s.appendChild(g); };
    if (!inst || inst === 'Alcaldía') grupo('Alcaldías', ALC_ORDEN.map(([k, v]) => ['a:' + k, v]));
    CAT.tipos.filter(t => !inst || inst === t).forEach(t => grupo(t, CAT.entradas.filter(c => c.tipo === t).map(c => ['e:' + c.id, c.nombre])));
    s.value = [...s.options].some(o => o.value === antes) ? antes : ''; }
  // orden por columna: clic en el encabezado; otro clic invierte el orden. Los vacíos van al final
  let ORDEN = { k: 'nombre', dir: 1 };
  const valor = (u, k) => k === 'pertenencia' ? pertenencia(u) || u.institucion : k === 'ultimo_acceso' ? (u.ultimo_acceso ? new Date(u.ultimo_acceso).getTime() : null)
    : k === 'rol' ? (u.rol === 'admin' ? 'Administración' : 'Consulta') : u[k];
  const compara = (a, b) => { const x = valor(a, ORDEN.k), y = valor(b, ORDEN.k);
    if (x === null || x === '' || x === undefined) return (y === null || y === '' || y === undefined) ? 0 : 1; if (y === null || y === '' || y === undefined) return -1;
    return ORDEN.dir * (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { sensitivity: 'base' })); };
  document.querySelectorAll('#s-personas th[data-orden]').forEach(th => th.querySelector('button').addEventListener('click', () => {
    const k = th.dataset.orden; ORDEN = { k, dir: ORDEN.k === k ? -ORDEN.dir : (k === 'ultimo_acceso' ? -1 : 1) }; pintaPersonas(); }));
  const ESTADO = u => !u.activo ? ['De baja', 'baja'] : u.bloqueado ? ['Detenida por intentos', 'pendiente'] : u.temporal_vencida ? ['Temporal vencida', 'pendiente']
    : u.debe_cambiar ? ['Sin primer acceso', 'pendiente'] : ['Activa', 'activa'];
  const dosLineas = (td, a, b, claseA) => { td.appendChild(el('span', a, 'linea' + (claseA ? ' ' + claseA : ''))); if (b) td.appendChild(el('span', b, 'linea sub')); };
  function pintaPersonas() {
    cierraMenu(false);
    const q = norm($('buscar').value), f = $('filtro').value, fi = $('f-inst').value, fp = $('f-perten').value, fr = $('f-rol').value, tb = $('personas'); tb.textContent = '';
    document.querySelectorAll('#s-personas th[data-orden]').forEach(th => { if (th.dataset.orden === ORDEN.k) th.setAttribute('aria-sort', ORDEN.dir > 0 ? 'ascending' : 'descending'); else th.removeAttribute('aria-sort'); });
    const lista = PERSONAS.filter(u => (f === 'todas' || (f === 'activas') === u.activo) && (!fi || u.institucion === fi) && (!fr || u.rol === fr)
      && (!fp || fp === (u.alcaldia_cve ? 'a:' + u.alcaldia_cve : 'e:' + u.entidad_id))
      && (!q || norm([u.nombre, u.correo, u.area, u.cargo, pertenencia(u), u.institucion].join(' ')).includes(q))).sort(compara);
    $('personas-cap').textContent = `Cuentas · ${fmt.format(lista.length)} de ${fmt.format(PERSONAS.length)}`;
    if (!lista.length) { const tr = el('tr'); const td = celda(tr, 'No hay cuentas con ese criterio.'); td.colSpan = 6; tb.appendChild(tr); return; }
    for (const u of lista) { const tr = el('tr', null, u.activo ? '' : 'inactiva');
      // persona: nombre, correo y, debajo, área y cargo
      const p = celda(tr, null, 'persona'); dosLineas(p, u.nombre, u.correo, 'fuerte');
      p.appendChild(el('span', [u.area, u.cargo].filter(Boolean).join(' · ') || 'Área y cargo sin capturar', 'linea puesto' + (u.area || u.cargo ? '' : ' falta')));
      dosLineas(celda(tr), pertenencia(u) || '—', u.institucion);
      celda(tr).appendChild(el('span', u.rol === 'admin' ? 'Administración' : 'Consulta', 'etiqueta' + (u.rol === 'admin' ? ' admin' : '')));
      const [est, cls] = ESTADO(u); celda(tr).appendChild(el('span', est, 'etiqueta ' + cls));
      const ua = u.ultimo_acceso ? new Date(u.ultimo_acceso) : null;
      dosLineas(celda(tr, null, 'fecha'), ua ? ua.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Nunca', ua ? ua.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '');
      // acciones: «Editar» a la vista y lo demás en «Más acciones»
      const td = celda(tr, null, 'acciones-celda'), ac = el('div', null, 'acciones'); td.appendChild(ac);
      const be = el('button', 'Editar', 'btn chico secundario'); be.type = 'button'; be.setAttribute('aria-label', `Editar · ${u.nombre}`); be.addEventListener('click', () => editar(u)); ac.appendChild(be);
      const opciones = [];
      if (u.activo) { opciones.push(['Restablecer contraseña', 'restablecer']);
        if (!YO || YO.correo !== u.correo) opciones.push([u.rol === 'admin' ? 'Quitar administración' : 'Dar administración', 'rol'], ['Dar de baja', 'baja']); }
      else opciones.push(['Reactivar', 'alta']);
      const caja = el('div', null, 'mas'), bm = el('button', null, 'btn chico secundario mas-btn'); bm.type = 'button';
      bm.setAttribute('aria-label', `Más acciones · ${u.nombre}`); bm.setAttribute('aria-expanded', 'false'); bm.appendChild(el('span', '⋯')).setAttribute('aria-hidden', 'true');
      const m = el('ul', null, 'mas-menu'); m.hidden = true;
      opciones.forEach(([txt, tipo]) => { const b = el('button', txt, tipo === 'baja' ? 'peligro' : ''); b.type = 'button'; b.addEventListener('click', () => { cierraMenu(false); accion(u, tipo); }); m.appendChild(el('li')).appendChild(b); });
      bm.setAttribute('aria-controls', m.id = 'mas-' + u.id);
      bm.addEventListener('click', () => { const abrir = m.hidden; cierraMenu(false); if (abrir) { m.hidden = false; colocaMenu(m, bm); bm.setAttribute('aria-expanded', 'true'); MENU = { m, b: bm }; m.querySelector('button').focus({ preventScroll: true }); } });
      caja.append(bm, m); ac.appendChild(caja);
      tb.appendChild(tr); } }
  async function cargaPersonas() { const r = await llama('admin/usuarios'); if (r.ok) { PERSONAS = r.d; pintaAreas(); pintaPersonas(); } }
  $('buscar').addEventListener('input', pintaPersonas);
  ['filtro', 'f-perten', 'f-rol'].forEach(id => $(id).addEventListener('change', pintaPersonas));
  $('f-inst').addEventListener('change', () => { llenaPerten(); pintaPersonas(); });

  // ---------- catálogos: dependencias, organizaciones, empresas y otras instituciones ----------
  async function cargaCatalogos() { const r = await llama('admin/catalogos'); if (!r.ok) return;
    CAT = r.d; llenaPerten(); if (!$('c-ent').hidden) llenaEnt($('a-inst').value, EDITA ? EDITA.entidad_id : +$('a-ent').value || null);
    if (!$('s-catalogos').hidden) pintaCatalogos(); }
  const avisoCat = (t, ok) => { const a = $('cat-aviso'); a.className = 'aviso ' + (ok ? 'ok' : 'alerta'); a.textContent = t; a.hidden = false; };
  async function cambiaEntrada(c, cambio, txt) { $('cat-aviso').hidden = true;
    const r = await llama(`admin/catalogos/${c.id}`, 'PATCH', cambio);
    if (!r.ok) { avisoCat(r.d.error || 'No fue posible hacer el cambio.'); return false; }
    avisoCat(txt(r.d), true); await cargaCatalogos(); cargaPersonas(); return true; }
  function pintaCatalogos() { const caja = $('catalogos'); caja.textContent = '';
    CAT.tipos.forEach((t, i) => {
      const sec = el('div', null, 'caja'); sec.appendChild(el('h3', t === 'Gobierno Central' ? 'Gobierno Central · dependencias' : t));
      // agregar
      const f = el('form', null, 'fila-agregar'); f.noValidate = true;
      const c1 = el('div', null, 'campo'), lb = el('label', `Agregar ${ETQ[t].toLowerCase()}`), inp = el('input'); lb.htmlFor = inp.id = 'cat-n-' + i; inp.autocomplete = 'off'; inp.maxLength = 120;
      c1.append(lb, inp); const c2 = el('div', null, 'campo'), b = el('button', 'Agregar', 'btn secundario'); b.type = 'submit'; c2.appendChild(b); f.append(c1, c2); sec.appendChild(f);
      f.addEventListener('submit', async e => { e.preventDefault(); $('cat-aviso').hidden = true; const nombre = inp.value.trim();
        if (!nombre) { avisoCat(`Escribe el nombre de la ${ETQ[t].toLowerCase()}.`); inp.focus(); return; }
        const r = await llama('admin/catalogos', 'POST', { tipo: t, nombre });
        if (!r.ok) { avisoCat(r.d.error || 'No fue posible agregarla.'); inp.focus(); return; }
        avisoCat(`Se agregó «${r.d.nombre}» a ${t}.`, true); await cargaCatalogos(); const n = $('cat-n-' + i); if (n) n.focus(); });
      // lista
      const lista = CAT.entradas.filter(c => c.tipo === t);
      const tw = el('div', null, 'tabla-envoltura'), tab = el('table'), th = el('thead'), tb = el('tbody'); tab.append(th, tb); tw.appendChild(tab); recorrible(tw, `Catálogo de ${t}`);
      const h = el('tr'); ['Nombre', 'Cuentas activas', 'Estado', 'Acciones'].forEach(x => { const c = el('th', x); c.scope = 'col'; h.appendChild(c); }); th.appendChild(h);
      if (!lista.length) { const tr = el('tr'); celda(tr, 'Todavía no hay entradas.').colSpan = 4; tb.appendChild(tr); }
      lista.forEach(c => { const tr = el('tr', null, c.activo ? '' : 'inactiva'), tdN = celda(tr, c.nombre);
        celda(tr, c.cuentas, 'n'); celda(tr).appendChild(el('span', c.activo ? 'Activa' : 'Desactivada', 'etiqueta' + (c.activo ? '' : ' baja')));
        const ac = el('div', null, 'acciones'); celda(tr).appendChild(ac);
        const bot = (txt, etq, fn) => { const x = el('button', txt, 'btn chico secundario'); x.type = 'button'; x.setAttribute('aria-label', `${etq} · ${c.nombre}`); x.addEventListener('click', fn); ac.appendChild(x); };
        bot('Cambiar nombre', 'Cambiar nombre', () => {   // en el mismo renglón: campo, Guardar y Cancelar
          tdN.textContent = ''; const e2 = el('input'); e2.value = c.nombre; e2.maxLength = 120; e2.setAttribute('aria-label', `Nuevo nombre de ${c.nombre}`); tdN.appendChild(e2); e2.focus();
          ac.textContent = ''; bot('Guardar', 'Guardar nombre', async () => { const n = e2.value.trim(); if (n === c.nombre) { pintaCatalogos(); return; }
            await cambiaEntrada(c, { nombre: n }, d => `«${c.nombre}» ahora se llama «${d.nombre}».`); });
          bot('Cancelar', 'Cancelar cambio de nombre', () => pintaCatalogos());
          e2.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); ac.firstChild.click(); } if (ev.key === 'Escape') pintaCatalogos(); }); });
        if (c.activo) bot('Desactivar', 'Desactivar', () => { if (confirm(`¿Desactivar «${c.nombre}»? Deja de ofrecerse en las altas; ${c.cuentas ? `las ${c.cuentas} cuentas que la tienen la conservan` : 'ninguna cuenta activa la tiene'}.`))
          cambiaEntrada(c, { activo: false }, d => `«${d.nombre}» quedó desactivada.`); });
        else bot('Reactivar', 'Reactivar', () => cambiaEntrada(c, { activo: true }, d => `«${d.nombre}» está activa de nuevo.`));
        tb.appendChild(tr); });
      sec.appendChild(tw); caja.appendChild(sec); }); }

  // ---------- alta masiva desde CSV ----------
  // El servidor admite hasta 100 cuentas por petición: el archivo se parte aquí en envíos de LOTE renglones, cada uno con
  // su encabezado. Primero se revisan todos (no se da de alta a nadie); después se aplican uno por uno.
  const LOTE = 50;
  // Excel en español puede guardar el CSV en Windows-1252 en lugar de UTF-8: se intenta UTF-8 y, si no es válido, Windows-1252
  const leeArchivo = async f => { const b = await f.arrayBuffer(); try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { return new TextDecoder('windows-1252').decode(b); } };
  const descarga = (nombre, texto) => { const a = el('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8' })); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  // sin fórmulas al abrir en Excel: un valor que empieza con = + - @ va con apóstrofo, igual que el CSV de la bitácora
  const q = v => { const s = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // Lee el CSV como el servidor: coma o punto y coma, con o sin BOM, campos entre comillas; descarta renglones vacíos
  function partesCsv(entrada) {
    const texto = entrada.replace(/^\uFEFF/, ''), primera = texto.split(/\r?\n/)[0];
    const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
    const filas = []; let f = [], c = '', dentro = false;
    for (let i = 0; i < texto.length; i++) { const ch = texto[i];
      if (dentro) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') dentro = false; else c += ch; }
      else if (ch === '"') dentro = true;
      else if (ch === sep) { f.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; f.push(c); filas.push(f); f = []; c = ''; }
      else c += ch; }
    if (c !== '' || f.length) { f.push(c); filas.push(f); }
    const enc = filas.shift() || [];
    return { enc, filas: filas.filter(r => r.some(x => x.trim())) };
  }
  const aCsv = filas => filas.map(r => r.map(q).join(',')).join('\r\n');
  const numRenglon = t => +((t.match(/^Renglón (\d+)/) || [])[1] || 0);
  $('m-plantilla').addEventListener('click', e => { e.preventDefault();
    descarga('plantilla_alta_masiva.csv', 'correo,nombre,area,cargo,institucion,alcaldia,dependencia_u_organizacion,rol\r\n' +
      'ana.garcia@correo.com,Ana García López,Dirección de Medio Ambiente,Jefatura de Unidad Departamental,Alcaldía,Tlalpan,,usuario\r\n' +
      'luis.perez@cdmx.gob.mx,Luis Pérez Ruiz,Dirección General de Servicios Urbanos y Sustentabilidad,Subdirección,Gobierno Central,,SOBSE,usuario\r\n'); });
  // contraseñas recibidas que aún no se descargan: el navegador avisa antes de cerrar la página
  let PENDIENTES = false;
  window.addEventListener('beforeunload', e => { if (PENDIENTES) { e.preventDefault(); e.returnValue = ''; } });
  $('b-masiva').addEventListener('click', () => abreVentana($('d-masiva'), 'm-archivo'));
  $('d-masiva').addEventListener('cancel', e => { if (PENDIENTES && !confirm('Todavía no descargas las contraseñas temporales: si cierras, ya no podrás verlas. ¿Cerrar de todos modos?')) e.preventDefault(); });
  const sinRed = 'No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo.';
  const falla = t => { const err = $('m-err'); err.textContent = t; err.hidden = false; };

  let LOTES = [];
  async function revisar() {
    const out = $('m-resultado'); $('m-err').hidden = true; out.textContent = '';
    const f = $('m-archivo').files[0]; if (!f) { falla('Elige un archivo CSV.'); $('m-archivo').focus(); return; }
    if (f.size > 300 * 1024) { falla('El archivo es demasiado grande (más de 300 KB): divídelo en partes.'); return; }
    const { enc, filas } = partesCsv(await leeArchivo(f));
    if (!filas.length) { falla('El archivo no tiene renglones después del encabezado.'); return; }
    LOTES = [];
    for (let k = 0; k < filas.length; k += LOTE) LOTES.push({ desde: k, filas: filas.slice(k, k + LOTE), csv: aCsv([enc].concat(filas.slice(k, k + LOTE))) });
    const validas = [], errores = [], vistos = new Map(), ic = enc.map(norm).indexOf('correo');
    for (let i = 0; i < LOTES.length; i++) { const l = LOTES[i];
      out.textContent = `Revisando… ${fmt.format(Math.min(l.desde + LOTE, filas.length))} de ${fmt.format(filas.length)} renglones`;
      let r; try { r = await llama('admin/usuarios/masiva', 'POST', { csv: l.csv, aplicar: false }); } catch (e) { out.textContent = ''; falla(sinRed); return; }
      if (!r.ok) { out.textContent = ''; falla(r.d.error || 'No fue posible leer el archivo.'); return; }
      // el servidor numera los renglones dentro de cada envío: se pasan al número del archivo completo
      r.d.errores.forEach(x => errores.push(x.replace(/^Renglón (\d+)/, (m, n) => 'Renglón ' + (+n + l.desde))));
      // un correo repetido en envíos distintos (dentro de un mismo envío ya lo señala el servidor)
      const repetidos = new Set();
      if (ic >= 0) l.filas.forEach((fila, j) => { const c = (fila[ic] || '').trim().toLowerCase(), n = l.desde + j + 2; if (!c) return;
        const antes = vistos.get(c);
        if (antes === undefined) vistos.set(c, i);
        else if (antes !== i) { repetidos.add(c); if (!errores.some(x => numRenglon(x) === n)) errores.push(`Renglón ${n} (${c}): correo repetido en el archivo`); } });
      r.d.validas.forEach(v => { if (!repetidos.has(v.correo)) validas.push(Object.assign({ lote: i }, v)); });
    }
    errores.sort((a, b) => numRenglon(a) - numRenglon(b));
    out.textContent = '';
    const nuevas = validas.filter(v => !v.existe), ya = validas.filter(v => v.existe);
    out.appendChild(el('p', `${fmt.format(validas.length)} renglones válidos (${fmt.format(nuevas.length)} cuentas nuevas, ${fmt.format(ya.length)} ya existen y no se tocarán) · ${fmt.format(errores.length)} con errores.`, 'aviso ' + (errores.length ? 'alerta' : 'ok')));
    if (errores.length) { const ul = el('ul'); errores.forEach(x => ul.appendChild(el('li', x))); out.appendChild(ul);
      out.appendChild(el('p', 'Corrige esos renglones en el archivo y vuelve a revisarlo. No se dio de alta a nadie.', 'nota')); return; }
    const tw = el('div', null, 'tabla-envoltura'), t = el('table'), th = el('thead'), tb = el('tbody'); t.append(th, tb); tw.appendChild(t); recorrible(tw, 'Cuentas del archivo');
    const h = el('tr'); ['Correo', 'Nombre', 'Área y cargo', 'Institución', 'Permiso', ''].forEach(x => { const c = el('th', x); c.scope = 'col'; h.appendChild(c); }); th.appendChild(h);
    validas.forEach(v => { const tr = el('tr', null, v.existe ? 'inactiva' : ''); [v.correo, v.nombre, `${v.area} · ${v.cargo}`, v.institucion + ' · ' + (v.alcaldia || v.entidad || '—'), v.rol === 'admin' ? 'Administración' : 'Consulta', v.existe ? 'Ya existe' : 'Nueva'].forEach(x => celda(tr, x)); tb.appendChild(tr); });
    out.appendChild(tw);
    if (nuevas.length) { const b = el('button', `Dar de alta ${fmt.format(nuevas.length)} cuenta${nuevas.length === 1 ? '' : 's'}`, 'btn'); b.type = 'button';
      b.addEventListener('click', () => { if (confirm(`¿Dar de alta ${nuevas.length} cuenta(s)? Se generará una contraseña temporal para cada una.`)) aplicar(nuevas); }); out.appendChild(b); }
  }

  async function aplicar(nuevas) {
    const out = $('m-resultado'); $('m-err').hidden = true; out.textContent = '';
    $('m-revisar').disabled = true;
    const total = nuevas.length, porLote = LOTES.map((l, i) => nuevas.filter(v => v.lote === i).length);
    const estado = el('p', `Dando de alta… 0 de ${fmt.format(total)}`), barra = el('progress');
    barra.max = total; barra.value = 0; barra.setAttribute('aria-hidden', 'true'); out.append(estado, barra);
    const hechas = [], existentes = []; let hechos = 0, error = '', enviados = 0, sinSesion = false;
    for (let i = 0; i < LOTES.length; i++) {
      if (!porLote[i]) continue;   // en ese envío no hay cuentas nuevas
      let r; try { r = await llama('admin/usuarios/masiva', 'POST', { csv: LOTES[i].csv, aplicar: true }, true); } catch (e) { error = sinRed; break; }
      if (r.status === 401) { error = 'Tu sesión terminó. Descarga primero las contraseñas y después vuelve a iniciar sesión.'; sinSesion = true; break; }
      if (!r.ok || !r.d.aplicado) { error = r.d.error || 'El servidor encontró errores en ese envío; vuelve a revisar el archivo.'; break; }
      enviados++;
      hechas.push(...r.d.hechas); existentes.push(...r.d.existentes); hechos += porLote[i];
      if (hechas.length) PENDIENTES = true;
      barra.value = hechos; estado.textContent = `Dando de alta… ${fmt.format(hechos)} de ${fmt.format(total)}`;
    }
    out.textContent = ''; $('m-revisar').disabled = false;
    const conEnvios = porLote.filter(Boolean).length;
    if (error) {
      out.appendChild(el('p', `Se detuvo en el envío ${fmt.format(enviados + 1)} de ${fmt.format(conEnvios)}: ${error} ` +
        (hechas.length ? `Antes se crearon ${fmt.format(hechas.length)} cuentas; descarga abajo sus contraseñas.` : 'No se creó ninguna cuenta.'), 'aviso alerta'));
      if (hechas.length) { const ul = el('ul'); hechas.forEach(c => ul.appendChild(el('li', `${c.correo} · ${c.nombre}`))); out.appendChild(ul); }
      out.appendChild(el('p', 'Para las que faltan, vuelve a revisar y aplicar el mismo archivo: las cuentas ya creadas no se tocan ni cambian de contraseña.', 'nota'));
    } else out.appendChild(el('p', `Listo: ${fmt.format(hechas.length)} cuentas creadas${existentes.length ? `; ${fmt.format(existentes.length)} ya existían y no se tocaron` : ''}.`, 'aviso ok'));
    if (hechas.length) {   // contraseñas temporales una sola vez, en un CSV que se arma aquí
      const filas = ['correo,nombre,institucion,alcaldia,dependencia_u_organizacion,contrasena_temporal'].concat(hechas.map(c => [c.correo, c.nombre, c.institucion, c.alcaldia || '', c.entidad || '', c.contrasena_temporal].map(q).join(',')));
      const nombre = `cuentas_con_contrasenas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      const caja = el('div', null, 'clave'); caja.appendChild(el('b', 'Contraseñas temporales (se muestran una sola vez). '));
      caja.appendChild(el('span', 'Descarga el archivo, repártelas por un medio seguro y por separado del correo de cada cuenta, y bórralo después. Al entrar, cada persona creará su propia contraseña.'));
      const b = el('button', 'Descargar contraseñas (CSV)', 'btn'); b.type = 'button'; b.addEventListener('click', () => { descarga(nombre, filas.join('\r\n')); PENDIENTES = false; }); caja.appendChild(b);
      out.appendChild(caja);
    }
    if (!error) { $('m-archivo').value = ''; LOTES = []; }
    if (!sinSesion) cargaPersonas(); }
  $('m-revisar').addEventListener('click', () => revisar());

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
      fila(tg, [g.institucion, g.alcaldia || g.entidad || '—', g.personas, g.accesos, g.consultas, g.descargas, barra]); });
    const tt = $('u-territorio'); tt.textContent = ''; if (!d.alcaldias_consultadas.length) vacia(tt, 3); d.alcaldias_consultadas.forEach(a => fila(tt, [a.alcaldia, a.consultas, a.descargas]));
    const ta = $('u-archivos'); ta.textContent = ''; if (!d.archivos.length) vacia(ta, 2); d.archivos.forEach(a => fila(ta, [ARCHIVO[a.tipo] || a.tipo, a.n]));
    const tp = $('u-persona'); tp.textContent = ''; if (!d.por_persona.length) vacia(tp, 6);
    d.por_persona.forEach(p => { const n = el('span'); n.appendChild(el('b', p.nombre)); n.appendChild(el('br')); n.appendChild(el('span', p.correo));
      fila(tp, [n, p.institucion + (p.alcaldia || p.entidad ? ' · ' + (p.alcaldia || p.entidad) : ''), p.accesos, p.consultas, p.descargas, fecha(p.ultimo)]); });
  }
  $('f-usos').addEventListener('submit', e => { e.preventDefault(); cargaUsos(); });

  // ---------- al abrir: solo con sesión y permiso de administración ----------
  llama('yo').then(r => { YO = r.d;
    if (r.d.debe_cambiar) { location.assign('../?cambiar=1'); return; }
    $('yo').textContent = `${r.d.nombre} · ${r.d.correo}`;
    if (r.d.rol !== 'admin') { const s = $('sin-permiso'); s.textContent = 'Tu cuenta no tiene permiso de administración. Si lo necesitas, pídelo a quien administra la herramienta.'; s.hidden = false; return; }
    $('panel').hidden = false; cargaCatalogos().then(cargaPersonas); }).catch(() => {});
})();
