// Arranque: estado inicial de la herramienta.
// ---------- arranque ----------
if (isPhone()) setLayer('fr', false);   // en pantallas chicas se dibujan primero las colonias
document.body.dataset.resp = resp;
setSel('');
setTab('res');
if (isPhone()) setSheetState('peek');
