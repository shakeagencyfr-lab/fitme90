import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { startPackCheckout } from "@/lib/credit-billing";

export const runtime = "nodejs";

// Achat d'un pack de crédits par un coach à son revendeur. Session Stripe créée
// sur le compte DU REVENDEUR (BYOK) ; le crédit du portefeuille se fait au retour.
export async function POST(req: Request) {
  const ctx = await getAdminOrNull();
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Aucun compte rattaché." }, { status: 400 });

  let packId = 0;
  try {
    const body = await req.json();
    packId = Number(body?.packId ?? 0);
  } catch {
    /* corps invalide */
  }
  if (!packId) return NextResponse.json({ error: "Pack manquant." }, { status: 400 });

  const res = await startPackCheckout(tenantId, packId, ctx.email ?? null);
  if (res.error || !res.url) {
    return NextResponse.json({ error: res.error ?? "Paiement indisponible." }, { status: 400 });
  }
  return NextResponse.json({ url: res.url });
}
