import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export const runtime = "nodejs";

// Supprime l'abonnement Web Push de l'appareil courant (désactivation des
// rappels). RLS own_rows : on ne peut supprimer que ses propres lignes.
const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", ctx.userId);
  return NextResponse.json({ ok: true });
}
