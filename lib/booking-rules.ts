/**
 * Les règles du pack RÉSERVATION, sans base ni Stripe : ce qui se décide à
 * partir de faits déjà lus. Testable à sec, et c'est le point : le pack se
 * monétise, une faille ici se vend gratuitement.
 *
 * Même mécanique que la marque blanche (lib/whitelabel-rules.ts), à dessein :
 * le revendeur connaît déjà les deux portes, « inclus dans le palier » ou
 * « vendu à part », et retrouve les mêmes mots.
 */

export type BookingSource =
  /** Plateforme, revendeur, ou coach sans revendeur : rien à débloquer. */
  | "own"
  /** Le palier courant (gratuit ou payant) inclut le pack. */
  | "plan"
  /** Le coach a souscrit le pack à part, chez son revendeur. */
  | "addon"
  /** Le revendeur vend le pack à part, le coach ne l'a pas pris. */
  | "offered"
  /** Le revendeur ne propose pas le pack à ce compte. */
  | "closed";

export interface BookingAccess {
  allowed: boolean;
  source: BookingSource;
  /** Prix mensuel du pack chez le revendeur (centimes), ou null. */
  priceCents: number | null;
  subStatus: string | null;
}

export interface BookingFacts {
  kind: string | null;
  parentId: string | null;
  /** Abonnement au pack ouvert (et relu par le cron). */
  addonEnabled: boolean;
  /** Le palier courant inclut le pack. */
  planIncluded: boolean;
  /** Prix auquel le revendeur vend le pack à part, ou null. */
  priceCents: number | null;
  subStatus: string | null;
}

/** La décision, dans l'ordre des portes : le pack payé avant le palier. */
export function resolveBookingAccess(f: BookingFacts): BookingAccess {
  const base = { subStatus: f.subStatus };
  if (f.kind === "platform" || f.kind === "reseller" || !f.parentId) {
    return { allowed: true, source: "own", priceCents: null, ...base };
  }
  if (f.addonEnabled) return { allowed: true, source: "addon", priceCents: null, ...base };
  if (f.planIncluded) return { allowed: true, source: "plan", priceCents: null, ...base };
  const price = f.priceCents != null && f.priceCents > 0 ? f.priceCents : null;
  return { allowed: false, source: price != null ? "offered" : "closed", priceCents: price, ...base };
}

// ────────────────────────────────────────────────── réglages d'un espace

export type BookingPayment = "none" | "required";
export type BookingConfirmation = "auto" | "manual";

/** Les règles de prise de rendez-vous d'un coach ou d'une salle. */
export interface BookingSettings {
  /** Pas des créneaux proposés, en minutes (15, 30, 60). */
  slotStepMin: number;
  /** Délai minimal avant un rendez-vous, en heures (on ne réserve pas pour dans dix minutes). */
  minNoticeHours: number;
  /** Jusqu'à combien de jours à l'avance on peut réserver. */
  maxAdvanceDays: number;
  /** Jusqu'à combien d'heures avant, le client peut annuler seul. */
  cancelLimitHours: number;
  /** Battement entre deux rendez-vous, en minutes. */
  bufferMin: number;
  /** Paiement en ligne exigé à la réservation, ou rien (réglé sur place). */
  payment: BookingPayment;
  /** Le rendez-vous est confirmé tout de suite, ou après validation du coach. */
  confirmation: BookingConfirmation;
  /** Adresse du lieu, rappelée dans les confirmations. */
  address: string;
  /** Consignes libres (tenue, parking, code d'entrée...). */
  instructions: string;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  slotStepMin: 30,
  minNoticeHours: 12,
  maxAdvanceDays: 30,
  cancelLimitHours: 24,
  bufferMin: 0,
  payment: "none",
  confirmation: "auto",
  address: "",
  instructions: "",
};

const int = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
};

/** Borne des réglages venus d'un formulaire ; une valeur absurde retombe sur le défaut. */
export function sanitizeBookingSettings(input: Partial<Record<keyof BookingSettings, unknown>>): BookingSettings {
  const d = DEFAULT_BOOKING_SETTINGS;
  const step = int(input.slotStepMin, d.slotStepMin, 5, 120);
  return {
    slotStepMin: [15, 20, 30, 45, 60].includes(step) ? step : step < 15 ? 15 : step > 60 ? 60 : 30,
    minNoticeHours: int(input.minNoticeHours, d.minNoticeHours, 0, 168),
    maxAdvanceDays: int(input.maxAdvanceDays, d.maxAdvanceDays, 1, 365),
    cancelLimitHours: int(input.cancelLimitHours, d.cancelLimitHours, 0, 168),
    bufferMin: int(input.bufferMin, d.bufferMin, 0, 120),
    payment: input.payment === "required" ? "required" : "none",
    confirmation: input.confirmation === "manual" ? "manual" : "auto",
    address: typeof input.address === "string" ? input.address.trim().slice(0, 200) : "",
    instructions: typeof input.instructions === "string" ? input.instructions.trim().slice(0, 600) : "",
  };
}

// ────────────────────────────────────────────────── horaires d'un planning

/** Une plage d'ouverture : jour de semaine (0 = lundi ... 6 = dimanche), minutes depuis minuit. */
export interface HoursRange {
  weekday: number;
  startMin: number;
  endMin: number;
}

/** « 09:00 » → 540. null si illisible. */
export function parseHm(s: string): number | null {
  const m = /^(\d{1,2})[:h](\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 24 || mi < 0 || mi > 59) return null;
  const v = h * 60 + mi;
  return v > 24 * 60 ? null : v;
}

/** 540 → « 09:00 ». */
export function formatHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Nettoie une semaine d'horaires : plages valides, bornées, sans
 * chevauchement dans une même journée (deux plages qui se touchent sont
 * fusionnées). L'ordre de sortie est stable : jour, puis heure.
 */
export function normalizeHours(ranges: readonly HoursRange[]): HoursRange[] {
  const byDay = new Map<number, HoursRange[]>();
  for (const r of ranges) {
    const wd = Math.trunc(Number(r.weekday));
    const s = Math.trunc(Number(r.startMin));
    const e = Math.trunc(Number(r.endMin));
    if (!(wd >= 0 && wd <= 6)) continue;
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e > 24 * 60 || e <= s) continue;
    const list = byDay.get(wd) ?? [];
    list.push({ weekday: wd, startMin: s, endMin: e });
    byDay.set(wd, list);
  }
  const out: HoursRange[] = [];
  for (const wd of [...byDay.keys()].sort((a, b) => a - b)) {
    const sorted = byDay.get(wd)!.sort((a, b) => a.startMin - b.startMin);
    let cur = { ...sorted[0] };
    for (const r of sorted.slice(1)) {
      if (r.startMin <= cur.endMin) cur.endMin = Math.max(cur.endMin, r.endMin);
      else {
        out.push(cur);
        cur = { ...r };
      }
    }
    out.push(cur);
  }
  return out;
}

/** Horaires de départ d'un nouveau planning : semaine de bureau, 9 h à 19 h. */
export const DEFAULT_HOURS: HoursRange[] = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 19 * 60 }));

// ────────────────────────────────────────────────── prestations

export interface ServiceInput {
  name: unknown;
  description?: unknown;
  durationMin: unknown;
  priceCents?: unknown;
}

export interface CleanService {
  name: string;
  description: string;
  durationMin: number;
  priceCents: number | null;
}

/** Borne une prestation venue d'un formulaire ; null si le nom ou la durée manquent. */
export function sanitizeService(input: ServiceInput): CleanService | null {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  if (!name) return null;
  const rawDur = typeof input.durationMin === "number" ? input.durationMin : parseInt(String(input.durationMin ?? ""), 10);
  if (!Number.isFinite(rawDur) || rawDur < 10) return null;
  const durationMin = Math.min(240, Math.trunc(rawDur));
  let priceCents: number | null = null;
  if (input.priceCents !== undefined && input.priceCents !== null && String(input.priceCents).trim() !== "") {
    const n = Math.round(Number(String(input.priceCents).replace(",", ".")));
    if (!Number.isFinite(n) || n < 0) return null;
    priceCents = n > 0 ? n : null;
  }
  return {
    name,
    description: typeof input.description === "string" ? input.description.trim().slice(0, 300) : "",
    durationMin,
    priceCents,
  };
}

/** Un client peut-il encore annuler seul ce rendez-vous ? */
export function clientCanCancel(startsAt: Date, cancelLimitHours: number, now = new Date()): boolean {
  return startsAt.getTime() - now.getTime() >= cancelLimitHours * 3600000;
}

/** Couleurs proposées pour distinguer les plannings d'une salle. */
export const CALENDAR_COLORS = ["#E0551F", "#2F6B3C", "#2B5BA8", "#8B4A9C", "#B8860B", "#C0392B", "#16808A", "#6B6B6B"] as const;

export function asCalendarColor(v: unknown): string {
  return typeof v === "string" && (CALENDAR_COLORS as readonly string[]).includes(v) ? v : CALENDAR_COLORS[0];
}
