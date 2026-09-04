import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { brandForUser } from "@/lib/branding";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import type { Plan } from "@/lib/program";
import { planPdf, planPdfFilename } from "@/lib/plan-pdf";

// Téléchargement du plan en PDF.
//
// Le bouton renvoyait vers une page qui appelait `window.print()` : le client
// tombait sur la boîte d'impression du navigateur et devait y trouver
// « Enregistrer au format PDF », ce que beaucoup ne font pas. Ici le serveur
// rend le fichier et l'envoie en pièce jointe : un clic, un fichier.
//
// Les mêmes gardes que la page de lecture : il faut une session, et un accès
// qui permet de consulter le plan (actif, période de grâce, ou programme à
// prix unique terminé).

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!ctx.access.planViewable) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const supabase = await createClient();
  const { data: prog } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: Plan }>();
  const plan = prog?.plan;
  if (!plan) return NextResponse.json({ error: "Aucun programme." }, { status: 404 });

  const [brand, locale] = await Promise.all([
    brandForUser(ctx.userId),
    resolveLocale(await userLocale(ctx.userId)),
  ]);

  const clientName = ctx.profile?.name ?? "";
  const bytes = planPdf({
    plan,
    clientName,
    coachName: brand?.name ?? (locale === "en" ? "Your coach" : "Ton coach"),
    locale,
  });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      // `attachment` est ce qui déclenche le téléchargement plutôt qu'un
      // affichage dans l'onglet. Le nom est déjà nettoyé côté lib.
      "content-disposition": `attachment; filename="${planPdfFilename(clientName)}"`,
      // Le plan change quand le programme est régénéré : rien à mettre en cache.
      "cache-control": "no-store",
    },
  });
}
