import { NextResponse } from "next/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { alternativeExercise } from "@/lib/exercise-alternatives";
import { resolveLocale, userLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

// UN exercice de remplacement quand le matériel n'est pas disponible, ou que
// le client veut simplement autre chose. L'app remplace la carte côté client,
// sans toucher au programme enregistré.
//
// SANS IA, ET DONC SANS COÛT NI QUOTA. Le choix se déduit de trois données
// qu'on possède déjà : la famille musculaire du mouvement d'origine, le
// matériel déclaré par le client, et les exercices déjà présents dans la
// séance. Un modèle de langage n'apportait rien de plus ici, et il pouvait
// proposer une machine absente ou un mouvement hors bibliothèque (donc sans
// fiche ni photos). Voir lib/exercise-alternatives.ts.
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json({ error: t("srv.duringProgram") }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    cardio?: boolean;
    avoid?: string[];
    sets?: number;
    reps?: string;
    rest?: number;
    duration?: string;
    zone?: string;
  };
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: t("srv.missingExercise") }, { status: 400 });

  const supabase = await createClient();
  const { data: equipRows } = await supabase
    .from("equipment")
    .select("name")
    .eq("user_id", ctx.userId)
    .eq("enabled", true);

  const exercise = alternativeExercise({
    name,
    equipment: (equipRows ?? []).map((e) => e.name as string),
    avoid: Array.isArray(body.avoid) ? body.avoid.map(String) : [],
    cardio: !!body.cardio,
    sets: typeof body.sets === "number" ? body.sets : undefined,
    reps: typeof body.reps === "string" ? body.reps : undefined,
    rest: typeof body.rest === "number" ? body.rest : undefined,
    duration: typeof body.duration === "string" ? body.duration : undefined,
    zone: typeof body.zone === "string" ? body.zone : undefined,
  });

  // Rien de convenable : on le dit. Servir un mouvement d'un autre groupe
  // musculaire, ou qui demande du matériel absent, serait pire que rien.
  if (!exercise) return NextResponse.json({ error: t("srv.altNone") }, { status: 404 });
  return NextResponse.json({ exercise });
}
