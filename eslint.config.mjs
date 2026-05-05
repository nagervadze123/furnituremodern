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
    // Phase 6 editorial reference: claude.ai/design export staged for
    // visual reference only. Hardcoded Georgian, no i18n, no
    // Next.js — never imported into the app graph. See
    // `_design-reference/README.md` for the contract.
    "_design-reference/**",
  ]),
]);

export default eslintConfig;
