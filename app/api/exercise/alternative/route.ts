import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { exerciseShape } from "@/lib/program";
import { checkLimit, recordCall, DAY_MS } from "@/lib/ratelimit";
import { LIMIT_COACH_PER_DAY, COACH_CREDENTIAL } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

// Génère UN exercice alternatif quand le matériel/la machine n'est pas dispo,
// ou que le client veut un autre mouvement. Même groupe musculaire, matériel
// disponible uniquement. L'app remplace l'exercice dans sa carte (côté client).
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json({ error: "Disponible pendant tes 90 jours." }, { status: 403 });
  }

  const limit = await checkLimit(ctx.userId, "coach", LIMIT_COACH_PER_DAY, DAY_MS);
  if (!limit.ok) {
    return NextResponse.json({ error: "Limite du jour atteinte, réessaie demain." }, { status: 429 });
  }

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

  const system = `Tu es ${COACH_CREDENTIAL}. Tu proposes UN exercice de remplacement quand un mouvement n'est pas réalisable (machine ou matériel indisponible). Réponds UNIQUEMENT par un objet JSON valide, sans texte autour. L'alternative doit : cibler LES MÊMES groupes musculaires, être réalisable avec le matériel disponible (ou au poids du corps), et être DIFFÉRENTE des exercices à éviter. Garde des séries/reps/repos cohérents avec l'exercice d'origine. Pour un exercice cardio, mets cardio:true, "duration" et "zone", sets:0, reps:"". N'utilise jamais de tiret cadratin. Format JSON : {"name":"","sets":4,"reps":"8-10","load":"","note":"consigne courte","rest":90,"cardio":false,"duration":"","zone":""}`;

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
      model: MODELS.coach,
      max_tokens: 600,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const exercise = exerciseShape.parse(parseJsonLoose(textOf(message)));
    await recordCall(ctx.userId, "coach", {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    });
    return NextResponse.json({ exercise });
  } catch {
    return NextResponse.json({ error: "Alternative indisponible, réessaie." }, { status: 502 });
  }
}
