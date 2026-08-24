import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { accessLabel } from "@/lib/access";
import { Card, Stat, MonoLabel, ButtonLink, Alert } from "@/components/ui";
import { PdfButton } from "@/components/pdf-button";
import type { Plan } from "@/lib/program";
import { PROGRAM_DAYS } from "@/lib/config";

export const metadata = { title: "Programme — FitMe90" };

async function latestPlan(userId: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: Plan }>();
  return data?.plan ?? null;
}

export default async function ProgrammePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null; // le layout redirige déjà

  const { access } = ctx;

  // --- États sans plan consultable ---
  if (access.phase === "not_paid") {
    return (
      <Empty
        title="Débloque ton programme"
        body="Le paiement unique de 190 € donne accès à ton programme d'entraînement et nutrition sur 90 jours, coach IA inclus."
        cta={{ href: "/app/paiement", label: "Débloquer — 190 €" }}
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

  const plan = await latestPlan(ctx.userId);
  if (!plan) {
    return (
      <Empty
        title="Programme à générer"
        body="Ton compte est actif mais aucun programme n'a encore été généré."
        cta={{ href: "/questionnaire", label: "Générer mon programme" }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{accessLabel(access)}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Ton programme
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-[1.6] text-muted">{plan.summary}</p>
      </header>

      {access.phase === "grace" ? (
        <Alert tone="info">
          Programme terminé. Le coach IA est désactivé, mais ton plan reste
          consultable pendant encore {access.daysUntilAccessEnd} jour(s).
        </Alert>
      ) : null}

      {/* Cycles */}
      <section className="grid gap-3 sm:grid-cols-3">
        {plan.cycles.slice(0, 3).map((c, i) => (
          <Card key={i} className="flex flex-col gap-2">
            <MonoLabel className="text-brand">{c.label} · {c.weeks}</MonoLabel>
            <div className="font-archivo font-semibold text-[17px] text-ink">{c.name}</div>
            <p className="text-[13.5px] leading-[1.55] text-muted">{c.body}</p>
          </Card>
        ))}
      </section>

      {/* Semaine type */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Semaine type</MonoLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {plan.weekPlan.slice(0, 7).map((d, i) => (
            <div
              key={i}
              className={[
                "flex flex-col items-center gap-1 rounded-control border px-1 py-2 text-center",
                d.rest ? "border-line bg-surface-2" : "border-line-4 bg-surface",
              ].join(" ")}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                {d.day}
              </span>
              <span className="text-[11px] leading-tight text-body">
                {d.rest ? "Repos" : d.name}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Résumé chiffré + export */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card><Stat label="Jour" value={`${access.day}/${PROGRAM_DAYS}`} sub="Programme en cours" /></Card>
        <Card><Stat label="Calories / jour" value={`${plan.nutrition.kcal}`} sub="Jour d'entraînement" /></Card>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <MonoLabel>Programme</MonoLabel>
            <div className="text-[14px] text-body mt-1">Export PDF complet</div>
          </div>
          <PdfButton />
        </Card>
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
