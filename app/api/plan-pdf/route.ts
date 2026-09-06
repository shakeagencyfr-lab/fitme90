import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { brandForUser } from "@/lib/branding";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import type { Plan } from "@/lib/program";
import { planPdf, planPdfFilename, type PlanPdfOptions } from "@/lib/plan-pdf";
import { decodeImageForPdf } from "@/lib/pdf-image";
import { karvonen } from "@/lib/fitness";
import { rpeScale } from "@/lib/i18n/fitness";
import { bannedTags, dayMeals, dislikeTerms, pnum } from "@/lib/nutrition";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Options lues dans l'adresse : `cycles=0,2` (index, sinon tous),
 * `nutrition=0|1`, `meals=0|1`. Tout ce qui manque vaut « oui ».
 */
function optionsFrom(url: URL, cycleCount: number): PlanPdfOptions {
  const raw = url.searchParams.get("cycles");
  let cycles: number[] | null = null;
  if (raw != null && raw !== "" && raw !== "all") {
    const idx = raw
      .split(",")
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < cycleCount);
    cycles = idx.length ? [...new Set(idx)] : null;
  }
  const flag = (k: string) => url.searchParams.get(k) !== "0";
  return { cycles, nutrition: flag("nutrition"), sampleMeals: flag("meals") };
}

/** Le logo du coach, si c'est une image que le PDF sait porter. Jamais bloquant. */
async function logoFor(url: string | null) {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > 3_000_000) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 3_000_000) return null;
    return decodeImageForPdf(bytes, "Logo");
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<Response> {
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

  const admin = createAdminClient();
  const [brand, locale, { data: prof }, { data: quiz }] = await Promise.all([
    brandForUser(ctx.userId),
    resolveLocale(await userLocale(ctx.userId)),
    admin.from("profiles").select("age, rest_hr, sex").eq("id", ctx.userId).maybeSingle<{ age: number | null; rest_hr: number | null; sex: string | null }>(),
    admin
      .from("questionnaires")
      .select("answers")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ answers: Record<string, unknown> }>(),
  ]);
  const logo = await logoFor(brand?.logoUrl ?? null);

  const options = optionsFrom(new URL(req.url), plan.cycles?.length ?? 0);
  // Les pulsations ne sont affichées que sur un vrai profil : celles d'un
  // profil moyen seraient fausses pour ce client précis.
  const zones = prof?.age && prof?.rest_hr ? karvonen(prof.age, prof.rest_hr, prof.sex ?? undefined).zones : null;
  const { RPE, RPE_INTRO } = rpeScale(locale);

  let sampleMeals: { training: ReturnType<typeof dayMeals>; rest: ReturnType<typeof dayMeals> } | null = null;
  if (options.sampleMeals) {
    const answers = quiz?.answers ?? {};
    const banned = bannedTags((answers.allerg as string[]) ?? [], (answers.diet as string) ?? undefined);
    const dislikes = dislikeTerms(answers.dislikes as string | string[] | undefined);
    const baseKcal = pnum(plan.nutrition?.kcal ?? "") || 2580;
    sampleMeals = {
      training: dayMeals(1, false, baseKcal, banned, dislikes),
      rest: dayMeals(2, true, baseKcal, banned, dislikes),
    };
  }

  const clientName = ctx.profile?.name ?? "";
  const bytes = planPdf({
    plan,
    clientName,
    coachName: brand?.name ?? (locale === "en" ? "Your coach" : "Ton coach"),
    locale,
    options,
    logo,
    zones,
    rpe: { intro: RPE_INTRO, steps: RPE },
    sampleMeals,
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
