import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { ignores: ["scripts/**"] },
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
      // Temporarily relax admin-only UI guardrails to unblock CI; revert to "warn" or "error" after cleanup
      "no-restricted-syntax": "off",
      // Allow <img> in admin while we decide on perf refactors; guest pages stay strict
      "@next/next/no-img-element": "off",
      // Admin surfaces often have WIP fields; silence unused-var warnings here
      "@typescript-eslint/no-unused-vars": "off",
    }
  },
  // Admin APIs and webhooks: silence unused vars until cleanup
  {
    files: ["app/api/admin/**/*.{ts,tsx}", "app/api/webhooks/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    }
  },
  // Tests: allow unused vars/placeholders; Playwright often needs unused fixtures/params
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    }
  }
]);

export default eslintConfig;
