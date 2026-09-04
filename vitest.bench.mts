import { defineConfig } from "vitest/config";

/**
 * Configuration du banc d'essai de génération (`npm run compare:generation`).
 *
 * Autonome, et pas une extension de `vitest.config.mts` : fusionner les deux
 * réunit les listes d'inclusion, et le banc emmenait alors toute la suite avec
 * lui. Ici il est seul, ce qui est le but : ce fichier appelle vraiment l'API
 * Anthropic et coûte de l'argent, il ne doit jamais partir avec les tests.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/*.bench.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname,
      "@": new URL(".", import.meta.url).pathname,
    },
  },
});
