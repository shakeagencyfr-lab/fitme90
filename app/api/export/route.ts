import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export const runtime = "nodejs";

// Export RGPD : renvoie un JSON complet du compte (droit à la portabilité).
// Lecture via la session de l'utilisateur (RLS : ses propres lignes).
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = await createClient();
  const tables = [
    "profiles",
    "questionnaires",
    "equipment",
    "programs",
    "session_logs",
    "weights",
    "measurements",
    "photos",
    "coach_messages",
  ] as const;

  const dump: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: ctx.userId,
    email: ctx.email,
  };

  for (const t of tables) {
    const col = t === "profiles" ? "id" : "user_id";
    const { data } = await supabase.from(t).select("*").eq(col, ctx.userId);
    dump[t] = data ?? [];
  }

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="my-fitness-app-mes-donnees.json"',
    },
  });
}
