// B4 · Simulación de daltonismo (Machado, Oliveira y Fernandes 2009, severidad 1.0) sobre la rampa de prioridad y los símbolos del inventario.
// Calcula la diferencia de color CIEDE2000 entre clases vecinas y entre símbolos, con y sin simulación, y toma capturas del mapa filtrado.
// Uso: node daltonismo.js. Lee los colores de r2/02_fuente/css/01_variables.css. Escribe daltonismo.json y capturas/dalton_*.png.
const C = require('./comun.js'); const { L, path, fs } = C;
const css = fs.readFileSync(path.join(C.R2, '02_fuente', 'css', '01_variables.css'), 'utf8');
const v = n => { const m = css.match(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})')); return m[1]; };
const RAMPA = ['p4', 'p3', 'p2', 'p1', 'p0'].map(n => ({ n: { p4: 'Muy Alta', p3: 'Alta', p2: 'Media', p1: 'Baja', p0: 'Muy Baja' }[n], hex: v(n) }));
const INV = ['inv-cepa', 'inv-tocon', 'inv-muerto'].map(n => ({ n, hex: v(n) }));
const M = { protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]] };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4, gam = c => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
const sim = (h, m) => { const l = rgb(h).map(lin); return m.map(f => Math.min(1, Math.max(0, gam(f[0] * l[0] + f[1] * l[1] + f[2] * l[2])))); };
function lab(c) { const [r, g, b] = c.map(lin); let X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; [X, Y, Z] = [f(X), f(Y), f(Z)]; return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; }
function de00(a, b) { const [L1, a1, b1] = a, [L2, a2, b2] = b, rad = Math.PI / 180; const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7))); const a1p = a1 * (1 + G), a2p = a2 * (1 + G); const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (x, y) => { const t = Math.atan2(y, x) / rad; return t < 0 ? t + 360 : t; }; const h1 = h(a1p, b1), h2 = h(a2p, b2);
  const dL = L2 - L1, dC = C2p - C1p; let dh = h2 - h1; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad);
  const Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2; let hm = h1 + h2; if (C1p * C2p !== 0) { if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360; hm /= 2; }
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + 0.015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T, RT = -2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH)); }
const res = { rampa: {}, inventario: {} };
for (const tipo of ['normal', ...Object.keys(M)]) { const f = h => tipo === 'normal' ? rgb(h) : sim(h, M[tipo]);
  res.rampa[tipo] = RAMPA.slice(0, -1).map((c, i) => ({ par: c.n + ' / ' + RAMPA[i + 1].n, dE00: +de00(lab(f(c.hex)), lab(f(RAMPA[i + 1].hex))).toFixed(1) }));
  res.inventario[tipo] = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => ({ par: INV[i].n + ' / ' + INV[j].n, dE00: +de00(lab(f(INV[i].hex)), lab(f(INV[j].hex))).toFixed(1) })); }
for (const t of Object.keys(res.rampa)) console.log(t.padEnd(13), 'rampa:', res.rampa[t].map(x => `${x.par} ${x.dE00}`).join(' · '), '| inventario:', res.inventario[t].map(x => `${x.par.replace(/inv-/g, '')} ${x.dE00}`).join(' · '));
(async () => { const srv = await L.servidor(0); const b = await L.lanzar(); const ctx = await C.contexto(b, C.ANCHOS[5]);
  const p = await C.pagina(ctx, srv.url + '?modo=ligero&a=007'); await p.$eval('#zcapas', x => x.click()); await p.waitForTimeout(800);
  await p.evaluate(v => window.__MAPA.ir({ ...v, zoom: 15.2 }, 0), { longitude: -99.0685, latitude: 19.3745 }); await p.waitForTimeout(6000);
  for (const t of ['normal', ...Object.keys(M)]) {
    await p.evaluate(([t, m]) => { let s = document.getElementById('__dalton'); if (s) s.remove(); document.documentElement.style.filter = '';
      if (t === 'normal') return; const ns = 'http://www.w3.org/2000/svg'; s = document.createElementNS(ns, 'svg'); s.id = '__dalton'; s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
      s.innerHTML = `<filter id="f" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${m.map(r => r.join(' ') + ' 0 0').join(' ')} 0 0 0 1 0"/></filter>`; document.body.appendChild(s); document.documentElement.style.filter = 'url(#f)'; }, [t, M[t] || null]);
    await p.waitForTimeout(800); await p.screenshot({ path: path.join(C.CAP, `dalton_${t}.png`) }); }
  C.guardaJSON('daltonismo.json', res); await b.close(); srv.close(); })();
