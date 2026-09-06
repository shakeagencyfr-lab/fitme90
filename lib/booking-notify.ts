import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { addCoachNotification } from "@/lib/notifications";
import { tenantNotifyEmails } from "@/lib/vip";
import { humanDate, humanTime } from "@/lib/booking-time";
import type { Locale } from "@/lib/i18n";

// ------------------------------------------------------------------ *
// Les notifications d'un rendez-vous : cloche et push du coach, e-mail à ses
// adresses de notification ; push et e-mail du client, dans sa langue. Tout
// est best-effort : une notification qui échoue n'annule jamais un
// rendez-vous déjà écrit.
// ------------------------------------------------------------------ */

export interface BookingFacts {
  id: string;
  tenant_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  price_cents: number | null;
  status: string;
}

interface ClientRow {
  name: string | null;
  email: string | null;
  language: string | null;
}

async function clientOf(clientId: string): Promise<ClientRow> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("name, email, language").eq("id", clientId).maybeSingle<ClientRow>();
  return data ?? { name: null, email: null, language: null };
}

async function coachUserIds(tenantId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("tenant_id", tenantId).in("role", ["owner", "coach"]).returns<{ id: string }[]>();
  return (data ?? []).map((r) => r.id);
}

async function tenantInfo(tenantId: string): Promise<{ name: string; timezone: string; address: string; instructions: string }> {
  const admin = createAdminClient();
  const [{ data: t }, { data: s }] = await Promise.all([
    admin.from("tenants").select("name, timezone").eq("id", tenantId).maybeSingle<{ name: string | null; timezone: string | null }>(),
    admin.from("booking_settings").select("address, instructions").eq("tenant_id", tenantId).maybeSingle<{ address: string; instructions: string }>(),
  ]);
  return { name: t?.name?.trim() || "Ton coach", timezone: t?.timezone || "Europe/Paris", address: s?.address ?? "", instructions: s?.instructions ?? "" };
}

const localeOf = (v: string | null): Locale => (v === "en" ? "en" : "fr");

/** « mardi 8 septembre à 10 h 30 » ou « Tuesday 8 September at 10:30 ». */
export function whenLabel(startsAt: string, tz: string, locale: Locale): string {
  const d = new Date(startsAt);
  return locale === "en" ? `${humanDate(d, tz, "en")} at ${humanTime(d, tz, "en")}` : `${humanDate(d, tz, "fr")} à ${humanTime(d, tz, "fr")}`;
}

async function tellCoach(b: BookingFacts, title: string, body: string): Promise<void> {
  const tasks: Promise<unknown>[] = [
    addCoachNotification({ tenantId: b.tenant_id, type: "info", title, body, url: "/admin/reservations", clientId: b.client_id }),
  ];
  const ids = await coachUserIds(b.tenant_id);
  if (ids.length) tasks.push(broadcastPushToUsers(ids, { title, body, url: "/admin/reservations", tag: `booking-${b.id}` }));
  const emails = await tenantNotifyEmails(b.tenant_id);
  if (emails.length) tasks.push(sendEmail({ to: emails, subject: title, text: `${body}\n\nTon agenda : ${site()}/admin/reservations` }, b.tenant_id));
  await Promise.allSettled(tasks);
}

async function tellClient(b: BookingFacts, client: ClientRow, title: string, body: string): Promise<void> {
  const tasks: Promise<unknown>[] = [broadcastPushToUsers([b.client_id], { title, body, url: "/app/reservation", tag: `booking-${b.id}` })];
  if (client.email) tasks.push(sendEmail({ to: [client.email], subject: title, text: `${body}\n\n${site()}/app/reservation` }, b.tenant_id));
  await Promise.allSettled(tasks);
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function place(info: { address: string; instructions: string }, locale: Locale): string {
  const parts: string[] = [];
  if (info.address) parts.push(locale === "en" ? `Where: ${info.address}` : `Lieu : ${info.address}`);
  if (info.instructions) parts.push(info.instructions);
  return parts.length ? `\n\n${parts.join("\n")}` : "";
}

/** Un rendez-vous vient d'être pris (par le client, le coach ou le Coach IA). */
export async function notifyBookingCreated(b: BookingFacts, opts: { byCoach?: boolean; awaitingCoach?: boolean } = {}): Promise<void> {
  try {
    const [client, info] = await Promise.all([clientOf(b.client_id), tenantInfo(b.tenant_id)]);
    const who = client.name || client.email || "Un client";
    const whenFr = whenLabel(b.starts_at, info.timezone, "fr");
    if (!opts.byCoach) {
      await tellCoach(
        b,
        opts.awaitingCoach ? `${who} demande un rendez-vous` : `${who} a réservé : ${b.service_name}`,
        `${whenFr} · ${b.service_name}${opts.awaitingCoach ? " · à valider dans ton agenda" : ""}`,
      );
    }
    const loc = localeOf(client.language);
    const when = whenLabel(b.starts_at, info.timezone, loc);
    const title = opts.awaitingCoach
      ? loc === "en" ? "Your request has been sent" : "Ta demande est envoyée"
      : loc === "en" ? "Appointment confirmed" : "Rendez-vous confirmé";
    const body = opts.awaitingCoach
      ? loc === "en"
        ? `${b.service_name}, ${when}. ${info.name} will confirm shortly.`
        : `${b.service_name}, ${when}. ${info.name} confirme dès que possible.`
      : loc === "en"
        ? `${b.service_name} with ${info.name}, ${when}.${place(info, loc)}`
        : `${b.service_name} avec ${info.name}, ${when}.${place(info, loc)}`;
    await tellClient(b, client, title, body);
  } catch {
    /* best-effort */
  }
}

/** Le coach a validé une demande. */
export async function notifyBookingConfirmed(b: BookingFacts): Promise<void> {
  try {
    const [client, info] = await Promise.all([clientOf(b.client_id), tenantInfo(b.tenant_id)]);
    const loc = localeOf(client.language);
    const when = whenLabel(b.starts_at, info.timezone, loc);
    await tellClient(
      b,
      client,
      loc === "en" ? "Appointment confirmed" : "Rendez-vous confirmé",
      loc === "en" ? `${b.service_name} with ${info.name}, ${when}.${place(info, loc)}` : `${b.service_name} avec ${info.name}, ${when}.${place(info, loc)}`,
    );
  } catch {
    /* best-effort */
  }
}

/** Annulation : on prévient l'autre partie. */
export async function notifyBookingCancelled(b: BookingFacts, by: "client" | "coach" | "system", reason?: string | null): Promise<void> {
  try {
    const [client, info] = await Promise.all([clientOf(b.client_id), tenantInfo(b.tenant_id)]);
    const why = reason ? ` (${reason})` : "";
    if (by === "client") {
      const who = client.name || client.email || "Un client";
      await tellCoach(b, `${who} a annulé son rendez-vous`, `${whenLabel(b.starts_at, info.timezone, "fr")} · ${b.service_name}${why}`);
      return;
    }
    const loc = localeOf(client.language);
    const when = whenLabel(b.starts_at, info.timezone, loc);
    await tellClient(
      b,
      client,
      loc === "en" ? "Appointment cancelled" : "Rendez-vous annulé",
      by === "system"
        ? loc === "en"
          ? `${b.service_name}, ${when}: the payment was not completed in time, the slot has been released. Book again if you wish.`
          : `${b.service_name}, ${when} : le paiement n'a pas été effectué à temps, le créneau est libéré. Réserve à nouveau si tu le souhaites.`
        : loc === "en"
          ? `${info.name} cancelled ${b.service_name}, ${when}${why}. Book another slot from your space.`
          : `${info.name} a annulé ${b.service_name}, ${when}${why}. Reprends un créneau depuis ton espace.`,
    );
  } catch {
    /* best-effort */
  }
}

/** Rappel de la veille (ou du matin) au client. */
export async function notifyBookingReminder(b: BookingFacts): Promise<void> {
  try {
    const [client, info] = await Promise.all([clientOf(b.client_id), tenantInfo(b.tenant_id)]);
    const loc = localeOf(client.language);
    const when = whenLabel(b.starts_at, info.timezone, loc);
    await tellClient(
      b,
      client,
      loc === "en" ? "Reminder: your appointment" : "Rappel : ton rendez-vous",
      loc === "en" ? `${b.service_name} with ${info.name}, ${when}.${place(info, loc)}` : `${b.service_name} avec ${info.name}, ${when}.${place(info, loc)}`,
    );
  } catch {
    /* best-effort */
  }
}
