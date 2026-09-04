// Lead magnet : construit un mini-programme « semaine découverte » de façon
// DÉTERMINISTE. Aucun appel IA, ni ici ni ailleurs dans le parcours : ce
// document est gratuit et part en volume, le facturer au coach à chaque
// téléchargement n'aurait aucun sens. Tout est calculé.
//
// La qualité ne vient donc pas d'un modèle, elle vient de trois choses :
//
//   1. UN CATALOGUE DE MOUVEMENTS annotés (schéma moteur, matériel requis,
//      articulations sollicitées). Voir `lead-magnet-engine`.
//   2. DES SÉANCES DÉCRITES EN SCHÉMAS, pas en noms d'exercices : « pousser
//      horizontal » se résout en développé couché, en pompes ou en pompes
//      mains surélevées selon le matériel et les épaules du pratiquant.
//   3. DE L'ARITHMÉTIQUE : la dépense quotidienne, les macros, la durée réelle
//      d'une séance. Voir `lead-magnet-nutrition`.
//
// Ce que le document livre, et pourquoi chaque bloc mérite sa place :
//   - une SEMAINE complète, jours de repos compris, sans quoi personne ne sait
//     quand faire la séance B
//   - un ÉCHAUFFEMENT par séance : la première chose qu'un coach dit, la
//     première que les programmes gratuits oublient
//   - une DURÉE ESTIMÉE par séance, vérifiée contre le créneau annoncé : une
//     séance d'une heure proposée à quelqu'un qui a trente minutes ne sera pas
//     faite
//   - une CONSIGNE TECHNIQUE et un REMPLACEMENT par exercice, tirés de la
//     bibliothèque déjà utilisée dans l'application
//   - COMMENT CHOISIR SA CHARGE : sans ça, « 4 × 8 » ne veut rien dire
//   - QUATRE SEMAINES de progression, pas une : la semaine 2 ne doit pas être
//     la copie de la semaine 1, et le montrer prouve qu'il y a une méthode
//   - des CIBLES CHIFFRÉES (kcal, protéines, lipides, glucides, eau) quand les
//     mesures sont connues, et rien du tout sinon
//   - un TABLEAU DE SUIVI à remplir, qui rend l'impression utile
//   - ce que le programme complet apporte EN PLUS, dit honnêtement

import { matchLibraryExercise } from "@/lib/exercise-library";
import { available, pick, type Joint, type Pattern } from "@/lib/lead-magnet-engine";
import { computeMacros, mealCalories, type Macros } from "@/lib/lead-magnet-nutrition";
import type {
  Concern,
  Equipment,
  Focus,
  Goal,
  LeadAnswers,
  Level,
} from "@/lib/lead-magnet-types";

export * from "@/lib/lead-magnet-types";
export type { Macros } from "@/lib/lead-magnet-nutrition";

// ─────────────────────────────────────────────────────────── sorties

export interface MiniExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  /** Consigne technique en une phrase, tirée de la bibliothèque. */
  cue: string;
  /** Quoi faire si la machine est prise ou le matériel absent. */
  alt: string;
}
export interface MiniSession {
  title: string;
  focus: string;
  warmup: string[];
  exercises: MiniExercise[];
  finisher: string | null;
  /** Durée estimée, échauffement compris, en minutes. */
  minutes: number;
}
/** Un des sept jours de la semaine : séance ou repos, jamais rien. */
export interface WeekDay {
  label: string;
  kind: "session" | "rest";
  title: string;
  note: string;
}
export interface NutritionPlan {
  /** Chiffrage complet, `null` si une mesure manque. */
  macros: Macros | null;
  /** Répartition en calories par repas, vide sans chiffrage. */
  meals: { meal: string; kcal: number }[];
  /** Repli quand les mesures manquent : la consigne qualitative. */
  calorieHint: string;
  rules: string[];
  sampleDay: { meal: string; example: string }[];
  shopping: string[];
}
/** Une ligne du plan de quatre semaines. */
export interface ProgressionWeek {
  week: number;
  headline: string;
  detail: string;
}
export interface MiniProgram {
  title: string;
  intro: string;
  /** Ce que les réponses ont réellement changé, dit au lecteur. */
  personalisation: string[];
  weekPlan: WeekDay[];
  sessions: MiniSession[];
  loadGuide: string[];
  fourWeeks: ProgressionWeek[];
  cardio: { title: string; body: string } | null;
  nutrition: NutritionPlan;
  tips: string[];
  next: string[];
}

// ─────────────────────────────────────────── structure des séances

interface SplitDay {
  title: string;
  focus: string;
  patterns: Pattern[];
}

/**
 * Les gabarits de séance, décrits en schémas moteurs.
 *
 * L'ordre compte : les polyarticulaires d'abord, quand on est frais, puis
 * l'isolation et le gainage. Un débutant qui commence par des curls fait une
 * mauvaise séance sans jamais comprendre pourquoi.
 */
const FULL_A: SplitDay = { title: "Séance A", focus: "Full-body, dominante bas", patterns: ["squat", "poussee_h", "tirage_h", "charniere", "gainage", "iso_bras"] };
const FULL_B: SplitDay = { title: "Séance B", focus: "Full-body, dominante haut", patterns: ["charniere", "tirage_v", "poussee_v", "fente", "gainage", "iso_jambes"] };
const FULL_C: SplitDay = { title: "Séance C", focus: "Full-body, rythme soutenu", patterns: ["fente", "poussee_h", "tirage_h", "squat", "cardio", "gainage"] };
const BAS: SplitDay = { title: "Bas du corps", focus: "Cuisses, fessiers, gainage", patterns: ["squat", "charniere", "fente", "iso_jambes", "gainage", "iso_jambes"] };
const HAUT: SplitDay = { title: "Haut du corps", focus: "Dos, pectoraux, épaules, bras", patterns: ["tirage_v", "poussee_h", "tirage_h", "poussee_v", "iso_bras", "iso_bras"] };
const PUSH: SplitDay = { title: "Poussée", focus: "Pectoraux, épaules, triceps", patterns: ["poussee_h", "poussee_v", "iso_bras", "gainage", "cardio"] };
const PULL: SplitDay = { title: "Tirage", focus: "Dos et biceps", patterns: ["tirage_v", "tirage_h", "iso_bras", "gainage", "cardio"] };
const JAMBES: SplitDay = { title: "Jambes", focus: "Cuisses, fessiers, mollets", patterns: ["squat", "charniere", "fente", "iso_jambes", "gainage"] };

/**
 * Découpage de la semaine selon le nombre de séances.
 *
 * En dessous de quatre séances, tout est full-body : c'est ce qui donne le
 * plus de résultats quand on ne s'entraîne pas souvent, et c'est exactement ce
 * qu'un programme gratuit ne propose jamais parce qu'il recopie un split de
 * culturiste.
 */
const SPLITS: Record<number, SplitDay[]> = {
  2: [FULL_A, FULL_B],
  3: [FULL_A, FULL_B, FULL_C],
  4: [BAS, HAUT, FULL_A, FULL_B],
  5: [BAS, HAUT, FULL_A, FULL_B, FULL_C],
  6: [PUSH, PULL, JAMBES, PUSH, PULL, JAMBES],
};

/** Un schéma supplémentaire quand une zone est prioritaire. */
const FOCUS_PATTERN: Record<Focus, Pattern | null> = {
  equilibre: null,
  haut: "iso_bras",
  bas: "iso_jambes",
  gainage: "gainage",
};

/** Répartition des séances dans la semaine, avec du repos entre deux. */
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SPREAD: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** Nombre d'exercices tenable dans le créneau annoncé. */
const COUNT_BY_DURATION: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7 };

// ─────────────────────────────────────────── paramètres de charge

interface GoalParams {
  sets: number;
  reps: string;
  restSec: number;
  /**
   * Repos minimal acceptable pour cet objectif.
   *
   * En force, raccourcir le repos ruine la séance : c'est précisément la
   * récupération entre séries lourdes qui permet la série suivante. Ailleurs,
   * un repos plus court est une concession banale, et même recherchée en perte
   * de gras. Le plancher encode cette différence.
   */
  restFloor: number;
  /** Concession à faire en premier quand la séance déborde du créneau. */
  cede: "repos" | "exercices";
  finisher?: string;
}
const PARAMS: Record<Goal, GoalParams> = {
  perte: { sets: 3, reps: "12-15", restSec: 50, restFloor: 40, cede: "repos", finisher: "5 min de corde à sauter ou de montées de genoux en fin de séance." },
  muscle: { sets: 4, reps: "8-12", restSec: 80, restFloor: 55, cede: "repos" },
  force: { sets: 4, reps: "5-6 sur les gros mouvements, 8-10 sur le reste", restSec: 150, restFloor: 120, cede: "exercices" },
  forme: { sets: 3, reps: "10-12", restSec: 60, restFloor: 45, cede: "repos" },
};

/** Le plancher absolu : en dessous, ce n'est plus une séance. */
const MIN_EXERCISES = 3;
const MIN_SETS = 3;

export interface Fitted {
  count: number;
  sets: number;
  restSec: number;
  minutes: number;
}

/**
 * Fait entrer une séance dans le créneau annoncé, en cédant dans l'ordre qu'un
 * coach choisirait.
 *
 * Une séance qui déborde ne sera pas faite, et une séance amputée sans méthode
 * ne vaut rien non plus. Il faut donc choisir CE QU'ON SACRIFIE, et l'ordre
 * dépend de l'objectif : en force, on retire des exercices avant de toucher au
 * repos, parce que c'est la récupération qui porte la séance ; partout
 * ailleurs, raccourcir le repos coûte moins cher que perdre un mouvement.
 *
 * Le nombre de séries cède en dernier, et jamais en dessous de trois : c'est
 * le volume minimal pour qu'une série de travail serve à quelque chose.
 *
 * Quand rien ne suffit, on rend la séance la plus courte possible et sa vraie
 * durée. Annoncer trente minutes pour une séance qui en dure quarante serait
 * un mensonge qui se découvre dès la première fois.
 */
export function fitToSlot(count: number, sets: number, restSec: number, budget: number, p: GoalParams): Fitted {
  let c = count;
  let sr = sets;
  let r = restSec;
  const tient = () => sessionMinutes(c, sr, r) <= budget;

  const raccourcirRepos = () => {
    while (!tient() && r > p.restFloor) r = Math.max(p.restFloor, r - 10);
  };
  const retirerExercice = () => {
    while (!tient() && c > MIN_EXERCISES) c -= 1;
  };

  if (p.cede === "repos") {
    raccourcirRepos();
    retirerExercice();
  } else {
    retirerExercice();
    raccourcirRepos();
  }
  // Dernier levier : le volume par exercice.
  while (!tient() && sr > MIN_SETS) sr -= 1;

  return { count: c, sets: sr, restSec: r, minutes: sessionMinutes(c, sr, r) };
}

/** « 50 s », « 2 min 30 ». Une durée s'écrit comme on la lit sur un chrono. */
export function formatRest(sec: number): string {
  if (sec < 90) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest}`;
}

/**
 * Durée réelle d'une séance, en minutes.
 *
 * Échauffement forfaitaire, puis pour chaque exercice : le temps sous tension
 * plus les repos entre séries. Le dernier repos ne compte pas, on enchaîne sur
 * l'exercice suivant.
 *
 * Ce calcul sert à VÉRIFIER la séance, pas seulement à l'annoncer : si elle
 * déborde du créneau, le générateur retire un exercice.
 */
const WARMUP_MIN = 8;
const WORK_SEC_PER_SET = 40;
export function sessionMinutes(exCount: number, sets: number, restSec: number): number {
  if (exCount <= 0) return WARMUP_MIN;
  const parSerie = WORK_SEC_PER_SET + restSec;
  const total = exCount * sets * parSerie - restSec;
  return WARMUP_MIN + Math.round(total / 60);
}

// ────────────────────────────────────────────────── textes fixes

const WARMUP: Record<Equipment, string[]> = {
  salle: [
    "5 min de vélo ou de rameur, allure facile, juste pour avoir chaud.",
    "Mobilité : 10 cercles d'épaules, 10 rotations de hanches, 10 flexions-extensions sans charge.",
    "Deux séries de montée en charge sur le premier exercice : 10 reps à vide, 5 reps à la moitié de ta charge de travail.",
  ],
  halteres: [
    "3 min de corde à sauter, de montées de genoux ou de marche rapide.",
    "Mobilité : 10 cercles d'épaules, 10 rotations de hanches, 10 squats sans charge.",
    "Une série légère du premier exercice avec la moitié de ta charge.",
  ],
  maison: [
    "3 min de montées de genoux, talons-fesses et jumping jack pour faire monter le cardiaque.",
    "Mobilité : 10 cercles d'épaules, 10 rotations de hanches, 10 squats lents.",
    "Une série de 8 reps du premier exercice, en contrôlant la descente.",
  ],
};

const LOAD_GUIDE: Record<Level, string[]> = {
  debutant: [
    "Cherche une charge que tu pourrais monter 3 ou 4 fois de plus que demandé. Trop léger vaut mieux que trop lourd les deux premières semaines.",
    "Si la technique se dégrade sur la dernière répétition, la charge est déjà trop lourde : baisse au prochain passage.",
    "Au poids du corps, joue sur l'amplitude et la lenteur plutôt que sur le nombre.",
  ],
  intermediaire: [
    "Vise une charge où il te reste 2 répétitions en réserve à la fin de la série. Ni à l'échec, ni en promenade.",
    "Garde la même charge tant que tu n'atteins pas le haut de la fourchette de répétitions sur toutes les séries.",
    "La dernière série peut être un peu plus légère : la qualité prime sur le chiffre.",
  ],
  avance: [
    "Une répétition en réserve sur les séries de travail, deux sur les mouvements les plus lourds.",
    "Échauffe-toi en montant par paliers sur le premier exercice, sans accumuler de fatigue.",
    "Note ta charge et ton ressenti : c'est ce qui te dira quoi faire la semaine suivante.",
  ],
};

/**
 * Quatre semaines, pas une.
 *
 * Un mini-programme d'une semaine laisse la question « et après ? » sans
 * réponse, et c'est précisément là que la personne abandonne ou cherche
 * ailleurs. Quatre lignes suffisent à montrer qu'il y a une logique, et à
 * rendre crédible le fait qu'un programme complet en ait une sur douze mois.
 */
const FOUR_WEEKS: Record<Goal, ProgressionWeek[]> = {
  perte: [
    { week: 1, headline: "Installer la technique", detail: "Charges modestes, amplitude complète. Note tout : c'est la référence des trois semaines suivantes." },
    { week: 2, headline: "Une répétition de plus", detail: "Mêmes charges, cherche une répétition supplémentaire par série. Repos raccourci de 5 s." },
    { week: 3, headline: "Densifier", detail: "Repos encore 5 s plus court, sans descendre sous 40 s. Ajoute 500 pas par jour à ta moyenne." },
    { week: 4, headline: "Consolider", detail: "Reviens aux repos de la semaine 1 et monte la charge là où toutes les séries sortaient propres." },
  ],
  muscle: [
    { week: 1, headline: "Trouver ses charges", detail: "Termine chaque série avec 2 répétitions en réserve. C'est la semaine où l'on apprend à se jauger." },
    { week: 2, headline: "Monter en répétitions", detail: "Vise le haut de la fourchette sur toutes les séries, à charge égale." },
    { week: 3, headline: "Monter en charge", detail: "Quand le haut de la fourchette est atteint partout : +2,5 kg en haut du corps, +5 kg en bas." },
    { week: 4, headline: "Semaine allégée", detail: "Une série de moins par exercice. C'est pendant cette semaine que le muscle se construit vraiment." },
  ],
  force: [
    { week: 1, headline: "Poser la base", detail: "Charges de travail confortables, technique irréprochable sur les mouvements lourds." },
    { week: 2, headline: "Premier palier", detail: "+2,5 kg sur les composés si toutes les répétitions sont sorties propres." },
    { week: 3, headline: "Deuxième palier", detail: "+2,5 kg à nouveau, ou même charge avec une répétition de plus. L'isolation ne bouge pas." },
    { week: 4, headline: "Décharge", detail: "Garde les charges, retire une série sur les composés. Le gain se lit la semaine suivante." },
  ],
  forme: [
    { week: 1, headline: "Prendre le rythme", detail: "L'objectif est de faire les séances prévues, pas de battre un record." },
    { week: 2, headline: "Gagner en amplitude", detail: "Mêmes charges, descente plus basse et plus contrôlée." },
    { week: 3, headline: "Ajouter du volume", detail: "Une série de plus sur les deux premiers exercices de chaque séance." },
    { week: 4, headline: "Faire le point", detail: "Reprends tes notes de la semaine 1 : ce que tu montes aujourd'hui te dira où tu en es." },
  ],
};

const CARDIO: Record<Goal, { title: string; body: string } | null> = {
  perte: {
    title: "Cardio et activité quotidienne",
    body: "Deux sorties de 25 à 35 min à allure de conversation, les jours sans musculation. Elles font le travail sans entamer la récupération. Vise aussi 8 000 pas par jour : sur une semaine, cela pèse plus lourd que le cardio lui-même.",
  },
  muscle: {
    title: "Cardio",
    body: "Une sortie facile de 20 à 30 min par semaine suffit pour la santé cardiaque, sans prendre sur la récupération musculaire. Place-la loin des séances de jambes.",
  },
  force: {
    title: "Cardio",
    body: "20 min à allure très facile, un jour de repos, pour aider la récupération. Rien d'intense : la fatigue accumulée se paie sur les séries lourdes.",
  },
  forme: {
    title: "Cardio",
    body: "Deux marches rapides de 30 min, ou une sortie vélo. L'objectif est de bouger souvent, pas de souffrir.",
  },
};

const NUTRITION_RULES: Record<Goal, string[]> = {
  perte: [
    "Construis chaque assiette dans cet ordre : une source de protéines, des légumes à volonté, puis un féculent en portion mesurée.",
    "Ne bois pas tes calories. Les sodas et jus passent sans rassasier.",
    "Prévois deux repas d'avance le dimanche : la majorité des écarts arrivent quand il n'y a rien de prêt.",
  ],
  muscle: [
    "Mange un peu plus les jours d'entraînement, normalement les autres jours.",
    "Un vrai repas dans les deux heures après la séance, avec protéines et féculents.",
    "Le sommeil fait partie du plan : sept heures minimum, sinon la prise de muscle plafonne.",
  ],
  forme: [
    "Une source de protéines à chaque repas, des légumes à deux repas sur trois.",
    "Bois régulièrement dans la journée plutôt qu'un litre d'un coup le soir.",
    "Cherche la régularité, pas la perfection : une semaine correcte vaut mieux qu'une journée parfaite.",
  ],
  force: [
    "Ne t'entraîne pas à jeun sur les séances lourdes : un repas avec des glucides deux à trois heures avant.",
    "Mange à hauteur de tes besoins. La force aime l'énergie disponible.",
    "Soigne le repos entre les grosses séances autant que les séances elles-mêmes.",
  ],
};

const CALORIE_HINT: Record<Goal, string> = {
  perte: "Vise un déficit léger, de l'ordre de 300 à 500 kcal sous ton besoin. Plus creux, tu perds du muscle et tu tiens trois semaines.",
  muscle: "Vise un surplus léger, de l'ordre de 200 à 300 kcal au-dessus de ton besoin. Au-delà, tu prends surtout du gras.",
  forme: "Reste autour de ton besoin actuel. L'objectif est l'habitude et l'énergie, pas la balance.",
  force: "Reste au moins à hauteur de ton besoin. Un déficit prolongé fait stagner les charges.",
};

const SAMPLE_DAY: Record<Goal, { meal: string; example: string }[]> = {
  perte: [
    { meal: "Petit-déjeuner", example: "Fromage blanc, fruits rouges, une poignée de flocons d'avoine." },
    { meal: "Déjeuner", example: "Blanc de poulet, grosse portion de légumes, 150 g de riz cuit." },
    { meal: "Collation", example: "Un fruit et une poignée d'amandes, ou un yaourt nature." },
    { meal: "Dîner", example: "Poisson blanc, légumes rôtis, une petite portion de féculent." },
  ],
  muscle: [
    { meal: "Petit-déjeuner", example: "Œufs, pain complet, un fruit." },
    { meal: "Déjeuner", example: "Viande ou poisson, 200 g de riz cuit, légumes, un filet d'huile d'olive." },
    { meal: "Collation", example: "Un fruit avant la séance, un vrai repas dans les deux heures après." },
    { meal: "Dîner", example: "Source de protéines, féculent, légumes, un laitage." },
  ],
  forme: [
    { meal: "Petit-déjeuner", example: "Yaourt, flocons d'avoine, fruit." },
    { meal: "Déjeuner", example: "Protéines, légumes, féculent complet." },
    { meal: "Collation", example: "Fruit ou poignée d'oléagineux, si tu as faim." },
    { meal: "Dîner", example: "Assiette simple : protéines, légumes, un peu de féculent." },
  ],
  force: [
    { meal: "Petit-déjeuner", example: "Œufs, pain complet, fruit, un laitage." },
    { meal: "Déjeuner", example: "Féculents et protéines, deux à trois heures avant la séance." },
    { meal: "Collation", example: "Repas complet avec glucides et protéines après la séance." },
    { meal: "Dîner", example: "Protéines, légumes, féculent selon la faim." },
  ],
};

const SHOPPING: Record<Goal, string[]> = {
  perte: ["Blancs de poulet ou dinde", "Poisson blanc surgelé", "Œufs", "Fromage blanc 0 %", "Légumes surgelés (gain de temps)", "Riz, pâtes complètes", "Fruits de saison", "Amandes nature"],
  muscle: ["Viande ou poisson", "Œufs", "Riz, pâtes, pommes de terre", "Flocons d'avoine", "Fromage blanc ou skyr", "Légumes surgelés", "Fruits", "Huile d'olive"],
  forme: ["Protéines variées (œufs, poisson, légumineuses)", "Légumes frais et surgelés", "Féculents complets", "Yaourts nature", "Fruits de saison", "Oléagineux"],
  force: ["Viande rouge et blanche", "Œufs", "Riz, pommes de terre", "Flocons d'avoine", "Laitages", "Légumes", "Fruits", "Huile d'olive"],
};

const GENERAL_TIPS = [
  "Technique avant charge : amplitude complète, descente contrôlée, pas de à-coups.",
  "Note tes charges et tes répétitions. Sans trace écrite, tu ne sauras pas quoi faire la semaine suivante.",
  "Une séance ratée ne casse rien. Trois semaines sans séance, si.",
  "En cas de douleur articulaire vive, arrête l'exercice et remplace-le. La douleur n'est pas un signe de progrès.",
];

const REST_NOTES: Record<Goal, string> = {
  perte: "Repos. Marche 30 min si tu peux : c'est ce qui creuse le déficit sans fatiguer.",
  muscle: "Repos complet. C'est aujourd'hui que le muscle se construit.",
  force: "Repos. Mobilité légère si tu es raide, rien de plus.",
  forme: "Repos actif : marche, vélo tranquille, étirements.",
};

/** Remplacement si la machine est prise ou le matériel absent. */
const ALTERNATIVES: Record<string, string> = {
  "Squat": "Squat gobelet avec un haltère, ou presse à cuisses.",
  "Squat gobelet": "Squat au poids du corps, plus lent, ou fentes.",
  "Squat au poids du corps": "Chaise contre un mur, 40 s par série.",
  "Presse à cuisses": "Fentes marchées avec ou sans charge.",
  "Chaise (wall sit)": "Squat au poids du corps, tenu 3 s en bas.",
  "Leg curl allongé": "Soulevé de terre roumain léger, ou hip thrust.",
  "Soulevé de terre roumain": "Hip thrust, ou good morning léger.",
  "Hip thrust": "Pont fessier au sol, une jambe si c'est trop facile.",
  "Pont fessier au sol": "Hip thrust sur un banc, ou une jambe à la fois.",
  "Fentes": "Montée sur banc (step-up), ou split squat statique.",
  "Fentes marchées": "Fentes statiques sur place.",
  "Montée sur banc (step-up)": "Fentes statiques, ou marche rapide en côte.",
  "Mollets debout": "Extensions de mollets sur une marche, au poids du corps.",
  "Abduction hanche élastique": "Ouvertures de hanche allongé sur le côté.",
  "Développé couché": "Développé couché haltères, ou pompes lestées.",
  "Développé couché haltères": "Pompes, mains surélevées si besoin.",
  "Pompes": "Pompes mains sur un banc, ou à genoux.",
  "Pompes mains surélevées": "Pompes à genoux, buste bien gainé.",
  "Pompes prise serrée": "Dips sur banc.",
  "Développé épaules haltères": "Développé militaire à la barre, ou élévations latérales.",
  "Élévations latérales": "Élévations à l'élastique, ou avec deux bouteilles d'eau.",
  "Tirage vertical": "Tractions assistées, ou rowing haltère un bras.",
  "Tractions assistées": "Tirage vertical à la poulie, ou tirage élastique.",
  "Tirage nuque élastique": "Rowing élastique, coudes serrés.",
  "Rowing barre": "Rowing haltères, buste penché.",
  "Rowing haltères": "Rowing élastique, ou tirage horizontal à la poulie.",
  "Tirage horizontal à la poulie": "Rowing haltères, buste penché.",
  "Rowing élastique": "Rowing avec un sac de courses lesté.",
  "Curl barre": "Curl haltères, ou curl marteau.",
  "Curl haltères": "Curl élastique.",
  "Curl élastique": "Curl avec deux bouteilles d'eau pleines.",
  "Extension triceps à la poulie": "Extension triceps couché aux haltères, ou dips sur banc.",
  "Dips sur banc": "Pompes prise serrée.",
  "Gainage (planche)": "Planche sur les genoux, ou dead bug.",
  "Gainage latéral": "Planche latérale sur les genoux.",
  "Dead bug": "Gainage classique, 30 s par série.",
  "Bird dog": "Superman, 10 répétitions.",
  "Superman": "Bird dog, 10 répétitions par côté.",
  "Grimpeur (mountain climber)": "Montées de genoux sur place.",
  "Jumping jack": "Montées de genoux, sans saut si les articulations sont sensibles.",
  "Montées de genoux": "Marche rapide sur place, bras actifs.",
  "Corde à sauter": "Montées de genoux, même durée.",
};

const FALLBACK_ALT: Record<Equipment, string> = {
  salle: "Prends une machine qui travaille le même groupe musculaire.",
  halteres: "Même mouvement avec un élastique, ou au poids du corps plus lentement.",
  maison: "Même mouvement plus lent, ou une répétition de plus par série.",
};

/**
 * Consigne technique et remplacement, tirés de la bibliothèque d'exercices déjà
 * utilisée dans l'application. Aucun contenu dupliqué : si un exercice gagne une
 * meilleure consigne dans la bibliothèque, le mini-programme en profite.
 */
function noteFor(name: string, equipment: Equipment): { cue: string; alt: string } {
  const entry = matchLibraryExercise(name);
  // Les consignes de la bibliothèque sont volontairement télégraphiques
  // (« Corps aligné ») parce qu'elles s'affichent sous une image dans l'app.
  // Ici il n'y a pas d'image : on en assemble deux pour former une phrase.
  const cues = entry?.guide.cues ?? [];
  const cue = cues.length ? `${cues.slice(0, 2).join(", ")}.` : "Descente contrôlée, ventre gainé, amplitude complète.";
  return { cue, alt: ALTERNATIVES[name] ?? FALLBACK_ALT[equipment] };
}

/** Nombre de séries, ajusté au niveau. */
function setsFor(goal: Goal, level: Level): number {
  const base = PARAMS[goal].sets;
  if (level === "debutant") return Math.max(2, base - 1);
  if (level === "avance") return base + 1;
  return base;
}

/** L'articulation à ménager, ou null. */
function jointOf(c: Concern): Joint | null {
  return c === "aucune" ? null : c;
}

/**
 * Ce que les réponses ont CHANGÉ, listé au lecteur.
 *
 * Sans cette liste, un document personnalisé ressemble à un document
 * générique : la personne ne peut pas savoir que le squat a été retiré parce
 * qu'elle a coché « genoux sensibles ». Le dire, c'est la seule façon de
 * rendre le travail visible.
 */
function personalisation(a: LeadAnswers, exCount: number, macros: Macros | null): string[] {
  const out: string[] = [];
  out.push(`${exCount} exercices par séance, pour tenir dans ${a.duration} minutes échauffement compris.`);
  if (a.concern !== "aucune") {
    const mot = a.concern === "dos" ? "le dos" : a.concern === "genoux" ? "les genoux" : "les épaules";
    out.push(`Tous les mouvements qui chargent ${mot} ont été écartés, et remplacés par une variante qui travaille la même chose.`);
  }
  if (a.focus !== "equilibre") {
    const zone = a.focus === "haut" ? "le haut du corps" : a.focus === "bas" ? "le bas du corps" : "le gainage";
    out.push(`Un exercice de plus sur ${zone} dans chaque séance, sans retirer le reste.`);
  }
  out.push(
    macros
      ? "Tes calories et tes macros sont calculées à partir de ton sexe, ton âge, ta taille et ton poids, pas d'une moyenne."
      : "Les cibles chiffrées demandent sexe, âge, taille et poids : sans les quatre, mieux vaut ne rien annoncer qu'un chiffre bâti sur une moyenne.",
  );
  return out;
}

/** Construit un mini-programme d'une semaine à partir des réponses. Pur. */
export function buildMiniProgram(a: LeadAnswers): MiniProgram {
  const days = Math.max(2, Math.min(6, Math.round(a.days) || 3));
  const joint = jointOf(a.concern);
  const p = PARAMS[a.goal];
  const sets = setsFor(a.goal, a.level);

  // Nombre d'exercices : le créneau décide, le niveau corrige. Un débutant a
  // besoin de moins d'exercices et de plus d'attention sur chacun.
  let cible = COUNT_BY_DURATION[a.duration] ?? 5;
  if (a.level === "debutant") cible = Math.max(3, cible - 1);

  const split = SPLITS[days] ?? SPLITS[3];
  const focusPattern = FOCUS_PATTERN[a.focus];

  // Mémoire à l'échelle de la SEMAINE : deux séances « Poussée » d'un split en
  // six jours ne doivent pas être identiques.
  const vusDansLaSemaine = new Set<string>();

  const sessions: MiniSession[] = [];
  for (let i = 0; i < days; i++) {
    const jour = split[i % split.length];
    const patterns = focusPattern ? [...jour.patterns, focusPattern] : [...jour.patterns];

    const dansLaSeance = new Set<string>();
    const choisis: string[] = [];
    for (const pattern of patterns) {
      if (choisis.length >= cible) break;
      const m = pick(pattern, a.equipment, joint, dansLaSeance, vusDansLaSemaine);
      // Aucun mouvement disponible pour ce schéma : on passe au suivant plutôt
      // que de proposer quelque chose qui fait mal.
      if (!m) continue;
      dansLaSeance.add(m.name);
      vusDansLaSemaine.add(m.name);
      choisis.push(m.name);
    }

    // La séance doit tenir dans le créneau annoncé. On cède dans l'ordre que
    // l'objectif impose, plutôt que de couper au hasard.
    const ajuste = fitToSlot(choisis.length, sets, p.restSec, a.duration, p);
    const retenus = choisis.slice(0, ajuste.count);

    const exercises: MiniExercise[] = retenus.map((name) => ({
      name,
      sets: ajuste.sets,
      reps: p.reps,
      rest: formatRest(ajuste.restSec),
      ...noteFor(name, a.equipment),
    }));

    sessions.push({
      title: days >= 4 ? `${jour.title}${days === 6 && i >= 3 ? " (2)" : ""}` : jour.title,
      focus: jour.focus,
      warmup: WARMUP[a.equipment],
      exercises,
      // Le finisher n'a de sens que sur la dernière séance de la semaine : en
      // mettre un partout allonge chaque séance sans rien apporter.
      finisher: p.finisher && i === days - 1 ? p.finisher : null,
      minutes: sessionMinutes(exercises.length, ajuste.sets, ajuste.restSec),
    });
  }

  // Calendrier : les séances sont espacées, les jours restants sont du repos
  // ASSUMÉ, avec une consigne. Un jour vide se transforme vite en semaine vide.
  const slots = SPREAD[days] ?? SPREAD[3];
  const weekPlan: WeekDay[] = DAY_LABELS.map((label, d) => {
    const idx = slots.indexOf(d);
    if (idx >= 0 && sessions[idx]) {
      return { label, kind: "session" as const, title: sessions[idx].title, note: `${sessions[idx].focus} · ${sessions[idx].minutes} min` };
    }
    return { label, kind: "rest" as const, title: "Repos", note: REST_NOTES[a.goal] };
  });

  const macros = computeMacros({
    sex: a.sex,
    age: a.age,
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    activity: a.activity,
    goal: a.goal,
    days,
  });

  const exCount = sessions[0]?.exercises.length ?? cible;

  return {
    title: `Ta semaine découverte, ${GOAL_LABEL_LOWER[a.goal]}`,
    intro: `${days} séances de ${a.duration} minutes réparties sur une semaine, calibrées pour un profil ${LEVEL_LABEL_LOWER[a.level]} avec « ${EQUIP_LABEL_LOWER[a.equipment]} ». Tout est écrit : l'échauffement, la charge à viser, quoi faire si une machine est prise, et le détail des quatre semaines suivantes.`,
    personalisation: personalisation({ ...a, days }, exCount, macros),
    weekPlan,
    sessions,
    loadGuide: LOAD_GUIDE[a.level],
    fourWeeks: FOUR_WEEKS[a.goal],
    cardio: CARDIO[a.goal],
    nutrition: {
      macros,
      meals: macros ? mealCalories(macros.target) : [],
      calorieHint: CALORIE_HINT[a.goal],
      rules: NUTRITION_RULES[a.goal],
      sampleDay: SAMPLE_DAY[a.goal],
      shopping: SHOPPING[a.goal],
    },
    tips: GENERAL_TIPS,
    next: [
      "Ici, une semaine et le plan des trois suivantes. Le programme complet couvre trois à douze mois, en cycles qui montent en intensité.",
      "Les exercices y sont choisis à partir du matériel de ta salle, photographiée, et non d'un catalogue.",
      "Tes contraintes de santé, allergies et interdits alimentaires y sont pris en compte partout, pas seulement la première semaine.",
      "Chaque bloc suivant est reconstruit sur ce que tu as réellement fait dans le précédent.",
      "Un assistant répond à tes questions au quotidien, à partir de la méthode de ton coach.",
    ],
  };
}

// Libellés en minuscules, employés dans des phrases. Les tables exportées
// gardent leur majuscule parce qu'elles servent aussi de titres.
const GOAL_LABEL_LOWER: Record<Goal, string> = {
  perte: "perte de gras",
  muscle: "prise de muscle",
  forme: "remise en forme",
  force: "force",
};
const LEVEL_LABEL_LOWER: Record<Level, string> = {
  debutant: "débutant",
  intermediaire: "intermédiaire",
  avance: "avancé",
};
const EQUIP_LABEL_LOWER: Record<Equipment, string> = {
  maison: "à la maison, peu de matériel",
  halteres: "haltères",
  salle: "salle complète",
};

/** Réexporté pour les tests : le catalogue filtré, tel que le moteur le voit. */
export { available };
