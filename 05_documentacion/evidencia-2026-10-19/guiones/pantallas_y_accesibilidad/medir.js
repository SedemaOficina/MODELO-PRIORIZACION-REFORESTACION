// Medición en la página (se inyecta con page.evaluate). Devuelve desborde, controles tapados, cortados, encimados,
// objetivos táctiles chicos y textos cortados. Solo cuenta lo visible y no inerte.
module.exports = function medir() {
  const vw = innerWidth, vh = innerHeight;
  const desc = e => { if (!e) return '(nada)'; let s = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const t = (e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 40); return s + (t ? ` «${t}»` : ''); };
  const visible = e => { if (!e.isConnected || e.closest('[hidden],[inert]')) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || +s.opacity === 0) return false; }
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // rectángulo visible, recortado por los ancestros que recortan y por la ventana
  const recorte = e => { const r = e.getBoundingClientRect(); let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom, porX = null;
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(s.overflowX + s.overflowY)) { const q = a.getBoundingClientRect();
      if (q.left > x1 + 1 || q.right < x2 - 1) if (!/(auto|scroll)/.test(s.overflowX) && !porX) porX = a;
      x1 = Math.max(x1, q.left); y1 = Math.max(y1, q.top); x2 = Math.min(x2, q.right); y2 = Math.min(y2, q.bottom); } }
    return { x1: Math.max(x1, 0), y1: Math.max(y1, 0), x2: Math.min(x2, vw), y2: Math.min(y2, vh), r, porX }; };
  const SEL = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=option], [role=menuitem], [tabindex]:not([tabindex="-1"])';
  const ctrls = [...document.querySelectorAll(SEL)].filter(e => e.tagName !== 'CANVAS' && visible(e));
  const res = { vw, vh, desborde: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw, scrollX: scrollX,
    nControles: ctrls.length, tapados: [], cortados: [], encimados: [], chicos24: [], chicos44: [], textoCortado: [], fueraDePantalla: [] };
  const cajas = [];
  for (const e of ctrls) {
    const { x1, y1, x2, y2, r, porX } = recorte(e);
    const enLinea = getComputedStyle(e).display === 'inline' && e.tagName === 'A';
    if (x2 - x1 <= 1 || y2 - y1 <= 1) { if (r.right < 0 || r.left > vw) res.fueraDePantalla.push(desc(e)); continue; }   // fuera de la vista de su contenedor (desplazable): no cuenta
    // cortado a lo ancho por la ventana o por un contenedor que no se desplaza
    if (r.left < -1 || r.right > vw + 1) res.cortados.push({ c: desc(e), por: 'ventana', r: [r.left, r.top, r.width, r.height].map(Math.round) });
    else if (porX && (r.right - r.left) - (x2 - x1) > 2) res.cortados.push({ c: desc(e), por: desc(porX), r: [r.left, r.top, r.width, r.height].map(Math.round) });
    // tapado: el centro de su parte visible lo ocupa otro elemento
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2; const h = document.elementFromPoint(cx, cy);
    if (h && h !== e && !e.contains(h) && !(h.contains(e) && h.tagName === 'LABEL') && !(e.tagName === 'INPUT' && e.labels && [...e.labels].some(l => l.contains(h))))
      res.tapados.push({ c: desc(e), por: desc(h), r: [r.left, r.top, r.width, r.height].map(Math.round) });
    // objetivo táctil (WCAG 2.5.8: 24 px; recomendación 44 px). Los enlaces dentro de un renglón de texto quedan aparte.
    const w = Math.round(r.width), hh = Math.round(r.height);
    if (e.type === 'range' || e.tagName === 'INPUT' && /checkbox|radio/.test(e.type) && e.labels && e.labels.length) { /* se mide su etiqueta */ }
    else { if (w < 24 || hh < 24) res.chicos24.push({ c: desc(e), w, h: hh, enLinea }); else if (w < 44 || hh < 44) res.chicos44.push({ c: desc(e), w, h: hh, enLinea }); }
    cajas.push({ e, r: { left: x1, top: y1, right: x2, bottom: y2 }, full: r });
  }
  // excepción de espaciado de WCAG 2.5.8: un círculo de 24 px centrado en el objetivo no toca otro objetivo
  for (const x of res.chicos24) { const k = cajas.find(c => desc(c.e) === x.c); if (!k) continue; const cx = (k.full.left + k.full.right) / 2, cy = (k.full.top + k.full.bottom) / 2;
    x.espaciado = !cajas.some(o => o !== k && !o.e.contains(k.e) && !k.e.contains(o.e) && Math.max(o.r.left - cx, 0, cx - o.r.right) ** 2 + Math.max(o.r.top - cy, 0, cy - o.r.bottom) ** 2 < 144); }
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i], b = cajas[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix > 2 && iy > 2) { const la = a.e.closest('label'), lb = b.e.closest('label'); if (la && la === lb) continue; res.encimados.push({ a: desc(a.e), b: desc(b.e), area: Math.round(ix * iy) }); }
  }
  // textos cortados: un elemento con texto propio cuyo contenido no cabe y que recorta sin puntos suspensivos
  for (const e of document.querySelectorAll('body *')) {
    if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; if (!visible(e) || e.getBoundingClientRect().width <= 2) continue;
    const s = getComputedStyle(e); if (!/(hidden|clip)/.test(s.overflowX) || s.textOverflow === 'ellipsis') continue;
    if (e.scrollWidth > e.clientWidth + 2) res.textoCortado.push({ c: desc(e), sobra: e.scrollWidth - e.clientWidth });
  }
  return res;
};
