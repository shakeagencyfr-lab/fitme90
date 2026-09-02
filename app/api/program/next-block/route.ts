import { NextResponse } from "next/server";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { getSessionContext } from "@/lib/guard";
import { appendNextBlock } from "@/lib/blocks";

export const runtime = "nodejs";
export const maxDuration = 300; // génération d'un bloc : jusqu'à 5 min

// Demande explicite du client : « construis mon bloc suivant maintenant ».
// Filet de sécurité si le cron n'est pas encore passé (ou a manqué de crédits
// hier). Mêmes garde-fous que le cron : rien à couvrir = rien à générer.
export async function POST() {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (ctx.access.phase !== "active") {
    return NextResponse.json({ error: t("srv.programInactive") }, { status: 403 });
  }

  const res = await appendNextBlock(ctx.userId, true);
  if (res.ok) return NextResponse.json({ ok: true, blockIndex: res.blockIndex });

  const messages: Record<Exclude<typeof res, { ok: true }>["reason"], string> = {
    not_due: t("srv.blockNotDue"),
    no_program: t("srv.noProgram"),
    no_quiz: t("srv.quizFirst"),
    no_key: t("srv.blockNoKey"),
    no_credits: t("srv.blockNoCredits"),
    failed: t("srv.blockFailed"),
  };
  const status = res.reason === "not_due" ? 409 : res.reason === "failed" ? 502 : 400;
  return NextResponse.json({ error: messages[res.reason] }, { status });
}
