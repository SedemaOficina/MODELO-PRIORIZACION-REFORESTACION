// Revisión estática de lo que se publica, ya ensamblado: variables sin definir, sin usar, duplicadas, etc.
// docs/app.js, el proceso de servicio (sw.js), config.js y el worker de Excel (auditoría A1, sección 12).
// Uso: npm install && npm run lint
import js from '@eslint/js';
import globals from 'globals';

const reglas = { ...js.configs.recommended.rules,
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-empty': ['error', { allowEmptyCatch: true }] };
export default [
  { files: ['docs/app.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script',
      // deck y pako llegan de libs/
      globals: { ...globals.browser, deck: 'readonly', pako: 'readonly', DeckGL: 'readonly' } },
    rules: reglas },
  { files: ['docs/sw.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.serviceworker }, rules: reglas },
  // config.js es el primer programa de la página y se escribe en ES5: si el navegador es muy viejo, no debe romperse antes del aviso
  { files: ['docs/config.js'], languageOptions: { ecmaVersion: 5, sourceType: 'script', globals: globals.browser }, rules: reglas },
  { files: ['docs/libs/excel_worker.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.worker, XLSX: 'readonly' } }, rules: reglas },
];
