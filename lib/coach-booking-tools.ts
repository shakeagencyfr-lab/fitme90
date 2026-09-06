import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { clientBookingContext, listCalendars, listServices, readBookingSettings, type BookingCalendar, type BookingService } from "@/lib/booking";
import { cancelBooking, createBooking, listClientBookings, slotsFor } from "@/lib/booking-appointments";
import { awaitingPayment, HOLD_MINUTES } from "@/lib/booking-model";
import { findByName } from "@/lib/booking-rules";
import { dayKey, humanDate, humanTime, instantOf, parseDayKey, shiftDayKey, timeKey } from "@/lib/booking-time";
import { formatEuros } from "@/lib/config";

// ------------------------------------------------------------------ *
// Le Coach IA prend les rendez-vous en présentiel du client, EN DIRECT dans
// le planning du coach : trois outils et un bloc de contexte, fournis à la
// route du chat seulement quand le coach a ouvert la réservation à ce client.
//
// Le modèle ne connaît jamais un créneau sans l'avoir demandé à
// creneaux_disponibles, qui passe par le même moteur que l'écran du client ;
// et reserver_seance passe par createBooking, donc par la même revérification
// et la même contrainte de base. Le Coach IA n'a aucun raccourci.
// ------------------------------------------------------------------ */

export interface BookingToolkit {
  tools: Anthropic.Tool[];
  /** À coller dans le bloc volatile du prompt système. */
  block: string;
  /** Exécute un outil de réservation ; null si le nom n'en est pas un. */
  exec(name: string, input: unknown): Promise<string | null>;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "creneaux_disponibles",
    description:
      "Les créneaux LIBRES dans le planning du coach pour une prestation, jour par jour. À appeler TOUJOURS avant de proposer une heure au client : tu n'inventes jamais un créneau. Renvoie les heures de départ possibles (dans le fuseau du coach) pour les prochains jours, planning par planning.",
    input_schema: {
      type: "object",
      properties: {
        prestation: { type: "string", description: "Nom de la prestation (voir la liste du bloc RENDEZ-VOUS EN PRÉSENTIEL)." },
        planning: { type: "string", description: "Nom du planning (le coach) si le client en veut un précis. Absent = tous." },
        a_partir_du: { type: "string", description: "Premier jour à examiner, au format AAAA-MM-JJ. Absent = aujourd'hui." },
        jours: { type: "integer", description: "Nombre de jours à examiner (1 à 14). Défaut 7." },
      },
      required: ["prestation"],
    },
  },
  {
    name: "reserver_seance",
    description:
      "Réserve un créneau pour le client dans le planning du coach. Le créneau doit venir de creneaux_disponibles. Le résultat dit si le rendez-vous est confirmé, en attente de validation du coach, ou tenu en attendant un paiement : répète-le au client tel quel, avec la date complète, l'heure et la prestation.",
    input_schema: {
      type: "object",
      properties: {
        prestation: { type: "string", description: "Nom de la prestation." },
        planning: { type: "string", description: "Nom du planning (le coach). Absent = le premier planning où le créneau est libre." },
        date: { type: "string", description: "Jour du rendez-vous, AAAA-MM-JJ." },
        heure: { type: "string", description: "Heure de départ, HH:MM, dans le fuseau du coach." },
        note: { type: "string", description: "Un mot du client pour le coach (facultatif)." },
      },
      required: ["prestation", "date", "heure"],
    },
  },
  {
    name: "annuler_rendez_vous",
    description:
      "Annule un rendez-vous à venir du client (voir sa liste dans le bloc RENDEZ-VOUS EN PRÉSENTIEL). Respecte le délai d'annulation du coach : passé ce délai, l'outil refuse et le client doit contacter son coach. Pour DÉPLACER un rendez-vous : annule, puis réserve le nouveau créneau, et dis les deux au client.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Jour du rendez-vous à annuler, AAAA-MM-JJ." },
        heure: { type: "string", description: "Heure HH:MM, si le client a plusieurs rendez-vous ce jour-là." },
      },
      required: ["date"],
    },
  },
];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const validDay = (v: unknown): string | null => (typeof v === "string" && parseDayKey(v) ? v : null);

/** Le coffre à outils de réservation de CE client, ou null s'il n'y a pas accès. */
export async function loadBookingToolkit(userId: string): Promise<BookingToolkit | null> {
  const ctx = await clientBookingContext(userId);
  if (!ctx.enabled || !ctx.tenantId) return null;
  const tenantId = ctx.tenantId;
  const tz = ctx.timezone;
  const now = new Date();
  const [services, calendars, settings, mine] = await Promise.all([
    listServices(tenantId, true),
    listCalendars(tenantId, true),
    readBookingSettings(tenantId),
    listClientBookings(userId, now),
  ]);
  const cals = calendars.filter((c) => c.hours.length > 0);
  if (!services.length || !cals.length) return null;

  const when = (iso: string) => `${humanDate(new Date(iso), tz, "fr")} à ${humanTime(new Date(iso), tz, "fr")}`;
  const price = (s: BookingService) => (s.price_cents != null ? formatEuros(s.price_cents) : "inclus");
  const status = (b: (typeof mine.upcoming)[number]) => (awaitingPayment(b) ? "EN ATTENTE DE PAIEMENT" : b.status === "pending" ? "en attente de validation du coach" : "confirmé");

  const block = `RENDEZ-VOUS EN PRÉSENTIEL (la réservation est ouverte à ce client : tu as la main sur le planning du coach, via les outils creneaux_disponibles, reserver_seance et annuler_rendez_vous) :
- Prestations : ${services.map((s) => `« ${s.name} » (${s.duration_min} min, ${price(s)})`).join(" ; ")}.
- Plannings : ${cals.map((c) => c.name).join(", ")}.${cals.length > 1 ? " Plusieurs coachs : demande avec qui, ou propose les créneaux tous plannings confondus." : ""}
- Règles du coach : réservation au plus tôt ${settings.minNoticeHours} h à l'avance, au plus tard ${settings.maxAdvanceDays} jours à l'avance ; annulation libre jusqu'à ${settings.cancelLimitHours} h avant${settings.payment === "required" ? ` ; paiement en ligne à la réservation pour les prestations payantes (le créneau est tenu ${HOLD_MINUTES} minutes, le client règle depuis son onglet Réservation)` : ""}${settings.confirmation === "manual" ? " ; chaque demande est validée par le coach avant d'être confirmée" : ""}.
- Rendez-vous à venir du client : ${mine.upcoming.length ? mine.upcoming.map((b) => `${when(b.starts_at)}, « ${b.service_name} » (${status(b)})`).join(" ; ") : "aucun"}.
- Fuseau du coach : ${tz}. Aujourd'hui : ${dayKey(now, tz)}.`;

  async function creneaux(input: { prestation?: unknown; planning?: unknown; a_partir_du?: unknown; jours?: unknown }): Promise<string> {
    const service = findByName(services, input.prestation);
    if (!service) return `Prestation inconnue. Choisis parmi : ${services.map((s) => `« ${s.name} »`).join(", ")}.`;
    let cal: BookingCalendar | null = null;
    if (str(input.planning)) {
      cal = findByName(cals, input.planning);
      if (!cal) return `Planning inconnu. Les plannings sont : ${cals.map((c) => c.name).join(", ")}.`;
    }
    const fromDay = validDay(input.a_partir_du) ?? dayKey(new Date(), tz);
    const days = Math.max(1, Math.min(14, Math.trunc(Number(input.jours)) || 7));
    const res = await slotsFor({ tenantId, serviceId: service.id, calendarId: cal?.id ?? null, fromDay, days });
    if ("error" in res) return `Impossible : ${res.error}`;
    const lines: string[] = [];
    for (const c of res.calendars) {
      if (!c.days.length) continue;
      lines.push(`Planning ${c.name} :`);
      for (const d of c.days) lines.push(`- ${humanDate(new Date(`${d.day}T12:00:00Z`), "UTC", "fr")} (${d.day}) : ${d.slots.map((s) => humanTime(new Date(s), tz, "fr")).join(", ")}`);
    }
    if (!lines.length) {
      return `Aucun créneau libre pour « ${service.name} » du ${fromDay} sur ${days} jours. Propose au client la période suivante (a_partir_du = ${shiftDayKey(fromDay, days)}), ou un autre planning.`;
    }
    return `Créneaux libres pour « ${service.name} » (${service.duration_min} min), heures de départ dans le fuseau ${tz} :\n${lines.join("\n")}\nPropose-en deux ou trois au client, puis réserve celui qu'il choisit avec reserver_seance.`;
  }

  async function reserver(input: { prestation?: unknown; planning?: unknown; date?: unknown; heure?: unknown; note?: unknown }): Promise<string> {
    const service = findByName(services, input.prestation);
    if (!service) return `Prestation inconnue. Choisis parmi : ${services.map((s) => `« ${s.name} »`).join(", ")}.`;
    const day = validDay(input.date);
    const start = day ? instantOf(day, str(input.heure), tz) : null;
    if (!start) return "Date ou heure illisible : il faut AAAA-MM-JJ et HH:MM.";
    let candidates = cals;
    if (str(input.planning)) {
      const cal = findByName(cals, input.planning);
      if (!cal) return `Planning inconnu. Les plannings sont : ${cals.map((c) => c.name).join(", ")}.`;
      candidates = [cal];
    }
    let lastError = "créneau indisponible";
    for (const cal of candidates) {
      const res = await createBooking({ tenantId, clientId: userId, calendarId: cal.id, serviceId: service.id, start, source: "ai", note: str(input.note) });
      if (res.booking) {
        revalidatePath("/app/reservation");
        const quand = when(res.booking.starts_at);
        const avec = cals.length > 1 ? ` avec ${cal.name}` : "";
        if (res.payUrl) {
          return `Créneau TENU ${HOLD_MINUTES} minutes pour « ${service.name} » ${quand}${avec}. Il n'est PAS encore confirmé : le client doit payer ${price(service)} depuis son onglet Réservation (bouton « Payer maintenant ») avant la fin de ce délai. Dis-le-lui clairement, sans inventer de lien.`;
        }
        if (res.awaitingCoach) {
          return `Demande ENREGISTRÉE : « ${service.name} » ${quand}${avec}, en attente de validation par le coach. Le client sera prévenu quand c'est confirmé. Dis-le-lui avec la date complète.`;
        }
        return `Rendez-vous CONFIRMÉ : « ${service.name} » ${quand}${avec}. Dis-le au client avec la date complète et l'heure ; il recevra un rappel la veille.`;
      }
      lastError = res.error ?? lastError;
    }
    return `Impossible de réserver : ${lastError} Relance creneaux_disponibles et propose un autre créneau.`;
  }

  async function annuler(input: { date?: unknown; heure?: unknown }): Promise<string> {
    const day = validDay(input.date);
    if (!day) return "Date illisible : il faut AAAA-MM-JJ.";
    const heure = str(input.heure);
    const fresh = await listClientBookings(userId, new Date());
    const onDay = fresh.upcoming.filter((b) => dayKey(new Date(b.starts_at), tz) === day && (!heure || timeKey(new Date(b.starts_at), tz) === heure.padStart(5, "0")));
    if (!onDay.length) return `Aucun rendez-vous à venir le ${day}${heure ? ` à ${heure}` : ""}. Les rendez-vous du client : ${fresh.upcoming.length ? fresh.upcoming.map((b) => `${when(b.starts_at)} (${b.service_name})`).join(" ; ") : "aucun"}.`;
    if (onDay.length > 1) return `Plusieurs rendez-vous le ${day} : ${onDay.map((b) => `${humanTime(new Date(b.starts_at), tz, "fr")} (${b.service_name})`).join(", ")}. Précise l'heure.`;
    const b = onDay[0];
    const res = await cancelBooking({ bookingId: b.id, by: "client", clientId: userId });
    if (res.error) return `Impossible d'annuler : ${res.error}`;
    revalidatePath("/app/reservation");
    return `Rendez-vous ANNULÉ : « ${b.service_name} » ${when(b.starts_at)}. Le coach est prévenu. Dis-le au client.`;
  }

  return {
    tools: TOOLS,
    block,
    async exec(name, input) {
      const i = (input ?? {}) as Record<string, unknown>;
      if (name === "creneaux_disponibles") return creneaux(i);
      if (name === "reserver_seance") return reserver(i);
      if (name === "annuler_rendez_vous") return annuler(i);
      return null;
    },
  };
}
