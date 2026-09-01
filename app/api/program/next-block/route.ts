import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { appendNextBlock } from "@/lib/blocks";

export const runtime = "nodejs";
export const maxDuration = 300; // génération d'un bloc : jusqu'à 5 min

// Demande explicite du client : « construis mon bloc suivant maintenant ».
// Filet de sécurité si le cron n'est pas encore passé (ou a manqué de crédits
// hier). Mêmes garde-fous que le cron : rien à couvrir = rien à générer.
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (ctx.access.phase !== "active") {
    return NextResponse.json({ error: "Programme inactif." }, { status: 403 });
  }

  const res = await appendNextBlock(ctx.userId, true);
  if (res.ok) return NextResponse.json({ ok: true, blockIndex: res.blockIndex });

  const messages: Record<Exclude<typeof res, { ok: true }>["reason"], string> = {
    not_due: "Ton bloc actuel n'est pas terminé : le suivant arrivera automatiquement une semaine avant la fin.",
    no_program: "Aucun programme en cours.",
    no_quiz: "Réponds d'abord au questionnaire.",
    no_key: "Ton coach n'a pas encore configuré l'IA. Préviens-le pour débloquer ton bloc suivant.",
    no_credits: "Ton coach doit recharger ses crédits programme pour construire ton bloc suivant.",
    failed: "La construction du bloc a échoué. Réessaie dans un instant.",
  };
  const status = res.reason === "not_due" ? 409 : res.reason === "failed" ? 502 : 400;
  return NextResponse.json({ error: messages[res.reason] }, { status });
}
