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
  // Génération du programme : livrable premium, on garde le modèle le plus
  // capable (Opus 5).
  generate: process.env.ANTHROPIC_MODEL_GENERATE ?? "claude-opus-5",
  // Chat coach : dialogue, historique rejoué à chaque message. Haiku 4.5 suffit
  // largement (fenêtre 200k) et coûte ~5x moins cher qu'Opus. C'est le principal
  // poste de coût récurrent.
  coach: process.env.ANTHROPIC_MODEL_COACH ?? "claude-haiku-4-5",
  // Fonctions annexes (alternative d'exercice, fiche exercice IA) : bon
  // compromis qualité/prix en Sonnet 5.
  assist: process.env.ANTHROPIC_MODEL_ASSIST ?? "claude-sonnet-5",
  // Recettes (texte + photo → recette) : Sonnet 5.
  recipes: process.env.ANTHROPIC_MODEL_RECIPES ?? "claude-sonnet-5",
  // Analyse photo de la salle : reconnaissance de matériel, on garde Opus 5.
  analyzeGym: process.env.ANTHROPIC_MODEL_ANALYZE ?? "claude-opus-5",
} as const;

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Le paramètre `output_config.effort` n'est PAS supporté par tous les modèles :
 * il déclenche une erreur 400 sur Haiku 4.5 et les générations ≤ 4.5 (l'effort
 * est une fonctionnalité des familles 4.6+ et 5). On renvoie donc `output_config`
 * uniquement pour les modèles qui l'acceptent, sinon un objet vide. À étaler dans
 * l'appel `messages.create` :  `{ ...effortConfig(model, "low") }`.
 */
export function effortConfig(model: string, effort: Effort) {
  // Modèles SANS support de l'effort : Haiku 4.5, Sonnet 4.5, et familles 3.x.
  const noEffort = /haiku-4-5|haiku-4-0|sonnet-4-5|-3-5-|claude-3/.test(model);
  return noEffort ? {} : { output_config: { effort } };
}

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
