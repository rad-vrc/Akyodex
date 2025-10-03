import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import pluginPrettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    plugins: { prettier: pluginPrettier },
    extends: ["js/recommended", prettier],
    rules: {
      "prettier/prettier": "error",
    },
  },
]);
