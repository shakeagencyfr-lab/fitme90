import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { accessLabel, unpaidNextStep } from "@/lib/access";
import { Card, Stat, MonoLabel, ButtonLink, Alert } from "@/components/ui";
import { TrainingDaysEditor } from "@/components/training-days";
import { CyclesCarousel } from "@/components/cycles-carousel";
import { RegularityScore } from "@/components/regularity-score";
import { CatchUp } from "@/components/catch-up";
import { restPattern, startWeekday, isRestDay, dateOfProgramDay } from "@/lib/schedule";
import { computeAdherence, missedDays } from "@/lib/streak";
import { DAYS } from "@/lib/questionnaire";
import { sessionForDay, weekSessionTitles, type Plan } from "@/lib/program";
import { coveredDays, blockPosition, nextBlockDue } from "@/lib/block-logic";
import { subscriptionIsActive } from "@/lib/subscription";
import { NextBlockPrompt } from "@/components/next-block";
import { blockLabel } from "@/lib/templates";
import { UpgradeCard } from "@/components/upgrade-card";
import { upgradeEligible } from "@/lib/upgrade-logic";
import { upgradeQuote, confirmUpgrade } from "@/lib/upgrade";
import { DAYS_PER_MONTH } from "@/lib/config";
import { getT, userLocale } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n";
import { dayLabel } from "@/lib/i18n/quiz";

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

export default async function ProgrammePage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; session_id?: string }>;
}) {
  let ctx = await getSessionContext();
  if (!ctx) return null; // le layout redirige déjà
  const sp = await searchParams;

  // Retour de la bascule 3 → 12 mois : on vérifie la session Stripe (clé du
  // coach) et on applique. Idempotent : recharger la page ne refait rien. On
  // relit ensuite le contexte pour que la durée affichée soit déjà la bonne.
  let upgraded = false;
  if (sp.upgrade === "1" && sp.session_id) {
    upgraded = await confirmUpgrade(ctx.userId, sp.session_id);
    if (upgraded) ctx = (await getSessionContext()) ?? ctx;
  } else if (sp.upgrade === "1") {
    upgraded = true; // bascule sans encaissement (rien à régler), déjà appliquée
  }

  const { access } = ctx;
  const { locale, t } = await getT(await userLocale(ctx.userId));
  const dl = dateLocale(locale);

  // --- États sans plan consultable ---
  if (access.phase === "not_paid") {
    // Le questionnaire est-il déjà rempli ? Si oui, la prochaine étape n'est pas
    // de le refaire mais de payer : sans ce test, l'écran de paiement devenait
    // inatteignable une fois revenu sur le tableau de bord.
    const supabase = await createClient();
    const { data: quiz } = await supabase
      .from("questionnaires")
      .select("id")
      .eq("user_id", ctx.userId)
      .limit(1)
      .maybeSingle<{ id: string }>();
    return unpaidNextStep(!!quiz) === "/app/paiement" ? (
      <Empty
        title={t("dashboard.resumeTitle")}
        body={t("dashboard.resumeBody")}
        cta={{ href: "/app/paiement", label: t("dashboard.resumeCta") }}
        secondary={{ href: "/questionnaire", label: t("dashboard.editAnswers") }}
      />
    ) : (
      <Empty
        title={t("dashboard.createTitle")}
        body={t("dashboard.createBodyNotPaid")}
        cta={{ href: "/questionnaire", label: t("dashboard.startQuiz") }}
      />
    );
  }
  if (access.phase === "not_started") {
    return (
      <Empty
        title={t("dashboard.createTitle")}
        body={t("dashboard.createBodyNotStarted")}
        cta={{ href: "/questionnaire", label: t("dashboard.startQuiz") }}
      />
    );
  }
  if (access.phase === "ended") {
    return (
      <Empty
        title={t("dashboard.endedTitle")}
        body={t("dashboard.endedBody")}
        cta={{ href: "/app/paiement", label: t("dashboard.endedCta") }}
      />
    );
  }

  const { plan, trainDays, doneDays } = await loadPlanAndDays(ctx.userId);
  if (!plan) {
    return (
      <Empty
        title={t("dashboard.toGenerateTitle")}
        body={t("dashboard.toGenerateBody")}
        cta={{ href: "/questionnaire", label: t("dashboard.toGenerateCta") }}
      />
    );
  }

  const planRest = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const pattern = restPattern(trainDays, planRest);
  const startWd = startWeekday(ctx.profile?.start_date);
  // Séances de la semaine en cours, calculées comme la carte « aujourd'hui ».
  // Le weekPlan seul décalait l'affichage quand le programme ne démarrait pas
  // le premier jour d'entraînement de la semaine.
  const weekTitles = weekSessionTitles(plan, access.day, pattern, startWd, access.programDays);

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
        date: dateOfProgramDay(ctx.profile!.start_date!, day).toLocaleDateString(dl, {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }),
      }))
    : missed.map((day) => ({ day, date: `${t("common.day").toLowerCase()} ${day}` }));
  const startFmt = ctx.profile?.start_date
    ? new Date(`${ctx.profile.start_date}T00:00:00Z`).toLocaleDateString(dl, {
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
  const todayFmt = new Date().toLocaleDateString(dl, {
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

  // Bascule 3 → 12 mois (semaine 10) : uniquement un client 3 mois payé une
  // fois, si son coach vend un 12 mois. On montre ses vrais chiffres.
  const durationMonths = Math.round(access.programDays / DAYS_PER_MONTH);
  const eligible = upgradeEligible({ day: access.day, phase: access.phase, durationMonths, subscribed });
  const quote = eligible ? await upgradeQuote(ctx.userId) : null;
  let weightDelta: number | null = null;
  if (quote) {
    const supabase = await createClient();
    const { data: w } = await supabase
      .from("weights")
      .select("kg")
      .eq("user_id", ctx.userId)
      .order("measured_at", { ascending: true })
      .returns<{ kg: number }[]>();
    if (w && w.length >= 2) weightDelta = +(w[w.length - 1].kg - w[0].kg).toFixed(1);
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{accessLabel(access, locale)}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {firstName ? t("dashboard.hello", { name: firstName }) : t("dashboard.yourProgram")}
        </h1>
      </header>

      {access.phase === "grace" ? (
        <Alert tone="info">{t("dashboard.graceNotice", { days: access.daysUntilAccessEnd })}</Alert>
      ) : null}

      {access.phase === "scheduled" ? (
        <Alert tone="info">{t("dashboard.scheduledNotice", { date: startFmt, days: 1 - access.day })}</Alert>
      ) : null}

      {upgraded ? <Alert tone="info">{t("dashboard.upgraded")}</Alert> : null}
      {sp.upgrade === "0" ? <Alert>{t("dashboard.upgradeCancelled")}</Alert> : null}

      {blockMissing ? <NextBlockPrompt label={nextBlockName} /> : null}

      {quote ? (
        <UpgradeCard
          done={adherence.done}
          due={adherence.due}
          weightDelta={weightDelta}
          offerName={quote.target.name}
          twelveMonthCents={quote.target.price_cents ?? 0}
          alreadyPaidCents={quote.alreadyPaidCents}
          dueCents={quote.dueCents}
          daysLeft={access.daysUntilProgramEnd}
        />
      ) : null}

      {/* ─── Aujourd'hui : l'action du jour, en premier ─── */}
      {showToday ? (
        <Card className="relative flex flex-col gap-3 overflow-hidden border-brand/30">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-brand" />
          <div className="flex items-baseline justify-between gap-3">
            <MonoLabel className="text-brand">{t("dashboard.today")}</MonoLabel>
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
                  {todaySession.exercises?.length ? ` · ${todaySession.exercises.length} ${t("dashboard.exercises")}` : ""}
                </p>
              </div>
              {todayDone ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-pill bg-brand/10 px-3 py-1.5 text-[13.5px] font-semibold text-brand">
                    {t("dashboard.sessionDone")}
                  </span>
                  <ButtonLink href="/app/evolution" variant="outline" className="h-10">
                    {t("dashboard.logWeight")}
                  </ButtonLink>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/app/seance" variant="primary" className="h-[50px] px-6 text-[15.5px]">
                    {t("dashboard.startSession")}
                  </ButtonLink>
                  <ButtonLink href="/app/nutrition" variant="ghost" className="h-[50px]">
                    {t("dashboard.mealsToday")}
                  </ButtonLink>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="font-archivo font-extrabold text-[24px] leading-[1.1] tracking-[-0.02em] text-ink">
                  {t("dashboard.restDay")}
                </h2>
                <p className="text-[13.5px] leading-[1.6] text-muted">{t("dashboard.restDayBody")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/app/nutrition" variant="primary" className="h-[50px] px-6 text-[15.5px]">
                  {t("dashboard.mealsToday")}
                </ButtonLink>
                <ButtonLink href="/app/evolution" variant="ghost" className="h-[50px]">
                  {t("dashboard.logWeight")}
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
          <MonoLabel>{t("dashboard.yourProgram")}</MonoLabel>
          {access.day >= 1 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
              {position.label} · {t("dashboard.cycle")} {position.cycleIndex + 1}
            </span>
          ) : null}
        </div>
        <p className="text-[14.5px] leading-[1.6] text-muted">{plan.summary}</p>
        {/* Téléchargement direct : la route rend le fichier et l'envoie en
            pièce jointe. Auparavant ce lien ouvrait une page qui appelait la
            boîte d'impression du navigateur, où il fallait aller chercher
            « Enregistrer au format PDF ». */}
        <ButtonLink href="/api/plan-pdf" variant="ghost" className="mt-1 h-10 self-start" download>
          {t("dashboard.exportPdf")}
        </ButtonLink>
      </section>

      {/* Cycles, en carrousel horizontal avec explications approfondies */}
      <CyclesCarousel cycles={plan.cycles} />

      {/* Semaine type, reflète les jours choisis. Défilement horizontal sur
          mobile : cartes larges lisibles, on glisse pour voir la suite. */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel>{t("dashboard.typicalWeek")}</MonoLabel>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2 sm:hidden">
            {t("dashboard.swipe")}
          </span>
        </div>
        <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {DAYS.map((code, i) => {
              const rest = pattern[i];
              const name = rest ? t("dashboard.rest") : weekTitles[i] || t("dashboard.session");
              return (
                <div
                  key={code}
                  className={[
                    "flex min-h-[96px] w-[104px] shrink-0 flex-col gap-1.5 rounded-control border p-3 transition-colors",
                    rest ? "border-line bg-surface-2" : "border-brand/40 bg-alert",
                  ].join(" ")}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
                    {dayLabel(code, locale)}
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
        <Card><Stat label={t("common.day")} value={dayStat} sub={access.phase === "scheduled" ? t("dashboard.beforeStart") : t("dashboard.programInProgress")} /></Card>
        <Card><Stat label={t("dashboard.caloriesPerDay")} value={`${plan.nutrition.kcal}`} sub={t("dashboard.trainingDay")} /></Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/app/seance" variant="primary">{t("dashboard.goToSession")}</ButtonLink>
        <ButtonLink href="/app/nutrition" variant="outline">{t("dashboard.seeNutrition")}</ButtonLink>
      </div>
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
  secondary,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[520px] flex-col items-start justify-center gap-4">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {title}
      </h1>
      <p className="text-[15px] leading-[1.6] text-muted">{body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={cta.href} variant="primary" className="h-[52px] px-7 text-[16px]">
          {cta.label}
        </ButtonLink>
        {secondary ? (
          <ButtonLink href={secondary.href} variant="outline" className="h-[52px] px-5 text-[15px]">
            {secondary.label}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
