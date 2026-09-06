import { describe, it, expect, vi, beforeEach } from "vitest";

// Le coffre à outils parle à la base et au moteur de créneaux. On simule ces
// deux voisins pour vérifier CE que le module fait de leurs réponses : quand
// il refuse de s'armer, ce qu'il montre au modèle, et ses garde-fous. Aucun
// appel au modèle, aucune écriture, rien à payer.

const ctx = { enabled: true, tenantId: "t1", timezone: "Europe/Paris" };
const services = [{ id: "s1", name: "Coaching perso", duration_min: 60, price_cents: 5000, is_active: true }];
const calendars = [{ id: "c1", name: "Sebastien", color: "#000", is_active: true, hours: [{ weekday: 1, start_min: 540, end_min: 720 }] }];
const settings = { minNoticeHours: 12, maxAdvanceDays: 30, cancelLimitHours: 24, payment: "optional", confirmation: "auto" };

const slotsFor = vi.fn();
const createBooking = vi.fn();

vi.mock("@/lib/booking", () => ({
  clientBookingContext: vi.fn(async () => ctx),
  listServices: vi.fn(async () => services),
  listCalendars: vi.fn(async () => calendars),
  readBookingSettings: vi.fn(async () => settings),
}));
vi.mock("@/lib/booking-appointments", () => ({
  slotsFor: (...a: unknown[]) => slotsFor(...a),
  createBooking: (...a: unknown[]) => createBooking(...a),
  cancelBooking: vi.fn(async () => ({ ok: true })),
  listClientBookings: vi.fn(async () => ({ upcoming: [], past: [] })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { loadBookingToolkit } = await import("./coach-booking-tools");
const { clientBookingContext, listServices, listCalendars } = await import("@/lib/booking");

beforeEach(() => {
  vi.mocked(clientBookingContext).mockResolvedValue(ctx);
  vi.mocked(listServices).mockResolvedValue(services as never);
  vi.mocked(listCalendars).mockResolvedValue(calendars as never);
  slotsFor.mockReset();
  createBooking.mockReset();
});

describe("loadBookingToolkit : quand il s'arme", () => {
  it("s'arme quand la réservation est ouverte à ce client", async () => {
    const kit = await loadBookingToolkit("u1");
    expect(kit).not.toBeNull();
    expect(kit!.tools.map((t) => t.name)).toEqual(["creneaux_disponibles", "reserver_seance", "annuler_rendez_vous"]);
  });

  it("ne s'arme pas quand le coach n'a pas ouvert la réservation à ce client", async () => {
    vi.mocked(clientBookingContext).mockResolvedValue({ enabled: false, tenantId: "t1", timezone: "Europe/Paris" });
    expect(await loadBookingToolkit("u1")).toBeNull();
  });

  it("ne s'arme pas sans prestation, ni sans planning avec des horaires", async () => {
    vi.mocked(listServices).mockResolvedValue([] as never);
    expect(await loadBookingToolkit("u1")).toBeNull();

    vi.mocked(listServices).mockResolvedValue(services as never);
    vi.mocked(listCalendars).mockResolvedValue([{ ...calendars[0], hours: [] }] as never);
    expect(await loadBookingToolkit("u1")).toBeNull();
  });
});

describe("le bloc donné au modèle", () => {
  it("nomme les prestations, les plannings et les règles du coach", async () => {
    const kit = (await loadBookingToolkit("u1"))!;
    expect(kit.block).toContain("Coaching perso");
    expect(kit.block).toContain("Sebastien");
    expect(kit.block).toContain("12 h à l'avance");
    expect(kit.block).toContain("24 h avant");
    expect(kit.block).toContain("Europe/Paris");
  });
});

describe("garde-fous des outils", () => {
  it("refuse une prestation qui n'existe pas, et ne cherche aucun créneau", async () => {
    const kit = (await loadBookingToolkit("u1"))!;
    const out = await kit.exec("creneaux_disponibles", { prestation: "Massage suédois" });
    expect(out).toMatch(/Prestation inconnue/);
    expect(out).toContain("Coaching perso");
    expect(slotsFor).not.toHaveBeenCalled();
  });

  it("refuse un planning qui n'existe pas", async () => {
    const kit = (await loadBookingToolkit("u1"))!;
    expect(await kit.exec("creneaux_disponibles", { prestation: "Coaching perso", planning: "Salle 2" })).toMatch(/Planning inconnu/);
  });

  it("rend les créneaux du moteur, sans en inventer", async () => {
    slotsFor.mockResolvedValue({
      calendars: [{ name: "Sebastien", days: [{ day: "2026-03-16", slots: ["2026-03-16T08:00:00.000Z", "2026-03-16T09:00:00.000Z"] }] }],
    });
    const kit = (await loadBookingToolkit("u1"))!;
    const out = await kit.exec("creneaux_disponibles", { prestation: "Coaching perso" });
    expect(out).toContain("Sebastien");
    expect(out).toContain("2026-03-16");
    // 8 h UTC, c'est 9 h à Paris : le modèle doit annoncer l'heure du coach.
    expect(out).toContain("9 h");
  });

  it("le dit franchement quand il n'y a plus rien de libre", async () => {
    slotsFor.mockResolvedValue({ calendars: [{ name: "Sebastien", days: [] }] });
    const kit = (await loadBookingToolkit("u1"))!;
    expect(await kit.exec("creneaux_disponibles", { prestation: "Coaching perso", a_partir_du: "2026-03-16", jours: 7 })).toMatch(/Aucun créneau libre/);
  });

  it("refuse une date illisible plutôt que de réserver au hasard", async () => {
    const kit = (await loadBookingToolkit("u1"))!;
    expect(await kit.exec("reserver_seance", { prestation: "Coaching perso", date: "lundi", heure: "10:00" })).toMatch(/illisible/);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("passe par createBooking, donc par les mêmes règles que l'écran du client", async () => {
    createBooking.mockResolvedValue({ booking: { id: "b1", starts_at: "2026-03-16T09:00:00.000Z" } });
    const kit = (await loadBookingToolkit("u1"))!;
    const out = await kit.exec("reserver_seance", { prestation: "Coaching perso", date: "2026-03-16", heure: "10:00" });
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking.mock.calls[0][0]).toMatchObject({ tenantId: "t1", clientId: "u1", serviceId: "s1", source: "ai" });
    expect(out).toMatch(/CONFIRMÉ/);
  });

  it("dit que le créneau est seulement TENU quand il reste à payer", async () => {
    createBooking.mockResolvedValue({ booking: { id: "b1", starts_at: "2026-03-16T09:00:00.000Z" }, payUrl: "https://stripe.test/x" });
    const kit = (await loadBookingToolkit("u1"))!;
    const out = await kit.exec("reserver_seance", { prestation: "Coaching perso", date: "2026-03-16", heure: "10:00" });
    expect(out).toMatch(/TENU/);
    expect(out).toMatch(/PAS encore confirmé/);
    // Jamais de lien inventé dans le message rendu au modèle.
    expect(out).not.toContain("https://");
  });

  it("ignore un outil qui n'est pas le sien", async () => {
    const kit = (await loadBookingToolkit("u1"))!;
    expect(await kit.exec("modifier_nutrition", {})).toBeNull();
  });
});
