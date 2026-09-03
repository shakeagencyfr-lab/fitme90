import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Recherche de personnes pour la palette du dashboard (⌘K).
//
// Cloisonnée au tenant de l'appelant : un coach ne peut pas trouver le client
// d'un autre coach, même en devinant un e-mail. C'est la raison d'être de la
// route côté serveur plutôt qu'un filtre côté client.
export async function GET(req: Request) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ people: [] }, { status: 401 });

  const term = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (term.length < 2) return NextResponse.json({ people: [] });

  // Échappe les caractères qui ont un sens dans un motif ILIKE de PostgREST,
  // sinon un « % » saisi ramènerait tout le fichier client.
  const safe = term.replace(/[%_,()]/g, " ").slice(0, 60);
  const pattern = `%${safe}%`;

  const db = createAdminClient();
  const [clients, prospects] = await Promise.all([
    db
      .from("profiles")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .eq("role", "client")
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(6)
      .returns<{ id: string; name: string | null; email: string | null }[]>(),
    db
      .from("prospects")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(4)
      .returns<{ id: string; name: string | null; email: string | null }[]>(),
  ]);

  const people = [
    ...(clients.data ?? []).map((p) => ({ id: p.id, name: p.name ?? "", email: p.email ?? "", kind: "client" as const })),
    ...(prospects.data ?? []).map((p) => ({ id: p.id, name: p.name ?? "", email: p.email ?? "", kind: "prospect" as const })),
  ];
  return NextResponse.json({ people });
}
