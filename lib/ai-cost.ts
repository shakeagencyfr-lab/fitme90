import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODELS } from "@/lib/anthropic";

// Estimation du coût BYOK (clés Anthropic du coach) à partir de la table
// `ai_calls` (tokens entrée/sortie par appel). La table ne stocke pas le modèle :
// on le déduit du route (chaque route a son modèle configuré) et on applique le
// tarif public correspondant. C'est donc une ESTIMATION (les tarifs peuvent
// évoluer), suffisamment fidèle pour piloter le budget.

type Price = { in: number; out: number }; // dollars par million de tokens

// Tarifs publics Anthropic (USD / 1M tokens). Défaut = Opus (le plus cher).
const PRICES: Record<string, Price> = {
  "claude-opus-5": { in: 5, out: 25 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-opus-4-6": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-fable-5": { in: 10, out: 50 },
};
const DEFAULT_PRICE: Price = { in: 5, out: 25 };

function modelForRoute(route: string): string {
  switch (route) {
    case "generate":
      return MODELS.generate;
    case "recipes":
      return MODELS.recipes;
    case "analyze-gym":
      return MODELS.analyzeGym;
    default:
      return MODELS.coach; // coach + routes annexes
  }
}

function priceFor(model: string): Price {
  return PRICES[model] ?? DEFAULT_PRICE;
}

type CallRow = { user_id: string; route: string; input_tokens: number | null; output_tokens: number | null };

function rowCost(r: CallRow): number {
  const p = priceFor(modelForRoute(r.route));
  return ((r.input_tokens ?? 0) * p.in + (r.output_tokens ?? 0) * p.out) / 1_000_000;
}

/**
 * Coût IA (USD) par client pour une liste d'utilisateurs. Une seule requête,
 * regroupée par user_id. Les clients sans appel n'apparaissent pas dans la Map.
 */
export async function aiCostForUsers(userIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (userIds.length === 0) return out;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_calls")
    .select("user_id, route, input_tokens, output_tokens")
    .in("user_id", userIds)
    .limit(100000)
    .returns<CallRow[]>();
  for (const r of data ?? []) {
    out.set(r.user_id, (out.get(r.user_id) ?? 0) + rowCost(r));
  }
  return out;
}

/** Coût IA total (USD) d'un client. */
export async function aiCostForUser(userId: string): Promise<number> {
  const m = await aiCostForUsers([userId]);
  return m.get(userId) ?? 0;
}

/** Somme d'une Map de coûts (budget global). */
export function totalCost(costs: Map<string, number>): number {
  let sum = 0;
  for (const v of costs.values()) sum += v;
  return sum;
}

/** Formate un coût en USD, précision au centime (ex "$22.63"). */
export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
