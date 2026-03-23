import { defineConfig, globalIgnores } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";

const eslintConfig = defineConfig([
  ...nextJsConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
