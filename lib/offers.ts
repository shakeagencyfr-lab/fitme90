import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  OFFER_DURATIONS_MONTHS,
  MAX_OFFERS_PER_TENANT,
  type OfferDurationMonths,
} from "@/lib/config";

// Catalogue d'offres d'un tenant (coach/salle) : jusqu'à 3 formules, chacune
// avec une durée prédéfinie. Les clients choisiront leur offre plus tard (via
// la landing + le checkout) ; ici, la gestion côté coach.

export interface Offer {
  id: string;
  tenant_id: string;
  name: string;
  duration_months: OfferDurationMonths;
  position: number;
  is_active: boolean;
  created_at: string;
}

export function isValidDuration(m: number): m is OfferDurationMonths {
  return (OFFER_DURATIONS_MONTHS as readonly number[]).includes(m);
}

/** Offres d'un tenant, ordonnées (pour le dashboard). */
export async function listOffers(tenantId: string): Promise<Offer[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offers")
    .select("id, tenant_id, name, duration_months, position, is_active, created_at")
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Offer[];
}

export interface CreateOfferResult {
  ok: boolean;
  error?: string;
}

/** Crée une offre en respectant le plafond de MAX_OFFERS_PER_TENANT. */
export async function createOffer(
  tenantId: string,
  name: string,
  durationMonths: number,
): Promise<CreateOfferResult> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Donne un nom à l'offre." };
  if (!isValidDuration(durationMonths)) {
    return { ok: false, error: "Durée non autorisée." };
  }
  const admin = createAdminClient();
  const { count } = await admin
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_OFFERS_PER_TENANT) {
    return { ok: false, error: `Maximum ${MAX_OFFERS_PER_TENANT} offres par compte.` };
  }
  const { error } = await admin.from("offers").insert({
    tenant_id: tenantId,
    name: trimmed,
    duration_months: durationMonths,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Création impossible." };
  return { ok: true };
}

/** Active / désactive une offre (sans la supprimer). */
export async function setOfferActive(
  tenantId: string,
  offerId: string,
  active: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("offers")
    .update({ is_active: active })
    .eq("id", offerId)
    .eq("tenant_id", tenantId);
}

/** Supprime une offre du catalogue. */
export async function deleteOffer(tenantId: string, offerId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("offers").delete().eq("id", offerId).eq("tenant_id", tenantId);
}
