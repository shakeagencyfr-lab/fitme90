import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Client Anthropic — SERVEUR UNIQUEMENT. La clé ne quitte jamais Vercel.
// Sans argument : le SDK lit ANTHROPIC_API_KEY dans l'environnement (défaut,
// non cassant). Avec `apiKey` : on utilise la clé du tenant (BYOK, Lot 0).
export function anthropic(apiKey?: string) {
  return apiKey ? new Anthropic({ apiKey }) : new Anthropic();
}

// Modèles par défaut, surchargeables par variable d'environnement pour
// ajuster le coût sans redéploiement (ex. passer la génération en
// claude-sonnet-5). Défaut : le modèle le plus capable.
export const MODELS = {
  generate: process.env.ANTHROPIC_MODEL_GENERATE ?? "claude-opus-5",
  coach: process.env.ANTHROPIC_MODEL_COACH ?? "claude-opus-5",
  recipes: process.env.ANTHROPIC_MODEL_RECIPES ?? "claude-opus-5",
  analyzeGym: process.env.ANTHROPIC_MODEL_ANALYZE ?? "claude-opus-5",
} as const;

/**
 * Extrait le texte concaténé des blocs `text` d'une réponse Messages.
 * (Le reste — thinking, etc. — est ignoré.)
 */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Extrait un objet JSON d'une réponse modèle, même entourée de texte
 * (garde-fou : on demande du JSON pur, mais on tolère un éventuel habillage).
 */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Réponse du modèle non parsable en JSON.");
  }
}
