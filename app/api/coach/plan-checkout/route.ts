import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { startPlanCheckout } from "@/lib/tenant-billing";

export const runtime = "nodejs";

// Paiement d'un palier par un compte (coach/salle) à son parent. La session
// Stripe est créée sur le compte DU PARENT (clé BYOK) ; le contrôle du paiement
// se fait au retour (verifyPlanCheckout), pas via un webhook plateforme.
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

  const res = await startPlanCheckout(tenantId, planId, interval, ctx.email ?? null);
  if (res.error || !res.url) {
    return NextResponse.json({ error: res.error ?? "Paiement indisponible." }, { status: 400 });
  }
  return NextResponse.json({ url: res.url });
}
