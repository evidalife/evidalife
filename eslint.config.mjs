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
  ]),
  {
    // Ban native browser confirm/alert/prompt — use useConfirmDialog() from @/components/ui/ConfirmDialog instead.
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "confirm",
          message: "Use useConfirmDialog() from @/components/ui/ConfirmDialog instead of native confirm().",
        },
        {
          name: "alert",
          message: "Use toast notifications instead of native alert().",
        },
        {
          name: "prompt",
          message: "Use a custom input modal instead of native prompt().",
        },
      ],
    },
  },
]);

export default eslintConfig;
