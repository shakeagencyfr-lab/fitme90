import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, vapidReady, type StoredSub, type PushPayload } from "@/lib/push";
import { programDay } from "@/lib/access";
import { restPattern, startWeekday, isRestDay } from "@/lib/schedule";
import { PROGRAM_DAYS } from "@/lib/config";
import type { Plan } from "@/lib/program";

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

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth")
    .returns<SubRow[]>();
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, removed: 0, users: 0 });
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

    // Programme + jours choisis + séances déjà validées pour ce jour.
    const [{ data: prog }, { data: quiz }, { data: log }] = await Promise.all([
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
      db
        .from("session_logs")
        .select("day")
        .eq("user_id", prof.id)
        .eq("day", day)
        .maybeSingle<{ day: number }>(),
    ]);
    if (!prog?.plan) continue;

    const planRest = prog.plan.weekPlan.slice(0, 7).map((d) => d.rest);
    const pattern = restPattern(quiz?.train_days ?? [], planRest);
    const startWd = startWeekday(prof.start_date);

    if (isRestDay(day, pattern, startWd)) continue; // repos aujourd'hui
    if (log) continue; // séance déjà validée

    targeted++;
    const payload: PushPayload = {
      title: "Ta séance du jour t'attend",
      body: `Jour ${day} sur ${PROGRAM_DAYS}. Ouvre FitMe90 et valide ta séance.`,
      url: "/app/seance",
      tag: "seance-du-jour",
    };

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
