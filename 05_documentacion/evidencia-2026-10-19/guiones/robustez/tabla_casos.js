// Arma las tablas de casos (ronda 1 y ronda 2) para el informe, desde los resultados guardados por los guiones.
const fs = require('fs');
const lee = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
const txt = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => /^(PASA|FALLA)/.test(l)).map(l => { const m = l.match(/^(PASA|FALLA)\s+(\S+) · (.*?) · (.*)$/); return { id: m[2], desc: m[3], obs: m[4], pasa: m[1] === 'PASA' }; });
const corta = s => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 150);
function tabla(titulo, r1, r2) { const m2 = new Map(r2.map(x => [x.id, x]));
  let o = `\n**${titulo}**\n\n| Caso | Qué se probó | Ronda 1 | Ronda 2 | Observado (ronda 2, o 1 si no hay) |\n|---|---|---|---|---|\n`;
  for (const a of r1) { const b = m2.get(a.id); o += `| ${a.id} | ${corta(a.desc)} | ${a.pasa ? 'Pasa' : '**Falla**'} | ${b ? (b.pasa ? 'Pasa' : '**Falla**') : '—'} | ${corta((b || a).obs)} |\n`; }
  for (const b of r2) if (!r1.some(a => a.id === b.id)) o += `| ${b.id} | ${corta(b.desc)} | — | ${b.pasa ? 'Pasa' : '**Falla**'} | ${corta(b.obs)} |\n`;
  return o; }
let s = '';
s += tabla('Módulo de acceso con pg-mem (backend_e2.mjs)', txt('backend_e2_ronda1.txt'), txt('backend_e2_ronda2.txt'));
s += tabla('Sitio · B5 (sitio_b5.js)', lee('sitio_b5_ronda1.json'), lee('sitio_b5_ronda2.json'));
const e1 = txt('sitio_e3_ronda1_AF.txt').filter(x => x.id.startsWith('A')).concat(lee('sitio_e3_ronda1_BCDEF.json'), lee('sitio_e3_ronda1_GHIJKL.json'));
const e2 = lee('sitio_e3_ronda2_ABCDEF.json').concat(lee('sitio_e3_ronda2_GHIJKL.json'));
s += tabla('Sitio · E3 (sitio_e3.js)', e1, e2);
s += tabla('Ficha PDF con segundo clic o toque (doble_pdf.js)', txt('doble_pdf_ronda1.txt').map((x, i) => ({ ...x, id: 'P-0' + (i + 1) })), txt('doble_pdf_ronda2.txt').map((x, i) => ({ ...x, id: 'P-0' + (i + 1) })));
s += tabla('Inicio de sesión con el servidor de demostración (login_e3.js)', lee('login_e3_ronda1.json'), lee('login_e3_ronda2.json'));
fs.writeFileSync('tablas_casos.md', s); console.log(s.split('\n').length, 'renglones');
