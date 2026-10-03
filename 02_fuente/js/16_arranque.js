// Arranque: estado inicial de la herramienta.
// ---------- arranque ----------
if (isPhone()) setLayer('fr', false);   // en pantallas chicas se dibujan primero las colonias
document.body.dataset.resp = resp;
setSel('');
setTab('res');
if (isPhone()) setSheetState('peek');
// consulta indicada en la dirección (enlace compartido o recarga); después, cada cambio de consulta se anota en el historial
aplicarURL(); restaurando = false;
try { history.replaceState({consulta:true}, '', urlEstado()); } catch(e){}
// errores inesperados después de cargar: se avisa en lugar de fallar en silencio (auditoría H-035)
addEventListener('unhandledrejection', e=>{ console.error(e.reason); avisoMapa('<b>Ocurrió un error inesperado.</b> Si algo dejó de responder, recarga la página.', true); });
