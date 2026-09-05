import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode } from "@/lib/hierarchy";
import { coachSupplyFacts, resellerSupply } from "@/lib/credits";
import { costViewFor, supplyDisplay, type CostView } from "@/lib/ai-supply";

export type { CostView };

/**
 * Ce que CE compte a le droit de voir de ses coûts d'IA : des dollars, des
 * crédits, ou rien parce que l'IA est comprise. La règle est dans
 * lib/ai-supply (pure) ; ici on ne fait que lire les faits.
 */
export async function costViewOf(tenantId: string | null): Promise<CostView> {
  if (!tenantId) return "usd";
  const node = await tenantNode(tenantId);
  if (!node) return "usd";
  if (node.kind === "platform") return "usd";
  if (node.kind === "reseller") return costViewFor("reseller", await resellerSupply(tenantId), "own_key");
  return costViewFor("coach", "byok", supplyDisplay(await coachSupplyFacts(tenantId)));
}

/**
 * Ce qu'un revendeur a le DROIT de proposer à ses coachs, recopié depuis son
 * palier (lib/plan-apply.ts). La plateforme et un coach n'ont pas de
 * restriction : la question ne se pose qu'à l'étage revendeur.
 */
export interface ResellerRights {
  /** Peut laisser ses coachs en clé personnelle (BYOK). */
  byok: boolean;
  /** Peut revendre des crédits IA à ses coachs. */
  credits: boolean;
}

export async function resellerRights(tenantId: string | null): Promise<ResellerRights> {
  const all: ResellerRights = { byok: true, credits: true };
  if (!tenantId) return all;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("kind, coach_byok_allowed, coach_credits_allowed")
    .eq("id", tenantId)
    .maybeSingle<{ kind: string | null; coach_byok_allowed: boolean | null; coach_credits_allowed: boolean | null }>();
  if (!data || data.kind !== "reseller") return all;
  return { byok: data.coach_byok_allowed !== false, credits: data.coach_credits_allowed !== false };
}
