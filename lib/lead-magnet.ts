// Lead magnet : construit un mini-programme « semaine découverte » de façon
// DÉTERMINISTE (aucun appel IA → coût nul, fiable pour tous les coachs). La
// qualité vient de gabarits soignés, calibrés par objectif / niveau / matériel.
//
// Ce que le document livrait avant : une liste d'exercices avec séries, reps et
// repos, trois conseils nutrition et trois conseils généraux. C'est-à-dire ce
// que n'importe qui trouve en trois minutes de recherche, et rien qui donne
// envie de payer la suite.
//
// Ce qu'il livre maintenant, et pourquoi chaque bloc mérite sa place :
//   - une SEMAINE datée, jours de repos compris : sans calendrier, personne ne
//     sait quand faire la séance B
//   - un ÉCHAUFFEMENT par séance : c'est la première chose qu'un coach dit, et
//     la première que les programmes gratuits oublient
//   - une CONSIGNE TECHNIQUE et un REMPLACEMENT par exercice, tirés de la
//     bibliothèque déjà utilisée dans l'application (aucun contenu dupliqué)
//   - COMMENT CHOISIR SA CHARGE : sans ça, « 4 × 8 » ne veut rien dire pour un
//     débutant
//   - une RÈGLE DE PROGRESSION d'une semaine à l'autre : la semaine 2 ne doit
//     pas être la copie de la semaine 1
//   - une cible PROTÉINES chiffrée quand le poids est connu, une journée type
//     et une liste de courses : de la nutrition applicable, pas des principes
//   - un TABLEAU DE SUIVI à remplir, qui rend l'impression utile
//   - ce que le programme complet apporte EN PLUS, dit honnêtement

import { matchLibraryExercise } from "@/lib/exercise-library";

export const GOALS = ["perte", "muscle", "forme", "force"] as const;
export const LEVELS = ["debutant", "intermediaire", "avance"] as const;
export const EQUIPMENTS = ["maison", "halteres", "salle"] as const;

export type Goal = (typeof GOALS)[number];
export type Level = (typeof LEVELS)[number];
export type Equipment = (typeof EQUIPMENTS)[number];

export interface LeadAnswers {
  goal: Goal;
  level: Level;
  days: number; // 2..4
  equipment: Equipment;
  /** Poids en kg, facultatif : sert à chiffrer la cible protéines. */
  weightKg?: number | null;
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

export function isGoal(v: string): v is Goal { return (GOALS as readonly string[]).includes(v); }
export function isLevel(v: string): v is Level { return (LEVELS as readonly string[]).includes(v); }
export function isEquipment(v: string): v is Equipment { return (EQUIPMENTS as readonly string[]).includes(v); }

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
}
/** Un des sept jours de la semaine : séance ou repos, jamais rien. */
export interface WeekDay {
  label: string;
  kind: "session" | "rest";
  title: string;
  note: string;
}
export interface NutritionPlan {
  /** Cible protéines chiffrée, null si le poids n'a pas été donné. */
  proteinTarget: string | null;
  calorieHint: string;
  rules: string[];
  sampleDay: { meal: string; example: string }[];
  shopping: string[];
}
export interface MiniProgram {
  title: string;
  intro: string;
  weekPlan: WeekDay[];
  sessions: MiniSession[];
  loadGuide: string[];
  progression: string[];
  cardio: { title: string; body: string } | null;
  nutrition: NutritionPlan;
  tips: string[];
  next: string[];
}

// Séances-types par matériel (A: bas+gainage, B: haut, C: full/cardio).
const SESSIONS: Record<Equipment, { focus: string; ex: string[] }[]> = {
  salle: [
    { focus: "Bas du corps & gainage", ex: ["Squat", "Presse à cuisses", "Leg curl allongé", "Mollets debout", "Gainage (planche)"] },
    { focus: "Haut du corps", ex: ["Développé couché", "Tirage vertical", "Rowing barre", "Développé épaules haltères", "Curl barre", "Extension triceps à la poulie"] },
    { focus: "Full-body", ex: ["Soulevé de terre roumain", "Développé couché haltères", "Rowing haltères", "Fentes", "Gainage (planche)"] },
  ],
  halteres: [
    { focus: "Bas du corps & gainage", ex: ["Squat gobelet", "Fentes", "Hip thrust", "Mollets debout", "Gainage (planche)"] },
    { focus: "Haut du corps", ex: ["Développé couché haltères", "Rowing haltères", "Développé épaules haltères", "Curl haltères", "Extension triceps couché"] },
    { focus: "Full-body", ex: ["Squat gobelet", "Développé couché haltères", "Rowing haltères", "Fentes", "Gainage latéral"] },
  ],
  maison: [
    { focus: "Bas du corps & gainage", ex: ["Squat au poids du corps", "Fentes", "Chaise (wall sit)", "Superman", "Gainage (planche)"] },
    { focus: "Haut du corps", ex: ["Pompes", "Dips sur banc", "Rowing haltères", "Gainage latéral", "Superman"] },
    { focus: "Full-body & cardio", ex: ["Squat au poids du corps", "Pompes", "Fentes", "Grimpeur (mountain climber)", "Jumping jack"] },
  ],
};

// Paramètres de charge par objectif.
const PARAMS: Record<Goal, { sets: number; reps: string; rest: string; finisher?: string }> = {
  perte: { sets: 3, reps: "12-15", rest: "45-60 s", finisher: "5 min de corde à sauter ou grimpeur (mountain climber) en fin de séance." },
  muscle: { sets: 4, reps: "8-12", rest: "75-90 s" },
  force: { sets: 4, reps: "5-6 (composés), 8-10 (isolation)", rest: "2-3 min sur les composés" },
  forme: { sets: 3, reps: "10-12", rest: "60 s" },
};

// ─────────────────────────────────────────────────────────────
// Échauffement : deux minutes de plus, et la séance change de nature.
// Il dépend du matériel (on ne fait pas tourner une barre à vide chez soi).
// ─────────────────────────────────────────────────────────────
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

// Comment choisir sa charge. Sans ce bloc, « 4 × 8 » ne veut rien dire pour
// quelqu'un qui débute : c'est LA question qui bloque en salle.
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

// La semaine 2 ne doit pas être la copie de la semaine 1.
const PROGRESSION: Record<Goal, string[]> = {
  perte: [
    "Semaine suivante : garde les mêmes charges et cherche une répétition de plus par série.",
    "Raccourcis le repos de 5 secondes chaque semaine, sans descendre sous 40 secondes.",
    "Ajoute 500 pas par jour à ta moyenne actuelle. C'est le levier le plus sous-estimé.",
  ],
  muscle: [
    "Semaine suivante : quand toutes les séries atteignent le haut de la fourchette, monte la charge de 2,5 kg (haut du corps) ou 5 kg (bas du corps).",
    "Sinon, garde la charge et gagne une répétition. Progresser, ce n'est pas forcément charger.",
    "Toutes les quatre semaines, fais une semaine plus légère : c'est là que le muscle se construit.",
  ],
  force: [
    "Semaine suivante : ajoute 2,5 kg sur les mouvements composés si les répétitions sont sorties propres.",
    "Si une série casse, reste à la même charge une semaine de plus au lieu de forcer.",
    "Le volume d'isolation reste stable : c'est le composé qui monte.",
  ],
  forme: [
    "Semaine suivante : une répétition de plus par série, ou une amplitude plus complète.",
    "Quand une séance devient confortable de bout en bout, ajoute un exercice ou une série.",
    "La régularité compte plus que la performance : deux séances tenues valent mieux que quatre prévues.",
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
    { meal: "Autour de la séance", example: "Un fruit avant, un vrai repas dans les deux heures après." },
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
    { meal: "Repas d'avant-séance", example: "Féculents et protéines, deux à trois heures avant." },
    { meal: "Après la séance", example: "Repas complet avec glucides et protéines." },
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

/** Répartition des séances dans la semaine, avec un jour de repos entre deux. */
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SPREAD: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
};

const REST_NOTES: Record<Goal, string> = {
  perte: "Repos. Marche 30 min si tu peux : c'est ce qui creuse le déficit sans fatiguer.",
  muscle: "Repos complet. C'est aujourd'hui que le muscle se construit.",
  force: "Repos. Mobilité légère si tu es raide, rien de plus.",
  forme: "Repos actif : marche, vélo tranquille, étirements.",
};

/**
 * Consigne technique et remplacement, tirés de la bibliothèque d'exercices déjà
 * utilisée dans l'application. Aucun contenu dupliqué : si un exercice gagne une
 * meilleure consigne dans la bibliothèque, le lead magnet en profite.
 */
function noteFor(name: string, equipment: Equipment): { cue: string; alt: string } {
  const entry = matchLibraryExercise(name);
  // Les consignes de la bibliothèque sont volontairement télégraphiques
  // (« Corps aligné ») parce qu'elles s'affichent sous une image dans l'app.
  // Ici il n'y a pas d'image : on en assemble deux pour former une phrase
  // lisible seule.
  const cues = entry?.guide.cues ?? [];
  const cue = cues.length
    ? `${cues.slice(0, 2).join(", ")}.`
    : "Descente contrôlée, ventre gainé, amplitude complète.";
  const alt = ALTERNATIVES[name] ?? FALLBACK_ALT[equipment];
  return { cue, alt };
}

/** Remplacement si la machine est prise ou le matériel absent. */
const ALTERNATIVES: Record<string, string> = {
  "Squat": "Squat gobelet avec un haltère, ou presse à cuisses.",
  "Squat gobelet": "Squat au poids du corps, plus lent, ou fentes.",
  "Squat au poids du corps": "Chaise contre un mur, 40 s par série.",
  "Presse à cuisses": "Fentes marchées avec ou sans charge.",
  "Leg curl allongé": "Soulevé de terre roumain léger, ou hip thrust.",
  "Soulevé de terre roumain": "Hip thrust, ou good morning léger.",
  "Hip thrust": "Pont fessier au sol, une jambe si c'est trop facile.",
  "Fentes": "Montées sur banc (step-up), ou split squat statique.",
  "Mollets debout": "Extensions de mollets sur une marche, au poids du corps.",
  "Développé couché": "Développé couché haltères, ou pompes lestées.",
  "Développé couché haltères": "Pompes, mains surélevées si besoin.",
  "Pompes": "Pompes mains sur un banc, ou à genoux.",
  "Tirage vertical": "Tractions assistées, ou rowing haltère un bras.",
  "Rowing barre": "Rowing haltères, buste penché.",
  "Rowing haltères": "Rowing élastique, ou tirage horizontal à la poulie.",
  "Développé épaules haltères": "Développé militaire à la barre, ou élévations latérales.",
  "Curl barre": "Curl haltères, ou curl marteau.",
  "Curl haltères": "Curl élastique.",
  "Extension triceps à la poulie": "Extension triceps couché aux haltères, ou dips sur banc.",
  "Extension triceps couché": "Dips sur banc.",
  "Dips sur banc": "Pompes prise serrée.",
  "Gainage (planche)": "Planche sur les genoux, ou dead bug.",
  "Gainage latéral": "Planche latérale sur les genoux.",
  "Superman": "Bird dog, 10 répétitions par côté.",
  "Chaise (wall sit)": "Squat au poids du corps, tenu 3 s en bas.",
  "Grimpeur (mountain climber)": "Montées de genoux sur place.",
  "Jumping jack": "Montées de genoux, sans saut si les articulations sont sensibles.",
};

const FALLBACK_ALT: Record<Equipment, string> = {
  salle: "Prends une machine qui travaille le même groupe musculaire.",
  halteres: "Même mouvement avec un élastique, ou au poids du corps plus lentement.",
  maison: "Même mouvement plus lent, ou une répétition de plus par série.",
};

/** Cible protéines chiffrée. null si le poids n'est pas connu : mieux vaut ne
 *  rien annoncer qu'un chiffre inventé. */
function proteinTarget(goal: Goal, weightKg: number | null | undefined): string | null {
  if (!weightKg || !Number.isFinite(weightKg) || weightKg < 35 || weightKg > 250) return null;
  const lo = goal === "perte" ? 1.8 : 1.6;
  const hi = goal === "perte" ? 2.2 : 2.0;
  return `Environ ${Math.round(weightKg * lo)} à ${Math.round(weightKg * hi)} g de protéines par jour.`;
}

/** Construit un mini-programme d'une semaine à partir des réponses. Pur. */
export function buildMiniProgram(a: LeadAnswers): MiniProgram {
  const days = Math.max(2, Math.min(4, Math.round(a.days) || 3));
  const templates = SESSIONS[a.equipment];
  const p = PARAMS[a.goal];

  // Volume ajusté au niveau.
  const sets = a.level === "debutant" ? Math.max(2, p.sets - 1) : a.level === "avance" ? p.sets + 1 : p.sets;

  const sessions: MiniSession[] = [];
  for (let i = 0; i < days; i++) {
    const t = templates[i % templates.length];
    // Débutant : cinq exercices au plus ; avancé : jusqu'à six.
    const maxEx = a.level === "debutant" ? 5 : 6;
    const exercises: MiniExercise[] = t.ex.slice(0, maxEx).map((name) => ({
      name,
      sets,
      reps: p.reps,
      rest: p.rest,
      ...noteFor(name, a.equipment),
    }));
    sessions.push({
      title: `Séance ${String.fromCharCode(65 + i)}`,
      focus: t.focus,
      warmup: WARMUP[a.equipment],
      exercises,
      // Le finisher n'a de sens que sur la dernière séance de la semaine :
      // en mettre un partout allonge chaque séance sans rien apporter.
      finisher: p.finisher && i === days - 1 ? p.finisher : null,
    });
  }

  // Calendrier : les séances sont espacées, les jours restants sont du repos
  // ASSUMÉ, avec une consigne. Un jour vide se transforme vite en semaine vide.
  const slots = SPREAD[days] ?? SPREAD[3];
  const weekPlan: WeekDay[] = DAY_LABELS.map((label, d) => {
    const idx = slots.indexOf(d);
    if (idx >= 0 && sessions[idx]) {
      return { label, kind: "session" as const, title: sessions[idx].title, note: sessions[idx].focus };
    }
    return { label, kind: "rest" as const, title: "Repos", note: REST_NOTES[a.goal] };
  });

  return {
    title: `Ta semaine découverte, ${GOAL_LABEL[a.goal].toLowerCase()}`,
    intro: `${days} séances réparties sur une semaine, calibrées pour un profil ${LEVEL_LABEL[a.level].toLowerCase()} avec « ${EQUIP_LABEL[a.equipment].toLowerCase()} ». Tout est écrit : l'échauffement, la charge à viser, quoi faire si une machine est prise, et comment progresser la semaine suivante.`,
    weekPlan,
    sessions,
    loadGuide: LOAD_GUIDE[a.level],
    progression: PROGRESSION[a.goal],
    cardio: CARDIO[a.goal],
    nutrition: {
      proteinTarget: proteinTarget(a.goal, a.weightKg),
      calorieHint: CALORIE_HINT[a.goal],
      rules: NUTRITION_RULES[a.goal],
      sampleDay: SAMPLE_DAY[a.goal],
      shopping: SHOPPING[a.goal],
    },
    tips: GENERAL_TIPS,
    next: [
      "Ici, une semaine type. Le programme complet couvre trois mois, en cycles qui montent en intensité.",
      "Les exercices y sont choisis à partir du matériel de ta salle, photographiée, et non d'un gabarit.",
      "Tes contraintes de santé, allergies et interdits alimentaires y sont pris en compte partout, pas seulement la première semaine.",
      "Chaque bloc suivant est reconstruit sur ce que tu as réellement fait dans le précédent.",
    ],
  };
}
