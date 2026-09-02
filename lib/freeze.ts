import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Gel d'un compte coach/salle en cas de DÉFAUT DE PAIEMENT auprès de son
// revendeur. Quand l'abonnement Stripe du tenant passe en échec (past_due,
// unpaid…), le compte est « gelé » : ses clients perdent temporairement l'accès,
// jusqu'à ce que le coach régularise. Le coach, lui, garde l'accès à son
// dashboard pour payer.

/** Statuts Stripe considérés comme un défaut de paiement (→ gel). */
export const FROZEN_STATUSES = new Set(["past_due", "unpaid", "incomplete_expired"]);

export interface FreezeState {
  frozen: boolean;
  status: string | null;
  /** Désactivation manuelle par le parent (revendeur ou plateforme). */
  suspended: boolean;
}

/** Un tenant est-il gelé (abonnement au parent en défaut de paiement) ? */
export async function tenantFreezeState(tenantId: string | null): Promise<FreezeState> {
  if (!tenantId) return { frozen: false, status: null, suspended: false };
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("sub_id, sub_status, suspended_at")
    .eq("id", tenantId)
    .maybeSingle<{ sub_id: string | null; sub_status: string | null; suspended_at: string | null }>();
  const status = data?.sub_status ?? null;
  const suspended = !!data?.suspended_at;
  const frozen = suspended || (!!data?.sub_id && !!status && FROZEN_STATUSES.has(status));
  return { frozen, status, suspended };
}
