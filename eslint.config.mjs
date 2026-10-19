import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Strict rules for the site (Engineering Library: D-02, D-03, D-05, D-06, D-07, A-15, E-10).
 * - Type-aware checks catch unawaited promises and unsafe `any` flows.
 * - Size and complexity limits keep every function small enough to read.
 * - Tests may use long `describe` blocks, so the size limits do not apply to them.
 */
const TS_FILES = ["**/*.ts", "**/*.tsx"];

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", "reports/**", "graphify-out/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({ ...config, files: TS_FILES })),
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",


      complexity: ["error", 10],
      "max-params": ["error", 4],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: TS_FILES,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description", minimumDescriptionLength: 10 },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: { "max-lines-per-function": "off", "max-lines": "off" },
  },
);
