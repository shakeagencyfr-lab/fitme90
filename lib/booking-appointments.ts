import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { recordOrder } from "@/lib/orders";
import { availableSlots, slotIsAvailable, type Busy, type DaySlots } from "@/lib/booking-slots";
import { dayKey, shiftDayKey, startOfDay } from "@/lib/booking-time";
import { clientCanCancel } from "@/lib/booking-rules";
import { bookingSpace, listCalendars, readBookingSettings, serviceOf, type BookingCalendar, type BookingService } from "@/lib/booking";
import { notifyBookingCancelled, notifyBookingConfirmed, notifyBookingCreated, notifyBookingReminder } from "@/lib/booking-notify";

// ------------------------------------------------------------------ *
// Les RENDEZ-VOUS : créneaux libres, prise, paiement, annulation, agenda.
//
// Un rendez-vous est VIVANT s'il est confirmé, ou en attente sans délai de
// paiement dépassé. Seuls les vivants occupent un créneau. Une réservation
// qui attend son paiement tient le créneau trente minutes : passé ce délai,
// il redevient libre, et le cron l'annule proprement.
//
// Chaque écriture recalcule la disponibilité juste avant d'insérer, et la
// base a le dernier mot : sa contrainte d'exclusion refuse deux vivants qui
// se chevauchent (code 23P01), qu'on traduit en « ce créneau vient d'être
// pris ».
// ------------------------------------------------------------------ */

export type { Booking, BookingSource, BookingStatus } from "@/lib/booking-model";
export { HOLD_MINUTES, awaitingPayment, isAlive } from "@/lib/booking-model";
import { HOLD_MINUTES, isAlive, type Booking, type BookingSource, type BookingStatus } from "@/lib/booking-model";

const COLS =
  "id, tenant_id, calendar_id, service_id, client_id, starts_at, ends_at, status, source, service_name, price_cents, paid, hold_until, client_note, coach_note, cancelled_by, cancel_reason, created_at";

// ────────────────────────────────────────────────── occupation

async function busyByCalendar(calendarIds: string[], from: Date, to: Date, now: Date): Promise<Map<string, Busy[]>> {
  const out = new Map<string, Busy[]>();
  if (!calendarIds.length) return out;
  const admin = createAdminClient();
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    admin
      .from("bookings")
      .select("calendar_id, starts_at, ends_at, status, paid, hold_until")
      .in("calendar_id", calendarIds)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .returns<{ calendar_id: string; starts_at: string; ends_at: string; status: BookingStatus; paid: boolean; hold_until: string | null }[]>(),
    admin
      .from("booking_blocks")
      .select("calendar_id, starts_at, ends_at")
      .in("calendar_id", calendarIds)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .returns<{ calendar_id: string; starts_at: string; ends_at: string }[]>(),
  ]);
  const push = (cal: string, s: string, e: string) => {
    const list = out.get(cal) ?? [];
    list.push({ start: new Date(s), end: new Date(e) });
    out.set(cal, list);
  };
  for (const b of bookings ?? []) if (isAlive(b, now)) push(b.calendar_id, b.starts_at, b.ends_at);
  for (const b of blocks ?? []) push(b.calendar_id, b.starts_at, b.ends_at);
  return out;
}

// ────────────────────────────────────────────────── créneaux

export interface CalendarSlots {
  id: string;
  name: string;
  color: string;
  days: { day: string; slots: string[] }[];
}

export interface SlotsResult {
  timezone: string;
  service: BookingService;
  fromDay: string;
  days: number;
  calendars: CalendarSlots[];
}

/**
 * Les créneaux libres d'une prestation, planning par planning, sur une
 * fenêtre de jours. Sert l'écran du client et le Coach IA.
 */
export async function slotsFor(opts: { tenantId: string; serviceId: string; calendarId?: string | null; fromDay?: string; days?: number; now?: Date }): Promise<SlotsResult | { error: string }> {
  const now = opts.now ?? new Date();
  const [space, settings, service, calendars] = await Promise.all([
    bookingSpace(opts.tenantId),
    readBookingSettings(opts.tenantId),
    serviceOf(opts.tenantId, opts.serviceId),
    listCalendars(opts.tenantId, true),
  ]);
  if (!space.open) return { error: "La réservation n'est pas ouverte." };
  if (!service || !service.is_active) return { error: "Prestation introuvable." };
  const cals = calendars.filter((c) => (opts.calendarId ? c.id === opts.calendarId : true) && c.hours.length > 0);
  if (!cals.length) return { error: "Aucun planning disponible." };
  const tz = space.timezone;
  const days = Math.max(1, Math.min(31, opts.days ?? 14));
  const fromDay = opts.fromDay ?? dayKey(now, tz);
  const from = startOfDay(fromDay, tz) ?? now;
  const to = startOfDay(shiftDayKey(fromDay, days + 1), tz) ?? new Date(from.getTime() + (days + 1) * 86400000);
  const busy = await busyByCalendar(
    cals.map((c) => c.id),
    new Date(from.getTime() - 86400000),
    to,
    now,
  );
  const query = {
    tz,
    durationMin: service.duration_min,
    stepMin: settings.slotStepMin,
    bufferMin: settings.bufferMin,
    minNoticeHours: settings.minNoticeHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    now,
    fromDay,
    days,
  };
  return {
    timezone: tz,
    service,
    fromDay,
    days,
    calendars: cals.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      days: availableSlots({ ...query, hours: c.hours, busy: busy.get(c.id) ?? [] }).map((d: DaySlots) => ({ day: d.day, slots: d.slots.map((s) => s.toISOString()) })),
    })),
  };
}

// ────────────────────────────────────────────────── prise de rendez-vous

export interface CreateInput {
  tenantId: string;
  clientId: string;
  calendarId: string;
  serviceId: string;
  start: Date;
  source: BookingSource;
  note?: string;
  now?: Date;
}

export interface CreateResult {
  booking?: Booking;
  /** Le client doit payer pour que le créneau lui reste : lien Stripe. */
  payUrl?: string;
  /** Le coach doit valider (confirmation manuelle). */
  awaitingCoach?: boolean;
  error?: string;
}

async function calendarActive(tenantId: string, calendarId: string): Promise<BookingCalendar | null> {
  const cal = (await listCalendars(tenantId, true)).find((c) => c.id === calendarId);
  return cal ?? null;
}

/**
 * Le client (ou son Coach IA) prend un créneau. La disponibilité est
 * recalculée juste avant d'écrire ; la base tranche en cas de course.
 */
export async function createBooking(input: CreateInput): Promise<CreateResult> {
  const now = input.now ?? new Date();
  const [space, settings, service, cal] = await Promise.all([
    bookingSpace(input.tenantId),
    readBookingSettings(input.tenantId),
    serviceOf(input.tenantId, input.serviceId),
    calendarActive(input.tenantId, input.calendarId),
  ]);
  if (!space.open) return { error: "La réservation n'est pas ouverte." };
  if (!service || !service.is_active) return { error: "Prestation introuvable." };
  if (!cal || !cal.hours.length) return { error: "Planning introuvable." };
  if (Number.isNaN(input.start.getTime())) return { error: "Créneau illisible." };

  const dayStart = startOfDay(dayKey(input.start, space.timezone), space.timezone) ?? input.start;
  const busy = await busyByCalendar([cal.id], new Date(dayStart.getTime() - 86400000), new Date(dayStart.getTime() + 2 * 86400000), now);
  const ok = slotIsAvailable(
    {
      tz: space.timezone,
      hours: cal.hours,
      busy: busy.get(cal.id) ?? [],
      durationMin: service.duration_min,
      stepMin: settings.slotStepMin,
      bufferMin: settings.bufferMin,
      minNoticeHours: settings.minNoticeHours,
      maxAdvanceDays: settings.maxAdvanceDays,
      now,
    },
    input.start,
  );
  if (!ok) return { error: "Ce créneau n'est plus disponible." };

  const needsPayment = settings.payment === "required" && (service.price_cents ?? 0) > 0;
  const awaitingCoach = !needsPayment && settings.confirmation === "manual";
  const status: BookingStatus = needsPayment || awaitingCoach ? "pending" : "confirmed";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .insert({
      tenant_id: input.tenantId,
      calendar_id: cal.id,
      service_id: service.id,
      client_id: input.clientId,
      starts_at: input.start.toISOString(),
      ends_at: new Date(input.start.getTime() + service.duration_min * 60000).toISOString(),
      status,
      source: input.source,
      service_name: service.name,
      price_cents: service.price_cents,
      paid: false,
      hold_until: needsPayment ? new Date(now.getTime() + HOLD_MINUTES * 60000).toISOString() : null,
      client_note: String(input.note ?? "").trim().slice(0, 300) || null,
    })
    .select(COLS)
    .single<Booking>();
  if (error || !data) {
    if (error?.code === "23P01") return { error: "Ce créneau vient d'être pris. Choisis-en un autre." };
    return { error: "Réservation impossible pour le moment." };
  }

  if (needsPayment) {
    const pay = await startBookingPayment(input.clientId, data.id);
    if (pay.error) {
      await admin.from("bookings").update({ status: "cancelled", cancelled_by: "system", cancel_reason: "paiement indisponible" }).eq("id", data.id);
      return { error: pay.error };
    }
    return { booking: data, payUrl: pay.url };
  }
  await notifyBookingCreated(data, { awaitingCoach });
  return { booking: data, awaitingCoach };
}

/** Le coach pose un rendez-vous à la main : pas de délai, pas de paiement, confirmé d'emblée. La base garde la contrainte de chevauchement. */
export async function coachCreateBooking(input: { tenantId: string; clientId: string; calendarId: string; serviceId: string; start: Date; note?: string }): Promise<CreateResult> {
  const [service, cal] = await Promise.all([serviceOf(input.tenantId, input.serviceId), calendarActive(input.tenantId, input.calendarId)]);
  if (!service) return { error: "Prestation introuvable." };
  if (!cal) return { error: "Planning introuvable." };
  if (Number.isNaN(input.start.getTime())) return { error: "Date illisible." };
  const admin = createAdminClient();
  const { data: client } = await admin.from("profiles").select("id").eq("id", input.clientId).eq("tenant_id", input.tenantId).maybeSingle<{ id: string }>();
  if (!client) return { error: "Client introuvable." };
  const { data, error } = await admin
    .from("bookings")
    .insert({
      tenant_id: input.tenantId,
      calendar_id: cal.id,
      service_id: service.id,
      client_id: input.clientId,
      starts_at: input.start.toISOString(),
      ends_at: new Date(input.start.getTime() + service.duration_min * 60000).toISOString(),
      status: "confirmed",
      source: "coach",
      service_name: service.name,
      price_cents: service.price_cents,
      coach_note: String(input.note ?? "").trim().slice(0, 300) || null,
    })
    .select(COLS)
    .single<Booking>();
  if (error || !data) {
    if (error?.code === "23P01") return { error: "Ce créneau chevauche un rendez-vous existant." };
    return { error: "Enregistrement impossible." };
  }
  await notifyBookingCreated(data, { byCoach: true });
  return { booking: data };
}

// ────────────────────────────────────────────────── paiement

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Démarre le paiement d'un rendez-vous en attente, sur le Stripe du coach. */
export async function startBookingPayment(clientId: string, bookingId: string, now = new Date()): Promise<{ url?: string; error?: string }> {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select(COLS).eq("id", bookingId).eq("client_id", clientId).maybeSingle<Booking>();
  if (!b) return { error: "Rendez-vous introuvable." };
  if (b.paid || b.status !== "pending" || !(b.price_cents && b.price_cents > 0)) return { error: "Rien à payer pour ce rendez-vous." };
  if (!isAlive(b, now)) {
    await admin.from("bookings").update({ status: "cancelled", cancelled_by: "system", cancel_reason: "paiement non effectué" }).eq("id", b.id);
    return { error: "Le délai de paiement est passé, le créneau a été libéré. Réserve à nouveau." };
  }
  const stripe = await stripeForTenant(b.tenant_id);
  if (!stripe) return { error: "Le paiement en ligne n'est pas configuré chez ton coach." };
  const { data: client } = await admin.from("profiles").select("email").eq("id", clientId).maybeSingle<{ email: string | null }>();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: clientId,
      customer_email: client?.email ?? undefined,
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: b.price_cents, product_data: { name: b.service_name || "Séance" } } }],
      metadata: { booking_id: b.id, user_id: clientId, kind: "booking" },
      // La session Stripe vit plus longtemps que la tenue du créneau : on
      // ne lui laisse que le temps de payer, sinon le créneau serait bloqué
      // une journée pour un client qui a fermé l'onglet.
      expires_at: Math.floor(now.getTime() / 1000) + 30 * 60,
      success_url: `${site()}/app/reservation?paye_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site()}/app/reservation?paiement_annule=1`,
    });
    await admin
      .from("bookings")
      .update({ stripe_session_id: session.id, hold_until: new Date(now.getTime() + HOLD_MINUTES * 60000).toISOString() })
      .eq("id", b.id);
    return { url: session.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/** Au retour de Stripe : vérifie la session et confirme le rendez-vous. Idempotent. */
export async function confirmBookingPayment(clientId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select(COLS).eq("stripe_session_id", sessionId).eq("client_id", clientId).maybeSingle<Booking>();
  if (!b) return false;
  if (b.paid) return true;
  const stripe = await stripeForTenant(b.tenant_id);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.booking_id !== b.id || session.payment_status !== "paid") return false;
    const settings = await readBookingSettings(b.tenant_id);
    const awaitingCoach = settings.confirmation === "manual";
    const { data: updated } = await admin
      .from("bookings")
      .update({ paid: true, status: awaitingCoach ? "pending" : "confirmed", hold_until: null, updated_at: new Date().toISOString() })
      .eq("id", b.id)
      .select(COLS)
      .single<Booking>();
    await recordOrder({
      tenantId: b.tenant_id,
      userId: clientId,
      offerName: `Rendez-vous : ${b.service_name}`,
      kind: "one_time",
      amountCents: session.amount_total ?? b.price_cents ?? 0,
      currency: session.currency ?? "eur",
      stripeRef: session.id,
      paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    });
    await notifyBookingCreated(updated ?? { ...b, paid: true }, { awaitingCoach });
    return true;
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────── annulation, statut

export async function cancelBooking(opts: { bookingId: string; by: "client" | "coach"; clientId?: string; tenantId?: string; reason?: string; now?: Date }): Promise<{ ok?: boolean; error?: string }> {
  const now = opts.now ?? new Date();
  const admin = createAdminClient();
  let q = admin.from("bookings").select(COLS).eq("id", opts.bookingId);
  if (opts.by === "client") q = q.eq("client_id", opts.clientId ?? "");
  else q = q.eq("tenant_id", opts.tenantId ?? "");
  const { data: b } = await q.maybeSingle<Booking>();
  if (!b) return { error: "Rendez-vous introuvable." };
  if (b.status !== "pending" && b.status !== "confirmed") return { error: "Ce rendez-vous n'est plus modifiable." };
  if (opts.by === "client" && b.status === "confirmed") {
    const settings = await readBookingSettings(b.tenant_id);
    if (!clientCanCancel(new Date(b.starts_at), settings.cancelLimitHours, now)) return { error: "Trop tard pour annuler seul : contacte ton coach." };
  }
  const reason = String(opts.reason ?? "").trim().slice(0, 200) || null;
  await admin.from("bookings").update({ status: "cancelled", cancelled_by: opts.by, cancel_reason: reason, updated_at: now.toISOString() }).eq("id", b.id);
  await notifyBookingCancelled(b, opts.by, reason);
  return { ok: true };
}

export async function coachSetBookingStatus(tenantId: string, bookingId: string, status: "confirmed" | "done" | "no_show"): Promise<boolean> {
  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select(COLS).eq("id", bookingId).eq("tenant_id", tenantId).maybeSingle<Booking>();
  if (!b) return false;
  if (status === "confirmed" && b.status !== "pending") return false;
  if ((status === "done" || status === "no_show") && b.status !== "confirmed" && b.status !== "pending") return false;
  await admin.from("bookings").update({ status, hold_until: null, updated_at: new Date().toISOString() }).eq("id", b.id);
  if (status === "confirmed") await notifyBookingConfirmed({ ...b, status });
  return true;
}

// ────────────────────────────────────────────────── listes

export async function listClientBookings(clientId: string, now = new Date()): Promise<{ upcoming: Booking[]; past: Booking[] }> {
  const admin = createAdminClient();
  const [{ data: up }, { data: past }] = await Promise.all([
    admin.from("bookings").select(COLS).eq("client_id", clientId).in("status", ["pending", "confirmed"]).gte("ends_at", now.toISOString()).order("starts_at").returns<Booking[]>(),
    admin
      .from("bookings")
      .select(COLS)
      .eq("client_id", clientId)
      .or(`ends_at.lt.${now.toISOString()},status.in.(cancelled,done,no_show)`)
      .order("starts_at", { ascending: false })
      .limit(10)
      .returns<Booking[]>(),
  ]);
  return { upcoming: (up ?? []).filter((b) => isAlive(b, now)), past: past ?? [] };
}

export interface AgendaBooking extends Booking {
  client_name: string;
  client_email: string | null;
  calendar_name: string;
  calendar_color: string;
}

/** L'agenda du coach : tout ce qui est vivant ou récent sur la fenêtre. */
export async function listTenantAgenda(tenantId: string, from: Date, to: Date): Promise<AgendaBooking[]> {
  const admin = createAdminClient();
  const [{ data: rows }, calendars] = await Promise.all([
    admin.from("bookings").select(COLS).eq("tenant_id", tenantId).gte("ends_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at").returns<Booking[]>(),
    listCalendars(tenantId),
  ]);
  const list = rows ?? [];
  const ids = [...new Set(list.map((b) => b.client_id))];
  const { data: clients } = ids.length
    ? await admin.from("profiles").select("id, name, email").in("id", ids).returns<{ id: string; name: string | null; email: string | null }[]>()
    : { data: [] as { id: string; name: string | null; email: string | null }[] };
  const byClient = new Map((clients ?? []).map((c) => [c.id, c]));
  const byCal = new Map(calendars.map((c) => [c.id, c]));
  return list.map((b) => {
    const c = byClient.get(b.client_id);
    const cal = byCal.get(b.calendar_id);
    return { ...b, client_name: c?.name || c?.email || "Client", client_email: c?.email ?? null, calendar_name: cal?.name ?? "", calendar_color: cal?.color ?? "#888" };
  });
}

export async function listTenantClientChoices(tenantId: string): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, name, email").eq("tenant_id", tenantId).eq("role", "client").order("name").returns<{ id: string; name: string | null; email: string | null }[]>();
  return (data ?? []).map((c) => ({ id: c.id, name: c.name || c.email || "Client" }));
}

// ────────────────────────────────────────────────── cron

/** Annule les réservations dont le paiement n'est pas arrivé à temps. */
export async function expireBookingHolds(now = new Date()): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(COLS)
    .eq("status", "pending")
    .eq("paid", false)
    .not("hold_until", "is", null)
    .lt("hold_until", now.toISOString())
    .returns<Booking[]>();
  let n = 0;
  for (const b of data ?? []) {
    await admin.from("bookings").update({ status: "cancelled", cancelled_by: "system", cancel_reason: "paiement non effectué", updated_at: now.toISOString() }).eq("id", b.id);
    await notifyBookingCancelled(b, "system");
    n++;
  }
  return n;
}

/** Rappelle au client ses rendez-vous confirmés des prochaines 24 h, une seule fois. */
export async function remindUpcomingBookings(now = new Date()): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(COLS)
    .eq("status", "confirmed")
    .is("reminded_at", null)
    .gte("starts_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 24 * 3600000).toISOString())
    .returns<Booking[]>();
  let n = 0;
  for (const b of data ?? []) {
    await notifyBookingReminder(b);
    await admin.from("bookings").update({ reminded_at: now.toISOString() }).eq("id", b.id);
    n++;
  }
  return n;
}
