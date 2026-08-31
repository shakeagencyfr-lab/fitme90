// Lead magnet : construit un mini-programme « semaine découverte » de façon
// DÉTERMINISTE (aucun appel IA → coût nul, fiable pour tous les coachs). La
// qualité vient de gabarits soignés, calibrés par objectif / niveau / matériel.

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

export interface MiniExercise { name: string; sets: number; reps: string; rest: string }
export interface MiniSession { title: string; focus: string; exercises: MiniExercise[] }
export interface MiniProgram {
  title: string;
  intro: string;
  sessions: MiniSession[];
  nutrition: string[];
  tips: string[];
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

const NUTRITION: Record<Goal, string[]> = {
  perte: [
    "Vise un léger déficit : assiettes riches en protéines et légumes, portions maîtrisées.",
    "Protéines à chaque repas (satiété) : 1,8 à 2,2 g/kg/jour environ.",
    "Bouge au quotidien (pas, escaliers) : le NEAT fait la différence.",
  ],
  muscle: [
    "Léger surplus calorique : mange un peu plus les jours d'entraînement.",
    "Protéines 1,6 à 2,2 g/kg/jour, glucides autour des séances pour la performance.",
    "Sommeil et régularité : le muscle se construit à la récupération.",
  ],
  forme: [
    "Assiette équilibrée : une source de protéines, des légumes, un féculent complet.",
    "Hydrate-toi et privilégie des aliments simples et variés.",
    "Vise la régularité plutôt que la perfection.",
  ],
  force: [
    "Mange à hauteur de tes besoins : la force aime l'énergie disponible.",
    "Protéines 1,6 à 2 g/kg/jour, glucides suffisants avant les grosses séances.",
    "Récupération soignée entre les séances lourdes.",
  ],
};

const GENERAL_TIPS = [
  "Échauffe-toi 5 à 10 min avant chaque séance (mobilité + montée en charge progressive).",
  "Technique avant charge : amplitude complète, mouvement contrôlé.",
  "Note tes performances pour progresser d'une semaine à l'autre (surcharge progressive).",
];

/** Construit un mini-programme d'une semaine à partir des réponses. Pur. */
export function buildMiniProgram(a: LeadAnswers): MiniProgram {
  const days = Math.max(2, Math.min(4, Math.round(a.days) || 3));
  const templates = SESSIONS[a.equipment];
  const p = PARAMS[a.goal];

  // Ajuste le volume au niveau.
  const sets = a.level === "debutant" ? Math.max(2, p.sets - 1) : a.level === "avance" ? p.sets + 1 : p.sets;

  const sessions: MiniSession[] = [];
  for (let i = 0; i < days; i++) {
    const t = templates[i % templates.length];
    // Débutant : on allège à 5 exercices max ; avancé : jusqu'à 6.
    const maxEx = a.level === "debutant" ? 5 : 6;
    const exercises: MiniExercise[] = t.ex.slice(0, maxEx).map((name) => ({
      name,
      sets,
      reps: p.reps,
      rest: p.rest,
    }));
    sessions.push({ title: `Séance ${String.fromCharCode(65 + i)}`, focus: t.focus, exercises });
  }

  const tips = [...GENERAL_TIPS];
  if (p.finisher) tips.push(p.finisher);

  return {
    title: `Ta semaine découverte — ${GOAL_LABEL[a.goal]}`,
    intro: `${days} séances sur une semaine, calibrées pour un profil ${LEVEL_LABEL[a.level].toLowerCase()} avec « ${EQUIP_LABEL[a.equipment].toLowerCase()} ». Un avant-goût concret de la méthode ; le programme complet s'adapte ensuite à 100 % à ton profil.`,
    sessions,
    nutrition: NUTRITION[a.goal],
    tips,
  };
}
