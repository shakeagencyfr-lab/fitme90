// Structure du questionnaire (approfondi). Chaque champ a une CLÉ stable —
// lib/screening.ts et la génération/coach s'appuient dessus. Les champs `bind`
// alimentent des colonnes de `profiles`. Plus il est riche, plus le coach IA
// et le programme sont personnalisés.

export type FieldType = "text" | "number" | "choice" | "multi" | "days" | "date";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
  optional?: boolean;
  /** colonne de profiles alimentée (name, sex, age, height_cm, rest_hr) */
  bind?: "name" | "sex" | "age" | "height_cm" | "rest_hr";
}

export interface Section {
  title: string;
  intro?: string;
  fields: Field[];
}

export const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export const QUIZ: Section[] = [
  {
    title: "Qui es-tu ?",
    intro: "Ces champs alimentent ton profil, ton IMC et tes zones cardiaques.",
    fields: [
      { key: "name", label: "Prénom", type: "text", placeholder: "Léa", bind: "name" },
      { key: "sex", label: "Sexe biologique", type: "choice", options: ["Femme", "Homme", "Autre"], bind: "sex" },
      { key: "age", label: "Âge", type: "number", placeholder: "34", bind: "age", help: "Sert à la FC max estimée (220 − âge)." },
      { key: "weight", label: "Poids actuel (kg)", type: "number", placeholder: "68" },
      { key: "height", label: "Taille (cm)", type: "number", placeholder: "170", bind: "height_cm" },
      { key: "rest", label: "FC au repos (bpm)", type: "number", placeholder: "62", bind: "rest_hr", help: "Au réveil, allongé." },
    ],
  },
  {
    title: "Ton objectif",
    intro: "Plus c'est précis, plus le programme colle à ce que tu vises.",
    fields: [
      { key: "goal", label: "Objectif principal", type: "choice", options: ["Perte de masse grasse", "Prise de muscle", "Recomposition", "Performance", "Santé générale"] },
      { key: "goal2", label: "Objectif secondaire", type: "choice", options: ["Endurance", "Force", "Mobilité", "Énergie au quotidien", "Aucun"] },
      { key: "deadline", label: "Une échéance ou un événement ?", type: "choice", options: ["Aucune en particulier", "Vacances / plage", "Compétition", "Mariage / événement", "Bilan santé"] },
      { key: "target_feeling", label: "Comment veux-tu te sentir dans 90 jours ?", type: "text", optional: true, placeholder: "Plus tonique, moins essoufflé…" },
      { key: "past_fail", label: "Qu'est-ce qui a échoué avant ?", type: "text", optional: true, placeholder: "J'abandonne vers la 4e semaine", help: "Calibre la difficulté et le volume." },
    ],
  },
  {
    title: "Niveau, temps et jours",
    intro: "Choisis d'abord le nombre de séances, puis les jours exacts.",
    fields: [
      { key: "level", label: "Expérience en musculation", type: "choice", options: ["Jamais", "Moins d'un an", "1 à 3 ans", "Plus de 3 ans"] },
      { key: "training_history", label: "Ton passé sportif", type: "text", optional: true, placeholder: "2 ans de crossfit, arrêt il y a 6 mois…" },
      { key: "freq", label: "Séances par semaine", type: "choice", options: ["2", "3", "4", "5", "6"] },
      { key: "train_days", label: "Jours d'entraînement", type: "days" },
      { key: "start_date", label: "Date de début du programme", type: "date", help: "Le jour exact où tu veux démarrer. Le décompte des 90 jours et ton calendrier partent de cette date." },
      { key: "dur", label: "Durée par séance", type: "choice", options: ["30 min", "45 min", "60 min", "90 min"] },
      { key: "session_time", label: "Moment préféré pour t'entraîner", type: "choice", options: ["Matin", "Midi", "Après-midi", "Soir", "Variable"] },
      { key: "cardio_pref", label: "Ton rapport au cardio", type: "choice", options: ["J'aime", "Neutre", "Je déteste"] },
      { key: "loved_exos", label: "Exercices que tu aimes / détestes", type: "text", optional: true, placeholder: "J'adore le hip thrust, je déteste le burpee" },
    ],
  },
  {
    title: "Santé et pathologies",
    intro: "Certaines réponses nécessitent un avis médical avant de démarrer.",
    fields: [
      { key: "patho1", label: "Pathologies articulaires", type: "multi", options: ["Lombalgie", "Hernie discale", "Épaule", "Genou", "Poignet", "Aucune"] },
      { key: "patho2", label: "Pathologies générales", type: "multi", options: ["Hypertension", "Diabète type 2", "Asthme", "Thyroïde", "Aucune"] },
      { key: "meds", label: "Traitements en cours", type: "text", optional: true, placeholder: "Bêtabloquants, kiné 1×/sem…" },
      { key: "past_injuries", label: "Blessures passées (guéries)", type: "text", optional: true, placeholder: "Entorse cheville en 2022…" },
      { key: "mobility", label: "Limitations de mobilité", type: "multi", options: ["Épaules", "Hanches", "Chevilles", "Dos", "Aucune"] },
      { key: "pregnancy", label: "Grossesse ou post-partum", type: "choice", options: ["Non concerné", "Enceinte", "Post-partum < 6 mois", "Post-partum > 6 mois"] },
    ],
  },
  {
    title: "Alimentation",
    intro: "Exclusion stricte dans les repas et la liste de courses.",
    fields: [
      { key: "allerg", label: "Allergies et intolérances", type: "multi", options: ["Gluten", "Lactose", "Fruits à coque", "Œuf", "Poisson", "Crustacés", "Soja", "Aucune"] },
      { key: "diet", label: "Régime", type: "choice", options: ["Omnivore", "Flexitarien", "Végétarien", "Végétalien", "Sans porc", "Sans bœuf"] },
      { key: "religion", label: "Cadre religieux", type: "choice", options: ["Aucun", "Halal", "Casher", "Ramadan", "Carême"] },
      { key: "dislikes", label: "Aliments que tu refuses", type: "text", optional: true, placeholder: "Brocoli, fromage bleu…" },
      { key: "loved_foods", label: "Aliments que tu adores", type: "text", optional: true, placeholder: "Poulet, patate douce, chocolat noir…" },
      { key: "meals_per_day", label: "Repas par jour", type: "choice", options: ["2", "3", "4", "5 et +"] },
      { key: "cook_time", label: "As-tu le temps de cuisiner ?", type: "choice", options: ["Oui", "De temps en temps", "Non"], help: "Détermine le niveau des recettes proposées (élaborées, simples ou en assemblage rapide)." },
      { key: "budget", label: "Budget alimentaire", type: "choice", options: ["Serré", "Moyen", "Confortable"] },
      { key: "supplements", label: "Compléments actuels", type: "text", optional: true, placeholder: "Whey, créatine, vitamine D…" },
      { key: "alcohol", label: "Alcool", type: "choice", options: ["Jamais", "Occasionnel", "Régulier"] },
    ],
  },
  {
    title: "Récupération & sommeil",
    fields: [
      { key: "sleep", label: "Sommeil moyen", type: "choice", options: ["< 6 h", "6–7 h", "7–8 h", "> 8 h"] },
      { key: "sleep_quality", label: "Qualité du sommeil", type: "choice", options: ["Bonne", "Moyenne", "Mauvaise"] },
      { key: "stress", label: "Niveau de stress", type: "choice", options: ["Faible", "Modéré", "Élevé"] },
      { key: "energy", label: "Énergie en journée", type: "choice", options: ["Élevée", "Variable", "Basse"] },
    ],
  },
  {
    title: "Mode de vie",
    fields: [
      { key: "job", label: "Activité professionnelle", type: "choice", options: ["Sédentaire", "Debout", "Physique"] },
      { key: "steps", label: "Activité quotidienne (hors sport)", type: "choice", options: ["Sédentaire (< 5 000 pas)", "Modérée", "Active (> 10 000 pas)"] },
      { key: "schedule", label: "Horaires de travail", type: "choice", options: ["Réguliers", "Décalés / nuit", "Variables"] },
      { key: "cook", label: "Cuisine par semaine", type: "choice", options: ["Jamais", "2–3 fois", "Tous les jours"] },
    ],
  },
  {
    title: "Motivation & accompagnement",
    intro: "Ça aide le coach à te parler comme il faut.",
    fields: [
      { key: "why_now", label: "Pourquoi maintenant ?", type: "text", optional: true, placeholder: "Marre de me sentir fatigué le matin…" },
      { key: "motivation", label: "Ce qui te fait tenir", type: "choice", options: ["Les chiffres", "La routine", "Le visuel", "La compétition", "L'accompagnement"] },
      { key: "coach_tone", label: "Le ton du coach que tu préfères", type: "choice", options: ["Bienveillant", "Direct / cash", "Technique / pédagogue", "Motivateur"] },
      { key: "obstacles", label: "Ce qui te fait décrocher d'habitude", type: "multi", options: ["Manque de temps", "Manque de motivation", "Blessures", "Vie sociale", "Résultats trop lents", "Ennui"] },
      { key: "weigh", label: "Pesée", type: "choice", options: ["Quotidienne", "Hebdomadaire", "Jamais"] },
      { key: "progress_photos", label: "Photos de progression", type: "choice", options: ["Toutes les 2 semaines", "Une fois par mois", "Non"] },
    ],
  },
];

// Traduit les réponses brutes (clés) en lignes lisibles « Label : valeur »,
// pour un contexte de génération et de coach plus riche et compréhensible.
export function describeAnswers(answers: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const section of QUIZ) {
    for (const f of section.fields) {
      if (f.type === "days") continue; // géré à part (train_days)
      const v = answers[f.key];
      if (v == null) continue;
      const text = Array.isArray(v) ? v.filter(Boolean).join(", ") : String(v).trim();
      if (text) lines.push(`${f.label} : ${text}`);
    }
  }
  return lines;
}

/** Ton de coaching demandé, s'il est renseigné. */
export function coachTone(answers: Record<string, unknown>): string | null {
  const v = answers?.coach_tone;
  return typeof v === "string" && v ? v : null;
}
