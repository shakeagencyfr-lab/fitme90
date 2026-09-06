import type { Field, Section } from "@/lib/questionnaire";
import { translate, type Locale } from "./index";
import { QUIZ_DE } from "./quiz-de";

// Questionnaire dans les autres langues : traduction D'AFFICHAGE uniquement. Les valeurs
// enregistrées restent les libellés français (la génération, le coach IA et
// les règles de dépistage s'appuient dessus) ; l'IA reçoit à part la consigne
// de répondre dans la langue du client.

export interface FieldText {
  label: string;
  help?: string;
  placeholder?: string;
  options?: Record<string, string>;
}

const EN_SECTIONS: Record<string, { title: string; intro?: string }> = {
  "Qui es-tu ?": { title: "Who are you?", intro: "These answers feed your profile, your BMI and your heart-rate zones." },
  "Ton objectif": { title: "Your goal", intro: "The more precise it is, the closer the program sticks to what you want." },
  "Niveau, temps et jours": { title: "Level, time and days", intro: "Pick the number of sessions first, then the exact days." },
  "Santé et pathologies": { title: "Health and conditions", intro: "Some answers require medical advice before starting." },
  Alimentation: { title: "Nutrition", intro: "Strict exclusion from meals and the shopping list." },
  "Récupération & sommeil": { title: "Recovery & sleep" },
  "Mode de vie": { title: "Lifestyle" },
  "Motivation & accompagnement": { title: "Motivation & support", intro: "It helps the coach talk to you the right way." },
};

const EN_FIELDS: Record<string, FieldText> = {
  program_lang: { label: "Language of your program", help: "The language of your space, your program and your AI coach.", options: { Français: "Français", English: "English" } },
  name: { label: "First name", placeholder: "Lea" },
  sex: { label: "Biological sex", options: { Femme: "Female", Homme: "Male", Autre: "Other" } },
  age: { label: "Age", placeholder: "34", help: "Used for your estimated max heart rate (220 minus age)." },
  weight: { label: "Current weight (kg)", placeholder: "68" },
  height: { label: "Height (cm)", placeholder: "170" },
  rest: { label: "Resting heart rate (bpm)", placeholder: "62", help: "On waking, lying down." },
  goal: {
    label: "Main goal",
    options: { "Perte de masse grasse": "Fat loss", "Prise de muscle": "Muscle gain", Recomposition: "Recomposition", Performance: "Performance", "Santé générale": "General health" },
  },
  goal2: { label: "Secondary goal", options: { Endurance: "Endurance", Force: "Strength", Mobilité: "Mobility", "Énergie au quotidien": "Daily energy", Aucun: "None" } },
  deadline: {
    label: "A deadline or an event?",
    options: { "Aucune en particulier": "Nothing in particular", "Vacances / plage": "Holiday / beach", Compétition: "Competition", "Mariage / événement": "Wedding / event", "Bilan santé": "Health check" },
  },
  target_feeling: { label: "How do you want to feel at the end of your program?", placeholder: "More toned, less out of breath…" },
  past_fail: { label: "What failed before?", placeholder: "I give up around week 4", help: "Calibrates difficulty and volume." },
  level: { label: "Strength-training experience", options: { Jamais: "Never", "Moins d'un an": "Less than a year", "1 à 3 ans": "1 to 3 years", "Plus de 3 ans": "More than 3 years" } },
  training_history: { label: "Your sports background", placeholder: "2 years of CrossFit, stopped 6 months ago…" },
  freq: { label: "Sessions per week", help: "Each frequency has its own program template, built by a coach." },
  train_days: { label: "Training days", help: "Between 2 and 5 days, as many as the sessions you chose." },
  start_date: { label: "Program start date", help: "The exact day you want to start. Your program countdown and calendar begin on this date." },
  dur: { label: "Session length" },
  session_time: { label: "Preferred time to train", options: { Matin: "Morning", Midi: "Midday", "Après-midi": "Afternoon", Soir: "Evening", Variable: "Varies" } },
  cardio_pref: { label: "How you feel about cardio", options: { "J'aime": "I like it", Neutre: "Neutral", "Je déteste": "I hate it" } },
  loved_exos: { label: "Exercises you love / hate", placeholder: "I love hip thrusts, I hate burpees" },
  patho1: { label: "Joint conditions", options: { Lombalgie: "Lower-back pain", "Hernie discale": "Herniated disc", Épaule: "Shoulder", Genou: "Knee", Poignet: "Wrist", Aucune: "None" } },
  patho2: { label: "General conditions", options: { Hypertension: "High blood pressure", "Diabète type 2": "Type 2 diabetes", Asthme: "Asthma", Thyroïde: "Thyroid", Aucune: "None" } },
  meds: { label: "Current treatments", placeholder: "Beta blockers, physio once a week…" },
  past_injuries: { label: "Past injuries (healed)", placeholder: "Ankle sprain in 2022…" },
  mobility: { label: "Mobility limitations", options: { Épaules: "Shoulders", Hanches: "Hips", Chevilles: "Ankles", Dos: "Back", Aucune: "None" } },
  pregnancy: { label: "Pregnancy or postpartum", options: { "Non concerné": "Not applicable", Enceinte: "Pregnant", "Post-partum < 6 mois": "Postpartum < 6 months", "Post-partum > 6 mois": "Postpartum > 6 months" } },
  allerg: { label: "Allergies and intolerances", options: { Gluten: "Gluten", Lactose: "Lactose", "Fruits à coque": "Tree nuts", Œuf: "Egg", Poisson: "Fish", Crustacés: "Shellfish", Soja: "Soy", Aucune: "None" } },
  diet: { label: "Diet", options: { Omnivore: "Omnivore", Flexitarien: "Flexitarian", Végétarien: "Vegetarian", Végétalien: "Vegan", "Sans porc": "No pork", "Sans bœuf": "No beef" } },
  religion: { label: "Religious framework", options: { Aucun: "None", Halal: "Halal", Casher: "Kosher", Ramadan: "Ramadan", Carême: "Lent" } },
  dislikes: { label: "Foods you refuse", placeholder: "Broccoli, blue cheese…" },
  loved_foods: { label: "Foods you love", placeholder: "Chicken, sweet potato, dark chocolate…" },
  meals_per_day: { label: "Meals per day", options: { "5 et +": "5 or more" } },
  cook_time: { label: "Do you have time to cook?", options: { Oui: "Yes", "De temps en temps": "Sometimes", Non: "No" }, help: "Sets the level of the recipes suggested (elaborate, simple or quick assembly)." },
  budget: { label: "Food budget", options: { Serré: "Tight", Moyen: "Average", Confortable: "Comfortable" } },
  supplements: { label: "Current supplements", placeholder: "Whey, creatine, vitamin D…" },
  alcohol: { label: "Alcohol", options: { Jamais: "Never", Occasionnel: "Occasional", Régulier: "Regular" } },
  sleep: { label: "Average sleep" },
  sleep_quality: { label: "Sleep quality", options: { Bonne: "Good", Moyenne: "Average", Mauvaise: "Poor" } },
  stress: { label: "Stress level", options: { Faible: "Low", Modéré: "Moderate", Élevé: "High" } },
  energy: { label: "Daytime energy", options: { Élevée: "High", Variable: "Variable", Basse: "Low" } },
  job: { label: "Occupation", options: { Sédentaire: "Sedentary", Debout: "Standing", Physique: "Physical" } },
  steps: { label: "Daily activity (outside sport)", options: { "Sédentaire (< 5 000 pas)": "Sedentary (< 5,000 steps)", Modérée: "Moderate", "Active (> 10 000 pas)": "Active (> 10,000 steps)" } },
  schedule: { label: "Working hours", options: { Réguliers: "Regular", "Décalés / nuit": "Shifts / nights", Variables: "Variable" } },
  cook: { label: "Cooking per week", options: { Jamais: "Never", "2–3 fois": "2 to 3 times", "Tous les jours": "Every day" } },
  why_now: { label: "Why now?", placeholder: "Tired of feeling exhausted in the morning…" },
  motivation: { label: "What keeps you going", options: { "Les chiffres": "Numbers", "La routine": "Routine", "Le visuel": "How I look", "La compétition": "Competition", "L'accompagnement": "Being supported" } },
  coach_tone: { label: "The coach tone you prefer", options: { Bienveillant: "Caring", "Direct / cash": "Direct / blunt", "Technique / pédagogue": "Technical / educational", Motivateur: "Motivating" } },
  obstacles: {
    label: "What usually makes you drop out",
    options: { "Manque de temps": "Lack of time", "Manque de motivation": "Lack of motivation", Blessures: "Injuries", "Vie sociale": "Social life", "Résultats trop lents": "Results too slow", Ennui: "Boredom" },
  },
  weigh: { label: "Weigh-ins", options: { Quotidienne: "Daily", Hebdomadaire: "Weekly", Jamais: "Never" } },
};

/** Les traductions du questionnaire, par langue ; une langue absente lit l'anglais. */
export interface QuizTranslation {
  sections: Record<string, { title: string; intro?: string }>;
  fields: Record<string, FieldText>;
}

const TRANSLATIONS: Partial<Record<Locale, QuizTranslation>> = {
  en: { sections: EN_SECTIONS, fields: EN_FIELDS },
  de: QUIZ_DE,
};

function translationFor(locale: Locale): QuizTranslation | null {
  if (locale === "fr") return null;
  return TRANSLATIONS[locale] ?? TRANSLATIONS.en ?? null;
}

const DAY_CODES_FR = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

/** Libellé d'un jour (code LUN…DIM) dans la langue demandée. */
export function dayLabel(code: string, locale: Locale): string {
  const i = DAY_CODES_FR.indexOf(code);
  if (i < 0) return code;
  return translate(locale, "dates.dayCodes").split(",")[i] ?? code;
}

/** Titre et intro d'une section du questionnaire. */
export function sectionText(section: Section, locale: Locale): { title: string; intro?: string } {
  const tr = translationFor(locale)?.sections[section.title];
  return tr ? { title: tr.title, intro: tr.intro ?? section.intro } : { title: section.title, intro: section.intro };
}

/** Libellé, aide et placeholder d'un champ. */
export function fieldText(field: Field, locale: Locale): { label: string; help?: string; placeholder?: string } {
  const tr = translationFor(locale)?.fields[field.key];
  if (!tr) return { label: field.label, help: field.help, placeholder: field.placeholder };
  return { label: tr.label, help: tr.help, placeholder: tr.placeholder ?? field.placeholder };
}

/** Libellé d'une option (la valeur enregistrée reste la française). */
export function optionLabel(field: Field, value: string, locale: Locale): string {
  return translationFor(locale)?.fields[field.key]?.options?.[value] ?? value;
}
