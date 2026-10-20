import js from '@eslint/js';
import globals from 'globals';
export default [{ files: ['02_fuente/js/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
  rules: { ...js.configs.recommended.rules, 'no-undef': 'off', 'no-unused-vars': 'off', 'no-empty': ['error', { allowEmptyCatch: true }] } }];
