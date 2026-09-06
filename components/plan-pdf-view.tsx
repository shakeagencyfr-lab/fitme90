import Link from "next/link";
import { cycleSessions, type Plan, type Session } from "@/lib/program";
import { isCircuitSession } from "@/lib/circuit";
import { PrintButton, pdfButtonClass } from "@/components/print-button";
import { dateLocale, makeT, type Locale } from "@/lib/i18n";
import { macrosForDay, pnum, grp } from "@/lib/nutrition";

// Rendu autonome du plan pour l'export PDF (impression navigateur). Partagé par
// la page client /plan-pdf et l'aperçu de démonstration.
export function PlanPdfView({
  plan,
  clientName,
  coachName,
  logoUrl,
  locale,
  backHref = "/app",
  downloadHref = null,
}: {
  plan: Plan;
  clientName: string;
  coachName: string;
  logoUrl: string | null;
  locale: Locale;
  backHref?: string | null;
  /**
   * Route qui rend le fichier PDF. Quand elle est fournie, le bouton télécharge
   * pour de vrai ; sinon il ouvre l'impression du navigateur, seule option de
   * l'aperçu de démonstration, qui n'a pas de session donc pas de fichier.
   */
  downloadHref?: string | null;
}) {
  const t = makeT(locale);
  const today = new Date().toLocaleDateString(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" });
  // Mêmes chiffres que l'écran nutrition : la règle vit dans lib/nutrition,
  // les deux surfaces la lisent au lieu de la recalculer chacune de son côté.
  const base = {
    kcal: pnum(plan.nutrition.kcal),
    protein: pnum(plan.nutrition.protein),
    carbs: pnum(plan.nutrition.carbs),
    fat: pnum(plan.nutrition.fat),
  };
  const train = macrosForDay(base, false);
  const repos = macrosForDay(base, true);
  return (
    <div className="mx-auto max-w-[820px] px-5 py-8 text-ink print:px-0 print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 14mm; }
          body { background: #fff !important; }
          .pdf-card { break-inside: avoid; box-shadow: none !important; border-color: #ccc !important; }
          h2, h3 { break-after: avoid; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between gap-3">
        {backHref ? <Link href={backHref} className="text-[14px] text-muted hover:text-ink">← {t("common.back")}</Link> : <span />}
        {downloadHref ? (
          <a href={downloadHref} download className={pdfButtonClass}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            {t("pdf.save")}
          </a>
        ) : (
          <PrintButton label={t("pdf.print")} />
        )}
      </div>

      <header className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{t("pdf.eyebrow")}</div>
          <h1 className="mt-1 font-archivo text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
            {clientName ? t("pdf.titleFor", { name: clientName }) : t("pdf.title")}
          </h1>
          {plan.summary ? <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.6] text-muted">{plan.summary}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={coachName} className="ml-auto h-10 w-auto max-w-[160px] object-contain" />
          ) : (
            <div className="font-archivo text-[18px] font-extrabold text-ink">{coachName}</div>
          )}
          <div className="mt-1 font-mono text-[11px] text-muted">{today}</div>
        </div>
      </header>

      {plan.cycles.map((cycle, ci) => {
        const sessions = cycleSessions(plan, ci);
        return (
          <section key={ci} className="mb-7">
            <h2 className="font-archivo text-[19px] font-bold tracking-[-0.01em] text-ink">
              {cycle.label ? `${cycle.label} · ` : ""}
              {cycle.name}
              {cycle.weeks ? <span className="ml-2 font-mono text-[12px] font-medium text-muted">{cycle.weeks}</span> : null}
            </h2>
            {cycle.body ? <p className="mt-1 text-[13.5px] text-muted">{cycle.body}</p> : null}

            <div className="mt-3 flex flex-col gap-3">
              {sessions.map((s: Session, si: number) => (
                <div key={si} className="pdf-card rounded-xl border border-line bg-surface p-4">
                  <h3 className="font-archivo text-[15.5px] font-bold text-ink">{s.title || `${t("dashboard.session")} ${si + 1}`}</h3>
                  {s.warmup && s.warmup.length ? (
                    <p className="mt-1 text-[12.5px] text-muted">
                      <span className="font-semibold text-body">{t("session.warmup")} : </span>
                      {s.warmup.map((w) => (w.detail ? `${w.name} (${w.detail})` : w.name)).join(" · ")}
                    </p>
                  ) : null}
                  {isCircuitSession(s) ? null : (
                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">{t("evolution.exercise")}</th>
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">{t("pdf.setsReps")}</th>
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">{t("session.rest")}</th>
                          <th className="py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]">{t("pdf.note")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.exercises.map((ex, xi) => (
                          <tr key={xi} className="border-b border-line-2 last:border-0">
                            <td className="py-1.5 pr-3 font-medium text-ink">{ex.name}</td>
                            <td className="py-1.5 pr-3 tabular-nums text-body">{ex.cardio ? t("pdf.cardio") : `${ex.sets} × ${ex.reps}`}</td>
                            <td className="py-1.5 pr-3 tabular-nums text-body">{ex.rest ? `${ex.rest}s` : "·"}</td>
                            <td className="py-1.5 text-muted">{ex.note || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                  {(s.blocks ?? []).map((b, bi) => (
                    <div key={bi} className="mt-2.5 rounded-lg border border-line-2 bg-surface-2 px-3 py-2.5">
                      <div className="font-archivo text-[13.5px] font-bold text-ink">
                        {isCircuitSession(s) ? "" : `${t("session.finisher")} · `}
                        {b.title || t("pdf.circuit")}
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {t("pdf.circuitLine", { rounds: b.rounds, work: b.work, rest: b.rest, roundRest: b.roundRest })}
                        {b.sensation ? ` · ${t("pdf.sensation", { n: b.sensation })}` : ""}
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px]">
                        {b.exercises.map((e, ei) => (
                          <li key={ei}>
                            <span className="font-medium text-ink">{e.name}</span>
                            {e.note ? <span className="text-muted">, {e.note}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Deux colonnes, parce qu'il y a deux jours différents. Un seul chiffre
          laissait croire qu'on mange pareil un jour de séance et un jour de
          repos, alors que l'application, elle, affiche bien les deux. */}
      <section className="mb-4">
        <h2 className="font-archivo text-[19px] font-bold tracking-[-0.01em] text-ink">{t("pdf.nutrition")}</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-line pdf-card">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left">
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-muted"> </th>
                {[t("dashboard.caloriesPerDay"), t("pdf.protein"), t("pdf.carbs"), t("pdf.fat")].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { titre: t("pdf.trainingDay"), m: train },
                { titre: t("pdf.restDay"), m: repos },
              ].map((ligne, i) => (
                <tr key={ligne.titre} className={i > 0 ? "border-t border-line" : ""}>
                  <td className="px-3 py-2.5 font-archivo text-[13px] font-bold text-ink">{ligne.titre}</td>
                  <td className="px-3 py-2.5 font-archivo text-[16px] font-extrabold text-ink">{grp(ligne.m.kcal)}</td>
                  <td className="px-3 py-2.5 font-archivo text-[16px] font-extrabold text-ink">{ligne.m.protein} g</td>
                  <td className="px-3 py-2.5 font-archivo text-[16px] font-extrabold text-ink">{ligne.m.carbs} g</td>
                  <td className="px-3 py-2.5 font-archivo text-[16px] font-extrabold text-ink">{ligne.m.fat} g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] leading-[1.6] text-muted">{t("pdf.macroNote")}</p>
      </section>

      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-[1.6] text-muted">{t("pdf.footer", { date: today })}</p>
    </div>
  );
}
