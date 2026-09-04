// Fenêtres d'envoi réellement servies par le dispatcher.
//
// Le plan Hobby de Vercel n'accepte que des crons quotidiens (voir
// lib/cron-schedule.test.ts). La file des notifications programmées est donc
// vidée par CHACUN des quatre crons, et par eux seuls. Proposer un champ
// d'heure libre laissait choisir 21 h 15 pour un envoi qui partirait en réalité
// à 4 h 30 du matin : le formulaire mentait.
//
// Ce module est la source unique de vérité, partagée par le formulaire et par
// le test qui vérifie qu'elle correspond bien à vercel.json.
//
// MODE PRÉCIS. Quand `pg_cron` appelle /api/cron/dispatch toutes les cinq
// minutes depuis Supabase (voir supabase/pg-cron-notifications.sql), la
// contrainte des quatre créneaux tombe : n'importe quelle heure part à cinq
// minutes près. On l'active alors par NEXT_PUBLIC_PUSH_PRECISE=1. Le drapeau
// est explicite plutôt que déduit : le formulaire ne doit jamais promettre une
// heure que l'infrastructure en place ne sait pas tenir.

export interface PushWindow {
  /** Heure UTC du cron. */
  hour: number;
  /** Minute UTC du cron. */
  minute: number;
  /** À quoi sert ce cron par ailleurs (affiché pour situer le créneau). */
  role: string;
}

export const PUSH_WINDOWS: readonly PushWindow[] = [
  { hour: 2, minute: 30, role: "Nuit" },
  { hour: 6, minute: 0, role: "Petit matin" },
  { hour: 7, minute: 0, role: "Matin" },
  { hour: 18, minute: 0, role: "Soir" },
] as const;

/** Instant exact d'un créneau, pour une date donnée (AAAA-MM-JJ). */
export function windowInstant(dateISO: string, w: PushWindow): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  const [, y, mo, d] = m;
  // Date.UTC : l'heure du cron est en UTC, pas dans le fuseau du navigateur.
  // Construire la date localement décalerait l'envoi d'une à deux heures selon
  // la saison, ce qui est exactement le bug qu'on corrige.
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), w.hour, w.minute, 0, 0);
  return Number.isNaN(t) ? null : new Date(t);
}

/**
 * Prochain créneau disponible à partir de `from`. Renvoie null si aucun ne
 * tombe dans les `days` prochains jours (ne devrait pas arriver : il y en a
 * quatre par jour).
 */
export function nextWindow(from: Date, days = 3): { date: string; window: PushWindow } | null {
  for (let i = 0; i < days; i++) {
    const day = new Date(from.getTime() + i * 86400000);
    const dateISO = day.toISOString().slice(0, 10);
    for (const w of PUSH_WINDOWS) {
      const at = windowInstant(dateISO, w);
      if (at && at.getTime() > from.getTime()) return { date: dateISO, window: w };
    }
  }
  return null;
}

/** Pas de la grille horaire en mode précis, en minutes. */
export const PRECISE_STEP_MIN = 15;

/**
 * L'ordonnanceur à la minute est-il en place ?
 *
 * Lu des deux côtés (formulaire et garde serveur) pour qu'ils ne puissent pas
 * diverger : un formulaire plus permissif que la garde renverrait une erreur
 * après coup, une garde plus permissive laisserait passer des heures jamais
 * servies.
 */
export function preciseScheduling(): boolean {
  return process.env.NEXT_PUBLIC_PUSH_PRECISE === "1";
}

/** L'instant tombe-t-il sur un créneau réellement servi ? */
export function isServedInstant(at: Date): boolean {
  if (preciseScheduling()) {
    // Une grille au quart d'heure : assez fine pour que personne ne la sente,
    // assez grossière pour rester lisible et pour absorber le pas du cron.
    return at.getUTCSeconds() === 0 && at.getUTCMinutes() % PRECISE_STEP_MIN === 0;
  }
  return PUSH_WINDOWS.some((w) => at.getUTCHours() === w.hour && at.getUTCMinutes() === w.minute);
}
