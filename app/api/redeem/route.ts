import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({ code: z.string().min(1).max(64) });

// Débloque le programme via un code cadeau (usage unique). Équivalent d'un
// paiement : passe profiles.paid = true. Toute la logique est serveur
// (service role) — la table gift_codes est inaccessible au client.
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (ctx.access.phase !== "not_paid") {
    return NextResponse.json({ error: "Programme déjà débloqué." }, { status: 409 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Code invalide." }, { status: 400 });
  }
  const code = parsed.data.code.trim().toUpperCase();

  const admin = createAdminClient();

  // Réservation atomique : on ne marque le code que s'il n'est pas déjà pris
  // (filtre used_by IS NULL). 0 ligne renvoyée = code inexistant ou déjà utilisé.
  const { data, error } = await admin
    .from("gift_codes")
    .update({ used_by: ctx.userId, used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_by", null)
    .select("code");

  if (error) {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Code inconnu ou déjà utilisé." },
      { status: 400 },
    );
  }

  const { error: paidErr } = await admin
    .from("profiles")
    .update({ paid: true })
    .eq("id", ctx.userId);
  if (paidErr) {
    // On tente de libérer le code pour ne pas le gaspiller.
    await admin
      .from("gift_codes")
      .update({ used_by: null, used_at: null })
      .eq("code", code);
    return NextResponse.json({ error: "Impossible de débloquer le compte." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
