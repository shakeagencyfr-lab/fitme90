import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { AutoPrint } from "@/components/auto-print";
import { pnum, grp, targetKcalForDay } from "@/lib/nutrition";
import { PRODUCT_NAME, COACH_CREDENTIAL } from "@/lib/config";
import type { Plan } from "@/lib/program";

export const metadata = { title: "Programme FitMe90 — impression" };

export default async function ImprimerPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/imprimer");
  if (!ctx.access.planViewable) redirect("/app");

  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: Plan }>();
  const plan = data?.plan;
  if (!plan) redirect("/app");

  const n = plan.nutrition;
  const base = pnum(n.kcal) || 2580;

  return (
    <div className="mx-auto w-full max-w-[760px] bg-surface px-6 py-8 text-ink print:max-w-none">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-archivo font-extrabold text-[28px] tracking-[-0.03em]">
            {PRODUCT_NAME} — Programme 90 jours
          </h1>
          <p className="text-[13px] text-muted">
            {ctx.profile?.name ? `${ctx.profile.name} · ` : ""}Conçu par {COACH_CREDENTIAL.toLowerCase()}
          </p>
        </div>
      </div>

      <AutoPrint />

      <p className="mt-6 text-[15px] leading-[1.6] text-body">{plan.summary}</p>

      <Section title="Les trois cycles">
        {plan.cycles.slice(0, 3).map((c, i) => (
          <div key={i} className="mb-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-brand">
              {c.label} · {c.weeks}
            </div>
            <div className="font-archivo font-semibold text-[16px]">{c.name}</div>
            <p className="text-[13.5px] leading-[1.5] text-muted">{c.body}</p>
          </div>
        ))}
      </Section>

      <Section title="Semaine type">
        <table className="w-full border-collapse text-[13.5px]">
          <tbody>
            {plan.weekPlan.slice(0, 7).map((d, i) => (
              <tr key={i} className="border-b border-line">
                <td className="py-1.5 pr-3 font-mono text-[11px] uppercase text-muted-2">{d.day}</td>
                <td className="py-1.5">{d.rest ? "Repos" : d.name}</td>
                <td className="py-1.5 text-right text-muted-2">{d.dur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`Séance type — ${plan.session.title || plan.session.cycleLabel}`}>
        <table className="w-full border-collapse text-[13.5px]">
          <tbody>
            {plan.session.exercises.map((ex, i) => (
              <tr key={i} className="border-b border-line align-top">
                <td className="py-1.5 pr-3">{ex.name}</td>
                <td className="py-1.5 whitespace-nowrap text-brand">{ex.sets} × {ex.reps}</td>
                <td className="py-1.5 pl-3 text-muted">{ex.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12.5px] text-muted">
          Charges au ressenti (RPE) : vise RPE 7 au cycle 1, RPE 8 aux cycles 2 et 3.
          Note tes charges, le coach ajuste ensuite.
        </p>
      </Section>

      <Section title="Nutrition">
        <table className="w-full border-collapse text-[13.5px]">
          <tbody>
            <tr className="border-b border-line">
              <td className="py-1.5">Jour d'entraînement</td>
              <td className="py-1.5 text-right">
                {grp(targetKcalForDay(base, false))} kcal · {Math.round(pnum(n.protein))} g prot · {Math.round(pnum(n.carbs))} g gluc · {Math.round(pnum(n.fat))} g lip
              </td>
            </tr>
            <tr className="border-b border-line">
              <td className="py-1.5">Jour de repos</td>
              <td className="py-1.5 text-right">
                {grp(targetKcalForDay(base, true))} kcal · {Math.round(pnum(n.protein))} g prot · {Math.round(pnum(n.carbs) * 0.8)} g gluc · {Math.round(pnum(n.fat))} g lip
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[12.5px] text-muted">
          Jours sans entraînement : ≈ 10 % de calories en moins, glucides réduits d'un cinquième, protéines maintenues.
        </p>
        {n.meals?.length ? (
          <div className="mt-3 flex flex-col gap-2">
            {n.meals.map((m, i) => (
              <div key={i}>
                <div className="font-archivo font-semibold text-[14px]">
                  {m.time} · {m.name} <span className="text-brand">{m.kcal} kcal</span>
                </div>
                <div className="text-[13px] text-muted">
                  {m.items.map((it) => `${it.food} (${it.qty})`).join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <p className="mt-8 border-t border-line pt-4 text-[11.5px] text-muted-2 leading-relaxed">
        Accompagnement sportif et de bien-être, sans visée médicale. Ne remplace pas
        un avis médical : consulte un médecin en cas de pathologie, de grossesse ou de
        blessure. Document personnel, ne pas diffuser.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b-2 border-ink pb-1 font-archivo font-bold text-[15px]">
        {title}
      </h2>
      {children}
    </section>
  );
}
