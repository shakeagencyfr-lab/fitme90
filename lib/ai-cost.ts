import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODELS } from "@/lib/anthropic";

// Estimation du coût BYOK (clés Anthropic du coach) à partir de la table
// `ai_calls` (tokens entrée/sortie par appel). Depuis la migration
// `ai_calls_detail` la table porte le modèle appelé ; pour les lignes
// antérieures on le déduit du route (chaque route a son modèle configuré). On
// applique ensuite le tarif public correspondant. C'est donc une ESTIMATION
// (les tarifs peuvent évoluer), suffisamment fidèle pour piloter le budget.

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
    case "block": // bloc suivant d'un programme : même modèle que la génération
      return MODELS.generate;
    case "recipes":
      return MODELS.recipes;
    case "analyze-gym":
      return MODELS.analyzeGym;
    default:
      return MODELS.coach; // coach + routes annexes
  }
}

/**
 * Le tarif d'un modèle, quelle que soit la forme de son identifiant.
 *
 * L'API répond avec un identifiant DATÉ (`claude-haiku-4-5-20251001`) là où la
 * configuration porte l'alias (`claude-haiku-4-5`). Depuis que le journal
 * enregistre le modèle réellement servi, les deux formes coexistent dans la
 * table. Une correspondance exacte tarifierait toutes les lignes datées au prix
 * par défaut, celui d'Opus : cinq fois trop cher sur Haiku, et le journal
 * repartirait dans le faux par l'autre bout.
 *
 * On retient donc le plus long alias dont l'identifiant est un prolongement.
 * La coupure se fait sur un tiret, sans quoi « claude-sonnet-5 » attraperait
 * « claude-sonnet-52 » si un tel modèle existait un jour.
 */
export function priceFor(model: string): Price {
  const exact = PRICES[model];
  if (exact) return exact;
  let best: Price | null = null;
  let bestLen = 0;
  for (const [alias, price] of Object.entries(PRICES)) {
    if (model.startsWith(`${alias}-`) && alias.length > bestLen) {
      best = price;
      bestLen = alias.length;
    }
  }
  // Modèle inconnu : on tarife au plus cher. Une estimation qui dépasse se
  // corrige en regardant ; une estimation qui minore ne se remarque pas.
  return best ?? DEFAULT_PRICE;
}

export type CostRow = {
  user_id: string;
  route: string;
  /** Modèle réellement appelé. Absent sur les lignes antérieures : on le déduit du route. */
  model?: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  /** Ecritures dans le cache 5 minutes. */
  cache_write_tokens: number | null;
  /** Ecritures dans le cache 1 heure, facturees plus cher. */
  cache_write_1h_tokens?: number | null;
};

// Tarifs du cache de prompt, en multiples du prix d'un token d'entrée : une
// lecture coûte 10 %, une écriture 125 % pour le cache court (5 minutes) et
// 200 % pour le cache long (1 heure). `input_tokens` renvoyé par l'API EXCLUT
// déjà les tokens servis par le cache : toutes ces lignes s'additionnent.
//
// Les deux durées sont comptées séparément parce qu'elles ne coûtent pas la
// même chose. Les confondre sous-estimerait la facture de 60 % dès qu'une
// route passe en cache long.
const CACHE_READ_RATE = 0.1;
const CACHE_WRITE_RATE = 1.25;
const CACHE_WRITE_1H_RATE = 2;

/** Coût d'un appel, poste par poste (USD). La somme vaut `rowCost`. */
export interface CostParts {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  total: number;
}

/**
 * Décompose le coût d'un appel. Deux écarts expliquent presque toute la
 * variation entre deux lignes voisines, et aucun n'est visible sur le seul
 * nombre de tokens :
 *   - une SORTIE coûte 5x une entrée (Haiku : $5 contre $1 le million) ;
 *   - une ÉCRITURE de cache coûte 12,5x une LECTURE (125 % contre 10 %).
 * Un premier message de conversation écrit le cache, les suivants le lisent.
 */
export function costParts(r: CostRow): CostParts {
  const p = priceFor(r.model || modelForRoute(r.route));
  const input = ((r.input_tokens ?? 0) * p.in) / 1_000_000;
  const cacheRead = ((r.cache_read_tokens ?? 0) * p.in * CACHE_READ_RATE) / 1_000_000;
  const cacheWrite =
    ((r.cache_write_tokens ?? 0) * p.in * CACHE_WRITE_RATE +
      (r.cache_write_1h_tokens ?? 0) * p.in * CACHE_WRITE_1H_RATE) /
    1_000_000;
  const output = ((r.output_tokens ?? 0) * p.out) / 1_000_000;
  return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output };
}

export function rowCost(r: CostRow): number {
  return costParts(r).total;
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
    .select("user_id, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens")
    .in("user_id", userIds)
    .limit(100000)
    .returns<CostRow[]>();
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

/**
 * Le même montant, mais lisible quand il est petit.
 *
 * Le journal sert à se comparer à la facture Anthropic, et un appel de chat
 * coûte quelques millièmes de dollar : arrondi au centime, il s'affiche
 * « $0.00 » et une journée entière se résume à « $0.49 » face aux « 0,55 $ »
 * du fournisseur. On garde donc quatre décimales tant qu'on est sous le dollar.
 */
export function formatUsdPrecise(n: number): string {
  const abs = Math.abs(n);
  return `$${n.toFixed(abs > 0 && abs < 1 ? 4 : 2)}`;
}

/** Premier jour du mois courant (UTC), en ISO. */
export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export interface TenantAiUsage {
  costUsd: number;
  calls: number;
  sinceIso: string;
}

/**
 * Conso IA (BYOK) du mois courant pour un tenant : somme du coût estimé de tous
 * les appels IA de ses utilisateurs (clients + compte) depuis le 1er du mois.
 */
export async function tenantMonthlyAiUsage(tenantId: string | null): Promise<TenantAiUsage> {
  const since = monthStartIso();
  if (!tenantId) return { costUsd: 0, calls: 0, sinceIso: since };
  const admin = createAdminClient();

  const { data: profs } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .returns<{ id: string }[]>();
  const ids = (profs ?? []).map((p) => p.id);
  if (ids.length === 0) return { costUsd: 0, calls: 0, sinceIso: since };

  const { data } = await admin
    .from("ai_calls")
    .select("user_id, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens")
    .in("user_id", ids)
    .gte("created_at", since)
    .limit(100000)
    .returns<CostRow[]>();

  let cost = 0;
  for (const r of data ?? []) cost += rowCost(r);
  return { costUsd: cost, calls: (data ?? []).length, sinceIso: since };
}

export interface ResellerAiUsage {
  costUsd: number;
  calls: number;
  coachCount: number;
  sinceIso: string;
}

/**
 * Conso IA (BYOK) du mois courant pour un REVENDEUR : somme du coût estimé des
 * appels IA de tous les comptes rattachés à ses coachs enfants (clients + coachs).
 * C'est ce que le revendeur absorbe quand il fournit l'IA (mode « provider »).
 */
export async function resellerMonthlyAiUsage(resellerTenantId: string | null): Promise<ResellerAiUsage> {
  const since = monthStartIso();
  const empty: ResellerAiUsage = { costUsd: 0, calls: 0, coachCount: 0, sinceIso: since };
  if (!resellerTenantId) return empty;
  const admin = createAdminClient();

  // Coachs / salles enfants du revendeur.
  const { data: kids } = await admin
    .from("tenants")
    .select("id")
    .eq("parent_id", resellerTenantId)
    .returns<{ id: string }[]>();
  const tenantIds = (kids ?? []).map((k) => k.id);
  if (tenantIds.length === 0) return empty;

  // Tous les comptes (clients + coachs) de ces tenants.
  const { data: profs } = await admin
    .from("profiles")
    .select("id")
    .in("tenant_id", tenantIds)
    .returns<{ id: string }[]>();
  const ids = (profs ?? []).map((p) => p.id);
  if (ids.length === 0) return { ...empty, coachCount: tenantIds.length };

  const { data } = await admin
    .from("ai_calls")
    .select("user_id, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens")
    .in("user_id", ids)
    .gte("created_at", since)
    .limit(100000)
    .returns<CostRow[]>();

  let cost = 0;
  for (const r of data ?? []) cost += rowCost(r);
  return { costUsd: cost, calls: (data ?? []).length, coachCount: tenantIds.length, sinceIso: since };
}
