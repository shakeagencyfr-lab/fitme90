import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODELS } from "@/lib/anthropic";
import { rowCost, type CostRow } from "@/lib/ai-cost";

// Historique détaillé de la consommation IA, valable pour les TROIS étages et
// pour les DEUX modes de fourniture.
//
// La source est `ai_calls` : elle enregistre chaque appel modèle, que le tenant
// paie avec sa propre clé (BYOK) ou en crédits. Le journal `credit_ledger` ne
// couvre que le second cas et ne porte ni tokens ni modèle : il reste la pièce
// comptable des crédits, celui-ci est la pièce technique de la consommation.
//
// Portée selon l'étage qui regarde :
//   coach      -> ses propres appels (ses clients)
//   revendeur  -> les appels de tous ses coachs
//   plateforme -> tout le réseau (revendeurs + leurs coachs + coachs directs)

export type UsageScope = "self" | "network";

export interface UsageRow {
  id: number;
  createdAt: string;
  /** Compte facturé (le tenant du client qui a déclenché l'appel). */
  accountId: string | null;
  accountName: string;
  /** Personne à l'origine de l'appel (client, ou le coach lui-même). */
  personName: string | null;
  personEmail: string | null;
  action: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Crédits débités au compte (0 en BYOK). */
  credits: number;
  /** Coût Anthropic estimé de cet appel, en dollars. */
  costUsd: number;
}

export interface UsageTotals {
  calls: number;
  credits: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface UsagePage {
  rows: UsageRow[];
  totals: UsageTotals;
  /** Vrai si la fenêtre contient plus de lignes que celles renvoyées. */
  truncated: boolean;
  /** Actions présentes sur la période, pour alimenter le filtre. */
  actions: string[];
}

export interface UsageQuery {
  /** Fenêtre en jours (7, 30, 90). */
  days: number;
  /** Filtre sur l'action métier ("message", "recette"...). Vide = toutes. */
  action?: string;
  /** Filtre sur un compte précis de la portée. */
  accountId?: string;
  limit?: number;
}

/** Libellé lisible d'une action. Les anciennes lignes n'en ont pas : repli sur le route. */
export function actionLabel(action: string | null, route: string): string {
  switch (action ?? "") {
    case "message": return "Message coach IA";
    case "recette": return "Génération de recettes";
    case "recette-photo": return "Photo d'aliments vers recette";
    case "alternative": return "Alternative d'exercice";
    case "fiche-exercice": return "Fiche exercice";
    case "generation": return "Génération de programme";
    case "bloc": return "Bloc suivant du programme";
    case "analyse-salle": return "Analyse photo de la salle";
    case "memoire": return "Résumé de mémoire (nuit)";
    default: break;
  }
  // Historique antérieur à la colonne `action` : le route reste parlant.
  switch (route) {
    case "generate": return "Génération de programme";
    case "block": return "Bloc suivant du programme";
    case "recipes": return "Recettes";
    case "analyze-gym": return "Analyse photo de la salle";
    case "exercise": return "Alternative d'exercice";
    case "coach": return "Message coach IA";
    default: return route;
  }
}

/** Nom court d'un modèle, sans le préfixe éditeur (« claude-haiku-4-5 » -> « Haiku 4.5 »). */
export function modelLabel(model: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  if (!m) return model;
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return m[3] ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`;
}

/** Modèle réellement appelé, ou déduit du route pour les lignes antérieures. */
function modelOf(model: string | null, route: string): string {
  if (model) return model;
  if (route === "generate" || route === "block") return MODELS.generate;
  if (route === "recipes") return MODELS.recipes;
  if (route === "analyze-gym") return MODELS.analyzeGym;
  return MODELS.coach;
}

/**
 * Tenants couverts par la portée. `network` descend toute la chaîne sous le
 * tenant (revendeurs puis leurs coachs), en incluant le tenant lui-même : la
 * plateforme et les revendeurs consomment aussi de l'IA en direct.
 */
export async function scopeTenantIds(tenantId: string, scope: UsageScope): Promise<string[]> {
  if (scope === "self") return [tenantId];
  const admin = createAdminClient();
  const all = new Set([tenantId]);
  let frontier = [tenantId];
  // La hiérarchie fait 3 niveaux ; 6 tours couvrent large sans risque de boucle.
  for (let depth = 0; depth < 6 && frontier.length; depth++) {
    const { data } = await admin
      .from("tenants")
      .select("id")
      .in("parent_id", frontier)
      .returns<{ id: string }[]>();
    frontier = (data ?? []).map((t) => t.id).filter((id) => !all.has(id));
    for (const id of frontier) all.add(id);
  }
  return [...all];
}

interface RawRow extends CostRow {
  id: number;
  created_at: string;
  tenant_id: string | null;
  model: string | null;
  action: string | null;
  credits: number | null;
}

const COLS =
  "id, created_at, user_id, tenant_id, route, action, model, credits, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens";

/**
 * Une page d'historique pour un étage. Trois requêtes au plus : les appels, les
 * noms des comptes, les noms des personnes. Les totaux portent sur les lignes
 * renvoyées, `truncated` dit s'il en manque.
 */
export async function usageHistory(
  tenantId: string,
  scope: UsageScope,
  query: UsageQuery,
): Promise<UsagePage> {
  const empty: UsagePage = {
    rows: [],
    totals: { calls: 0, credits: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
    truncated: false,
    actions: [],
  };
  const limit = Math.min(1000, Math.max(1, query.limit ?? 300));
  const days = Math.min(365, Math.max(1, query.days));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const ids = await scopeTenantIds(tenantId, scope);
  const wanted = query.accountId && ids.includes(query.accountId) ? [query.accountId] : ids;

  const admin = createAdminClient();
  let q = admin
    .from("ai_calls")
    .select(COLS)
    .in("tenant_id", wanted)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    // Une ligne de plus que demandé : sa présence signale la troncature.
    .limit(limit + 1);
  if (query.action) q = q.eq("action", query.action);
  const { data } = await q.returns<RawRow[]>();

  const raw = data ?? [];
  if (raw.length === 0) return empty;
  const truncated = raw.length > limit;
  const page = truncated ? raw.slice(0, limit) : raw;

  const accountIds = [...new Set(page.map((r) => r.tenant_id).filter(Boolean) as string[])];
  const userIds = [...new Set(page.map((r) => r.user_id))];
  const [{ data: tenants }, { data: people }] = await Promise.all([
    accountIds.length
      ? admin.from("tenants").select("id, name").in("id", accountIds).returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    userIds.length
      ? admin.from("profiles").select("id, name, email").in("id", userIds).returns<{ id: string; name: string | null; email: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string | null; email: string | null }[] }),
  ]);
  const tenantName = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  const person = new Map((people ?? []).map((p) => [p.id, p]));

  const rows: UsageRow[] = page.map((r) => {
    const p = person.get(r.user_id);
    return {
      id: r.id,
      createdAt: r.created_at,
      accountId: r.tenant_id,
      // Un compte supprimé garde ses lignes : mieux vaut le dire que d'afficher un vide.
      accountName: (r.tenant_id && tenantName.get(r.tenant_id)) || "Compte supprimé",
      personName: p?.name ?? null,
      personEmail: p?.email ?? null,
      action: actionLabel(r.action, r.route),
      model: modelOf(r.model, r.route),
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      cacheReadTokens: r.cache_read_tokens ?? 0,
      cacheWriteTokens: r.cache_write_tokens ?? 0,
      credits: r.credits ?? 0,
      costUsd: rowCost(r),
    };
  });

  const totals = rows.reduce<UsageTotals>(
    (t, r) => ({
      calls: t.calls + 1,
      credits: t.credits + r.credits,
      costUsd: t.costUsd + r.costUsd,
      inputTokens: t.inputTokens + r.inputTokens,
      outputTokens: t.outputTokens + r.outputTokens,
      cachedTokens: t.cachedTokens + r.cacheReadTokens + r.cacheWriteTokens,
    }),
    { calls: 0, credits: 0, costUsd: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
  );

  return { rows, totals, truncated, actions: [...new Set(page.map((r) => r.action).filter(Boolean) as string[])].sort() };
}

/** Comptes de la portée, pour le filtre « Compte » (nom + niveau). */
export async function scopeAccounts(
  tenantId: string,
  scope: UsageScope,
): Promise<{ id: string; name: string; kind: string }[]> {
  const ids = await scopeTenantIds(tenantId, scope);
  if (ids.length <= 1) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id, name, kind")
    .in("id", ids)
    .order("kind", { ascending: true })
    .order("name", { ascending: true })
    .returns<{ id: string; name: string; kind: string | null }[]>();
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, kind: t.kind ?? "coach" }));
}
