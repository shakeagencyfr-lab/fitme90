// Les réponses du questionnaire et leurs libellés.
//
// Isolé du reste pour une raison précise : le formulaire public, l'action
// serveur, le moteur et la page de résultat ont tous besoin de ces listes, et
// aucun d'eux ne doit importer le générateur complet pour lire un libellé.

export const GOALS = ["perte", "muscle", "forme", "force"] as const;
export const LEVELS = ["debutant", "intermediaire", "avance"] as const;
export const EQUIPMENTS = ["maison", "halteres", "salle"] as const;
/** Créneau réellement disponible : c'est lui qui décide du nombre d'exercices. */
export const DURATIONS = [30, 45, 60, 75] as const;
/** Zone à privilégier, sans déséquilibrer la séance. */
export const FOCUSES = ["equilibre", "haut", "bas", "gainage"] as const;
/** Articulation à ménager. Une seule à la fois : au-delà, c'est un coach qu'il faut. */
export const CONCERNS = ["aucune", "dos", "genoux", "epaules"] as const;
export const SEXES = ["femme", "homme", "nsp"] as const;
/** Niveau d'activité hors entraînement, pour la dépense quotidienne. */
export const ACTIVITIES = ["sedentaire", "modere", "actif"] as const;

export type Goal = (typeof GOALS)[number];
export type Level = (typeof LEVELS)[number];
export type Equipment = (typeof EQUIPMENTS)[number];
export type Duration = (typeof DURATIONS)[number];
export type Focus = (typeof FOCUSES)[number];
export type Concern = (typeof CONCERNS)[number];
export type Sex = (typeof SEXES)[number];
export type Activity = (typeof ACTIVITIES)[number];

export interface LeadAnswers {
  goal: Goal;
  level: Level;
  /** Séances par semaine, 2 à 6. */
  days: number;
  equipment: Equipment;
  duration: Duration;
  focus: Focus;
  concern: Concern;
  sex: Sex;
  /** Les quatre mesures sont facultatives : sans elles, aucun chiffre n'est
   *  annoncé plutôt qu'un chiffre inventé. */
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activity?: Activity | null;
}

export const GOAL_LABEL: Record<Goal, string> = {
  perte: "Perte de gras",
  muscle: "Prise de muscle",
  forme: "Remise en forme",
  force: "Force",
};
export const LEVEL_LABEL: Record<Level, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};
export const EQUIP_LABEL: Record<Equipment, string> = {
  maison: "À la maison (peu de matériel)",
  halteres: "Haltères",
  salle: "Salle complète",
};
export const FOCUS_LABEL: Record<Focus, string> = {
  equilibre: "Tout le corps, équilibré",
  haut: "Haut du corps",
  bas: "Bas du corps",
  gainage: "Ventre et gainage",
};
export const CONCERN_LABEL: Record<Concern, string> = {
  aucune: "Aucune gêne particulière",
  dos: "Dos sensible",
  genoux: "Genoux sensibles",
  epaules: "Épaules sensibles",
};
export const SEX_LABEL: Record<Sex, string> = {
  femme: "Femme",
  homme: "Homme",
  nsp: "Je préfère ne pas préciser",
};
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentaire: "Sédentaire (bureau, peu de marche)",
  modere: "Modérément actif (debout, marche régulière)",
  actif: "Très actif (métier physique)",
};
export const DURATION_LABEL: Record<Duration, string> = {
  30: "30 min",
  45: "45 min",
  60: "1 h",
  75: "1 h 15",
};

export function isGoal(v: string): v is Goal { return (GOALS as readonly string[]).includes(v); }
export function isLevel(v: string): v is Level { return (LEVELS as readonly string[]).includes(v); }
export function isEquipment(v: string): v is Equipment { return (EQUIPMENTS as readonly string[]).includes(v); }
export function isFocus(v: string): v is Focus { return (FOCUSES as readonly string[]).includes(v); }
export function isConcern(v: string): v is Concern { return (CONCERNS as readonly string[]).includes(v); }
export function isSex(v: string): v is Sex { return (SEXES as readonly string[]).includes(v); }
export function isActivity(v: string): v is Activity { return (ACTIVITIES as readonly string[]).includes(v); }
export function isDuration(n: number): n is Duration { return (DURATIONS as readonly number[]).includes(n); }
