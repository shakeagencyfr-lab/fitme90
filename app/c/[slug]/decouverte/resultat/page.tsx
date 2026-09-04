import Link from "next/link";
import { brandForSlug } from "@/lib/branding";
import {
  buildMiniProgram,
  isGoal, isLevel, isEquipment, isFocus, isConcern, isSex, isActivity, isDuration,
  type Goal, type Level, type Equipment, type Focus, type Concern, type Sex, type Activity, type Duration,
} from "@/lib/lead-magnet";
import { PrintButton } from "@/components/print-button";
import { themeProps } from "@/components/tenant-theme";


export const dynamic = "force-dynamic";
export const metadata = { title: "Ta semaine découverte" };

export default async function ResultatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await brandForSlug(slug);
  const coachName = brand?.name || "ton coach";

  const goal: Goal = isGoal(sp.g ?? "") ? (sp.g as Goal) : "forme";
  const level: Level = isLevel(sp.l ?? "") ? (sp.l as Level) : "debutant";
  const equipment: Equipment = isEquipment(sp.e ?? "") ? (sp.e as Equipment) : "maison";
  const focus: Focus = isFocus(sp.f ?? "") ? (sp.f as Focus) : "equilibre";
  const concern: Concern = isConcern(sp.c ?? "") ? (sp.c as Concern) : "aucune";
  const sex: Sex = isSex(sp.s ?? "") ? (sp.s as Sex) : "nsp";
  const activity: Activity | null = isActivity(sp.a ?? "") ? (sp.a as Activity) : null;
  const days = Math.max(2, Math.min(6, Number(sp.d ?? 3) || 3));
  const durNum = Number(sp.du ?? 45);
  const duration: Duration = isDuration(durNum) ? durNum : 45;
  const firstName = (sp.n ?? "").slice(0, 40);

  // Les mesures sont facultatives. Une valeur absurde est ignorée plutôt que
  // d'imprimer un chiffre faux : il serait suivi.
  const mesure = (v: string | undefined, min: number, max: number): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
  };
  const age = mesure(sp.ag, 14, 99);
  const heightCm = mesure(sp.h, 120, 230);
  const weightKg = mesure(sp.w, 35, 250);

  const prog = buildMiniProgram({
    goal, level, days, equipment, duration, focus, concern, sex, age, heightCm, weightKg, activity,
  });
  const macros = prog.nutrition.macros;

  return (
    <div
      className="min-h-dvh bg-paper"
      {...themeProps(brand?.theme)}
    >
      {/* Barre d'action (masquée à l'impression) */}
      <div className="no-print sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <span className="text-[13.5px] text-muted">Ton programme est prêt 🎉</span>
          <PrintButton />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[820px] px-5 py-8 sm:px-8 sm:py-12">
        {/* En-tête document */}
        {/* En-tête du document, à la marque du coach.
            Le logo est imprimé, pas seulement affiché : c'est un document qui
            circule, souvent transféré, et qui doit rester identifiable une fois
            détaché de la page. D'où aussi le bandeau de couleur et la mention
            « offert par », répétée en pied de page. */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-brand pb-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
              Semaine découverte · offert par {coachName}
            </span>
            <h1 className="font-archivo text-[clamp(22px,4vw,32px)] font-extrabold leading-tight tracking-[-0.02em] text-ink">
              {prog.title}
            </h1>
          </div>
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={coachName} className="h-14 w-auto max-w-[170px] shrink-0 object-contain" />
          ) : (
            <span className="font-archivo text-[18px] font-extrabold tracking-[-0.02em] text-ink">{coachName}</span>
          )}
        </div>

        <p className="mt-5 text-[15px] leading-[1.6] text-body">
          {firstName ? `Bravo ${firstName} ! ` : "Bravo ! "}{prog.intro}
        </p>

        {/* Ce que les réponses ont changé. Sans cette liste, un document
            calibré ressemble à un document générique : la personne ne peut pas
            savoir que le squat a été retiré parce qu'elle a coché « genoux ». */}
        <section className="mt-4 break-inside-avoid rounded-card border border-brand/25 bg-brand/[0.05] p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Calibré sur tes réponses</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {prog.personalisation.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[13px] leading-snug text-body">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{t}
              </li>
            ))}
          </ul>
        </section>

        {/* Le calendrier d'abord : sans lui, personne ne sait quand faire quoi */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Ta semaine</h2>
          <div className="mt-3 overflow-hidden rounded-card border border-line">
            {prog.weekPlan.map((d, i) => (
              <div
                key={d.label}
                className={`flex items-baseline gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-line-2" : ""} ${d.kind === "session" ? "bg-brand/[0.06]" : "bg-surface"}`}
              >
                <span className="w-[76px] shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">{d.label}</span>
                <span className={`w-[74px] shrink-0 font-archivo text-[13.5px] font-bold ${d.kind === "session" ? "text-brand" : "text-muted-2"}`}>
                  {d.title}
                </span>
                <span className="flex-1 text-[13px] leading-snug text-body">{d.note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Choisir sa charge : la question qui bloque tout le monde en salle */}
        <section className="mt-6 break-inside-avoid rounded-card border border-line bg-surface p-5">
          <h2 className="font-archivo text-[16px] font-bold text-ink">Quelle charge mettre ?</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {prog.loadGuide.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-body">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                {g}
              </li>
            ))}
          </ul>
        </section>

        {/* Séances */}
        <div className="mt-6 flex flex-col gap-6">
          {prog.sessions.map((s) => (
            <section key={s.title} className="break-inside-avoid rounded-card border border-line bg-surface p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-line-2 pb-2">
                <h2 className="font-archivo text-[18px] font-bold tracking-[-0.01em] text-ink">{s.title}</h2>
                <span className="text-[12.5px] text-muted-2">{s.focus}</span>
              </div>

              <div className="mb-4 rounded-control border border-line-2 bg-surface-2 px-3.5 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">Échauffement, 5 à 8 min</div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {s.warmup.map((w) => (
                    <li key={w} className="text-[12.5px] leading-snug text-body">{w}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col divide-y divide-line-2">
                {s.exercises.map((e) => (
                  <div key={e.name} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-archivo text-[14.5px] font-semibold text-ink">{e.name}</span>
                      <span className="font-mono text-[12px] tabular-nums text-body">
                        {e.sets} × {e.reps} <span className="text-muted-2">· repos {e.rest}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-snug text-muted">{e.cue}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted-2">
                      <span className="font-medium">Si c&apos;est pris ou impossible :</span> {e.alt}
                    </p>
                  </div>
                ))}
              </div>

              {s.finisher ? (
                <p className="mt-3 rounded-control border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-[12.5px] leading-snug text-body">
                  <span className="font-semibold text-ink">Pour finir : </span>{s.finisher}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        {/* Tableau de suivi : c'est lui qui rend l'impression utile */}
        <section className="mt-6 break-inside-avoid rounded-card border border-line bg-surface p-5">
          <h2 className="font-archivo text-[16px] font-bold text-ink">Note tes charges</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Sans trace écrite, tu ne sauras pas quoi faire la semaine suivante. Remplis au stylo, séance après séance.
          </p>
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                <th className="pb-1.5 font-medium">Exercice</th>
                <th className="w-[22%] pb-1.5 pl-2 font-medium">Charge</th>
                <th className="w-[22%] pb-1.5 pl-2 font-medium">Reps faites</th>
                <th className="w-[16%] pb-1.5 pl-2 font-medium">Ressenti</th>
              </tr>
            </thead>
            <tbody>
              {prog.sessions[0].exercises.map((e) => (
                <tr key={e.name} className="border-t border-line-2 text-[13px] text-body">
                  <td className="py-2.5 pr-2 font-medium text-ink">{e.name}</td>
                  <td className="py-2.5 pl-2 text-muted-2">.........</td>
                  <td className="py-2.5 pl-2 text-muted-2">.........</td>
                  <td className="py-2.5 pl-2 text-muted-2">.....</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Progression + cardio */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="break-inside-avoid rounded-card border border-line bg-surface p-5">
            <h3 className="mb-2 font-archivo text-[15px] font-bold text-ink">Les quatre prochaines semaines</h3>
            {/* Quatre lignes, pas une : c'est ce qui montre qu'il y a une
                méthode, et qui rend crédible un programme qui en a une sur
                douze mois. */}
            <ol className="flex flex-col divide-y divide-line-2">
              {prog.fourWeeks.map((w) => (
                <li key={w.week} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-brand">S{w.week}</span>
                    <span className="font-archivo text-[13.5px] font-bold text-ink">{w.headline}</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{w.detail}</p>
                </li>
              ))}
            </ol>
          </section>
          {prog.cardio ? (
            <section className="break-inside-avoid rounded-card border border-line bg-surface p-5">
              <h3 className="mb-2 font-archivo text-[15px] font-bold text-ink">{prog.cardio.title}</h3>
              <p className="text-[13px] leading-[1.6] text-body">{prog.cardio.body}</p>
            </section>
          ) : null}
        </div>

        {/* Nutrition : chiffrée et applicable, pas des principes */}
        <section className="mt-6 break-inside-avoid rounded-card border border-line bg-surface p-5">
          <h2 className="font-archivo text-[16px] font-bold text-ink">Nutrition</h2>
          {macros ? (
            <>
              {/* Le bloc qui fait la différence avec un programme gratuit
                  ordinaire : des cibles calculées sur les mesures réelles,
                  pas des principes. */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: "Calories / jour", v: `${macros.target.toLocaleString("fr-FR")} kcal` },
                  { k: "Protéines", v: `${macros.proteinG} g` },
                  { k: "Glucides", v: `${macros.carbG} g` },
                  { k: "Lipides", v: `${macros.fatG} g` },
                ].map((c) => (
                  <div key={c.k} className="rounded-control border border-brand/25 bg-brand/[0.06] px-3 py-2.5">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-2">{c.k}</div>
                    <div className="font-archivo text-[17px] font-extrabold tabular-nums leading-tight text-ink">{c.v}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-muted-2">
                Dépense estimée à {macros.tdee.toLocaleString("fr-FR")} kcal par jour (métabolisme de base{" "}
                {macros.bmr.toLocaleString("fr-FR")} kcal, formule de Mifflin-St Jeor, ajustée à ton activité et à tes{" "}
                {days} séances). IMC {macros.bmi}. Bois environ {macros.waterL} L d&apos;eau par jour.
              </p>
              {prog.nutrition.meals.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prog.nutrition.meals.map((m) => (
                    <span key={m.meal} className="rounded-pill border border-line-2 px-2.5 py-1 text-[12px] text-body">
                      {m.meal} <span className="font-mono tabular-nums text-muted-2">{m.kcal} kcal</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[13px] leading-[1.6] text-body">{prog.nutrition.calorieHint}</p>
          )}

          <ul className="mt-3 flex flex-col gap-1.5">
            {prog.nutrition.rules.map((n) => (
              <li key={n} className="flex items-start gap-2 text-[13px] leading-snug text-body">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{n}
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">Une journée type</h3>
              <div className="mt-2 flex flex-col divide-y divide-line-2">
                {prog.nutrition.sampleDay.map((m) => (
                  <div key={m.meal} className="py-2 first:pt-0">
                    <div className="font-archivo text-[13px] font-semibold text-ink">{m.meal}</div>
                    <div className="text-[12.5px] leading-snug text-muted">{m.example}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">Liste de courses</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {prog.nutrition.shopping.map((it) => (
                  <li key={it} className="rounded-pill border border-line-2 px-2.5 py-1 text-[12px] text-body">{it}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Conseils */}
        <section className="mt-6 break-inside-avoid rounded-card border border-line bg-surface p-5">
          <h2 className="mb-2 font-archivo text-[16px] font-bold text-ink">Quatre règles qui font la différence</h2>
          <ul className="flex flex-col gap-1.5">
            {prog.tips.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[13px] leading-snug text-body">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{t}
              </li>
            ))}
          </ul>
        </section>

        {/* Ce que le programme complet ajoute. Dit honnêtement, pas survendu. */}
        <section className="mt-6 break-inside-avoid rounded-card border border-line-2 bg-surface-2 p-5">
          <h2 className="mb-2 font-archivo text-[16px] font-bold text-ink">Et ensuite ?</h2>
          <ul className="flex flex-col gap-1.5">
            {prog.next.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[13px] leading-snug text-body">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{t}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA (masqué à l'impression) */}
        <div className="no-print mt-8 flex flex-col items-center gap-3 rounded-card border border-brand/30 bg-brand/[0.06] p-6 text-center">
          <div className="font-archivo text-[18px] font-bold text-ink">Prêt·e à aller plus loin ?</div>
          <p className="max-w-[52ch] text-[14px] leading-[1.55] text-muted">
            Le programme complet s&apos;adapte à 100 % à ton profil et évolue avec toi, avec le suivi de {coachName}.
          </p>
          <Link href={`/c/${slug}`} className="tap mt-1 inline-flex h-11 items-center justify-center rounded-btn bg-brand px-6 text-[14.5px] font-semibold text-white hover:bg-brand-hover">
            Découvrir les programmes
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t-2 border-brand pt-3">
          <span className="font-archivo text-[13px] font-bold text-ink">{coachName}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">
            Ta semaine découverte
          </span>
        </div>

        <p className="mt-4 text-center text-[11.5px] leading-[1.5] text-muted-2">
          Document généré à partir de tes réponses, sans intelligence artificielle : les mêmes réponses donnent le même
          programme. Accompagnement sportif et de bien-être, sans visée thérapeutique. En cas de douleur ou de
          pathologie, consulte un professionnel de santé.
        </p>
      </main>

      <style dangerouslySetInnerHTML={{ __html: "@media print { .no-print { display:none !important } body { background:#fff } }" }} />
    </div>
  );
}
