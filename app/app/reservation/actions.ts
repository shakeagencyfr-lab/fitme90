"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/guard";
import { clientBookingContext } from "@/lib/booking";
import { cancelBooking, createBooking, slotsFor, startBookingPayment, type CreateResult, type SlotsResult } from "@/lib/booking-appointments";

// Actions de l'onglet Réservation du client. Chacune relit que le coach lui a
// ouvert la réservation : un onglet fermé ne se rouvre pas par un formulaire.

const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

async function gate(): Promise<{ userId: string; tenantId: string } | { error: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Ton programme est terminé." };
  const b = await clientBookingContext(ctx.userId);
  if (!b.enabled || !b.tenantId) return { error: "La réservation n'est pas ouverte." };
  return { userId: ctx.userId, tenantId: b.tenantId };
}

export async function loadSlotsAction(input: { serviceId: string; calendarId?: string | null; fromDay?: string }): Promise<SlotsResult | { error: string }> {
  const g = await gate();
  if ("error" in g) return g;
  if (!isUuid(input?.serviceId)) return { error: "Prestation introuvable." };
  return slotsFor({
    tenantId: g.tenantId,
    serviceId: input.serviceId,
    calendarId: isUuid(input.calendarId) ? input.calendarId : null,
    fromDay: typeof input.fromDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.fromDay) ? input.fromDay : undefined,
    days: 14,
  });
}

export async function bookSlotAction(input: { serviceId: string; calendarId: string; startIso: string; note?: string }): Promise<CreateResult> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  if (!isUuid(input?.serviceId) || !isUuid(input?.calendarId)) return { error: "Choix incomplet." };
  const start = new Date(String(input.startIso ?? ""));
  if (Number.isNaN(start.getTime())) return { error: "Créneau illisible." };
  const res = await createBooking({
    tenantId: g.tenantId,
    clientId: g.userId,
    calendarId: input.calendarId,
    serviceId: input.serviceId,
    start,
    source: "client",
    note: typeof input.note === "string" ? input.note : "",
  });
  if (res.booking) revalidatePath("/app/reservation");
  return res;
}

export async function payBookingAction(bookingId: string): Promise<{ url?: string; error?: string }> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  if (!isUuid(bookingId)) return { error: "Rendez-vous introuvable." };
  return startBookingPayment(g.userId, bookingId);
}

export async function cancelMyBookingAction(bookingId: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!isUuid(bookingId)) return { error: "Rendez-vous introuvable." };
  const res = await cancelBooking({ bookingId, by: "client", clientId: ctx.userId });
  if (res.ok) revalidatePath("/app/reservation");
  return res;
}
