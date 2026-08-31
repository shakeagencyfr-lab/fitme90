import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { startPlanCheckout, switchTenantPlan } from "@/lib/tenant-billing";

export const runtime = "nodejs";

// Choix d'un palier (souscription OU changement) par un compte coach/salle.
// Si un abonnement est déjà actif, on modifie l'abonnement Stripe existant
// (upgrade/downgrade proratisé) ; sinon on lance un paiement (checkout).
export async function POST(req: Request) {
  const ctx = await getAdminOrNull();
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Aucun compte rattaché." }, { status: 400 });

  let planId = "";
  let interval: "month" | "year" = "month";
  try {
    const body = await req.json();
    if (body && typeof body.planId === "string") planId = body.planId;
    if (body?.interval === "year") interval = "year";
  } catch {
    /* corps invalide */
  }
  if (!planId) return NextResponse.json({ error: "Palier manquant." }, { status: 400 });

  // 1) Tente un changement en place (abonnement déjà actif).
  const switched = await switchTenantPlan(tenantId, planId, interval);
  if (switched.ok) return NextResponse.json({ switched: true });
  if (switched.error && !switched.needsCheckout) {
    return NextResponse.json({ error: switched.error }, { status: 400 });
  }

  // 2) Sinon, paiement (première souscription).
  const res = await startPlanCheckout(tenantId, planId, interval, ctx.email ?? null);
  if (res.error || !res.url) {
    return NextResponse.json({ error: res.error ?? "Paiement indisponible." }, { status: 400 });
  }
  return NextResponse.json({ url: res.url });
}
