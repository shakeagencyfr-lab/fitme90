import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freePlanOffered } from "@/lib/plans";
import { resellerBookingPrice } from "@/lib/booking-billing";
import {
  asCalendarColor,
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_HOURS,
  normalizeHours,
  resolveBookingAccess,
  sanitizeBookingSettings,
  type BookingAccess,
  type BookingSettings,
  type CleanService,
  type HoursRange,
} from "@/lib/booking-rules";
import { DEFAULT_TIMEZONE, isTimezone } from "@/lib/booking-time";

// ------------------------------------------------------------------ *
// Réservation de séances en présentiel : l'accès au pack, les réglages, les
// plannings, les prestations. Les rendez-vous eux-mêmes vivent dans
// lib/booking-appointments.ts.
//
// Toutes ces tables sont réservées au service role : l'appartenance au
// tenant se vérifie ICI, à chaque écriture, avec le tenant du coach connecté
// passé en argument. Aucun identifiant venu d'un formulaire n'est écrit sans
// avoir été relu contre ce tenant.
// ------------------------------------------------------------------ */

export type { BookingAccess, BookingSettings, HoursRange };

// ────────────────────────────────────────────────── accès au pack

interface AccessRow {
  kind: string | null;
  parent_id: string | null;
  plan_id: string | null;
  booking_enabled: boolean | null;
  booking_sub_status: string | null;
  booking_active: boolean | null;
  timezone: string | null;
}

const ACCESS_COLS = "kind, parent_id, plan_id, booking_enabled, booking_sub_status, booking_active, timezone";

async function planIncludesBooking(row: AccessRow): Promise<boolean> {
  if (row.plan_id) {
    const admin = createAdminClient();
    const { data: plan } = await admin.from("plans").select("booking_included").eq("id", row.plan_id).maybeSingle<{ booking_included: boolean | null }>();
    return !!plan?.booking_included;
  }
  const free = await freePlanOffered(row.parent_id);
  return !!free?.booking_included;
}

/** Le compte a-t-il droit au pack, par quel chemin, et à quel prix sinon. */
export async function bookingAccess(tenantId: string | null): Promise<BookingAccess> {
  if (!tenantId) return { allowed: false, source: "closed", priceCents: null, subStatus: null };
  const admin = createAdminClient();
  const { data: row } = await admin.from("tenants").select(ACCESS_COLS).eq("id", tenantId).maybeSingle<AccessRow>();
  if (!row) return { allowed: false, source: "closed", priceCents: null, subStatus: null };
  const sellable = row.kind !== "platform" && row.kind !== "reseller" && !!row.parent_id;
  const [planIncluded, priceCents] = sellable ? await Promise.all([planIncludesBooking(row), resellerBookingPrice(row.parent_id)]) : [false, null];
  return resolveBookingAccess({
    kind: row.kind,
    parentId: row.parent_id,
    addonEnabled: !!row.booking_enabled,
    planIncluded,
    priceCents,
    subStatus: row.booking_sub_status ?? null,
  });
}

/** Tout ce qu'il faut pour savoir si un espace prend des rendez-vous : le pack, et l'interrupteur du coach. */
export interface BookingSpace {
  access: BookingAccess;
  /** Le coach a allumé la réservation dans son espace. */
  active: boolean;
  /** Réservation réellement ouverte : pack acquis ET allumée. */
  open: boolean;
  timezone: string;
}

export async function bookingSpace(tenantId: string | null): Promise<BookingSpace> {
  const access = await bookingAccess(tenantId);
  if (!tenantId) return { access, active: false, open: false, timezone: DEFAULT_TIMEZONE };
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("booking_active, timezone").eq("id", tenantId).maybeSingle<{ booking_active: boolean | null; timezone: string | null }>();
  const active = !!data?.booking_active;
  return { access, active, open: access.allowed && active, timezone: tenantTimezoneOf(data?.timezone) };
}

export function tenantTimezoneOf(v: string | null | undefined): string {
  return isTimezone(v) ? v : DEFAULT_TIMEZONE;
}

export async function tenantTimezone(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("timezone").eq("id", tenantId).maybeSingle<{ timezone: string | null }>();
  return tenantTimezoneOf(data?.timezone);
}

export async function setTenantTimezone(tenantId: string, tz: string): Promise<boolean> {
  if (!isTimezone(tz)) return false;
  const admin = createAdminClient();
  await admin.from("tenants").update({ timezone: tz }).eq("id", tenantId);
  return true;
}

/** Le coach allume ou éteint la réservation dans son espace (le pack étant acquis). */
export async function setBookingActive(tenantId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ booking_active: active }).eq("id", tenantId);
  // Un premier planning naît avec l'activation : un coach seul n'a pas à
  // comprendre ce qu'est un planning pour recevoir son premier rendez-vous.
  if (active) await ensureDefaultCalendar(tenantId);
}

// ────────────────────────────────────────────────── par client

/** Le coach a-t-il ouvert la réservation en ligne à ce client, et l'espace la prend-il ? */
export async function clientBookingContext(userId: string): Promise<{ enabled: boolean; tenantId: string | null; timezone: string }> {
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("tenant_id, booking_enabled").eq("id", userId).maybeSingle<{ tenant_id: string | null; booking_enabled: boolean | null }>();
  if (!p?.tenant_id || !p.booking_enabled) return { enabled: false, tenantId: p?.tenant_id ?? null, timezone: DEFAULT_TIMEZONE };
  const space = await bookingSpace(p.tenant_id);
  return { enabled: space.open, tenantId: p.tenant_id, timezone: space.timezone };
}

/** Le coach ouvre ou ferme la réservation en ligne pour UN client de son tenant. */
export async function setClientBookingEnabled(tenantId: string, clientId: string, enabled: boolean): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").update({ booking_enabled: enabled }).eq("id", clientId).eq("tenant_id", tenantId).select("id").maybeSingle<{ id: string }>();
  return !!data;
}

// ────────────────────────────────────────────────── réglages

interface SettingsRow {
  slot_step_min: number;
  min_notice_hours: number;
  max_advance_days: number;
  cancel_limit_hours: number;
  buffer_min: number;
  payment: string;
  confirmation: string;
  address: string;
  instructions: string;
}

function rowToSettings(r: SettingsRow | null): BookingSettings {
  if (!r) return DEFAULT_BOOKING_SETTINGS;
  return sanitizeBookingSettings({
    slotStepMin: r.slot_step_min,
    minNoticeHours: r.min_notice_hours,
    maxAdvanceDays: r.max_advance_days,
    cancelLimitHours: r.cancel_limit_hours,
    bufferMin: r.buffer_min,
    payment: r.payment,
    confirmation: r.confirmation,
    address: r.address,
    instructions: r.instructions,
  });
}

export async function readBookingSettings(tenantId: string): Promise<BookingSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_settings")
    .select("slot_step_min, min_notice_hours, max_advance_days, cancel_limit_hours, buffer_min, payment, confirmation, address, instructions")
    .eq("tenant_id", tenantId)
    .maybeSingle<SettingsRow>();
  return rowToSettings(data);
}

export async function saveBookingSettings(tenantId: string, input: Partial<Record<keyof BookingSettings, unknown>>): Promise<BookingSettings> {
  const s = sanitizeBookingSettings(input);
  const admin = createAdminClient();
  await admin.from("booking_settings").upsert(
    {
      tenant_id: tenantId,
      slot_step_min: s.slotStepMin,
      min_notice_hours: s.minNoticeHours,
      max_advance_days: s.maxAdvanceDays,
      cancel_limit_hours: s.cancelLimitHours,
      buffer_min: s.bufferMin,
      payment: s.payment,
      confirmation: s.confirmation,
      address: s.address,
      instructions: s.instructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  return s;
}

// ────────────────────────────────────────────────── plannings

export interface BookingCalendar {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  position: number;
  hours: HoursRange[];
}

export interface BookingBlock {
  id: string;
  calendar_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

const CAL_COLS = "id, tenant_id, name, color, is_active, position";
export const MAX_CALENDARS = 20;

export async function listCalendars(tenantId: string, onlyActive = false): Promise<BookingCalendar[]> {
  const admin = createAdminClient();
  let q = admin.from("booking_calendars").select(CAL_COLS).eq("tenant_id", tenantId).order("position").order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data: cals } = await q.returns<{ id: string; name: string; color: string; is_active: boolean; position: number }[]>();
  if (!cals?.length) return [];
  const { data: hours } = await admin
    .from("booking_hours")
    .select("calendar_id, weekday, start_min, end_min")
    .in(
      "calendar_id",
      cals.map((c) => c.id),
    )
    .returns<{ calendar_id: string; weekday: number; start_min: number; end_min: number }[]>();
  return cals.map((c) => ({
    ...c,
    hours: normalizeHours((hours ?? []).filter((h) => h.calendar_id === c.id).map((h) => ({ weekday: h.weekday, startMin: h.start_min, endMin: h.end_min }))),
  }));
}

export async function calendarOf(tenantId: string, calendarId: string): Promise<BookingCalendar | null> {
  return (await listCalendars(tenantId)).find((c) => c.id === calendarId) ?? null;
}

/** Nom du compte, pour baptiser le premier planning d'un coach seul. */
async function tenantName(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle<{ name: string | null }>();
  return data?.name?.trim() || "Planning";
}

export async function ensureDefaultCalendar(tenantId: string): Promise<void> {
  const existing = await listCalendars(tenantId);
  if (existing.length) return;
  await addCalendar(tenantId, await tenantName(tenantId));
}

export async function addCalendar(tenantId: string, name: string, color?: string): Promise<{ id?: string; error?: string }> {
  const clean = String(name ?? "").trim().slice(0, 60);
  if (!clean) return { error: "Donne un nom au planning." };
  const admin = createAdminClient();
  const { count } = await admin.from("booking_calendars").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_CALENDARS) return { error: `Maximum ${MAX_CALENDARS} plannings.` };
  const { data, error } = await admin
    .from("booking_calendars")
    .insert({ tenant_id: tenantId, name: clean, color: asCalendarColor(color), position: count ?? 0 })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Création impossible." };
  await admin.from("booking_hours").insert(DEFAULT_HOURS.map((h) => ({ calendar_id: data.id, weekday: h.weekday, start_min: h.startMin, end_min: h.endMin })));
  return { id: data.id };
}

export async function updateCalendar(tenantId: string, calendarId: string, patch: { name?: string; color?: string; is_active?: boolean }): Promise<boolean> {
  const upd: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const clean = String(patch.name).trim().slice(0, 60);
    if (!clean) return false;
    upd.name = clean;
  }
  if (patch.color !== undefined) upd.color = asCalendarColor(patch.color);
  if (patch.is_active !== undefined) upd.is_active = !!patch.is_active;
  if (!Object.keys(upd).length) return true;
  const admin = createAdminClient();
  const { data } = await admin.from("booking_calendars").update(upd).eq("id", calendarId).eq("tenant_id", tenantId).select("id").maybeSingle<{ id: string }>();
  return !!data;
}

export async function deleteCalendar(tenantId: string, calendarId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("booking_calendars").delete().eq("id", calendarId).eq("tenant_id", tenantId).select("id").maybeSingle<{ id: string }>();
  return !!data;
}

/** Remplace la semaine d'horaires d'un planning (nettoyée et fusionnée). */
export async function saveCalendarHours(tenantId: string, calendarId: string, ranges: HoursRange[]): Promise<boolean> {
  const cal = await calendarOf(tenantId, calendarId);
  if (!cal) return false;
  const clean = normalizeHours(ranges);
  const admin = createAdminClient();
  await admin.from("booking_hours").delete().eq("calendar_id", calendarId);
  if (clean.length) {
    await admin.from("booking_hours").insert(clean.map((h) => ({ calendar_id: calendarId, weekday: h.weekday, start_min: h.startMin, end_min: h.endMin })));
  }
  return true;
}

export async function listBlocks(tenantId: string, from = new Date()): Promise<BookingBlock[]> {
  const cals = await listCalendars(tenantId);
  if (!cals.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_blocks")
    .select("id, calendar_id, starts_at, ends_at, reason")
    .in(
      "calendar_id",
      cals.map((c) => c.id),
    )
    .gte("ends_at", from.toISOString())
    .order("starts_at")
    .returns<BookingBlock[]>();
  return data ?? [];
}

export async function addBlock(tenantId: string, calendarId: string, startsAt: Date, endsAt: Date, reason: string): Promise<{ ok?: boolean; error?: string }> {
  if (!(endsAt > startsAt)) return { error: "La fin doit être après le début." };
  if (endsAt.getTime() - startsAt.getTime() > 120 * 86400000) return { error: "Une absence ne peut pas dépasser 120 jours." };
  const cal = await calendarOf(tenantId, calendarId);
  if (!cal) return { error: "Planning introuvable." };
  const admin = createAdminClient();
  const { error } = await admin.from("booking_blocks").insert({
    calendar_id: calendarId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: String(reason ?? "").trim().slice(0, 120) || null,
  });
  return error ? { error: "Enregistrement impossible." } : { ok: true };
}

export async function deleteBlock(tenantId: string, blockId: string): Promise<boolean> {
  const cals = await listCalendars(tenantId);
  if (!cals.length) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_blocks")
    .delete()
    .eq("id", blockId)
    .in(
      "calendar_id",
      cals.map((c) => c.id),
    )
    .select("id")
    .maybeSingle<{ id: string }>();
  return !!data;
}

// ────────────────────────────────────────────────── prestations

export interface BookingService {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number | null;
  is_active: boolean;
  position: number;
}

const SVC_COLS = "id, name, description, duration_min, price_cents, is_active, position";
export const MAX_SERVICES = 30;

export async function listServices(tenantId: string, onlyActive = false): Promise<BookingService[]> {
  const admin = createAdminClient();
  let q = admin.from("booking_services").select(SVC_COLS).eq("tenant_id", tenantId).order("position").order("created_at");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q.returns<BookingService[]>();
  return data ?? [];
}

export async function serviceOf(tenantId: string, serviceId: string): Promise<BookingService | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("booking_services").select(SVC_COLS).eq("id", serviceId).eq("tenant_id", tenantId).maybeSingle<BookingService>();
  return data ?? null;
}

export async function addService(tenantId: string, svc: CleanService): Promise<{ ok?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { count } = await admin.from("booking_services").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_SERVICES) return { error: `Maximum ${MAX_SERVICES} prestations.` };
  const { error } = await admin.from("booking_services").insert({
    tenant_id: tenantId,
    name: svc.name,
    description: svc.description,
    duration_min: svc.durationMin,
    price_cents: svc.priceCents,
    position: count ?? 0,
  });
  return error ? { error: "Création impossible." } : { ok: true };
}

export async function updateService(tenantId: string, serviceId: string, svc: CleanService): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_services")
    .update({ name: svc.name, description: svc.description, duration_min: svc.durationMin, price_cents: svc.priceCents })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle<{ id: string }>();
  return !!data;
}

export async function setServiceActive(tenantId: string, serviceId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("booking_services").update({ is_active: active }).eq("id", serviceId).eq("tenant_id", tenantId);
}

export async function deleteService(tenantId: string, serviceId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("booking_services").delete().eq("id", serviceId).eq("tenant_id", tenantId);
}

/** Les plannings qui ont des horaires et au moins une prestation active : ce qu'il faut pour réserver. */
export async function bookingReady(tenantId: string): Promise<{ calendars: number; services: number; ready: boolean }> {
  const [cals, svcs] = await Promise.all([listCalendars(tenantId, true), listServices(tenantId, true)]);
  const withHours = cals.filter((c) => c.hours.length > 0).length;
  return { calendars: withHours, services: svcs.length, ready: withHours > 0 && svcs.length > 0 };
}
