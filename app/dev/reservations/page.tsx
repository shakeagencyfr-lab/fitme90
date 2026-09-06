import { notFound } from "next/navigation";
import { BookingAdmin } from "@/components/booking-admin";
import { BookingLocked } from "@/components/booking-locked";
import { DEFAULT_BOOKING_SETTINGS, DEFAULT_HOURS } from "@/lib/booking-rules";

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
        calendars={[
          { id: "11111111-1111-1111-1111-111111111111", name: "Sarah", color: "#E0551F", is_active: true, position: 0, hours: [...DEFAULT_HOURS, { weekday: 5, startMin: 540, endMin: 780 }] },
          { id: "22222222-2222-2222-2222-222222222222", name: "Karim", color: "#2B5BA8", is_active: true, position: 1, hours: [{ weekday: 1, startMin: 420, endMin: 840 }, { weekday: 3, startMin: 420, endMin: 840 }, { weekday: 5, startMin: 480, endMin: 720 }] },
        ]}
        blocks={[{ id: "b1", calendar_id: "11111111-1111-1111-1111-111111111111", starts_at: "2026-10-19T00:00:00Z", ends_at: "2026-10-25T22:00:00Z", reason: "Vacances" }]}
        services={[
          { id: "s1", name: "Séance individuelle", description: "Une heure en tête-à-tête sur ton programme.", duration_min: 60, price_cents: 4500, is_active: true, position: 0 },
          { id: "s2", name: "Bilan de départ", description: "", duration_min: 45, price_cents: null, is_active: true, position: 1 },
        ]}
      />
    </div>
  );
}
