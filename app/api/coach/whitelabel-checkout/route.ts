import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { startWhitelabelCheckout } from "@/lib/whitelabel";

export const runtime = "nodejs";

// Souscription de l'upsell marque blanche par un coach (abonnement mensuel chez
// son revendeur). Session Stripe sur le compte du revendeur ; état vérifié au retour.
export async function POST() {
  const ctx = await getAdminOrNull();
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Aucun compte rattaché." }, { status: 400 });

  const res = await startWhitelabelCheckout(tenantId, ctx.email ?? null);
  if (res.error || !res.url) {
    return NextResponse.json({ error: res.error ?? "Paiement indisponible." }, { status: 400 });
  }
  return NextResponse.json({ url: res.url });
}
