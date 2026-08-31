import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { brandForUser } from "@/lib/branding";
import { cycleSessions, type Plan, type Session } from "@/lib/program";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon plan d'entraînement" };

// Page autonome (hors coquille client) pour un export PDF propre du plan : le
// client l'ouvre puis « Enregistrer en PDF ». Consultable tant que l'accès
// permet de voir le plan (actif, grâce, ou programme à prix unique terminé).
export default async function PlanPdfPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion");
  if (!ctx.access.planViewable) redirect("/app");

  const supabase = await createClient();
  const { data: prog } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: Plan }>();
  const plan = prog?.plan ?? null;
  if (!plan) redirect("/app");

  const brand = await brandForUser(ctx.userId);
  const coachName = brand?.name ?? "Ton coach";
  const clientName = ctx.profile?.name ?? "";
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

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

      {/* Barre d'action (masquée à l'impression) */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link href="/app" className="text-[14px] text-muted hover:text-ink">← Retour</Link>
        <PrintButton label="Enregistrer en PDF" />
      </div>

      {/* En-tête */}
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Plan d&apos;entraînement</div>
          <h1 className="mt-1 font-archivo text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
            {clientName ? `Programme de ${clientName}` : "Mon programme"}
          </h1>
          {plan.summary ? <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.6] text-muted">{plan.summary}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={coachName} className="ml-auto h-10 w-auto max-w-[160px] object-contain" />
          ) : (
            <div className="font-archivo text-[18px] font-extrabold text-ink">{coachName}</div>
          )}
          <div className="mt-1 font-mono text-[11px] text-muted">{today}</div>
        </div>
      </header>

      {/* Cycles → séances → exercices */}
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
                  <h3 className="font-archivo text-[15.5px] font-bold text-ink">{s.title || `Séance ${si + 1}`}</h3>
                  {s.warmup && s.warmup.length ? (
                    <p className="mt-1 text-[12.5px] text-muted">
                      <span className="font-semibold text-body">Échauffement : </span>
                      {s.warmup.map((w) => (w.detail ? `${w.name} (${w.detail})` : w.name)).join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">Exercice</th>
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">Séries × reps</th>
                          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.06em]">Repos</th>
                          <th className="py-1.5 font-mono text-[10px] uppercase tracking-[0.06em]">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.exercises.map((ex, xi) => (
                          <tr key={xi} className="border-b border-line-2 last:border-0">
                            <td className="py-1.5 pr-3 font-medium text-ink">{ex.name}</td>
                            <td className="py-1.5 pr-3 tabular-nums text-body">
                              {ex.cardio ? "Cardio" : `${ex.sets} × ${ex.reps}`}
                            </td>
                            <td className="py-1.5 pr-3 tabular-nums text-body">{ex.rest ? `${ex.rest}s` : "—"}</td>
                            <td className="py-1.5 text-muted">{ex.note || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Nutrition */}
      <section className="mb-4">
        <h2 className="font-archivo text-[19px] font-bold tracking-[-0.01em] text-ink">Repères nutritionnels</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["Calories / j", plan.nutrition.kcal],
            ["Protéines", `${plan.nutrition.protein} g`],
            ["Glucides", `${plan.nutrition.carbs} g`],
            ["Lipides", `${plan.nutrition.fat} g`],
          ].map(([label, value]) => (
            <div key={label} className="pdf-card rounded-lg border border-line bg-surface px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">{label}</div>
              <div className="mt-0.5 font-archivo text-[17px] font-extrabold text-ink">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-[1.6] text-muted">
        Document généré le {today}. Conseils de forme pour personnes en bonne santé — ne remplace pas un avis médical.
      </p>
    </div>
  );
}
