import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
]);

export default eslintConfig;
