import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional project-specific ignores:
    ".venv/**",
    "node_modules/**",
    "docs/backend/**",
    "*.sql",
    "*.py",
  ]),
  // Design system guardrails
  {
    files: ["app/admin/**/*.{ts,tsx}", "components/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/bg-white|bg-slate-|text-slate-|border-slate-|bg-emerald-|bg-amber-|bg-rose-|text-rose-|bg-blue-|text-blue-|bg-zinc-/]",
          message: "⚠️ Use semantic design tokens instead of raw Tailwind colors. See docs/design-system.md"
        }
      ]
    }
  }
]);

export default eslintConfig;
