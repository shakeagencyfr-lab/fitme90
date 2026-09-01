// Logique PURE des blocs évolutifs (aucun accès réseau) : testable, et
// importable côté client pour afficher « Bloc 2 · Construction · Cycle 5 ».
// La mécanique qui touche à la base et au modèle est dans lib/blocks.ts.

import { CYCLES_PER_BLOCK } from "./config";
import { blockLabel, blocksForMonths } from "./templates";

/** Nombre de jours par cycle (miroir de lib/program.ts, sans son server-only). */
export const CYCLE_DAYS = 30;

/** On prépare le bloc suivant une semaine avant la fin du courant. */
export const BLOCK_LEAD_DAYS = 7;

/** Sécurité : nombre max de blocs générés par passage de cron (coût + temps). */
export const BLOCKS_MAX_PER_RUN = 8;

/** Jours de programme couverts par les cycles déjà générés. */
export function coveredDays(plan: { cycles?: unknown[] } | null | undefined): number {
  return (plan?.cycles?.length ?? 0) * CYCLE_DAYS;
}

export interface BlockPosition {
  blockIndex: number;
  totalBlocks: number;
  /** Cycle courant, global (0-based). */
  cycleIndex: number;
  /** « Bloc 2 · Construction » ; « Transformation » pour un produit à 1 bloc. */
  label: string;
}

/** Où en est le client : bloc et cycle du jour donné. Logique pure. */
export function blockPosition(day: number, programDays: number): BlockPosition {
  const cycleIndex = Math.max(0, Math.floor((Math.max(1, day) - 1) / CYCLE_DAYS));
  const blockIndex = Math.floor(cycleIndex / CYCLES_PER_BLOCK);
  const totalBlocks = blocksForMonths(Math.max(1, programDays) / CYCLE_DAYS);
  return { blockIndex, totalBlocks, cycleIndex, label: blockLabel(blockIndex, totalBlocks) };
}

export interface DueInput {
  /** Jour de programme courant (1 = premier jour). */
  day: number;
  /** Jours couverts par les cycles déjà générés. */
  covered: number;
  /** Durée du produit acheté, en jours. */
  programDays: number;
  /** Abonnement mensuel en règle : le programme continue au-delà de sa durée. */
  subscribed: boolean;
  /** Avance de préparation, en jours (défaut : une semaine). */
  lead?: number;
}

/**
 * Le bloc suivant doit-il être construit ? Oui si le client est en cours, s'il
 * reste des jours à couvrir (durée du produit, ou abonnement actif) et si la
 * fin des cycles générés approche. Logique pure, testée.
 */
export function nextBlockDue({ day, covered, programDays, subscribed, lead = BLOCK_LEAD_DAYS }: DueInput): boolean {
  if (day < 1 || covered <= 0) return false;
  const moreToCover = subscribed || covered < programDays;
  if (!moreToCover) return false;
  return day > covered - lead;
}

/**
 * Note de progression du bloc qui s'achève, à partir des vraies données :
 * séances validées sur la fenêtre du bloc, assiduité, évolution du poids.
 * C'est ce qui rend le bloc suivant réellement construit sur le vécu.
 */
export function blockProgressNote(input: {
  blockIndex: number;
  doneInBlock: number;
  trainDaysPerWeek: number;
  firstKg: number | null;
  lastKg: number | null;
}): string {
  const weeks = CYCLES_PER_BLOCK * 4;
  const expected = Math.max(1, input.trainDaysPerWeek || 3) * weeks;
  const pct = Math.min(100, Math.round((input.doneInBlock / expected) * 100));
  const assiduite = pct >= 80 ? "très bonne" : pct >= 50 ? "correcte" : "faible";
  let weight = "";
  if (input.firstKg != null && input.lastKg != null && input.firstKg !== input.lastKg) {
    const delta = +(input.lastKg - input.firstKg).toFixed(1);
    weight = ` Poids passé de ${input.firstKg} à ${input.lastKg} kg (${delta > 0 ? "+" : ""}${delta} kg) sur le bloc.`;
  } else if (input.lastKg != null) {
    weight = ` Poids actuel ${input.lastKg} kg.`;
  }
  const guidance =
    pct >= 80
      ? "Assiduité solide : augmente le volume, la charge visée et la complexité, introduis des variantes plus exigeantes."
      : pct >= 50
        ? "Assiduité moyenne : garde des séances tenables, progresse surtout par la charge et la qualité, pas par la durée."
        : "Assiduité faible : simplifie, raccourcis les séances, redonne des victoires rapides et remotive.";
  return `Bloc ${input.blockIndex + 1} terminé : ${input.doneInBlock} séance(s) validée(s) sur ~${expected} prévues, assiduité ${assiduite} (${pct} %).${weight} ${guidance} Recalibre aussi la nutrition sur le poids actuel.`;
}

