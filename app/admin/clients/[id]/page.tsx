import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { computeAccess, accessLabel } from "@/lib/access";
import { restPattern, startWeekday } from "@/lib/schedule";
import { computeAdherence } from "@/lib/streak";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { ClientPush } from "@/components/client-push";
import { MiniWeightChart, type WeightPoint } from "@/components/mini-weight-chart";
import { CoachNoteForm } from "@/components/coach-note-form";
import { assistClient, deleteCoachNote } from "@/app/admin/actions";
import { DeleteClientButton } from "@/components/delete-client-button";
import { VipChat } from "@/components/vip-chat";
import { clientVipContext, listVipMessages, markThreadRead, type VipMessage } from "@/lib/vip";
import { aiCostForUser, formatUsd } from "@/lib/ai-cost";
import type { Plan } from "@/lib/program";

export const metadata = { title: "Fiche client, Admin My Fitness App" };

type Prof = {
  id: string;
  tenant_id: string | null;
  email: string | null;
  name: string | null;
  sex: string | null;
  paid: boolean;
  start_date: string | null;
  medical_hold: boolean;
  medical_ack_at: string | null;
  medical_ack_name: string | null;
};

type MeasureRow = {
  waist: number | null;
  hips: number | null;
  chest: number | null;
  thigh: number | null;
  arm: number | null;
  measured_at: string;
};

const MEASURE_COLS: [key: keyof MeasureRow, label: string][] = [
  ["chest", "Poitrine"],
  ["arm", "Bras"],
  ["waist", "Taille"],
  ["hips", "Hanches"],
  ["thigh", "Cuisse"],
];

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : "·";

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

const val = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : v == null || v === "" ? "·" : String(v);

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assistance?: string }>;
}) {
  const gate = await getAdminOrNull();
  if (!gate) notFound();
  const { id } = await params;
  const { assistance: assistanceErreur } = await searchParams;
  const admin = createAdminClient();

  const [{ data: profile }, { data: quiz }, { data: prog }, { data: logs }, { data: weights }, { data: measures }, { data: notes }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, tenant_id, email, name, sex, paid, start_date, medical_hold, medical_ack_at, medical_ack_name")
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
      admin
        .from("weights")
        .select("kg, measured_at")
        .eq("user_id", id)
        .order("measured_at", { ascending: true })
        .returns<{ kg: number; measured_at: string }[]>(),
      admin
        .from("measurements")
        .select("waist, hips, chest, thigh, arm, measured_at")
        .eq("user_id", id)
        .order("measured_at", { ascending: false })
        .returns<MeasureRow[]>(),
      admin
        .from("coach_notes")
        .select("id, body, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .returns<{ id: string; body: string; created_at: string }[]>(),
    ]);

  // Cloisonnement : le client doit appartenir au tenant du coach connecté.
  if (!profile || profile.tenant_id !== gate.profile?.tenant_id) notFound();

  // Chat VIP embarqué dans la fiche : le coach répond en gardant toutes les infos
  // du client sous les yeux. Affiché seulement si l'offre du client porte l'option.
  const vipCtx = await clientVipContext(id);
  let vipMessages: VipMessage[] = [];
  if (vipCtx.enabled) {
    vipMessages = await listVipMessages(id);
    await markThreadRead(id, "coach");
  }

  // Coût IA (BYOK) de ce client (estimation).
  const clientCost = await aiCostForUser(id);

  const access = computeAccess(profile.paid, profile.start_date);
  const answers = quiz?.answers ?? {};
  const doneDays = (logs ?? []).map((r) => r.day);
  const weightPoints: WeightPoint[] = (weights ?? []).map((w) => ({ kg: w.kg, date: w.measured_at }));
  const measureRows = measures ?? [];
  const noteRows = notes ?? [];

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/admin" className="text-[13px] font-medium text-muted-2 hover:text-ink">
            {tx("← Tous les clients")}</Link>
          <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,34px)] leading-[1.05] tracking-[-0.03em] text-ink">
            {displayName}
          </h1>
          <p className="text-[13px] text-muted-2">{profile.email}</p>
        </div>
        {/* Coaching en présentiel : pendant la séance c'est le coach qui note
            les charges, l'adhérent a les mains prises. */}
        <form action={assistClient}>
          <input type="hidden" name="target_user_id" value={profile.id} />
          <button
            type="submit"
            className="press tap inline-flex h-10 items-center gap-2 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            {tx("Saisir pour ce client")}
          </button>
        </form>
      </div>

      {assistanceErreur ? (
        <Alert>
          {assistanceErreur === "refus"
            ? tx("Ce client n'est pas rattaché à ton compte.")
            : tx("La connexion en saisie a échoué. Réessaie dans un instant.")}
        </Alert>
      ) : null}

      {/* Progression */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><Stat label={tx("Phase")} value={accessLabel(access)} /></Card>
        <Card><Stat label={tx("Jour")} value={access.phase === "active" ? `${access.day}/90` : "·"} /></Card>
        <Card><Stat label={tx("Séances faites")} value={doneDays.length} /></Card>
        <Card><Stat label={tx("Adhérence")} value={adherence == null ? "·" : `${adherence}%`} /></Card>
        <Card><Stat label={tx("Coût IA")} value={formatUsd(clientCost)} /></Card>
      </div>

      {/* Santé / décharge */}
      {profile.medical_hold ? (
        <Card className="flex flex-col gap-1.5 border-alert-line bg-alert">
          <MonoLabel>{tx("Santé signalée")}</MonoLabel>
          <p className="text-[13.5px] text-alert-ink">
            {profile.medical_ack_at
              ? `Décharge médicale signée le ${fmt(profile.medical_ack_at)}${profile.medical_ack_name ? ` par ${profile.medical_ack_name}` : ""}.`
              : "Situation de santé déclarée, décharge non encore signée."}
          </p>
          {answers.meds ? <p className="text-[13px] text-alert-ink">{tx("Traitement déclaré :")} {val(answers.meds)}.</p> : null}
        </Card>
      ) : null}

      {/* Profil */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>{tx("Profil")}</MonoLabel>
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
            {tx("Série en cours :")} {streak}
          </span>
        </div>
      </Card>

      {/* Chat VIP embarqué : le coach répond avec toutes les infos sous les yeux. */}
      {vipCtx.enabled ? (
        <div id="chat-vip" className="scroll-mt-4">
          <Card className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <MonoLabel>{tx("Chat VIP")}</MonoLabel>
              <p className="text-[12px] text-muted-2">{tx("Ligne directe avec")} {displayName}{tx(". Texte et photos.")}</p>
            </div>
            <VipChat
              messages={vipMessages}
              me="coach"
              clientId={profile.id}
              emptyHint={tx("Aucun message. Écris le premier mot à ton client.")}
            />
          </Card>
        </div>
      ) : null}

      {/* Évolution du poids */}
      <Card className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <MonoLabel>{tx("Évolution du poids")}</MonoLabel>
          {weightPoints.length > 0 ? (
            <span className="font-mono text-[11px] text-muted-2">{weightPoints.length} {tx("pesée")}{weightPoints.length > 1 ? "s" : ""}</span>
          ) : null}
        </div>
        <MiniWeightChart points={weightPoints} />
      </Card>

      {/* Mensurations datées */}
      <Card className="flex flex-col gap-3.5">
        <MonoLabel>{tx("Mensurations (cm)")}</MonoLabel>
        {measureRows.length === 0 ? (
          <p className="text-[13px] text-muted">{tx("Aucune mensuration enregistrée.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-line-2 pb-2 pr-3 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-2">{tx("Date")}</th>
                  {MEASURE_COLS.map(([key, label]) => (
                    <th key={key} className="border-b border-line-2 pb-2 px-3 text-right font-mono text-[11px] font-medium uppercase tracking-wide text-muted-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measureRows.map((m) => (
                  <tr key={m.measured_at}>
                    <td className="border-b border-line-2 py-2 pr-3 font-medium text-body whitespace-nowrap">{fmtShort(m.measured_at)}</td>
                    {MEASURE_COLS.map(([key]) => (
                      <td key={key} className="border-b border-line-2 py-2 px-3 text-right tabular-nums text-body">
                        {m[key] == null ? "·" : String(m[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Notes privées du coach */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <MonoLabel>{tx("Notes privées")}</MonoLabel>
          <p className="text-[12px] text-muted-2">{tx("Visibles de toi seul. Le client ne les voit jamais.")}</p>
        </div>
        <CoachNoteForm clientId={profile.id} />
        {noteRows.length > 0 ? (
          <ul className="flex flex-col gap-2.5 border-t border-line pt-4">
            {noteRows.map((note) => (
              <li key={note.id} className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-muted-2">{fmtDateTime(note.created_at)}</span>
                  <form action={deleteCoachNote}>
                    <input type="hidden" name="id" value={note.id} />
                    <input type="hidden" name="client_id" value={profile.id} />
                    <button type="submit" className="text-[12px] text-muted-2 underline hover:text-ink">{tx("Supprimer")}</button>
                  </form>
                </div>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-body">{note.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      {/* Message direct */}
      <ClientPush userId={profile.id} name={displayName} />

      {/* Zone dangereuse */}
      <Card className="flex flex-col gap-3 border-alert-line">
        <MonoLabel className="text-alert-ink">{tx("Zone sensible")}</MonoLabel>
        <p className="text-[13px] text-muted">
          {tx("Supprime définitivement ce client et toutes ses données. Action irréversible.")}</p>
        <DeleteClientButton clientId={profile.id} name={displayName} />
      </Card>
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
