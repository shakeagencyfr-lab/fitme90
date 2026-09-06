"use server";

import { revalidatePath } from "next/cache";
import { getAdminOrNull } from "@/lib/admin";
import {
  addBlock,
  addCalendar,
  addService,
  bookingAccess,
  deleteBlock,
  deleteCalendar,
  deleteService,
  saveBookingSettings,
  saveCalendarHours,
  setBookingActive,
  setClientBookingEnabled,
  setServiceActive,
  setTenantTimezone,
  tenantTimezone,
  updateCalendar,
  updateService,
} from "@/lib/booking";
import { parseHm, sanitizeService, type HoursRange } from "@/lib/booking-rules";
import { cancelBooking, coachCreateBooking, coachSetBookingStatus } from "@/lib/booking-appointments";
import { instantOf } from "@/lib/booking-time";

// Actions de l'écran Réservations (coach ou salle). Chacune relit le tenant
// du coach connecté et vérifie que le pack lui est ouvert : un formulaire
// posté hors de l'écran ne fait rien de plus que l'écran.

export interface BookingState {
  ok?: boolean;
  error?: string;
}

const PATH = "/admin/reservations";

async function gate(): Promise<{ tenantId: string } | { error: string }> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return { error: "Accès refusé." };
  const access = await bookingAccess(tenantId);
  if (!access.allowed) return { error: "Le pack réservation n'est pas ouvert sur ce compte." };
  return { tenantId };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

export async function setBookingActiveAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  await setBookingActive(g.tenantId, formData.get("active") === "on");
  revalidatePath(PATH);
  return { ok: true };
}

export async function saveBookingSettingsAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const tz = str(formData, "timezone");
  if (tz && !(await setTenantTimezone(g.tenantId, tz))) return { error: "Fuseau horaire inconnu." };
  await saveBookingSettings(g.tenantId, {
    slotStepMin: str(formData, "slot_step_min"),
    minNoticeHours: str(formData, "min_notice_hours"),
    maxAdvanceDays: str(formData, "max_advance_days"),
    cancelLimitHours: str(formData, "cancel_limit_hours"),
    bufferMin: str(formData, "buffer_min"),
    payment: str(formData, "payment"),
    confirmation: str(formData, "confirmation"),
    address: str(formData, "address"),
    instructions: str(formData, "instructions"),
  });
  revalidatePath(PATH);
  return { ok: true };
}

// ───────────────────────────── plannings

export async function addCalendarAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const res = await addCalendar(g.tenantId, str(formData, "name"), str(formData, "color"));
  if (res.error) return { error: res.error };
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateCalendarAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const id = str(formData, "id");
  if (!isUuid(id)) return { error: "Planning introuvable." };
  const ok = await updateCalendar(g.tenantId, id, { name: str(formData, "name"), color: str(formData, "color") });
  if (!ok) return { error: "Donne un nom au planning." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function toggleCalendarAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await updateCalendar(g.tenantId, id, { is_active: formData.get("active") === "on" });
  revalidatePath(PATH);
}

export async function deleteCalendarAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await deleteCalendar(g.tenantId, id);
  revalidatePath(PATH);
}

/** La semaine d'horaires d'un planning, postée en JSON : [{ weekday, start: "09:00", end: "12:00" }]. */
export async function saveHoursAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const id = str(formData, "calendar_id");
  if (!isUuid(id)) return { error: "Planning introuvable." };
  let raw: unknown;
  try {
    raw = JSON.parse(str(formData, "hours") || "[]");
  } catch {
    return { error: "Horaires illisibles." };
  }
  if (!Array.isArray(raw)) return { error: "Horaires illisibles." };
  const ranges: HoursRange[] = [];
  for (const r of raw as Array<{ weekday?: unknown; start?: unknown; end?: unknown }>) {
    const s = parseHm(String(r?.start ?? ""));
    const e = parseHm(String(r?.end ?? ""));
    const wd = Number(r?.weekday);
    if (s === null || e === null || !Number.isInteger(wd)) continue;
    if (e <= s) return { error: "Une plage finit avant de commencer." };
    ranges.push({ weekday: wd, startMin: s, endMin: e });
  }
  const ok = await saveCalendarHours(g.tenantId, id, ranges);
  if (!ok) return { error: "Planning introuvable." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function addBlockAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const id = str(formData, "calendar_id");
  if (!isUuid(id)) return { error: "Planning introuvable." };
  const tz = await tenantTimezone(g.tenantId);
  const start = instantOf(str(formData, "start_day"), str(formData, "start_time") || "00:00", tz);
  const end = instantOf(str(formData, "end_day"), str(formData, "end_time") || "23:59", tz);
  if (!start || !end) return { error: "Dates illisibles." };
  const res = await addBlock(g.tenantId, id, start, end, str(formData, "reason"));
  if (res.error) return { error: res.error };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteBlockAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await deleteBlock(g.tenantId, id);
  revalidatePath(PATH);
}

// ───────────────────────────── prestations

function serviceFromForm(formData: FormData) {
  const euros = str(formData, "price_euros").replace(",", ".");
  return sanitizeService({
    name: str(formData, "name"),
    description: str(formData, "description"),
    durationMin: str(formData, "duration_min"),
    priceCents: euros ? Math.round(Number(euros) * 100) : "",
  });
}

export async function addServiceAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const svc = serviceFromForm(formData);
  if (!svc) return { error: "Nom, durée (10 à 240 min) et prix valides, s'il te plaît." };
  const res = await addService(g.tenantId, svc);
  if (res.error) return { error: res.error };
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateServiceAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const id = str(formData, "id");
  if (!isUuid(id)) return { error: "Prestation introuvable." };
  const svc = serviceFromForm(formData);
  if (!svc) return { error: "Nom, durée (10 à 240 min) et prix valides, s'il te plaît." };
  const ok = await updateService(g.tenantId, id, svc);
  if (!ok) return { error: "Prestation introuvable." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function toggleServiceAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await setServiceActive(g.tenantId, id, formData.get("active") === "on");
  revalidatePath(PATH);
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await deleteService(g.tenantId, id);
  revalidatePath(PATH);
}

// ───────────────────────────── par client (fiche client)

export async function setClientBookingAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const clientId = str(formData, "client_id");
  if (!isUuid(clientId)) return { error: "Client introuvable." };
  const ok = await setClientBookingEnabled(g.tenantId, clientId, formData.get("enabled") === "on");
  if (!ok) return { error: "Client introuvable." };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

// ───────────────────────────── agenda du coach

export async function coachConfirmBookingAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await coachSetBookingStatus(g.tenantId, id, "confirmed");
  revalidatePath(PATH);
}

export async function coachBookingStatusAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!isUuid(id) || (status !== "done" && status !== "no_show")) return;
  await coachSetBookingStatus(g.tenantId, id, status);
  revalidatePath(PATH);
}

export async function coachCancelBookingAction(formData: FormData): Promise<void> {
  const g = await gate();
  if ("error" in g) return;
  const id = str(formData, "id");
  if (!isUuid(id)) return;
  await cancelBooking({ bookingId: id, by: "coach", tenantId: g.tenantId, reason: str(formData, "reason") });
  revalidatePath(PATH);
}

/** Le coach pose un rendez-vous à la main, pour un de ses clients. */
export async function coachAddBookingAction(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  const clientId = str(formData, "client_id");
  const calendarId = str(formData, "calendar_id");
  const serviceId = str(formData, "service_id");
  if (!isUuid(clientId) || !isUuid(calendarId) || !isUuid(serviceId)) return { error: "Client, planning et prestation, s'il te plaît." };
  const tz = await tenantTimezone(g.tenantId);
  const start = instantOf(str(formData, "day"), str(formData, "time"), tz);
  if (!start) return { error: "Date ou heure illisible." };
  const res = await coachCreateBooking({ tenantId: g.tenantId, clientId, calendarId, serviceId, start, note: str(formData, "note") });
  if (res.error) return { error: res.error };
  revalidatePath(PATH);
  return { ok: true };
}
