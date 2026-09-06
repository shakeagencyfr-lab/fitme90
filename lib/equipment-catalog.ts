// Catalogue du matériel de salle : une entrée par machine, avec sa photo.
//
// POURQUOI CE FICHIER. Le client décrivait sa salle en TEXTE LIBRE. Deux
// personnes équipées de la même machine écrivaient « presse », « leg press »
// et « presse à cuisses inclinée », et le générateur recevait trois matériels
// différents pour un seul. Pire, une faute de frappe donnait un matériel
// inconnu, donc inutilisable, sans que personne ne s'en aperçoive.
//
// Ici, une machine est un OBJET : une clé stable, un nom dans les deux
// langues, une famille comprise par le générateur, les groupes musculaires
// qu'elle sert (c'est ainsi qu'on la cherche quand on ne connaît pas son nom),
// une photo, et les façons dont on l'appelle vraiment. Trois surfaces s'en
// servent et parlent enfin la même langue :
//
//  - le questionnaire, où le client CLIQUE sa machine au lieu de la taper ;
//  - l'analyse des photos de salle, dont les réponses sont rattachées ici ;
//  - la génération du programme, qui reçoit un vocabulaire fermé.
//
// Les photos sont celles de la bibliothèque d'exercices : c'est la même
// machine, en usage. Aucune image en double, et le rangement reste unique.

import { EQUIPMENT_FAMILIES, equipmentKey } from "@/lib/equipment";

export type EquipmentFamily = (typeof EQUIPMENT_FAMILIES)[number];

/**
 * Groupe musculaire, pour la RECHERCHE, pas pour la physiologie. Un client qui
 * ne sait pas nommer sa machine sait dire « c'est pour les jambes ».
 */
export type MuscleGroup =
  | "pectoraux"
  | "dos"
  | "epaules"
  | "bras"
  | "jambes"
  | "fessiers"
  | "abdos"
  | "cardio"
  | "polyvalent";

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "polyvalent",
  "pectoraux",
  "dos",
  "epaules",
  "bras",
  "jambes",
  "fessiers",
  "abdos",
  "cardio",
];

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, { fr: string; en: string }> = {
  polyvalent: { fr: "Polyvalent", en: "All-round" },
  pectoraux: { fr: "Pectoraux", en: "Chest" },
  dos: { fr: "Dos", en: "Back" },
  epaules: { fr: "Épaules", en: "Shoulders" },
  bras: { fr: "Bras", en: "Arms" },
  jambes: { fr: "Jambes", en: "Legs" },
  fessiers: { fr: "Fessiers", en: "Glutes" },
  abdos: { fr: "Abdominaux", en: "Core" },
  cardio: { fr: "Cardio", en: "Cardio" },
};

export interface EquipmentItem {
  /** Identifiant stable. Ne change jamais : il part en base. */
  key: string;
  nom: string;
  name: string;
  famille: EquipmentFamily;
  groupes: MuscleGroup[];
  /** Clé d'un dossier de `public/exercises`, ou null si aucune photo ne convient. */
  photo: string | null;
  /** Ce que les gens écrivent vraiment, et ce que le modèle vision renvoie. */
  aliases: string[];
}

/** Le matériel d'une salle correctement équipée, plus l'essentiel du domicile. */
export const EQUIPMENT_CATALOG: readonly EquipmentItem[] = [
  // ───────────────────────────────────────────────────── poids libres, racks
  {
    key: "barre-olympique",
    nom: "Barre olympique et disques",
    name: "Olympic barbell and plates",
    famille: "barre olympique",
    groupes: ["polyvalent"],
    photo: "souleve-de-terre",
    aliases: ["barre", "barre olympique", "barbell", "barre droite", "disques", "poids libres"],
  },
  {
    key: "barre-ez",
    nom: "Barre EZ",
    name: "EZ curl bar",
    famille: "barre olympique",
    groupes: ["bras"],
    photo: "curl-barre",
    aliases: ["barre ez", "ez bar", "barre curl", "barre coudee"],
  },
  {
    key: "rack-squat",
    nom: "Rack à squat",
    name: "Squat rack",
    famille: "rack à squat",
    groupes: ["jambes", "polyvalent"],
    photo: "squat",
    aliases: ["rack", "cage", "power rack", "cage a squat", "squat rack", "rack a squat"],
  },
  {
    key: "smith-machine",
    nom: "Smith machine",
    name: "Smith machine",
    famille: "smith machine",
    groupes: ["jambes", "pectoraux", "polyvalent"],
    photo: "front-squat",
    aliases: ["smith", "smith machine", "machine guidee", "cadre guide", "barre guidee"],
  },
  {
    key: "halteres",
    nom: "Haltères",
    name: "Dumbbells",
    famille: "haltères",
    groupes: ["polyvalent"],
    photo: "curl-halteres",
    aliases: ["haltere", "halteres", "dumbbell", "dumbbells", "poids", "rack a halteres"],
  },
  {
    key: "kettlebells",
    nom: "Kettlebells",
    name: "Kettlebells",
    famille: "kettlebells",
    groupes: ["polyvalent"],
    // Le jeu d'images libres n'a aucun kettlebell : la seule photo approchante
    // montre des haltères, ce qui ferait cocher la mauvaise ligne.
    photo: null,
    aliases: ["kettlebell", "kettlebells", "girya", "kb"],
  },
  {
    key: "banc-plat",
    nom: "Banc plat",
    name: "Flat bench",
    famille: "banc (plat, incliné, décliné)",
    groupes: ["pectoraux"],
    photo: "developpe-couche",
    aliases: ["banc", "banc plat", "bench", "banc de musculation"],
  },
  {
    key: "banc-incline",
    nom: "Banc inclinable",
    name: "Adjustable bench",
    famille: "banc (plat, incliné, décliné)",
    groupes: ["pectoraux", "epaules"],
    photo: "developpe-incline",
    aliases: ["banc incline", "banc reglable", "incline bench", "banc inclinable"],
  },
  {
    key: "banc-decline",
    nom: "Banc décliné",
    name: "Decline bench",
    famille: "banc (plat, incliné, décliné)",
    groupes: ["pectoraux"],
    photo: "developpe-decline",
    aliases: ["banc decline", "decline bench"],
  },
  {
    key: "banc-lombaire",
    nom: "Banc à lombaires",
    name: "Back extension bench",
    famille: "machine abdominaux / lombaires",
    groupes: ["dos", "abdos"],
    photo: "extension-lombaire",
    aliases: ["banc lombaire", "hyperextension", "chaise romaine", "banc a dos", "back extension"],
  },
  {
    key: "barre-traction",
    nom: "Barre de traction",
    name: "Pull-up bar",
    famille: "barre de traction",
    groupes: ["dos", "bras"],
    photo: "tractions",
    aliases: ["barre de traction", "pull up bar", "barre fixe", "traction"],
  },
  {
    key: "tractions-assistees",
    nom: "Machine à tractions assistées",
    name: "Assisted pull-up machine",
    famille: "barre de traction",
    groupes: ["dos"],
    photo: "tractions-assistees",
    aliases: ["traction assistee", "assisted pull up", "machine a tractions", "gravitron"],
  },
  {
    key: "barres-paralleles",
    nom: "Barres parallèles (dips)",
    name: "Parallel bars (dips)",
    famille: "barres parallèles / dips",
    groupes: ["pectoraux", "bras"],
    photo: "dips",
    aliases: ["dips", "barres paralleles", "station dips", "dip station"],
  },

  // ────────────────────────────────────────────────────────────────── poulies
  {
    key: "poulie-haute",
    nom: "Poulie haute (tirage vertical)",
    name: "High pulley (lat pulldown)",
    famille: "poulie (haute, basse, vis-à-vis)",
    groupes: ["dos", "bras"],
    photo: "tirage-vertical",
    aliases: ["poulie haute", "lat pulldown", "tirage vertical", "tirage nuque", "poulie"],
  },
  {
    key: "poulie-basse",
    nom: "Poulie basse (tirage horizontal)",
    name: "Low pulley (seated row)",
    famille: "poulie (haute, basse, vis-à-vis)",
    groupes: ["dos", "jambes"],
    photo: "rowing-assis-poulie",
    aliases: ["poulie basse", "low pulley", "tirage horizontal", "rowing assis", "seated row"],
  },
  {
    key: "poulie-vis-a-vis",
    nom: "Poulie vis-à-vis",
    name: "Cable crossover",
    famille: "poulie (haute, basse, vis-à-vis)",
    groupes: ["pectoraux", "epaules"],
    photo: "ecarte-poulie",
    aliases: ["vis a vis", "cable crossover", "poulies croisees", "double poulie"],
  },

  // ────────────────────────────────────────────────────────── machines jambes
  {
    key: "presse-cuisses",
    nom: "Presse à cuisses",
    name: "Leg press",
    famille: "presse à cuisses",
    groupes: ["jambes", "fessiers"],
    photo: "presse-jambes",
    aliases: ["presse", "leg press", "presse a cuisses", "presse inclinee", "presse a jambes"],
  },
  {
    key: "hack-squat",
    nom: "Hack squat",
    name: "Hack squat machine",
    famille: "hack squat",
    groupes: ["jambes"],
    photo: "hack-squat",
    aliases: ["hack", "hack squat", "machine a hack squat"],
  },
  {
    key: "leg-extension",
    nom: "Leg extension",
    name: "Leg extension",
    famille: "leg extension",
    groupes: ["jambes"],
    photo: "leg-extension",
    aliases: ["leg extension", "extension de jambes", "machine a quadriceps"],
  },
  {
    key: "leg-curl-assis",
    nom: "Leg curl assis",
    name: "Seated leg curl",
    famille: "leg curl",
    groupes: ["jambes"],
    photo: "leg-curl-assis",
    aliases: ["leg curl assis", "seated leg curl"],
  },
  {
    key: "leg-curl-allonge",
    nom: "Leg curl allongé",
    name: "Lying leg curl",
    famille: "leg curl",
    groupes: ["jambes"],
    photo: "leg-curl-allonge",
    aliases: ["leg curl", "leg curl allonge", "lying leg curl", "machine a ischios"],
  },
  {
    key: "mollets-debout",
    nom: "Machine à mollets debout",
    name: "Standing calf raise",
    famille: "machine à mollets",
    groupes: ["jambes"],
    photo: "mollets-debout",
    aliases: ["mollets debout", "standing calf", "machine a mollets"],
  },
  {
    key: "mollets-assis",
    nom: "Machine à mollets assis",
    name: "Seated calf raise",
    famille: "machine à mollets",
    groupes: ["jambes"],
    photo: "mollets-assis",
    aliases: ["mollets assis", "seated calf"],
  },

  // ──────────────────────────────────────────────── machines fessiers, hanches
  {
    key: "abducteurs-machine",
    nom: "Machine à abducteurs",
    name: "Hip abduction machine",
    famille: "machine fessiers et hanches (abduction, adduction, hip thrust)",
    groupes: ["fessiers", "jambes"],
    photo: "abduction-hanche-machine",
    aliases: ["abducteur", "abducteurs", "abduction", "hip abduction", "machine a abducteurs"],
  },
  {
    key: "adducteurs-machine",
    nom: "Machine à adducteurs",
    name: "Hip adduction machine",
    famille: "machine fessiers et hanches (abduction, adduction, hip thrust)",
    groupes: ["jambes"],
    photo: "adducteurs-machine",
    aliases: ["adducteur", "adducteurs", "adduction", "hip adduction", "machine a adducteurs"],
  },
  {
    key: "hip-thrust-machine",
    nom: "Machine à hip thrust",
    name: "Hip thrust machine",
    famille: "machine fessiers et hanches (abduction, adduction, hip thrust)",
    groupes: ["fessiers"],
    // La seule photo de hip thrust montre une barre sur un banc, pas la
    // machine : elle ferait déclarer une machine que le client n'a pas.
    photo: null,
    aliases: ["hip thrust", "machine a hip thrust", "glute drive", "banc a hip thrust"],
  },
  {
    key: "kickback-machine",
    nom: "Machine à kickback fessier",
    name: "Glute kickback machine",
    famille: "machine fessiers et hanches (abduction, adduction, hip thrust)",
    groupes: ["fessiers"],
    photo: "kickback-fessier-poulie",
    aliases: ["kickback", "glute kickback", "machine a fessiers", "extension de hanche"],
  },

  // ───────────────────────────────────────────── machines pectoraux, dos, épaules
  {
    key: "pec-deck",
    nom: "Pec deck",
    name: "Pec deck",
    famille: "machine à pectoraux (pec deck, convergente)",
    groupes: ["pectoraux"],
    photo: "pec-deck",
    aliases: ["pec deck", "butterfly", "machine a pectoraux", "peck deck"],
  },
  {
    key: "developpe-couche-machine",
    nom: "Développé couché machine",
    name: "Chest press machine",
    famille: "machine à pectoraux (pec deck, convergente)",
    groupes: ["pectoraux"],
    photo: "developpe-couche-machine",
    aliases: ["chest press", "developpe couche machine", "presse pectoraux", "machine convergente"],
  },
  {
    key: "developpe-incline-machine",
    nom: "Développé incliné machine",
    name: "Incline press machine",
    famille: "machine à pectoraux (pec deck, convergente)",
    groupes: ["pectoraux"],
    photo: "developpe-incline-machine",
    aliases: ["incline press", "developpe incline machine"],
  },
  {
    key: "rowing-machine",
    nom: "Rowing machine (assis)",
    name: "Seated row machine",
    famille: "machine à dos (tirage vertical, tirage horizontal)",
    groupes: ["dos"],
    photo: "rowing-machine",
    aliases: ["rowing machine", "iso row", "tirage horizontal machine", "machine a dos"],
  },
  {
    key: "rowing-t-bar",
    nom: "T-bar row",
    name: "T-bar row",
    famille: "machine à dos (tirage vertical, tirage horizontal)",
    groupes: ["dos"],
    photo: "rowing-t-bar",
    aliases: ["t bar", "t-bar", "tbar row", "rowing t bar", "barre en t"],
  },
  {
    key: "developpe-epaules-machine",
    nom: "Développé épaules machine",
    name: "Shoulder press machine",
    famille: "machine à épaules",
    groupes: ["epaules"],
    photo: "developpe-epaules-machine",
    aliases: ["shoulder press", "developpe epaules machine", "machine a epaules"],
  },
  {
    key: "oiseau-machine",
    nom: "Machine à deltoïdes postérieurs",
    name: "Rear delt machine",
    famille: "machine à épaules",
    groupes: ["epaules", "dos"],
    photo: "oiseau-machine",
    aliases: ["reverse fly", "oiseau machine", "rear delt", "deltoide posterieur", "pec deck inverse"],
  },

  // ──────────────────────────────────────────── machines bras et abdominaux
  {
    key: "pupitre-biceps",
    nom: "Pupitre à biceps",
    name: "Preacher curl bench",
    famille: "machine à biceps / triceps",
    groupes: ["bras"],
    photo: "curl-pupitre",
    aliases: ["pupitre", "larry scott", "preacher curl", "banc a biceps", "machine a biceps"],
  },
  {
    key: "dips-machine",
    nom: "Machine à dips",
    name: "Dip machine",
    famille: "machine à biceps / triceps",
    groupes: ["bras", "pectoraux"],
    photo: "dips-machine",
    aliases: ["machine a dips", "dip machine", "machine a triceps"],
  },
  {
    key: "machine-abdos",
    nom: "Machine à abdominaux",
    name: "Ab crunch machine",
    famille: "machine abdominaux / lombaires",
    groupes: ["abdos"],
    // La photo disponible est un crunch à la poulie : ce n'est pas la machine
    // à abdominaux, et la confusion se paierait au moment de la génération.
    photo: null,
    aliases: ["machine a abdominaux", "ab machine", "crunch machine", "machine a abdos"],
  },
  {
    key: "ab-roller",
    nom: "Roue abdominale",
    name: "Ab wheel",
    famille: "machine abdominaux / lombaires",
    groupes: ["abdos"],
    photo: "ab-roller",
    aliases: ["roue abdominale", "ab wheel", "ab roller", "roulette abdos"],
  },

  // ────────────────────────────────────────────────────────────────── cardio
  {
    key: "tapis-course",
    nom: "Tapis de course",
    name: "Treadmill",
    famille: "tapis de course",
    groupes: ["cardio"],
    photo: "tapis-course",
    aliases: ["tapis", "tapis de course", "treadmill", "tapis roulant"],
  },
  {
    key: "velo",
    nom: "Vélo d'appartement",
    name: "Stationary bike",
    famille: "vélo / vélo assault",
    groupes: ["cardio"],
    photo: "velo-stationnaire",
    aliases: ["velo", "velo d appartement", "bike", "cyclisme", "spinning"],
  },
  {
    key: "velo-assault",
    nom: "Vélo assault (air bike)",
    name: "Assault bike",
    famille: "vélo / vélo assault",
    groupes: ["cardio"],
    // Aucune photo : le jeu d'images libres appelle « air bike » un tout autre
    // engin, et une photo fausse vaut moins qu'une illustration honnête.
    photo: null,
    aliases: ["assault bike", "air bike", "velo assault", "airbike"],
  },
  {
    key: "rameur",
    nom: "Rameur",
    name: "Rowing machine",
    famille: "rameur",
    groupes: ["cardio", "dos"],
    photo: "rameur",
    aliases: ["rameur", "rower", "concept 2", "ergometre"],
  },
  {
    key: "elliptique",
    nom: "Vélo elliptique",
    name: "Elliptical",
    famille: "elliptique",
    groupes: ["cardio"],
    photo: "elliptique",
    aliases: ["elliptique", "elliptical", "cross trainer"],
  },
  {
    key: "stairmaster",
    nom: "Machine à marches (stairmaster)",
    name: "Stair climber",
    famille: "escalier / stairmaster",
    groupes: ["cardio", "fessiers"],
    photo: "machine-a-marches",
    aliases: ["stairmaster", "escalier", "step mill", "machine a marches", "stepper"],
  },
  {
    key: "sled",
    nom: "Traîneau (sled)",
    name: "Push sled",
    famille: "traîneau / sled",
    groupes: ["cardio", "jambes"],
    photo: "sled-push",
    aliases: ["sled", "traineau", "prowler", "sled push"],
  },
  {
    key: "corde-a-sauter",
    nom: "Corde à sauter",
    name: "Jump rope",
    famille: "corde à sauter",
    groupes: ["cardio"],
    photo: "corde-a-sauter",
    aliases: ["corde a sauter", "jump rope", "corde"],
  },
  {
    key: "box",
    nom: "Box / step",
    name: "Plyo box / step",
    famille: "step / box",
    groupes: ["jambes", "cardio"],
    photo: "box-jump",
    aliases: ["box", "step", "plyo box", "caisse", "banc de step"],
  },

  // ───────────────────────────────────────────────────────────── accessoires
  {
    key: "elastiques",
    nom: "Élastiques",
    name: "Resistance bands",
    famille: "élastiques",
    groupes: ["polyvalent"],
    photo: "leg-curl-elastique",
    aliases: ["elastique", "elastiques", "bande", "resistance band", "mini band"],
  },
  {
    key: "trx",
    nom: "TRX / sangles de suspension",
    name: "TRX / suspension straps",
    famille: "TRX / sangles de suspension",
    groupes: ["polyvalent"],
    photo: "rowing-inverse",
    aliases: ["trx", "sangles", "suspension", "sangles de suspension"],
  },
  {
    key: "medecine-ball",
    nom: "Medecine ball / slam ball",
    name: "Medicine ball / slam ball",
    famille: "medecine ball / slam ball",
    groupes: ["abdos", "polyvalent"],
    photo: "russian-twist",
    aliases: ["medecine ball", "slam ball", "wall ball", "ballon lest"],
  },
  {
    key: "poids-du-corps",
    nom: "Poids du corps uniquement",
    name: "Bodyweight only",
    famille: "poids du corps uniquement",
    groupes: ["polyvalent"],
    photo: "pompes",
    aliases: ["poids du corps", "bodyweight", "body weight", "aucun materiel", "sans materiel"],
  },
  {
    key: "ballon-gym",
    nom: "Ballon de gym (swiss ball)",
    name: "Stability ball",
    famille: "ballon de gym (swiss ball)",
    groupes: ["abdos", "fessiers", "polyvalent"],
    photo: "crunch-ballon",
    aliases: ["ballon de gym", "swiss ball", "gym ball", "fitball", "ballon suisse", "stability ball", "physioball", "gros ballon"],
  },
  {
    key: "tapis-sol",
    nom: "Tapis de sol",
    name: "Exercise mat",
    famille: "poids du corps uniquement",
    groupes: ["abdos", "polyvalent"],
    photo: "gainage-planche",
    aliases: ["tapis de sol", "tapis de yoga", "mat", "sol"],
  },
];

/** Chemin de la photo d'une machine, ou null. */
export function equipmentPhoto(item: EquipmentItem): string | null {
  return item.photo ? `/exercises/${item.photo}/0.jpg` : null;
}

/** Index alias normalisé -> machine, construit une fois. */
const PAR_ALIAS = new Map<string, EquipmentItem>();
for (const item of EQUIPMENT_CATALOG) {
  for (const a of [item.key, item.nom, item.name, ...item.aliases]) {
    const k = equipmentKey(a);
    if (k && !PAR_ALIAS.has(k)) PAR_ALIAS.set(k, item);
  }
}

/**
 * Rattache un nom libre (saisi par le client, ou rendu par l'analyse photo) à
 * une machine du catalogue. Null quand rien ne correspond : on garde alors le
 * texte du client tel quel plutôt que de lui prêter du matériel qu'il n'a pas.
 */
export function matchEquipment(nom: string): EquipmentItem | null {
  const k = equipmentKey(nom ?? "");
  if (!k) return null;
  const exact = PAR_ALIAS.get(k);
  if (exact) return exact;
  // Rattachement partiel : « presse à cuisses inclinée 45° » contient « presse
  // a cuisses ». On exige l'alias entier pour ne pas rattacher « banc » à
  // « banc à lombaires » sur la seule présence du mot.
  let meilleur: { item: EquipmentItem; longueur: number } | null = null;
  for (const [alias, item] of PAR_ALIAS) {
    if (alias.length < 4) continue;
    if (!k.includes(alias)) continue;
    if (!meilleur || alias.length > meilleur.longueur) meilleur = { item, longueur: alias.length };
  }
  return meilleur?.item ?? null;
}

/**
 * Le nom canonique d'un matériel, dans la langue du client. Rendu inchangé
 * quand le catalogue ne le connaît pas : on ne prête pas au client du matériel
 * qu'il n'a pas.
 */
export function canonicalEquipment(nom: string, locale: "fr" | "en"): string {
  const item = matchEquipment(nom);
  if (!item) return (nom ?? "").trim();
  return locale === "en" ? item.name : item.nom;
}

/**
 * Les machines qui répondent à une recherche. Le texte porte sur le nom et les
 * alias (donc « leg press » trouve la presse à cuisses), le groupe filtre en
 * plus. Sans critère, tout le catalogue dans l'ordre d'écriture, qui suit le
 * parcours d'une salle plutôt que l'alphabet.
 */
export function searchEquipment(texte: string, groupe?: MuscleGroup | null): EquipmentItem[] {
  const q = equipmentKey(texte ?? "");
  return EQUIPMENT_CATALOG.filter((item) => {
    if (groupe && !item.groupes.includes(groupe)) return false;
    if (!q) return true;
    return [item.nom, item.name, ...item.aliases].some((a) => equipmentKey(a).includes(q));
  });
}
