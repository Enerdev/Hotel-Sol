{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "react-hooks", "react-refresh"],
  "rules": {
    // Reglas básicas
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "off", // Usamos la regla de TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],

    // React
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],

    // TypeScript
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",

    // Estilo
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error"
  },
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}