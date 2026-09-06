// Bibliothèque d'exercices (PURE, testable : aucune dépendance serveur).
// Chaque entrée porte un nom FR, des alias (pour reconnaître les noms générés par
// l'IA), le groupe musculaire, deux images (position de départ / d'arrivée, en
// domaine public) et des consignes pour débutants. Le résolveur serveur
// (lib/exercise-guide) superpose : média du coach > cette bibliothèque > IA.
//
// Images : jeu « free-exercise-db » (yuhonas), licence Unlicense (domaine public),
// auto-hébergées dans /public/exercises/<clé>/{0,1}.jpg.

import type { Traits } from "./exercise-traits";
import { EXERCISE_LIBRARY_MAISON } from "./exercise-library-maison";

export interface ExerciseGuide {
  steps: string[]; // exécution, pas à pas
  cues: string[]; // conseils clés
  mistakes: string[]; // erreurs fréquentes
}

export interface LibraryExercise {
  key: string;
  name: string; // nom FR affiché
  muscle: string; // groupe musculaire (FR)
  aliases: string[]; // formes reconnues (normalisées au moment du match)
  guide: ExerciseGuide;
  /** Pas de photo : le visuel affiché est l'illustration du groupe musculaire. */
  noPhoto?: boolean;
  /**
   * Familles travaillées et matériel requis, quand la fiche les porte
   * elle-même (bibliothèque maison). Les fiches de base ont les leurs dans
   * la table de `lib/exercise-alternatives`.
   */
  traits?: Traits;
  /**
   * Dossier d'images à utiliser, quand ce n'est pas celui de la clé.
   *
   * Sert aux fiches qui décrivent le MÊME mouvement sur un autre matériel : le
   * hip thrust à la machine, c'est le hip thrust, dos calé, hanche qui s'ouvre.
   * La photo du mouvement les sert toutes les deux, et la dupliquer sur le
   * disque ferait deux fichiers pour une seule image.
   */
  photo?: string;
}

/** Deux images (départ / arrivée) d'un dossier de la bibliothèque. */
export function libraryFrames(key: string): string[] {
  return [`/exercises/${key}/0.jpg`, `/exercises/${key}/1.jpg`];
}

/**
 * Les images d'une fiche, vide quand elle n'en a pas.
 *
 * Passe TOUJOURS par ici plutôt que par `libraryFrames(entry.key)` : c'est le
 * seul endroit qui connaît `noPhoto` et le renvoi vers un autre dossier.
 *
 * À ne pas confondre avec la photo du CATALOGUE DE MATÉRIEL : là, l'image doit
 * permettre de RECONNAÎTRE une machine avant de la cocher, donc la photo d'un
 * hip thrust à la barre y serait trompeuse et reste absente. Ici, la photo
 * montre le MOUVEMENT à quelqu'un qui est déjà devant sa machine.
 */
export function framesOf(entry: LibraryExercise): string[] {
  if (entry.noPhoto) return [];
  return libraryFrames(entry.photo ?? entry.key);
}

// Mots-outils (grammaire) à ignorer. On GARDE le matériel (haltères, barre,
// poulie, machine...) car il distingue souvent deux variantes d'un mouvement ;
// le rapprochement se fait ensuite par jetons (voir matchLibraryExercise).
const NOISE = new Set([
  "a", "au", "aux", "la", "le", "les", "l", "de", "du", "des", "d", "un", "une",
  "avec", "en", "sur", "et", "the", "of", "with", "to", "for", "aux", "your",
  "prise", "grip", "medium",
]);

/** Normalise un nom d'exercice pour le rapprochement (minuscules, sans accents,
 *  sans ponctuation ni mots-outils). Le matériel est conservé. */
export function normalizeExerciseName(raw: string): string {
  const base = (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const tokens = base.split(/\s+/).filter((t) => t && !NOISE.has(t));
  return tokens.join(" ");
}

/**
 * Radical léger : « fentes » et « fente », « haltères » et « haltère »,
 * « marches » et « marche » doivent se rencontrer. On retire un « s » final sur
 * les mots d'au moins quatre lettres ; « dips » devient « dip » des deux côtés,
 * ce qui ne change rien au rapprochement.
 */
function stem(t: string): string {
  return t.length >= 4 && t.endsWith("s") ? t.slice(0, -1) : t;
}

function tokensOf(s: string): string[] {
  return normalizeExerciseName(s).split(" ").filter(Boolean).map(stem);
}

/**
 * Mots de MOUVEMENT : ce qui dit ce qu'on fait, par opposition au matériel,
 * au muscle ou au réglage. Quand le nom cherché et l'alias en portent chacun,
 * ils doivent en partager au moins un : « abduction de hanche à la poulie »
 * ne doit jamais tomber sur « extension hanche poulie » parce que deux mots
 * sur trois coïncident. Sans cette règle, la fiche affichée décrivait un
 * autre exercice, et le bouton « autre exercice » partait dans une autre
 * famille musculaire.
 */
const MOVEMENT = new Set(
  [
    "squat", "fente", "souleve", "deadlift", "hip", "thrust", "pont", "bridge", "presse", "press",
    "extension", "curl", "leg", "developpe", "pompe", "push", "dip", "tirage", "traction", "pull",
    "chin", "rowing", "row", "elevation", "raise", "oiseau", "fly", "flye", "face", "crunch",
    "planche", "plank", "gainage", "releve", "twist", "rameur", "corde", "burpee", "mountain",
    "climber", "jumping", "jack", "swing", "thruster", "haussement", "shrug", "good", "morning",
    "step", "box", "jump", "wall", "sit", "marche", "walk", "hack", "front", "ecarte", "pec",
    "deck", "kickback", "dead", "bug", "pallof", "ab", "roller", "air", "bike", "elliptique",
    "elliptical", "tapis", "treadmill", "course", "abduction", "adduction", "superman", "mollet",
    "calf", "velo", "sled", "traineau", "pousse", "poussee", "kettlebell", "farmer", "fermier",
    "tractions", "lunge", "hyperextension", "lombaire", "clean", "snatch", "arrache", "epaule",
    "jackknife", "skipping", "bond", "saut", "etoile", "talon", "battement", "rentre", "toucher",
    "coude", "araignee", "spider", "crawl", "scaption", "rotation", "monster", "apart", "windmill",
    "moulin", "figure", "turkish", "get", "renegade", "passe", "lancer", "throw", "slam",
    "flexion", "bend", "scapulaire", "scapular", "inverse", "inverted", "claquee", "plyo",
    "equilibre", "handstand", "sumo", "high", "thruster", "sit", "up", "pedalage", "bicycle",
  ].map(stem),
);

function movementTokens(tokens: readonly string[]): string[] {
  return tokens.filter((t) => MOVEMENT.has(t));
}

/** La bibliothèque écrite pour la salle. La maison est dans son propre fichier. */
const EXERCISE_LIBRARY_BASE: LibraryExercise[] = [
  {
    key: "squat",
    name: "Squat",
    muscle: "Cuisses et fessiers",
    aliases: ["squat", "squat barre", "back squat", "squat barre au rack", "squat barre lourd"],
    guide: {
      steps: [
        "Barre sur le haut du dos (ou poids près de la poitrine), pieds largeur d'épaules, pointes légèrement ouvertes.",
        "Inspire, gaine le ventre, descends en poussant les hanches vers l'arrière comme pour t'asseoir.",
        "Descends jusqu'à ce que les cuisses soient au moins parallèles au sol, genoux dans l'axe des pieds.",
        "Remonte en poussant dans les talons, souffle en fin de montée.",
      ],
      cues: ["Garde le dos droit et la poitrine haute", "Genoux qui suivent la direction des orteils", "Talons toujours au sol"],
      mistakes: ["Arrondir le bas du dos", "Décoller les talons", "Rentrer les genoux vers l'intérieur"],
    },
  },
  {
    key: "squat-poids-du-corps",
    name: "Squat au poids du corps",
    muscle: "Cuisses et fessiers",
    aliases: ["squat au poids du corps", "squat poids du corps", "squat sans charge", "air squat", "bodyweight squat"],
    guide: {
      steps: [
        "Debout, pieds largeur d'épaules, mains derrière la tête (ou bras tendus devant toi pour l'équilibre).",
        "Descends les hanches vers l'arrière et le bas, dos droit.",
        "Cuisses parallèles au sol si possible, puis remonte en poussant dans les talons.",
      ],
      cues: ["Poitrine haute", "Poids sur les talons", "Contrôle la descente"],
      mistakes: ["Se pencher trop en avant", "Genoux qui rentrent"],
    },
  },
  {
    key: "presse-jambes",
    name: "Presse à cuisses",
    muscle: "Cuisses et fessiers",
    aliases: ["presse a cuisses", "presse jambes", "leg press", "presse inclinee", "presse a jambes"],
    guide: {
      steps: [
        "Assis dans la machine, pieds largeur d'épaules sur la plateforme.",
        "Déverrouille et descends la plateforme en pliant les genoux vers la poitrine.",
        "Arrête quand les genoux forment environ 90°, puis pousse sans verrouiller complètement les genoux en haut.",
      ],
      cues: ["Bas du dos plaqué au dossier", "Pousse dans les talons", "Ne verrouille pas les genoux"],
      mistakes: ["Descendre trop bas et décoller les fesses", "Verrouiller brutalement les genoux"],
    },
  },
  {
    key: "leg-extension",
    name: "Leg extension",
    muscle: "Quadriceps",
    aliases: ["leg extension", "extension jambes", "extension des cuisses", "extension quadriceps"],
    guide: {
      steps: [
        "Assis, réglé pour que l'axe soit aligné avec tes genoux, chevilles sous le rouleau.",
        "Tends les jambes en contractant l'avant des cuisses.",
        "Marque un temps en haut, puis redescends lentement.",
      ],
      cues: ["Mouvement contrôlé", "Serre le quadriceps en haut", "Ne balance pas"],
      mistakes: ["Charge trop lourde et à-coups", "Redescente relâchée"],
    },
  },
  {
    key: "fentes",
    name: "Fentes",
    muscle: "Cuisses et fessiers",
    aliases: ["fentes", "fente", "lunges", "fentes avant"],
    guide: {
      steps: [
        "Debout, un poids dans chaque main (ou au poids du corps).",
        "Avance d'un grand pas et descends le genou arrière vers le sol.",
        "Les deux genoux à environ 90°, buste droit, puis pousse pour revenir.",
        "Alterne les jambes.",
      ],
      cues: ["Buste droit et gainé", "Genou avant au-dessus de la cheville", "Grand pas pour protéger le genou"],
      mistakes: ["Pas trop court (genou qui dépasse l'orteil)", "Buste penché en avant"],
    },
  },
  {
    key: "fentes-marchees",
    name: "Fentes marchées",
    muscle: "Cuisses et fessiers",
    aliases: ["fentes marchees", "walking lunge", "fentes en marchant"],
    guide: {
      steps: [
        "Avance d'un grand pas et descends en fente.",
        "Pousse sur la jambe avant pour ramener la jambe arrière et enchaîner un pas.",
        "Continue à avancer en alternant, buste droit.",
      ],
      cues: ["Regard devant", "Gainage constant", "Contrôle chaque descente"],
      mistakes: ["Se précipiter", "Perdre l'équilibre en penchant le buste"],
    },
  },
  {
    key: "souleve-de-terre",
    name: "Soulevé de terre",
    muscle: "Chaîne postérieure (dos, fessiers, ischios)",
    aliases: ["souleve de terre", "deadlift", "souleve de terre classique", "deadlift barre"],
    guide: {
      steps: [
        "Pieds largeur de hanches, barre au-dessus du milieu du pied.",
        "Attrape la barre, dos plat, épaules légèrement devant la barre.",
        "Pousse dans le sol et tends les hanches et les genoux en même temps, barre proche du corps.",
        "Debout, hanches serrées, puis redescends en poussant les hanches vers l'arrière.",
      ],
      cues: ["Dos plat du début à la fin", "Barre qui frôle les jambes", "Pousse le sol avec les pieds"],
      mistakes: ["Arrondir le dos", "Tirer avec les bras", "Barre qui s'éloigne du corps"],
    },
  },
  {
    key: "souleve-de-terre-roumain",
    name: "Soulevé de terre roumain",
    muscle: "Ischios et fessiers",
    aliases: ["souleve de terre roumain", "romanian deadlift", "rdl", "souleve de terre jambes tendues", "souleve roumain", "souleve roumain halteres", "souleve roumain barre", "rdl"],
    guide: {
      steps: [
        "Debout, barre ou haltères devant les cuisses, léger fléchissement des genoux.",
        "Pousse les hanches vers l'arrière en descendant le poids le long des jambes.",
        "Descends jusqu'à sentir un étirement des ischios (bas du dos toujours plat).",
        "Reviens en poussant les hanches vers l'avant.",
      ],
      cues: ["Genoux presque fixes", "Dos plat", "Poids près des jambes"],
      mistakes: ["Plier les genoux comme un squat", "Arrondir le dos", "Descendre trop bas au détriment du dos"],
    },
  },
  {
    key: "leg-curl-allonge",
    name: "Leg curl allongé",
    muscle: "Ischio-jambiers",
    aliases: ["leg curl allonge", "leg curl couche", "lying leg curl", "curl ischios allonge", "leg curl machine", "leg curl a la machine", "machine leg curl", "leg curl machine allonge"],
    guide: {
      steps: [
        "Allongé sur le ventre, chevilles sous le rouleau.",
        "Ramène les talons vers les fessiers en contractant l'arrière des cuisses.",
        "Marque un temps, puis redescends lentement.",
      ],
      cues: ["Hanches plaquées au banc", "Contrôle la descente", "Serre les ischios en haut"],
      mistakes: ["Décoller le bassin", "À-coups"],
    },
  },
  {
    key: "leg-curl-assis",
    name: "Leg curl assis",
    muscle: "Ischio-jambiers",
    aliases: ["leg curl assis", "seated leg curl", "curl ischios assis"],
    guide: {
      steps: [
        "Assis, jambes tendues, chevilles au-dessus du rouleau, cuisses bloquées.",
        "Plie les genoux pour ramener les talons sous le siège.",
        "Marque un temps puis reviens lentement.",
      ],
      cues: ["Dos calé au dossier", "Mouvement contrôlé", "Amplitude complète"],
      mistakes: ["Charge trop lourde", "Redescente relâchée"],
    },
  },
  {
    key: "hip-thrust",
    name: "Hip thrust",
    muscle: "Fessiers",
    aliases: ["hip thrust", "poussee de hanches", "thrust", "hip thrust barre", "hip thrust haltere", "hip thrust au banc"],
    guide: {
      steps: [
        "Haut du dos appuyé sur un banc, barre (ou poids) sur le bassin, pieds à plat.",
        "Pousse dans les talons pour monter le bassin jusqu'à aligner épaules, hanches et genoux.",
        "Serre les fessiers en haut, puis redescends en contrôle.",
      ],
      cues: ["Menton rentré, regard vers l'avant", "Serre fort les fessiers en haut", "Tibias verticaux en position haute"],
      mistakes: ["Cambrer le bas du dos en haut", "Amplitude trop courte"],
    },
  },
  {
    key: "hip-thrust-machine",
    name: "Hip thrust à la machine",
    muscle: "Fessiers",
    aliases: ["hip thrust machine", "machine a hip thrust", "hip thrust guide", "glute drive", "banc a hip thrust"],
    // Aucune photo du jeu ne montre cette machine : la photo du hip thrust à
    // la barre ferait croire à un autre matériel. Illustration du muscle.
    noPhoto: true,
    guide: {
      steps: [
        "Assis dans la machine, dos calé, coussin sur le bassin et pieds à plat largeur de hanches.",
        "Pousse dans les talons pour ouvrir la hanche jusqu'à aligner épaules, hanches et genoux.",
        "Serre les fessiers une seconde en haut, puis reviens en retenant la charge.",
      ],
      cues: ["Menton rentré, côtes basses", "Tibias verticaux en position haute", "La charge monte par la hanche, pas par le dos"],
      mistakes: ["Cambrer le bas du dos pour monter plus haut", "Laisser la charge redescendre d'un coup"],
    },
  },
  {
    key: "glute-bridge",
    name: "Pont fessier",
    muscle: "Fessiers",
    aliases: ["pont fessier", "glute bridge", "releve de bassin", "bridge"],
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, pieds à plat proches des fessiers.",
        "Pousse dans les talons pour décoller le bassin.",
        "Serre les fessiers en haut, puis redescends sans poser complètement.",
      ],
      cues: ["Gaine le ventre", "Serre les fessiers", "Ne cambre pas le bas du dos"],
      mistakes: ["Pousser avec le bas du dos", "Monter trop haut en cambrant"],
    },
  },
  {
    key: "mollets-debout",
    name: "Extension des mollets debout",
    muscle: "Mollets",
    aliases: ["mollets debout", "extension mollets", "calf raise", "standing calf raise", "mollets"],
    guide: {
      steps: [
        "Debout, avant des pieds sur un support, talons dans le vide.",
        "Monte le plus haut possible sur la pointe des pieds.",
        "Marque un temps en haut, puis descends les talons sous le niveau du support.",
      ],
      cues: ["Amplitude complète (haut et bas)", "Temps de contraction en haut", "Mouvement contrôlé"],
      mistakes: ["Rebondir sans contrôle", "Amplitude trop courte"],
    },
  },
  {
    key: "developpe-couche",
    name: "Développé couché",
    muscle: "Pectoraux",
    aliases: ["developpe couche", "bench press", "developpe couche barre", "developpe couche a la barre"],
    guide: {
      steps: [
        "Allongé sur le banc, pieds au sol, prise un peu plus large que les épaules.",
        "Descends la barre en contrôle jusqu'au bas des pectoraux, coudes à environ 45°.",
        "Pousse la barre vers le haut jusqu'à tendre les bras.",
      ],
      cues: ["Omoplates serrées et basses", "Légère cambrure naturelle", "Poignets solides au-dessus des coudes"],
      mistakes: ["Rebondir la barre sur la poitrine", "Écarter les coudes à 90°", "Décoller les fessiers du banc"],
    },
  },
  {
    key: "developpe-couche-halteres",
    name: "Développé couché haltères",
    muscle: "Pectoraux",
    aliases: ["developpe couche halteres", "dumbbell bench press", "developpe halteres couche"],
    guide: {
      steps: [
        "Allongé, un haltère dans chaque main au-dessus des pectoraux.",
        "Descends les haltères en contrôle au niveau de la poitrine.",
        "Pousse vers le haut en rapprochant légèrement les haltères.",
      ],
      cues: ["Omoplates serrées", "Coudes à environ 45°", "Contrôle la descente"],
      mistakes: ["Descente non contrôlée", "Coudes trop écartés"],
    },
  },
  {
    key: "developpe-incline",
    name: "Développé incliné",
    muscle: "Haut des pectoraux",
    aliases: ["developpe incline", "incline press", "developpe incline halteres", "incline bench press"],
    guide: {
      steps: [
        "Banc incliné à 30-45°, haltères ou barre au-dessus du haut de la poitrine.",
        "Descends en contrôle vers le haut des pectoraux.",
        "Pousse vers le haut sans verrouiller brutalement.",
      ],
      cues: ["Omoplates serrées", "Coudes sous les poignets", "Amplitude complète"],
      mistakes: ["Banc trop incliné (travail épaules)", "Rebond en bas"],
    },
  },
  {
    key: "pompes",
    name: "Pompes",
    muscle: "Pectoraux, épaules, triceps",
    aliases: ["pompes", "pushup", "push up", "pompe"],
    guide: {
      steps: [
        "En planche, mains un peu plus larges que les épaules, corps gainé et aligné.",
        "Descends la poitrine vers le sol, coudes à environ 45°.",
        "Pousse pour remonter en gardant le corps droit.",
      ],
      cues: ["Gaine le ventre et les fessiers", "Corps en ligne droite", "Coudes pas trop écartés"],
      mistakes: ["Cambrer ou creuser le dos", "Amplitude trop courte", "Tête qui plonge en avant"],
    },
  },
  {
    key: "dips",
    name: "Dips",
    muscle: "Pectoraux et triceps",
    aliases: ["dips", "dip", "dips barres paralleles"],
    guide: {
      steps: [
        "Suspendu aux barres parallèles, bras tendus, corps gainé.",
        "Descends en pliant les coudes jusqu'à ce que les épaules soient au niveau des coudes.",
        "Pousse pour remonter jusqu'à tendre les bras.",
      ],
      cues: ["Léger buste penché en avant pour les pectoraux", "Épaules basses", "Descente contrôlée"],
      mistakes: ["Descendre trop bas (douleur d'épaule)", "Se balancer"],
    },
  },
  {
    key: "tirage-vertical",
    name: "Tirage vertical (poulie haute)",
    muscle: "Dos (grand dorsal)",
    aliases: ["tirage vertical", "lat pulldown", "tirage poulie haute", "tirage nuque", "tirage devant"],
    guide: {
      steps: [
        "Assis, cuisses bloquées, prise large sur la barre.",
        "Tire la barre vers le haut de la poitrine en descendant les coudes vers le bas.",
        "Serre le dos en bas, puis remonte en contrôle jusqu'à l'étirement.",
      ],
      cues: ["Descends les épaules avant de tirer", "Sors la poitrine", "Tire avec les coudes, pas les mains"],
      mistakes: ["Se pencher trop en arrière", "Tirer derrière la nuque", "Utiliser l'élan"],
    },
  },
  {
    key: "tractions",
    name: "Tractions",
    muscle: "Dos (grand dorsal)",
    aliases: ["tractions", "traction", "pullup", "pull up", "tractions pronation"],
    guide: {
      steps: [
        "Suspendu à la barre, prise un peu plus large que les épaules.",
        "Tire ton corps vers le haut jusqu'à passer le menton au-dessus de la barre.",
        "Descends en contrôle jusqu'à tendre les bras.",
      ],
      cues: ["Descends les épaules", "Sors la poitrine", "Mouvement complet"],
      mistakes: ["Se balancer", "Amplitude partielle", "Monter les épaules vers les oreilles"],
    },
  },
  {
    key: "rowing-halteres",
    name: "Rowing haltère",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing haltere", "rowing halteres", "dumbbell row", "rowing un bras", "rowing haltere un bras", "tirage haltere", "rowing haltere au banc"],
    guide: {
      steps: [
        "Un genou et une main sur un banc, dos plat, haltère dans l'autre main.",
        "Tire l'haltère vers la hanche en ramenant le coude vers l'arrière.",
        "Serre l'omoplate en haut, puis redescends en contrôle.",
      ],
      cues: ["Dos plat et parallèle au sol", "Tire avec le coude", "Serre l'omoplate"],
      mistakes: ["Tourner le buste", "Tirer avec le bras seul", "Arrondir le dos"],
    },
  },
  {
    key: "rowing-barre",
    name: "Rowing barre",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing barre", "barbell row", "rowing buste penche", "bent over row"],
    guide: {
      steps: [
        "Debout, buste penché vers l'avant à environ 45°, dos plat, barre bras tendus.",
        "Tire la barre vers le bas du ventre en ramenant les coudes vers l'arrière.",
        "Serre le dos, puis redescends en contrôle.",
      ],
      cues: ["Dos plat et gainé", "Coudes proches du corps", "Regard vers le sol devant toi"],
      mistakes: ["Se redresser pendant le tirage", "Arrondir le dos", "Utiliser l'élan des jambes"],
    },
  },
  {
    key: "rowing-assis-poulie",
    name: "Rowing assis à la poulie",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing assis", "seated cable row", "tirage horizontal", "rowing poulie basse", "tirage assis"],
    guide: {
      steps: [
        "Assis, pieds calés, poignée en main, buste droit.",
        "Tire la poignée vers le ventre en ramenant les coudes vers l'arrière.",
        "Serre les omoplates, puis reviens en contrôle jusqu'à l'étirement.",
      ],
      cues: ["Buste stable et droit", "Serre les omoplates", "Épaules basses"],
      mistakes: ["Se balancer d'avant en arrière", "Arrondir le dos en fin d'étirement"],
    },
  },
  {
    key: "developpe-epaules-halteres",
    name: "Développé épaules haltères",
    muscle: "Épaules",
    aliases: ["developpe epaules", "developpe epaules halteres", "shoulder press", "dumbbell shoulder press", "developpe militaire halteres", "developpe militaire halteres debout", "developpe epaules debout halteres"],
    guide: {
      steps: [
        "Assis ou debout, gainé, haltères au niveau des épaules, paumes vers l'avant.",
        "Pousse les haltères vers le haut jusqu'à presque tendre les bras.",
        "Redescends en contrôle au niveau des épaules.",
      ],
      cues: ["Gaine le ventre", "Ne cambre pas le bas du dos", "Poignets au-dessus des coudes"],
      mistakes: ["Cambrer excessivement", "Descendre trop bas", "Verrouiller brutalement en haut"],
    },
  },
  {
    key: "developpe-militaire",
    name: "Développé militaire",
    muscle: "Épaules",
    aliases: ["developpe militaire", "military press", "overhead press", "developpe epaules barre", "ohp"],
    guide: {
      steps: [
        "Debout, barre sur le haut de la poitrine, mains un peu plus larges que les épaules.",
        "Gaine le ventre et les fessiers, pousse la barre au-dessus de la tête.",
        "Verrouille en haut avec la barre au-dessus de la nuque, puis redescends.",
      ],
      cues: ["Gainage complet", "Serre les fessiers", "Tête légèrement en arrière au passage de la barre"],
      mistakes: ["Cambrer le bas du dos", "Pousser avec les jambes (sauf push press)"],
    },
  },
  {
    key: "elevations-laterales",
    name: "Élévations latérales",
    muscle: "Épaules (deltoïde latéral)",
    aliases: ["elevations laterales", "lateral raise", "side lateral raise", "elevation laterale"],
    guide: {
      steps: [
        "Debout, un haltère dans chaque main le long du corps, léger fléchissement des coudes.",
        "Monte les bras sur les côtés jusqu'à la hauteur des épaules.",
        "Redescends lentement.",
      ],
      cues: ["Coudes légèrement plus hauts que les poignets", "Mouvement contrôlé", "Épaules basses"],
      mistakes: ["Utiliser l'élan", "Monter au-dessus des épaules", "Charge trop lourde"],
    },
  },
  {
    key: "elevations-frontales",
    name: "Élévations frontales",
    muscle: "Épaules (deltoïde antérieur)",
    aliases: ["elevations frontales", "front raise", "elevation frontale", "elevations avant"],
    guide: {
      steps: [
        "Debout, haltères devant les cuisses.",
        "Monte un ou les deux bras devant toi jusqu'à hauteur des épaules.",
        "Redescends en contrôle.",
      ],
      cues: ["Léger fléchissement des coudes", "Gaine le tronc", "Pas d'élan"],
      mistakes: ["Se balancer", "Monter trop haut"],
    },
  },
  {
    key: "face-pull",
    name: "Face pull",
    muscle: "Épaules arrière et haut du dos",
    aliases: ["face pull", "tirage visage", "tirage nuque corde"],
    guide: {
      steps: [
        "Poulie à hauteur du visage, corde en main, bras tendus.",
        "Tire la corde vers ton visage en écartant les mains, coudes hauts.",
        "Serre les omoplates, puis reviens en contrôle.",
      ],
      cues: ["Coudes hauts", "Serre l'arrière des épaules", "Mouvement lent"],
      mistakes: ["Tirer trop bas", "Utiliser l'élan"],
    },
  },
  {
    key: "curl-halteres",
    name: "Curl biceps haltères",
    muscle: "Biceps",
    aliases: ["curl halteres", "curl biceps", "dumbbell curl", "bicep curl", "curl alterne"],
    guide: {
      steps: [
        "Debout, un haltère dans chaque main, bras le long du corps, paumes vers l'avant.",
        "Plie les coudes pour monter les haltères vers les épaules.",
        "Serre les biceps en haut, puis redescends lentement.",
      ],
      cues: ["Coudes fixes le long du corps", "Contrôle la descente", "Pas d'élan du buste"],
      mistakes: ["Balancer le corps", "Bouger les coudes vers l'avant", "Descente trop rapide"],
    },
  },
  {
    key: "curl-barre",
    name: "Curl biceps barre",
    muscle: "Biceps",
    aliases: ["curl barre", "barbell curl", "curl biceps barre", "curl a la barre"],
    guide: {
      steps: [
        "Debout, barre en prise supination (paumes vers le haut), largeur d'épaules.",
        "Plie les coudes pour monter la barre vers la poitrine.",
        "Serre les biceps, puis redescends en contrôle.",
      ],
      cues: ["Coudes fixes", "Buste immobile", "Amplitude complète"],
      mistakes: ["Se balancer", "Avancer les coudes", "Charge trop lourde"],
    },
  },
  {
    key: "curl-marteau",
    name: "Curl marteau",
    muscle: "Biceps et avant-bras",
    aliases: ["curl marteau", "hammer curl", "curl prise neutre"],
    guide: {
      steps: [
        "Debout, haltères en prise neutre (paumes qui se font face).",
        "Monte les haltères en gardant les poignets neutres.",
        "Redescends lentement.",
      ],
      cues: ["Poignets neutres tout du long", "Coudes fixes", "Contrôle"],
      mistakes: ["Tourner les poignets", "Balancer le corps"],
    },
  },
  {
    key: "extension-triceps-poulie",
    name: "Extension triceps à la poulie",
    muscle: "Triceps",
    aliases: ["extension triceps poulie", "triceps pushdown", "pushdown", "extension triceps corde", "poulie triceps"],
    guide: {
      steps: [
        "Face à la poulie haute, corde ou barre en main, coudes collés au corps.",
        "Tends les bras vers le bas en gardant les coudes fixes.",
        "Serre les triceps en bas, puis remonte en contrôle.",
      ],
      cues: ["Coudes collés au corps", "Seuls les avant-bras bougent", "Buste droit"],
      mistakes: ["Écarter les coudes", "Se pencher pour pousser", "Utiliser l'élan"],
    },
  },
  {
    key: "dips-banc",
    name: "Dips sur banc",
    muscle: "Triceps",
    aliases: ["dips banc", "bench dips", "dips triceps banc"],
    guide: {
      steps: [
        "Mains sur le bord d'un banc derrière toi, jambes tendues devant.",
        "Descends le bassin en pliant les coudes vers l'arrière.",
        "Pousse pour remonter jusqu'à tendre les bras.",
      ],
      cues: ["Coudes vers l'arrière, pas écartés", "Épaules basses", "Reste proche du banc"],
      mistakes: ["Descendre trop bas (douleur d'épaule)", "Écarter les coudes"],
    },
  },
  {
    key: "extension-triceps-couche",
    name: "Extension triceps couché (barre au front)",
    muscle: "Triceps",
    aliases: ["extension triceps couche", "barre au front", "skull crusher", "lying triceps extension", "triceps couche"],
    guide: {
      steps: [
        "Allongé, barre ou haltères bras tendus au-dessus des épaules.",
        "Plie les coudes pour descendre le poids vers le front, coudes fixes.",
        "Tends les bras pour revenir sans verrouiller brutalement.",
      ],
      cues: ["Coudes fixes et serrés", "Seuls les avant-bras bougent", "Contrôle la descente"],
      mistakes: ["Écarter les coudes", "Bouger les épaules", "Descendre trop vite"],
    },
  },
  {
    key: "gainage-planche",
    name: "Gainage (planche)",
    muscle: "Sangle abdominale",
    aliases: ["gainage", "planche", "plank", "gainage ventral", "gainage planche"],
    guide: {
      steps: [
        "Sur les avant-bras et la pointe des pieds, coudes sous les épaules.",
        "Gaine le ventre et les fessiers pour aligner tête, dos et jambes.",
        "Tiens la position en respirant, sans cambrer ni creuser.",
      ],
      cues: ["Corps en ligne droite", "Serre le ventre et les fessiers", "Respire calmement"],
      mistakes: ["Cambrer le bas du dos", "Monter les fesses trop haut", "Bloquer la respiration"],
    },
  },
  {
    key: "crunch",
    name: "Crunch",
    muscle: "Abdominaux",
    aliases: ["crunch", "crunchs", "crunches", "releve de buste", "abdos crunch"],
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, mains derrière la tête sans tirer.",
        "Enroule le haut du dos pour décoller les omoplates.",
        "Souffle en montant, contracte les abdos, puis redescends en contrôle.",
      ],
      cues: ["Ne tire pas sur la nuque", "Mouvement d'enroulement", "Contrôle la descente"],
      mistakes: ["Tirer la tête avec les mains", "Monter avec l'élan", "Décoller tout le dos"],
    },
  },
  {
    key: "releve-jambes-suspendu",
    name: "Relevé de jambes suspendu",
    muscle: "Abdominaux (bas)",
    aliases: ["releve de jambes suspendu", "hanging leg raise", "releve jambes barre", "leg raise"],
    guide: {
      steps: [
        "Suspendu à la barre, corps gréé et stable.",
        "Monte les jambes (tendues ou genoux pliés) vers l'avant en enroulant le bassin.",
        "Redescends lentement sans te balancer.",
      ],
      cues: ["Enroule le bassin en haut", "Contrôle la descente", "Évite de te balancer"],
      mistakes: ["Utiliser l'élan", "Ne monter que les jambes sans enrouler le bassin"],
    },
  },
  {
    key: "crunch-poulie",
    name: "Crunch à la poulie",
    muscle: "Abdominaux",
    aliases: ["crunch poulie", "cable crunch", "crunch a la corde", "abdos poulie"],
    guide: {
      steps: [
        "À genoux face à la poulie haute, corde de chaque côté de la tête.",
        "Enroule le buste vers le bas en contractant les abdos.",
        "Reviens en contrôle sans te redresser complètement.",
      ],
      cues: ["Mouvement d'enroulement du buste", "Hanches fixes", "Contracte les abdos"],
      mistakes: ["Tirer avec les bras", "Bouger les hanches au lieu du buste"],
    },
  },
  {
    key: "crunch-machine",
    name: "Crunch à la machine",
    muscle: "Abdominaux",
    aliases: ["crunch machine", "machine a abdominaux", "machine a abdos", "ab crunch machine", "abdominal crunch machine", "crunch guide"],
    guide: {
      steps: [
        "Assis, dos contre le dossier, poignées au-dessus des épaules et pieds calés.",
        "Enroule le buste vers l'avant en rentrant les côtes, sans tirer avec les bras.",
        "Reviens en retenant la charge, sans te redresser complètement.",
      ],
      cues: ["Enroulement du buste, pas une flexion de hanche", "Expire en enroulant", "Hanches immobiles"],
      mistakes: ["Tirer sur les poignées avec les bras", "Charge trop lourde qui bloque l'enroulement"],
    },
  },
  {
    key: "slam-ball",
    name: "Slam ball (lancer au sol)",
    muscle: "Abdominaux et corps entier",
    aliases: ["slam ball", "medecine ball slam", "ball slam", "lancer de ballon au sol", "med ball slam", "overhead slam"],
    guide: {
      steps: [
        "Debout, pieds largeur d'épaules, ballon lesté tenu à deux mains.",
        "Monte le ballon au-dessus de la tête en montant sur la pointe des pieds.",
        "Projette-le au sol devant toi en enroulant le buste, ramasse et recommence.",
      ],
      cues: ["Le ventre gaine avant le lancer", "Descends chercher le ballon en pliant les genoux", "Souffle au moment du lancer"],
      mistakes: ["Arrondir le dos pour ramasser le ballon", "Lancer avec les bras seuls, sans le buste"],
    },
  },
  {
    key: "russian-twist",
    name: "Russian twist",
    muscle: "Obliques",
    aliases: ["russian twist", "twist russe", "rotations abdos", "obliques twist"],
    guide: {
      steps: [
        "Assis, buste légèrement incliné en arrière, pieds décollés ou au sol.",
        "Tourne le buste d'un côté puis de l'autre, mains ou poids qui suivent.",
        "Garde le dos droit et le ventre gainé.",
      ],
      cues: ["Rotation du buste, pas seulement des bras", "Dos droit", "Contrôle le rythme"],
      mistakes: ["Arrondir le dos", "Aller trop vite sans contrôle"],
    },
  },

  // ── Mouvements supplémentaires (visuel : illustration du groupe musculaire) ──
  {
    key: "rameur",
    name: "Rameur",
    muscle: "Dos et cardio",
    aliases: ["rameur", "ergometre", "cardio rameur", "aviron", "rameur leger", "rameur hiit", "rowing ergometre"],
    guide: {
      steps: [
        "Attrape la poignée, jambes fléchies, bras tendus, dos droit.",
        "Pousse fort sur les jambes, puis tire la poignée vers le bas des côtes.",
        "Reviens dans l'ordre inverse : bras, puis buste, puis jambes.",
      ],
      cues: ["La puissance vient des jambes", "Dos gainé, jamais arrondi", "Rythme régulier"],
      mistakes: ["Tirer d'abord avec les bras", "Arrondir le dos en fin de tirage"],
    },
  },
  {
    key: "corde-a-sauter",
    name: "Corde à sauter",
    muscle: "Cardio et mollets",
    aliases: ["corde a sauter", "saut a la corde", "jump rope", "skipping"],
    guide: {
      steps: [
        "Coudes près du corps, la corde tourne par les poignets.",
        "Saute bas, sur la pointe des pieds, genoux souples.",
        "Garde un rythme régulier et respire.",
      ],
      cues: ["Sauts bas et légers", "Regard devant", "Épaules relâchées"],
      mistakes: ["Sauter trop haut", "Tourner avec les bras au lieu des poignets"],
    },
  },
  {
    key: "burpees",
    name: "Burpees",
    muscle: "Corps entier et cardio",
    aliases: ["burpees", "burpee"],
    noPhoto: true,
    guide: {
      steps: [
        "Debout, descends en position de pompe (mains au sol).",
        "Fais une pompe (option), puis ramène les pieds sous toi.",
        "Saute vers le haut, bras tendus, puis recommence.",
      ],
      cues: ["Gaine le ventre à la descente", "Réception souple", "Enchaîne à ton rythme"],
      mistakes: ["Cambrer le dos en planche", "Réception jambes tendues"],
    },
  },
  {
    key: "mountain-climber",
    name: "Grimpeur (mountain climber)",
    muscle: "Abdominaux et cardio",
    aliases: ["mountain climber", "grimpeur", "climber"],
    guide: {
      steps: [
        "En position de planche, mains sous les épaules, corps gainé.",
        "Ramène alternativement un genou vers la poitrine.",
        "Accélère en gardant le bassin stable.",
      ],
      cues: ["Bassin bas et stable", "Épaules au-dessus des mains", "Respiration régulière"],
      mistakes: ["Monter les fesses", "Poser les mains trop loin devant"],
    },
  },
  {
    key: "jumping-jack",
    name: "Jumping jack",
    muscle: "Cardio",
    aliases: ["jumping jack", "jumping jacks", "ecart sauté", "sauts ecartes"],
    noPhoto: true,
    guide: {
      steps: [
        "Debout, pieds joints, bras le long du corps.",
        "Saute en écartant les jambes et en levant les bras au-dessus de la tête.",
        "Reviens en sautant à la position de départ.",
      ],
      cues: ["Réception souple", "Rythme régulier", "Gaine le ventre"],
      mistakes: ["Réception jambes raides", "Aller trop vite sans amplitude"],
    },
  },
  {
    key: "kettlebell-swing",
    name: "Kettlebell swing",
    muscle: "Fessiers et ischios",
    aliases: ["kettlebell swing", "swing kettlebell", "swing", "balancier kettlebell"],
    noPhoto: true,
    guide: {
      steps: [
        "Pieds largeur d'épaules, kettlebell devant toi.",
        "Bascule les hanches vers l'arrière, dos droit, et arme entre les jambes.",
        "Projette les hanches vers l'avant pour propulser la kettlebell à hauteur des épaules.",
      ],
      cues: ["La puissance vient des hanches", "Dos toujours droit", "Bras relâchés, guides seulement"],
      mistakes: ["Soulever avec les bras", "Squatter au lieu de charnière de hanche"],
    },
  },
  {
    key: "thruster",
    name: "Thruster",
    muscle: "Cuisses et épaules",
    aliases: ["thruster", "squat developpe", "squat press"],
    guide: {
      steps: [
        "Charge (haltères ou barre) au niveau des épaules, pieds largeur d'épaules.",
        "Descends en squat, dos droit.",
        "Remonte en poussant et enchaîne un développé au-dessus de la tête.",
      ],
      cues: ["Un seul mouvement fluide", "Gaine le tronc", "Verrouille les bras en haut"],
      mistakes: ["Séparer squat et poussée", "Cambrer en fin de développé"],
    },
  },
  {
    key: "haussements-epaules",
    name: "Haussements d'épaules (shrugs)",
    muscle: "Trapèzes",
    aliases: ["haussements epaules", "shrug", "shrugs", "trapezes halteres", "haussement epaules"],
    guide: {
      steps: [
        "Debout, un haltère dans chaque main, bras le long du corps.",
        "Hausse les épaules vers les oreilles, sans plier les bras.",
        "Marque un temps en haut puis redescends lentement.",
      ],
      cues: ["Mouvement vertical pur", "Bras tendus", "Contracte les trapèzes en haut"],
      mistakes: ["Rouler les épaules", "Utiliser l'élan"],
    },
  },
  {
    key: "oiseau",
    name: "Oiseau (reverse fly)",
    muscle: "Épaules (arrière)",
    aliases: ["oiseau", "reverse fly", "elevations buste penche", "deltoide posterieur", "rear delt fly"],
    guide: {
      steps: [
        "Assis au bord d'un banc, buste penché sur les cuisses, dos droit, un haltère léger dans chaque main derrière les mollets.",
        "Ouvre les bras sur les côtés en serrant les omoplates.",
        "Reviens en contrôle sans relâcher le dos.",
      ],
      cues: ["Serre les omoplates", "Bras légèrement fléchis", "Charge légère, qualité avant tout"],
      mistakes: ["Se redresser pour tricher", "Charge trop lourde"],
    },
  },
  {
    key: "good-morning",
    name: "Good morning",
    muscle: "Ischios et lombaires",
    aliases: ["good morning", "bonjour barre", "flexion buste barre"],
    guide: {
      steps: [
        "Barre légère sur le haut du dos, pieds largeur de hanches.",
        "Bascule les hanches vers l'arrière en penchant le buste, dos droit.",
        "Reviens en poussant les hanches vers l'avant.",
      ],
      cues: ["Charnière de hanche, pas de flexion du dos", "Genoux légèrement fléchis", "Dos gainé"],
      mistakes: ["Arrondir le bas du dos", "Charge trop lourde"],
    },
  },
  {
    key: "fente-bulgare",
    name: "Fente bulgare",
    muscle: "Cuisses et fessiers",
    aliases: ["fente bulgare", "squat bulgare", "bulgarian split squat", "fente pied surelevé"],
    guide: {
      steps: [
        "Un pied en arrière posé sur un banc, l'autre devant.",
        "Descends en pliant la jambe avant, genou dans l'axe du pied.",
        "Remonte en poussant dans le talon avant.",
      ],
      cues: ["Buste droit", "Poids sur la jambe avant", "Genou aligné avec le pied"],
      mistakes: ["Genou qui rentre", "Se pencher trop en avant"],
    },
  },
  {
    key: "step-up",
    name: "Montée sur banc (step-up)",
    muscle: "Cuisses et fessiers",
    aliases: ["step up", "montee sur banc", "montees banc", "step ups"],
    guide: {
      steps: [
        "Face à un banc stable, pose un pied entier dessus.",
        "Monte en poussant dans le talon, sans t'aider de l'élan de l'autre jambe.",
        "Redescends en contrôle et alterne.",
      ],
      cues: ["Pousse dans le talon", "Buste droit", "Contrôle la descente"],
      mistakes: ["Prendre de l'élan avec la jambe arrière", "Banc trop haut au départ"],
    },
  },
  {
    key: "gainage-lateral",
    name: "Gainage latéral (planche latérale)",
    muscle: "Obliques",
    aliases: ["gainage lateral planche laterale", "gainage lateral", "planche laterale", "side plank", "gainage cote", "side bridge"],
    guide: {
      steps: [
        "Sur le côté, en appui sur l'avant-bras, coude sous l'épaule.",
        "Décolle le bassin pour aligner tête, hanches et pieds.",
        "Tiens la position en respirant, puis change de côté.",
      ],
      cues: ["Corps aligné", "Hanches hautes", "Épaule éloignée de l'oreille"],
      mistakes: ["Laisser tomber le bassin", "Retenir sa respiration"],
    },
  },
  {
    key: "superman",
    name: "Superman (extensions lombaires)",
    muscle: "Lombaires",
    aliases: ["superman", "extensions lombaires", "extension lombaire", "gainage dorsal"],
    guide: {
      steps: [
        "Allongé sur le ventre, bras tendus devant toi.",
        "Décolle simultanément bras, poitrine et jambes.",
        "Marque un temps en haut puis redescends lentement.",
      ],
      cues: ["Mouvement contrôlé", "Regard vers le sol", "Serre les fessiers"],
      mistakes: ["Casser la nuque en arrière", "Rebondir sans contrôle"],
    },
  },
  {
    key: "wall-sit",
    name: "Chaise (wall sit)",
    muscle: "Quadriceps",
    aliases: ["chaise wall sit", "wall sit", "chaise", "chaise isometrique", "chaise contre le mur", "gainage cuisses"],
    noPhoto: true,
    guide: {
      steps: [
        "Dos contre un mur, descends jusqu'à ce que les cuisses soient parallèles au sol.",
        "Genoux au-dessus des chevilles, angle de 90°.",
        "Tiens la position en respirant.",
      ],
      cues: ["Dos plaqué au mur", "Poids dans les talons", "Respire régulièrement"],
      mistakes: ["Genoux qui dépassent les orteils", "Se relever trop tôt"],
    },
  },
  {
    key: "marche-fermier",
    name: "Marche du fermier",
    muscle: "Avant-bras et corps entier",
    aliases: ["marche du fermier", "farmer walk", "farmers walk", "port de charge", "marche fermier"],
    guide: {
      steps: [
        "Une charge lourde dans chaque main, bras le long du corps.",
        "Tiens-toi grand, épaules basses, ventre gainé.",
        "Marche à petits pas contrôlés sur la distance voulue.",
      ],
      cues: ["Grand et gainé", "Épaules en arrière", "Petits pas réguliers"],
      mistakes: ["Se pencher en avant", "Épaules qui s'affaissent"],
    },
  },
  // ───── Enrichissement (lot 2) : jambes, pecs, dos, épaules, bras, gainage, cardio ─────
  {
    key: "front-squat",
    name: "Squat avant",
    muscle: "Cuisses et fessiers",
    aliases: ["squat avant", "front squat", "squat barre devant", "squat clavicules"],
    guide: {
      steps: [
        "Barre posée sur l'avant des épaules, coudes hauts pointés devant toi.",
        "Pieds largeur d'épaules, descends droit entre tes jambes, buste très vertical.",
        "Cuisses au moins parallèles au sol, puis remonte en poussant dans tout le pied.",
      ],
      cues: ["Coudes hauts en permanence", "Buste plus droit qu'au squat classique", "Gaine fort le ventre"],
      mistakes: ["Laisser tomber les coudes (la barre roule)", "Se pencher en avant", "Talons qui décollent"],
    },
  },
  {
    key: "hack-squat",
    name: "Hack squat (machine)",
    muscle: "Quadriceps",
    aliases: ["hack squat", "squat machine", "hack squat machine"],
    guide: {
      steps: [
        "Dos et épaules calés contre le dossier, pieds largeur d'épaules sur la plateforme.",
        "Déverrouille et descends en pliant les genoux, dos plaqué.",
        "Genoux à environ 90° (ou un peu plus bas si confortable), puis remonte sans verrouiller.",
      ],
      cues: ["Dos toujours plaqué", "Pousse dans toute la surface du pied", "Descente contrôlée"],
      mistakes: ["Décoller le bas du dos en descendant trop bas", "Petits rebonds en bas"],
    },
  },
  {
    key: "souleve-de-terre-sumo",
    name: "Soulevé de terre sumo",
    muscle: "Fessiers et ischio-jambiers",
    aliases: ["souleve de terre sumo", "sumo deadlift", "deadlift sumo"],
    guide: {
      steps: [
        "Pieds très écartés, pointes ouvertes, tibias proches de la barre.",
        "Saisis la barre bras à l'intérieur des genoux, dos plat, poitrine haute.",
        "Pousse le sol avec les jambes et redresse-toi, la barre glisse le long des jambes.",
        "Redescends en contrôlant, hanches vers l'arrière.",
      ],
      cues: ["Genoux ouverts dans l'axe des pointes", "Dos plat du début à la fin", "Barre collée au corps"],
      mistakes: ["Genoux qui rentrent", "Tirer avec le dos avant les jambes"],
    },
  },
  {
    key: "mollets-assis",
    name: "Mollets assis (machine)",
    muscle: "Mollets",
    aliases: ["mollets assis", "seated calf raise", "extension mollets assis", "machine a mollets assis"],
    guide: {
      steps: [
        "Assis, coussins sur les cuisses, avant-pieds sur la cale, talons dans le vide.",
        "Monte sur la pointe des pieds le plus haut possible.",
        "Redescends lentement, talons sous le niveau de la cale pour étirer.",
      ],
      cues: ["Grande amplitude, haut et bas", "Un temps d'arrêt en haut", "Descente lente"],
      mistakes: ["Rebondir en bas", "Amplitude écourtée"],
    },
  },
  {
    key: "adducteurs-machine",
    name: "Adducteurs à la machine",
    muscle: "Adducteurs (intérieur des cuisses)",
    aliases: ["adducteurs machine", "machine adducteurs", "adduction hanches", "thigh adductor"],
    guide: {
      steps: [
        "Assis, jambes écartées contre les coussins, dos au dossier.",
        "Serre les jambes l'une vers l'autre en contractant l'intérieur des cuisses.",
        "Reviens lentement à la position de départ sans laisser les poids claquer.",
      ],
      cues: ["Mouvement lent et contrôlé", "Amplitude confortable", "Expire en serrant"],
      mistakes: ["Charge trop lourde et à-coups", "Laisser la machine te ré-écarter d'un coup"],
    },
  },
  {
    key: "extension-fessier-poulie",
    name: "Extension fessier à quatre pattes (kickback)",
    muscle: "Fessiers",
    aliases: ["kickback fessier", "kickback fessier au sol", "extension fessier quatre pattes", "glute kickback", "donkey kick", "extension hanche quatre pattes"],
    guide: {
      steps: [
        "Sangle à la cheville (ou à quatre pattes au poids du corps), appuis stables.",
        "Pousse la jambe vers l'arrière et le haut en serrant la fesse.",
        "Marque un temps en fin de mouvement, puis reviens lentement.",
      ],
      cues: ["Bassin stable, pas de rotation", "Serre la fesse en haut", "Ne cambre pas pour monter plus haut"],
      mistakes: ["Compenser avec le bas du dos", "Balancer la jambe sans contrôle"],
    },
  },
  {
    key: "extension-lombaire",
    name: "Extension lombaire (banc)",
    muscle: "Bas du dos et fessiers",
    aliases: ["extension lombaire banc", "extension lombaire", "hyperextension", "banc a lombaires", "extensions dos", "back extension"],
    guide: {
      steps: [
        "Cuisses sur le coussin du banc à 45°, chevilles calées, bras croisés sur la poitrine.",
        "Descends le buste en gardant le dos neutre.",
        "Remonte jusqu'à l'alignement jambes-buste en serrant fessiers et lombaires.",
      ],
      cues: ["Dos neutre, pas cambré", "Monte avec les fessiers autant que le dos", "Rythme lent"],
      mistakes: ["Hyper-étendre le dos en haut", "Donner des à-coups"],
    },
  },
  {
    key: "ecarte-halteres",
    name: "Écarté couché haltères",
    muscle: "Pectoraux",
    aliases: ["ecarte couche", "ecarte halteres", "ecartes couches", "dumbbell fly", "ecarte couche halteres"],
    guide: {
      steps: [
        "Allongé sur le banc, haltères au-dessus de la poitrine, coudes légèrement fléchis.",
        "Ouvre les bras en arc de cercle jusqu'à sentir l'étirement des pectoraux.",
        "Referme en serrant les pectoraux, comme pour enlacer un tronc d'arbre.",
      ],
      cues: ["Coudes toujours un peu fléchis", "Descente lente, étirement contrôlé", "Omoplates serrées"],
      mistakes: ["Tendre complètement les bras", "Descendre trop bas et forcer l'épaule", "Transformer en développé"],
    },
  },
  {
    key: "ecarte-poulie",
    name: "Écarté à la poulie (vis-à-vis)",
    muscle: "Pectoraux",
    aliases: ["ecarte poulie", "cable crossover", "vis a vis", "poulie vis a vis", "ecarte cables"],
    guide: {
      steps: [
        "Debout entre les deux poulies hautes, une poignée dans chaque main, un pied devant.",
        "Buste légèrement penché, ramène les mains devant toi en arc de cercle, vers le bas et l'avant.",
        "Serre les pectoraux quand les mains se rejoignent, puis reviens en contrôlant.",
      ],
      cues: ["Coudes légèrement fléchis et fixes", "Serre 1 seconde au milieu", "Buste stable"],
      mistakes: ["Plier puis tendre les coudes (ça devient un développé)", "S'aider du dos en reculant"],
    },
  },
  {
    key: "pec-deck",
    name: "Pec deck (butterfly)",
    muscle: "Pectoraux",
    aliases: ["pec deck", "butterfly", "papillon machine", "machine ecarte"],
    guide: {
      steps: [
        "Assis, dos plaqué, avant-bras ou mains sur les coussins à hauteur de poitrine.",
        "Ramène les bras l'un vers l'autre en serrant les pectoraux.",
        "Marque un temps quand les coussins se rejoignent, puis reviens lentement.",
      ],
      cues: ["Dos plaqué en permanence", "Serre fort au milieu", "Retour lent"],
      mistakes: ["Décoller le dos pour pousser", "Amplitude excessive en arrière"],
    },
  },
  {
    key: "developpe-decline",
    name: "Développé décliné",
    muscle: "Pectoraux (bas)",
    aliases: ["developpe decline", "decline bench press", "developpe couche decline"],
    guide: {
      steps: [
        "Allongé sur un banc décliné, pieds calés, barre saisie un peu plus large que les épaules.",
        "Descends la barre vers le bas des pectoraux en contrôlant.",
        "Pousse jusqu'à l'extension des bras sans verrouiller brutalement.",
      ],
      cues: ["Omoplates serrées", "Trajectoire courte et stable", "Poignets droits"],
      mistakes: ["Rebond sur la poitrine", "Fesses qui décollent du banc"],
    },
  },
  {
    key: "pull-over",
    name: "Pull-over haltère",
    muscle: "Pectoraux et grand dorsal",
    aliases: ["pull over", "pullover", "pull over haltere", "pull over couche"],
    guide: {
      steps: [
        "Allongé en travers ou le long d'un banc, un haltère tenu à deux mains au-dessus de la poitrine.",
        "Descends l'haltère derrière la tête, bras légèrement fléchis, jusqu'à un bon étirement.",
        "Ramène l'haltère au-dessus de la poitrine en contractant pectoraux et dorsaux.",
      ],
      cues: ["Bras presque tendus, coudes fixes", "Étirement progressif, jamais douloureux", "Gaine le ventre"],
      mistakes: ["Plier les coudes (ça devient un triceps)", "Cambrer excessivement le dos"],
    },
  },
  {
    key: "rowing-t-bar",
    name: "Rowing T-bar",
    muscle: "Dos (épaisseur)",
    aliases: ["rowing t bar", "t bar row", "rowing barre en t", "rowing landmine"],
    guide: {
      steps: [
        "Barre calée au sol, à cheval au-dessus, buste penché dos plat, poignée sous la barre.",
        "Tire la barre vers le bas du torse en serrant les omoplates.",
        "Redescends lentement jusqu'à l'extension des bras.",
      ],
      cues: ["Dos plat, buste stable", "Coudes près du corps", "Tire avec le dos, pas les bras"],
      mistakes: ["Se redresser à chaque répétition", "Arrondir le bas du dos"],
    },
  },
  {
    key: "tirage-bras-tendus",
    name: "Tirage bras tendus",
    muscle: "Grand dorsal",
    aliases: ["tirage bras tendus", "straight arm pulldown", "pull down bras tendus", "tirage poulie bras tendus"],
    guide: {
      steps: [
        "Debout face à la poulie haute, barre ou corde saisie bras tendus à hauteur des épaules.",
        "Bras quasi tendus, amène la barre vers tes cuisses en contractant les dorsaux.",
        "Remonte lentement jusqu'à l'étirement, sans hausser les épaules.",
      ],
      cues: ["Coudes verrouillés légèrement fléchis", "Imagine pousser le sol avec la barre", "Buste stable"],
      mistakes: ["Plier les coudes (ça devient un triceps)", "S'aider du buste en se balançant"],
    },
  },
  {
    key: "traction-supination",
    name: "Tractions supination (chin-up)",
    muscle: "Dos et biceps",
    aliases: ["tractions supination", "chin up", "chin-up", "traction supination", "tractions prise inversee"],
    guide: {
      steps: [
        "Suspendu à la barre, paumes vers toi, mains largeur d'épaules.",
        "Tire-toi vers le haut jusqu'à passer le menton au-dessus de la barre.",
        "Redescends lentement jusqu'aux bras tendus.",
      ],
      cues: ["Poitrine vers la barre", "Descente complète et contrôlée", "Gaine le ventre (pas de balancement)"],
      mistakes: ["Demi-répétitions", "S'élancer avec les jambes"],
    },
  },
  {
    key: "developpe-arnold",
    name: "Développé Arnold",
    muscle: "Épaules",
    aliases: ["developpe arnold", "arnold press", "arnold"],
    guide: {
      steps: [
        "Assis, haltères devant les épaules, paumes vers toi.",
        "Pousse vers le haut en tournant les paumes vers l'avant pendant la montée.",
        "Redescends en tournant les paumes vers toi, en contrôlant.",
      ],
      cues: ["Rotation fluide et continue", "Ne cambre pas le dos", "Trajectoire proche du corps"],
      mistakes: ["Charge trop lourde (rotation brouillonne)", "Cambrer pour finir la pousse"],
    },
  },
  {
    key: "push-press",
    name: "Push press",
    muscle: "Épaules et jambes",
    aliases: ["push press", "developpe avec impulsion", "push press barre"],
    guide: {
      steps: [
        "Barre sur l'avant des épaules, pieds largeur de hanches.",
        "Petite flexion rapide des genoux, puis pousse fort avec les jambes ET les bras.",
        "Verrouille la barre au-dessus de la tête, redescends en contrôlant sur les épaules.",
      ],
      cues: ["Impulsion des jambes courte et verticale", "Gaine fort au verrouillage", "Tête qui passe sous la barre en fin de pousse"],
      mistakes: ["Trop plier les genoux (ça devient un thruster)", "Cambrer en fin de montée"],
    },
  },
  {
    key: "curl-concentration",
    name: "Curl concentration",
    muscle: "Biceps",
    aliases: ["curl concentration", "concentration curl", "curl assis coude sur cuisse"],
    guide: {
      steps: [
        "Assis, coude calé contre l'intérieur de la cuisse, haltère en bas bras tendu.",
        "Monte l'haltère vers l'épaule en contractant le biceps, sans bouger le coude.",
        "Redescends lentement jusqu'au bras presque tendu.",
      ],
      cues: ["Coude vissé contre la cuisse", "Serre fort en haut", "Descente en 2-3 secondes"],
      mistakes: ["Balancer le buste", "Écourter la descente"],
    },
  },
  {
    key: "curl-pupitre",
    name: "Curl au pupitre (larry)",
    muscle: "Biceps",
    aliases: ["curl pupitre", "preacher curl", "curl larry", "larry scott", "curl au banc larry scott"],
    guide: {
      steps: [
        "Bras posés sur le pupitre, aisselles calées en haut du coussin, barre ou haltères en mains.",
        "Monte la charge en contractant les biceps, sans décoller les bras du coussin.",
        "Redescends lentement jusqu'aux bras presque tendus.",
      ],
      cues: ["Triceps collés au coussin", "Descente très contrôlée", "Poignets neutres"],
      mistakes: ["Tendre complètement les coudes d'un coup en bas", "Se lever du siège pour tricher"],
    },
  },
  {
    key: "extension-triceps-verticale",
    name: "Extension triceps au-dessus de la tête",
    muscle: "Triceps",
    aliases: ["extension triceps verticale", "extension triceps au dessus de la tete", "overhead triceps extension", "extension nuque", "extension triceps corde au dessus de la tete", "extension triceps haltere", "extension triceps haltere au dessus de la tete"],
    guide: {
      steps: [
        "Debout dos à la poulie basse (corde) ou haltère à deux mains au-dessus de la tête.",
        "Coudes vers le ciel et serrés, descends la charge derrière la tête.",
        "Tends les bras en contractant les triceps, sans écarter les coudes.",
      ],
      cues: ["Coudes fixes et serrés", "Gaine pour ne pas cambrer", "Grande amplitude derrière la tête"],
      mistakes: ["Coudes qui partent sur les côtés", "Cambrer le bas du dos"],
    },
  },
  {
    key: "kickback-triceps",
    name: "Kickback triceps",
    muscle: "Triceps",
    aliases: ["kickback triceps", "extension triceps buste penche", "triceps kickback"],
    guide: {
      steps: [
        "Buste penché, dos plat, coude collé au corps plié à 90°, haltère en main.",
        "Tends le bras vers l'arrière jusqu'à l'alignement avec le buste.",
        "Marque un temps bras tendu, puis reviens lentement à 90°.",
      ],
      cues: ["Le coude ne bouge pas, seul l'avant-bras travaille", "Serre le triceps bras tendu", "Dos plat"],
      mistakes: ["Balancer l'haltère", "Laisser tomber le coude"],
    },
  },
  {
    key: "dead-bug",
    name: "Dead bug",
    muscle: "Abdominaux profonds",
    aliases: ["dead bug", "deadbug", "insecte mort"],
    guide: {
      steps: [
        "Allongé sur le dos, bras tendus vers le plafond, hanches et genoux à 90°.",
        "Plaque le bas du dos au sol, puis tends lentement une jambe et le bras opposé.",
        "Reviens et alterne, sans jamais décoller le bas du dos.",
      ],
      cues: ["Bas du dos collé au sol en permanence", "Souffle en tendant", "Lent et contrôlé"],
      mistakes: ["Cambrer quand la jambe descend", "Aller trop vite"],
    },
  },
  {
    key: "pallof-press",
    name: "Pallof press",
    muscle: "Gainage anti-rotation",
    aliases: ["pallof press", "pallof", "presse pallof", "anti rotation poulie"],
    guide: {
      steps: [
        "De profil par rapport à la poulie (hauteur poitrine), poignée tenue à deux mains contre le sternum.",
        "Tends les bras devant toi sans laisser le buste tourner vers la machine.",
        "Tiens 2 secondes bras tendus, puis reviens. Change de côté à la fin de la série.",
      ],
      cues: ["Bassin et épaules face à l'avant", "Gaine ventre et fessiers", "Respire normalement"],
      mistakes: ["Tourner les épaules vers la poulie", "Se pencher pour compenser"],
    },
  },
  {
    key: "releve-jambes-allonge",
    name: "Relevé de jambes allongé",
    muscle: "Abdominaux (bas)",
    aliases: ["releve de jambes allonge", "leg raise allonge", "lying leg raise", "releve jambes au sol", "releve de jambes banc", "releve de jambes", "releve jambes"],
    guide: {
      steps: [
        "Allongé sur le dos (ou un banc), mains sous les fesses ou agrippées derrière la tête.",
        "Jambes tendues, monte-les jusqu'à la verticale.",
        "Redescends lentement sans poser les talons, bas du dos plaqué.",
      ],
      cues: ["Bas du dos collé au sol", "Descente lente", "Plie légèrement les genoux si besoin"],
      mistakes: ["Cambrer en bas du mouvement", "Balancer les jambes"],
    },
  },
  {
    key: "ab-roller",
    name: "Roulette abdominale (ab wheel)",
    muscle: "Abdominaux et gainage",
    aliases: ["roulette abdominale", "ab roller", "ab wheel", "roue abdos", "roulette abdos"],
    guide: {
      steps: [
        "À genoux, mains sur la roulette sous les épaules, ventre gainé.",
        "Roule lentement vers l'avant en gardant le dos neutre, aussi loin que tu contrôles.",
        "Reviens en tirant avec les abdos, hanches verrouillées.",
      ],
      cues: ["Bassin légèrement rétroversé (pas de cambrure)", "Amplitude progressive au fil des semaines", "Souffle au retour"],
      mistakes: ["Creuser le bas du dos en avançant", "Aller trop loin trop tôt"],
    },
  },
  {
    key: "box-jump",
    name: "Box jump",
    muscle: "Jambes (explosivité)",
    aliases: ["box jump", "saut sur box", "saut sur caisse", "sauts sur box"],
    guide: {
      steps: [
        "Face à la box, pieds largeur de hanches, à une petite longueur de pas.",
        "Flexion rapide bras en arrière, puis saute en montant les genoux.",
        "Atterris en douceur pieds à plat au centre de la box, genoux fléchis. Redescends en marchant.",
      ],
      cues: ["Atterrissage silencieux", "Genoux dans l'axe", "Redescends EN MARCHANT (pas en sautant)"],
      mistakes: ["Box trop haute (atterrissage accroupi complet)", "Sauter en arrière pour redescendre"],
    },
  },
  {
    key: "air-bike",
    name: "Air bike (assault bike)",
    muscle: "Cardio corps entier",
    aliases: ["air bike", "assault bike", "velo air", "velo a air", "airbike", "velo assault", "assault"],
    guide: {
      steps: [
        "Règle la selle pour une jambe presque tendue en bas de pédale.",
        "Pousse avec les jambes ET tire-pousse avec les bras, dos long.",
        "Gère l'allure selon la zone demandée (Z2 régulier, intervalles pour le HIIT).",
      ],
      cues: ["Rythme régulier, souffle contrôlé", "Gaine le ventre", "Jambes ET bras ensemble"],
      mistakes: ["Partir trop vite et exploser", "S'affaisser sur le guidon"],
    },
    // Pas de photo. Le jeu d'images libres appelle « air bike » un exercice
    // d'abdominaux au sol (le pédalage allongé), pas la machine : les deux
    // visuels montraient donc un crunch à quelqu'un qui cherchait un vélo.
    // Mieux vaut l'illustration du groupe musculaire qu'une photo fausse.
    noPhoto: true,
  },
  {
    key: "elliptique",
    name: "Vélo elliptique",
    muscle: "Cardio corps entier",
    aliases: ["elliptique", "velo elliptique", "elliptical"],
    guide: {
      steps: [
        "Pieds au centre des pédales, mains sur les poignées mobiles.",
        "Pousse avec les jambes en accompagnant avec les bras, buste droit.",
        "Règle la résistance pour rester dans la zone cardiaque demandée.",
      ],
      cues: ["Regard loin devant, buste haut", "Appuie dans les talons", "Cadence régulière"],
      mistakes: ["S'appuyer de tout son poids sur les poignées", "Pédaler sur les pointes"],
    },
  },
  {
    key: "tapis-course",
    name: "Course sur tapis",
    muscle: "Cardio",
    aliases: ["tapis de course", "course tapis", "running tapis", "treadmill", "course sur tapis", "jogging tapis", "tapis", "tapis marche", "marche inclinee tapis", "tapis sprint"],
    guide: {
      steps: [
        "Commence en marchant, puis augmente la vitesse progressivement.",
        "Cours au centre du tapis, regard devant, épaules relâchées.",
        "Pour finir, réduis la vitesse par paliers avant de descendre.",
      ],
      cues: ["Foulée légère et fréquente", "1 à 2 % de pente pour simuler l'extérieur", "Bras relâchés"],
      mistakes: ["S'accrocher aux poignées en courant", "S'arrêter net sans retour au calme"],
    },
  },
  // Deux mouvements de dos à l'élastique. Ils existent pour une raison
  // précise : sans eux, un client sans poulie, sans barre de traction et sans
  // haltères n'avait AUCUN exercice de dos dans la bibliothèque, et le moteur
  // d'alternatives ne pouvait rien lui proposer.
  {
    key: "rowing-elastique",
    name: "Rowing élastique",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing elastique", "rowing bande", "tirage horizontal elastique", "band row", "rowing avec elastique"],
    guide: {
      steps: [
        "Passe l'élastique autour d'un point fixe bas, une poignée dans chaque main, bras tendus.",
        "Recule jusqu'à mettre l'élastique en tension, buste légèrement penché, dos droit.",
        "Tire les coudes vers l'arrière le long du corps, serre les omoplates en fin de mouvement.",
        "Reviens en contrôlant la tension, sans laisser l'élastique te ramener.",
      ],
      cues: ["Coudes près du corps", "Serre les omoplates en fin de tirage", "Buste immobile"],
      mistakes: ["Tirer avec les bras seulement", "Arrondir le haut du dos", "Lâcher le retour"],
    },
    noPhoto: true,
  },
  {
    key: "tirage-elastique",
    name: "Tirage vertical élastique",
    muscle: "Dos (grand dorsal)",
    aliases: ["tirage elastique", "tirage vertical elastique", "lat pulldown elastique", "tirage nuque elastique", "band pulldown"],
    guide: {
      steps: [
        "Fixe l'élastique en hauteur (porte, barre), une poignée dans chaque main, bras tendus au-dessus de la tête.",
        "À genoux ou debout, gaine le ventre et garde le buste droit.",
        "Tire les mains vers les épaules en amenant les coudes vers le bas et l'arrière.",
        "Remonte lentement jusqu'à l'extension complète des bras.",
      ],
      cues: ["Descends les coudes, pas les mains", "Poitrine haute", "Amplitude complète en haut"],
      mistakes: ["Se pencher en arrière pour tirer plus fort", "Hausser les épaules", "Retour trop rapide"],
    },
    noPhoto: true,
  },
  // ───────────────────────────────────────────── lot 3 : machines, hanches, variantes
  {
    key: "abduction-hanche-machine",
    name: "Abduction de hanche à la machine",
    muscle: "Fessiers (moyen fessier)",
    aliases: ["abduction hanche machine", "abduction machine", "abducteurs machine", "hip abduction machine", "abduction de hanche assis", "machine abducteurs", "abduction assise"],
    guide: {
      steps: ["Assieds-toi dans la machine, dos plaqué au dossier, coussins contre l'extérieur des genoux.", "Écarte les jambes en poussant avec les genoux vers l'extérieur, sans décoller le bassin du siège.", "Marque un temps en position ouverte, puis reviens lentement sans laisser les plaques retomber."],
      cues: ["Bassin et dos immobiles", "Contrôle le retour sur 2 secondes", "Serre les fessiers en fin d'écartement"],
      mistakes: ["Se pencher en avant pour écarter plus", "Laisser les plaques claquer au retour"],
    },
  },
  {
    key: "abduction-hanche-debout",
    name: "Abduction de hanche debout (poulie ou élastique)",
    muscle: "Fessiers (moyen fessier)",
    aliases: ["abduction hanche debout", "abduction hanche poulie", "abduction de hanche poulie", "abduction hanche elastique", "abduction de hanche", "abduction laterale", "hip abduction cable", "abduction poulie basse", "abduction elastique", "abduction hanche poulie basse", "cable hip abduction"],
    guide: {
      steps: ["Debout, sangle à la cheville sur une poulie basse (ou élastique autour des chevilles), main sur un appui.", "Jambe tendue, écarte-la sur le côté sans pencher le buste ni tourner la pointe du pied vers le haut.", "Redescends lentement sans reposer le pied entre les répétitions."],
      cues: ["Buste droit, bassin de face", "Pointe de pied vers l'avant", "Amplitude courte mais contrôlée"],
      mistakes: ["Se pencher du côté opposé pour monter plus haut", "Balancer la jambe avec de l'élan"],
    },
  },
  {
    key: "adduction-hanche-poulie",
    name: "Adduction de hanche à la poulie",
    muscle: "Adducteurs (intérieur des cuisses)",
    aliases: ["adduction hanche poulie", "adduction poulie", "adduction de hanche", "cable hip adduction", "adducteurs poulie", "adduction elastique"],
    guide: {
      steps: ["Sangle à la cheville sur une poulie basse, place-toi de profil, la jambe attachée vers la machine.", "Ramène la jambe tendue devant l'autre en serrant l'intérieur de la cuisse.", "Reviens lentement à l'écartement de départ sans laisser la charge te tirer."],
      cues: ["Buste droit, main sur un appui", "Mouvement lent dans les deux sens", "Genou souple, jamais verrouillé"],
      mistakes: ["Tourner le bassin pour aller plus loin", "Laisser la charge revenir d'un coup"],
    },
  },
  {
    key: "kickback-fessier-poulie",
    name: "Extension fessier à la poulie (kickback)",
    muscle: "Fessiers",
    aliases: ["extension fessier poulie", "kickback poulie", "kickback fessier poulie", "extension hanche poulie", "glute kickback cable", "cable kickback", "extension de hanche poulie", "kickback a la poulie"],
    guide: {
      steps: ["Sangle à la cheville sur une poulie basse, face à la machine, mains sur le montant, buste légèrement penché.", "Pousse la jambe tendue vers l'arrière en serrant la fesse, sans cambrer le bas du dos.", "Marque un temps en arrière, puis reviens lentement, genou souple."],
      cues: ["Bassin stable, pas de rotation", "Le mouvement part de la hanche, pas du dos", "Amplitude courte et propre"],
      mistakes: ["Cambrer pour monter la jambe plus haut", "Balancer la jambe avec de l'élan"],
    },
  },
  {
    key: "kickback-fessier-machine",
    name: "Extension fessier à la machine",
    muscle: "Fessiers",
    aliases: ["kickback machine", "machine a kickback", "glute kickback machine", "extension fessier machine", "machine a fessiers", "kickback fessier machine"],
    // Même règle : la version poulie n'est pas la machine. Illustration.
    noPhoto: true,
    guide: {
      steps: [
        "Face à la machine, buste appuyé sur le support, un pied sur la plateforme.",
        "Pousse la plateforme vers l'arrière en serrant la fesse, jambe presque tendue.",
        "Marque un temps en fin de poussée, puis reviens sans laisser la charge claquer.",
      ],
      cues: ["Bassin stable, sans rotation", "Le mouvement part de la hanche", "Amplitude courte et propre"],
      mistakes: ["Cambrer pour pousser plus loin", "Prendre de l'élan avec le buste"],
    },
  },
  {
    key: "pont-fessier-unilateral",
    name: "Pont fessier sur une jambe",
    muscle: "Fessiers et ischios",
    aliases: ["pont fessier une jambe", "pont fessier unilateral", "single leg glute bridge", "glute bridge une jambe", "pont fessier jambe tendue", "hip thrust au sol une jambe"],
    guide: {
      steps: ["Allongé sur le dos, un pied à plat près des fesses, l'autre jambe tendue ou genou vers la poitrine.", "Pousse dans le talon au sol pour monter le bassin jusqu'à aligner épaules, hanches et genou.", "Serre la fesse en haut une seconde, redescends sans poser complètement les fesses."],
      cues: ["Bassin horizontal, sans rotation", "Pousse dans le talon", "Côtes basses, pas de cambrure"],
      mistakes: ["Monter avec le dos plutôt qu'avec la fesse", "Laisser le bassin basculer du côté libre"],
    },
  },
  {
    key: "pull-through-poulie",
    name: "Pull-through à la poulie",
    muscle: "Fessiers et ischios",
    aliases: ["pull through", "pull through poulie", "cable pull through", "tirage entre les jambes poulie", "pull through corde"],
    guide: {
      steps: ["Dos à une poulie basse, corde entre les jambes, avance de deux pas pour tendre le câble.", "Pousse les hanches vers l'arrière, dos plat, jusqu'à sentir l'étirement des ischios.", "Reviens debout en poussant les hanches vers l'avant et en serrant les fessiers."],
      cues: ["C'est une charnière de hanche, pas un squat", "Dos plat du début à la fin", "Serre les fessiers en fin de montée"],
      mistakes: ["Tirer avec les bras", "Plier trop les genoux"],
    },
  },
  {
    key: "fentes-arriere",
    name: "Fentes arrière",
    muscle: "Cuisses et fessiers",
    aliases: ["fentes arriere", "fente arriere", "reverse lunge", "fentes inversees", "fentes arriere halteres", "fente arriere haltere"],
    guide: {
      steps: ["Debout, haltères le long du corps, recule une jambe d'un grand pas.", "Descends jusqu'à ce que le genou arrière frôle le sol, genou avant au-dessus de la cheville.", "Pousse dans le talon avant pour revenir debout, puis alterne."],
      cues: ["Buste droit", "Genou avant dans l'axe du pied", "Pas assez long pour ne pas dépasser la pointe"],
      mistakes: ["Se pencher en avant", "Genou avant qui rentre vers l'intérieur"],
    },
  },
  {
    key: "fentes-statiques",
    name: "Fentes statiques (sur place)",
    muscle: "Cuisses et fessiers",
    aliases: ["fentes statiques", "fente statique", "fentes sur place", "fentes statiques courtes", "split squat", "fentes halteres statiques", "fentes avant halteres", "fentes courtes", "static lunge"],
    guide: {
      steps: ["Debout, un pied devant, l'autre derrière, haltères le long du corps.", "Descends verticalement jusqu'à ce que le genou arrière frôle le sol, puis remonte sans bouger les pieds.", "Fais toutes les répétitions d'un côté avant de changer de jambe."],
      cues: ["Poids réparti sur les deux pieds", "Buste droit, regard devant", "Descente contrôlée"],
      mistakes: ["Genou avant qui part vers l'intérieur", "Se pencher en avant pour remonter"],
    },
  },
  {
    key: "squat-gobelet",
    name: "Squat gobelet",
    muscle: "Cuisses et fessiers",
    aliases: ["squat gobelet", "goblet squat", "squat goblet", "squat kettlebell", "squat haltere devant", "squat gobelet haltere"],
    guide: {
      steps: ["Tiens un haltère ou une kettlebell contre la poitrine, coudes vers le bas, pieds largeur d'épaules.", "Descends entre les jambes, coudes à l'intérieur des genoux, dos droit.", "Remonte en poussant dans les talons, sans laisser la charge s'éloigner du buste."],
      cues: ["Charge collée à la poitrine", "Genoux dans l'axe des pieds", "Talons au sol"],
      mistakes: ["Arrondir le dos", "Décoller les talons"],
    },
  },
  {
    key: "squat-sumo-haltere",
    name: "Squat sumo haltère",
    muscle: "Cuisses, fessiers et adducteurs",
    aliases: ["squat sumo haltere", "squat sumo", "sumo squat", "plie squat", "squat plie haltere", "squat large haltere", "squat sumo kettlebell"],
    guide: {
      steps: ["Pieds bien plus larges que les épaules, pointes ouvertes, haltère tenu à deux mains entre les jambes.", "Descends en écartant les genoux dans l'axe des pieds, buste droit.", "Remonte en serrant fessiers et intérieur des cuisses."],
      cues: ["Genoux poussés vers l'extérieur", "Buste vertical", "Descente lente"],
      mistakes: ["Genoux qui rentrent", "Se pencher en avant"],
    },
  },
  {
    key: "leg-curl-debout",
    name: "Leg curl debout",
    muscle: "Ischio-jambiers",
    aliases: ["leg curl debout", "standing leg curl", "curl ischios debout", "leg curl unilateral debout", "leg curl une jambe debout"],
    guide: {
      steps: ["Debout face à la machine, coussin derrière la cheville, cuisse contre l'appui.", "Fléchis le genou pour ramener le talon vers la fesse, sans bouger la cuisse.", "Redescends lentement jusqu'à la jambe presque tendue."],
      cues: ["Cuisse immobile", "Contrôle la descente", "Bassin de face, sans cambrer"],
      mistakes: ["Se pencher en avant pour tricher", "Laisser la charge tomber"],
    },
  },
  {
    key: "leg-curl-elastique",
    name: "Leg curl à l'élastique",
    muscle: "Ischio-jambiers",
    aliases: ["leg curl elastique", "leg curl bande", "leg curl band", "curl ischios elastique", "leg curl elastique au sol", "leg curl elastique secondaire", "band hamstring curl"],
    guide: {
      steps: ["Accroche l'élastique bas devant toi, passe-le derrière les chevilles, assis sur un banc ou allongé au sol.", "Fléchis les genoux pour ramener les talons vers toi contre la résistance.", "Reviens lentement sans laisser l'élastique t'emporter."],
      cues: ["Genoux fixes, seuls les talons bougent", "Tension constante", "Retour lent"],
      mistakes: ["Se laisser tirer au retour", "Cambrer le dos"],
    },
  },
  {
    key: "leg-curl-suspension",
    name: "Leg curl aux sangles de suspension",
    muscle: "Ischio-jambiers et fessiers",
    aliases: ["leg curl sangles", "leg curl sangles de suspension", "leg curl trx", "curl ischios trx", "leg curl suspension", "trx hamstring curl", "leg curl leger avec sangles de suspension"],
    guide: {
      steps: ["Allongé sur le dos, talons dans les sangles, bassin décollé du sol en pont.", "Fléchis les genoux pour ramener les talons vers les fesses en gardant le bassin haut.", "Tends lentement les jambes sans laisser le bassin retomber."],
      cues: ["Bassin haut pendant toute la série", "Talons enfoncés dans les sangles", "Mouvement lent"],
      mistakes: ["Laisser le bassin descendre", "Aller trop vite"],
    },
    noPhoto: true,
  },
  {
    key: "machine-a-marches",
    name: "Machine à marches (stairmaster)",
    muscle: "Cardio, cuisses et fessiers",
    aliases: ["machine a marches", "stairmaster", "step mill", "stepmill", "escalier machine", "montee de marches", "stepper", "escalier"],
    guide: {
      steps: ["Monte sur la machine, choisis un rythme où tu peux tenir la durée prévue, mains posées sans t'appuyer.", "Pose le pied entier sur chaque marche et pousse dans le talon.", "Garde le buste droit et le rythme régulier jusqu'à la fin."],
      cues: ["Ne t'accroche pas aux poignées", "Pied entier sur la marche", "Respiration régulière"],
      mistakes: ["S'affaler sur la console", "Monter sur la pointe des pieds"],
    },
  },
  {
    key: "velo-stationnaire",
    name: "Vélo stationnaire",
    muscle: "Cardio et cuisses",
    aliases: ["velo", "velo stationnaire", "velo d appartement", "velo assis", "bike", "cyclette", "velo sans impact", "velo de salle", "spinning", "velo cardio", "velo allure facile", "velo progressif"],
    guide: {
      steps: ["Règle la selle à hauteur de hanche : jambe presque tendue en bas de pédale.", "Pédale à une cadence régulière, résistance adaptée à la zone cardiaque demandée.", "Garde les épaules basses et le buste détendu."],
      cues: ["Cadence régulière", "Genoux dans l'axe des pieds", "Mains légères sur le guidon"],
      mistakes: ["Selle trop basse", "Résistance trop forte pour tenir la durée"],
    },
  },
  {
    key: "sled-push",
    name: "Poussée de traîneau (sled push)",
    muscle: "Cuisses, fessiers et cardio",
    aliases: ["sled push", "pousse de traineau", "poussee de traineau", "traineau", "prowler", "pousser le traineau"],
    guide: {
      steps: ["Mains sur les montants, bras tendus ou fléchis, buste incliné vers l'avant.", "Pousse en avançant à petits pas rapides, pied entier au sol.", "Garde le dos plat et le traîneau en mouvement continu sur la distance prévue."],
      cues: ["Dos plat, gainage serré", "Pas courts et rapides", "Pousse avec les jambes, pas avec les bras"],
      mistakes: ["Arrondir le dos", "Faire de trop grands pas"],
    },
  },
  {
    key: "developpe-incline-machine",
    name: "Développé incliné à la machine",
    muscle: "Pectoraux (haut) et épaules",
    aliases: ["developpe incline machine", "poussee inclinee machine", "poussee inclinee machine a pectoraux", "chest press incline machine", "presse pectoraux inclinee", "developpe incline machine leger", "incline chest press machine"],
    guide: {
      steps: ["Règle le siège pour que les poignées soient à hauteur du haut des pectoraux.", "Pousse les poignées vers l'avant et le haut jusqu'à presque tendre les bras.", "Reviens lentement en gardant les omoplates plaquées au dossier."],
      cues: ["Omoplates serrées contre le dossier", "Coudes à environ 45 degrés", "Ne verrouille pas les coudes"],
      mistakes: ["Décoller le dos du dossier", "Lâcher la charge au retour"],
    },
  },
  {
    key: "developpe-couche-machine",
    name: "Développé couché à la machine (chest press)",
    muscle: "Pectoraux, triceps",
    aliases: ["developpe couche machine", "chest press machine", "chest press", "poussee horizontale machine", "presse pectoraux machine", "developpe assis machine", "developpe machine", "machine pectoraux"],
    guide: {
      steps: ["Règle le siège pour que les poignées soient à hauteur du milieu des pectoraux.", "Pousse devant toi jusqu'à presque tendre les bras, sans décoller les épaules du dossier.", "Reviens lentement jusqu'à sentir l'étirement des pectoraux."],
      cues: ["Épaules basses et plaquées", "Poignets dans l'axe des avant-bras", "Retour contrôlé"],
      mistakes: ["Hausser les épaules", "Cambrer pour pousser plus lourd"],
    },
  },
  {
    key: "rowing-machine",
    name: "Rowing à la machine (tirage horizontal)",
    muscle: "Dos (milieu) et biceps",
    aliases: ["rowing machine", "rowing machine tirage horizontal", "tirage horizontal machine", "row machine", "rowing assis machine", "iso row", "rowing machine leger", "machine a rowing", "tirage horizontal assis machine", "rowing convergent"],
    guide: {
      steps: ["Assis, poitrine contre le support, saisis les poignées bras tendus.", "Tire les coudes vers l'arrière le long du corps en serrant les omoplates.", "Reviens lentement jusqu'aux bras tendus sans décoller la poitrine du support."],
      cues: ["Poitrine collée au support", "Omoplates serrées en fin de tirage", "Coudes près du corps"],
      mistakes: ["Tirer avec les biceps seulement", "Reculer le buste pour tricher"],
    },
  },
  {
    key: "developpe-epaules-machine",
    name: "Développé épaules à la machine",
    muscle: "Épaules",
    aliases: ["developpe epaules machine", "shoulder press machine", "developpe militaire machine", "presse epaules machine", "developpe assis machine epaules", "machine epaules"],
    guide: {
      steps: ["Règle le siège pour que les poignées soient à hauteur des épaules.", "Pousse vers le haut jusqu'à presque tendre les bras.", "Redescends lentement jusqu'à ce que les poignées reviennent au niveau des oreilles."],
      cues: ["Dos plaqué au dossier", "Poignets droits", "Ne verrouille pas les coudes"],
      mistakes: ["Cambrer le bas du dos", "Descendre trop bas avec les épaules douloureuses"],
    },
  },
  {
    key: "developpe-epaules-halteres-assis",
    name: "Développé épaules haltères assis",
    muscle: "Épaules et triceps",
    aliases: ["developpe epaules halteres assis", "developpe militaire halteres assis", "developpe militaire haltere assis", "seated dumbbell press", "developpe assis halteres", "developpe militaire assis banc reglable", "developpe epaules assis"],
    guide: {
      steps: ["Assis sur un banc à dossier droit ou légèrement incliné, haltères à hauteur des oreilles, paumes vers l'avant.", "Pousse vers le haut jusqu'à presque tendre les bras, les haltères se rapprochent sans se toucher.", "Redescends lentement jusqu'à ce que les coudes reviennent à 90 degrés."],
      cues: ["Dos collé au dossier", "Coudes légèrement devant le buste", "Trajet légèrement en arc"],
      mistakes: ["Cambrer le bas du dos", "Descendre trop bas"],
    },
  },
  {
    key: "elevations-laterales-poulie",
    name: "Élévation latérale à la poulie",
    muscle: "Épaules",
    aliases: ["elevation laterale poulie", "elevations laterales poulie", "cable lateral raise", "elevation laterale cable", "elevations laterales poulie basse", "elevation laterale unilaterale poulie"],
    guide: {
      steps: ["Debout ou assis de profil à une poulie basse, poignée dans la main éloignée de la machine.", "Monte le bras tendu sur le côté jusqu'à l'horizontale, coude légèrement fléchi.", "Redescends lentement sans reposer la charge entre les répétitions."],
      cues: ["Coude au-dessus du poignet", "Épaule basse, ne hausse pas", "Tension constante"],
      mistakes: ["Donner de l'élan avec le buste", "Monter au-dessus de l'épaule"],
    },
  },
  {
    key: "oiseau-poulie",
    name: "Oiseau à la poulie (arrière d'épaule)",
    muscle: "Arrière d'épaule et haut du dos",
    aliases: ["oiseau poulie", "cable rear delt fly", "oiseau cable", "ecarte inverse poulie", "arriere epaule poulie", "reverse fly poulie", "oiseau vis a vis"],
    guide: {
      steps: ["Face à un vis-à-vis, saisis la poignée de gauche avec la main droite et inversement, bras tendus devant.", "Ouvre les bras vers l'arrière, coudes légèrement fléchis, en serrant les omoplates.", "Reviens lentement en gardant les épaules basses."],
      cues: ["Épaules basses", "Coudes légèrement fléchis, fixes", "Mouvement lent"],
      mistakes: ["Hausser les épaules", "Tirer avec les biceps"],
    },
  },
  {
    key: "oiseau-machine",
    name: "Oiseau à la machine (reverse fly)",
    muscle: "Arrière d'épaule et haut du dos",
    aliases: ["oiseau machine", "reverse fly machine", "pec deck inverse", "rear delt machine", "ecarte inverse machine", "oiseau pec deck", "arriere epaule machine"],
    guide: {
      steps: ["Assis face au dossier, poignées devant toi à hauteur des épaules.", "Ouvre les bras vers l'arrière, coudes légèrement fléchis, en serrant les omoplates.", "Reviens lentement sans laisser les plaques se toucher."],
      cues: ["Poitrine contre le support", "Coudes à hauteur d'épaules", "Serre les omoplates en fin de mouvement"],
      mistakes: ["Hausser les épaules", "Utiliser l'élan du buste"],
    },
  },
  {
    key: "tirage-vertical-prise-serree",
    name: "Tirage vertical prise serrée ou neutre",
    muscle: "Dos (grand dorsal) et biceps",
    aliases: ["tirage vertical prise serree", "tirage vertical prise neutre", "tirage poitrine prise neutre", "close grip pulldown", "tirage vertical poulie haute prise neutre", "tirage vertical triangle", "tirage vertical prise marteau", "lat pulldown prise neutre"],
    guide: {
      steps: ["Assis, cuisses bloquées, poignée serrée ou triangle saisi bras tendus.", "Tire vers le haut de la poitrine en amenant les coudes vers le bas et l'arrière.", "Remonte lentement jusqu'aux bras tendus, épaules qui s'étirent vers le haut."],
      cues: ["Poitrine haute", "Coudes vers les hanches", "Retour lent"],
      mistakes: ["Se pencher trop en arrière", "Tirer derrière la nuque"],
    },
  },
  {
    key: "tractions-assistees",
    name: "Tractions assistées",
    muscle: "Dos (grand dorsal) et biceps",
    aliases: ["tractions assistees", "traction assistee", "tractions assistees elastique", "tractions assistees machine", "assisted pull up", "tractions avec elastique", "tractions assistees sangles", "tractions assistees aux sangles de suspension", "traction assistee bande"],
    guide: {
      steps: ["Élastique sous les pieds ou les genoux (ou plateforme de la machine assistée), mains en prise pronation un peu plus larges que les épaules.", "Tire jusqu'à passer le menton au-dessus de la barre en amenant les coudes vers les hanches.", "Redescends lentement jusqu'aux bras tendus."],
      cues: ["Omoplates abaissées avant de tirer", "Regard vers la barre, poitrine haute", "Descente contrôlée"],
      mistakes: ["Se balancer", "Ne descendre qu'à moitié"],
    },
  },
  {
    key: "rowing-inverse",
    name: "Rowing inversé aux sangles",
    muscle: "Dos (milieu) et biceps",
    aliases: ["rowing inverse", "inverted row", "rowing trx", "tirage horizontal sangles", "tirage sangles de suspension", "rowing sangles", "australian pull up", "tirage horizontal trx", "rowing aux sangles de suspension"],
    guide: {
      steps: ["Suspendu aux sangles ou à une barre basse, corps gainé en ligne droite, talons au sol.", "Tire la poitrine vers les mains en serrant les omoplates, coudes le long du corps.", "Redescends lentement jusqu'aux bras tendus sans casser l'alignement."],
      cues: ["Corps en planche du début à la fin", "Serre les omoplates en haut", "Plus les pieds sont loin, plus c'est dur"],
      mistakes: ["Laisser les hanches tomber", "Hausser les épaules"],
    },
  },
  {
    key: "dips-machine",
    name: "Dips à la machine",
    muscle: "Triceps et pectoraux",
    aliases: ["dips machine", "dip machine", "dips assis machine", "machine a dips", "dips assiste machine"],
    guide: {
      steps: ["Assis, dos contre le dossier, mains sur les poignées, coudes fléchis à 90 degrés.", "Pousse vers le bas jusqu'à presque tendre les bras.", "Reviens lentement jusqu'à l'angle de départ sans lâcher la charge."],
      cues: ["Épaules basses", "Coudes le long du corps", "Retour contrôlé"],
      mistakes: ["Hausser les épaules", "Verrouiller les coudes d'un coup"],
    },
  },

];

/**
 * Toutes les fiches, salle puis maison. L'ordre compte peu pour le
 * rapprochement (il prend le meilleur score), il compte pour l'affichage du
 * catalogue coach, qui suit cet ordre.
 */
export const EXERCISE_LIBRARY: LibraryExercise[] = [...EXERCISE_LIBRARY_BASE, ...EXERCISE_LIBRARY_MAISON];

/** Recherche l'entrée de bibliothèque correspondant à un nom d'exercice, ou null.
 *  Rapprochement par JETONS : un alias dont TOUS les jetons figurent dans le nom
 *  gagne (l'alias le plus spécifique d'abord), sinon un fort recouvrement partiel. */
/**
 * Index des alias, calculé une fois : jetons et mots de mouvement de chaque
 * alias. Le rapprochement les recalculait à chaque appel pour chaque alias
 * (un millier de normalisations par nom cherché), ce qui se voyait à peine
 * avec cent fiches et devenait le poste principal avec deux cents.
 */
const ALIAS_INDEX: { entry: LibraryExercise; at: string[]; aMove: string[] }[] = [];
for (const entry of EXERCISE_LIBRARY) {
  for (const alias of entry.aliases) {
    const at = tokensOf(alias);
    if (at.length === 0) continue;
    ALIAS_INDEX.push({ entry, at, aMove: movementTokens(at) });
  }
}

export function matchLibraryExercise(rawName: string): LibraryExercise | null {
  const qTokens = tokensOf(rawName);
  if (qTokens.length === 0) return null;
  const qSet = new Set(qTokens);
  const qMove = movementTokens(qTokens);

  let best: { entry: LibraryExercise; score: number } | null = null;
  for (const { entry, at, aMove } of ALIAS_INDEX) {
    {
      const shared = at.filter((t) => qSet.has(t)).length;
      if (shared === 0) continue;

      // Le mouvement doit coïncider quand les deux côtés en nomment un.
      if (qMove.length && aMove.length && !aMove.some((t) => qSet.has(t))) continue;

      let score: number;
      if (shared === at.length) {
        // Alias entièrement contenu : plus l'alias est précis (long), mieux c'est ;
        // on pénalise légèrement les jetons du nom non couverts (moins spécifique).
        score = 1000 + at.length * 10 - (qTokens.length - at.length);
      } else {
        // Recouvrement partiel : il faut au moins deux jetons communs et les
        // trois quarts de l'alias. Un seul mot commun (« machine », « poulie »)
        // ne dit rien du mouvement.
        if (shared < 2 || shared / at.length < 0.75) continue;
        score = shared * 8;
      }
      if (score > (best?.score ?? 0)) best = { entry, score };
    }
  }
  return best ? best.entry : null;
}
