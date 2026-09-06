// Bibliothèque de circuits : des séances toutes prêtes, écrites une fois,
// servies à n'importe quelle durée.
//
// LE PROBLÈME. Quand un client demandait à remplacer sa séance, le Coach IA
// convertissait la séance existante mouvement par mouvement. Ça marche pour
// un dépannage, mais ça ne sait pas répondre à « je veux du haut du corps »,
// « fais-moi un truc pour les abdos » ou « j'ai mal au genou aujourd'hui » :
// il n'y avait rien à choisir, seulement une traduction. Et un circuit
// improvisé à partir de six mouvements ne remplit pas honnêtement 60 minutes.
//
// LA RÉPONSE. Le même parti pris que les recettes : un catalogue écrit à
// l'avance, relu, et un moteur qui le sert. Chaque circuit est un MODÈLE
// (thème, matériel, niveaux, contre-indications, blocs) et le rendu produit la
// séance à 30, 45, 60 ou 90 minutes, avec l'effort et les tours du cycle en
// cours. Rien n'est inventé au moment de servir : les mouvements viennent de
// la bibliothèque d'exercices, donc chaque fiche a sa photo et ses consignes.
//
// CE QUE LE PRÉPARATEUR A EN TÊTE. Un bloc alterne les zones pour qu'on tienne
// sans s'arrêter. Les circuits à impact (sauts, pliométrie) sont marqués comme
// tels et ne sont jamais proposés à quelqu'un qui déclare un genou, une
// cheville ou une grossesse. Les circuits « ménagés » sont écrits POUR une
// pathologie : ils excluent le geste en cause plutôt que de l'adoucir.
//
// Module PUR : aucune dépendance serveur, aucun appel modèle, tout se teste.

import { pick, translate, type Locale, type LocalText } from "@/lib/i18n";
import { libraryEntry } from "@/lib/exercise-library";
import { traitsOf } from "@/lib/exercise-alternatives";
import { matchEquipment } from "@/lib/equipment-catalog";
import type { Session } from "@/lib/program";
import {
  circuitBudgetSec,
  circuitParams,
  fitToDuration,
  isCircuitSession,
  isHomeEquipment,
  circuitSeconds,
  WARMUP_MINUTES,
  type CircuitBlock,
  type CircuitLevel,
} from "@/lib/circuit";

// ────────────────────────────────────────────────────────────────── thèmes

export type CircuitTheme =
  | "corps-entier"
  | "haut-du-corps"
  | "bas-du-corps"
  | "abdos"
  | "cardio"
  | "fessiers"
  | "dos-posture"
  | "mobilite";

export const CIRCUIT_THEMES: readonly CircuitTheme[] = [
  "corps-entier",
  "haut-du-corps",
  "bas-du-corps",
  "abdos",
  "cardio",
  "fessiers",
  "dos-posture",
  "mobilite",
] as const;

export const THEME_LABEL: Record<CircuitTheme, LocalText> = {
  "corps-entier": { fr: "Corps entier", en: "Full body" },
  "haut-du-corps": { fr: "Haut du corps", en: "Upper body" },
  "bas-du-corps": { fr: "Bas du corps", en: "Lower body" },
  abdos: { fr: "Abdos et tronc", en: "Abs and core" },
  cardio: { fr: "Cardio", en: "Cardio" },
  fessiers: { fr: "Fessiers et hanches", en: "Glutes and hips" },
  "dos-posture": { fr: "Dos et posture", en: "Back and posture" },
  mobilite: { fr: "Mobilité", en: "Mobility" },
};

// ──────────────────────────────────────────────────────────────── matériel

/**
 * Le matériel d'un circuit, du plus nu au mieux équipé. Un palier ne contient
 * QUE ce qu'il annonce : un circuit « élastiques » ne demande jamais un banc,
 * parce que la personne qui l'a choisi n'en a pas.
 */
export type CircuitGear = "aucun" | "elastiques" | "halteres" | "kettlebell" | "hotel" | "salle";

export const CIRCUIT_GEARS: readonly CircuitGear[] = ["aucun", "elastiques", "halteres", "kettlebell", "hotel", "salle"] as const;

export const GEAR_LABEL: Record<CircuitGear, LocalText> = {
  aucun: { fr: "Sans matériel", en: "No equipment" },
  elastiques: { fr: "Élastiques", en: "Resistance bands" },
  halteres: { fr: "Haltères", en: "Dumbbells" },
  kettlebell: { fr: "Kettlebell", en: "Kettlebell" },
  hotel: { fr: "Chambre d'hôtel", en: "Hotel room" },
  salle: { fr: "Salle de sport", en: "Gym" },
};

/** Le matériel réellement disponible à chaque palier, en clés du catalogue. */
export const GEAR_EQUIPMENT: Record<CircuitGear, readonly string[]> = {
  aucun: ["poids-du-corps"],
  elastiques: ["poids-du-corps", "elastiques", "tapis-sol"],
  halteres: ["poids-du-corps", "halteres", "tapis-sol"],
  kettlebell: ["poids-du-corps", "kettlebells", "tapis-sol"],
  hotel: ["poids-du-corps", "halteres", "elastiques", "banc-plat", "tapis-sol"],
  salle: [
    "poids-du-corps",
    "halteres",
    "kettlebells",
    "elastiques",
    "tapis-sol",
    "banc-plat",
    "banc-incline",
    "barre-traction",
    "box",
    "corde-a-sauter",
    "medecine-ball",
    "ballon-gym",
    "trx",
    "poulie-haute",
    "poulie-basse",
    "presse-cuisses",
    "leg-extension",
    "leg-curl-assis",
    "pec-deck",
    "developpe-couche-machine",
    "rowing-machine",
    "developpe-epaules-machine",
    "oiseau-machine",
    "machine-abdos",
    "rameur",
    "velo",
    "tapis-course",
  ],
};

/** Un palier fournit-il tout ce qu'un autre demande ? Sert au repli du choix. */
export function gearCovers(have: CircuitGear, want: CircuitGear): boolean {
  const set = new Set(GEAR_EQUIPMENT[have]);
  return GEAR_EQUIPMENT[want].every((k) => set.has(k));
}

// ──────────────────────────────────────────────────────────── pathologies

/**
 * Ce que le questionnaire santé peut faire remonter, et que le circuit doit
 * respecter. Ce ne sont pas des diagnostics : ce sont des zones à ménager,
 * déclarées par la personne. On ne soigne rien, on évite le geste en cause.
 */
export type Pathology = "genou" | "epaule" | "dos" | "poignet" | "cheville" | "hanche" | "grossesse" | "hypertension";

export const PATHOLOGIES: readonly Pathology[] = [
  "genou",
  "epaule",
  "dos",
  "poignet",
  "cheville",
  "hanche",
  "grossesse",
  "hypertension",
] as const;

export const PATHOLOGY_LABEL: Record<Pathology, LocalText> = {
  genou: { fr: "Genou sensible", en: "Sensitive knee" },
  epaule: { fr: "Épaule sensible", en: "Sensitive shoulder" },
  dos: { fr: "Dos sensible", en: "Sensitive back" },
  poignet: { fr: "Poignet sensible", en: "Sensitive wrist" },
  cheville: { fr: "Cheville sensible", en: "Sensitive ankle" },
  hanche: { fr: "Hanche sensible", en: "Sensitive hip" },
  grossesse: { fr: "Grossesse", en: "Pregnancy" },
  hypertension: { fr: "Tension élevée", en: "High blood pressure" },
};

/** Les mots qui, dans un texte libre de client, désignent une zone à ménager. */
const PATHOLOGY_WORDS: Record<Pathology, RegExp> = {
  genou: /genou|genoux|rotul|menisqu|ménisqu|croisé|croise|knee/i,
  epaule: /epaule|épaule|coiffe|acromi|rotateur|shoulder/i,
  dos: /\bdos\b|lombaire|lombalgie|hernie|sciatique|discal|rachis|back pain|lower back/i,
  poignet: /poignet|carpien|wrist/i,
  cheville: /cheville|entorse|achille|ankle/i,
  hanche: /hanche|psoas|coxarthrose|hip\b/i,
  grossesse: /enceinte|grossesse|pregnan|post.?partum/i,
  hypertension: /hypertension|tension (elevee|élevée|haute)|hypertendu|blood pressure/i,
};

/**
 * Les zones à ménager lues dans les réponses santé (texte libre compris).
 *
 * Volontairement littéral : on ne devine pas une pathologie à partir d'un
 * objectif ou d'un âge, on lit ce que la personne a écrit. Un faux positif
 * coûte un circuit un peu prudent, un faux négatif coûte une blessure.
 */
export function detectPathologies(...texts: (string | null | undefined)[]): Pathology[] {
  const blob = texts.filter(Boolean).join(" \n ");
  if (!blob.trim()) return [];
  return PATHOLOGIES.filter((p) => PATHOLOGY_WORDS[p].test(blob));
}

// ───────────────────────────────────────────────────────────────── modèles

/** Un exercice d'un bloc : sa clé de bibliothèque, et une consigne au besoin. */
export type TemplateExercise = string | { key: string; note: LocalText };

export interface CircuitTemplateBlock {
  title: LocalText;
  exercises: TemplateExercise[];
  /** Effort allongé ou raccourci par rapport au niveau, en secondes. */
  workBias?: number;
  /** Repos allongé ou raccourci par rapport au niveau, en secondes. */
  restBias?: number;
}

/** L'impact au sol : ce qui décide si un genou ou une cheville peut suivre. */
export type CircuitImpact = "nul" | "faible" | "fort";

export interface CircuitTemplate {
  id: string;
  theme: CircuitTheme;
  gear: CircuitGear;
  title: LocalText;
  /** À quoi sert ce circuit, en une phrase, pour le client comme pour le coach. */
  goal: LocalText;
  levels: CircuitLevel[];
  impact: CircuitImpact;
  /** Les zones que ce circuit sollicite trop : il ne leur est jamais proposé. */
  avoid: Pathology[];
  /** Les zones pour lesquelles il a été écrit : il leur est proposé en premier. */
  safeFor?: Pathology[];
  /** Sensation visée, quand elle ne suit pas le cycle (mobilité, circuits ménagés). */
  sensation?: number;
  /** Deux blocs au minimum : c'est le socle servi même à 30 minutes. */
  blocks: CircuitTemplateBlock[];
  /** Bloc final, ajouté seulement quand la durée le permet. */
  finisher?: CircuitTemplateBlock;
  /**
   * Circuit écrit par le coach lui-même, et non par la plateforme.
   *
   * Il passe devant le catalogue par défaut à critères égaux : ses clients
   * paient pour SA méthode, pas pour la nôtre.
   */
  own?: boolean;
}

// ───────────────────────────────────────────────── titres de blocs communs

/**
 * Les intitulés qui reviennent d'un circuit à l'autre. Un titre de bloc dit ce
 * qu'on va y faire, pas un numéro : c'est ce que le client lit avant de lancer
 * le chrono, et ça lui permet de doser.
 */
const B = {
  fondations: { fr: "Fondations", en: "Foundations" } as LocalText,
  chaine: { fr: "Chaîne postérieure", en: "Posterior chain" } as LocalText,
  unilateral: { fr: "Unilatéral", en: "Single side" } as LocalText,
  poussee: { fr: "Poussée", en: "Push" } as LocalText,
  tirage: { fr: "Tirage", en: "Pull" } as LocalText,
  epaulesBras: { fr: "Épaules et bras", en: "Shoulders and arms" } as LocalText,
  jambes: { fr: "Jambes", en: "Legs" } as LocalText,
  hanches: { fr: "Hanches", en: "Hips" } as LocalText,
  tronc: { fr: "Tronc", en: "Core" } as LocalText,
  souffle: { fr: "Souffle", en: "Breath" } as LocalText,
  puissance: { fr: "Puissance", en: "Power" } as LocalText,
  finisher: { fr: "Finisher", en: "Finisher" } as LocalText,
  hautAbdos: { fr: "Haut des abdominaux", en: "Upper abs" } as LocalText,
  basAbdos: { fr: "Bas des abdominaux", en: "Lower abs" } as LocalText,
  obliques: { fr: "Obliques", en: "Obliques" } as LocalText,
  gainage: { fr: "Gainage", en: "Bracing" } as LocalText,
  posture: { fr: "Posture", en: "Posture" } as LocalText,
  ouverture: { fr: "Ouverture", en: "Opening up" } as LocalText,
  reveil: { fr: "Réveil articulaire", en: "Joint wake-up" } as LocalText,
  stabilite: { fr: "Stabilité", en: "Stability" } as LocalText,
  entretien: { fr: "Entretien", en: "Upkeep" } as LocalText,
};

// ─────────────────────────────────────────────────────────── échauffements

/**
 * L'échauffement est compté dans la durée annoncée (voir WARMUP_MINUTES) mais
 * n'est pas chronométré : c'est une liste que le client déroule à son rythme.
 * Il est choisi selon la dominante du circuit, parce qu'on ne prépare pas des
 * hanches comme on prépare des épaules.
 */
type WarmupKind = "general" | "bas" | "haut" | "doux";

const WARMUPS: Record<WarmupKind, LocalText<{ name: string; detail: string }[]>> = {
  general: {
    fr: [
      { name: "Monter en température", detail: "3 min de marche sur place, montées de genoux puis talons fesses, de plus en plus vite." },
      { name: "Mobilité", detail: "Cercles de bras 10 par sens, rotations de hanches 8 par sens, squats à vide 10, fentes arrière 6 par jambe." },
      { name: "Activation", detail: "1 tour du premier bloc à moitié vitesse, pour installer les appuis et la respiration." },
    ],
    en: [
      { name: "Warm up", detail: "3 min marching on the spot, high knees then heel flicks, picking up the pace." },
      { name: "Mobility", detail: "Arm circles 10 each way, hip rotations 8 each way, 10 bodyweight squats, 6 reverse lunges per leg." },
      { name: "Activation", detail: "One round of the first block at half speed, to set your stance and your breathing." },
    ],
  },
  bas: {
    fr: [
      { name: "Monter en température", detail: "3 min de marche sur place, puis montées de genoux et talons fesses en accélérant." },
      { name: "Hanches et chevilles", detail: "Rotations de hanches 8 par sens, balancements de jambe 10 par jambe, flexions de cheville genou vers le mur 10 par côté." },
      { name: "Activation fessiers", detail: "12 ponts fessiers au sol, 10 squats à vide lents, 6 fentes arrière par jambe." },
    ],
    en: [
      { name: "Warm up", detail: "3 min marching on the spot, then high knees and heel flicks, picking up the pace." },
      { name: "Hips and ankles", detail: "Hip circles 8 each way, leg swings 10 per leg, knee-to-wall ankle rocks 10 per side." },
      { name: "Glute activation", detail: "12 floor glute bridges, 10 slow bodyweight squats, 6 reverse lunges per leg." },
    ],
  },
  haut: {
    fr: [
      { name: "Monter en température", detail: "2 min de marche sur place bras qui montent et descendent, puis 30 s de jumping jack tranquilles." },
      { name: "Épaules et haut du dos", detail: "Cercles de bras 10 par sens, hausser puis relâcher les épaules 10 fois, ouverture des bras en croix 12 fois." },
      { name: "Activation", detail: "10 pompes inclinées sur un support haut, 10 rétractions d'omoplates, 20 s de gainage." },
    ],
    en: [
      { name: "Warm up", detail: "2 min marching on the spot with arms rising and lowering, then 30 s of easy jumping jacks." },
      { name: "Shoulders and upper back", detail: "Arm circles 10 each way, shrug and release 10 times, open the arms wide 12 times." },
      { name: "Activation", detail: "10 incline push ups on a high surface, 10 scapular retractions, 20 s of bracing." },
    ],
  },
  doux: {
    fr: [
      { name: "Respiration", detail: "1 min assis ou debout : inspire par le nez 4 temps, souffle par la bouche 6 temps, épaules basses." },
      { name: "Réveil articulaire", detail: "Cercles de chevilles, genoux, hanches, épaules et poignets, 8 par sens, sans forcer." },
      { name: "Mise en route", detail: "2 min de marche sur place, amplitude qui augmente à chaque pas." },
    ],
    en: [
      { name: "Breathing", detail: "1 min seated or standing: breathe in through the nose for 4, out through the mouth for 6, shoulders down." },
      { name: "Joint wake-up", detail: "Circles at ankles, knees, hips, shoulders and wrists, 8 each way, without forcing." },
      { name: "Getting going", detail: "2 min marching on the spot, taking a wider range with every step." },
    ],
  },
};

const WARMUP_FOR: Record<CircuitTheme, WarmupKind> = {
  "corps-entier": "general",
  "haut-du-corps": "haut",
  "bas-du-corps": "bas",
  abdos: "general",
  cardio: "general",
  fessiers: "bas",
  "dos-posture": "haut",
  mobilite: "doux",
};

// ────────────────────────────────────────────────────────────── catalogue

/** Un exercice avec une consigne écrite pour CE circuit, pas celle de la fiche. */
const n = (key: string, fr: string, en: string): TemplateExercise => ({ key, note: { fr, en } });

/**
 * Les circuits du catalogue.
 *
 * Chaque modèle tient sans matériel supplémentaire, sans exercice inventé, et
 * ses blocs alternent les zones pour qu'on puisse enchaîner. L'ordre compte :
 * le premier bloc installe la technique, le dernier va chercher ce qui reste.
 */
export const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  // ─────────────────────────────────────────────────────── corps entier
  {
    id: "full-aucun",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, sans rien", en: "Full body, nothing needed" },
    goal: {
      fr: "Le circuit de base : tout le corps, un tapis suffit. Il tient dans un salon comme dans une chambre d'hôtel.",
      en: "The baseline circuit: the whole body, a mat is enough. It fits a living room as well as a hotel room.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "faible",
    avoid: ["poignet", "grossesse"],
    blocks: [
      { title: B.fondations, exercises: ["squat-poids-du-corps", "pompes", "fentes-arriere", "gainage-planche"] },
      { title: B.chaine, exercises: ["glute-bridge", "pompes-inclinees", "superman", "dead-bug"] },
      { title: B.unilateral, exercises: ["fentes-statiques", "pompe-planche-laterale", "pont-fessier-unilateral", "gainage-lateral"] },
    ],
    finisher: { title: B.souffle, exercises: ["mountain-climber", "jumping-jack"], workBias: -5 },
  },
  {
    id: "full-elastiques",
    theme: "corps-entier",
    gear: "elastiques",
    title: { fr: "Corps entier aux élastiques", en: "Full body with bands" },
    goal: {
      fr: "Tout le corps avec un jeu d'élastiques : de la résistance sur les tirages, que le poids du corps ne donne pas.",
      en: "The whole body with a set of bands: resistance on the pulls, which bodyweight alone cannot give.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet"],
    blocks: [
      { title: B.fondations, exercises: ["squat-elastique", "rowing-elastique", "extension-hanche-elastique", "pull-apart"] },
      { title: B.poussee, exercises: ["ecarte-elastique", "tirage-elastique", "leg-curl-elastique", "gainage-planche"] },
      { title: B.epaulesBras, exercises: ["elevations-laterales-elastique", "triceps-elastique-tete", "rotation-externe-elastique", "dead-bug"] },
    ],
    finisher: { title: B.finisher, exercises: ["squat-elastique", "monster-walk"], workBias: 5 },
  },
  {
    id: "full-halteres",
    theme: "corps-entier",
    gear: "halteres",
    title: { fr: "Corps entier aux haltères", en: "Full body with dumbbells" },
    goal: {
      fr: "Deux haltères, tout le corps. Charge modérée et tempo maîtrisé : c'est le circuit qui construit le plus de muscle.",
      en: "Two dumbbells, the whole body. Moderate load and controlled tempo: the circuit that builds the most muscle.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["epaule", "poignet"],
    blocks: [
      { title: B.fondations, exercises: ["squat-gobelet", "rowing-deux-halteres", "sdt-jambes-tendues-halteres", "gainage-planche"] },
      { title: B.poussee, exercises: ["developpe-epaules-halteres", "fentes-arriere", "pompes", "dead-bug"] },
      { title: B.epaulesBras, exercises: ["curl-marteau", "extension-triceps-verticale", "scaption", "oiseau"] },
    ],
    finisher: { title: B.finisher, exercises: ["thruster", "swing-haltere"], workBias: -5 },
  },
  {
    id: "full-kettlebell",
    theme: "corps-entier",
    gear: "kettlebell",
    title: { fr: "Corps entier au kettlebell", en: "Full body with a kettlebell" },
    goal: {
      fr: "Une seule kettlebell, du balancement et du gainage. Le cardio monte vite sans le moindre saut.",
      en: "A single kettlebell, swinging and bracing. The heart rate climbs fast without a single jump.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["dos", "epaule", "poignet", "grossesse", "hypertension"],
    blocks: [
      { title: B.hanches, exercises: ["kettlebell-swing", "kettlebell-rowing", "kettlebell-sdt-une-jambe", "gainage-planche"] },
      { title: B.poussee, exercises: ["kettlebell-push-press", "fentes-arriere", "kettlebell-developpe-sol", "dead-bug"] },
      { title: B.puissance, exercises: ["kettlebell-clean", "kettlebell-thruster", "kettlebell-figure-8", "gainage-lateral"] },
    ],
    finisher: { title: B.finisher, exercises: ["kettlebell-swing", "mountain-climber"], workBias: -5 },
  },
  {
    id: "full-hotel",
    theme: "corps-entier",
    gear: "hotel",
    title: { fr: "Corps entier en déplacement", en: "Full body on the road" },
    goal: {
      fr: "Ce qu'on trouve vraiment dans une salle d'hôtel : des haltères légers, un banc, un élastique. Rien d'autre.",
      en: "What a hotel gym really has: light dumbbells, a bench, a band. Nothing else.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "faible",
    avoid: ["epaule", "poignet"],
    blocks: [
      { title: B.fondations, exercises: ["squat-gobelet", "developpe-couche-halteres", "rowing-deux-halteres", "gainage-planche"] },
      { title: B.unilateral, exercises: ["fente-bulgare", "pompes", "oiseau", "dead-bug"] },
      { title: B.epaulesBras, exercises: ["developpe-epaules-halteres-assis", "curl-marteau", "dips-banc", "gainage-lateral"] },
    ],
    finisher: { title: B.souffle, exercises: ["mountain-climber", "jumping-jack"], workBias: -5 },
  },
  {
    id: "full-salle",
    theme: "corps-entier",
    gear: "salle",
    title: { fr: "Corps entier en salle", en: "Full body at the gym" },
    goal: {
      fr: "Un circuit de machines qui se suivent : on passe de l'une à l'autre sans rien régler, donc sans casser le rythme.",
      en: "A circuit of machines set side by side: you move from one to the next without adjusting anything, so the pace holds.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["epaule"],
    blocks: [
      { title: B.fondations, exercises: ["presse-jambes", "developpe-couche-machine", "rowing-machine", "gainage-planche"] },
      { title: B.chaine, exercises: ["leg-curl-assis", "tirage-vertical", "developpe-epaules-machine", "crunch-machine"] },
      { title: B.epaulesBras, exercises: ["leg-extension", "pec-deck", "oiseau-machine", "russian-twist"] },
    ],
    finisher: { title: B.souffle, exercises: ["rameur", "corde-a-sauter"], workBias: 10 },
  },

  // ────────────────────────────────────────────────────── haut du corps
  {
    id: "haut-aucun",
    theme: "haut-du-corps",
    gear: "aucun",
    title: { fr: "Haut du corps au sol", en: "Upper body on the floor" },
    goal: {
      fr: "Toutes les variantes de pompes et de gainage. Sans barre ni élastique, il n'y a pas de tirage : ce circuit pousse, il ne tire pas.",
      en: "Every push up and bracing variation. With no bar and no band there is no pulling: this circuit pushes, it does not pull.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["poignet", "epaule", "grossesse"],
    blocks: [
      { title: B.poussee, exercises: ["pompes", "pompes-serrees", "dips-banc", "gainage-planche"] },
      { title: B.ouverture, exercises: ["pompes-larges", "pompes-inclinees", "pompe-planche-laterale", "superman"] },
      { title: B.epaulesBras, exercises: ["pompes-pieds-sureleves", "pompes-equilibre", "dips-banc", "marche-araignee"] },
    ],
    finisher: { title: B.finisher, exercises: ["pompes-claquees", "gainage-planche"], workBias: -10 },
  },
  {
    id: "haut-elastiques",
    theme: "haut-du-corps",
    gear: "elastiques",
    title: { fr: "Haut du corps aux élastiques", en: "Upper body with bands" },
    goal: {
      fr: "Le circuit haut du corps complet : ça pousse ET ça tire, ce que le poids du corps seul ne permet pas à la maison.",
      en: "The complete upper body circuit: it pushes AND it pulls, which bodyweight alone cannot do at home.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: [],
    blocks: [
      { title: B.tirage, exercises: ["tirage-elastique", "rowing-elastique", "pull-apart", "oiseau-elastique"] },
      { title: B.poussee, exercises: ["ecarte-elastique", "developpe-epaules-elastique", "triceps-elastique-tete", "elevations-laterales-elastique"] },
      { title: B.posture, exercises: ["rotation-externe-elastique", "rowing-elastique", "pull-apart", "superman"] },
    ],
    finisher: { title: B.finisher, exercises: ["ecarte-elastique", "tirage-elastique"], workBias: 5 },
  },
  {
    id: "haut-halteres",
    theme: "haut-du-corps",
    gear: "halteres",
    title: { fr: "Haut du corps aux haltères", en: "Upper body with dumbbells" },
    goal: {
      fr: "Épaules, dos et bras à la charge. Trois blocs, un par grand mouvement, avec les bras en dernier.",
      en: "Shoulders, back and arms under load. Three blocks, one per big movement, arms last.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: ["epaule"],
    blocks: [
      { title: B.tirage, exercises: ["rowing-deux-halteres", "oiseau", "haussements-epaules", "gainage-planche"] },
      { title: B.poussee, exercises: ["developpe-epaules-halteres", "pompes", "scaption", "elevations-laterales"] },
      { title: B.epaulesBras, exercises: ["curl-halteres", "extension-triceps-verticale", "curl-marteau", "kickback-triceps"] },
    ],
    finisher: { title: B.finisher, exercises: ["developpe-arnold", "elevations-frontales"], workBias: -5 },
  },
  {
    id: "haut-hotel",
    theme: "haut-du-corps",
    gear: "hotel",
    title: { fr: "Haut du corps avec un banc", en: "Upper body with a bench" },
    goal: {
      fr: "Le banc change tout : le développé couché, l'écarté et le pull-over deviennent possibles avec deux haltères.",
      en: "The bench changes everything: bench press, flyes and pullovers become possible with two dumbbells.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: ["epaule"],
    blocks: [
      { title: B.poussee, exercises: ["developpe-couche-halteres", "rowing-deux-halteres", "ecarte-halteres", "gainage-planche"] },
      { title: B.tirage, exercises: ["pull-over", "oiseau", "developpe-epaules-halteres-assis", "dead-bug"] },
      { title: B.epaulesBras, exercises: ["curl-halteres", "extension-triceps-verticale", "dips-banc", "elevations-laterales"] },
    ],
  },

  // ─────────────────────────────────────────────────────── bas du corps
  {
    id: "bas-aucun",
    theme: "bas-du-corps",
    gear: "aucun",
    title: { fr: "Bas du corps sans matériel", en: "Lower body, no equipment" },
    goal: {
      fr: "Cuisses, fessiers et mollets au poids du corps, sans le moindre saut. Le volume vient des tours, pas de la charge.",
      en: "Thighs, glutes and calves at bodyweight, with no jumping at all. Volume comes from the rounds, not the load.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["grossesse"],
    blocks: [
      { title: B.fondations, exercises: ["squat-poids-du-corps", "fentes-arriere", "glute-bridge", "mollets-debout"] },
      { title: B.unilateral, exercises: ["fentes-statiques", "pont-fessier-unilateral", "abduction-hanche-debout", "gainage-lateral"] },
      { title: B.entretien, exercises: ["wall-sit", "fentes-marchees-sans-charge", "superman", "mollets-debout"] },
    ],
    finisher: { title: B.finisher, exercises: ["wall-sit", "squat-poids-du-corps"], workBias: 10 },
  },
  {
    id: "bas-elastiques",
    theme: "bas-du-corps",
    gear: "elastiques",
    title: { fr: "Bas du corps aux élastiques", en: "Lower body with bands" },
    goal: {
      fr: "L'élastique tient la tension en haut du mouvement, là où le poids du corps n'en met plus. Les fessiers le sentent.",
      en: "The band keeps tension at the top of the movement, exactly where bodyweight loses it. The glutes feel it.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: [],
    blocks: [
      { title: B.fondations, exercises: ["squat-elastique", "extension-hanche-elastique", "leg-curl-elastique", "mollets-elastique"] },
      { title: B.hanches, exercises: ["monster-walk", "abduction-hanche-debout", "adduction-elastique", "glute-bridge"] },
      { title: B.entretien, exercises: ["squat-elastique", "extension-hanche-elastique", "wall-sit", "mollets-elastique"] },
    ],
  },
  {
    id: "bas-halteres",
    theme: "bas-du-corps",
    gear: "halteres",
    title: { fr: "Bas du corps aux haltères", en: "Lower body with dumbbells" },
    goal: {
      fr: "Squat, soulevé de terre jambes tendues, fentes : les trois mouvements qui font des jambes, avec deux haltères.",
      en: "Squat, stiff-leg deadlift, lunges: the three movements that build legs, with two dumbbells.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["dos"],
    blocks: [
      { title: B.fondations, exercises: ["squat-halteres", "sdt-jambes-tendues-halteres", "fentes-arriere", "mollets-halteres"] },
      { title: B.unilateral, exercises: ["squat-sumo-haltere", "fentes-statiques", "glute-bridge", "gainage-lateral"] },
      { title: B.hanches, exercises: ["swing-haltere", "squat-gobelet", "abduction-hanche-debout", "mollets-halteres"] },
    ],
  },
  {
    id: "bas-kettlebell",
    theme: "bas-du-corps",
    gear: "kettlebell",
    title: { fr: "Bas du corps au kettlebell", en: "Lower body with a kettlebell" },
    goal: {
      fr: "Le balancement travaille la hanche vite et fort, l'unilatéral rétablit l'équilibre entre les deux jambes.",
      en: "The swing trains the hip fast and hard, the single-leg work evens out the two sides.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["dos", "hypertension"],
    blocks: [
      { title: B.hanches, exercises: ["kettlebell-swing", "kettlebell-sdt-une-jambe", "fentes-arriere", "mollets-debout"] },
      { title: B.jambes, exercises: ["kettlebell-sumo-high-pull", "squat-poids-du-corps", "glute-bridge", "gainage-lateral"] },
      { title: B.puissance, exercises: ["kettlebell-swing-un-bras", "kettlebell-clean-sol", "kettlebell-figure-8", "dead-bug"] },
    ],
  },

  // ────────────────────────────────────────────────────────────── abdos
  {
    id: "abs-killer",
    theme: "abdos",
    gear: "aucun",
    title: { fr: "Abs killer", en: "Abs killer" },
    goal: {
      fr: "Le circuit abdos qui pique : haut, bas, obliques, un bloc pour chacun et rien qui repose vraiment.",
      en: "The abs circuit that stings: upper, lower, obliques, one block each and nothing that really rests.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: ["dos", "poignet", "grossesse"],
    blocks: [
      { title: B.hautAbdos, exercises: ["sit-up", "crunch-groupe", "touchers-talons", "gainage-planche"] },
      { title: B.basAbdos, exercises: ["crunch-inverse", "releve-bassin", "rentres-genoux-sol", "releve-jambes-allonge"] },
      { title: B.obliques, exercises: ["crunch-velo", "jackknife-lateral", "gainage-lateral", "coude-genou"] },
    ],
    finisher: { title: B.finisher, exercises: ["jackknife", "gainage-planche"], workBias: -5 },
  },
  {
    id: "abs-gainage",
    theme: "abdos",
    gear: "aucun",
    title: { fr: "Tronc solide, sans crunch", en: "Solid core, no crunches" },
    goal: {
      fr: "Un tronc qui tient sans jamais enrouler le dos : que du gainage et du contrôle. C'est le circuit abdos des dos sensibles.",
      en: "A core that holds without ever rounding the spine: bracing and control only. The abs circuit for sensitive backs.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    safeFor: ["dos"],
    sensation: 2,
    blocks: [
      {
        title: B.gainage,
        exercises: [
          n("gainage-planche", "Bassin verrouillé, côtes basses, respire par petites bouffées sans relâcher le ventre.", "Pelvis locked, ribs down, breathe in short bursts without letting the belly go."),
          "dead-bug",
          "gainage-lateral",
          n("superman", "Décolle à peine, nuque dans le prolongement du dos, regard vers le sol.", "Barely lift, neck in line with the spine, eyes to the floor."),
        ],
        workBias: 5,
      },
      { title: B.stabilite, exercises: ["dead-bug", "glute-bridge", "gainage-lateral", "marche-araignee"] },
      { title: B.entretien, exercises: ["gainage-planche", "superman", "dead-bug", "pont-fessier-unilateral"] },
    ],
  },
  {
    id: "abs-halteres",
    theme: "abdos",
    gear: "halteres",
    title: { fr: "Abdos chargés", en: "Loaded abs" },
    goal: {
      fr: "Un haltère dans les mains, et les abdos travaillent en résistance au lieu de compter les répétitions.",
      en: "One dumbbell in hand, and the abs work against resistance instead of counting reps.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: ["dos", "grossesse", "poignet"],
    blocks: [
      { title: B.hautAbdos, exercises: ["crunch", "sit-up", "gainage-planche", "flexion-laterale-haltere"] },
      { title: B.obliques, exercises: ["russian-twist", "flexion-laterale-haltere", "gainage-lateral", "coude-genou"] },
      { title: B.basAbdos, exercises: ["crunch-inverse", "releve-jambes-allonge", "dead-bug", "marche-fermier"] },
    ],
  },

  // ────────────────────────────────────────────────────────────── cardio
  {
    id: "cardio-hiit",
    theme: "cardio",
    gear: "aucun",
    title: { fr: "HIIT sans matériel", en: "HIIT, no equipment" },
    goal: {
      fr: "Efforts courts et intenses, sauts compris. C'est le circuit qui fait le plus grimper le souffle, et le plus dur pour les articulations.",
      en: "Short, intense efforts, jumps included. The circuit that raises the heart rate most, and the hardest on the joints.",
    },
    levels: ["intermediaire", "avance"],
    impact: "fort",
    avoid: ["genou", "cheville", "dos", "hanche", "grossesse", "hypertension", "poignet"],
    sensation: 3,
    blocks: [
      { title: B.souffle, exercises: ["burpees", "mountain-climber", "squat-saute", "jumping-jack"], workBias: -10, restBias: 5 },
      { title: B.puissance, exercises: ["fentes-sautees", "saut-groupe", "talons-fesses", "skipping"], workBias: -10, restBias: 5 },
      { title: B.finisher, exercises: ["bond-lateral", "saut-etoile", "saut-longueur", "mountain-climber"], workBias: -10, restBias: 5 },
    ],
    finisher: { title: B.finisher, exercises: ["skipping", "jumping-jack"], workBias: -15 },
  },
  {
    id: "cardio-doux",
    theme: "cardio",
    gear: "aucun",
    title: { fr: "Cardio sans impact", en: "Low impact cardio" },
    goal: {
      fr: "Le souffle monte sans qu'aucun pied ne quitte le sol. Pour les genoux, les chevilles, et les reprises après une pause.",
      en: "The heart rate climbs without a foot ever leaving the ground. For knees, ankles, and coming back after a break.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet"],
    safeFor: ["genou", "cheville"],
    sensation: 2,
    blocks: [
      {
        title: B.souffle,
        exercises: [
          n("squat-poids-du-corps", "Descends seulement jusqu'où c'est confortable, et enchaîne à rythme régulier.", "Only go as low as stays comfortable, and keep an even rhythm."),
          "fentes-statiques",
          "mountain-climber",
          "glute-bridge",
        ],
        workBias: 10,
        restBias: -5,
      },
      { title: B.entretien, exercises: ["marche-araignee", "mollets-debout", "dead-bug", "squat-poids-du-corps"], workBias: 10, restBias: -5 },
      { title: B.finisher, exercises: ["fentes-marchees-sans-charge", "mountain-climber", "gainage-lateral", "mollets-debout"], workBias: 10, restBias: -5 },
    ],
  },
  {
    id: "cardio-kettlebell",
    theme: "cardio",
    gear: "kettlebell",
    title: { fr: "Cardio kettlebell", en: "Kettlebell cardio" },
    goal: {
      fr: "Le souffle par le balancement plutôt que par le saut : aussi dur pour le cœur, beaucoup plus doux pour les genoux.",
      en: "Cardio through swinging rather than jumping: just as hard on the heart, far kinder on the knees.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: ["dos", "epaule", "poignet", "grossesse", "hypertension"],
    sensation: 3,
    blocks: [
      { title: B.souffle, exercises: ["kettlebell-swing", "kettlebell-sumo-high-pull", "kettlebell-rowing", "gainage-planche"], workBias: -5 },
      { title: B.puissance, exercises: ["kettlebell-thruster", "kettlebell-clean", "kettlebell-swing-un-bras", "dead-bug"], workBias: -5 },
      { title: B.finisher, exercises: ["kettlebell-snatch", "kettlebell-swing", "kettlebell-figure-8", "gainage-lateral"], workBias: -5 },
    ],
  },

  // ──────────────────────────────────────────────────────────── fessiers
  {
    id: "fessiers-aucun",
    theme: "fessiers",
    gear: "aucun",
    title: { fr: "Fessiers au sol", en: "Glutes on the floor" },
    goal: {
      fr: "Tout part du pont fessier et de l'unilatéral : c'est là que le fessier travaille vraiment, pas dans le squat profond.",
      en: "It all comes from the glute bridge and single-leg work: that is where the glute really works, not in a deep squat.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["grossesse"],
    blocks: [
      { title: B.hanches, exercises: ["glute-bridge", "pont-fessier-unilateral", "abduction-hanche-debout", "superman"] },
      { title: B.unilateral, exercises: ["fentes-arriere", "fentes-statiques", "pont-fessier-unilateral", "gainage-lateral"] },
      { title: B.entretien, exercises: ["squat-poids-du-corps", "wall-sit", "glute-bridge", "abduction-hanche-debout"] },
    ],
    finisher: { title: B.finisher, exercises: ["glute-bridge", "wall-sit"], workBias: 10 },
  },
  {
    id: "fessiers-elastiques",
    theme: "fessiers",
    gear: "elastiques",
    title: { fr: "Fessiers à l'élastique", en: "Glutes with a band" },
    goal: {
      fr: "La marche du monstre et l'extension de hanche à l'élastique : les deux mouvements que les fessiers préfèrent.",
      en: "Monster walks and banded hip extension: the two movements glutes respond to best.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: [],
    blocks: [
      { title: B.hanches, exercises: ["monster-walk", "extension-hanche-elastique", "abduction-hanche-debout", "glute-bridge"] },
      { title: B.jambes, exercises: ["squat-elastique", "leg-curl-elastique", "adduction-elastique", "gainage-lateral"] },
      { title: B.entretien, exercises: ["extension-hanche-elastique", "monster-walk", "pont-fessier-unilateral", "mollets-elastique"] },
    ],
  },
  {
    id: "fessiers-halteres",
    theme: "fessiers",
    gear: "halteres",
    title: { fr: "Fessiers chargés", en: "Loaded glutes" },
    goal: {
      fr: "Charnière de hanche, sumo et balancement : le fessier sous charge, sans jamais écraser les genoux.",
      en: "Hip hinge, sumo and swing: the glute under load, without ever crushing the knees.",
    },
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["dos"],
    blocks: [
      { title: B.hanches, exercises: ["sdt-jambes-tendues-halteres", "squat-sumo-haltere", "glute-bridge", "abduction-hanche-debout"] },
      { title: B.unilateral, exercises: ["fentes-arriere", "pont-fessier-unilateral", "swing-haltere", "gainage-lateral"] },
      { title: B.entretien, exercises: ["squat-gobelet", "sdt-jambes-tendues-halteres", "mollets-halteres", "superman"] },
    ],
  },

  // ──────────────────────────────────────────────────────── dos, posture
  {
    id: "dos-elastiques",
    theme: "dos-posture",
    gear: "elastiques",
    title: { fr: "Dos et posture", en: "Back and posture" },
    goal: {
      fr: "Le circuit anti-bureau : on ouvre ce que la chaise ferme, on renforce le haut du dos, on remet les épaules en place.",
      en: "The anti-desk circuit: open what the chair closes, strengthen the upper back, put the shoulders back where they belong.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: [],
    safeFor: ["epaule", "dos"],
    sensation: 2,
    blocks: [
      {
        title: B.posture,
        exercises: [
          n("pull-apart", "Bras tendus, écarte lentement, serre les omoplates une seconde avant de revenir.", "Arms straight, pull apart slowly, squeeze the shoulder blades for a second before returning."),
          "rowing-elastique",
          "oiseau-elastique",
          n("rotation-externe-elastique", "Coude collé au corps, le mouvement part de l'épaule, jamais du poignet.", "Elbow pinned to the body, the movement comes from the shoulder, never the wrist."),
        ],
        workBias: 5,
      },
      { title: B.tirage, exercises: ["tirage-elastique", "rowing-inverse", "superman", "dead-bug"], workBias: 5 },
      { title: B.entretien, exercises: ["pull-apart", "oiseau-elastique", "rowing-elastique", "gainage-lateral"], workBias: 5 },
    ],
  },
  {
    id: "dos-aucun",
    theme: "dos-posture",
    gear: "aucun",
    title: { fr: "Dos et posture, sans matériel", en: "Back and posture, no equipment" },
    goal: {
      fr: "Sans élastique ni barre, on ne peut pas tirer : ce circuit tient le dos par le gainage et les extensions au sol.",
      en: "With no band and no bar there is no pulling: this circuit holds the back through bracing and floor extensions.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    sensation: 2,
    blocks: [
      { title: B.posture, exercises: ["superman", "gainage-planche", "dead-bug", "gainage-lateral"], workBias: 5 },
      { title: B.stabilite, exercises: ["marche-araignee", "pompe-planche-laterale", "glute-bridge", "superman"], workBias: 5 },
      { title: B.entretien, exercises: ["gainage-planche", "dead-bug", "superman", "pont-fessier-unilateral"], workBias: 5 },
    ],
  },
  {
    id: "dos-halteres",
    theme: "dos-posture",
    gear: "halteres",
    title: { fr: "Dos chargé", en: "Loaded back" },
    goal: {
      fr: "Rowing, oiseau et rotations externes : le haut du dos et la coiffe des rotateurs, dans cet ordre.",
      en: "Rows, reverse flyes and external rotations: the upper back and the rotator cuff, in that order.",
    },
    levels: ["intermediaire", "avance"],
    impact: "nul",
    avoid: [],
    blocks: [
      { title: B.tirage, exercises: ["rowing-deux-halteres", "oiseau", "haussements-epaules", "superman"] },
      { title: B.posture, exercises: ["scaption", "elevations-laterales", "oiseau", "gainage-planche"] },
      { title: B.entretien, exercises: ["rowing-deux-halteres", "superman", "dead-bug", "gainage-lateral"] },
    ],
  },

  // ──────────────────────────────────────────────────────────── mobilité
  {
    id: "mobilite-aucun",
    theme: "mobilite",
    gear: "aucun",
    title: { fr: "Mobilité et respiration", en: "Mobility and breathing" },
    goal: {
      fr: "Une séance lente, ample, à faire les jours de repos ou de courbatures. On cherche l'amplitude, jamais l'essoufflement.",
      en: "A slow, wide-ranging session for rest days or sore days. Looking for range, never for breathlessness.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet"],
    safeFor: ["dos", "genou", "cheville", "hanche", "hypertension"],
    sensation: 1,
    blocks: [
      {
        title: B.reveil,
        exercises: [
          n("marche-araignee", "Avance très lentement, prends le temps de poser chaque appui et de respirer en bas.", "Move very slowly, take the time to plant each hand and foot and to breathe at the bottom."),
          n("glute-bridge", "Monte en déroulant vertèbre par vertèbre, redescends encore plus lentement.", "Rise one vertebra at a time, come down even more slowly."),
          "dead-bug",
          "superman",
        ],
        workBias: 15,
        restBias: 5,
      },
      {
        title: B.ouverture,
        exercises: [
          n("fentes-marchees-sans-charge", "Grande fente, bassin qui descend, une respiration complète en position basse.", "Long lunge, hips sinking, one full breath at the bottom."),
          n("squat-poids-du-corps", "Descends au rythme de la respiration, reste deux secondes en bas.", "Go down at the pace of your breath, hold two seconds at the bottom."),
          "gainage-lateral",
          "mollets-debout",
        ],
        workBias: 15,
        restBias: 5,
      },
    ],
  },

  // ────────────────────────────────────── circuits écrits pour une contrainte
  //
  // Ceux-là ne sont pas des versions « allégées » : ils EXCLUENT le geste en
  // cause. Un genou sensible ne fait pas des squats moins profonds, il fait un
  // circuit où le genou ne plie pas sous charge.
  {
    id: "menage-genou",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, genoux ménagés", en: "Full body, knees spared" },
    goal: {
      fr: "Aucun saut, aucune flexion profonde, aucun appui sur un seul genou. La hanche et le tronc font le travail.",
      en: "No jumping, no deep bending, no weight on a single knee. The hip and the core do the work.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    safeFor: ["genou"],
    sensation: 2,
    blocks: [
      {
        title: B.hanches,
        exercises: [
          n("glute-bridge", "Pousse dans les talons, monte par la hanche : le genou ne bouge pas.", "Push through the heels, drive from the hip: the knee does not move."),
          "pompes-inclinees",
          "dead-bug",
          n("mollets-debout", "Amplitude complète, sans à-coup, en tenant un appui pour l'équilibre.", "Full range, no bouncing, hold something for balance."),
        ],
      },
      { title: B.chaine, exercises: ["pont-fessier-unilateral", "pompes", "superman", "abduction-hanche-debout"] },
      { title: B.gainage, exercises: ["gainage-planche", "gainage-lateral", "glute-bridge", "dead-bug"] },
    ],
  },
  {
    id: "menage-epaule",
    theme: "corps-entier",
    gear: "elastiques",
    title: { fr: "Corps entier, épaules ménagées", en: "Full body, shoulders spared" },
    goal: {
      fr: "Rien au-dessus de la tête, rien en tirage menton. On renforce autour de l'épaule au lieu de passer dessus.",
      en: "Nothing overhead, no upright rows. We strengthen around the shoulder instead of pushing through it.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["grossesse"],
    safeFor: ["epaule"],
    sensation: 2,
    blocks: [
      {
        title: B.posture,
        exercises: [
          n("rotation-externe-elastique", "Coude serré contre le flanc, mouvement lent, on s'arrête avant la douleur.", "Elbow tight to the side, slow movement, stop before any pain."),
          "pull-apart",
          "rowing-elastique",
          "oiseau-elastique",
        ],
        workBias: 5,
      },
      { title: B.jambes, exercises: ["squat-elastique", "extension-hanche-elastique", "leg-curl-elastique", "glute-bridge"] },
      { title: B.tronc, exercises: ["dead-bug", "gainage-lateral", "monster-walk", "mollets-elastique"] },
    ],
  },
  {
    id: "menage-dos",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, dos ménagé", en: "Full body, back spared" },
    goal: {
      fr: "Dos neutre du début à la fin : pas de crunch, pas de rotation chargée, pas de flexion en avant. Que du gainage.",
      en: "A neutral spine from start to finish: no crunches, no loaded rotation, no forward bending. Bracing only.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    safeFor: ["dos"],
    sensation: 2,
    blocks: [
      {
        title: B.gainage,
        exercises: [
          n("dead-bug", "Bas du dos plaqué au sol pendant tout le mouvement : si le dos décolle, réduis l'amplitude.", "Lower back flat on the floor throughout: if it lifts, shorten the range."),
          "gainage-planche",
          "gainage-lateral",
          n("glute-bridge", "Serre les fessiers en haut, ne cambre pas pour monter plus haut.", "Squeeze the glutes at the top, do not arch to get higher."),
        ],
        workBias: 5,
      },
      { title: B.jambes, exercises: ["fentes-statiques", "wall-sit", "mollets-debout", "pompes-inclinees"] },
      { title: B.stabilite, exercises: ["pont-fessier-unilateral", "superman", "dead-bug", "gainage-lateral"] },
    ],
  },
  {
    id: "menage-poignet",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, poignets ménagés", en: "Full body, wrists spared" },
    goal: {
      fr: "Aucun appui sur les mains : ni pompes, ni planche, ni marche de l'araignée. Tout se fait debout ou allongé.",
      en: "No weight on the hands: no push ups, no plank, no bear crawls. Everything is done standing or lying down.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["grossesse"],
    safeFor: ["poignet"],
    sensation: 2,
    blocks: [
      { title: B.jambes, exercises: ["squat-poids-du-corps", "fentes-arriere", "glute-bridge", "mollets-debout"] },
      { title: B.tronc, exercises: ["dead-bug", "releve-jambes-allonge", "superman", "pont-fessier-unilateral"] },
      { title: B.entretien, exercises: ["wall-sit", "fentes-statiques", "abduction-hanche-debout", "dead-bug"] },
    ],
  },
  {
    id: "menage-cheville",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, chevilles ménagées", en: "Full body, ankles spared" },
    goal: {
      fr: "Zéro impact et zéro appui instable : les deux pieds restent au sol, à plat, tout le long.",
      en: "Zero impact and no unstable footing: both feet stay flat on the ground the whole way through.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    safeFor: ["cheville"],
    sensation: 2,
    blocks: [
      { title: B.hanches, exercises: ["glute-bridge", "pont-fessier-unilateral", "dead-bug", "superman"] },
      { title: B.poussee, exercises: ["pompes", "pompes-inclinees", "gainage-planche", "gainage-lateral"] },
      { title: B.tronc, exercises: ["releve-jambes-allonge", "dead-bug", "glute-bridge", "gainage-lateral"] },
    ],
  },
  {
    id: "menage-hanche",
    theme: "corps-entier",
    gear: "elastiques",
    title: { fr: "Corps entier, hanches ménagées", en: "Full body, hips spared" },
    goal: {
      fr: "Pas de flexion profonde ni d'écart forcé : la hanche travaille dans une amplitude moyenne, avec de l'abduction contrôlée.",
      en: "No deep flexion and no forced splits: the hip works in a mid range, with controlled abduction.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["grossesse"],
    safeFor: ["hanche"],
    sensation: 2,
    blocks: [
      {
        title: B.hanches,
        exercises: [
          n("monster-walk", "Petits pas, genoux qui poussent vers l'extérieur, bassin stable.", "Small steps, knees pressing out, pelvis steady."),
          "abduction-hanche-debout",
          "glute-bridge",
          "mollets-elastique",
        ],
      },
      { title: B.tirage, exercises: ["rowing-elastique", "pull-apart", "oiseau-elastique", "dead-bug"] },
      { title: B.tronc, exercises: ["gainage-lateral", "dead-bug", "glute-bridge", "abduction-hanche-debout"] },
    ],
  },
  {
    id: "menage-grossesse",
    theme: "corps-entier",
    gear: "elastiques",
    title: { fr: "Corps entier pendant la grossesse", en: "Full body during pregnancy" },
    goal: {
      fr: "Debout du début à la fin : ni allongée sur le dos, ni sur le ventre, ni de crunch, ni de saut. À valider avec la sage-femme ou le médecin.",
      en: "Standing throughout: no lying on the back, no lying face down, no crunches, no jumping. To be cleared with your midwife or doctor.",
    },
    levels: ["debutant", "intermediaire"],
    impact: "nul",
    avoid: [],
    safeFor: ["grossesse"],
    sensation: 2,
    blocks: [
      {
        title: B.jambes,
        exercises: [
          n("squat-elastique", "Descends jusqu'où c'est confortable, souffle en remontant, ne bloque jamais la respiration.", "Go down as far as stays comfortable, breathe out on the way up, never hold your breath."),
          "monster-walk",
          "abduction-hanche-debout",
          "mollets-elastique",
        ],
        workBias: 5,
        restBias: 10,
      },
      {
        title: B.posture,
        exercises: ["rowing-elastique", "pull-apart", "oiseau-elastique", "rotation-externe-elastique"],
        workBias: 5,
        restBias: 10,
      },
      { title: B.entretien, exercises: ["squat-elastique", "wall-sit", "rowing-elastique", "mollets-elastique"], workBias: 5, restBias: 10 },
    ],
  },
  {
    id: "menage-tension",
    theme: "corps-entier",
    gear: "aucun",
    title: { fr: "Corps entier, effort régulier", en: "Full body, steady effort" },
    goal: {
      fr: "Un effort continu et modéré, sans blocage de la respiration et sans tenue longue : la sensation reste à 2, jamais plus.",
      en: "A steady, moderate effort with no breath holding and no long holds: the feeling stays at 2, never more.",
    },
    levels: ["debutant", "intermediaire", "avance"],
    impact: "nul",
    avoid: ["poignet", "grossesse"],
    safeFor: ["hypertension"],
    sensation: 2,
    blocks: [
      {
        title: B.fondations,
        exercises: [
          n("squat-poids-du-corps", "Souffle en remontant, ne retiens jamais ta respiration en bas.", "Breathe out on the way up, never hold your breath at the bottom."),
          "pompes-inclinees",
          "glute-bridge",
          "dead-bug",
        ],
        restBias: 10,
      },
      { title: B.entretien, exercises: ["fentes-statiques", "pompes-inclinees", "superman", "mollets-debout"], restBias: 10 },
      { title: B.tronc, exercises: ["dead-bug", "gainage-lateral", "pont-fessier-unilateral", "abduction-hanche-debout"], restBias: 10 },
    ],
  },
];

export const CIRCUIT_BY_ID: ReadonlyMap<string, CircuitTemplate> = new Map(CIRCUIT_TEMPLATES.map((t) => [t.id, t]));

export function circuitTemplate(id: string): CircuitTemplate | null {
  return CIRCUIT_BY_ID.get(id) ?? null;
}

// ─────────────────────────────────────────────────────────────────── rendu

export interface RenderCircuitInput {
  /** Durée annoncée au client, en minutes : 30, 45, 60 ou 90 dans l'app. */
  minutes: number;
  level: CircuitLevel;
  /** Cycle en cours (0, 1, 2) : il règle effort, repos et tours. */
  cycleIndex: number;
  locale: Locale;
}

export interface RenderedCircuit {
  id: string;
  title: string;
  goal: string;
  theme: CircuitTheme;
  gear: CircuitGear;
  /** Durée réellement construite, échauffement compris, en minutes. */
  minutes: number;
  warmup: { name: string; detail: string }[];
  blocks: CircuitBlock[];
}

const key = (e: TemplateExercise): string => (typeof e === "string" ? e : e.key);

/** Le bloc du modèle, transformé en bloc de circuit aux paramètres du cycle. */
function buildBlock(
  block: CircuitTemplateBlock,
  index: number,
  total: number,
  params: { work: number; rest: number; rounds: number },
  sensation: number,
  locale: Locale,
): CircuitBlock {
  const work = Math.max(15, Math.min(120, params.work + (block.workBias ?? 0)));
  const rest = Math.max(0, Math.min(90, params.rest + (block.restBias ?? 0)));
  return {
    title: `${translate(locale, "rescue.block")} ${index + 1} · ${pick(block.title, locale)}`,
    rounds: params.rounds,
    work,
    rest,
    roundRest: Math.max(rest, 30),
    restAfter: index === total - 1 ? 0 : 60,
    sensation,
    exercises: block.exercises.map((e) => {
      const k = key(e);
      const entry = libraryEntry(k, k);
      const note = typeof e === "string" ? (entry?.guide.cues[0] ?? "") : pick(e.note, locale);
      return { name: entry?.name ?? k, key: k, note };
    }),
  };
}

/** L'effort le plus court qu'on accepte de servir : en dessous, ce n'est plus un bloc. */
const MIN_WORK = 30;

/**
 * Combien de blocs du modèle tiennent dans le temps disponible.
 *
 * On préfère la VARIÉTÉ aux tours : trois blocs de deux tours valent mieux que
 * deux blocs de quatre, parce que la personne travaille plus de choses et
 * s'ennuie moins. On garde donc le plus de blocs possible, à condition que
 * chacun garde ses deux tours avec un effort tenable. Les tours et l'effort
 * définitifs sont réglés ensuite par fitToDuration, qui remplit ce qui reste.
 *
 * Deux blocs au minimum : un seul bloc répété huit fois n'est pas une séance.
 */
function blocksForBudget(built: CircuitBlock[], budgetSec: number): CircuitBlock[] {
  for (let count = built.length; count > 2; count--) {
    const socle = built.slice(0, count).map((b, i) => ({
      ...b,
      rounds: 2,
      work: Math.max(MIN_WORK, b.work - 10),
      restAfter: i === count - 1 ? 0 : b.restAfter,
    }));
    if (circuitSeconds(socle) <= budgetSec) return built.slice(0, count);
  }
  return built.slice(0, Math.min(2, built.length));
}

/**
 * Le circuit tel que le client va le dérouler, à la durée demandée.
 *
 * L'échauffement est compté dans la durée annoncée mais n'est pas chronométré :
 * le budget des blocs, c'est la durée moins WARMUP_MINUTES. La durée rendue est
 * celle qui a VRAIMENT été construite, pas celle qui a été demandée : c'est ce
 * que le coach annonce au client.
 */
export function renderCircuit(tpl: CircuitTemplate, input: RenderCircuitInput): RenderedCircuit {
  const params = circuitParams(input.level, input.cycleIndex);
  const sensation = tpl.sensation ?? (input.cycleIndex === 0 ? 2 : 3);
  const all = [...tpl.blocks, ...(tpl.finisher ? [tpl.finisher] : [])];
  const built = all.map((b, i) => buildBlock(b, i, all.length, params, sensation, input.locale));
  const budget = circuitBudgetSec(input.minutes);
  const retenus = blocksForBudget(built, budget);
  // Le dernier bloc servi ne renvoie sur rien : il ne garde pas son repos.
  const ajustes = retenus.map((b, i) => ({ ...b, restAfter: i === retenus.length - 1 ? 0 : b.restAfter }));
  const blocks = fitToDuration(ajustes, budget);
  return {
    id: tpl.id,
    title: pick(tpl.title, input.locale),
    goal: pick(tpl.goal, input.locale),
    theme: tpl.theme,
    gear: tpl.gear,
    minutes: Math.round(circuitSeconds(blocks) / 60) + WARMUP_MINUTES,
    warmup: pick(WARMUPS[WARMUP_FOR[tpl.theme]], input.locale),
    blocks,
  };
}

/**
 * Le temps maximum qu'un circuit peut remplir honnêtement, en minutes.
 *
 * Un circuit n'est pas extensible à l'infini : le rendu plafonne à 8 tours par
 * bloc, et n'allonge l'effort que jusqu'à 60 secondes (un bloc écrit plus long
 * garde sa longueur). Deux blocs de trois mouvements ne rempliront jamais 90
 * minutes, et il vaut mieux le dire à celui qui écrit le circuit que de
 * laisser son client découvrir une séance plus courte que promis.
 */
export function maxFillableMinutes(blocks: readonly { exercises: number; workBias?: number }[]): number {
  const blocs = blocks.filter((b) => b.exercises >= 2);
  if (!blocs.length) return 0;
  const MAX_ROUNDS = 8;
  const MAX_WORK = 60;
  const REST = 15;
  const ROUND_REST = 30;
  const BLOCK_REST = 60;
  let total = 0;
  blocs.forEach((b, i) => {
    const work = MAX_WORK + Math.max(0, b.workBias ?? 0);
    total += MAX_ROUNDS * (b.exercises * work + (b.exercises - 1) * REST) + (MAX_ROUNDS - 1) * ROUND_REST;
    if (i < blocs.length - 1) total += BLOCK_REST;
  });
  return Math.floor(total / 60) + WARMUP_MINUTES;
}

// ──────────────────────────────────────────────────────────────── sélection

export interface CircuitCriteria {
  /** Le thème demandé, quand il y en a un. Sans thème, tout est candidat. */
  theme?: CircuitTheme;
  /** Le matériel dont la personne dispose : un circuit plus modeste passe aussi. */
  gear?: CircuitGear;
  level?: CircuitLevel;
  /** Les zones à ménager : un circuit qui les sollicite est écarté, jamais servi. */
  pathologies?: readonly Pathology[];
  /** Écarter les circuits avec sauts, même sans pathologie déclarée. */
  noImpact?: boolean;
}

/**
 * Les circuits qui conviennent, du plus adapté au moins adapté.
 *
 * Les contre-indications ne sont PAS un critère de tri : un circuit qui
 * sollicite une zone déclarée sensible est retiré de la liste, point. Le reste
 * est classé : d'abord ceux écrits pour la contrainte de la personne, puis le
 * thème demandé, puis le matériel exact, puis le niveau.
 */
export function filterCircuits(
  criteria: CircuitCriteria = {},
  pool: readonly CircuitTemplate[] = CIRCUIT_TEMPLATES,
): CircuitTemplate[] {
  const patho = criteria.pathologies ?? [];
  const gear = criteria.gear;
  return pool.filter((t) => {
    if (patho.some((p) => t.avoid.includes(p))) return false;
    if (criteria.theme && t.theme !== criteria.theme) return false;
    if (gear && !gearCovers(gear, t.gear)) return false;
    if (criteria.level && !t.levels.includes(criteria.level)) return false;
    if (criteria.noImpact && t.impact === "fort") return false;
    return true;
  }).sort((a, b) => score(b, criteria) - score(a, criteria));
}

function score(t: CircuitTemplate, c: CircuitCriteria): number {
  let s = 0;
  const patho = c.pathologies ?? [];
  // Un circuit écrit POUR la contrainte passe devant tout le reste.
  if (patho.length && t.safeFor) s += 100 * patho.filter((p) => t.safeFor?.includes(p)).length;
  // À matériel égal, celui qui utilise vraiment ce que la personne a.
  if (c.gear && t.gear === c.gear) s += 10;
  if (c.level && t.levels[0] === c.level) s += 5;
  if (patho.length && t.impact === "nul") s += 3;
  // Les circuits du coach passent devant les nôtres, à critères égaux.
  if (t.own) s += 20;
  return s;
}

/**
 * Le circuit le plus adapté, ou null quand aucun ne convient.
 *
 * Le repli est volontairement large : si le thème demandé ne donne rien avec
 * les contraintes de la personne, on retire le thème plutôt que de servir un
 * circuit contre-indiqué. Mieux vaut un corps entier que mal au dos.
 */
export function bestCircuit(
  criteria: CircuitCriteria = {},
  pool: readonly CircuitTemplate[] = CIRCUIT_TEMPLATES,
): CircuitTemplate | null {
  const exact = filterCircuits(criteria, pool);
  if (exact.length) return exact[0];
  const sansTheme = criteria.theme ? filterCircuits({ ...criteria, theme: undefined }, pool) : [];
  if (sansTheme.length) return sansTheme[0];
  const sansMateriel = criteria.gear ? filterCircuits({ ...criteria, theme: undefined, gear: undefined }, pool) : [];
  return sansMateriel[0] ?? null;
}

/** Le catalogue résumé, pour un écran de coach ou un prompt : une ligne par circuit. */
export function circuitSummaries(locale: Locale): {
  id: string;
  title: string;
  goal: string;
  theme: string;
  gear: string;
  levels: CircuitLevel[];
  impact: CircuitImpact;
  avoid: string[];
  safeFor: string[];
}[] {
  return CIRCUIT_TEMPLATES.map((t) => ({
    id: t.id,
    title: pick(t.title, locale),
    goal: pick(t.goal, locale),
    theme: pick(THEME_LABEL[t.theme], locale),
    gear: pick(GEAR_LABEL[t.gear], locale),
    levels: t.levels,
    impact: t.impact,
    avoid: t.avoid.map((p) => pick(PATHOLOGY_LABEL[p], locale)),
    safeFor: (t.safeFor ?? []).map((p) => pick(PATHOLOGY_LABEL[p], locale)),
  }));
}

// ──────────────────────────────────────── lire le profil réel du client

/**
 * Les zones à ménager d'un client, lues dans son questionnaire santé.
 *
 * On lit les cases cochées (pathologies articulaires et générales, grossesse)
 * et les contraintes durables qu'il a déclarées au coach. On NE lit PAS les
 * « blessures passées (guéries) » : une entorse de 2022 est guérie, et
 * l'écarter des sauts pour toujours priverait le client de la moitié du
 * catalogue sans qu'il ait rien demandé.
 */
export function pathologiesFromAnswers(answers: Record<string, unknown> | null | undefined): Pathology[] {
  const a = answers ?? {};
  const coches = (raw: unknown): string[] => (Array.isArray(raw) ? raw.map((x) => String(x)) : []);
  const found = new Set<Pathology>();

  for (const p of coches(a.patho1)) {
    if (/lombalgie|hernie|dos/i.test(p)) found.add("dos");
    if (/epaule|épaule/i.test(p)) found.add("epaule");
    if (/genou/i.test(p)) found.add("genou");
    if (/poignet/i.test(p)) found.add("poignet");
    if (/cheville/i.test(p)) found.add("cheville");
    if (/hanche/i.test(p)) found.add("hanche");
  }
  for (const p of coches(a.patho2)) {
    if (/hypertension|tension/i.test(p)) found.add("hypertension");
  }
  const grossesse = String(a.pregnancy ?? "");
  if (/enceinte|post.?partum/i.test(grossesse)) found.add("grossesse");

  // Les contraintes dites au coach en cours de route ont autant de valeur que
  // les cases du questionnaire : c'est souvent là que la douleur apparaît.
  const libres = Array.isArray(a.adaptations) ? a.adaptations.map((x) => String(x)) : [];
  for (const p of detectPathologies(...libres)) found.add(p);

  return PATHOLOGIES.filter((p) => found.has(p));
}

/**
 * Le palier de matériel le mieux servi par ce que le client a déclaré.
 *
 * Le matériel arrive sous les noms que la personne a cochés (« Haltères »,
 * « Élastiques »), pas sous les clés du catalogue : on passe donc par
 * matchEquipment, qui connaît les alias. Une salle se reconnaît à ce qu'elle
 * seule possède (machines, poulies, barres) : c'est déjà ce que sait faire
 * isHomeEquipment, et il n'y a pas de raison de le refaire ici.
 */
export function gearFromEquipment(equipment: readonly string[]): CircuitGear {
  if (equipment.length && !isHomeEquipment(equipment)) return "salle";
  const cles = new Set<string>(["poids-du-corps"]);
  for (const nom of equipment) {
    const item = matchEquipment(nom);
    if (item) cles.add(item.key);
  }
  // Du mieux équipé au plus nu : le premier palier entièrement couvert gagne.
  const ordre: CircuitGear[] = ["hotel", "kettlebell", "halteres", "elastiques", "aucun"];
  return ordre.find((g) => GEAR_EQUIPMENT[g].every((k) => cles.has(k))) ?? "aucun";
}

/** Les mots par lesquels un client demande un thème, dans les langues servies. */
const THEME_WORDS: Record<CircuitTheme, RegExp> = {
  "haut-du-corps": /haut du corps|upper body|pectoraux|pompes|bras|épaules|epaules|torse|buste|chest|arms/i,
  "bas-du-corps": /bas du corps|jambes|cuisses|quadriceps|mollets|lower body|legs|leg day/i,
  abdos: /abdo|abdominaux|ventre|gainage|core|abs|sangle abdominale|obliques/i,
  cardio: /cardio|hiit|souffle|brûler|bruler|transpirer|essouffl|fat burn|conditioning/i,
  fessiers: /fessier|fesses|glute|hanche|booty/i,
  "dos-posture": /\bdos\b|posture|omoplate|cervicale|bureau|back|round shoulders/i,
  mobilite: /mobilit|étirement|etirement|souplesse|récup|recup|assoupli|stretch|mobility|easy day/i,
  "corps-entier": /corps entier|full body|général|general|tout le corps|complet/i,
};

/**
 * Le thème demandé par une phrase de client, ou null.
 *
 * L'ordre compte : « je veux travailler mes fessiers » doit rendre les
 * fessiers, pas le bas du corps, alors que les deux motifs peuvent coller.
 * Les thèmes précis passent donc avant les thèmes larges.
 */
export function themeFromWish(text: string | null | undefined): CircuitTheme | null {
  const v = (text ?? "").trim();
  if (!v) return null;
  const ordre: CircuitTheme[] = ["mobilite", "abdos", "fessiers", "dos-posture", "cardio", "haut-du-corps", "bas-du-corps", "corps-entier"];
  return ordre.find((t) => THEME_WORDS[t].test(v)) ?? null;
}

/** Les familles de muscles d'un thème, pour reconnaître une séance. */
const THEME_FAMILIES: Record<CircuitTheme, string[]> = {
  "haut-du-corps": ["pectoraux", "dos_vertical", "dos_horizontal", "epaules", "epaules_arriere", "trapezes", "biceps", "triceps", "avant_bras"],
  "bas-du-corps": ["quadriceps", "ischios", "mollets", "adducteurs"],
  fessiers: ["fessiers"],
  abdos: ["abdos", "obliques"],
  "dos-posture": ["dos_horizontal", "dos_vertical", "epaules_arriere", "lombaires", "trapezes"],
  cardio: ["cardio"],
  "corps-entier": ["corps_entier"],
  mobilite: [],
};

/**
 * Le thème de la séance qu'on remplace, lu dans ses mouvements.
 *
 * Sert quand le client ne dit pas ce qu'il veut : « mets-moi ça en circuit »
 * un jour de jambes doit rendre un circuit de jambes, pas un corps entier.
 * Une séance sans dominante nette rend « corps entier », ce qui est la vérité.
 */
export function themeFromFamilies(familles: readonly string[]): CircuitTheme {
  const compte = new Map<CircuitTheme, number>();
  for (const f of familles) {
    for (const [theme, list] of Object.entries(THEME_FAMILIES) as [CircuitTheme, string[]][]) {
      if (theme === "corps-entier" || theme === "dos-posture") continue;
      if (list.includes(f)) compte.set(theme, (compte.get(theme) ?? 0) + 1);
    }
  }
  const rangs = [...compte.entries()].sort((a, b) => b[1] - a[1]);
  if (!rangs.length) return "corps-entier";
  const total = familles.length || 1;
  // Une dominante, c'est plus de la moitié des mouvements. En dessous, la
  // séance touche à tout : c'est un corps entier, et le dire est plus honnête
  // que de choisir le groupe le mieux placé d'une courte tête.
  return rangs[0][1] / total > 0.5 ? rangs[0][0] : "corps-entier";
}

/** Le thème d'une séance du programme, circuit ou séries, lu dans ses fiches. */
export function themeFromSession(session: Session): CircuitTheme {
  const noms = isCircuitSession(session)
    ? (session.blocks ?? []).flatMap((b) => b.exercises.map((e) => ({ name: e.name, key: e.key })))
    : session.exercises.map((e) => ({ name: e.name, key: e.key }));
  const familles: string[] = [];
  for (const x of noms) {
    const entry = libraryEntry(x.name, x.key);
    const t = entry ? (entry.traits ?? traitsOf(entry)) : null;
    if (t?.familles[0]) familles.push(t.familles[0]);
  }
  return themeFromFamilies(familles);
}

/**
 * Le circuit à servir en remplacement d'une séance, et sa séance rendue.
 *
 * C'est le point d'entrée du Coach IA : il passe ce qu'il sait du client (son
 * matériel, son niveau, sa durée de séance, ses zones sensibles) et l'envie
 * exprimée dans le chat s'il y en a une. Le thème vient de l'envie quand elle
 * est claire, sinon de la séance remplacée. Rien n'est inventé : la sortie est
 * un circuit du catalogue, rendu à la bonne durée.
 */
export interface SubstituteInput {
  /** La séance qu'on remplace, quand il y en a une. */
  session?: Session | null;
  /** Ce que le client a demandé dans le chat, tel qu'il l'a écrit. */
  wish?: string | null;
  /** Un thème imposé, qui l'emporte sur l'envie comme sur la séance. */
  theme?: CircuitTheme | null;
  equipment: readonly string[];
  /** Un palier imposé (voyage, hôtel), qui l'emporte sur le matériel déclaré. */
  gear?: CircuitGear | null;
  pathologies?: readonly Pathology[];
  level: CircuitLevel;
  minutes: number;
  cycleIndex: number;
  locale: Locale;
  /** Le catalogue où chercher : celui de la plateforme, plus celui du coach. */
  pool?: readonly CircuitTemplate[];
}

export interface SubstituteResult {
  template: CircuitTemplate;
  circuit: RenderedCircuit;
  /** D'où vient le thème retenu : ce que le coach dit au client. */
  from: "envie" | "theme" | "seance" | "defaut";
}

export function substituteCircuit(input: SubstituteInput): SubstituteResult | null {
  const parEnvie = input.theme ? null : themeFromWish(input.wish);
  const theme = input.theme ?? parEnvie ?? (input.session ? themeFromSession(input.session) : null);
  const from: SubstituteResult["from"] = input.theme ? "theme" : parEnvie ? "envie" : input.session ? "seance" : "defaut";
  const gear = input.gear ?? gearFromEquipment(input.equipment);
  const pathologies = input.pathologies ?? [];
  const template = bestCircuit(
    {
      theme: theme ?? undefined,
      gear,
      level: input.level,
      pathologies,
      // Sans pathologie déclarée, les sauts restent permis : c'est au client de
      // demander autre chose, pas à nous de décider qu'il est fragile.
      noImpact: false,
    },
    input.pool ?? CIRCUIT_TEMPLATES,
  );
  if (!template) return null;
  return {
    template,
    circuit: renderCircuit(template, {
      minutes: input.minutes,
      level: input.level,
      cycleIndex: input.cycleIndex,
      locale: input.locale,
    }),
    from,
  };
}
