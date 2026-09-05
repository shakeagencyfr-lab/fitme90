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
  // Génération du programme : Sonnet 5.
  //
  // C'était Opus 5. Le poste pesait à lui seul plus que tout le reste réuni
  // (0,39 $ par génération, contre 0,005 $ pour un message de chat), pour un
  // travail très encadré : le brief impose la structure, le nombre de cycles,
  // les gabarits de séance, et un schéma JSON validé à l'arrivée. Sonnet 5
  // coûte deux fois et demie moins cher par jeton, en entrée comme en sortie,
  // et rend le même livrable sur une tâche aussi contrainte. Repasser sur Opus
  // ne demande qu'une variable d'environnement.
  generate: process.env.ANTHROPIC_MODEL_GENERATE ?? "claude-sonnet-5",
  // Tout le reste tourne sur Haiku 4.5 : fenêtre 200k, vision incluse, et de
  // loin le meilleur rapport qualité/prix.
  //
  // Chat coach : dialogue, historique rejoué à chaque message (poste de coût
  // récurrent principal).
  coach: process.env.ANTHROPIC_MODEL_COACH ?? "claude-haiku-4-5",
  // Fiche d'exercice rédigée par l'IA (les alternatives, elles, sont passées
  // à un moteur déterministe : voir lib/exercise-alternatives.ts).
  assist: process.env.ANTHROPIC_MODEL_ASSIST ?? "claude-haiku-4-5",
  // Photo d'aliments → recette (vision). Les recettes du jour, elles, sortent
  // d'un catalogue calculé sans IA : voir lib/recipe-engine.ts.
  recipes: process.env.ANTHROPIC_MODEL_RECIPES ?? "claude-haiku-4-5",
  // Analyse photo de la salle (reconnaissance de matériel, vision Haiku).
  analyzeGym: process.env.ANTHROPIC_MODEL_ANALYZE ?? "claude-haiku-4-5",
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

/**
 * Consommation d'UN appel, telle que l'API la facture.
 *
 * Les cinq seaux sont distincts parce que leurs tarifs le sont : entrée à 1,
 * sortie à 5, lecture de cache à 0,1, écriture courte à 1,25, écriture longue
 * à 2. Les additionner ferait perdre le prix.
 */
export interface RecordedUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  /** Écritures dans le cache 5 minutes (125 % du prix d'entrée). */
  cache_write_tokens: number;
  /** Écritures dans le cache 1 heure (200 %). */
  cache_write_1h_tokens: number;
}

/**
 * Traduit l'`usage` d'une réponse Anthropic en ce qu'on journalise.
 *
 * Point unique d'extraction, et ce n'est pas de la coquetterie : chaque appelant
 * qui recopiait ces champs à la main en oubliait. La plupart ne lisaient ni les
 * lectures ni les écritures de cache, si bien que le journal affichait un coût
 * jusqu'à dix fois inférieur à la facture réelle.
 *
 * Le piège du double comptage : quand `cache_creation` est présent, il DÉTAILLE
 * `cache_creation_input_tokens` par durée, il ne s'y ajoute pas. On lit donc
 * l'un OU l'autre, jamais les deux.
 */
export function usageOf(message: { usage: Anthropic.Usage }): RecordedUsage {
  const u = message.usage;
  const creation = u.cache_creation;
  return {
    input_tokens: u.input_tokens ?? 0,
    output_tokens: u.output_tokens ?? 0,
    cache_read_tokens: u.cache_read_input_tokens ?? 0,
    cache_write_tokens: creation
      ? (creation.ephemeral_5m_input_tokens ?? 0)
      : (u.cache_creation_input_tokens ?? 0),
    cache_write_1h_tokens: creation ? (creation.ephemeral_1h_input_tokens ?? 0) : 0,
  };
}

/**
 * Un appel modèle tel qu'il sera écrit au journal : ce que l'API a facturé, sur
 * le modèle qu'elle a réellement servi, avec l'identifiant de sa requête.
 *
 * `model` vient de la RÉPONSE et non de la configuration : demander
 * « claude-sonnet-5 » fait répondre « claude-sonnet-5-20260115 », et c'est ce
 * dernier qui figure sur la facture Anthropic. Le journal doit porter le même.
 *
 * `requestId` est l'accroche du rapprochement : c'est le `request-id` de l'entête
 * HTTP, celui que la console Anthropic affiche. Une ligne du journal et une
 * ligne de la facture se reconnaissent par lui, sans avoir à comparer des
 * horodatages à la seconde près.
 */
export interface ApiCall {
  model: string;
  requestId: string | null;
  usage: RecordedUsage;
}

/**
 * Un appel terminé, prêt à être journalisé.
 *
 * `_request_id` est posé par le SDK sur les réponses de `messages.create`. En
 * streaming il n'est pas sur le message final : il vit sur le flux
 * (`stream.request_id`), d'où le second paramètre.
 */
export function apiCallOf(
  message: Anthropic.Message & { _request_id?: string | null },
  requestId?: string | null,
): ApiCall {
  return {
    model: message.model,
    requestId: requestId ?? message._request_id ?? null,
    usage: usageOf(message),
  };
}
