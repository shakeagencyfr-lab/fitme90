import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Le build Next ne doit pas essayer de compiler les tests.
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      // `server-only` lève dès l'import hors composant serveur. Le garde-fou n'a
      // pas de sens sous Vitest : on le neutralise pour tester la logique pure
      // des modules serveur. Le code de production garde le vrai paquet.
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname,
      "@": new URL(".", import.meta.url).pathname,
    },
  },
});
