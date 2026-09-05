import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { safePushEndpoint } from "@/lib/safe-url";

export const runtime = "nodejs";

// Enregistre (ou met à jour) l'abonnement Web Push de l'appareil courant.
// La ligne est écrite avec la session du client (RLS own_rows) : chacun ne
// touche que ses propres abonnements.
const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
  }

  // Le serveur postera sur cette adresse : HTTPS vers un vrai service push,
  // jamais une adresse interne glissée par un appel direct à l'API.
  const endpoint = safePushEndpoint(body.endpoint);
  if (!endpoint) return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      user_id: ctx.userId,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
