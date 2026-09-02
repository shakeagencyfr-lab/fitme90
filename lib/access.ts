// Cycle de vie de l'accès My Fitness App — logique PURE, sans dépendance réseau,
// donc testable et réutilisable côté serveur (contrôle d'accès) comme
// côté client (affichage). Le contrôle réel se fait TOUJOURS côté serveur :
// ces fonctions ne servent qu'à décider, pas à protéger un bouton.
//
// Règles produit :
//   - Jours 1 → 90   : programme ACTIF (coach IA activé, séances loggables).
//   - Jours 91 → 120 : GRÂCE — plan consultable en LECTURE SEULE, coach coupé.
//   - Jour 121+      : accès TERMINÉ (verrouillé).

import { PROGRAM_DAYS, GRACE_DAYS } from "./config";
import { makeT, type Locale } from "./i18n";

export type AccessPhase = "not_paid" | "not_started" | "scheduled" | "active" | "grace" | "ended" | "restricted";

export interface AccessState {
  phase: AccessPhase;
  /** Numéro de jour du programme (1 = jour de génération). 0 si non démarré. */
  day: number;
  /**
   * Accès restreint suite à un défaut de paiement d'abonnement : le contenu
   * déjà généré reste consultable, mais l'IA et le journal sont coupés.
   */
  restricted?: boolean;
  /** Durée totale du programme actif, en jours (dépend de l'offre choisie). */
  programDays: number;
  /** Le coach IA répond-il ? (payé && programme actif) */
  coachEnabled: boolean;
  /** Le plan est-il consultable ? (payé && avant fin de grâce) */
  planViewable: boolean;
  /** Peut-on encore valider des séances / écrire ? (payé && programme actif) */
  canLog: boolean;
  /** Jours restants avant la fin du programme actif (coach). 0 si terminé. */
  daysUntilProgramEnd: number;
  /** Jours restants avant le verrouillage total. 0 si terminé. */
  daysUntilAccessEnd: number;
}

/**
 * Nombre de jours calendaires écoulés depuis `start` jusqu'à `now`, en
 * comptant le jour de départ comme jour 1. On raisonne en dates UTC (minuit)
 * pour éviter les décalages d'heure locale et d'heure d'été.
 */
export function programDay(start: Date, now: Date = new Date()): number {
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((nowUTC - startUTC) / 86_400_000);
  return diffDays + 1;
}

/**
 * Calcule l'état d'accès complet à partir de l'état minimal du profil.
 * @param paid       profiles.paid — le webhook Stripe l'écrit, jamais le client.
 * @param startDate  profiles.start_date — posée à la génération du programme.
 */
export function computeAccess(
  paid: boolean,
  startDate: string | Date | null,
  now: Date = new Date(),
  programDays: number = PROGRAM_DAYS,
): AccessState {
  // Durée totale d'accès = programme actif + fenêtre de grâce (lecture seule).
  const accessDays = programDays + GRACE_DAYS;
  const base: AccessState = {
    phase: "not_paid",
    day: 0,
    programDays,
    coachEnabled: false,
    planViewable: false,
    canLog: false,
    daysUntilProgramEnd: 0,
    daysUntilAccessEnd: 0,
  };

  if (!paid) return base;
  if (!startDate) return { ...base, phase: "not_started" };

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  if (Number.isNaN(start.getTime())) return { ...base, phase: "not_started" };

  const day = programDay(start, now);

  // Début choisi dans le futur : programme planifié mais pas encore commencé.
  // Le plan est consultable, mais coach et journal restent fermés jusqu'au J1.
  if (day < 1) {
    return {
      ...base,
      phase: "scheduled",
      day,
      planViewable: true,
      daysUntilProgramEnd: programDays,
      daysUntilAccessEnd: accessDays,
    };
  }

  if (day <= programDays) {
    return {
      phase: "active",
      day,
      programDays,
      coachEnabled: true,
      planViewable: true,
      canLog: true,
      daysUntilProgramEnd: programDays - day + 1,
      daysUntilAccessEnd: accessDays - day + 1,
    };
  }

  if (day <= accessDays) {
    return {
      phase: "grace",
      day,
      programDays,
      coachEnabled: false,
      planViewable: true,
      canLog: false,
      daysUntilProgramEnd: 0,
      daysUntilAccessEnd: accessDays - day + 1,
    };
  }

  return {
    phase: "ended",
    day,
    programDays,
    coachEnabled: false,
    planViewable: false,
    canLog: false,
    daysUntilProgramEnd: 0,
    daysUntilAccessEnd: 0,
  };
}

/** Message court d'état, en français, pour l'interface. */
export function accessLabel(a: AccessState, locale: Locale = "fr"): string {
  const t = makeT(locale);
  switch (a.phase) {
    case "not_paid":
      return t("access.notPaid");
    case "not_started":
      return t("access.notStarted");
    case "scheduled":
      return t("access.scheduled", { days: 1 - a.day });
    case "active":
      return t("access.active", { day: a.day, total: a.programDays });
    case "grace":
      return t("access.grace", { days: a.daysUntilAccessEnd });
    case "ended":
      return t("access.ended");
    case "restricted":
      return t("access.restricted");
  }
}

/**
 * Prochaine étape d'un client qui n'a pas encore payé. Un questionnaire déjà
 * rempli ne se refait pas : la suite est la caisse. Sans cette distinction, le
 * tableau de bord renvoyait toujours au questionnaire et l'écran de paiement
 * devenait inatteignable dès qu'on en sortait.
 */
export function unpaidNextStep(hasQuestionnaire: boolean): "/app/paiement" | "/questionnaire" {
  return hasQuestionnaire ? "/app/paiement" : "/questionnaire";
}
