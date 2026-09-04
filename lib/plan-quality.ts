import type { Plan, Session, PlanExercise } from "@/lib/program";

/**
 * Mesures objectives sur un plan généré.
 *
 * Comparer deux réglages de génération à l'oeil ne donne rien : les deux plans
 * « ont l'air bien ». Ce qui se dégrade quand on baisse l'effort ou qu'on
 * change de modèle n'est pas le style, ce sont des propriétés vérifiables, et
 * ce sont exactement celles que le produit promet :
 *
 *   la périodisation      les séances changent-elles d'un cycle au suivant ?
 *   la variété            les jours d'une même semaine sont-ils distincts ?
 *   la conformité         le bon nombre de cycles et de séances ?
 *   la cohérence          les macros correspondent-elles aux calories ?
 *   la densité            assez d'exercices, un échauffement, des consignes ?
 *
 * Ce module est PUR : il ne juge pas de la pertinence sportive d'un exercice,
 * il constate ce qui est là. C'est volontaire. Un chiffre discutable mais
 * reproductible vaut mieux qu'un avis qui change à chaque lecture.
 */

export interface PlanMetrics {
  /** Cycles présents dans le plan. */
  cycles: number;
  /** Séances par cycle, dans l'ordre. */
  sessionsPerCycle: number[];
  /** Exercices par séance, en moyenne. */
  avgExercises: number;
  /**
   * Part des séances d'un même cycle réellement distinctes les unes des
   * autres. 1 = aucun jour ne répète un autre jour.
   */
  dayVariety: number;
  /**
   * Part des exercices repris d'un cycle au suivant dont les séries, les
   * répétitions ou le repos ont changé. C'est LA mesure de périodisation :
   * un plan qui recopie ses cycles tombe à 0.
   */
  progression: number;
  /** Part des séances qui portent un échauffement. */
  warmupRate: number;
  /** Part des exercices qui portent une consigne technique. */
  noteRate: number;
  /**
   * Écart entre les calories annoncées et celles que donnent les macros
   * (4/4/9). 0,05 = 5 % d'écart. null si la nutrition est absente.
   */
  macroDrift: number | null;
}

/** Conformité au brief : ce que le produit a promis au client. */
export interface PlanConformity {
  cyclesOk: boolean;
  sessionsOk: boolean;
}

const num = (v: string | number | null | undefined): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Nom normalisé d'un exercice, pour comparer deux séances. */
function key(ex: PlanExercise): string {
  return ex.name
    .toLowerCase()
    .normalize("NFD")
    // Marques combinantes laissées par NFD, en échappements : en littéral
    // elles sont invisibles dans le fichier et se perdent au copier-coller.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Deux séances comptent comme identiques quand leurs exercices se recouvrent
 * presque entièrement. Le seuil n'est pas 100 % : un jour qui reprend tout
 * sauf un exercice n'est pas un jour distinct, c'est le même avec une
 * variante.
 */
const RECOUVREMENT_IDENTIQUE = 0.8;

function overlap(a: Session, b: Session): number {
  const sa = new Set(a.exercises.map(key));
  const sb = new Set(b.exercises.map(key));
  if (sa.size === 0 || sb.size === 0) return 0;
  let commun = 0;
  for (const k of sa) if (sb.has(k)) commun += 1;
  return commun / Math.min(sa.size, sb.size);
}

function sessionsOf(plan: Plan, i: number): Session[] {
  return plan.cycles?.[i]?.sessions ?? [];
}

export function planMetrics(plan: Plan): PlanMetrics {
  const cycles = plan.cycles ?? [];
  const sessionsPerCycle = cycles.map((_, i) => sessionsOf(plan, i).length);
  const toutes = cycles.flatMap((_, i) => sessionsOf(plan, i));
  const exos = toutes.flatMap((s) => s.exercises);

  // Variété : sur chaque cycle, combien de séances ne recouvrent aucune autre.
  let distinctes = 0;
  let comptees = 0;
  for (let i = 0; i < cycles.length; i += 1) {
    const list = sessionsOf(plan, i);
    for (let a = 0; a < list.length; a += 1) {
      comptees += 1;
      const jumelle = list.some((s, b) => b !== a && overlap(list[a], s) >= RECOUVREMENT_IDENTIQUE);
      if (!jumelle) distinctes += 1;
    }
  }

  // Progression : d'un cycle au suivant, sur les exercices communs, combien
  // ont vu leurs séries, leurs répétitions ou leur repos bouger.
  let communs = 0;
  let modifies = 0;
  for (let i = 1; i < cycles.length; i += 1) {
    const avant = new Map<string, PlanExercise>();
    for (const s of sessionsOf(plan, i - 1)) for (const e of s.exercises) avant.set(key(e), e);
    for (const s of sessionsOf(plan, i)) {
      for (const e of s.exercises) {
        const p = avant.get(key(e));
        if (!p) continue;
        communs += 1;
        if (p.sets !== e.sets || p.reps !== e.reps || (p.rest ?? null) !== (e.rest ?? null)) modifies += 1;
      }
    }
  }

  // Cohérence nutritionnelle : 4 kcal par gramme de protéines et de glucides,
  // 9 par gramme de lipides. Un plan qui annonce des macros sans rapport avec
  // ses calories donne une consigne intenable.
  const n = plan.nutrition;
  const kcal = num(n?.kcal);
  const calcul = num(n?.protein) * 4 + num(n?.carbs) * 4 + num(n?.fat) * 9;
  const macroDrift = kcal > 0 && calcul > 0 ? Math.abs(calcul - kcal) / kcal : null;

  return {
    cycles: cycles.length,
    sessionsPerCycle,
    avgExercises: toutes.length ? exos.length / toutes.length : 0,
    dayVariety: comptees ? distinctes / comptees : 0,
    progression: communs ? modifies / communs : 0,
    warmupRate: toutes.length ? toutes.filter((s) => s.warmup.length > 0).length / toutes.length : 0,
    noteRate: exos.length ? exos.filter((e) => (e.note ?? "").trim().length > 0).length / exos.length : 0,
    macroDrift,
  };
}

/** Le plan tient-il la promesse du brief ? */
export function planConformity(plan: Plan, wantCycles: number, wantSessions: number): PlanConformity {
  const cycles = plan.cycles ?? [];
  return {
    cyclesOk: cycles.length >= wantCycles,
    sessionsOk: cycles.length > 0 && cycles.every((_, i) => sessionsOf(plan, i).length >= wantSessions),
  };
}

/** Ce qu'un plan a fait d'une contrainte physique déclarée. */
export interface ConstraintEcho {
  /** L'avertissement nomme la zone concernée. */
  inWarning: boolean;
  /** Au moins une consigne d'exercice la nomme, donc un choix a été expliqué. */
  inNotes: boolean;
  /** L'avertissement nie qu'une contrainte ait été déclarée. Faute grave. */
  denies: boolean;
}

/**
 * Une contrainte déclarée a-t-elle laissé une trace dans le plan ?
 *
 * Les autres mesures regardent la structure ; celle-ci regarde la promesse la
 * plus sensible du produit. Un plan peut être parfaitement périodisé et écrire
 * à un client qu'il n'a signalé aucune gêne alors qu'il en a coché une : c'est
 * arrivé en test, et rien d'autre ne l'attrape.
 *
 * @param zones Mots à chercher, par exemple « épaule » ou « genou ».
 */
export function constraintEcho(plan: Plan, zones: string[]): ConstraintEcho {
  const sansAccent = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cherche = (t: string) => zones.some((z) => sansAccent(t).includes(sansAccent(z)));

  const warning = plan.warning ?? "";
  const notes = (plan.cycles ?? []).flatMap((c) =>
    (c.sessions ?? []).flatMap((s) => s.exercises.map((e) => e.note ?? "")),
  );

  return {
    inWarning: cherche(warning),
    inNotes: notes.some((n) => n.trim() !== "" && cherche(n)),
    // Formulations vues en production : « aucune contrainte de santé n'a été
    // déclarée », « aucune blessure signalée ».
    denies: /aucune?\s+(contrainte|blessure|g[êe]ne|limitation|probl[èe]me)[^.]{0,40}(d[ée]clar|signal|mentionn)/i.test(
      warning,
    ),
  };
}
