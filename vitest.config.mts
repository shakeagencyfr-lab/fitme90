import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Le build Next ne doit pas essayer de compiler les tests.
    exclude: ["node_modules", ".next"],
  },
});
