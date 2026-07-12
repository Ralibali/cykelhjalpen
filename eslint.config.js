import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // The combined legacy Updro/Cykelhjälpen codebase still contains broad
      // response shapes. Keep them visible without making every release red.
      "@typescript-eslint/no-explicit-any": "warn",
      // shadcn/ui uses empty extension interfaces intentionally.
      "@typescript-eslint/no-empty-object-type": "off",
      // Tailwind's plugin API still commonly uses require() in config files.
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
);
