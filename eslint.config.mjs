import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".vercel/**",
      "out/**",
      "build/**",
      "public/sw.js",
      "sw.js",
      "next-env.d.ts",
      "scripts/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      ".cache/**",
      ".turbo/**",
      ".serena/**",
      "*.tsbuildinfo",
    ],
  },
];

export default eslintConfig;
