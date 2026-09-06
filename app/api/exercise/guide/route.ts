import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { resolveGuide, generateGuide, cachedAiGuide, type ResolvedGuide } from "@/lib/exercise-guide";
import { normalizeExerciseName } from "@/lib/exercise-library";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { checkLimit, DAY_MS } from "@/lib/ratelimit";
import { LIMIT_COACH_PER_DAY } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

// Fiche d'un exercice (image + consignes) pour la modale de la séance.
// Résout dans l'ordre : média du coach > bibliothèque intégrée > cache IA ;
// à défaut, génère via l'IA (clé BYOK du coach) dans la limite quotidienne.
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Exercice manquant." }, { status: 400 });

  const tenantId = ctx.profile?.tenant_id ?? null;

  const locale = await resolveLocale(await userLocale(ctx.userId));

  try {
    // 1) Résolution sans IA (rapide, gratuite). Les textes de la bibliothèque
    // sont en français : un client d'une autre langue garde les images mais
    // reçoit des consignes dans sa langue (cache IA séparé, généré une fois).
    const resolved = await resolveGuide(name, tenantId);
    if (resolved && (locale === "fr" || resolved.source === "coach")) return NextResponse.json({ guide: resolved });
    if (locale !== "fr") {
      const cached = await cachedAiGuide(normalizeExerciseName(name), locale);
      if (cached) return NextResponse.json({ guide: { ...cached, frames: resolved?.frames ?? [] } });
    }

    // 2) Génération IA (cache global), plafonnée par la limite quotidienne.
    const limit = await checkLimit(ctx.userId, "coach", LIMIT_COACH_PER_DAY, DAY_MS);
    if (limit.ok) {
      const gen = await generateGuide(name, ctx.userId, locale);
      if (gen) return NextResponse.json({ guide: { ...gen, frames: resolved?.frames ?? gen.frames } });
    }
    if (resolved) return NextResponse.json({ guide: resolved });
  } catch {
    /* on tombe sur la fiche minimale ci-dessous plutôt que de renvoyer une 500 */
  }

  // 3) Rien de disponible : fiche minimale (la modale affiche un repli propre).
  const fallback: ResolvedGuide = {
    name,
    muscle: null,
    frames: [],
    steps: [],
    cues: [],
    mistakes: [],
    note: null,
    source: "none",
  };
  return NextResponse.json({ guide: fallback });
}
