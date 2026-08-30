import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/codes";

// Codes promo par coach : une remise (pourcentage ou montant fixe) appliquée au
// paiement d'une de ses offres. Tout passe par le service_role (RLS sans policy).

export type DiscountType = "percent" | "fixed";

export interface PromoCode {
  id: string;
  tenant_id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number; // pourcentage 1-100, ou centimes si fixe
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

const COLS =
  "id, tenant_id, code, discount_type, discount_value, active, max_uses, used_count, expires_at, created_at";

// Montant minimal facturable par Stripe (0,50 €). En dessous, on refuse la remise.
const STRIPE_MIN_CENTS = 50;

export async function listPromos(tenantId: string): Promise<PromoCode[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("promo_codes")
    .select(COLS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PromoCode[];
}

export interface CreatePromoInput {
  code: string;
  discountType: DiscountType;
  discountValue: number; // % (1-100) ou euros (converti en centimes en amont)
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface PromoResult {
  ok: boolean;
  error?: string;
}

export async function createPromo(tenantId: string, input: CreatePromoInput): Promise<PromoResult> {
  const code = normalizeCode(input.code);
  if (code.length < 3) return { ok: false, error: "Code trop court (3 caractères minimum)." };
  if (input.discountType === "percent" && (input.discountValue < 1 || input.discountValue > 100)) {
    return { ok: false, error: "Pourcentage entre 1 et 100." };
  }
  if (input.discountType === "fixed" && input.discountValue <= 0) {
    return { ok: false, error: "Montant de remise invalide." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").insert({
    tenant_id: tenantId,
    code,
    discount_type: input.discountType,
    discount_value: Math.round(input.discountValue),
    max_uses: input.maxUses ?? null,
    expires_at: input.expiresAt ?? null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce code existe déjà." };
    return { ok: false, error: "Création impossible." };
  }
  return { ok: true };
}

export async function setPromoActive(tenantId: string, id: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("promo_codes").update({ active }).eq("id", id).eq("tenant_id", tenantId);
}

export async function deletePromo(tenantId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("promo_codes").delete().eq("id", id).eq("tenant_id", tenantId);
}

export interface ValidatedPromo {
  ok: boolean;
  error?: string;
  code?: string;
  discountedCents?: number;
  label?: string; // ex : « -20 % » / « -15 € »
}

/** Valide un code promo pour un tenant et un montant, et renvoie le prix remisé. */
export async function validatePromo(
  tenantId: string,
  rawCode: string,
  amountCents: number,
): Promise<ValidatedPromo> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Saisis un code." };
  const admin = createAdminClient();
  const { data: promo } = await admin
    .from("promo_codes")
    .select(COLS)
    .eq("tenant_id", tenantId)
    .eq("code", code)
    .maybeSingle<PromoCode>();
  if (!promo) return { ok: false, error: "Code promo inconnu." };
  if (!promo.active) return { ok: false, error: "Ce code n'est plus actif." };
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { ok: false, error: "Ce code a expiré." };
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { ok: false, error: "Ce code a atteint sa limite d'utilisation." };
  }

  const discounted =
    promo.discount_type === "percent"
      ? Math.round(amountCents * (1 - promo.discount_value / 100))
      : Math.max(0, amountCents - promo.discount_value);

  if (discounted < STRIPE_MIN_CENTS) {
    return { ok: false, error: "Remise trop élevée pour cette offre (montant minimum 0,50 €)." };
  }

  const label =
    promo.discount_type === "percent"
      ? `-${promo.discount_value} %`
      : `-${(promo.discount_value / 100).toString().replace(".", ",")} €`;

  return { ok: true, code: promo.code, discountedCents: discounted, label };
}

/** Incrémente le compteur d'usage d'un code (après paiement confirmé). */
export async function incrementPromoUse(tenantId: string, code: string): Promise<void> {
  const norm = normalizeCode(code);
  const admin = createAdminClient();
  const { data } = await admin
    .from("promo_codes")
    .select("id, used_count")
    .eq("tenant_id", tenantId)
    .eq("code", norm)
    .maybeSingle<{ id: string; used_count: number }>();
  if (!data) return;
  await admin.from("promo_codes").update({ used_count: data.used_count + 1 }).eq("id", data.id);
}
