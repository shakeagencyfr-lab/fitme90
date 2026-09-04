import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { checkClientAiBudget } from "@/lib/coach-ai-budget";

export const runtime = "nodejs";

// Ce qu'il reste au client aujourd'hui, et à quelle heure ça se renouvelle.
// Affiché dans le chat : pas de surprise au message de trop.
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const b = await checkClientAiBudget(ctx.userId, ctx.profile?.tenant_id ?? null);
  return NextResponse.json({
    limit: b.limit,
    used: b.used,
    remaining: b.limit > 0 ? b.remaining : null,
    resetsAt: b.resetsAt,
  });
}
