import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { buildProgramHtml } from "@/lib/pdf";
import { planSchema } from "@/lib/program";

export const runtime = "nodejs";

// Génère le PDF du programme via MarkupGo, côté serveur (la clé n'atteint
// jamais le navigateur). Le HTML est construit ici puis envoyé à MarkupGo,
// qui renvoie le binaire. Repli navigateur (« Imprimer / enregistrer en PDF »)
// disponible côté client si cette route est indisponible.
//
// NB déploiement : vérifier l'endpoint et le format de corps attendus par
// MarkupGo (surchargeable via MARKUPGO_ENDPOINT). Voir DEPLOY.md.
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.planViewable) {
    return NextResponse.json({ error: "Plan non consultable." }, { status: 403 });
  }

  const apiKey = process.env.MARKUPGO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Export PDF non configuré. Utilise « Imprimer / enregistrer en PDF »." },
      { status: 501 },
    );
  }

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: unknown }>();

  const parsed = planSchema.safeParse(program?.plan);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aucun programme à exporter." }, { status: 404 });
  }

  const html = buildProgramHtml(parsed.data, ctx.profile?.name ?? undefined);
  const endpoint = process.env.MARKUPGO_ENDPOINT ?? "https://api.markupgo.com/api/v1/pdf";

  let pdf: ArrayBuffer;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ source: { type: "html", data: html }, format: "A4" }),
    });
    if (!res.ok) throw new Error(`MarkupGo ${res.status}`);

    const type = res.headers.get("content-type") ?? "";
    if (type.includes("application/pdf")) {
      pdf = await res.arrayBuffer();
    } else {
      // Beaucoup d'API PDF renvoient du JSON avec l'URL du fichier généré,
      // pas le binaire. On récupère alors le PDF via cette URL.
      const json = (await res.json().catch(() => ({}))) as { url?: string; pdfUrl?: string; result?: { url?: string } };
      const url = json.url ?? json.pdfUrl ?? json.result?.url;
      if (!url) throw new Error("Réponse MarkupGo inattendue.");
      const bin = await fetch(url);
      if (!bin.ok) throw new Error(`Téléchargement PDF ${bin.status}`);
      pdf = await bin.arrayBuffer();
    }

    // Garde-fou : ne jamais renvoyer un fichier qui n'est pas un vrai PDF
    // (évite le fichier corrompu « impossible à ouvrir »).
    const head = new Uint8Array(pdf.slice(0, 5));
    const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
    if (!isPdf || pdf.byteLength < 1000) throw new Error("Contenu non PDF.");
  } catch {
    return NextResponse.json(
      { error: "Génération PDF indisponible. Utilise la page d'impression." },
      { status: 502 },
    );
  }

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="fitme90.pdf"',
    },
  });
}
