// Structure du questionnaire (8 sections, README/maquette). Chaque champ a
// une CLÉ stable — y compris ceux qui n'en avaient pas dans la maquette
// (grossesse, sommeil…) — car lib/screening.ts et la génération s'appuient
// dessus. Les champs `bind` alimentent des colonnes de `profiles`.

export type FieldType = "text" | "number" | "choice" | "multi" | "days";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  help?: string;
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
    fields: [
      { key: "goal", label: "Objectif principal", type: "choice", options: ["Perte de masse grasse", "Prise de muscle", "Recomposition", "Performance", "Santé générale"] },
      { key: "goal2", label: "Objectif secondaire", type: "choice", options: ["Endurance", "Force", "Mobilité", "Énergie au quotidien", "Aucun"] },
      { key: "past_fail", label: "Qu'est-ce qui a échoué avant ?", type: "text", placeholder: "J'abandonne vers la 4e semaine", help: "Calibre la difficulté et le volume." },
    ],
  },
  {
    title: "Niveau, temps et jours",
    intro: "Choisis d'abord le nombre de séances, puis les jours exacts.",
    fields: [
      { key: "level", label: "Expérience en musculation", type: "choice", options: ["Jamais", "Moins d'un an", "1 à 3 ans", "Plus de 3 ans"] },
      { key: "freq", label: "Séances par semaine", type: "choice", options: ["2", "3", "4", "5", "6"] },
      { key: "train_days", label: "Jours d'entraînement", type: "days" },
      { key: "dur", label: "Durée par séance", type: "choice", options: ["30 min", "45 min", "60 min", "90 min"] },
    ],
  },
  {
    title: "Santé et pathologies",
    intro: "Certaines réponses nécessitent un avis médical avant de démarrer.",
    fields: [
      { key: "patho1", label: "Pathologies articulaires", type: "multi", options: ["Lombalgie", "Hernie discale", "Épaule", "Genou", "Poignet", "Aucune"] },
      { key: "patho2", label: "Pathologies générales", type: "multi", options: ["Hypertension", "Diabète type 2", "Asthme", "Thyroïde", "Aucune"] },
      { key: "meds", label: "Traitements en cours", type: "text", placeholder: "Bêtabloquants, kiné 1×/sem…" },
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
      { key: "dislikes", label: "Aliments que tu refuses", type: "text", placeholder: "Brocoli, fromage bleu…" },
    ],
  },
  {
    title: "Vie quotidienne",
    fields: [
      { key: "sleep", label: "Sommeil moyen", type: "choice", options: ["< 6 h", "6–7 h", "7–8 h", "> 8 h"] },
      { key: "stress", label: "Niveau de stress", type: "choice", options: ["Faible", "Modéré", "Élevé"] },
      { key: "job", label: "Activité professionnelle", type: "choice", options: ["Sédentaire", "Debout", "Physique"] },
      { key: "cook", label: "Cuisine par semaine", type: "choice", options: ["Jamais", "2–3 fois", "Tous les jours"] },
    ],
  },
  {
    title: "Suivi",
    fields: [
      { key: "motivation", label: "Ce qui te fait tenir", type: "choice", options: ["Les chiffres", "La routine", "Le visuel", "La compétition", "L'accompagnement"] },
      { key: "weigh", label: "Pesée", type: "choice", options: ["Quotidienne", "Hebdomadaire", "Jamais"] },
      { key: "progress_photos", label: "Photos de progression", type: "choice", options: ["Toutes les 2 semaines", "Une fois par mois", "Non"] },
    ],
  },
];
