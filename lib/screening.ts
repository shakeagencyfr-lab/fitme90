// ------------------------------------------------------------------ *
// FitMe90 — EXCLUSION MÉDICALE (garde-fou juridique central)
//
// Un coach professionnel diplômé d'État accompagne un public EN BONNE SANTÉ vers un objectif de
// forme. Dès qu'une pathologie, une grossesse ou un traitement médical est
// déclaré, générer un programme personnalisé bascule vers l'acte médical
// (exercice illégal de la médecine). Cette fonction met alors le compte en
// « attente médicale » : aucune génération, renvoi vers un professionnel de
// santé (médecin ou diététicien).
//
// Fonction PURE et testée. Les seuils sont volontairement explicites et
// ajustables — à faire valider par un juriste (voir DEPLOY.md / CGV).
// ------------------------------------------------------------------ */

export interface QuizHealthAnswers {
  /** Pathologies articulaires (clé patho1). */
  patho1?: string[];
  /** Pathologies générales (clé patho2). */
  patho2?: string[];
  /** Traitements en cours, texte libre (clé meds). */
  meds?: string;
  /** Grossesse ou post-partum (clé pregnancy). */
  pregnancy?: string;
}

export interface ScreeningResult {
  /** true → génération bloquée, renvoi vers un professionnel de santé. */
  hold: boolean;
  /** Raisons lisibles, en français, pour l'écran d'exclusion. */
  reasons: string[];
}

// Pathologies générales : toute valeur cochée hors « Aucune » déclenche
// l'attente médicale (diabète, hypertension, asthme, thyroïde…).
const GENERAL_NONE = "Aucune";

// Pathologies articulaires nécessitant un avis médical (diagnostic établi).
// Les autres (gêne d'épaule, de genou…) relèvent de l'adaptation d'exercices,
// dans le périmètre du coach — elles ne bloquent pas.
const ARTICULAR_HOLD = new Set(["Hernie discale"]);

// États de grossesse / post-partum récent nécessitant un avis médical.
const PREGNANCY_HOLD = new Set(["Enceinte", "Post-partum < 6 mois"]);

function clean(arr?: string[]): string[] {
  return (Array.isArray(arr) ? arr : []).map((s) => s.trim()).filter(Boolean);
}

/** Le champ « traitements » indique-t-il un traitement réel ? */
function hasMeaningfulMeds(meds?: string): boolean {
  const v = (meds ?? "").trim().toLowerCase();
  if (!v) return false;
  // Réponses négatives explicites : pas de traitement.
  return !["non", "aucun", "aucune", "rien", "ras", "n/a", "na", "-"].includes(v);
}

export function screen(answers: QuizHealthAnswers): ScreeningResult {
  const reasons: string[] = [];

  const patho2 = clean(answers.patho2).filter((p) => p !== GENERAL_NONE);
  if (patho2.length > 0) {
    reasons.push(
      `Pathologie générale déclarée (${patho2.join(", ")}) : un avis médical est requis avant tout programme.`,
    );
  }

  const patho1 = clean(answers.patho1).filter((p) => ARTICULAR_HOLD.has(p));
  if (patho1.length > 0) {
    reasons.push(
      `Pathologie nécessitant un suivi médical (${patho1.join(", ")}) : rapproche-toi de ton médecin ou kiné.`,
    );
  }

  const pregnancy = (answers.pregnancy ?? "").trim();
  if (PREGNANCY_HOLD.has(pregnancy)) {
    reasons.push(
      `Grossesse ou post-partum récent (${pregnancy}) : l'accompagnement doit être validé par un professionnel de santé.`,
    );
  }

  if (hasMeaningfulMeds(answers.meds)) {
    reasons.push(
      "Un traitement médical en cours est déclaré : demande l'accord de ton médecin avant de démarrer.",
    );
  }

  return { hold: reasons.length > 0, reasons };
}
