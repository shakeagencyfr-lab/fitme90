// Alternatives d'exercice : moteur DÉTERMINISTE, sans IA.
//
// POURQUOI PLUS D'IA ICI. Remplacer un mouvement, c'est un choix fermé : on
// cherche un exercice qui travaille les mêmes muscles, que le matériel du
// client permet, et qui n'est pas déjà dans la séance. Trois filtres et un
// tri. Un modèle de langage faisait le même travail pour un dixième de
// centime par clic, avec deux défauts que le calcul n'a pas : il inventait
// parfois un mouvement absent de la bibliothèque (donc sans photo ni
// consignes), et il pouvait proposer une machine que le client n'a pas.
//
// Tout ce fichier est PUR : mêmes entrées, même sortie, testable sans réseau.

import {
  EXERCISE_LIBRARY,
  matchLibraryExercise,
  normalizeExerciseName,
  type LibraryExercise,
} from "@/lib/exercise-library";
import { EQUIPMENT_CATALOG, matchEquipment, type EquipmentFamily } from "@/lib/equipment-catalog";

/**
 * Famille de travail. Plus fine qu'un « groupe musculaire » affiché : c'est la
 * clé de substitution, donc elle sépare ce qui ne se remplace pas (un tirage
 * vertical ne remplace pas un rowing) et regroupe ce qui se remplace.
 */
export type Famille =
  | "quadriceps"
  | "ischios"
  | "fessiers"
  | "mollets"
  | "adducteurs"
  | "pectoraux"
  | "dos_vertical"
  | "dos_horizontal"
  | "epaules"
  | "epaules_arriere"
  | "trapezes"
  | "biceps"
  | "triceps"
  | "avant_bras"
  | "abdos"
  | "obliques"
  | "lombaires"
  | "cardio"
  | "corps_entier";

/**
 * Ce qu'il FAUT posséder pour exécuter le mouvement. Un exercice sans besoin
 * se fait au poids du corps : c'est le repli universel, et c'est pour ça que
 * chaque famille du haut du corps en compte au moins un.
 */
export type Besoin =
  | "barre"
  | "banc"
  | "halteres"
  | "kettlebell"
  | "poulie"
  | "machine"
  | "traction"
  | "dips"
  | "step"
  | "elastique"
  | "corde"
  | "rameur"
  | "velo"
  | "elliptique"
  | "tapis"
  | "roulette";

export interface Traits {
  /** Muscles travaillés, du plus au moins sollicité. Le PREMIER fait foi. */
  familles: Famille[];
  /** Matériels tous requis (ET, pas OU). Vide = poids du corps. */
  besoin: Besoin[];
  /**
   * Quand le mouvement demande UNE machine précise, ses clés au catalogue
   * (l'une d'elles suffit). Sans ça, « besoin : machine » se contentait de
   * n'importe quelle machine : un client équipé d'un seul pec deck se voyait
   * proposer un leg curl.
   */
  machine?: string[];
}

/**
 * La table de correspondance, une ligne par entrée de bibliothèque.
 *
 * Écrite à la main plutôt que devinée depuis le champ `muscle`, qui est du
 * texte libre destiné à l'affichage (« Chaîne postérieure (dos, fessiers,
 * ischios) », « Dos et biceps »). Un classifieur sur ces chaînes aurait été
 * plus court à écrire et faux à chaque nouvelle entrée ; ici, une entrée
 * ajoutée sans sa ligne est détectée par un test.
 */
export const EXERCISE_TRAITS: Record<string, Traits> = {
  // ─────────────────────────────────────────────────────────── bas du corps
  "squat": { familles: ["quadriceps", "fessiers"], besoin: ["barre"] },
  "squat-poids-du-corps": { familles: ["quadriceps", "fessiers", "adducteurs"], besoin: [] },
  "presse-jambes": { familles: ["quadriceps", "fessiers"], besoin: ["machine"], machine: ["presse-cuisses"] },
  "leg-extension": { familles: ["quadriceps"], besoin: ["machine"], machine: ["leg-extension"] },
  "front-squat": { familles: ["quadriceps", "fessiers"], besoin: ["barre"] },
  "hack-squat": { familles: ["quadriceps"], besoin: ["machine"], machine: ["hack-squat"] },
  "wall-sit": { familles: ["quadriceps"], besoin: [] },
  "fentes": { familles: ["quadriceps", "fessiers"], besoin: [] },
  "fentes-marchees": { familles: ["quadriceps", "fessiers"], besoin: [] },
  "fente-bulgare": { familles: ["quadriceps", "fessiers"], besoin: ["banc"] },
  "step-up": { familles: ["quadriceps", "fessiers"], besoin: ["step"] },
  "box-jump": { familles: ["quadriceps", "cardio"], besoin: ["step"] },
  "thruster": { familles: ["quadriceps", "epaules"], besoin: ["halteres"] },

  "souleve-de-terre": { familles: ["ischios", "fessiers", "lombaires"], besoin: ["barre"] },
  "souleve-de-terre-roumain": { familles: ["ischios", "fessiers"], besoin: ["halteres"] },
  "souleve-de-terre-sumo": { familles: ["fessiers", "ischios", "adducteurs"], besoin: ["barre"] },
  "good-morning": { familles: ["ischios", "lombaires"], besoin: ["barre"] },
  "leg-curl-allonge": { familles: ["ischios"], besoin: ["machine"], machine: ["leg-curl-allonge", "leg-curl-assis"] },
  "leg-curl-assis": { familles: ["ischios"], besoin: ["machine"], machine: ["leg-curl-assis", "leg-curl-allonge"] },

  "hip-thrust": { familles: ["fessiers", "ischios"], besoin: ["banc"] },
  "glute-bridge": { familles: ["fessiers", "ischios"], besoin: [] },
  "extension-fessier-poulie": { familles: ["fessiers"], besoin: ["poulie"] },
  "kettlebell-swing": { familles: ["fessiers", "ischios", "cardio"], besoin: ["kettlebell"] },

  "mollets-debout": { familles: ["mollets"], besoin: [] },
  "mollets-assis": { familles: ["mollets"], besoin: ["machine"], machine: ["mollets-assis", "mollets-debout"] },
  "adducteurs-machine": { familles: ["adducteurs"], besoin: ["machine"], machine: ["adducteurs-machine"] },
  "abduction-hanche-machine": { familles: ["fessiers", "adducteurs"], besoin: ["machine"], machine: ["abducteurs-machine"] },
  "abduction-hanche-debout": { familles: ["fessiers"], besoin: [] },
  "adduction-hanche-poulie": { familles: ["adducteurs"], besoin: ["poulie"] },
  "kickback-fessier-poulie": { familles: ["fessiers"], besoin: ["poulie"] },
  "pont-fessier-unilateral": { familles: ["fessiers", "ischios"], besoin: [] },
  "pull-through-poulie": { familles: ["fessiers", "ischios"], besoin: ["poulie"] },
  "fentes-arriere": { familles: ["quadriceps", "fessiers"], besoin: [] },
  "fentes-statiques": { familles: ["quadriceps", "fessiers"], besoin: [] },
  "squat-gobelet": { familles: ["quadriceps", "fessiers"], besoin: ["halteres"] },
  "squat-sumo-haltere": { familles: ["quadriceps", "fessiers", "adducteurs"], besoin: ["halteres"] },
  "leg-curl-debout": { familles: ["ischios"], besoin: ["machine"], machine: ["leg-curl-allonge", "leg-curl-assis"] },
  "leg-curl-elastique": { familles: ["ischios"], besoin: ["elastique"] },
  "leg-curl-suspension": { familles: ["ischios", "fessiers"], besoin: ["elastique"] },
  "machine-a-marches": { familles: ["cardio", "quadriceps", "fessiers"], besoin: ["machine"], machine: ["stairmaster"] },
  "velo-stationnaire": { familles: ["cardio", "quadriceps"], besoin: ["velo"] },
  "sled-push": { familles: ["quadriceps", "fessiers", "cardio"], besoin: ["machine"], machine: ["sled"] },
  "developpe-incline-machine": { familles: ["pectoraux", "epaules", "triceps"], besoin: ["machine"], machine: ["developpe-incline-machine", "developpe-couche-machine"] },
  "developpe-couche-machine": { familles: ["pectoraux", "triceps"], besoin: ["machine"], machine: ["developpe-couche-machine"] },
  "rowing-machine": { familles: ["dos_horizontal", "biceps"], besoin: ["machine"], machine: ["rowing-machine"] },
  "developpe-epaules-machine": { familles: ["epaules", "triceps"], besoin: ["machine"], machine: ["developpe-epaules-machine"] },
  "developpe-epaules-halteres-assis": { familles: ["epaules", "triceps"], besoin: ["halteres", "banc"] },
  "elevations-laterales-poulie": { familles: ["epaules"], besoin: ["poulie"] },
  "oiseau-poulie": { familles: ["epaules_arriere", "dos_horizontal"], besoin: ["poulie"] },
  "oiseau-machine": { familles: ["epaules_arriere", "dos_horizontal"], besoin: ["machine"], machine: ["oiseau-machine", "pec-deck"] },
  "tirage-vertical-prise-serree": { familles: ["dos_vertical", "biceps"], besoin: ["poulie"] },
  "tractions-assistees": { familles: ["dos_vertical", "biceps"], besoin: ["traction"] },
  "rowing-inverse": { familles: ["dos_horizontal", "biceps"], besoin: ["elastique"] },
  "dips-machine": { familles: ["triceps", "pectoraux"], besoin: ["machine"], machine: ["dips-machine"] },

  // ─────────────────────────────────────────────────────────── haut, poussée
  "developpe-couche": { familles: ["pectoraux", "triceps", "epaules"], besoin: ["barre", "banc"] },
  "developpe-couche-halteres": { familles: ["pectoraux", "triceps"], besoin: ["halteres", "banc"] },
  "developpe-incline": { familles: ["pectoraux", "epaules"], besoin: ["halteres", "banc"] },
  "developpe-decline": { familles: ["pectoraux"], besoin: ["barre", "banc"] },
  "pompes": { familles: ["pectoraux", "triceps", "epaules"], besoin: [] },
  "dips": { familles: ["pectoraux", "triceps"], besoin: ["dips"] },
  "ecarte-halteres": { familles: ["pectoraux"], besoin: ["halteres", "banc"] },
  "ecarte-poulie": { familles: ["pectoraux"], besoin: ["poulie"] },
  "pec-deck": { familles: ["pectoraux"], besoin: ["machine"], machine: ["pec-deck"] },
  "pull-over": { familles: ["pectoraux", "dos_vertical"], besoin: ["halteres", "banc"] },

  // ─────────────────────────────────────────────────────────── haut, tirage
  "tirage-vertical": { familles: ["dos_vertical", "biceps"], besoin: ["poulie"] },
  "tractions": { familles: ["dos_vertical", "biceps"], besoin: ["traction"] },
  "traction-supination": { familles: ["dos_vertical", "biceps"], besoin: ["traction"] },
  "tirage-bras-tendus": { familles: ["dos_vertical"], besoin: ["poulie"] },
  "tirage-elastique": { familles: ["dos_vertical", "biceps"], besoin: ["elastique"] },
  "rowing-halteres": { familles: ["dos_horizontal", "biceps"], besoin: ["halteres"] },
  "rowing-barre": { familles: ["dos_horizontal", "biceps"], besoin: ["barre"] },
  "rowing-assis-poulie": { familles: ["dos_horizontal", "biceps"], besoin: ["poulie"] },
  "rowing-t-bar": { familles: ["dos_horizontal"], besoin: ["barre"] },
  "rowing-elastique": { familles: ["dos_horizontal", "biceps"], besoin: ["elastique"] },
  "haussements-epaules": { familles: ["trapezes"], besoin: ["halteres"] },

  // ─────────────────────────────────────────────────────────────── épaules
  "developpe-epaules-halteres": { familles: ["epaules", "triceps"], besoin: ["halteres"] },
  "developpe-militaire": { familles: ["epaules", "triceps"], besoin: ["barre"] },
  "developpe-arnold": { familles: ["epaules"], besoin: ["halteres"] },
  "push-press": { familles: ["epaules", "quadriceps"], besoin: ["barre"] },
  "elevations-laterales": { familles: ["epaules"], besoin: ["halteres"] },
  "elevations-frontales": { familles: ["epaules"], besoin: ["halteres"] },
  "face-pull": { familles: ["epaules_arriere", "dos_horizontal", "trapezes"], besoin: ["poulie"] },
  "oiseau": { familles: ["epaules_arriere", "trapezes"], besoin: ["halteres"] },

  // ─────────────────────────────────────────────────────────────────── bras
  "curl-halteres": { familles: ["biceps"], besoin: ["halteres"] },
  "curl-barre": { familles: ["biceps"], besoin: ["barre"] },
  "curl-marteau": { familles: ["biceps", "avant_bras"], besoin: ["halteres"] },
  "curl-concentration": { familles: ["biceps"], besoin: ["halteres"] },
  "curl-pupitre": { familles: ["biceps"], besoin: ["machine"], machine: ["pupitre-biceps"] },
  "extension-triceps-poulie": { familles: ["triceps"], besoin: ["poulie"] },
  "extension-triceps-couche": { familles: ["triceps"], besoin: ["barre", "banc"] },
  "extension-triceps-verticale": { familles: ["triceps"], besoin: ["halteres"] },
  "kickback-triceps": { familles: ["triceps"], besoin: ["halteres"] },
  "dips-banc": { familles: ["triceps"], besoin: [] },
  "marche-fermier": { familles: ["avant_bras", "corps_entier"], besoin: ["halteres"] },

  // ─────────────────────────────────────────────────────────────── tronc
  "gainage-planche": { familles: ["abdos"], besoin: [] },
  "gainage-lateral": { familles: ["obliques", "abdos"], besoin: [] },
  "dead-bug": { familles: ["abdos"], besoin: [] },
  "crunch": { familles: ["abdos"], besoin: [] },
  "crunch-poulie": { familles: ["abdos"], besoin: ["poulie"] },
  "releve-jambes-allonge": { familles: ["abdos"], besoin: [] },
  "releve-jambes-suspendu": { familles: ["abdos"], besoin: ["traction"] },
  "russian-twist": { familles: ["obliques"], besoin: [] },
  "pallof-press": { familles: ["obliques", "abdos"], besoin: ["poulie"] },
  "ab-roller": { familles: ["abdos"], besoin: ["roulette"] },
  "superman": { familles: ["lombaires"], besoin: [] },
  "extension-lombaire": { familles: ["lombaires", "fessiers"], besoin: ["machine"], machine: ["banc-lombaire"] },

  // ─────────────────────────────────────────────────────────────── cardio
  "burpees": { familles: ["cardio", "corps_entier"], besoin: [] },
  "mountain-climber": { familles: ["cardio", "abdos"], besoin: [] },
  "jumping-jack": { familles: ["cardio"], besoin: [] },
  "corde-a-sauter": { familles: ["cardio", "mollets"], besoin: ["corde"] },
  "rameur": { familles: ["cardio", "dos_horizontal"], besoin: ["rameur"] },
  "air-bike": { familles: ["cardio"], besoin: ["velo"] },
  "elliptique": { familles: ["cardio"], besoin: ["elliptique"] },
  "tapis-course": { familles: ["cardio"], besoin: ["tapis"] },
};

/**
 * Mots qui, dans le matériel déclaré par le client, prouvent un besoin.
 *
 * Le matériel arrive en texte libre (saisie manuelle ou lecture de photos) :
 * on ne peut donc pas comparer des identifiants, seulement chercher des
 * indices. Un mot présent suffit ; l'ordre n'a pas d'importance.
 */
const INDICES: Record<Besoin, string[]> = {
  barre: ["barre olympique", "barre droite", "barre ez", "barbell", "rack", "smith"],
  banc: ["banc", "bench"],
  // Un kettlebell fait le travail d'un haltère sur tout ce qui se tient à la main.
  halteres: ["haltere", "halteres", "dumbbell", "kettlebell", "girya"],
  kettlebell: ["kettlebell", "girya"],
  poulie: ["poulie", "cable", "vis a vis", "tirage", "machine a dos"],
  machine: [
    "machine", "presse", "hack", "leg extension", "leg curl", "pec deck",
    "convergente", "pupitre", "larry", "multifonction",
  ],
  traction: ["barre de traction", "traction", "pull up", "pullup", "chin up", "chinup"],
  dips: ["dips", "barres paralleles", "paralleles"],
  // Un banc, une marche, une caisse : tout ce sur quoi on monte.
  step: ["step", "box", "caisse", "banc", "marche"],
  elastique: ["elastique", "bande", "band", "trx", "sangle", "suspension"],
  corde: ["corde a sauter", "corde", "skipping"],
  rameur: ["rameur", "rowing machine", "concept"],
  velo: ["velo", "bike", "assault", "cyclette"],
  elliptique: ["elliptique", "elliptical"],
  tapis: ["tapis de course", "tapis roulant", "treadmill", "course"],
  roulette: ["roulette", "ab wheel", "ab roller"],
};

/** Normalise un nom de matériel : minuscules, sans accents ni ponctuation. */
function normEquip(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Familles du catalogue qui valent « une machine guidée ». */
const FAMILLES_MACHINE: readonly EquipmentFamily[] = [
  "smith machine",
  "presse à cuisses",
  "hack squat",
  "leg extension",
  "leg curl",
  "machine à mollets",
  "machine à pectoraux (pec deck, convergente)",
  "machine à dos (tirage vertical, tirage horizontal)",
  "machine à épaules",
  "machine à biceps / triceps",
  "machine abdominaux / lombaires",
  "machine fessiers et hanches (abduction, adduction, hip thrust)",
  "escalier / stairmaster",
  "traîneau / sled",
];

/**
 * Les clés du catalogue qui satisfont chaque besoin.
 *
 * C'est la traduction du besoin dans le vocabulaire commun : le client coche
 * ses machines dans un catalogue, l'analyse photo y est rattachée, et le
 * moteur compare enfin des identifiants au lieu de chercher des mots.
 */
const CLES_BESOIN: Record<Besoin, string[]> = {
  barre: ["barre-olympique", "barre-ez", "rack-squat", "smith-machine"],
  banc: ["banc-plat", "banc-incline", "banc-decline"],
  // Un kettlebell fait le travail d'un haltère sur tout ce qui se tient à la main.
  halteres: ["halteres", "kettlebells"],
  kettlebell: ["kettlebells"],
  poulie: ["poulie-haute", "poulie-basse", "poulie-vis-a-vis"],
  // La roue abdominale est rangée dans une famille de machines faute de mieux,
  // mais ce n'est pas une machine : elle ne rend possible aucun exercice guidé.
  machine: EQUIPMENT_CATALOG.filter(
    (i) => FAMILLES_MACHINE.includes(i.famille) && i.key !== "ab-roller",
  ).map((i) => i.key),
  traction: ["barre-traction", "tractions-assistees"],
  dips: ["barres-paralleles", "dips-machine"],
  // Un banc, une marche, une caisse : tout ce sur quoi on monte.
  step: ["box", "banc-plat", "banc-incline", "banc-decline"],
  elastique: ["elastiques", "trx"],
  corde: ["corde-a-sauter"],
  rameur: ["rameur"],
  velo: ["velo", "velo-assault"],
  elliptique: ["elliptique"],
  tapis: ["tapis-course"],
  roulette: ["ab-roller"],
};

/** Mots qui trahissent une machine sans dire laquelle. */
const MOTS_MACHINE = ["machine", "multifonction", "appareil", "poste", "station"];

/**
 * Le matériel déclaré couvre-t-il TOUS les besoins du mouvement ?
 *
 * DEUX LECTURES, DANS CET ORDRE. Chaque ligne de matériel est d'abord
 * rattachée au catalogue : c'est une comparaison d'identifiants, donc exacte,
 * et c'est le cas de tout client passé par le sélecteur ou par l'analyse
 * photo. Ce qui n'est pas reconnu (matériel exotique, salles décrites à la
 * main avant le catalogue) garde l'ancien filet par indices textuels, sans
 * quoi ces clients perdraient d'un coup tout leur matériel.
 *
 * « Poids du corps uniquement » ne couvre aucun besoin, ce qui est exactement
 * le comportement voulu.
 */
export function equipmentSupports(
  traits: Pick<Traits, "besoin" | "machine">,
  equipment: readonly string[],
): boolean {
  if (traits.besoin.length === 0) return true;
  if (equipment.length === 0) return false;

  const cles = new Set<string>();
  const inconnus: string[] = [];
  for (const nom of equipment) {
    const item = matchEquipment(nom);
    if (item) {
      cles.add(item.key);
      continue;
    }
    const n = normEquip(nom);
    if (n) inconnus.push(n);
  }
  if (cles.size === 0 && inconnus.length === 0) return false;

  const couvre = (b: Besoin) =>
    CLES_BESOIN[b].some((k) => cles.has(k)) ||
    INDICES[b].some((mot) => inconnus.some((e) => e.includes(mot)));
  if (!traits.besoin.every(couvre)) return false;

  // Machine nommée : on exige CETTE machine, pas « une machine ». Un client
  // qui n'a qu'un pec deck ne doit pas se voir proposer un leg curl.
  if (traits.machine?.length) {
    if (traits.machine.some((k) => cles.has(k))) return true;
    // Une ligne libre qui parle quand même d'une machine sans dire laquelle :
    // on ne peut pas trancher, et vider la séance serait pire que se tromper.
    return inconnus.some((e) => MOTS_MACHINE.some((m) => e.includes(m)));
  }
  return true;
}

/** Traits d'une entrée de bibliothèque (jamais undefined en pratique : test). */
export function traitsOf(entry: LibraryExercise): Traits | null {
  return EXERCISE_TRAITS[entry.key] ?? null;
}

/** Un exercice est-il du cardio (au sens « durée » et non « séries × reps ») ? */
export function isCardioKey(key: string): boolean {
  return EXERCISE_TRAITS[key]?.familles[0] === "cardio";
}

export interface AlternativeInput {
  /** Le mouvement à remplacer, tel qu'il figure dans le plan. */
  name: string;
  /** Matériel réellement disponible chez le client (texte libre). */
  equipment: readonly string[];
  /** Noms déjà présents dans la séance (dont l'exercice d'origine). */
  avoid?: readonly string[];
  /** Le plan considère-t-il cet exercice comme du cardio ? */
  cardio?: boolean;
}

/**
 * Score d'un candidat face au mouvement d'origine. Plus haut = meilleur.
 *
 * Trois idées, dans l'ordre d'importance :
 *  1. la famille PRINCIPALE doit correspondre, sinon ce n'est pas la même
 *     séance (on tolère une correspondance secondaire, mais loin derrière) ;
 *  2. les familles secondaires partagées rapprochent le ressenti ;
 *  3. à égalité, le mouvement qui demande le MOINS de matériel gagne : c'est
 *     celui qui a le plus de chances d'être réellement praticable ici et
 *     maintenant, ce qui est tout l'objet du bouton.
 */
function score(origine: Traits, candidat: Traits): number {
  const [principale] = origine.familles;
  const set = new Set(candidat.familles);
  let s = 0;
  if (candidat.familles[0] === principale) s += 100;
  else if (set.has(principale)) s += 60;
  else return -1; // famille principale absente : ce n'est pas un remplacement.
  for (const f of origine.familles.slice(1)) if (set.has(f)) s += 8;
  s -= candidat.besoin.length * 3;
  return s;
}

/**
 * Le meilleur remplaçant, ou null si le catalogue n'a rien à proposer.
 *
 * Rendre null est un résultat acceptable : mieux vaut dire « rien de
 * disponible » que servir un mouvement qui ne travaille pas la même chose ou
 * que le client ne peut pas faire.
 */
export function pickAlternative(input: AlternativeInput): LibraryExercise | null {
  const origine = matchLibraryExercise(input.name);
  const traits = origine ? traitsOf(origine) : null;
  // Sans point de départ identifiable, aucun remplacement n'est justifiable.
  if (!origine || !traits) return null;

  const exclus = new Set(
    [input.name, ...(input.avoid ?? [])].map((n) => normalizeExerciseName(String(n))).filter(Boolean),
  );

  let best: { entry: LibraryExercise; score: number } | null = null;
  for (const entry of EXERCISE_LIBRARY) {
    if (entry.key === origine.key) continue;
    if (exclus.has(normalizeExerciseName(entry.name))) continue;
    const t = traitsOf(entry);
    if (!t) continue;
    // Un cardio ne remplace pas de la musculation, et réciproquement : le
    // format de la carte (durée vs séries) change du tout au tout.
    if (isCardioKey(entry.key) !== isCardioKey(origine.key)) continue;
    if (!equipmentSupports(t, input.equipment)) continue;
    const s = score(traits, t);
    if (s < 0) continue;
    if (!best || s > best.score) best = { entry, score: s };
  }
  return best ? best.entry : null;
}

export interface PlanShape {
  name: string;
  sets: number;
  reps: string;
  load: string;
  note: string;
  rest?: number;
  cardio: boolean;
  duration: string;
  zone: string;
}

/**
 * Le remplaçant, mis au format d'un exercice de plan.
 *
 * Le volume d'origine est CONSERVÉ (séries, répétitions, repos) : c'est le
 * programme qui décide de la charge de travail du jour, pas le choix du
 * mouvement. Seule la charge est vidée, parce qu'un poids valable au développé
 * couché ne veut plus rien dire aux pompes, et qu'une valeur reprise telle
 * quelle serait un mauvais conseil.
 */
export function alternativeExercise(
  input: AlternativeInput & { sets?: number; reps?: string; rest?: number; duration?: string; zone?: string },
): PlanShape | null {
  const entry = pickAlternative(input);
  if (!entry) return null;
  const cardio = isCardioKey(entry.key);
  return {
    name: entry.name,
    sets: cardio ? 0 : Math.max(1, Math.trunc(input.sets || 3)),
    reps: cardio ? "" : (input.reps || "8-12"),
    load: "",
    // La première consigne de la fiche : elle vient de la bibliothèque, donc
    // elle est juste et elle est déjà relue. Rien à inventer.
    note: entry.guide.cues[0] ?? "",
    rest: input.rest,
    cardio,
    duration: cardio ? (input.duration || "15 min") : "",
    zone: cardio ? (input.zone || "") : "",
  };
}
