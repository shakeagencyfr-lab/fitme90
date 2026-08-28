import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { computeAccess, accessLabel } from "@/lib/access";
import { restPattern, startWeekday } from "@/lib/schedule";
import { computeAdherence } from "@/lib/streak";
import { Card, MonoLabel } from "@/components/ui";
import { ClientPush } from "@/components/client-push";
import type { Plan } from "@/lib/program";

export const metadata = { title: "Fiche client, Admin FitMe90" };

type Prof = {
  id: string;
  email: string | null;
  name: string | null;
  sex: string | null;
  paid: boolean;
  start_date: string | null;
  medical_hold: boolean;
  medical_ack_at: string | null;
  medical_ack_name: string | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : "·";

const val = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : v == null || v === "" ? "·" : String(v);

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await getAdminOrNull();
  if (!gate) notFound();
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: profile }, { data: quiz }, { data: prog }, { data: logs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, name, sex, paid, start_date, medical_hold, medical_ack_at, medical_ack_name")
      .eq("id", id)
      .maybeSingle<Prof>(),
    admin
      .from("questionnaires")
      .select("answers, train_days")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>(),
    admin
      .from("programs")
      .select("plan")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ plan: Plan }>(),
    admin.from("session_logs").select("day").eq("user_id", id).returns<{ day: number }[]>(),
  ]);

  if (!profile) notFound();

  const access = computeAccess(profile.paid, profile.start_date);
  const answers = quiz?.answers ?? {};
  const doneDays = (logs ?? []).map((r) => r.day);

  // Adhérence (si un programme est en cours et daté).
  let adherence: number | null = null;
  let streak = 0;
  if (prog?.plan && profile.start_date && access.day >= 1) {
    const planRest = prog.plan.weekPlan.slice(0, 7).map((d) => d.rest);
    const pattern = restPattern(quiz?.train_days ?? [], planRest);
    const stats = computeAdherence({
      pattern,
      startWd: startWeekday(profile.start_date),
      currentDay: access.day,
      completedDays: doneDays,
    });
    adherence = stats.adherence;
    streak = stats.streak;
  }

  const displayName = profile.name || profile.email || "Client";

  const facts: [string, string][] = [
    ["Sexe", val(profile.sex)],
    ["Objectif principal", val(answers.goal)],
    ["Objectif secondaire", val(answers.goal2)],
    ["Niveau", val(answers.level)],
    ["Séances/semaine", val(answers.freq)],
    ["Jours", val(quiz?.train_days)],
    ["Début", fmt(profile.start_date)],
    ["Motivation", val(answers.motivation)],
    ["Ton coach préféré", val(answers.coach_tone)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-[13px] font-medium text-muted-2 hover:text-ink">
          ← Tous les clients
        </Link>
        <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,34px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {displayName}
        </h1>
        <p className="text-[13px] text-muted-2">{profile.email}</p>
      </div>

      {/* Progression */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><Stat label="Phase" value={accessLabel(access)} /></Card>
        <Card><Stat label="Jour" value={access.phase === "active" ? `${access.day}/90` : "·"} /></Card>
        <Card><Stat label="Séances faites" value={doneDays.length} /></Card>
        <Card><Stat label="Adhérence" value={adherence == null ? "·" : `${adherence}%`} /></Card>
      </div>

      {/* Santé / décharge */}
      {profile.medical_hold ? (
        <Card className="flex flex-col gap-1.5 border-alert-line bg-alert">
          <MonoLabel>Santé signalée</MonoLabel>
          <p className="text-[13.5px] text-alert-ink">
            {profile.medical_ack_at
              ? `Décharge médicale signée le ${fmt(profile.medical_ack_at)}${profile.medical_ack_name ? ` par ${profile.medical_ack_name}` : ""}.`
              : "Situation de santé déclarée, décharge non encore signée."}
          </p>
          {answers.meds ? <p className="text-[13px] text-alert-ink">Traitement déclaré : {val(answers.meds)}.</p> : null}
        </Card>
      ) : null}

      {/* Profil */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Profil</MonoLabel>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line-2 pb-2">
              <span className="text-[13px] text-muted-2">{k}</span>
              <span className="text-right text-[14px] font-medium text-body">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <span className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${streak > 0 ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted-2"}`}>
            Série en cours : {streak}
          </span>
        </div>
      </Card>

      {/* Message direct */}
      <ClientPush userId={profile.id} name={displayName} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <span className="font-archivo font-extrabold text-[20px] leading-none tracking-[-0.02em] text-ink">{value}</span>
    </div>
  );
}
