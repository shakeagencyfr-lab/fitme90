import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { MODELS, textOf, parseJsonLoose, effortConfig } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { exerciseShape } from "@/lib/program";
import { recordCall } from "@/lib/ratelimit";
import { checkCoachAiBudget } from "@/lib/coach-ai-budget";
import { checkAiAllowance, chargeAiUsage } from "@/lib/credits";
import { COACH_CREDENTIAL } from "@/lib/config";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { aiLanguageInstruction } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 30;

// Génère UN exercice alternatif quand le matériel/la machine n'est pas dispo,
// ou que le client veut un autre mouvement. Même groupe musculaire, matériel
// disponible uniquement. L'app remplace l'exercice dans sa carte (côté client).
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json({ error: "Disponible pendant ton programme." }, { status: 403 });
  }

  // Porte d'accès : crédits (Modèle crédits) ou plafond journalier.
  const coachTenant = ctx.profile?.tenant_id ?? null;
  // Une alternative compte dans le quota journalier du plan, comme un message.
  const budget = await checkCoachAiBudget(ctx.userId, coachTenant);
  if (!budget.ok) {
    return NextResponse.json({ error: "Quota IA du jour atteint, il se renouvelle à minuit." }, { status: 429 });
  }
  const allowance = await checkAiAllowance(coachTenant, "action");
  if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: 402 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    note?: string;
    cardio?: boolean;
    sessionTitle?: string;
    avoid?: string[];
  };
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Exercice manquant." }, { status: 400 });

  const supabase = await createClient();
  const { data: equipRows } = await supabase
    .from("equipment")
    .select("name")
    .eq("user_id", ctx.userId)
    .eq("enabled", true);
  const equipment = (equipRows ?? []).map((e) => e.name as string);

  const avoid = [name, ...(Array.isArray(body.avoid) ? body.avoid : [])]
    .map((s) => String(s))
    .filter(Boolean);

  const locale = await resolveLocale(await userLocale(ctx.userId));
  const system = `Tu es ${COACH_CREDENTIAL}. ${aiLanguageInstruction(locale)} Tu proposes UN exercice de remplacement quand un mouvement n'est pas réalisable (machine ou matériel indisponible). Réponds UNIQUEMENT par un objet JSON valide, sans texte autour. L'alternative doit : cibler LES MÊMES groupes musculaires, être réalisable avec le matériel disponible (ou au poids du corps), et être DIFFÉRENTE des exercices à éviter. Garde des séries/reps/repos cohérents avec l'exercice d'origine. Pour un exercice cardio, mets cardio:true, "duration" et "zone", sets:0, reps:"". N'utilise jamais de tiret cadratin. Format JSON : {"name":"","sets":4,"reps":"8-10","load":"","note":"consigne courte","rest":90,"cardio":false,"duration":"","zone":""}`;

  const user = [
    `Exercice à remplacer : ${name}${body.note ? ` (consigne : ${body.note})` : ""}.`,
    body.cardio ? "C'est un exercice cardio." : "C'est un exercice de musculation.",
    body.sessionTitle ? `Séance : ${body.sessionTitle}.` : "",
    `Matériel disponible : ${equipment.length ? equipment.join(", ") : "poids du corps uniquement"}. N'utilise aucun matériel hors de cette liste.`,
    `Exercices à éviter (déjà proposés) : ${avoid.join(", ")}.`,
    "Donne une seule alternative sûre et équivalente.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await (await anthropicForUser(ctx.userId)).messages.create({
      model: MODELS.assist,
      max_tokens: 600,
      ...effortConfig(MODELS.assist, "low"),
      system,
      messages: [{ role: "user", content: user }],
    });
    const exercise = exerciseShape.parse(parseJsonLoose(textOf(message)));
    await recordCall(ctx.userId, "coach", {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    });
    await chargeAiUsage(coachTenant, "action", "alternative", ctx.userId);
    return NextResponse.json({ exercise });
  } catch {
    return NextResponse.json({ error: "Alternative indisponible, réessaie." }, { status: 502 });
  }
}
