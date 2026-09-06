import { describe, it, expect } from "vitest";
import { agendaView, bookingFigures, isLive } from "./booking-summary";
import type { Booking, BookingStatus } from "./booking-model";

const TZ = "Europe/Paris";
// Un mardi, 15 h à Paris : la journée est déjà bien entamée.
const NOW = new Date("2026-03-10T14:00:00Z");

type Rdv = Pick<Booking, "status" | "starts_at" | "paid" | "hold_until" | "price_cents"> & { id: string };

const rdv = (id: string, iso: string, status: BookingStatus = "confirmed", over: Partial<Rdv> = {}): Rdv => ({
  id,
  starts_at: iso,
  status,
  paid: false,
  hold_until: null,
  price_cents: null,
  ...over,
});

describe("isLive", () => {
  it("ne garde que ce qui occupe vraiment une place", () => {
    expect(isLive({ status: "confirmed" })).toBe(true);
    expect(isLive({ status: "pending" })).toBe(true);
    expect(isLive({ status: "cancelled" })).toBe(false);
    expect(isLive({ status: "done" })).toBe(false);
    expect(isLive({ status: "no_show" })).toBe(false);
  });
});

describe("agendaView", () => {
  const list: Rdv[] = [
    rdv("matin", "2026-03-10T08:00:00Z"),
    rdv("apresmidi", "2026-03-10T16:00:00Z"),
    rdv("demain", "2026-03-11T09:00:00Z", "pending"),
    rdv("demain2", "2026-03-11T11:00:00Z"),
    rdv("apres", "2026-03-13T09:00:00Z"),
    rdv("annule", "2026-03-11T15:00:00Z", "cancelled"),
    rdv("hier", "2026-03-09T09:00:00Z"),
  ];

  it("garde la journée entière, y compris ce qui est déjà passé", () => {
    const v = agendaView(list, { now: NOW, timezone: TZ });
    expect(v.today.map((b) => b.id)).toEqual(["matin", "apresmidi"]);
  });

  it("groupe les jours suivants dans l'ordre, sans les jours vides", () => {
    const v = agendaView(list, { now: NOW, timezone: TZ });
    expect(v.next.map((d) => d.key)).toEqual(["2026-03-11", "2026-03-13"]);
    expect(v.next[0].items.map((b) => b.id)).toEqual(["demain", "demain2"]);
  });

  it("écarte les annulations et ce qui est passé", () => {
    const v = agendaView(list, { now: NOW, timezone: TZ });
    const tous = [...v.today, ...v.next.flatMap((d) => d.items)].map((b) => b.id);
    expect(tous).not.toContain("annule");
    expect(tous).not.toContain("hier");
  });

  it("compte ce qui reste à venir, et ce qui attend le coach", () => {
    const v = agendaView(list, { now: NOW, timezone: TZ });
    // apresmidi, demain, demain2, apres : « matin » est déjà passé.
    expect(v.upcoming).toBe(4);
    expect(v.pending).toBe(1);
  });

  it("signale ce qui attend un paiement, parce que ce créneau saute sinon", () => {
    const tenu = rdv("tenu", "2026-03-12T09:00:00Z", "pending", {
      price_cents: 4000,
      paid: false,
      hold_until: "2026-03-10T14:10:00Z",
    });
    expect(agendaView([tenu], { now: NOW, timezone: TZ }).awaitingPayment).toBe(1);
  });

  it("borne le nombre de jours servis", () => {
    const beaucoup = Array.from({ length: 20 }, (_, i) => rdv(`j${i}`, `2026-03-${String(11 + i).padStart(2, "0")}T09:00:00Z`));
    expect(agendaView(beaucoup, { now: NOW, timezone: TZ, days: 3 }).next).toHaveLength(3);
    expect(agendaView(beaucoup, { now: NOW, timezone: TZ }).next).toHaveLength(7);
  });

  it("rend un agenda vide sans rien inventer", () => {
    const v = agendaView([], { now: NOW, timezone: TZ });
    expect(v).toEqual({ today: [], next: [], upcoming: 0, pending: 0, awaitingPayment: 0 });
  });
});

describe("bookingFigures", () => {
  const list: Rdv[] = [
    rdv("a", "2026-03-12T09:00:00Z"),
    rdv("b", "2026-03-13T09:00:00Z", "pending"),
    rdv("c", "2026-03-05T09:00:00Z", "done", { paid: true, price_cents: 5000 }),
    rdv("d", "2026-03-06T09:00:00Z", "done", { paid: true, price_cents: 4000 }),
    rdv("e", "2026-03-07T09:00:00Z", "no_show"),
    rdv("f", "2026-03-08T09:00:00Z", "cancelled"),
  ];

  it("compte ce qui vient, ce qui est fait, et ce qui a été encaissé", () => {
    const f = bookingFigures(list, NOW);
    expect(f.upcoming).toBe(2);
    expect(f.pending).toBe(1);
    expect(f.done).toBe(2);
    expect(f.noShow).toBe(1);
    expect(f.cancelled).toBe(1);
    expect(f.paidCents).toBe(9000);
  });

  it("ne compte comme absence que ce qui est allé au bout", () => {
    // 2 honorées sur 3 séances terminées : l'annulation ne compte pas contre.
    expect(bookingFigures(list, NOW).attendancePct).toBe(67);
    expect(bookingFigures([], NOW).attendancePct).toBeNull();
  });
});
