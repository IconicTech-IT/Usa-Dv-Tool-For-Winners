import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * قواعد الـhooks هي السبب الأساسي للملف ده — early return قبل hook
 * بيعدي من TypeScript وبيكسر في التشغيل.
 */
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // دول بيمسكوا باجات حقيقية — يفضلوا errors
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // قواعد الـReact Compiler الجديدة: الأنماط اللي بتشتكي منها هنا
      // مقصودة وصحيحة (حارس الhydration، وقراية الوقت الحالي لعدّاد).
      // بنسيبها warnings عشان تفضل مرئية من غير ما توقف الـCI.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
