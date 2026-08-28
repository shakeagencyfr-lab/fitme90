import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, broadcastPush, vapidReady, type StoredSub, type PushPayload } from "@/lib/push";
import { programDay } from "@/lib/access";
import { restPattern, startWeekday, isRestDay } from "@/lib/schedule";
import { missedDays } from "@/lib/streak";
import { PROGRAM_DAYS } from "@/lib/config";
import type { Plan } from "@/lib/program";

// Seuil de relance : nombre de séances en retard à partir duquel on envoie un
// rappel de rattrapage (les jours sans séance prévue aujourd'hui).
const MISSED_RELANCE_THRESHOLD = 2;

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron quotidien (voir vercel.json) : envoie le rappel « séance du jour » aux
// abonnés dont un entraînement est prévu aujourd'hui et pas encore validé.
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <secret> »).

interface SubRow {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  if (!vapidReady()) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 503 });
  }

  const db = createAdminClient();
  const now = new Date();

  // Notifications programmées par le coach devenues dues : diffusion à tous.
  const { data: due } = await db
    .from("scheduled_pushes")
    .select("id, title, body, url")
    .is("sent_at", null)
    .lte("send_at", now.toISOString())
    .returns<{ id: string; title: string; body: string; url: string }[]>();
  let broadcastSent = 0;
  for (const s of due ?? []) {
    const r = await broadcastPush({ title: s.title, body: s.body, url: s.url, tag: "coach-broadcast" });
    broadcastSent += r.sent;
    await db.from("scheduled_pushes").update({ sent_at: new Date().toISOString() }).eq("id", s.id);
  }

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth")
    .returns<SubRow[]>();
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, removed: 0, users: 0, broadcastSent });
  }

  // Regroupe les abonnements par utilisateur (plusieurs appareils possibles).
  const byUser = new Map<string, SubRow[]>();
  for (const s of subs) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const userIds = [...byUser.keys()];

  // Profils : on ne garde que les comptes payés avec une date de début.
  const { data: profiles } = await db
    .from("profiles")
    .select("id, paid, start_date")
    .in("id", userIds)
    .returns<{ id: string; paid: boolean; start_date: string | null }[]>();

  let sent = 0;
  let removed = 0;
  let targeted = 0;
  const toRemove: string[] = [];

  for (const prof of profiles ?? []) {
    if (!prof.paid || !prof.start_date) continue;
    const start = new Date(prof.start_date);
    if (Number.isNaN(start.getTime())) continue;

    const day = programDay(start, now);
    if (day < 1 || day > PROGRAM_DAYS) continue; // hors programme actif

    // Programme + jours choisis + toutes les séances validées (pour les retards).
    const [{ data: prog }, { data: quiz }, { data: doneRows }] = await Promise.all([
      db
        .from("programs")
        .select("plan")
        .eq("user_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ plan: Plan }>(),
      db
        .from("questionnaires")
        .select("train_days")
        .eq("user_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ train_days: string[] }>(),
      db.from("session_logs").select("day").eq("user_id", prof.id).returns<{ day: number }[]>(),
    ]);
    if (!prog?.plan) continue;

    const planRest = prog.plan.weekPlan.slice(0, 7).map((d) => d.rest);
    const pattern = restPattern(quiz?.train_days ?? [], planRest);
    const startWd = startWeekday(prof.start_date);
    const doneDays = (doneRows ?? []).map((r) => r.day);
    const doneSet = new Set(doneDays);

    const todayRest = isRestDay(day, pattern, startWd);
    const todayDone = doneSet.has(day);

    // Priorité 1 : séance du jour à faire. Priorité 2 : relance de rattrapage si
    // plusieurs séances sont en retard. Au plus une notification par personne.
    let payload: PushPayload | null = null;
    if (!todayRest && !todayDone) {
      payload = {
        title: "Ta séance du jour t'attend",
        body: `Jour ${day} sur ${PROGRAM_DAYS}. Ouvre FitMe90 et valide ta séance.`,
        url: "/app/seance",
        tag: "seance-du-jour",
      };
    } else {
      const late = missedDays({
        pattern,
        startWd,
        currentDay: day,
        completedDays: doneDays,
        programDays: PROGRAM_DAYS,
      }).length;
      if (late >= MISSED_RELANCE_THRESHOLD) {
        payload = {
          title: "On rattrape ensemble ?",
          body: `Tu as ${late} séances en retard. Pas de panique, ouvre FitMe90 et rattrape-les à ton rythme.`,
          url: "/app",
          tag: "rattrapage",
        };
      }
    }
    if (!payload) continue;

    targeted++;

    for (const s of byUser.get(prof.id) ?? []) {
      const sub: StoredSub = { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth };
      const res = await sendPush(sub, payload);
      if (res === "ok") sent++;
      else if (res === "gone") toRemove.push(s.endpoint);
    }
  }

  if (toRemove.length) {
    await db.from("push_subscriptions").delete().in("endpoint", toRemove);
    removed = toRemove.length;
  }

  return NextResponse.json({ users: targeted, sent, removed });
}
