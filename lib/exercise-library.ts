// Bibliothèque d'exercices (PURE, testable : aucune dépendance serveur).
// Chaque entrée porte un nom FR, des alias (pour reconnaître les noms générés par
// l'IA), le groupe musculaire, deux images (position de départ / d'arrivée, en
// domaine public) et des consignes pour débutants. Le résolveur serveur
// (lib/exercise-guide) superpose : média du coach > cette bibliothèque > IA.
//
// Images : jeu « free-exercise-db » (yuhonas), licence Unlicense (domaine public),
// auto-hébergées dans /public/exercises/<clé>/{0,1}.jpg.

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
}

/** Deux images (départ / arrivée) d'une entrée de bibliothèque. */
export function libraryFrames(key: string): string[] {
  return [`/exercises/${key}/0.jpg`, `/exercises/${key}/1.jpg`];
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

function tokensOf(s: string): string[] {
  return normalizeExerciseName(s).split(" ").filter(Boolean);
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  {
    key: "squat",
    name: "Squat",
    muscle: "Cuisses et fessiers",
    aliases: ["squat", "squat barre", "back squat", "squat poids du corps", "air squat", "squat gobelet", "goblet squat"],
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
    aliases: ["squat au poids du corps", "squat sans charge", "chaise", "squat chaise", "bodyweight squat"],
    guide: {
      steps: [
        "Debout, pieds largeur d'épaules, bras tendus devant toi pour l'équilibre.",
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
    aliases: ["fentes", "fente", "lunges", "fentes halteres", "fentes avant", "fentes statiques"],
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
    aliases: ["souleve de terre roumain", "romanian deadlift", "rdl", "souleve de terre jambes tendues"],
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
    aliases: ["leg curl allonge", "leg curl couche", "lying leg curl", "curl ischios allonge"],
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
    aliases: ["hip thrust", "poussee de hanches", "thrust", "hip thrust barre"],
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
    aliases: ["rowing haltere", "rowing halteres", "dumbbell row", "rowing un bras", "tirage haltere"],
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
    aliases: ["developpe epaules", "developpe epaules halteres", "shoulder press", "dumbbell shoulder press", "developpe assis halteres"],
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
    aliases: ["rameur", "rowing machine", "ergometre", "cardio rameur", "aviron"],
    noPhoto: true,
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
    noPhoto: true,
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
    noPhoto: true,
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
    noPhoto: true,
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
    noPhoto: true,
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
    noPhoto: true,
    guide: {
      steps: [
        "Buste penché en avant, dos droit, un haltère léger dans chaque main.",
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
    noPhoto: true,
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
    noPhoto: true,
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
    noPhoto: true,
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
    aliases: ["gainage lateral", "planche laterale", "side plank", "gainage cote"],
    noPhoto: true,
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
    noPhoto: true,
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
    aliases: ["wall sit", "chaise isometrique", "chaise contre le mur", "gainage cuisses"],
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
    noPhoto: true,
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
];

/** Recherche l'entrée de bibliothèque correspondant à un nom d'exercice, ou null.
 *  Rapprochement par JETONS : un alias dont TOUS les jetons figurent dans le nom
 *  gagne (l'alias le plus spécifique d'abord), sinon un fort recouvrement partiel. */
export function matchLibraryExercise(rawName: string): LibraryExercise | null {
  const qTokens = tokensOf(rawName);
  if (qTokens.length === 0) return null;
  const qSet = new Set(qTokens);

  let best: { entry: LibraryExercise; score: number } | null = null;
  for (const entry of EXERCISE_LIBRARY) {
    for (const alias of entry.aliases) {
      const at = tokensOf(alias);
      if (at.length === 0) continue;
      const shared = at.filter((t) => qSet.has(t)).length;
      if (shared === 0) continue;

      let score: number;
      if (shared === at.length) {
        // Alias entièrement contenu : plus l'alias est précis (long), mieux c'est ;
        // on pénalise légèrement les jetons du nom non couverts (moins spécifique).
        score = 1000 + at.length * 10 - (qTokens.length - at.length);
      } else {
        // Recouvrement partiel : accepté seulement s'il couvre l'essentiel de l'alias.
        if (shared / at.length < 0.6) continue;
        score = shared * 8;
      }
      if (score > (best?.score ?? 0)) best = { entry, score };
    }
  }
  return best ? best.entry : null;
}
