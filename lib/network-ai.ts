import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthStartIso, rowCost, type CostRow } from "@/lib/ai-cost";
import { resellerBilling } from "@/lib/credits";
import { supplyDisplay } from "@/lib/ai-supply";
import type { ChildTenant } from "@/lib/hierarchy";

/**
 * Chiffre IA de chaque compte du réseau, pour la liste « Mon réseau ».
 *
 * Deux mondes, deux chiffres. Un compte qui achète ses crédits à son parent a
 * un SOLDE : c'est ce qu'il lui reste avant de devoir recharger, et c'est la
 * seule chose qui l'intéresse. Un compte en BYOK paie Anthropic directement :
 * son solde n'existe pas, mais ce qu'il a dépensé ce mois-ci se lit dans le
 * journal des appels.
 *
 * Tout est lu en trois requêtes pour l'ensemble du réseau, quel que soit le
 * nombre de comptes : une par tenant aurait fait des dizaines d'allers-retours
 * sur une page qu'on ouvre souvent.
 */

export interface NetworkAi {
  mode: "credits" | "byok";
  /** Solde restant, en mode crédits. */
  credits: number | null;
  /** Dépense estimée du mois courant (USD), en BYOK. */
  costUsd: number | null;
}

/**
 * @param actorTenantId Le parent qui regarde son réseau. C'est SON modèle de
 *   revente qui décide si ses coachs sont en crédits ou en clé perso.
 */
export async function networkAiFigures(
  actorTenantId: string,
  children: ChildTenant[],
): Promise<Map<string, NetworkAi>> {
  const out = new Map<string, NetworkAi>();
  if (children.length === 0) return out;
  const admin = createAdminClient();

  // Un coach a un solde à surveiller quand son revendeur (donc l'acteur) LUI
  // FOURNIT l'IA et la lui facture en crédits. Même règle exactement que la
  // résolution de clé et que le débit, via lib/ai-supply : c'est en la
  // réécrivant ici que cet écran finissait par contredire celui du coach.
  const coachsEnCredits = supplyDisplay(await resellerBilling(actorTenantId)) === "credits";
  const mode = (c: ChildTenant): "credits" | "byok" =>
    c.kind === "reseller"
      ? c.aiSupply === "platform_credits" ? "credits" : "byok"
      : coachsEnCredits ? "credits" : "byok";

  const enCredits = children.filter((c) => mode(c) === "credits").map((c) => c.id);
  const enByok = children.filter((c) => mode(c) === "byok");

  // 1. Les soldes, en une fois.
  const soldes = new Map<string, number>();
  if (enCredits.length > 0) {
    const { data } = await admin
      .from("credit_wallets")
      .select("tenant_id, credits")
      .in("tenant_id", enCredits)
      .returns<{ tenant_id: string; credits: number }[]>();
    for (const w of data ?? []) soldes.set(w.tenant_id, w.credits);
  }

  // 2. Les comptes dont la conso est imputée à chaque enfant en BYOK. Pour un
  //    coach, les siens. Pour un revendeur, ceux de tout son sous-réseau : il
  //    fournit l'IA à ses coachs, donc leur conso est la sienne.
  const depenses = new Map<string, number>();
  if (enByok.length > 0) {
    /** tenant porteur d'utilisateurs -> enfant à qui la dépense est imputée. */
    const imputation = new Map<string, string>();
    for (const c of enByok) imputation.set(c.id, c.id);

    const revendeurs = enByok.filter((c) => c.kind !== "coach").map((c) => c.id);
    if (revendeurs.length > 0) {
      const { data: petits } = await admin
        .from("tenants")
        .select("id, parent_id")
        .in("parent_id", revendeurs)
        .returns<{ id: string; parent_id: string }[]>();
      for (const g of petits ?? []) imputation.set(g.id, g.parent_id);
    }

    const { data: profs } = await admin
      .from("profiles")
      .select("id, tenant_id")
      .in("tenant_id", [...imputation.keys()])
      .returns<{ id: string; tenant_id: string }[]>();

    /** utilisateur -> enfant à qui sa conso est imputée. */
    const parUtilisateur = new Map<string, string>();
    for (const p of profs ?? []) {
      const cible = imputation.get(p.tenant_id);
      if (cible) parUtilisateur.set(p.id, cible);
    }

    // 3. Les appels du mois, en une fois.
    if (parUtilisateur.size > 0) {
      const { data: calls } = await admin
        .from("ai_calls")
        .select("user_id, route, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cache_write_1h_tokens")
        .in("user_id", [...parUtilisateur.keys()])
        .gte("created_at", monthStartIso())
        .limit(100000)
        .returns<CostRow[]>();
      for (const r of calls ?? []) {
        const cible = r.user_id ? parUtilisateur.get(r.user_id) : undefined;
        if (cible) depenses.set(cible, (depenses.get(cible) ?? 0) + rowCost(r));
      }
    }
  }

  for (const c of children) {
    const m = mode(c);
    out.set(c.id, {
      mode: m,
      credits: m === "credits" ? soldes.get(c.id) ?? 0 : null,
      costUsd: m === "byok" ? depenses.get(c.id) ?? 0 : null,
    });
  }
  return out;
}
