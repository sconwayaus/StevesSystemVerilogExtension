import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 1. Apply recommended ESLint rules
  js.configs.recommended,
  
  // 2. Apply recommended TypeScript-specific rules
  ...tseslint.configs.recommended,
  
  // 3. Add your custom rule configurations
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Warns when you use 'any' type
      "@typescript-eslint/no-unused-vars": "error", // Errors on unused TS variables
    },
  }
);