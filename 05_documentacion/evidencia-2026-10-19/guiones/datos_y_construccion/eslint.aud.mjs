// Configuración de la auditoría (no forma parte del proyecto): amplía la revisión a sw.js, config.js y el worker de Excel
import js from '@eslint/js';
import globals from 'globals';
const base = { ...js.configs.recommended.rules, 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] };
export default [
  { files: ['docs/app.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, deck: 'readonly', pako: 'readonly', DeckGL: 'readonly' } },
    rules: { ...base, 'no-shadow': 'warn', 'eqeqeq': ['warn', 'smart'], 'no-implicit-globals': 'warn', 'no-unreachable-loop': 'error', 'no-self-compare': 'error', 'no-template-curly-in-string': 'warn', 'no-unmodified-loop-condition': 'error', 'no-constant-binary-expression': 'error', 'no-dupe-else-if': 'error', 'no-useless-escape': 'off' } },
  { files: ['docs/sw.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.serviceworker } }, rules: base },
  { files: ['docs/config.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } }, rules: base },
  { files: ['docs/libs/excel_worker.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.worker, XLSX: 'readonly' } }, rules: base },
];
