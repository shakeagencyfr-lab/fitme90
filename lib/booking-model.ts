/**
 * Le modèle d'un rendez-vous, partagé entre le serveur et le navigateur :
 * le type, et les deux questions qu'on se pose partout (occupe-t-il encore
 * son créneau ? attend-il un paiement ?). Pur, sans base ni réseau.
 */

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "done" | "no_show";
export type BookingSource = "client" | "coach" | "ai";

export interface Booking {
  id: string;
  tenant_id: string;
  calendar_id: string;
  service_id: string | null;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  source: BookingSource;
  service_name: string;
  price_cents: number | null;
  paid: boolean;
  hold_until: string | null;
  client_note: string | null;
  coach_note: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
}

/** Durée pendant laquelle un créneau reste tenu en attendant le paiement. */
export const HOLD_MINUTES = 30;

/** Le rendez-vous occupe-t-il encore son créneau ? */
export function isAlive(b: Pick<Booking, "status" | "paid" | "hold_until">, now = new Date()): boolean {
  if (b.status === "confirmed") return true;
  if (b.status !== "pending") return false;
  if (b.paid || !b.hold_until) return true;
  return new Date(b.hold_until).getTime() > now.getTime();
}

/** Le client attend-il de payer ce rendez-vous ? */
export function awaitingPayment(b: Pick<Booking, "status" | "paid" | "hold_until" | "price_cents">): boolean {
  return b.status === "pending" && !b.paid && !!b.hold_until && (b.price_cents ?? 0) > 0;
}
