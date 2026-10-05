// Pantalla de acceso de «Calles prioritarias para reforestar». Habla con el módulo de sesión (/api/calles/).
// Sin programas en línea: funciona con la política de seguridad de contenido estricta del sitio.
'use strict';
(function () {
  const API = '/api/calles/', HERRAMIENTA = '/calles-prioritarias/';
  const $ = id => document.getElementById(id);
  const p = new URLSearchParams(location.search);
  // a dónde volver tras entrar: solo dentro de la herramienta (el servidor lo vuelve a revisar)
  // nginx la manda sin codificar (?volver=/calles-prioritarias/?a=007&b=con): todo lo que sigue a «volver=» es la dirección de regreso
  const crudo = (location.search.match(/[?&]volver=(.*)$/) || [])[1] || '';
  const decodifica = t => { try { return /%2F/i.test(t) ? decodeURIComponent(t) : t; } catch (e) { return ''; } };
  const volver = (v => (v && v.startsWith(HERRAMIENTA) && !v.startsWith('//')) ? v : HERRAMIENTA)(decodifica(crudo));

  const aviso = (t, tipo) => { const a = $('aviso'); a.textContent = t; a.className = 'aviso ' + (tipo || 'ok'); a.hidden = !t; };
  const error = (id, t) => { const e = $(id); if (!e) return; e.textContent = t || ''; e.hidden = !t;
    const campo = $(id.replace(/-err$/, '')); if (campo && campo.tagName === 'INPUT') campo.setAttribute('aria-invalid', t ? 'true' : 'false'); };
  const limpia = f => f.querySelectorAll('.error').forEach(e => error(e.id, ''));
  const ocupado = (f, si) => { const b = f.querySelector('[type=submit]'); if (!b.dataset.txt) b.dataset.txt = b.textContent;
    b.disabled = si; b.textContent = si ? 'Un momento…' : b.dataset.txt; };
  async function llama(ruta, cuerpo) {
    const r = await fetch(API + ruta, { method: cuerpo ? 'POST' : 'GET', credentials: 'same-origin',
      headers: cuerpo ? { 'Content-Type': 'application/json' } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, d };
  }
  const sinRed = () => 'No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo.';

  // mostrar u ocultar la contraseña (criterio 7)
  document.querySelectorAll('button.ver').forEach(b => b.addEventListener('click', () => {
    const i = $(b.getAttribute('aria-controls')); const ver = i.type === 'password';
    i.type = ver ? 'text' : 'password'; b.setAttribute('aria-pressed', String(ver)); b.textContent = ver ? 'Ocultar' : 'Mostrar'; i.focus(); }));

  function aCambiar(desdeTemporal) {
    $('f-entrar').hidden = true; $('f-cambiar').hidden = false;
    if (!desdeTemporal) { $('cambiar-titulo').textContent = 'Cambia tu contraseña'; $('cambiar-nota').textContent = 'Escribe tu contraseña actual y la nueva: al menos 12 caracteres.'; }
    $('cambiar-titulo').focus();
  }

  // ---- entrar ----
  $('f-entrar').addEventListener('submit', async e => { e.preventDefault(); const f = e.target; limpia(f); aviso('');
    const correo = $('correo').value.trim(), contrasena = $('contrasena').value;
    let mal = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { error('correo-err', 'Escribe tu correo completo, por ejemplo nombre@correo.com.'); mal = true; }
    if (!contrasena) { error('contrasena-err', 'Escribe tu contraseña.'); mal = true; }
    if (mal) { f.querySelector('[aria-invalid=true]').focus(); return; }
    ocupado(f, true);
    try { const r = await llama('entrar', { correo, contrasena, volver });
      if (!r.ok) { error('entrar-err', r.d.error || 'No fue posible entrar. Inténtalo de nuevo.'); $('contrasena').value = ''; $('contrasena').focus(); return; }
      if (r.d.debe_cambiar) { $('actual').value = contrasena; aCambiar(true); return; }
      location.assign(r.d.volver || volver);   // criterio 13: regresa a la consulta que la persona pidió
    } catch (err) { error('entrar-err', sinRed()); } finally { ocupado(f, false); } });

  // ---- cambiar la contraseña ----
  $('f-cambiar').addEventListener('submit', async e => { e.preventDefault(); const f = e.target; limpia(f);
    const actual = $('actual').value, nueva = $('nueva').value, nueva2 = $('nueva2').value; let mal = false;
    if (!actual) { error('actual-err', 'Escribe tu contraseña actual.'); mal = true; }
    if ([...nueva].length < 12) { error('nueva-err', 'La contraseña nueva debe tener al menos 12 caracteres.'); mal = true; }
    else if (nueva !== nueva2) { error('nueva2-err', 'Las dos contraseñas nuevas no coinciden.'); mal = true; }
    if (mal) { f.querySelector('[aria-invalid=true]').focus(); return; }
    ocupado(f, true);
    try { const r = await llama('contrasena', { actual, nueva, volver });
      if (!r.ok) { if (r.d.campo) { error(r.d.campo + '-err', r.d.error); $(r.d.campo).focus(); } else error('cambiar-err', r.d.error || 'No fue posible guardar la contraseña.'); return; }
      location.assign(r.d.volver || volver);
    } catch (err) { error('cambiar-err', sinRed()); } finally { ocupado(f, false); } });

  // ---- al abrir ----
  if (p.get('salida')) aviso('Cerraste tu sesión.');
  if (p.get('vencida')) aviso('Tu sesión terminó. Vuelve a iniciar sesión para continuar.', 'alerta');
  // con sesión abierta: si debe cambiar la contraseña se pide; si pidió cambiarla (?cambiar=1) también; si no, a la herramienta
  llama('yo').then(r => { if (!r.ok) { $('correo').focus(); return; }
    if (r.d.debe_cambiar || p.get('cambiar')) { aCambiar(r.d.debe_cambiar); return; }
    location.replace(volver); }).catch(() => $('correo').focus());
})();
