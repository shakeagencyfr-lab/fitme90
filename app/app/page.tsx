import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { accessLabel } from "@/lib/access";
import { Card, Stat, MonoLabel, ButtonLink, Alert } from "@/components/ui";
import { TrainingDaysEditor } from "@/components/training-days";
import { CyclesCarousel } from "@/components/cycles-carousel";
import { RegularityScore } from "@/components/regularity-score";
import { CatchUp } from "@/components/catch-up";
import { restPattern, startWeekday, isRestDay, dateOfProgramDay } from "@/lib/schedule";
import { computeAdherence, missedDays } from "@/lib/streak";
import { DAYS } from "@/lib/questionnaire";
import type { Plan } from "@/lib/program";
import { PROGRAM_DAYS } from "@/lib/config";

export const metadata = { title: "Programme, FitMe90" };

async function loadPlanAndDays(
  userId: string,
): Promise<{ plan: Plan | null; trainDays: string[]; doneDays: number[] }> {
  const supabase = await createClient();
  const [{ data: prog }, { data: quiz }, { data: logs }] = await Promise.all([
    supabase
      .from("programs")
      .select("plan")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ plan: Plan }>(),
    supabase
      .from("questionnaires")
      .select("train_days")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ train_days: string[] }>(),
    supabase.from("session_logs").select("day").eq("user_id", userId),
  ]);
  return {
    plan: prog?.plan ?? null,
    trainDays: quiz?.train_days ?? [],
    doneDays: (logs ?? []).map((l: { day: number }) => l.day),
  };
}

export default async function ProgrammePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null; // le layout redirige déjà

  const { access } = ctx;

  // --- États sans plan consultable ---
  if (access.phase === "not_paid") {
    return (
      <Empty
        title="Crée ton programme"
        body="Réponds au questionnaire et photographie ta salle. Le paiement unique de 190 € intervient juste après, puis ton programme sur 90 jours est généré."
        cta={{ href: "/questionnaire", label: "Commencer le questionnaire" }}
      />
    );
  }
  if (access.phase === "not_started") {
    return (
      <Empty
        title="Crée ton programme"
        body="Réponds au questionnaire et photographie ta salle : ton programme est généré à partir de tes réponses. Le décompte des 90 jours démarre à ce moment-là."
        cta={{ href: "/questionnaire", label: "Commencer le questionnaire" }}
      />
    );
  }
  if (access.phase === "ended") {
    return (
      <Empty
        title="Accès terminé"
        body="Tes 90 jours et la période de consultation sont écoulés. Pour repartir sur un nouveau cycle, débloque un nouveau programme."
        cta={{ href: "/app/paiement", label: "Reprendre un programme" }}
      />
    );
  }

  const { plan, trainDays, doneDays } = await loadPlanAndDays(ctx.userId);
  if (!plan) {
    return (
      <Empty
        title="Programme à générer"
        body="Ton compte est actif mais aucun programme n'a encore été généré."
        cta={{ href: "/questionnaire", label: "Générer mon programme" }}
      />
    );
  }

  const planRest = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const pattern = restPattern(trainDays, planRest);
  const startWd = startWeekday(ctx.profile?.start_date);
  const trainNames = plan.weekPlan.filter((d) => !d.rest).map((d) => d.name);

  // Adhérence / série : seulement une fois le programme démarré (jour ≥ 1).
  const showAdherence = access.phase !== "scheduled";
  const adherence = computeAdherence({
    pattern,
    startWd,
    currentDay: access.day,
    completedDays: doneDays,
    programDays: PROGRAM_DAYS,
  });
  const todayTraining = access.day >= 1 && !isRestDay(access.day, pattern, startWd);

  // Séances manquées à rattraper (calendrier fixe) : jours d'entraînement passés
  // non validés, avec leur vraie date.
  const missed = showAdherence
    ? missedDays({ pattern, startWd, currentDay: access.day, completedDays: doneDays, programDays: PROGRAM_DAYS })
    : [];
  const missedItems = ctx.profile?.start_date
    ? missed.map((day) => ({
        day,
        date: dateOfProgramDay(ctx.profile!.start_date!, day).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }),
      }))
    : missed.map((day) => ({ day, date: `jour ${day}` }));
  const startFmt = ctx.profile?.start_date
    ? new Date(`${ctx.profile.start_date}T00:00:00Z`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";
  const dayStat = access.phase === "scheduled" ? "J−" + (1 - access.day) : `${access.day}/${PROGRAM_DAYS}`;

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{accessLabel(access)}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Ton programme
        </h1>
        <p className="text-[15px] leading-[1.6] text-muted">{plan.summary}</p>
      </header>

      {access.phase === "grace" ? (
        <Alert tone="info">
          Programme terminé. Le coach IA est désactivé, mais ton plan reste
          consultable pendant encore {access.daysUntilAccessEnd} jour(s).
        </Alert>
      ) : null}

      {access.phase === "scheduled" ? (
        <Alert tone="info">
          Ton programme démarre le {startFmt} (dans {1 - access.day} jour(s)). Tu peux
          déjà tout consulter ; le coach IA et le journal des séances s'activent le
          jour J.
        </Alert>
      ) : null}

      {/* Cycles, en carrousel horizontal avec explications approfondies */}
      <CyclesCarousel cycles={plan.cycles.slice(0, 3)} />

      {/* Semaine type, reflète les jours choisis. Défilement horizontal sur
          mobile : cartes larges lisibles, on glisse pour voir la suite. */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel>Semaine type</MonoLabel>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2 sm:hidden">
            glisse →
          </span>
        </div>
        <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {DAYS.map((code, i) => {
              const rest = pattern[i];
              const trainIdx = pattern.slice(0, i).filter((r) => !r).length;
              const name = rest ? "Repos" : trainNames[trainIdx % (trainNames.length || 1)] || "Séance";
              return (
                <div
                  key={code}
                  className={[
                    "flex min-h-[96px] w-[104px] shrink-0 flex-col gap-1.5 rounded-control border p-3 transition-colors",
                    rest ? "border-line bg-surface-2" : "border-brand/40 bg-alert",
                  ].join(" ")}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
                    {code}
                  </span>
                  <span
                    className={[
                      "text-[13px] leading-snug",
                      rest ? "text-muted-2" : "font-medium text-ink",
                    ].join(" ")}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <TrainingDaysEditor initial={trainDays} />

      {/* Résumé chiffré */}
      <section className="grid gap-3 grid-cols-2">
        <Card><Stat label="Jour" value={dayStat} sub={access.phase === "scheduled" ? "Avant le départ" : "Programme en cours"} /></Card>
        <Card><Stat label="Calories / jour" value={`${plan.nutrition.kcal}`} sub="Jour d'entraînement" /></Card>
      </section>

      {/* Score de régularité : une fois le programme démarré (jour ≥ 1) */}
      {showAdherence ? (
        <RegularityScore stats={adherence} todayTraining={todayTraining} />
      ) : null}

      {/* Séances à rattraper (calendrier fixe) */}
      <CatchUp items={missedItems} />

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/app/seance" variant="primary">Aller à ma séance</ButtonLink>
        <ButtonLink href="/app/nutrition" variant="outline">Voir la nutrition</ButtonLink>
      </div>
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-start justify-center gap-4">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <p className="text-[15px] leading-[1.6] text-muted">{body}</p>
      <ButtonLink href={cta.href} variant="primary" className="h-[52px] px-7 text-[16px]">
        {cta.label}
      </ButtonLink>
    </div>
  );
}
