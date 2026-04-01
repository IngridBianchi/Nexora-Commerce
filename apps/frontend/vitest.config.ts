import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "."),
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts", "store/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/tests/**",
        "app/**/page.tsx",
        "app/**/layout.tsx"
      ],
      thresholds: {
        lines: 25,
        functions: 50,
        statements: 25,
        branches: 50
      }
    }
  }
})
