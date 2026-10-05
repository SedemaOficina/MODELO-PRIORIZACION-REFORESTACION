// Huellas de contraseña con scrypt (incluido en Node: sin dependencias nativas que compilar en el servidor).
// Formato guardado: scrypt$N$r$p$sal_base64$huella_base64. Parámetros según OWASP (N = 2^17, r = 8, p = 1).
'use strict';
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);   // asíncrono: un inicio de sesión no detiene a los demás módulos del backend

const N = +(process.env.CALLES_SCRYPT_N || 2 ** 17), R = 8, P = 1, LARGO = 64;   // CALLES_SCRYPT_N solo para pruebas
const opciones = (n, r, p) => ({ N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });

async function huella(contrasena) {
  const sal = crypto.randomBytes(16);
  const h = await scrypt(contrasena.normalize('NFC'), sal, LARGO, opciones(N, R, P));
  return ['scrypt', N, R, P, sal.toString('base64'), h.toString('base64')].join('$');
}

async function verifica(contrasena, guardada) {
  const [alg, n, r, p, sal, h] = String(guardada || '').split('$');
  if (alg !== 'scrypt' || !sal || !h) return false;
  const esperado = Buffer.from(h, 'base64');
  const calculado = await scrypt(String(contrasena).normalize('NFC'), Buffer.from(sal, 'base64'), esperado.length, opciones(+n, +r, +p));
  return crypto.timingSafeEqual(esperado, calculado);
}

// Reglas mínimas: 12 caracteres o más; no igual al correo. (Frases largas son mejores que símbolos raros: NIST 800-63B.)
function revisaNueva(nueva, correo) {
  if (typeof nueva !== 'string' || [...nueva].length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
  if ([...nueva].length > 200) return 'La contraseña es demasiado larga.';
  if (correo && nueva.toLowerCase().includes(String(correo).split('@')[0].toLowerCase())) return 'La contraseña no debe contener tu correo.';
  return null;
}

// Contraseña temporal para altas y restablecimientos: 4 palabras cortas + 2 dígitos, fácil de dictar.
const PALABRAS = ['arbol', 'cedro', 'fresno', 'jacaranda', 'ahuehuete', 'colorin', 'pirul', 'trueno', 'encino', 'ocote', 'sauce', 'tabachin',
  'banqueta', 'calle', 'colonia', 'sombra', 'raiz', 'hoja', 'semilla', 'brote', 'lluvia', 'viento', 'piedra', 'monte'];
function temporal() {
  const p = () => PALABRAS[crypto.randomInt(PALABRAS.length)];
  return `${p()}-${p()}-${p()}-${p()}-${crypto.randomInt(10, 100)}`;
}

module.exports = { huella, verifica, revisaNueva, temporal };
