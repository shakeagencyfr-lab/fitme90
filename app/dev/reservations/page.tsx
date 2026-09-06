import { notFound } from "next/navigation";
import { BookingAdmin } from "@/components/booking-admin";
import { BookingLocked } from "@/components/booking-locked";
import { DEFAULT_BOOKING_SETTINGS, DEFAULT_HOURS } from "@/lib/booking-rules";
import { BookingClient } from "@/components/booking-client";
import type { AgendaBooking } from "@/lib/booking-appointments";

const NOW = Date.now();
const HOLD_ISO = new Date(NOW + 25 * 60000).toISOString();
const CAL1 = "11111111-1111-1111-1111-111111111111";
const CAL2 = "22222222-2222-2222-2222-222222222222";
const RDV = (over: Partial<AgendaBooking>): AgendaBooking => ({
  id: "r1",
  tenant_id: "t",
  calendar_id: CAL1,
  service_id: "s1",
  client_id: "c1",
  starts_at: new Date(NOW + 2 * 3600000).toISOString(),
  ends_at: new Date(NOW + 3 * 3600000).toISOString(),
  status: "confirmed",
  source: "client",
  service_name: "Séance individuelle",
  price_cents: 4500,
  paid: true,
  hold_until: null,
  client_note: null,
  coach_note: null,
  cancelled_by: null,
  cancel_reason: null,
  created_at: new Date().toISOString(),
  client_name: "Camille Durand",
  client_email: "camille@exemple.fr",
  calendar_name: "Sarah",
  calendar_color: "#E0551F",
  ...over,
});
const AGENDA: AgendaBooking[] = [
  RDV({}),
  RDV({ id: "r2", client_name: "Mehdi B.", calendar_id: CAL2, calendar_name: "Karim", calendar_color: "#2B5BA8", starts_at: new Date(NOW + 26 * 3600000).toISOString(), ends_at: new Date(NOW + 27 * 3600000).toISOString(), source: "ai", client_note: "Je viens après le travail" }),
  RDV({ id: "r3", client_name: "Léa Martin", status: "pending", service_name: "Bilan de départ", price_cents: null, paid: false, starts_at: new Date(NOW + 50 * 3600000).toISOString(), ends_at: new Date(NOW + 50.75 * 3600000).toISOString() }),
  RDV({ id: "r4", client_name: "Nour A.", status: "cancelled", cancelled_by: "client", cancel_reason: "malade", starts_at: new Date(NOW - 20 * 3600000).toISOString(), ends_at: new Date(NOW - 19 * 3600000).toISOString() }),
];

// Bac à sable de l'écran Réservations : le pack fermé, puis ouvert avec deux
// plannings (une salle), des prestations et des règles, sans compte ni base.
// Les actions échouent sans session (attendu). Désactivé sauf si
// LANDING_PREVIEW=1.
export const dynamic = "force-dynamic";

export default function DevReservationsPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-10 p-4">
      <BookingLocked priceCents={2900} />
      <BookingAdmin
        active
        timezone="Europe/Paris"
        settings={{ ...DEFAULT_BOOKING_SETTINGS, address: "12 rue des Sports, 69003 Lyon" }}
        source="plan"
        ready={{ calendars: 2, services: 2, ready: true }}
        agenda={AGENDA}
        clients={[{ id: "c1", name: "Camille Durand" }, { id: "c2", name: "Mehdi B." }]}
        calendars={[
          { id: CAL1, name: "Sarah", color: "#E0551F", is_active: true, position: 0, hours: [...DEFAULT_HOURS, { weekday: 5, startMin: 540, endMin: 780 }] },
          { id: CAL2, name: "Karim", color: "#2B5BA8", is_active: true, position: 1, hours: [{ weekday: 1, startMin: 420, endMin: 840 }, { weekday: 3, startMin: 420, endMin: 840 }, { weekday: 5, startMin: 480, endMin: 720 }] },
        ]}
        blocks={[{ id: "b1", calendar_id: CAL1, starts_at: "2026-10-19T00:00:00Z", ends_at: "2026-10-25T22:00:00Z", reason: "Vacances" }]}
        services={[
          { id: "s1", name: "Séance individuelle", description: "Une heure en tête-à-tête sur ton programme.", duration_min: 60, price_cents: 4500, is_active: true, position: 0 },
          { id: "s2", name: "Bilan de départ", description: "", duration_min: 45, price_cents: null, is_active: true, position: 1 },
        ]}
      />
      <h2 className="font-archivo font-extrabold text-[22px] text-ink">Côté client</h2>
      <BookingClient
        services={[
          { id: "s1", name: "Séance individuelle", description: "Une heure en tête-à-tête sur ton programme.", duration_min: 60, price_cents: 4500, is_active: true, position: 0 },
          { id: "s2", name: "Bilan de départ", description: "", duration_min: 45, price_cents: null, is_active: true, position: 1 },
        ]}
        calendars={[{ id: CAL1, name: "Sarah", color: "#E0551F" }, { id: CAL2, name: "Karim", color: "#2B5BA8" }]}
        settings={{ payment: "required", confirmation: "auto", cancelLimitHours: 24, address: "12 rue des Sports, 69003 Lyon", instructions: "Tenue de sport, serviette." }}
        timezone="Europe/Paris"
        locale="fr"
        upcoming={[AGENDA[0], { ...AGENDA[2], hold_until: HOLD_ISO, price_cents: 4500, service_name: "Séance individuelle" }]}
        past={[AGENDA[3]]}
        notice={null}
        canLog
      />
    </div>
  );
}
