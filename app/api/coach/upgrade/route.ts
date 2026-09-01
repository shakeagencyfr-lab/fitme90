import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { startUpgradeCheckout } from "@/lib/upgrade";
import { upgradeEligible } from "@/lib/upgrade-logic";
import { subscriptionIsActive } from "@/lib/subscription";
import { DAYS_PER_MONTH } from "@/lib/config";

export const runtime = "nodejs";

// Bascule 3 mois → 12 mois : session Stripe de la différence, sur le compte du
// coach. L'éligibilité est revérifiée ici, jamais confiée au bouton.
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const subscribed =
    !!ctx.profile?.subscription_id &&
    subscriptionIsActive(ctx.profile.subscription_status, ctx.profile.subscription_current_period_end);
  const eligible = upgradeEligible({
    day: ctx.access.day,
    phase: ctx.access.phase,
    durationMonths: Math.round(ctx.access.programDays / DAYS_PER_MONTH),
    subscribed,
  });
  if (!eligible) {
    return NextResponse.json({ error: "La bascule n'est pas disponible pour ton programme." }, { status: 409 });
  }

  const res = await startUpgradeCheckout(ctx.userId, ctx.email);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  if (res.applied) return NextResponse.json({ applied: true });
  return NextResponse.json({ url: res.url });
}
