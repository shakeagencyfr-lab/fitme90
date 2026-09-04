// Moteur du mini-programme gratuit : le catalogue de mouvements et la sélection.
//
// AUCUNE IA, JAMAIS. Ce document part chez des inconnus, en volume, et il est
// gratuit : le facturer au coach à chaque téléchargement serait absurde. Tout
// ce qui suit est donc déterministe et pur. Deux personnes qui répondent la
// même chose reçoivent exactement le même document, ce qui a un autre mérite :
// on peut le tester.
//
// L'ancienne version listait trois séances figées par type de matériel. Elle
// ne pouvait ni éviter un mouvement douloureux, ni tenir dans un créneau de
// trente minutes, ni insister sur une zone. Ici, une séance est une SUITE DE
// SCHÉMAS MOTEURS (pousser, tirer, fléchir, gainer), et le moteur choisit pour
// chaque schéma le meilleur mouvement disponible compte tenu du matériel et
// des articulations à ménager. C'est ce qui permet de refuser un squat à
// quelqu'un qui a mal aux genoux sans casser la structure de la séance.

import type { Equipment } from "@/lib/lead-magnet-types";

/**
 * Schémas moteurs. Une séance équilibrée en couvre plusieurs, et c'est cette
 * grille qui garantit qu'on ne construit pas trois exercices de pectoraux à la
 * suite en croyant faire du haut du corps.
 */
export type Pattern =
  | "squat"       // flexion de genou dominante
  | "charniere"   // hanche dominante (soulevé, hip thrust)
  | "fente"       // unilatéral bas
  | "poussee_h"   // pousser horizontal (développé couché, pompes)
  | "poussee_v"   // pousser vertical (épaules)
  | "tirage_h"    // tirer horizontal (rowing)
  | "tirage_v"    // tirer vertical (tractions, tirage poulie)
  | "gainage"
  | "iso_bras"
  | "iso_jambes"
  | "cardio";

export type Zone = "bas" | "haut" | "tronc" | "full";

/** Articulation à ménager. C'est la seule information médicale demandée. */
export type Joint = "dos" | "genoux" | "epaules";

export interface Movement {
  name: string;
  pattern: Pattern;
  zone: Zone;
  /** Matériels où le mouvement est réellement faisable. */
  equip: Equipment[];
  /**
   * Articulations que le mouvement sollicite fortement. Quand le pratiquant
   * signale une gêne sur l'une d'elles, le mouvement est écarté.
   *
   * Ce n'est pas un avis médical : c'est une précaution de bon sens, la même
   * qu'un coach applique en salle avant tout diagnostic.
   */
  stress: Joint[];
  /** Polyarticulaire : passe en premier dans la séance, quand on est frais. */
  compound: boolean;
}

/**
 * Le catalogue.
 *
 * Il est volontairement dense sur les schémas de base et léger sur
 * l'isolation : une semaine découverte doit apprendre à pousser, tirer et
 * fléchir, pas à faire douze variantes de curl.
 *
 * Chaque schéma a au moins une entrée pour chaque matériel, et au moins une
 * entrée sans contrainte : sans cette garantie, un profil très contraint se
 * retrouverait avec une séance trouée. Un test le verrouille.
 */
export const MOVEMENTS: readonly Movement[] = [
  // ---------------------------------------------------------------- squat
  { name: "Squat", pattern: "squat", zone: "bas", equip: ["salle"], stress: ["genoux", "dos"], compound: true },
  { name: "Presse à cuisses", pattern: "squat", zone: "bas", equip: ["salle"], stress: ["genoux"], compound: true },
  { name: "Squat gobelet", pattern: "squat", zone: "bas", equip: ["halteres", "salle"], stress: ["genoux"], compound: true },
  { name: "Squat au poids du corps", pattern: "squat", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: true },
  { name: "Chaise (wall sit)", pattern: "squat", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: false },

  // ------------------------------------------------------------ charnière
  { name: "Soulevé de terre roumain", pattern: "charniere", zone: "bas", equip: ["halteres", "salle"], stress: ["dos"], compound: true },
  { name: "Hip thrust", pattern: "charniere", zone: "bas", equip: ["halteres", "salle"], stress: [], compound: true },
  { name: "Pont fessier au sol", pattern: "charniere", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: false },
  { name: "Leg curl allongé", pattern: "charniere", zone: "bas", equip: ["salle"], stress: [], compound: false },

  // ---------------------------------------------------------------- fente
  { name: "Fentes", pattern: "fente", zone: "bas", equip: ["maison", "halteres", "salle"], stress: ["genoux"], compound: true },
  { name: "Fentes marchées", pattern: "fente", zone: "bas", equip: ["halteres", "salle"], stress: ["genoux"], compound: true },
  { name: "Montée sur banc (step-up)", pattern: "fente", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: true },

  // ---------------------------------------------------------- poussée horiz.
  { name: "Développé couché", pattern: "poussee_h", zone: "haut", equip: ["salle"], stress: ["epaules"], compound: true },
  { name: "Développé couché haltères", pattern: "poussee_h", zone: "haut", equip: ["halteres", "salle"], stress: ["epaules"], compound: true },
  { name: "Pompes", pattern: "poussee_h", zone: "haut", equip: ["maison", "halteres", "salle"], stress: ["epaules"], compound: true },
  { name: "Pompes mains surélevées", pattern: "poussee_h", zone: "haut", equip: ["maison", "halteres", "salle"], stress: [], compound: true },

  // ----------------------------------------------------------- poussée vert.
  { name: "Développé épaules haltères", pattern: "poussee_v", zone: "haut", equip: ["halteres", "salle"], stress: ["epaules"], compound: true },
  { name: "Élévations latérales", pattern: "poussee_v", zone: "haut", equip: ["halteres", "salle"], stress: [], compound: false },
  { name: "Pompes prise serrée", pattern: "poussee_v", zone: "haut", equip: ["maison", "halteres", "salle"], stress: [], compound: true },

  // ------------------------------------------------------------ tirage horiz.
  { name: "Rowing barre", pattern: "tirage_h", zone: "haut", equip: ["salle"], stress: ["dos"], compound: true },
  { name: "Rowing haltères", pattern: "tirage_h", zone: "haut", equip: ["halteres", "salle"], stress: [], compound: true },
  { name: "Tirage horizontal à la poulie", pattern: "tirage_h", zone: "haut", equip: ["salle"], stress: [], compound: true },
  { name: "Rowing élastique", pattern: "tirage_h", zone: "haut", equip: ["maison", "halteres", "salle"], stress: [], compound: true },

  // ------------------------------------------------------------- tirage vert.
  { name: "Tirage vertical", pattern: "tirage_v", zone: "haut", equip: ["salle"], stress: ["epaules"], compound: true },
  { name: "Tractions assistées", pattern: "tirage_v", zone: "haut", equip: ["salle"], stress: ["epaules"], compound: true },
  { name: "Tirage nuque élastique", pattern: "tirage_v", zone: "haut", equip: ["maison", "halteres", "salle"], stress: [], compound: true },

  // -------------------------------------------------------------- gainage
  { name: "Gainage (planche)", pattern: "gainage", zone: "tronc", equip: ["maison", "halteres", "salle"], stress: ["epaules"], compound: false },
  { name: "Gainage latéral", pattern: "gainage", zone: "tronc", equip: ["maison", "halteres", "salle"], stress: [], compound: false },
  { name: "Dead bug", pattern: "gainage", zone: "tronc", equip: ["maison", "halteres", "salle"], stress: [], compound: false },
  { name: "Bird dog", pattern: "gainage", zone: "tronc", equip: ["maison", "halteres", "salle"], stress: [], compound: false },
  { name: "Superman", pattern: "gainage", zone: "tronc", equip: ["maison", "halteres", "salle"], stress: [], compound: false },

  // ------------------------------------------------------------- isolation
  { name: "Curl haltères", pattern: "iso_bras", zone: "haut", equip: ["halteres", "salle"], stress: [], compound: false },
  { name: "Curl barre", pattern: "iso_bras", zone: "haut", equip: ["salle"], stress: [], compound: false },
  { name: "Extension triceps à la poulie", pattern: "iso_bras", zone: "haut", equip: ["salle"], stress: ["epaules"], compound: false },
  { name: "Dips sur banc", pattern: "iso_bras", zone: "haut", equip: ["maison", "halteres", "salle"], stress: ["epaules"], compound: false },
  { name: "Curl élastique", pattern: "iso_bras", zone: "haut", equip: ["maison", "halteres", "salle"], stress: [], compound: false },

  { name: "Mollets debout", pattern: "iso_jambes", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: false },
  { name: "Abduction hanche élastique", pattern: "iso_jambes", zone: "bas", equip: ["maison", "halteres", "salle"], stress: [], compound: false },

  // ---------------------------------------------------------------- cardio
  { name: "Grimpeur (mountain climber)", pattern: "cardio", zone: "full", equip: ["maison", "halteres", "salle"], stress: ["epaules"], compound: true },
  { name: "Jumping jack", pattern: "cardio", zone: "full", equip: ["maison", "halteres", "salle"], stress: ["genoux"], compound: true },
  { name: "Montées de genoux", pattern: "cardio", zone: "full", equip: ["maison", "halteres", "salle"], stress: [], compound: true },
  { name: "Corde à sauter", pattern: "cardio", zone: "full", equip: ["maison", "halteres", "salle"], stress: ["genoux"], compound: true },
];

/**
 * Les mouvements praticables pour un matériel et une gêne donnés.
 *
 * L'ordre du catalogue fait office de préférence : le premier mouvement d'un
 * schéma est le plus complet, les suivants sont des replis. On ne trie pas, on
 * filtre, ce qui rend le résultat lisible dans le fichier lui-même.
 */
export function available(equipment: Equipment, joint: Joint | null): Movement[] {
  return MOVEMENTS.filter(
    (m) => m.equip.includes(equipment) && (!joint || !m.stress.includes(joint)),
  );
}

/**
 * Choisit un mouvement pour un schéma, sans reprendre ce qui est déjà dans la
 * séance.
 *
 * Rend `null` plutôt qu'un mouvement inadapté : une séance à laquelle il
 * manque un exercice reste utilisable, une séance qui fait mal ne l'est pas.
 */
export function pick(
  pattern: Pattern,
  equipment: Equipment,
  joint: Joint | null,
  used: ReadonlySet<string>,
  /**
   * Déjà employés dans une AUTRE séance de la semaine. On les évite d'abord,
   * puis on s'autorise à les reprendre : sur six séances, le catalogue finit
   * par s'épuiser, et répéter un squat vaut mieux que laisser un trou.
   */
  ailleurs: ReadonlySet<string> = new Set(),
): Movement | null {
  const dispo = available(equipment, joint).filter((m) => m.pattern === pattern && !used.has(m.name));
  return dispo.find((m) => !ailleurs.has(m.name)) ?? dispo[0] ?? null;
}
