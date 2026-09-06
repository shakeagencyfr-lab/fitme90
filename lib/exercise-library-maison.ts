// Bibliothèque « maison » : poids du corps, haltères, kettlebell, élastiques,
// medecine ball, ballon de gym.
//
// POURQUOI UN DEUXIÈME FICHIER. La bibliothèque de base a été écrite pour la
// salle. Les gens qui s'entraînent chez eux, sans matériel ou avec trois
// accessoires, n'y trouvaient qu'une vingtaine de mouvements : le générateur
// tournait en rond, puis inventait, et le client ouvrait une fiche dont la
// photo montrait autre chose.
//
// CHAQUE FICHE EST ÉCRITE DEVANT SON IMAGE. Les photos viennent du même jeu
// que la base (free-exercise-db, domaine public) et le texte décrit ce qu'on y
// voit : la version sur banc si la photo est sur banc, un seul bras si la
// photo n'en montre qu'un. Quand aucune image ne montre le mouvement, la fiche
// le dit (`noPhoto`) plutôt que d'emprunter la photo du voisin.
//
// Les traits (familles travaillées, matériel requis) sont portés par la fiche
// elle-même : ils se relisent en même temps que le texte et l'image.

import type { LibraryExercise } from "./exercise-library";

export const EXERCISE_LIBRARY_MAISON: LibraryExercise[] = [
  // ─────────────────────────────────────────────── poids du corps : poussée
  {
    key: "pompes-inclinees",
    name: "Pompes inclinées (mains surélevées)",
    muscle: "Pectoraux",
    aliases: ["pompes inclinees", "pompes mains surelevees", "pompes sur banc", "pompes sur box", "incline push up", "incline push-up", "pompes faciles"],
    traits: { familles: ["pectoraux", "triceps", "epaules"], besoin: [] },
    guide: {
      steps: [
        "Face à un banc, une box ou un meuble stable, mains sur le bord un peu plus larges que les épaules.",
        "Recule les pieds pour que le corps forme une ligne droite de la tête aux talons.",
        "Plie les coudes pour amener la poitrine vers le bord, puis pousse jusqu'à tendre les bras.",
      ],
      cues: ["Corps gainé, bassin ni trop haut ni trop bas", "Coudes à 45 degrés, pas en croix", "Plus le support est haut, plus c'est facile"],
      mistakes: ["Laisser les hanches s'affaisser", "Poser les mains trop en avant du support"],
    },
  },
  {
    key: "pompes-pieds-sureleves",
    name: "Pompes pieds surélevés",
    muscle: "Pectoraux (haut) et épaules",
    aliases: ["pompes pieds sureleves", "pompes declinees", "decline push up", "push ups feet elevated", "pompes pieds sur banc"],
    traits: { familles: ["pectoraux", "epaules", "triceps"], besoin: [] },
    guide: {
      steps: [
        "Pointes de pieds posées sur un banc ou une marche, mains au sol un peu plus larges que les épaules.",
        "Descends la poitrine vers le sol en inspirant, corps bien droit.",
        "Pousse fort dans les mains pour revenir bras tendus, en soufflant.",
      ],
      cues: ["Regard vers le sol, nuque longue", "Ventre serré pour ne pas cambrer", "Plus les pieds sont hauts, plus c'est dur"],
      mistakes: ["Cambrer le bas du dos", "Descendre trop vite sans contrôle"],
    },
  },
  {
    key: "pompes-larges",
    name: "Pompes prise large",
    muscle: "Pectoraux",
    aliases: ["pompes larges", "pompes prise large", "wide push up", "push up wide", "pompes mains ecartees"],
    traits: { familles: ["pectoraux", "epaules", "triceps"], besoin: [] },
    guide: {
      steps: [
        "En planche sur les mains et la pointe des pieds, mains nettement plus larges que les épaules.",
        "Plie les coudes vers l'extérieur pour amener la poitrine près du sol.",
        "Pousse en serrant les pectoraux jusqu'à tendre les bras.",
      ],
      cues: ["Hanches alignées avec les épaules", "Les mains restent sous la ligne des épaules", "Souffle en poussant"],
      mistakes: ["Laisser le bassin tomber", "Coudes trop en arrière des poignets"],
    },
  },
  {
    key: "pompes-serrees",
    name: "Pompes serrées (triceps)",
    muscle: "Triceps et pectoraux",
    aliases: ["pompes serrees", "pompes prise serree", "close push up", "pompes triceps", "pompes mains serrees", "pompes diamant"],
    traits: { familles: ["triceps", "pectoraux", "epaules"], besoin: [] },
    guide: {
      steps: [
        "Face au sol, mains plus serrées que les épaules, bras tendus, corps droit.",
        "Descends jusqu'à frôler le sol avec la poitrine, coudes le long du corps.",
        "Pousse en tendant les bras, en sentant l'arrière des bras travailler.",
      ],
      cues: ["Coudes collés aux côtes", "Gaine le ventre tout du long", "Amplitude complète"],
      mistakes: ["Écarter les coudes en croix", "Casser les hanches pour compenser"],
    },
  },
  {
    key: "pompes-claquees",
    name: "Pompes claquées (pliométriques)",
    muscle: "Pectoraux (explosivité)",
    aliases: ["pompes claquees", "pompes pliometriques", "plyo push up", "clap push up", "pompes explosives", "pompes sautees"],
    traits: { familles: ["pectoraux", "triceps", "cardio"], besoin: [] },
    guide: {
      steps: [
        "En position de pompe, mains largeur d'épaules, corps droit.",
        "Descends la poitrine vers le sol, puis pousse aussi vite que possible.",
        "Décolle les mains du sol en haut (claque si tu peux), réceptionne coudes souples et enchaîne.",
      ],
      cues: ["Explosif à la montée, contrôlé à la descente", "Réception mains sous les épaules", "Peu de répétitions, toutes de qualité"],
      mistakes: ["Réception bras tendus, coudes verrouillés", "Continuer quand le saut disparaît"],
    },
  },
  {
    key: "pompe-planche-laterale",
    name: "Pompe puis planche latérale",
    muscle: "Pectoraux et obliques",
    aliases: ["pompe planche laterale", "push up to side plank", "pompe rotation", "pompe t", "t push up"],
    traits: { familles: ["pectoraux", "obliques", "abdos"], besoin: [] },
    guide: {
      steps: [
        "Fais une pompe, mains juste plus larges que les épaules, corps droit.",
        "En remontant, bascule le poids sur une main et ouvre le buste en levant l'autre bras vers le plafond, en planche latérale.",
        "Repose la main, refais une pompe, et ouvre de l'autre côté.",
      ],
      cues: ["Hanches hautes en planche latérale", "Bras levé dans le prolongement de l'épaule d'appui", "Rythme calme, chaque position tenue"],
      mistakes: ["Laisser le bassin descendre pendant la rotation", "Bâcler la pompe pour aller plus vite"],
    },
  },
  {
    key: "pompes-equilibre",
    name: "Pompes en équilibre contre un mur",
    muscle: "Épaules et triceps",
    aliases: ["pompes equilibre", "pompes en equilibre", "handstand push up", "hspu", "pompes poirier", "pompes contre le mur"],
    traits: { familles: ["epaules", "triceps"], besoin: [] },
    guide: {
      steps: [
        "Dos au mur, mains au sol largeur d'épaules, monte les jambes contre le mur pour te retrouver à l'envers, bras tendus.",
        "Plie les coudes lentement jusqu'à frôler le sol avec la tête.",
        "Pousse pour revenir bras presque tendus, en soufflant.",
      ],
      cues: ["Descente lente, toujours", "Corps le plus droit possible", "Regard vers le mur, pas vers le sol"],
      mistakes: ["Descendre trop vite", "Se lancer sans une bonne base de pompes et de développé"],
    },
  },

  // ─────────────────────────────────────────────── poids du corps : tirage
  {
    key: "traction-scapulaire",
    name: "Traction scapulaire",
    muscle: "Haut du dos (omoplates)",
    aliases: ["traction scapulaire", "scapular pull up", "scap pull up", "haussement suspendu", "tractions scapulaires"],
    traits: { familles: ["dos_vertical", "trapezes"], besoin: ["traction"] },
    guide: {
      steps: [
        "Suspendu à la barre, prise pronation, bras tendus et corps relâché.",
        "Sans plier les coudes, abaisse les omoplates pour remonter de quelques centimètres.",
        "Marque un temps en haut, puis relâche lentement en position suspendue.",
      ],
      cues: ["Les bras restent tendus tout du long", "Le mouvement vient des épaules qui descendent", "Petite amplitude, grande précision"],
      mistakes: ["Plier les coudes pour monter plus haut", "Se laisser tomber au retour"],
    },
  },
  {
    key: "rowing-inverse-barre",
    name: "Rowing inversé sous une barre",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing inverse barre", "rowing inverse", "inverted row", "traction australienne", "australian pull up", "rowing sous la barre", "rowing sous une table"],
    traits: { familles: ["dos_horizontal", "biceps"], besoin: ["barre"] },
    guide: {
      steps: [
        "Barre posée à hauteur de taille, allonge-toi dessous, prise plus large que les épaules, talons au sol, corps tendu.",
        "Tire la poitrine vers la barre en serrant les omoplates.",
        "Marque un temps en haut, puis redescends bras tendus sans casser la ligne du corps.",
      ],
      cues: ["Corps droit des talons à la tête", "Coudes vers l'arrière, pas vers l'extérieur", "Plus tu es horizontal, plus c'est dur"],
      mistakes: ["Laisser le bassin pendre", "Tirer avec le menton au lieu de la poitrine"],
    },
  },

  // ─────────────────────────────────────── poids du corps : jambes et sauts
  {
    key: "fentes-marchees-sans-charge",
    name: "Fentes marchées sans charge",
    muscle: "Cuisses et fessiers",
    aliases: ["fentes marchees sans charge", "fentes marchees poids du corps", "bodyweight walking lunge", "walking lunge", "fentes en marchant"],
    traits: { familles: ["quadriceps", "fessiers"], besoin: [] },
    guide: {
      steps: [
        "Debout, mains sur les hanches, fais un grand pas en avant.",
        "Descends jusqu'à ce que le genou arrière frôle le sol, buste droit, genou avant au-dessus du pied.",
        "Pousse dans le talon avant pour te relever et enchaîne le pas suivant avec l'autre jambe.",
      ],
      cues: ["Grand pas, buste vertical", "Le genou avant reste au-dessus de la cheville", "Regard loin devant"],
      mistakes: ["Pas trop court qui fait avancer le genou", "Se pencher en avant pour se relever"],
    },
  },
  {
    key: "montee-banc-genou",
    name: "Montée sur banc avec genou levé",
    muscle: "Cuisses et fessiers",
    aliases: ["montee sur banc genou leve", "step up genou", "step up with knee raise", "step up knee", "montee de marche genou"],
    traits: { familles: ["fessiers", "quadriceps"], besoin: ["step"] },
    guide: {
      steps: [
        "Face à un banc ou une box stable, pieds joints.",
        "Pose un pied entier dessus et monte en poussant dans ce talon, puis lève l'autre genou le plus haut possible.",
        "Redescends en contrôle et alterne les jambes.",
      ],
      cues: ["Tout le pied sur le support", "Pousse avec la jambe d'appui, pas avec l'élan", "Buste droit en haut"],
      mistakes: ["Se propulser avec la jambe au sol", "Redescendre en se laissant tomber"],
    },
  },
  {
    key: "squat-saute",
    name: "Squat sauté",
    muscle: "Cuisses et fessiers (explosivité)",
    aliases: ["squat saute", "squats sautes", "jump squat", "jump squats", "squat jump", "squat pliometrique"],
    traits: { familles: ["quadriceps", "fessiers", "cardio"], besoin: [] },
    guide: {
      steps: [
        "Pieds largeur d'épaules, bras croisés sur la poitrine, regard devant.",
        "Descends en squat cuisses parallèles au sol, dos droit.",
        "Saute le plus haut possible, puis réceptionne genoux souples et redescends aussitôt en squat.",
      ],
      cues: ["Réception silencieuse, sur l'avant du pied puis le talon", "Genoux dans l'axe des pieds", "Enchaîne sans marquer d'arrêt en haut"],
      mistakes: ["Réception jambes tendues", "Genoux qui rentrent vers l'intérieur à l'atterrissage"],
    },
  },
  {
    key: "saut-groupe",
    name: "Saut groupé",
    muscle: "Jambes (explosivité)",
    aliases: ["saut groupe", "sauts groupes", "knee tuck jump", "tuck jump", "saut genoux poitrine"],
    traits: { familles: ["quadriceps", "fessiers", "cardio"], besoin: [] },
    guide: {
      steps: [
        "Debout, genoux légèrement fléchis, mains devant la poitrine paumes vers le bas.",
        "Descends vite en quart de squat et explose vers le haut en ramenant les genoux vers les mains.",
        "Réceptionne genoux fléchis pour absorber, puis repars.",
      ],
      cues: ["Genoux vers la poitrine, pas le buste vers les genoux", "Réception souple et silencieuse", "Peu de sauts, tous à fond"],
      mistakes: ["Se pencher en avant pour toucher les mains", "Atterrir jambes raides"],
    },
  },
  {
    key: "bond-lateral",
    name: "Bond latéral",
    muscle: "Fessiers et cuisses (explosivité)",
    aliases: ["bond lateral", "bonds lateraux", "lateral bound", "saut lateral", "skater jump", "saut de patineur"],
    traits: { familles: ["fessiers", "quadriceps", "cardio"], besoin: [] },
    guide: {
      steps: [
        "En demi-squat, de profil par rapport à la direction du saut.",
        "Pousse fort sur la jambe extérieure pour bondir sur le côté le plus loin possible.",
        "Réceptionne sur l'autre jambe, absorbe, et repars aussitôt dans l'autre sens.",
      ],
      cues: ["Réception sur une jambe, genou dans l'axe", "Bras qui accompagnent le saut", "Gaine le ventre à la réception"],
      mistakes: ["Genou qui rentre à l'atterrissage", "Sauter haut au lieu de sauter loin"],
    },
  },
  {
    key: "fentes-sautees",
    name: "Fentes sautées",
    muscle: "Cuisses et fessiers (explosivité)",
    aliases: ["fentes sautees", "fente sautee", "scissors jump", "jump lunge", "split jump", "fentes alternees sautees"],
    traits: { familles: ["quadriceps", "fessiers", "cardio"], besoin: [] },
    guide: {
      steps: [
        "En position de fente, genou arrière près du sol, genou avant au-dessus du pied.",
        "Pousse sur les deux jambes pour sauter, bras qui aident.",
        "Change de jambe en l'air et réceptionne en fente de l'autre côté.",
      ],
      cues: ["Buste droit pendant tout le saut", "Réception amortie, genoux fléchis", "Le genou avant reste dans l'axe"],
      mistakes: ["Réception genou avant tendu", "Fente trop courte qui envoie le genou trop loin devant"],
    },
  },
  {
    key: "saut-longueur",
    name: "Saut en longueur sans élan",
    muscle: "Jambes (explosivité)",
    aliases: ["saut en longueur", "saut en longueur sans elan", "standing long jump", "broad jump", "saut de longueur"],
    traits: { familles: ["quadriceps", "fessiers", "cardio"], besoin: [] },
    guide: {
      steps: [
        "Pieds largeur d'épaules, en demi-squat, bras en arrière.",
        "Lance les bras vers l'avant et pousse fort pour sauter le plus loin possible.",
        "Réceptionne pieds devant toi, genoux fléchis, et stabilise-toi avant de repartir.",
      ],
      cues: ["Les bras donnent l'élan", "Réception stable, sans pas de rattrapage", "Sur un sol souple de préférence"],
      mistakes: ["Réception jambes tendues", "Repartir avant d'être stable"],
    },
  },
  {
    key: "saut-etoile",
    name: "Saut étoile",
    muscle: "Cardio corps entier",
    aliases: ["saut etoile", "sauts etoile", "star jump", "star jumps", "saut en etoile"],
    traits: { familles: ["cardio", "quadriceps"], besoin: [] },
    guide: {
      steps: [
        "Debout, pieds largeur d'épaules, bras le long du corps.",
        "Descends en demi-squat puis saute en écartant bras et jambes en étoile.",
        "Ramène bras et jambes avant la réception, amortis genoux fléchis, et repars.",
      ],
      cues: ["Extension complète en l'air", "Réception souple", "Rythme régulier, respiration libre"],
      mistakes: ["Réception jambes raides", "Sauts de plus en plus petits sans s'en apercevoir"],
    },
  },
  {
    key: "talons-fesses",
    name: "Talons-fesses sautés",
    muscle: "Cardio et cuisses",
    aliases: ["talons fesses", "talons fesses sautes", "butt kick", "butt kicks", "double leg butt kick"],
    traits: { familles: ["cardio", "quadriceps"], besoin: [] },
    guide: {
      steps: [
        "Debout, genoux légèrement fléchis.",
        "Fais un petit squat rapide et saute le plus haut possible.",
        "En l'air, plie les genoux pour toucher les fesses avec les talons, puis réceptionne genoux souples.",
      ],
      cues: ["Les talons montent, le buste reste droit", "Amortis chaque réception", "Enchaîne à un rythme tenable"],
      mistakes: ["Se pencher en avant", "Réception sur des jambes tendues"],
    },
  },
  {
    key: "skipping",
    name: "Skipping rapide",
    muscle: "Cardio",
    aliases: ["skipping", "skipping rapide", "fast skipping", "montees de genoux rapides", "course sur place", "skip"],
    traits: { familles: ["cardio", "quadriceps"], besoin: [] },
    guide: {
      steps: [
        "Debout, un pied légèrement devant.",
        "Enchaîne un pas et un petit saut sur le même pied, puis change : droite-droite-pas, gauche-gauche-pas.",
        "Accélère en gardant les appuis courts et bas.",
      ],
      cues: ["Pieds vifs, peu de temps en l'air", "Bras qui rythment le mouvement", "Buste droit, regard devant"],
      mistakes: ["Sauter haut au lieu d'aller vite", "S'affaisser sur les appuis"],
    },
  },
  {
    key: "marche-araignee",
    name: "Marche de l'araignée",
    muscle: "Sangle abdominale et corps entier",
    aliases: ["marche de l araignee", "marche araignee", "spider crawl", "spiderman crawl", "araignee"],
    traits: { familles: ["abdos", "corps_entier"], besoin: [] },
    guide: {
      steps: [
        "En position de pompe basse, coudes pliés à 90 degrés, corps droit.",
        "Décolle un pied et amène le genou vers le coude du même côté, par l'extérieur.",
        "Repose, et fais la même chose de l'autre côté, en restant bas.",
      ],
      cues: ["Reste bas tout du long", "Hanches stables, pas de balancement", "Respire, ne bloque pas"],
      mistakes: ["Monter les fesses pour faciliter", "Poser le genou au sol"],
    },
  },

  // ────────────────────────────────────────────── poids du corps : tronc
  {
    key: "sit-up",
    name: "Sit-up (relevé de buste complet)",
    muscle: "Abdominaux",
    aliases: ["sit up", "sit-up", "sit ups", "releve de buste", "releve de buste complet", "abdos complets"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, pieds calés sous un meuble ou tenus, mains derrière la tête.",
        "Relève le buste jusqu'à former un V avec les cuisses, en soufflant.",
        "Redescends lentement, vertèbre après vertèbre, en inspirant.",
      ],
      cues: ["Menton légèrement rentré", "Les mains ne tirent pas sur la nuque", "Descente lente, c'est là que ça travaille"],
      mistakes: ["Se laisser tomber au retour", "Tirer sur la tête avec les mains"],
    },
  },
  {
    key: "sit-up-partiel",
    name: "Sit-up partiel (trois quarts)",
    muscle: "Abdominaux",
    aliases: ["sit up partiel", "3/4 sit up", "sit up trois quarts", "releve de buste partiel", "abdos partiels"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, pieds calés, mains derrière ou de chaque côté de la tête.",
        "Relève le buste jusqu'à la verticale.",
        "Redescends aux trois quarts seulement, sans reposer les épaules, et repars.",
      ],
      cues: ["Les abdos restent sous tension tout le temps", "Rythme régulier", "Souffle en montant"],
      mistakes: ["Reposer les épaules au sol entre deux", "Prendre de l'élan avec les bras"],
    },
  },
  {
    key: "sit-up-grenouille",
    name: "Sit-up grenouille",
    muscle: "Abdominaux",
    aliases: ["sit up grenouille", "frog sit up", "frog sit ups", "abdos grenouille", "crunch grenouille"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, plantes de pieds l'une contre l'autre, genoux ouverts vers le sol, bras croisés sur la poitrine.",
        "Plaque le bas du dos au sol et enroule le buste vers le haut, en soufflant.",
        "Marque un temps en haut, puis redescends lentement.",
      ],
      cues: ["Les genoux restent ouverts, les fléchisseurs de hanche se reposent", "Petite amplitude, gros travail", "Bas du dos collé au sol"],
      mistakes: ["Fermer les genoux pendant le mouvement", "Tirer avec la nuque"],
    },
  },
  {
    key: "crunch-croise",
    name: "Crunch croisé",
    muscle: "Obliques",
    aliases: ["crunch croise", "crunchs croises", "cross body crunch", "coude genou oppose", "crunch oblique croise"],
    traits: { familles: ["obliques", "abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, pieds au sol, mains posées derrière la tête sans serrer.",
        "Enroule le buste en amenant l'épaule droite vers le genou gauche, que tu ramènes en même temps.",
        "Redescends et fais de même de l'autre côté, en alternant.",
      ],
      cues: ["C'est l'épaule qui va vers le genou, pas juste le coude", "Souffle à chaque montée", "Bas du dos au sol"],
      mistakes: ["Tirer la tête avec les mains", "Aller vite en balançant les jambes"],
    },
  },
  {
    key: "crunch-oblique",
    name: "Crunch oblique au sol",
    muscle: "Obliques",
    aliases: ["crunch oblique", "crunch oblique au sol", "oblique crunch", "crunch sur le cote", "abdos obliques sol"],
    traits: { familles: ["obliques"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le côté droit, jambes l'une sur l'autre légèrement pliées, main gauche derrière la tête.",
        "Relève le coude gauche vers la hanche en contractant le côté du ventre.",
        "Marque un temps en haut, redescends lentement, puis change de côté à la fin de la série.",
      ],
      cues: ["Le mouvement est petit, la contraction est forte", "Les hanches restent empilées", "Souffle en montant"],
      mistakes: ["Rouler sur le dos pour monter plus haut", "Tirer avec la main sur la nuque"],
    },
  },
  {
    key: "crunch-inverse",
    name: "Crunch inversé",
    muscle: "Abdominaux (bas)",
    aliases: ["crunch inverse", "reverse crunch", "crunch inverse au sol", "abdos inverses", "enroulement de bassin"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, bras le long du corps paumes au sol, cuisses à la verticale et pieds joints.",
        "Ramène les genoux vers la poitrine en enroulant le bassin, jusqu'à décoller les hanches du sol.",
        "Marque un temps, puis redescends les jambes en contrôle sans reposer les pieds.",
      ],
      cues: ["Le bassin s'enroule, les jambes suivent", "Les bras ne poussent pas au sol", "Lent à la descente"],
      mistakes: ["Balancer les jambes pour décoller le bassin", "Cambrer en redescendant"],
    },
  },
  {
    key: "crunch-groupe",
    name: "Crunch groupé",
    muscle: "Abdominaux",
    aliases: ["crunch groupe", "tuck crunch", "crunch jambes levees", "crunch cuisses verticales"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, cuisses à la verticale, genoux légèrement pliés et chevilles croisées, bras croisés sur la poitrine.",
        "Enroule le buste vers les genoux en gardant le bas du dos plaqué au sol.",
        "Redescends lentement sans reposer les épaules.",
      ],
      cues: ["Les jambes ne bougent pas", "Souffle en montant", "Regard vers les genoux"],
      mistakes: ["Balancer les jambes vers le buste", "Reposer complètement les épaules"],
    },
  },
  {
    key: "crunch-velo",
    name: "Crunch vélo (pédalage au sol)",
    muscle: "Obliques",
    aliases: ["crunch velo", "bicycle crunch", "pedalage au sol", "abdos velo", "crunch pedalage", "bicyclette abdos"],
    traits: { familles: ["obliques", "abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, bas du dos plaqué, mains de chaque côté de la tête, épaules décollées et cuisses à la verticale.",
        "Tends une jambe devant toi pendant que tu ramènes l'autre genou, et amène le coude opposé vers ce genou.",
        "Change de côté dans un mouvement de pédalage, lent et contrôlé.",
      ],
      cues: ["Épaules toujours décollées", "Lent, une seconde par côté au moins", "Le coude va vers le genou en tournant le buste"],
      mistakes: ["Pédaler vite sans tourner le buste", "Tirer la tête avec les mains"],
    },
  },
  {
    key: "jackknife",
    name: "Jackknife (V-up)",
    muscle: "Abdominaux",
    aliases: ["jackknife", "jack knife", "v up", "v-up", "v ups", "releve en v", "abdos en v"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, bras tendus derrière la tête, jambes tendues.",
        "Plie en deux : monte les jambes et les bras en même temps pour les faire se rejoindre au-dessus du bassin.",
        "Redescends bras et jambes ensemble, sans les reposer complètement.",
      ],
      cues: ["Jambes tendues à 35 à 45 degrés du sol", "Le haut du dos décolle, pas seulement la tête", "Expire en te fermant"],
      mistakes: ["Prendre de l'élan avec les bras", "Reposer talons et mains entre chaque"],
    },
  },
  {
    key: "jackknife-lateral",
    name: "Jackknife latéral",
    muscle: "Obliques",
    aliases: ["jackknife lateral", "side jackknife", "v up lateral", "releve lateral", "crunch lateral jambes"],
    traits: { familles: ["obliques", "abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le côté, jambes tendues l'une sur l'autre, main du dessous au sol, main du dessus derrière la tête.",
        "Monte les jambes tendues et le buste en même temps pour rapprocher le coude de la hanche.",
        "Redescends lentement sans reposer les jambes, puis change de côté à la fin de la série.",
      ],
      cues: ["Hanches empilées, tu ne bascules pas sur le dos", "Le côté du ventre fait le travail", "Lent, sans élan"],
      mistakes: ["Rouler vers l'arrière pour monter", "Balancer les jambes"],
    },
  },
  {
    key: "touchers-talons",
    name: "Touchers de talons",
    muscle: "Obliques",
    aliases: ["touchers de talons", "toucher talons", "heel touchers", "heel touches", "abdos toucher talons"],
    traits: { familles: ["obliques"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, pieds au sol écartés, bras tendus le long du corps.",
        "Décolle légèrement les épaules et glisse la main droite vers le talon droit.",
        "Reviens au centre sans reposer les épaules, puis va toucher le talon gauche.",
      ],
      cues: ["Les épaules restent décollées entre les deux côtés", "Regard vers le plafond, nuque longue", "Souffle à chaque toucher"],
      mistakes: ["Reposer la tête entre chaque côté", "Pieds trop proches des fesses, qui empêchent d'atteindre les talons"],
    },
  },
  {
    key: "coude-genou",
    name: "Coude-genou",
    muscle: "Obliques",
    aliases: ["coude genou", "coude-genou", "elbow to knee", "crunch coude genou", "abdos coude genou"],
    traits: { familles: ["obliques", "abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, cheville droite posée sur le genou gauche plié, mains derrière la tête.",
        "Enroule et tourne le buste pour amener le coude gauche vers le genou droit.",
        "Redescends en contrôle, termine la série, puis change de côté.",
      ],
      cues: ["Rotation du buste, pas seulement du coude", "Bas du dos au sol", "Souffle en montant"],
      mistakes: ["Tirer la nuque avec les mains", "Aller vite en balançant la jambe"],
    },
  },
  {
    key: "battements-jambes",
    name: "Battements de jambes sur banc",
    muscle: "Fessiers et ischios",
    aliases: ["battements de jambes", "battements jambes banc", "flutter kicks", "battements sur banc", "ciseaux fessiers"],
    traits: { familles: ["fessiers", "ischios", "lombaires"], besoin: ["banc"] },
    guide: {
      steps: [
        "À plat ventre sur un banc, hanches au bord, mains agrippées à l'avant du banc, jambes tendues.",
        "Serre les fessiers pour amener les jambes à hauteur des hanches.",
        "Bats alternativement une jambe plus haut que l'autre, en petits mouvements contrôlés.",
      ],
      cues: ["Jambes tendues, pointes de pieds tirées", "Respiration régulière", "Les fessiers travaillent, pas le bas du dos"],
      mistakes: ["Monter les jambes trop haut en cambrant", "Battre vite sans contrôle"],
    },
  },
  {
    key: "rentres-genoux-sol",
    name: "Rentrés de genoux au sol",
    muscle: "Abdominaux (bas)",
    aliases: ["rentres de genoux", "rentres de genoux au sol", "leg pull in", "genoux poitrine au sol", "knee pull in"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, jambes tendues et décollées, mains à plat le long du corps ou sous les fesses.",
        "Plie les genoux et ramène les cuisses vers le ventre en soufflant, tibias parallèles au sol.",
        "Marque un temps, puis retends les jambes sans les reposer.",
      ],
      cues: ["Bas du dos plaqué au sol", "Tibias qui restent parallèles au sol", "Lent à l'aller comme au retour"],
      mistakes: ["Cambrer quand les jambes se tendent", "Reposer les pieds entre chaque"],
    },
  },
  {
    key: "rentres-genoux-assis",
    name: "Rentrés de genoux assis",
    muscle: "Abdominaux",
    aliases: ["rentres de genoux assis", "seated leg tucks", "genoux poitrine assis", "abdos assis banc", "leg tucks"],
    traits: { familles: ["abdos"], besoin: ["banc"] },
    guide: {
      steps: [
        "Assis au bord d'un banc, mains agrippées sur les côtés, buste incliné en arrière, jambes tendues devant.",
        "Ramène les genoux vers la poitrine en redressant le buste en même temps, en soufflant.",
        "Marque un temps, puis retends les jambes et rincline le buste, sans poser les pieds.",
      ],
      cues: ["Le buste et les genoux se rapprochent ensemble", "Épaules basses, loin des oreilles", "Lent, sans à-coup"],
      mistakes: ["Se tenir uniquement avec les bras", "Arrondir le dos à l'extrême"],
    },
  },
  {
    key: "releve-bassin",
    name: "Relevé de bassin genoux fléchis",
    muscle: "Abdominaux (bas)",
    aliases: ["releve de bassin", "releve de bassin genoux flechis", "bent knee hip raise", "hip raise", "enroulement bassin genoux plies"],
    traits: { familles: ["abdos"], besoin: [] },
    guide: {
      steps: [
        "Allongé sur le dos, bras le long du corps, genoux pliés et pieds décollés de quelques centimètres.",
        "Ramène les genoux vers toi en gardant l'angle des jambes, jusqu'à décoller le bassin du sol.",
        "Serre les abdos une seconde en haut, puis redescends lentement.",
      ],
      cues: ["Le bassin s'enroule, c'est le but", "Les bras restent posés, ils ne poussent pas", "Contrôle la descente"],
      mistakes: ["Balancer les jambes pour décoller le bassin", "Reposer les pieds à chaque répétition"],
    },
  },

  // ────────────────────────────────────────────────── haltères, à la maison
  {
    key: "squat-halteres",
    name: "Squat haltères",
    muscle: "Cuisses et fessiers",
    aliases: ["squat halteres", "squat avec halteres", "dumbbell squat", "squat halteres le long du corps"],
    traits: { familles: ["quadriceps", "fessiers"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main le long des cuisses, pieds largeur d'épaules, pointes légèrement ouvertes.",
        "Descends en pliant les genoux, dos droit et regard devant, jusqu'à ce que les cuisses soient parallèles au sol.",
        "Pousse dans les talons pour remonter, en soufflant.",
      ],
      cues: ["Genoux dans l'axe des pieds", "Buste droit, poitrine ouverte", "Les haltères restent le long du corps"],
      mistakes: ["Regarder le sol et arrondir le dos", "Genoux qui partent loin devant les pointes"],
    },
  },
  {
    key: "squat-chaise-halteres",
    name: "Squat sur chaise avec haltères",
    muscle: "Cuisses et fessiers",
    aliases: ["squat sur chaise", "squat chaise halteres", "squat sur banc halteres", "box squat halteres", "dumbbell squat to a bench", "squat assis debout"],
    traits: { familles: ["quadriceps", "fessiers"], besoin: ["halteres", "step"] },
    guide: {
      steps: [
        "Debout devant une chaise ou un banc, un haltère dans chaque main le long du corps, pieds largeur d'épaules.",
        "Descends en contrôle jusqu'à effleurer l'assise, sans t'asseoir vraiment, dos droit.",
        "Pousse dans les talons pour te relever en soufflant.",
      ],
      cues: ["L'assise te dit où t'arrêter, elle ne te porte pas", "Poids dans les talons", "Regard devant"],
      mistakes: ["S'asseoir et relâcher entre deux", "Basculer le buste en avant pour se relever"],
    },
  },
  {
    key: "montee-banc-halteres",
    name: "Montée sur banc avec haltères",
    muscle: "Cuisses et fessiers",
    aliases: ["montee sur banc halteres", "step up halteres", "dumbbell step up", "dumbbell step ups", "montee de marche halteres"],
    traits: { familles: ["quadriceps", "fessiers"], besoin: ["halteres", "step"] },
    guide: {
      steps: [
        "Debout face à un banc ou une marche haute, un haltère dans chaque main le long du corps.",
        "Pose le pied droit entier dessus et monte en poussant dans ce talon, puis pose le pied gauche.",
        "Redescends le pied gauche en contrôle, puis le droit, et termine la série avant de changer de jambe.",
      ],
      cues: ["Tout le pied sur le support", "La jambe d'appui fait le travail, pas l'élan", "Buste droit"],
      mistakes: ["Se propulser avec la jambe au sol", "Redescendre en se laissant tomber"],
    },
  },
  {
    key: "sdt-jambes-tendues-halteres",
    name: "Soulevé de terre jambes tendues haltères",
    muscle: "Ischio-jambiers",
    aliases: ["souleve de terre jambes tendues halteres", "sdt jambes tendues", "stiff leg deadlift dumbbell", "stiff legged dumbbell deadlift", "souleve de terre jambes tendues"],
    traits: { familles: ["ischios", "fessiers", "lombaires"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main devant les cuisses, pieds largeur de hanches, genoux à peine fléchis.",
        "Penche le buste en poussant les hanches vers l'arrière, haltères qui descendent le long des jambes jusqu'à sentir l'arrière des cuisses s'étirer.",
        "Redresse-toi en serrant les fessiers, sans arrondir le dos.",
      ],
      cues: ["Dos plat de bout en bout", "Les haltères frôlent les jambes", "Les genoux ne bougent presque pas"],
      mistakes: ["Arrondir le bas du dos", "Plier les genoux pour descendre plus bas"],
    },
  },
  {
    key: "clean-halteres",
    name: "Clean haltères",
    muscle: "Corps entier (explosivité)",
    aliases: ["clean halteres", "dumbbell clean", "epaule jete halteres", "clean avec halteres", "epaule halteres"],
    traits: { familles: ["corps_entier", "ischios", "quadriceps", "epaules"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main, descends-les vers le sol en poussant les hanches en arrière, dos plat.",
        "Explose vers le haut en tendant hanches, genoux et chevilles, bras tendus au départ.",
        "Reçois les haltères sur les épaules en repliant légèrement les genoux, puis redresse-toi.",
      ],
      cues: ["La force vient des jambes, les bras guident", "Coudes hauts à la réception", "Dos plat au départ"],
      mistakes: ["Tirer avec les bras avant d'avoir tendu les jambes", "Arrondir le dos pour descendre"],
    },
  },
  {
    key: "swing-haltere",
    name: "Swing haltère",
    muscle: "Fessiers et ischios",
    aliases: ["swing haltere", "swing avec haltere", "dumbbell swing", "vertical swing", "balancier haltere"],
    traits: { familles: ["fessiers", "ischios", "cardio"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Un haltère tenu à deux mains, bras tendus entre les jambes, dos droit.",
        "Balance-le entre les cuisses en poussant les hanches en arrière, genoux légèrement pliés.",
        "Projette les hanches vers l'avant pour envoyer l'haltère au-dessus de la tête, puis laisse-le redescendre et enchaîne.",
      ],
      cues: ["Les hanches font le travail, pas les épaules", "Dos plat tout du long", "Serre les fessiers au passage devant"],
      mistakes: ["Squatter au lieu de faire une charnière de hanche", "Soulever avec les bras"],
    },
  },
  {
    key: "rowing-deux-halteres",
    name: "Rowing buste penché deux haltères",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing deux halteres", "rowing buste penche halteres", "bent over dumbbell row", "bent over two dumbbell row", "rowing halteres debout", "rowing halteres buste penche"],
    traits: { familles: ["dos_horizontal", "biceps"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main paumes vers toi, genoux légèrement pliés, buste penché presque parallèle au sol, dos plat.",
        "Tire les haltères vers les côtés du ventre en gardant les coudes près du corps, en soufflant.",
        "Serre les omoplates une seconde en haut, puis redescends lentement.",
      ],
      cues: ["Tête dans le prolongement du dos", "Les coudes tirent, les mains suivent", "Buste immobile"],
      mistakes: ["Se redresser à chaque répétition", "Arrondir le dos"],
    },
  },
  {
    key: "flexion-laterale-haltere",
    name: "Flexion latérale haltère",
    muscle: "Obliques",
    aliases: ["flexion laterale haltere", "side bend", "dumbbell side bend", "flexion laterale", "inclinaison laterale haltere"],
    traits: { familles: ["obliques"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans la main gauche le long de la cuisse, main droite sur la hanche, pieds largeur d'épaules.",
        "Penche le buste vers la droite le plus loin possible en gardant le dos droit, sans tourner.",
        "Reviens debout en soufflant, termine la série, puis change de main.",
      ],
      cues: ["Le mouvement est uniquement latéral", "Regard devant, tête droite", "Un seul haltère, pas deux"],
      mistakes: ["Tourner le buste en se penchant", "Tenir un haltère dans chaque main, qui annule l'effort"],
    },
  },
  {
    key: "mollets-halteres",
    name: "Mollets debout avec haltères",
    muscle: "Mollets",
    aliases: ["mollets halteres", "mollets debout halteres", "standing dumbbell calf raise", "extension mollets halteres", "calf raise halteres"],
    traits: { familles: ["mollets"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main le long du corps, avant des pieds sur une marche ou une planche, talons dans le vide.",
        "Monte sur la pointe des pieds le plus haut possible en soufflant, et tiens une seconde.",
        "Redescends lentement jusqu'à sentir les mollets s'étirer.",
      ],
      cues: ["Genoux tendus mais pas verrouillés", "Amplitude complète, en haut comme en bas", "Lent à la descente"],
      mistakes: ["Rebondir en bas", "Plier les genoux pour aider"],
    },
  },
  {
    key: "rowing-menton-halteres",
    name: "Rowing menton haltères",
    muscle: "Trapèzes et épaules",
    aliases: ["rowing menton halteres", "rowing menton", "upright row dumbbell", "dumbbell upright row", "tirage menton halteres", "tirage vertical halteres debout"],
    traits: { familles: ["trapezes", "epaules"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère dans chaque main devant les cuisses, paumes vers toi, mains un peu plus serrées que les épaules.",
        "Monte les haltères le long du corps en tirant avec les coudes, jusqu'à hauteur de la poitrine.",
        "Marque un temps, puis redescends lentement.",
      ],
      cues: ["Les coudes toujours plus hauts que les mains", "Haltères près du corps", "Ne monte pas plus haut que la poitrine si l'épaule tire"],
      mistakes: ["Monter les haltères jusqu'au menton avec les épaules qui pincent", "Se balancer avec le buste"],
    },
  },
  {
    key: "scaption",
    name: "Élévations en Y (scaption)",
    muscle: "Épaules (stabilité)",
    aliases: ["scaption", "elevations en y", "elevation y", "dumbbell scaption", "elevations scapulaires", "y raise"],
    traits: { familles: ["epaules", "trapezes"], besoin: ["halteres"] },
    guide: {
      steps: [
        "Debout, un haltère léger dans chaque main le long du corps, pouces vers le haut.",
        "Monte les bras tendus devant toi, légèrement ouverts en Y, jusqu'à l'horizontale.",
        "Redescends lentement, sans laisser les épaules remonter vers les oreilles.",
      ],
      cues: ["Très léger, c'est un exercice de qualité", "Pouces vers le plafond", "Épaules basses"],
      mistakes: ["Charger trop lourd et hausser les épaules", "Balancer le buste"],
    },
  },
  {
    key: "rotation-externe-haltere",
    name: "Rotation externe allongé sur le côté",
    muscle: "Épaules (coiffe des rotateurs)",
    aliases: ["rotation externe haltere", "rotation externe allonge", "external rotation dumbbell", "rotation externe epaule", "coiffe des rotateurs haltere"],
    traits: { familles: ["epaules", "epaules_arriere"], besoin: ["halteres", "banc"] },
    guide: {
      steps: [
        "Allongé sur le côté sur un banc, tête posée sur le bras du dessous, un haltère léger dans la main du dessus, coude plié à 90 degrés et collé au flanc.",
        "Fais tourner l'avant-bras vers le plafond en gardant le coude collé, en soufflant.",
        "Tiens une seconde en haut, puis redescends lentement.",
      ],
      cues: ["Le coude ne quitte jamais le flanc", "Très léger, mouvement lent", "Angle du coude fixe"],
      mistakes: ["Décoller le coude pour monter plus haut", "Charger trop lourd"],
    },
  },

  // ──────────────────────────────────────────────────────────── kettlebell
  {
    key: "kettlebell-swing-un-bras",
    name: "Kettlebell swing à un bras",
    muscle: "Fessiers et ischios",
    aliases: ["kettlebell swing un bras", "swing kettlebell un bras", "one arm kettlebell swing", "one-arm kettlebell swings", "swing a une main"],
    traits: { familles: ["fessiers", "ischios", "cardio"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Pieds un peu plus larges que les épaules, kettlebell tenue d'une main devant toi, dos plat.",
        "Envoie-la entre les jambes en poussant les hanches en arrière, l'autre bras en balancier.",
        "Projette les hanches vers l'avant pour la faire monter à hauteur d'épaule, laisse redescendre et enchaîne. Change de main à la fin de la série.",
      ],
      cues: ["Le bras est une corde, la force vient des hanches", "Épaule de travail basse, pas tirée vers l'avant", "Bassin qui claque en avant, fessiers serrés"],
      mistakes: ["Tirer avec l'épaule", "Laisser le buste tourner vers le bras chargé"],
    },
  },
  {
    key: "kettlebell-clean",
    name: "Clean kettlebell à un bras",
    muscle: "Fessiers, ischios et épaules",
    aliases: ["clean kettlebell", "kettlebell clean", "one arm kettlebell clean", "epaule kettlebell", "clean kettlebell un bras"],
    traits: { familles: ["ischios", "fessiers", "corps_entier"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell entre les pieds, descends en poussant les fesses en arrière, regard devant, une main sur la poignée.",
        "Tends jambes et hanches pour la faire monter le long du corps, coude qui se plie et poignet qui tourne pour la poser sur l'avant-bras à l'épaule.",
        "Redescends-la en contrôle entre les pieds et recommence.",
      ],
      cues: ["Elle glisse le long du corps, elle ne tourne pas autour de la main", "Réception souple, sans claquer le poignet", "Dos plat au départ"],
      mistakes: ["La laisser cogner l'avant-bras", "Tirer avec le bras avant d'avoir tendu les jambes"],
    },
  },
  {
    key: "kettlebell-clean-sol",
    name: "Clean kettlebell depuis le sol",
    muscle: "Fessiers, ischios et trapèzes",
    aliases: ["clean kettlebell depuis le sol", "kettlebell dead clean", "dead clean", "clean depuis le sol"],
    traits: { familles: ["ischios", "fessiers", "corps_entier"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell posée entre les pieds, descends en poussant les fesses en arrière, dos plat, regard devant.",
        "Tends jambes et hanches d'un coup pour la monter à l'épaule, poignet qui tourne au passage.",
        "Repose-la au sol en contrôle, dos plat et fesses en arrière, avant de repartir.",
      ],
      cues: ["Chaque répétition part du sol, sans balancier", "Dos plat des deux côtés du mouvement", "Poignet neutre à la réception"],
      mistakes: ["Arrondir le dos pour la reposer", "La faire cogner l'avant-bras"],
    },
  },
  {
    key: "kettlebell-rowing",
    name: "Rowing kettlebell à un bras",
    muscle: "Dos (milieu du dos)",
    aliases: ["rowing kettlebell", "kettlebell row", "one arm kettlebell row", "rowing kettlebell un bras", "tirage kettlebell"],
    traits: { familles: ["dos_horizontal", "biceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell au sol devant toi, genoux légèrement pliés, fesses en arrière et buste penché, dos plat.",
        "Tire-la vers le ventre en ramenant le coude en arrière et en serrant l'omoplate.",
        "Redescends en contrôle sans tourner le buste, et change de main à la fin de la série.",
      ],
      cues: ["Buste immobile, seul le bras bouge", "Le coude passe le long des côtes", "Serre l'omoplate en haut"],
      mistakes: ["Tourner le buste pour monter plus haut", "Arrondir le dos"],
    },
  },
  {
    key: "kettlebell-developpe",
    name: "Développé épaules deux kettlebells",
    muscle: "Épaules et triceps",
    aliases: ["developpe kettlebell", "developpe epaules kettlebell", "kettlebell press", "kettlebell military press", "two arm kettlebell military press", "developpe deux kettlebells"],
    traits: { familles: ["epaules", "triceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Deux kettlebells posées aux épaules après un clean, paumes vers l'avant, pieds largeur d'épaules.",
        "Pousse-les au-dessus de la tête jusqu'à tendre les bras, en soufflant.",
        "Redescends-les aux épaules en contrôle.",
      ],
      cues: ["Ventre et fessiers serrés, pas de cambrure", "Les bras finissent près des oreilles", "Poignets droits"],
      mistakes: ["Cambrer pour finir le mouvement", "Plier les genoux pour aider, ce serait un push press"],
    },
  },
  {
    key: "kettlebell-push-press",
    name: "Push press kettlebell à un bras",
    muscle: "Épaules et jambes",
    aliases: ["push press kettlebell", "kettlebell push press", "one arm kettlebell push press", "push press un bras"],
    traits: { familles: ["epaules", "triceps", "quadriceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell posée à l'épaule, paume vers l'avant, pieds largeur d'épaules.",
        "Fléchis légèrement les genoux, buste droit, puis pousse dans les talons pour lancer la kettlebell au-dessus de la tête.",
        "Termine bras tendu, redescends-la à l'épaule en contrôle, et change de main à la fin de la série.",
      ],
      cues: ["Petite flexion, grosse poussée des jambes", "Buste vertical pendant la flexion", "Verrouille en haut avant de redescendre"],
      mistakes: ["Se pencher en avant pendant la flexion", "Pousser avec le bras seul"],
    },
  },
  {
    key: "kettlebell-thruster",
    name: "Thruster deux kettlebells",
    muscle: "Épaules et jambes",
    aliases: ["thruster kettlebell", "kettlebell thruster", "thruster deux kettlebells", "squat push press kettlebell"],
    traits: { familles: ["quadriceps", "epaules", "cardio"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Deux kettlebells aux épaules, pieds largeur d'épaules.",
        "Descends en squat complet, dos droit.",
        "Remonte en poussant dans les talons et enchaîne directement le développé au-dessus de la tête, puis redescends-les aux épaules et repars.",
      ],
      cues: ["Un seul mouvement fluide, du squat au bras tendu", "Coudes hauts en bas du squat", "Souffle en poussant"],
      mistakes: ["S'arrêter entre le squat et le développé", "Arrondir le dos en bas"],
    },
  },
  {
    key: "turkish-get-up",
    name: "Turkish get-up",
    muscle: "Épaules et sangle abdominale",
    aliases: ["turkish get up", "turkish get-up", "tgu", "get up kettlebell", "releve turc"],
    traits: { familles: ["corps_entier", "abdos", "epaules"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Allongé sur le dos, kettlebell tenue bras tendu vers le plafond, genou du même côté plié.",
        "Pivote sur l'autre côté, appuie-toi sur le coude puis la main libre pour t'asseoir, passe à genoux en fente, puis lève-toi debout, le bras toujours tendu.",
        "Refais chaque étape à l'envers pour revenir allongé, sans jamais plier le bras.",
      ],
      cues: ["Regard sur la kettlebell tout du long", "Bras verrouillé, poignet droit", "Lent, une étape après l'autre"],
      mistakes: ["Se précipiter et sauter une étape", "Laisser le coude se plier"],
    },
  },
  {
    key: "kettlebell-windmill",
    name: "Moulin kettlebell (windmill)",
    muscle: "Obliques et épaules",
    aliases: ["moulin kettlebell", "windmill", "kettlebell windmill", "moulin a vent kettlebell"],
    traits: { familles: ["obliques", "ischios", "epaules"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell tenue bras tendu au-dessus de la tête, pieds tournés à 45 degrés à l'opposé du bras chargé.",
        "Pousse la hanche du côté du bras chargé, et penche-toi en glissant la main libre le long de la jambe jusqu'au sol si possible.",
        "Marque un temps, puis redresse-toi en gardant le bras verrouillé.",
      ],
      cues: ["Regard sur la kettlebell tout du long", "Bras tendu, poignet droit", "La hanche part sur le côté, pas vers l'avant"],
      mistakes: ["Plier le bras chargé", "Arrondir le dos au lieu de basculer la hanche"],
    },
  },
  {
    key: "kettlebell-figure-8",
    name: "Figure 8 kettlebell",
    muscle: "Sangle abdominale",
    aliases: ["figure 8 kettlebell", "kettlebell figure 8", "figure huit kettlebell", "huit kettlebell", "passage entre les jambes kettlebell"],
    traits: { familles: ["abdos", "obliques", "ischios"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Pieds plus larges que les épaules, buste penché fesses en arrière, dos plat, kettlebell dans une main.",
        "Passe-la entre les jambes à l'autre main, qui vient la chercher par derrière.",
        "Enchaîne les passages en dessinant un huit autour des jambes, sans te redresser.",
      ],
      cues: ["Dos plat, regard devant", "Le ventre reste serré pendant les passages", "Rythme régulier, pas de précipitation"],
      mistakes: ["Arrondir le dos", "Se redresser entre deux passages"],
    },
  },
  {
    key: "kettlebell-sdt-une-jambe",
    name: "Soulevé de terre une jambe kettlebell",
    muscle: "Ischio-jambiers et fessiers",
    aliases: ["souleve de terre une jambe kettlebell", "sdt une jambe kettlebell", "kettlebell one legged deadlift", "single leg deadlift kettlebell", "souleve de terre unilateral kettlebell"],
    traits: { familles: ["ischios", "fessiers"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell dans une main, debout sur la jambe du même côté, genou à peine fléchi.",
        "Penche le buste en tendant la jambe libre derrière toi, kettlebell qui descend le long de la jambe d'appui.",
        "Redresse-toi en serrant la fesse, termine la série et change de côté.",
      ],
      cues: ["Bassin horizontal, la hanche libre ne s'ouvre pas", "Dos plat de la tête au talon libre", "Lent, l'équilibre fait partie du travail"],
      mistakes: ["Arrondir le dos pour descendre plus bas", "Laisser le bassin tourner"],
    },
  },
  {
    key: "kettlebell-developpe-sol",
    name: "Développé au sol kettlebell à un bras",
    muscle: "Pectoraux et triceps",
    aliases: ["developpe au sol kettlebell", "floor press kettlebell", "kettlebell floor press", "one arm kettlebell floor press", "developpe couche au sol kettlebell"],
    traits: { familles: ["pectoraux", "triceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Allongé sur le dos, kettlebell dans une main posée sur l'avant-bras, bras appuyé au sol, paume vers l'intérieur.",
        "Pousse-la vers le plafond jusqu'à tendre le bras, en tournant légèrement le poignet.",
        "Redescends jusqu'à ce que le bras touche le sol, et change de main à la fin de la série.",
      ],
      cues: ["Le sol arrête le coude, c'est ce qui protège l'épaule", "Poignet droit sous la charge", "Ventre serré pour ne pas rouler"],
      mistakes: ["Laisser le coude s'ouvrir loin du corps", "Rebondir le bras au sol"],
    },
  },
  {
    key: "kettlebell-sumo-high-pull",
    name: "Tirage sumo kettlebell (sumo high pull)",
    muscle: "Trapèzes, épaules et jambes",
    aliases: ["sumo high pull", "kettlebell sumo high pull", "tirage sumo kettlebell", "high pull kettlebell", "tirage haut kettlebell"],
    traits: { familles: ["trapezes", "epaules", "quadriceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Pieds très écartés, kettlebell au sol entre les pieds, tenue à deux mains, hanches en arrière et poitrine haute.",
        "Tends jambes et hanches en tirant la kettlebell vers le menton, coudes qui montent haut.",
        "Redescends-la en contrôle jusqu'au sol et recommence.",
      ],
      cues: ["Les coudes finissent plus hauts que les mains", "Jambes et bras travaillent ensemble", "Dos plat au départ"],
      mistakes: ["Tirer avec les bras avant les jambes", "Arrondir le dos en bas"],
    },
  },
  {
    key: "kettlebell-snatch",
    name: "Arraché kettlebell à un bras",
    muscle: "Corps entier (explosivité)",
    aliases: ["arrache kettlebell", "kettlebell snatch", "snatch kettlebell", "one arm kettlebell snatch", "arrache un bras"],
    traits: { familles: ["corps_entier", "epaules", "ischios", "cardio"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Kettlebell entre les pieds, descends fesses en arrière, regard devant, une main sur la poignée.",
        "Balance-la entre les jambes puis explose des hanches pour l'accélérer vers le haut.",
        "À hauteur d'épaule, tourne la main et pousse le poing vers le plafond pour la recevoir bras tendu, puis redescends et enchaîne.",
      ],
      cues: ["Maîtrise d'abord le swing et le clean", "Le poing traverse, la kettlebell se pose sans cogner", "Verrouille en haut avant la descente"],
      mistakes: ["La laisser claquer l'avant-bras", "Tirer avec le bras au lieu des hanches"],
    },
  },
  {
    key: "renegade-row",
    name: "Renegade row",
    muscle: "Dos et sangle abdominale",
    aliases: ["renegade row", "rowing en planche", "rowing planche kettlebell", "alternating renegade row", "rowing pompe"],
    traits: { familles: ["dos_horizontal", "abdos", "biceps"], besoin: ["kettlebell"] },
    guide: {
      steps: [
        "Deux kettlebells au sol largeur d'épaules, en position de pompe mains sur les poignées, pieds écartés pour la stabilité.",
        "Pousse une kettlebell dans le sol et tire l'autre vers le flanc en serrant l'omoplate.",
        "Repose-la et tire de l'autre côté, sans laisser les hanches tourner.",
      ],
      cues: ["Bassin horizontal, comme une table", "Pieds écartés, ça aide", "Coude qui passe le long des côtes"],
      mistakes: ["Tourner le bassin pour tirer", "Kettlebells trop lourdes qui font vriller le corps"],
    },
  },

  // ──────────────────────────────────────────────────────────── élastiques
  {
    key: "oiseau-elastique",
    name: "Oiseau à l'élastique",
    muscle: "Arrière d'épaule et haut du dos",
    aliases: ["oiseau elastique", "oiseau a l elastique", "back flyes with bands", "band reverse fly", "reverse fly elastique", "ecarte arriere elastique"],
    traits: { familles: ["epaules_arriere", "dos_horizontal"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique accroché devant toi à hauteur d'épaules, une poignée dans chaque main, recule pour le tendre, bras tendus devant.",
        "Ouvre les bras sur les côtés et vers l'arrière, bras presque tendus, en serrant les omoplates.",
        "Marque un temps, puis reviens devant en contrôle.",
      ],
      cues: ["Épaules basses", "Les bras restent à hauteur d'épaules", "Serre les omoplates en fin de mouvement"],
      mistakes: ["Hausser les épaules", "Plier les coudes pour tricher"],
    },
  },
  {
    key: "adduction-elastique",
    name: "Adduction de hanche à l'élastique",
    muscle: "Adducteurs (intérieur des cuisses)",
    aliases: ["adduction elastique", "adduction de hanche elastique", "band hip adduction", "adducteurs elastique", "interieur cuisses elastique"],
    traits: { familles: ["adducteurs"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique accroché bas à un point fixe, passé autour de la cheville du pied le plus proche du point d'attache, de profil, une main sur un appui.",
        "Ramène la jambe tendue devant l'autre en croisant, contre la résistance.",
        "Reviens lentement, termine la série, puis change de côté.",
      ],
      cues: ["Buste droit, sans se pencher", "Jambe tendue, pied dans l'axe", "Lent au retour"],
      mistakes: ["Se pencher du côté opposé", "Prendre de l'élan"],
    },
  },
  {
    key: "pull-apart",
    name: "Écartés d'élastique (pull apart)",
    muscle: "Arrière d'épaule et haut du dos",
    aliases: ["pull apart", "band pull apart", "ecarte elastique bras tendus", "pull aparts", "tirage horizontal elastique bras tendus"],
    traits: { familles: ["epaules_arriere", "dos_horizontal", "trapezes"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout, élastique tenu à deux mains devant toi, bras tendus à hauteur d'épaules.",
        "Écarte les mains sur les côtés jusqu'à amener l'élastique contre la poitrine, coudes tendus.",
        "Reviens devant en contrôle, sans laisser l'élastique tirer les bras.",
      ],
      cues: ["Épaules basses et en arrière", "Bras à hauteur d'épaules tout du long", "Serre les omoplates en fin de course"],
      mistakes: ["Hausser les épaules", "Plier les coudes"],
    },
  },
  {
    key: "triceps-elastique-allonge",
    name: "Extension triceps allongé à l'élastique",
    muscle: "Triceps",
    aliases: ["extension triceps elastique allonge", "band skull crusher", "barre au front elastique", "skull crusher elastique", "triceps allonge elastique"],
    traits: { familles: ["triceps"], besoin: ["elastique", "banc"] },
    guide: {
      steps: [
        "Élastique fixé au pied du banc, allongé dessus, tête à l'aplomb de l'attache, poignées en main.",
        "Bras à la verticale, coudes pliés et élastique au-dessus de la tête.",
        "Tends les bras en gardant les coudes immobiles, marque un temps, puis reviens lentement.",
      ],
      cues: ["Les coudes pointent le plafond et ne bougent pas", "Poignets droits", "Contrôle le retour"],
      mistakes: ["Laisser les coudes s'ouvrir", "Descendre l'élastique derrière la tête en écartant les bras"],
    },
  },
  {
    key: "mollets-elastique",
    name: "Mollets debout à l'élastique",
    muscle: "Mollets",
    aliases: ["mollets elastique", "mollets debout elastique", "calf raises with bands", "band calf raise", "extension mollets elastique"],
    traits: { familles: ["mollets"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout sur l'élastique, avant des pieds dessus, poignées ramenées aux épaules paumes vers l'avant.",
        "Monte sur la pointe des pieds le plus haut possible en soufflant, mains qui restent aux épaules.",
        "Tiens une seconde, puis redescends lentement.",
      ],
      cues: ["Même longueur d'élastique des deux côtés", "Genoux tendus mais souples", "Contraction franche en haut"],
      mistakes: ["Rebondir en bas", "Plier les genoux"],
    },
  },
  {
    key: "ecarte-elastique",
    name: "Écarté à l'élastique",
    muscle: "Pectoraux",
    aliases: ["ecarte elastique", "ecarte a l elastique", "cross over with bands", "band chest fly", "fly elastique", "ecarte debout elastique"],
    traits: { familles: ["pectoraux"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique accroché derrière toi à hauteur d'épaules, une poignée dans chaque main, avance d'un pas pour le tendre, bras ouverts en T légèrement fléchis.",
        "Ramène les mains devant la poitrine en arc de cercle, en serrant les pectoraux.",
        "Tiens une seconde, puis rouvre lentement.",
      ],
      cues: ["Coudes légèrement fléchis et fixes", "Un pied devant pour la stabilité", "Souffle en fermant"],
      mistakes: ["Plier les coudes pour pousser", "Hausser les épaules"],
    },
  },
  {
    key: "rotation-externe-elastique",
    name: "Rotation externe à l'élastique",
    muscle: "Épaules (coiffe des rotateurs)",
    aliases: ["rotation externe elastique", "external rotation with band", "rotation externe epaule elastique", "coiffe des rotateurs elastique"],
    traits: { familles: ["epaules", "epaules_arriere"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique accroché à hauteur de coude, de profil, poignée dans la main la plus éloignée, coude plié à 90 degrés et collé au flanc.",
        "Fais tourner l'avant-bras vers l'extérieur en gardant le coude collé.",
        "Reviens lentement devant le ventre, termine la série, puis change de côté.",
      ],
      cues: ["Le coude ne quitte pas le flanc", "Léger, précis, lent", "Poignet droit"],
      mistakes: ["Décoller le coude", "Tourner le buste pour aider"],
    },
  },
  {
    key: "extension-hanche-elastique",
    name: "Extension de hanche à l'élastique",
    muscle: "Fessiers",
    aliases: ["extension de hanche elastique", "extension hanche elastique", "hip extension with bands", "kickback elastique", "fessiers elastique debout"],
    traits: { familles: ["fessiers", "ischios"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique fixé bas à un point fixe et passé autour d'une cheville, face au point d'attache, mains sur un appui.",
        "Pousse la jambe tendue vers l'arrière en serrant la fesse, sans cambrer.",
        "Reviens lentement, termine la série, puis change de jambe.",
      ],
      cues: ["Buste droit, poitrine ouverte", "Le mouvement vient de la hanche", "Amplitude courte et propre"],
      mistakes: ["Cambrer pour envoyer la jambe plus loin", "Balancer la jambe"],
    },
  },
  {
    key: "elevations-laterales-elastique",
    name: "Élévations latérales à l'élastique",
    muscle: "Épaules (deltoïde latéral)",
    aliases: ["elevations laterales elastique", "elevation laterale elastique", "lateral raise with bands", "band lateral raise", "epaules elastique"],
    traits: { familles: ["epaules"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout sur l'élastique, une poignée dans chaque main le long des cuisses, coudes à peine fléchis.",
        "Monte les bras sur les côtés jusqu'à un peu au-dessus de l'horizontale, en soufflant.",
        "Marque un temps, puis redescends lentement.",
      ],
      cues: ["Petits doigts légèrement plus hauts que les pouces en haut", "Buste immobile", "Épaules basses"],
      mistakes: ["Hausser les épaules", "Se balancer pour monter"],
    },
  },
  {
    key: "monster-walk",
    name: "Marche du monstre (monster walk)",
    muscle: "Fessiers (moyen fessier)",
    aliases: ["monster walk", "marche du monstre", "marche elastique", "marche laterale elastique", "band walk", "marche avec bande"],
    traits: { familles: ["fessiers", "adducteurs"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Un élastique autour des chevilles, un autre au-dessus des genoux si tu en as deux, pieds largeur d'épaules pour qu'ils soient tendus.",
        "Avance à petits pas en gardant les pieds écartés et les genoux vers l'extérieur.",
        "Après plusieurs pas, recule de la même façon jusqu'au point de départ.",
      ],
      cues: ["Genoux poussés vers l'extérieur tout du long", "Petits pas, tension constante", "Buste droit, légèrement fléchi"],
      mistakes: ["Rapprocher les pieds entre deux pas", "Laisser les genoux rentrer"],
    },
  },
  {
    key: "developpe-epaules-elastique",
    name: "Développé épaules à l'élastique",
    muscle: "Épaules et triceps",
    aliases: ["developpe epaules elastique", "shoulder press with bands", "band shoulder press", "developpe militaire elastique", "epaules elastique developpe"],
    traits: { familles: ["epaules", "triceps"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout sur l'élastique, poignées ramenées à hauteur d'épaules, paumes vers l'avant, coudes sous les mains.",
        "Pousse au-dessus de la tête jusqu'à tendre les bras, en soufflant.",
        "Redescends aux épaules en contrôle.",
      ],
      cues: ["Ventre serré, pas de cambrure", "Les bras finissent près des oreilles", "Même longueur d'élastique des deux côtés"],
      mistakes: ["Cambrer pour finir", "Pousser devant soi au lieu de vers le haut"],
    },
  },
  {
    key: "triceps-elastique-tete",
    name: "Extension triceps au-dessus de la tête à l'élastique",
    muscle: "Triceps",
    aliases: ["extension triceps elastique tete", "extension triceps au dessus de la tete elastique", "overhead triceps band", "speed band overhead triceps", "triceps elastique debout"],
    traits: { familles: ["triceps"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Élastique fixé au sol ou sous un pied, poignées tirées derrière la tête, coudes hauts et pointés vers le plafond.",
        "Tends les bras au-dessus de la tête en gardant les coudes immobiles.",
        "Marque un temps, puis reviens derrière la tête en contrôle.",
      ],
      cues: ["Coudes serrés près de la tête", "Ventre serré pour ne pas cambrer", "Rythme régulier"],
      mistakes: ["Ouvrir les coudes sur les côtés", "Cambrer le dos sous la tension"],
    },
  },
  {
    key: "squat-elastique",
    name: "Squat à l'élastique",
    muscle: "Cuisses et fessiers",
    aliases: ["squat elastique", "squat a l elastique", "squats with bands", "band squat", "squat bande"],
    traits: { familles: ["quadriceps", "fessiers"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout au milieu de l'élastique, pieds largeur d'épaules, poignées ramenées à hauteur des épaules paumes vers l'avant.",
        "Descends en squat jusqu'à ce que les cuisses soient parallèles au sol, dos droit.",
        "Pousse dans les talons pour remonter contre la résistance, en soufflant.",
      ],
      cues: ["Même tension des deux côtés", "Genoux dans l'axe des pieds", "Les mains restent aux épaules"],
      mistakes: ["Se pencher en avant sous la tension", "Genoux qui rentrent"],
    },
  },
  {
    key: "rowing-menton-elastique",
    name: "Rowing menton à l'élastique",
    muscle: "Trapèzes et épaules",
    aliases: ["rowing menton elastique", "upright row with bands", "band upright row", "tirage menton elastique", "tirage vertical elastique debout"],
    traits: { familles: ["trapezes", "epaules"], besoin: ["elastique"] },
    guide: {
      steps: [
        "Debout sur l'élastique, poignées devant les cuisses paumes vers toi, mains un peu plus serrées que les épaules.",
        "Monte les mains le long du corps en tirant avec les coudes, jusqu'à hauteur de la poitrine.",
        "Marque un temps, puis redescends lentement.",
      ],
      cues: ["Les coudes mènent, toujours plus hauts que les mains", "Poignées près du corps", "Ne monte pas jusqu'au menton si l'épaule pince"],
      mistakes: ["Hausser les épaules vers les oreilles", "Se balancer"],
    },
  },

  // ────────────────────────────────────────────────────────── medecine ball
  {
    key: "passe-poitrine-medecine-ball",
    name: "Passe poitrine medecine ball",
    muscle: "Pectoraux (explosivité)",
    aliases: ["passe poitrine medecine ball", "medicine ball chest pass", "chest pass", "lancer poitrine medecine ball", "passe medecine ball"],
    traits: { familles: ["pectoraux", "triceps", "cardio"], besoin: ["medecine"] },
    guide: {
      steps: [
        "Face à un partenaire ou à un mur solide, ballon tenu à deux mains contre la poitrine.",
        "Ramène-le contre toi puis projette-le devant toi en tendant les bras d'un coup sec.",
        "Rattrape-le à deux mains à hauteur de poitrine et enchaîne.",
      ],
      cues: ["Explosif à l'envoi, souple à la réception", "Ventre serré, buste légèrement penché", "Tu peux faire un pas en lançant"],
      mistakes: ["Lancer avec les bras seuls, sans le buste", "Rattraper bras tendus, coudes verrouillés"],
    },
  },
  {
    key: "rotation-medecine-ball",
    name: "Rotation dos à dos medecine ball",
    muscle: "Obliques",
    aliases: ["rotation medecine ball", "rotation dos a dos medecine ball", "medicine ball full twist", "passe rotation medecine ball", "twist medecine ball a deux"],
    traits: { familles: ["obliques", "abdos"], besoin: ["medecine"] },
    guide: {
      steps: [
        "Dos à dos avec un partenaire, à un grand pas l'un de l'autre, ballon tenu devant le ventre.",
        "Tournez tous les deux dans le même sens, hanches et épaules ensemble, pour te passer le ballon sur le côté.",
        "Repartez dans l'autre sens pour le rendre, et enchaînez. Seul, fais le tour complet en touchant un mur de chaque côté.",
      ],
      cues: ["Les hanches tournent avec les épaules", "Bras légèrement fléchis, ballon près du corps", "Rythme régulier"],
      mistakes: ["Tourner seulement les bras", "Se pencher en avant pour attraper"],
    },
  },
  {
    key: "crunch-medecine-ball",
    name: "Crunch lesté medecine ball",
    muscle: "Abdominaux",
    aliases: ["crunch leste", "crunch medecine ball", "weighted crunch", "weighted crunches", "crunch avec ballon leste", "abdos lestes"],
    traits: { familles: ["abdos"], besoin: ["medecine"] },
    guide: {
      steps: [
        "Allongé sur le dos, genoux pliés, ballon tenu contre la poitrine ou bras tendus au-dessus.",
        "Enroule le haut du dos pour décoller les épaules d'une dizaine de centimètres, bas du dos au sol.",
        "Serre les abdos une seconde en haut, puis redescends lentement.",
      ],
      cues: ["Petite amplitude, forte contraction", "Bas du dos plaqué", "Souffle en montant"],
      mistakes: ["Tirer sur la nuque", "Se relever entièrement, ce serait un sit-up"],
    },
  },
  {
    key: "lancer-arriere-medecine-ball",
    name: "Lancer arrière medecine ball",
    muscle: "Corps entier (explosivité)",
    aliases: ["lancer arriere medecine ball", "backward medicine ball throw", "lancer par dessus la tete medecine ball", "lancer arriere ballon", "scoop throw arriere"],
    traits: { familles: ["corps_entier", "fessiers", "epaules", "cardio"], besoin: ["medecine"] },
    guide: {
      steps: [
        "Debout, ballon tenu à deux mains entre les jambes, dos plat.",
        "Descends en squat puis explose vers le haut en envoyant le ballon par-dessus la tête, derrière toi.",
        "Va le chercher ou fais-le rouler par un partenaire, et recommence.",
      ],
      cues: ["Extension complète du corps au lancer", "Les jambes donnent la force, les bras suivent", "Regard qui suit le ballon"],
      mistakes: ["Arrondir le dos pour ramasser", "Lancer avec les bras seuls"],
    },
  },

  // ──────────────────────────────────────────────────────── ballon de gym
  {
    key: "leg-curl-ballon",
    name: "Leg curl sur ballon",
    muscle: "Ischio-jambiers et fessiers",
    aliases: ["leg curl ballon", "leg curl sur ballon", "ball leg curl", "swiss ball leg curl", "leg curl swiss ball", "curl ischios ballon"],
    traits: { familles: ["ischios", "fessiers"], besoin: ["swiss"] },
    guide: {
      steps: [
        "Allongé sur le dos, talons et chevilles posés sur le ballon, bras au sol le long du corps.",
        "Décolle le bassin pour aligner épaules, hanches et pieds.",
        "Plie les genoux pour ramener le ballon vers les fesses, tiens une seconde, puis retends les jambes sans reposer le bassin.",
      ],
      cues: ["Bassin haut tout du long", "Bras au sol pour la stabilité", "Lent au retour"],
      mistakes: ["Laisser le bassin retomber en tendant les jambes", "Cambrer en haut"],
    },
  },
  {
    key: "crunch-ballon",
    name: "Crunch sur ballon",
    muscle: "Abdominaux",
    aliases: ["crunch ballon", "crunch sur ballon", "exercise ball crunch", "swiss ball crunch", "crunch swiss ball", "abdos sur ballon"],
    traits: { familles: ["abdos"], besoin: ["swiss"] },
    guide: {
      steps: [
        "Assis sur le ballon, avance les pieds pour que le bas du dos repose dessus, pieds à plat, bras croisés sur la poitrine.",
        "Laisse le buste s'ouvrir en arrière, puis enroule-le vers le haut en contractant les abdos, hanches immobiles.",
        "Marque un temps en haut, puis redescends lentement jusqu'à l'étirement.",
      ],
      cues: ["Le bas du dos reste en contact avec le ballon", "Nuque neutre, regard vers le plafond", "Grande amplitude grâce au ballon"],
      mistakes: ["Se relever avec les hanches", "Tirer sur la nuque"],
    },
  },
  {
    key: "rentre-genoux-ballon",
    name: "Rentré de genoux sur ballon",
    muscle: "Abdominaux",
    aliases: ["rentre de genoux ballon", "rentres genoux ballon", "exercise ball pull in", "swiss ball pull in", "knee tuck ballon", "genoux poitrine ballon"],
    traits: { familles: ["abdos", "pectoraux"], besoin: ["swiss"] },
    guide: {
      steps: [
        "En position de pompe, mains au sol largeur d'épaules, tibias posés sur le ballon, corps droit.",
        "Ramène les genoux vers la poitrine en faisant rouler le ballon vers toi, en soufflant.",
        "Serre les abdos une seconde, puis retends les jambes en contrôle.",
      ],
      cues: ["Haut du corps immobile, épaules au-dessus des mains", "Dos plat quand les jambes sont tendues", "Lent dans les deux sens"],
      mistakes: ["Laisser les hanches s'affaisser jambes tendues", "Monter les fesses trop haut"],
    },
  },
  {
    key: "pont-fessier-ballon",
    name: "Pont fessier sur ballon",
    muscle: "Fessiers et ischios",
    aliases: ["pont fessier ballon", "pont fessier sur ballon", "physioball hip bridge", "hip bridge ballon", "swiss ball bridge", "hip thrust ballon"],
    traits: { familles: ["fessiers", "ischios"], besoin: ["swiss"] },
    guide: {
      steps: [
        "Haut du dos posé sur le ballon, pieds à plat au sol largeur de hanches ou plus, bassin bas.",
        "Pousse dans les talons pour monter le bassin jusqu'à aligner épaules, hanches et genoux.",
        "Serre les fessiers une seconde en haut, puis redescends en contrôle.",
      ],
      cues: ["Menton rentré, regard vers l'avant", "Le ballon ne doit pas rouler : pieds bien ancrés", "Tibias verticaux en haut"],
      mistakes: ["Cambrer le bas du dos en haut", "Pousser sur la pointe des pieds"],
    },
  },
  {
    key: "pompes-pieds-ballon",
    name: "Pompes pieds sur ballon",
    muscle: "Pectoraux et sangle abdominale",
    aliases: ["pompes pieds ballon", "pompes pieds sur ballon", "push ups feet on exercise ball", "pompes swiss ball", "pompes instables"],
    traits: { familles: ["pectoraux", "abdos", "triceps"], besoin: ["swiss"] },
    guide: {
      steps: [
        "Mains au sol un peu plus larges que les épaules, pointes de pieds posées sur le ballon, corps droit.",
        "Descends la poitrine vers le sol en inspirant, sans laisser le ballon bouger.",
        "Pousse pour revenir bras tendus, en soufflant.",
      ],
      cues: ["Ventre serré pour stabiliser le ballon", "Regard vers le sol", "Descente contrôlée"],
      mistakes: ["Cambrer le bas du dos", "Laisser les hanches tourner"],
    },
  },
  {
    key: "extension-lombaire-ballon",
    name: "Extension lombaire sur ballon",
    muscle: "Lombaires",
    aliases: ["extension lombaire ballon", "extension lombaire sur ballon", "ball hyperextension", "swiss ball hyperextension", "superman ballon", "extension du dos ballon"],
    traits: { familles: ["lombaires", "fessiers"], besoin: ["swiss"] },
    guide: {
      steps: [
        "À plat ventre sur le ballon, hanches dessus, pointes de pieds au sol écartées pour l'équilibre, mains derrière la tête ou croisées sur la poitrine.",
        "Redresse le buste jusqu'à aligner épaules, hanches et pieds, en soufflant.",
        "Tiens une seconde, puis redescends en contrôle.",
      ],
      cues: ["Regard vers le sol, nuque longue", "Serre les fessiers en montant", "Ne monte pas au-delà de l'alignement"],
      mistakes: ["Cambrer excessivement en haut", "Prendre de l'élan"],
    },
  },
  {
    key: "crunch-jambes-ballon",
    name: "Crunch jambes sur ballon",
    muscle: "Abdominaux",
    aliases: ["crunch jambes ballon", "crunch jambes sur ballon", "crunch legs on exercise ball", "crunch pieds sur ballon", "abdos jambes ballon"],
    traits: { familles: ["abdos"], besoin: ["swiss"] },
    guide: {
      steps: [
        "Allongé sur le dos, mollets posés sur le ballon, genoux à 90 degrés, mains de chaque côté de la tête.",
        "Plaque le bas du dos au sol et enroule les épaules d'une dizaine de centimètres, en soufflant.",
        "Serre une seconde, puis redescends lentement.",
      ],
      cues: ["Petite amplitude, lente et forte", "Coudes ouverts, mains qui ne tirent pas", "Bas du dos collé au sol"],
      mistakes: ["Tirer sur la nuque", "Utiliser l'élan"],
    },
  },

  // ────────────────────────────────────────── salle : fiche machine ajoutée
  {
    key: "mollets-debout-machine",
    name: "Mollets debout à la machine",
    muscle: "Mollets",
    aliases: ["mollets debout machine", "mollets a la machine debout", "standing calf raise machine", "standing calf raises", "machine a mollets debout", "extension mollets machine debout"],
    traits: { familles: ["mollets"], besoin: ["machine"], machine: ["mollets-debout"] },
    guide: {
      steps: [
        "Épaules sous les coussins, avant des pieds sur la cale et talons dans le vide, jambes tendues sans verrouiller.",
        "Monte sur la pointe des pieds le plus haut possible en soufflant, et tiens une seconde.",
        "Redescends lentement jusqu'à sentir les mollets s'étirer.",
      ],
      cues: ["Genoux fixes tout du long", "Amplitude complète en haut et en bas", "Lent à la descente"],
      mistakes: ["Rebondir en bas", "Plier les genoux pour aider"],
    },
  },
];
