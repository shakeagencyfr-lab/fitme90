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
import { sessionForDay, type Plan } from "@/lib/program";
import { coveredDays, blockPosition, nextBlockDue } from "@/lib/block-logic";
import { subscriptionIsActive } from "@/lib/subscription";
import { NextBlockPrompt } from "@/components/next-block";
import { blockLabel } from "@/lib/templates";

export const metadata = { title: "Programme" };

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
        body="Réponds au questionnaire et photographie ta salle. Le paiement de ton offre intervient juste après, puis ton programme est généré."
        cta={{ href: "/questionnaire", label: "Commencer le questionnaire" }}
      />
    );
  }
  if (access.phase === "not_started") {
    return (
      <Empty
        title="Crée ton programme"
        body="Réponds au questionnaire et photographie ta salle : ton programme est généré à partir de tes réponses. Le décompte de ton programme démarre à ce moment-là."
        cta={{ href: "/questionnaire", label: "Commencer le questionnaire" }}
      />
    );
  }
  if (access.phase === "ended") {
    return (
      <Empty
        title="Accès terminé"
        body="Ton programme et la période de consultation sont écoulés. Pour repartir sur un nouveau cycle, débloque un nouveau programme."
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
    programDays: access.programDays,
  });
  const todayTraining = access.day >= 1 && !isRestDay(access.day, pattern, startWd);

  // Séances manquées à rattraper (calendrier fixe) : jours d'entraînement passés
  // non validés, avec leur vraie date.
  const missed = showAdherence
    ? missedDays({ pattern, startWd, currentDay: access.day, completedDays: doneDays, programDays: access.programDays })
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
  const dayStat = access.phase === "scheduled" ? "J−" + (1 - access.day) : `${access.day}/${access.programDays}`;

  // Carte « Aujourd'hui » : la 1re chose vue en ouvrant l'app. Séance du jour
  // (ou repos), état validé, et l'action à faire maintenant.
  const todaySession =
    access.day >= 1 && access.day <= access.programDays
      ? sessionForDay(plan, access.day, pattern, startWd)
      : undefined;
  const todayDone = doneDays.includes(access.day);
  const todayFmt = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
  const firstName = (ctx.profile?.name ?? "").trim().split(/\s+/)[0] || "";
  const showToday = access.phase === "active" || access.phase === "restricted";

  // Blocs évolutifs : où en est le client, et le bloc suivant manque-t-il ?
  // (Le cron le construit une semaine avant ; s'il est en retard, le client
  // peut le demander lui-même.)
  const covered = coveredDays(plan);
  const position = blockPosition(Math.max(1, access.day), access.programDays);
  const subscribed =
    !!ctx.profile?.subscription_id &&
    subscriptionIsActive(ctx.profile.subscription_status, ctx.profile.subscription_current_period_end);
  const blockMissing =
    access.phase === "active" &&
    access.day > covered &&
    nextBlockDue({ day: access.day, covered, programDays: access.programDays, subscribed, lead: 0 });
  const nextBlockName = blockLabel(Math.floor(covered / 90), position.totalBlocks);

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{accessLabel(access)}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {firstName ? `Salut ${firstName} !` : "Ton programme"}
        </h1>
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

      {blockMissing ? <NextBlockPrompt label={nextBlockName} /> : null}

      {/* ─── Aujourd'hui : l'action du jour, en premier ─── */}
      {showToday ? (
        <Card className="relative flex flex-col gap-3 overflow-hidden border-brand/30">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-brand" />
          <div className="flex items-baseline justify-between gap-3">
            <MonoLabel className="text-brand">Aujourd&apos;hui</MonoLabel>
            <span className="text-[12.5px] capitalize text-muted-2">{todayFmt}</span>
          </div>
          {todayTraining && todaySession ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="font-archivo font-extrabold text-[24px] leading-[1.1] tracking-[-0.02em] text-ink">
                  {todaySession.title}
                </h2>
                <p className="text-[13.5px] text-muted">
                  {todaySession.cycleLabel}
                  {todaySession.exercises?.length ? ` · ${todaySession.exercises.length} exercices` : ""}
                </p>
              </div>
              {todayDone ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-pill bg-brand/10 px-3 py-1.5 text-[13.5px] font-semibold text-brand">
                    ✓ Séance validée, bien joué !
                  </span>
                  <ButtonLink href="/app/evolution" variant="outline" className="h-10">
                    Noter mon poids
                  </ButtonLink>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/app/seance" variant="primary" className="h-[50px] px-6 text-[15.5px]">
                    Démarrer ma séance
                  </ButtonLink>
                  <ButtonLink href="/app/nutrition" variant="ghost" className="h-[50px]">
                    Mes repas du jour
                  </ButtonLink>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="font-archivo font-extrabold text-[24px] leading-[1.1] tracking-[-0.02em] text-ink">
                  Jour de repos
                </h2>
                <p className="text-[13.5px] leading-[1.6] text-muted">
                  C&apos;est là que le muscle se construit : marche, hydratation, sommeil.
                  Et l&apos;assiette fait le reste.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/app/nutrition" variant="primary" className="h-[50px] px-6 text-[15.5px]">
                  Mes repas du jour
                </ButtonLink>
                <ButtonLink href="/app/evolution" variant="ghost" className="h-[50px]">
                  Noter mon poids
                </ButtonLink>
              </div>
            </>
          )}
        </Card>
      ) : null}

      {/* Score de régularité : une fois le programme démarré (jour ≥ 1) */}
      {showAdherence ? (
        <RegularityScore stats={adherence} todayTraining={todayTraining} />
      ) : null}

      {/* Séances à rattraper (calendrier fixe) */}
      <CatchUp items={missedItems} />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <MonoLabel>Ton programme</MonoLabel>
          {access.day >= 1 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
              {position.label} · Cycle {position.cycleIndex + 1}
            </span>
          ) : null}
        </div>
        <p className="text-[14.5px] leading-[1.6] text-muted">{plan.summary}</p>
        <ButtonLink href="/plan-pdf" variant="ghost" className="mt-1 h-10 self-start">
          Exporter mon plan en PDF
        </ButtonLink>
      </section>

      {/* Cycles, en carrousel horizontal avec explications approfondies */}
      <CyclesCarousel cycles={plan.cycles} />

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
