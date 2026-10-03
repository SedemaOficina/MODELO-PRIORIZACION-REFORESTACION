// Revisión estática del programa ya ensamblado (docs/app.js): variables sin definir, sin usar, duplicadas, etc.
// Uso: npm install && npm run lint      (auditoría H-038)
import js from '@eslint/js';
import globals from 'globals';

export default [
  { files: ['docs/app.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script',
      // deck y pako llegan de libs/; claude solo existe cuando la herramienta corre como artefacto de respaldo
      globals: { ...globals.browser, deck: 'readonly', pako: 'readonly', DeckGL: 'readonly', claude: 'readonly' } },
    rules: { ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }] } },
];
