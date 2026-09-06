// Types partagés par la bibliothèque d'exercices et le moteur d'alternatives.
//
// Ils vivent ici, à part, parce que les deux fichiers ont besoin l'un de
// l'autre : la bibliothèque porte les traits de ses fiches (colocalisés, donc
// relus en même temps que l'image et le texte), et le moteur lit la
// bibliothèque. Un type importé des deux côtés casserait ce sens unique.

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
  | "roulette"
  | "medecine"
  | "swiss";

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
