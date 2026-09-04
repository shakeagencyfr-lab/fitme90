// Catalogue d'aliments et de recettes. Données PURES, sans dépendance serveur.
//
// POURQUOI UN CATALOGUE ÉCRIT À LA MAIN. Les recettes étaient écrites par un
// modèle de langage à chaque clic. Ça coûtait un centime par régénération, ce
// qui n'est rien pris isolément et beaucoup rapporté au nombre de clients,
// mais surtout ça produisait des macros INVENTÉES : le modèle annonçait
// « 620 kcal, 42 g de protéines » sans jamais les calculer depuis les
// quantités qu'il venait d'écrire. Ici, les macros sont la SOMME des
// ingrédients, et les quantités sont ajustées pour atteindre la cible du jour.
// C'est moins spectaculaire à lire dans un prompt, et c'est juste.
//
// Le catalogue se veut large plutôt que profond : beaucoup de bases
// différentes (céréales, légumineuses, poissons, viandes, végétal), peu de
// variantes d'une même base. C'est la mise à l'échelle qui fabrique la
// diversité réelle, puisqu'une même recette sert un objectif de 1 800 kcal
// comme un objectif de 3 200 kcal.

/** Allergènes du questionnaire. Mêmes étiquettes que `lib/nutrition.ts`. */
export type Allergene = "gluten" | "lactose" | "nuts" | "egg" | "fish" | "shell" | "soy";

/**
 * Niveau de régime le plus contraignant qu'un aliment impose.
 * L'ordre compte : `vegetal` passe partout, `porc` nulle part sauf omnivore.
 */
export type Regime = "vegetal" | "oeuf_lait" | "poisson" | "viande" | "porc";

export interface Food {
  nom: string;
  /** Pour 100 g (ou 100 ml pour les liquides). */
  kcal: number;
  p: number;
  c: number;
  f: number;
  allerg?: Allergene[];
  regime: Regime;
  /** Coût relatif : 1 économique, 2 courant, 3 cher. */
  cout: 1 | 2 | 3;
  /** Unité affichée. Vide = à la pièce. */
  unite?: "g" | "ml";
  /** Masse d'une pièce, en grammes (œuf 55 g). Affiche « 2 œufs ». */
  piece?: number;
  /** Libellé singulier / pluriel pour les aliments à la pièce. */
  pieceLabel?: [string, string];
  /** Étiquettes de refus fin : « boeuf », « porc », « alcool ». */
  tags?: string[];
}

/**
 * Table des aliments. Macros pour 100 g, valeurs usuelles de tables de
 * composition (Ciqual / USDA), arrondies. Ce sont des ordres de grandeur de
 * cuisine, pas de laboratoire : c'est le bon niveau de précision pour une
 * assiette pesée à la louche.
 */
export const FOODS: Record<string, Food> = {
  // ───────────────────────────────────────────────────────────── protéines
  poulet: { nom: "Blanc de poulet", kcal: 110, p: 23, c: 0, f: 2, regime: "viande", cout: 2, unite: "g" },
  dinde: { nom: "Escalope de dinde", kcal: 105, p: 24, c: 0, f: 1.5, regime: "viande", cout: 2, unite: "g" },
  boeuf: { nom: "Bœuf haché 5 %", kcal: 140, p: 21, c: 0, f: 5, regime: "viande", cout: 3, unite: "g", tags: ["boeuf"] },
  porc: { nom: "Filet mignon de porc", kcal: 145, p: 22, c: 0, f: 6, regime: "porc", cout: 2, unite: "g", tags: ["porc"] },
  jambon: { nom: "Jambon blanc", kcal: 110, p: 20, c: 1, f: 3, regime: "porc", cout: 2, unite: "g", tags: ["porc"] },
  saumon: { nom: "Pavé de saumon", kcal: 200, p: 20, c: 0, f: 13, allerg: ["fish"], regime: "poisson", cout: 3, unite: "g" },
  cabillaud: { nom: "Dos de cabillaud", kcal: 82, p: 18, c: 0, f: 0.7, allerg: ["fish"], regime: "poisson", cout: 3, unite: "g" },
  thon: { nom: "Thon au naturel", kcal: 110, p: 25, c: 0, f: 1, allerg: ["fish"], regime: "poisson", cout: 1, unite: "g" },
  sardines: { nom: "Sardines à l'huile égouttées", kcal: 210, p: 25, c: 0, f: 12, allerg: ["fish"], regime: "poisson", cout: 1, unite: "g" },
  crevettes: { nom: "Crevettes décortiquées", kcal: 85, p: 20, c: 0.5, f: 0.5, allerg: ["shell"], regime: "poisson", cout: 3, unite: "g" },
  oeuf: { nom: "Œuf", kcal: 143, p: 13, c: 0.7, f: 10, allerg: ["egg"], regime: "oeuf_lait", cout: 1, piece: 55, pieceLabel: ["œuf", "œufs"] },
  skyr: { nom: "Skyr nature", kcal: 60, p: 11, c: 4, f: 0.2, allerg: ["lactose"], regime: "oeuf_lait", cout: 2, unite: "g" },
  fromage_blanc: { nom: "Fromage blanc 0 %", kcal: 47, p: 8, c: 4, f: 0.2, allerg: ["lactose"], regime: "oeuf_lait", cout: 1, unite: "g" },
  yaourt_grec: { nom: "Yaourt grec", kcal: 97, p: 9, c: 4, f: 5, allerg: ["lactose"], regime: "oeuf_lait", cout: 2, unite: "g" },
  cottage: { nom: "Cottage cheese", kcal: 98, p: 11, c: 3, f: 4.3, allerg: ["lactose"], regime: "oeuf_lait", cout: 2, unite: "g" },
  mozzarella: { nom: "Mozzarella", kcal: 250, p: 18, c: 1, f: 19, allerg: ["lactose"], regime: "oeuf_lait", cout: 2, unite: "g" },
  feta: { nom: "Feta", kcal: 264, p: 14, c: 4, f: 21, allerg: ["lactose"], regime: "oeuf_lait", cout: 2, unite: "g" },
  parmesan: { nom: "Parmesan râpé", kcal: 400, p: 33, c: 0, f: 28, allerg: ["lactose"], regime: "oeuf_lait", cout: 3, unite: "g" },
  whey: { nom: "Whey nature", kcal: 380, p: 78, c: 8, f: 5, allerg: ["lactose"], regime: "oeuf_lait", cout: 3, unite: "g" },
  tofu: { nom: "Tofu ferme", kcal: 145, p: 16, c: 2, f: 9, allerg: ["soy"], regime: "vegetal", cout: 2, unite: "g" },
  tempeh: { nom: "Tempeh", kcal: 190, p: 19, c: 9, f: 11, allerg: ["soy"], regime: "vegetal", cout: 2, unite: "g" },
  seitan: { nom: "Seitan", kcal: 145, p: 25, c: 8, f: 2, allerg: ["gluten"], regime: "vegetal", cout: 2, unite: "g" },
  lentilles: { nom: "Lentilles cuites", kcal: 116, p: 9, c: 20, f: 0.4, regime: "vegetal", cout: 1, unite: "g" },
  lentilles_corail: { nom: "Lentilles corail sèches", kcal: 350, p: 24, c: 56, f: 1.5, regime: "vegetal", cout: 1, unite: "g" },
  pois_chiches: { nom: "Pois chiches cuits", kcal: 139, p: 8.9, c: 21, f: 2.6, regime: "vegetal", cout: 1, unite: "g" },
  haricots_rouges: { nom: "Haricots rouges cuits", kcal: 127, p: 8.7, c: 22, f: 0.5, regime: "vegetal", cout: 1, unite: "g" },
  edamame: { nom: "Edamame", kcal: 121, p: 12, c: 9, f: 5, allerg: ["soy"], regime: "vegetal", cout: 2, unite: "g" },

  // ────────────────────────────────────────────────────────────── glucides
  riz: { nom: "Riz basmati cuit", kcal: 130, p: 2.7, c: 28, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  riz_complet: { nom: "Riz complet cuit", kcal: 123, p: 2.6, c: 26, f: 1, regime: "vegetal", cout: 1, unite: "g" },
  pates: { nom: "Pâtes cuites", kcal: 158, p: 5.8, c: 31, f: 0.9, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  pates_completes: { nom: "Pâtes complètes cuites", kcal: 149, p: 6, c: 30, f: 1.3, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  quinoa: { nom: "Quinoa cuit", kcal: 120, p: 4.4, c: 21, f: 1.9, regime: "vegetal", cout: 2, unite: "g" },
  sarrasin: { nom: "Sarrasin cuit", kcal: 92, p: 3.4, c: 20, f: 0.6, regime: "vegetal", cout: 2, unite: "g" },
  semoule: { nom: "Semoule cuite", kcal: 112, p: 3.8, c: 23, f: 0.2, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  boulgour: { nom: "Boulgour cuit", kcal: 110, p: 3.5, c: 23, f: 0.3, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  polenta: { nom: "Polenta cuite", kcal: 85, p: 2, c: 18, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  pomme_de_terre: { nom: "Pommes de terre", kcal: 87, p: 2, c: 20, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  patate_douce: { nom: "Patate douce", kcal: 90, p: 2, c: 21, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  pain_complet: { nom: "Pain complet", kcal: 247, p: 9, c: 41, f: 3.4, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  tortilla: { nom: "Galette de blé", kcal: 300, p: 8, c: 50, f: 7, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  avoine: { nom: "Flocons d'avoine", kcal: 375, p: 13, c: 60, f: 7, allerg: ["gluten"], regime: "vegetal", cout: 1, unite: "g" },
  galette_riz: { nom: "Galettes de riz", kcal: 380, p: 8, c: 81, f: 3, regime: "vegetal", cout: 1, piece: 9, pieceLabel: ["galette de riz", "galettes de riz"] },
  farine_riz: { nom: "Farine de riz", kcal: 366, p: 6, c: 80, f: 1.4, regime: "vegetal", cout: 1, unite: "g" },

  // ───────────────────────────────────────────────────────── fruits, légumes
  banane: { nom: "Banane", kcal: 89, p: 1.1, c: 23, f: 0.3, regime: "vegetal", cout: 1, piece: 120, pieceLabel: ["banane", "bananes"] },
  pomme: { nom: "Pomme", kcal: 52, p: 0.3, c: 14, f: 0.2, regime: "vegetal", cout: 1, piece: 150, pieceLabel: ["pomme", "pommes"] },
  orange: { nom: "Orange", kcal: 47, p: 0.9, c: 12, f: 0.1, regime: "vegetal", cout: 1, piece: 180, pieceLabel: ["orange", "oranges"] },
  myrtilles: { nom: "Myrtilles", kcal: 57, p: 0.7, c: 14, f: 0.3, regime: "vegetal", cout: 3, unite: "g" },
  fraises: { nom: "Fraises", kcal: 32, p: 0.7, c: 7.7, f: 0.3, regime: "vegetal", cout: 2, unite: "g" },
  compote: { nom: "Compote sans sucres ajoutés", kcal: 45, p: 0.2, c: 11, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  brocoli: { nom: "Brocoli", kcal: 34, p: 2.8, c: 7, f: 0.4, regime: "vegetal", cout: 1, unite: "g" },
  courgette: { nom: "Courgettes", kcal: 17, p: 1.2, c: 3.1, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  epinards: { nom: "Épinards", kcal: 23, p: 2.9, c: 3.6, f: 0.4, regime: "vegetal", cout: 1, unite: "g" },
  haricots_verts: { nom: "Haricots verts", kcal: 31, p: 1.8, c: 7, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  poivron: { nom: "Poivrons", kcal: 31, p: 1, c: 6, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  tomate: { nom: "Tomates", kcal: 18, p: 0.9, c: 3.9, f: 0.2, regime: "vegetal", cout: 1, unite: "g" },
  carotte: { nom: "Carottes", kcal: 41, p: 0.9, c: 10, f: 0.2, regime: "vegetal", cout: 1, unite: "g" },
  chou_fleur: { nom: "Chou-fleur", kcal: 25, p: 1.9, c: 5, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  salade: { nom: "Salade verte", kcal: 25, p: 2.6, c: 3.7, f: 0.7, regime: "vegetal", cout: 1, unite: "g" },
  concombre: { nom: "Concombre", kcal: 15, p: 0.7, c: 3.6, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  oignon: { nom: "Oignon", kcal: 40, p: 1.1, c: 9, f: 0.1, regime: "vegetal", cout: 1, unite: "g" },
  champignons: { nom: "Champignons de Paris", kcal: 22, p: 3.1, c: 3.3, f: 0.3, regime: "vegetal", cout: 1, unite: "g" },
  petit_pois: { nom: "Petits pois", kcal: 81, p: 5.4, c: 14, f: 0.4, regime: "vegetal", cout: 1, unite: "g" },
  mais: { nom: "Maïs doux", kcal: 86, p: 3.3, c: 19, f: 1.2, regime: "vegetal", cout: 1, unite: "g" },
  avocat: { nom: "Avocat", kcal: 160, p: 2, c: 9, f: 15, regime: "vegetal", cout: 3, unite: "g" },
  citron: { nom: "Citron", kcal: 29, p: 1, c: 9, f: 0.3, regime: "vegetal", cout: 1, piece: 90, pieceLabel: ["citron", "citrons"] },

  // ──────────────────────────────────────────────────────── lipides, extras
  huile_olive: { nom: "Huile d'olive", kcal: 884, p: 0, c: 0, f: 100, regime: "vegetal", cout: 2, unite: "g" },
  beurre_cacahuete: { nom: "Beurre de cacahuète", kcal: 588, p: 25, c: 20, f: 50, allerg: ["nuts"], regime: "vegetal", cout: 3, unite: "g" },
  amandes: { nom: "Amandes", kcal: 579, p: 21, c: 22, f: 50, allerg: ["nuts"], regime: "vegetal", cout: 3, unite: "g" },
  noix: { nom: "Cerneaux de noix", kcal: 654, p: 15, c: 14, f: 65, allerg: ["nuts"], regime: "vegetal", cout: 3, unite: "g" },
  graines_courge: { nom: "Graines de courge", kcal: 559, p: 30, c: 11, f: 49, regime: "vegetal", cout: 3, unite: "g" },
  graines_chia: { nom: "Graines de chia", kcal: 486, p: 17, c: 42, f: 31, regime: "vegetal", cout: 3, unite: "g" },
  lait_coco: { nom: "Lait de coco", kcal: 197, p: 2, c: 3, f: 20, regime: "vegetal", cout: 2, unite: "ml" },
  olives: { nom: "Olives dénoyautées", kcal: 145, p: 1, c: 6, f: 15, regime: "vegetal", cout: 2, unite: "g" },
  houmous: { nom: "Houmous", kcal: 237, p: 7.5, c: 14, f: 18, regime: "vegetal", cout: 2, unite: "g" },
  miel: { nom: "Miel", kcal: 304, p: 0.3, c: 82, f: 0, regime: "vegetal", cout: 1, unite: "g" },
  sirop_erable: { nom: "Sirop d'érable", kcal: 260, p: 0, c: 67, f: 0, regime: "vegetal", cout: 3, unite: "g" },
  chocolat_noir: { nom: "Chocolat noir 70 %", kcal: 546, p: 8, c: 46, f: 31, regime: "vegetal", cout: 3, unite: "g" },
  sauce_soja: { nom: "Sauce soja", kcal: 53, p: 8, c: 5, f: 0, allerg: ["soy"], regime: "vegetal", cout: 1, unite: "ml" },
  cacao: { nom: "Cacao non sucré", kcal: 228, p: 20, c: 58, f: 14, regime: "vegetal", cout: 2, unite: "g" },
};

/** Moment du repas. Décide de la part des macros du jour et du ton du plat. */
export type Repas = "petit-dejeuner" | "dejeuner" | "diner" | "collation";

/**
 * Rôle d'ajustement. L'ingrédient marqué voit sa quantité CALCULÉE pour
 * atteindre la cible du repas ; les autres gardent la quantité écrite ici.
 * Une recette sans ancre de lipides laisse simplement le gras là où il est.
 */
export type Role = "proteine" | "glucide" | "lipide";

export interface Ingredient {
  /** Clé dans `FOODS`. */
  food: string;
  /** Quantité de référence, en grammes (ou en pièces converties en grammes). */
  qty: number;
  role?: Role;
  /** Bornes de l'ajustement, en grammes. Par défaut 40 % à 220 % de `qty`. */
  min?: number;
  max?: number;
}

export interface RecipeTemplate {
  id: string;
  nom: string;
  repas: Repas;
  /** 0 assemblage sans cuisson, 1 simple, 2 élaboré. */
  effort: 0 | 1 | 2;
  /** Temps total, en minutes. */
  minutes: number;
  ingredients: Ingredient[];
  /**
   * Les étapes ne citent JAMAIS de quantité : elles sont écrites une fois pour
   * toutes alors que les quantités, elles, changent d'un client à l'autre. Une
   * étape qui dirait « verse 80 g de riz » mentirait à la première mise à
   * l'échelle.
   */
  etapes: string[];
  astuce: string;
}

export const RECIPES: readonly RecipeTemplate[] = [
  // ═══════════════════════════════════════════════════ petit-déjeuner (10)
  {
    id: "pdj-avoine-skyr",
    nom: "Porridge d'avoine au skyr et fruits rouges",
    repas: "petit-dejeuner",
    effort: 1,
    minutes: 10,
    ingredients: [
      { food: "avoine", qty: 70, role: "glucide" },
      { food: "skyr", qty: 200, role: "proteine" },
      { food: "myrtilles", qty: 100 },
      { food: "beurre_cacahuete", qty: 15, role: "lipide" },
    ],
    etapes: [
      "Verse les flocons d'avoine dans une casserole avec deux fois leur volume d'eau ou de lait.",
      "Chauffe à feu moyen 4 à 5 minutes en remuant, jusqu'à ce que le mélange épaississe.",
      "Hors du feu, laisse tiédir 2 minutes puis incorpore le skyr : ajouté trop chaud, il se sépare.",
      "Dépose les fruits rouges et le beurre de cacahuète sur le dessus.",
    ],
    astuce: "Prépare-le la veille au frigo, sans cuisson : l'avoine s'attendrit toute seule dans le skyr.",
  },
  {
    id: "pdj-omelette-pain",
    nom: "Omelette aux champignons et pain complet",
    repas: "petit-dejeuner",
    effort: 1,
    minutes: 12,
    ingredients: [
      { food: "oeuf", qty: 165, role: "proteine", min: 110, max: 275 },
      { food: "champignons", qty: 100 },
      { food: "pain_complet", qty: 80, role: "glucide" },
      { food: "huile_olive", qty: 8, role: "lipide" },
    ],
    etapes: [
      "Fais revenir les champignons émincés à feu vif dans un filet d'huile, jusqu'à ce qu'ils rendent leur eau.",
      "Bats les œufs à la fourchette avec du sel et du poivre.",
      "Baisse le feu, verse les œufs et laisse prendre sans remuer 2 à 3 minutes.",
      "Replie l'omelette en deux, sers-la avec le pain grillé.",
    ],
    astuce: "Feu doux et couvercle : l'omelette reste moelleuse au lieu de sécher.",
  },
  {
    id: "pdj-pancakes",
    nom: "Pancakes protéinés à la banane",
    repas: "petit-dejeuner",
    effort: 2,
    minutes: 20,
    ingredients: [
      { food: "farine_riz", qty: 70, role: "glucide" },
      { food: "oeuf", qty: 110, role: "proteine", min: 55, max: 220 },
      { food: "fromage_blanc", qty: 150 },
      { food: "banane", qty: 120 },
      { food: "sirop_erable", qty: 15 },
    ],
    etapes: [
      "Écrase la banane à la fourchette dans un saladier.",
      "Ajoute les œufs, le fromage blanc et la farine, mélange jusqu'à obtenir une pâte lisse et épaisse.",
      "Fais chauffer une poêle antiadhésive à feu moyen, sans matière grasse.",
      "Verse de petites louches, laisse cuire 2 minutes jusqu'aux premières bulles, puis retourne 1 minute.",
      "Empile les pancakes et nappe de sirop d'érable.",
    ],
    astuce: "La pâte doit tomber lentement de la louche. Trop liquide, ajoute une cuillère de farine.",
  },
  {
    id: "pdj-bowl-coco",
    nom: "Bowl de riz au lait de coco et fruits",
    repas: "petit-dejeuner",
    effort: 1,
    minutes: 15,
    ingredients: [
      { food: "riz", qty: 200, role: "glucide" },
      { food: "lait_coco", qty: 80, role: "lipide" },
      { food: "banane", qty: 120 },
      { food: "graines_courge", qty: 20 },
      { food: "whey", qty: 25, role: "proteine", min: 10, max: 50 },
    ],
    etapes: [
      "Réchauffe le riz déjà cuit avec le lait de coco à feu doux, 3 à 4 minutes.",
      "Hors du feu, laisse tiédir puis incorpore la whey en fouettant pour éviter les grumeaux.",
      "Verse dans un bol, ajoute la banane en rondelles.",
      "Parsème de graines de courge pour le croquant.",
    ],
    astuce: "Le riz de la veille convient parfaitement : c'est même lui qui donne la meilleure texture.",
  },
  {
    id: "pdj-toast-avocat",
    nom: "Toast avocat et œufs pochés",
    repas: "petit-dejeuner",
    effort: 2,
    minutes: 15,
    ingredients: [
      { food: "pain_complet", qty: 80, role: "glucide" },
      { food: "avocat", qty: 60, role: "lipide" },
      { food: "oeuf", qty: 110, role: "proteine", min: 55, max: 220 },
      { food: "tomate", qty: 80 },
      { food: "citron", qty: 20 },
    ],
    etapes: [
      "Porte une casserole d'eau à frémissement avec un filet de vinaigre, sans jamais la faire bouillir.",
      "Casse chaque œuf dans un bol, fais-le glisser dans l'eau et compte 3 minutes.",
      "Pendant ce temps, écrase l'avocat avec le jus de citron, du sel et du poivre.",
      "Étale sur le pain grillé, dépose les œufs pochés et les tomates en rondelles.",
    ],
    astuce: "Un œuf bien frais tient tout seul en pochant. Sinon, entoure-le d'un film alimentaire huilé.",
  },
  {
    id: "pdj-skyr-express",
    nom: "Bol de skyr, avoine et miel",
    repas: "petit-dejeuner",
    effort: 0,
    minutes: 5,
    ingredients: [
      { food: "skyr", qty: 250, role: "proteine" },
      { food: "avoine", qty: 50, role: "glucide" },
      { food: "miel", qty: 15 },
      { food: "amandes", qty: 20, role: "lipide" },
    ],
    etapes: [
      "Verse le skyr dans un bol.",
      "Ajoute les flocons d'avoine crus et mélange.",
      "Nappe de miel et parsème d'amandes concassées.",
    ],
    astuce: "Préparé la veille dans un bocal, il se transporte et se mange froid au bureau.",
  },
  {
    id: "pdj-tofu-brouille",
    nom: "Tofu brouillé aux poivrons",
    repas: "petit-dejeuner",
    effort: 1,
    minutes: 12,
    ingredients: [
      { food: "tofu", qty: 200, role: "proteine" },
      { food: "poivron", qty: 120 },
      { food: "pain_complet", qty: 70, role: "glucide" },
      { food: "huile_olive", qty: 10, role: "lipide" },
    ],
    etapes: [
      "Égoutte le tofu et écrase-le grossièrement à la fourchette.",
      "Fais revenir les poivrons en dés 4 minutes dans l'huile chaude.",
      "Ajoute le tofu, du curcuma, du sel et du poivre, poursuis 3 minutes en remuant.",
      "Sers avec le pain grillé.",
    ],
    astuce: "Une pincée de curcuma donne la couleur des œufs brouillés, un peu de levure maltée en donne le goût.",
  },
  {
    id: "pdj-porridge-chia",
    nom: "Pudding de chia au cacao",
    repas: "petit-dejeuner",
    effort: 0,
    minutes: 5,
    ingredients: [
      { food: "graines_chia", qty: 30, role: "lipide" },
      { food: "fromage_blanc", qty: 250, role: "proteine" },
      { food: "cacao", qty: 10 },
      { food: "avoine", qty: 45, role: "glucide" },
      { food: "banane", qty: 120 },
      { food: "miel", qty: 10 },
    ],
    etapes: [
      "Mélange les graines de chia, les flocons d'avoine, le fromage blanc et le cacao dans un bocal.",
      "Laisse au frais au moins 2 heures, idéalement toute la nuit : les graines gonflent et prennent en gel.",
      "Au moment de servir, ajoute la banane en rondelles et le miel.",
    ],
    astuce: "Prépare trois bocaux d'un coup le dimanche soir : trois petits-déjeuners réglés d'avance.",
  },
  {
    id: "pdj-cottage-fruits",
    nom: "Cottage cheese, fruits frais et galettes",
    repas: "petit-dejeuner",
    effort: 0,
    minutes: 5,
    ingredients: [
      { food: "cottage", qty: 220, role: "proteine" },
      { food: "galette_riz", qty: 36, role: "glucide", min: 18, max: 72 },
      { food: "fraises", qty: 120 },
      { food: "noix", qty: 15, role: "lipide" },
    ],
    etapes: [
      "Répartis le cottage cheese dans un bol.",
      "Ajoute les fraises coupées en deux et les cerneaux de noix.",
      "Sers avec les galettes de riz à côté, à tremper.",
    ],
    astuce: "Un tour de moulin à poivre sur le cottage : ça relève le goût sans ajouter une calorie.",
  },
  {
    id: "pdj-wrap-jambon",
    nom: "Wrap œuf et jambon",
    repas: "petit-dejeuner",
    effort: 1,
    minutes: 10,
    ingredients: [
      { food: "tortilla", qty: 60, role: "glucide" },
      { food: "oeuf", qty: 110, role: "proteine", min: 55, max: 165 },
      { food: "jambon", qty: 60 },
      { food: "salade", qty: 40 },
      { food: "huile_olive", qty: 6, role: "lipide" },
    ],
    etapes: [
      "Bats les œufs et fais-les cuire en omelette fine dans une poêle huilée.",
      "Réchauffe la galette 20 secondes à la poêle sèche pour l'assouplir.",
      "Dépose l'omelette, le jambon et la salade, roule serré.",
      "Coupe en deux en biais.",
    ],
    astuce: "Roule le wrap dans du papier cuisson : il se tient et se mange d'une main.",
  },

  // ═════════════════════════════════════════════════════════ déjeuner (12)
  {
    id: "dej-poulet-riz",
    nom: "Poulet grillé, riz basmati et courgettes",
    repas: "dejeuner",
    effort: 1,
    minutes: 25,
    ingredients: [
      { food: "poulet", qty: 180, role: "proteine" },
      { food: "riz", qty: 220, role: "glucide" },
      { food: "courgette", qty: 200 },
      { food: "huile_olive", qty: 10, role: "lipide" },
    ],
    etapes: [
      "Sors le poulet du frigo 10 minutes avant : une viande froide cuit mal à cœur.",
      "Saisis-le à feu vif 3 minutes par face dans un filet d'huile, puis baisse le feu et couvre 5 minutes.",
      "Fais revenir les courgettes en rondelles à feu vif dans la même poêle.",
      "Laisse reposer la viande 3 minutes avant de la trancher, sers avec le riz.",
    ],
    astuce: "Le repos après cuisson n'est pas un détail : c'est lui qui garde le jus dans la viande.",
  },
  {
    id: "dej-boeuf-patate",
    nom: "Bœuf haché, patate douce rôtie et haricots verts",
    repas: "dejeuner",
    effort: 1,
    minutes: 35,
    ingredients: [
      { food: "boeuf", qty: 160, role: "proteine" },
      { food: "patate_douce", qty: 280, role: "glucide" },
      { food: "haricots_verts", qty: 200 },
      { food: "huile_olive", qty: 8, role: "lipide" },
    ],
    etapes: [
      "Préchauffe le four à 200 °C. Coupe la patate douce en cubes, mélange-les avec l'huile, sel et paprika.",
      "Enfourne 25 minutes en remuant à mi-cuisson.",
      "Fais cuire les haricots verts 8 minutes à l'eau bouillante salée, puis égoutte.",
      "Poêle le bœuf haché 5 minutes à feu vif en l'écrasant à la spatule.",
      "Assemble dans l'assiette.",
    ],
    astuce: "Ne surcharge pas la plaque : des cubes serrés cuisent à la vapeur au lieu de rôtir.",
  },
  {
    id: "dej-cabillaud-quinoa",
    nom: "Cabillaud au citron, quinoa et poivrons",
    repas: "dejeuner",
    effort: 2,
    minutes: 30,
    ingredients: [
      { food: "cabillaud", qty: 200, role: "proteine" },
      { food: "quinoa", qty: 220, role: "glucide" },
      { food: "poivron", qty: 180 },
      { food: "huile_olive", qty: 12, role: "lipide" },
      { food: "citron", qty: 30 },
    ],
    etapes: [
      "Préchauffe le four à 180 °C.",
      "Dépose le cabillaud sur une feuille de papier cuisson, arrose d'huile et de jus de citron, sale et poivre.",
      "Referme la papillote hermétiquement et enfourne 15 minutes.",
      "Fais rôtir les poivrons en lanières à la poêle pendant ce temps.",
      "Sers le poisson dans sa papillote ouverte à table, avec le quinoa.",
    ],
    astuce: "Le poisson est cuit quand la chair se détache en lamelles sous la fourchette, pas avant.",
  },
  {
    id: "dej-dahl",
    nom: "Dahl de lentilles corail au lait de coco",
    repas: "dejeuner",
    effort: 2,
    minutes: 30,
    ingredients: [
      { food: "lentilles_corail", qty: 110, role: "proteine" },
      { food: "riz_complet", qty: 180, role: "glucide" },
      { food: "lait_coco", qty: 60, role: "lipide" },
      { food: "epinards", qty: 150 },
      { food: "oignon", qty: 80 },
    ],
    etapes: [
      "Fais revenir l'oignon émincé 5 minutes, ajoute curry, cumin et gingembre, laisse torréfier 30 secondes.",
      "Ajoute les lentilles corail rincées et trois fois leur volume d'eau.",
      "Laisse mijoter 15 à 18 minutes à couvert, en remuant de temps en temps.",
      "Verse le lait de coco et les épinards, poursuis 3 minutes jusqu'à ce qu'ils tombent.",
      "Sers sur le riz.",
    ],
    astuce: "Les épices se réveillent dans le gras chaud avant l'eau. Les jeter dans le liquide leur enlève tout.",
  },
  {
    id: "dej-tofu-sarrasin",
    nom: "Bowl tofu croustillant, sarrasin et brocoli",
    repas: "dejeuner",
    effort: 2,
    minutes: 30,
    ingredients: [
      { food: "tofu", qty: 200, role: "proteine" },
      { food: "sarrasin", qty: 200, role: "glucide" },
      { food: "brocoli", qty: 180 },
      { food: "sauce_soja", qty: 15 },
      { food: "huile_olive", qty: 12, role: "lipide" },
    ],
    etapes: [
      "Presse le tofu 10 minutes entre deux feuilles de papier absorbant, puis coupe-le en cubes.",
      "Saisis-le à feu vif dans l'huile sans le remuer trop souvent, jusqu'à ce que chaque face dore.",
      "Déglace avec la sauce soja hors du feu.",
      "Fais cuire le brocoli 5 minutes à la vapeur, il doit rester croquant.",
      "Dresse sur le sarrasin.",
    ],
    astuce: "Un tofu qu'on remue sans arrêt ne dore jamais. Laisse-le tranquille deux minutes par face.",
  },
  {
    id: "dej-dinde-pates",
    nom: "Pâtes complètes, dinde et tomates",
    repas: "dejeuner",
    effort: 1,
    minutes: 25,
    ingredients: [
      { food: "dinde", qty: 170, role: "proteine" },
      { food: "pates_completes", qty: 230, role: "glucide" },
      { food: "tomate", qty: 200 },
      { food: "huile_olive", qty: 12, role: "lipide" },
      { food: "parmesan", qty: 15 },
    ],
    etapes: [
      "Fais cuire les pâtes dans un grand volume d'eau bien salée, une minute de moins que le paquet.",
      "Coupe la dinde en lanières, saisis-la 4 minutes à feu vif.",
      "Ajoute les tomates concassées et laisse réduire 5 minutes.",
      "Verse les pâtes égouttées dans la poêle avec une louche d'eau de cuisson, mélange 1 minute.",
      "Râpe le parmesan par-dessus.",
    ],
    astuce: "L'eau de cuisson des pâtes lie la sauce mieux que n'importe quelle crème.",
  },
  {
    id: "dej-buddha-pois-chiches",
    nom: "Buddha bowl pois chiches et patate douce",
    repas: "dejeuner",
    effort: 1,
    minutes: 30,
    ingredients: [
      { food: "pois_chiches", qty: 200, role: "proteine" },
      { food: "patate_douce", qty: 250, role: "glucide" },
      { food: "salade", qty: 60 },
      { food: "avocat", qty: 60, role: "lipide" },
      { food: "citron", qty: 25 },
    ],
    etapes: [
      "Préchauffe le four à 200 °C, coupe la patate douce en cubes et enfourne 25 minutes.",
      "Ajoute les pois chiches égouttés sur la plaque les 10 dernières minutes, avec du paprika.",
      "Prépare une sauce avec le jus de citron, de l'huile, du sel et du poivre.",
      "Dresse la salade au fond du bol, puis les légumes tièdes, l'avocat en tranches, et la sauce.",
    ],
    astuce: "Sèche bien les pois chiches avant le four : c'est la seule façon qu'ils croustillent.",
  },
  {
    id: "dej-thon-boulgour",
    nom: "Salade de boulgour au thon",
    repas: "dejeuner",
    effort: 0,
    minutes: 10,
    ingredients: [
      { food: "thon", qty: 150, role: "proteine" },
      { food: "boulgour", qty: 230, role: "glucide" },
      { food: "concombre", qty: 120 },
      { food: "tomate", qty: 120 },
      { food: "huile_olive", qty: 14, role: "lipide" },
      { food: "citron", qty: 25 },
    ],
    etapes: [
      "Verse le boulgour dans un saladier, couvre d'eau bouillante et laisse gonfler 10 minutes à couvert.",
      "Égrène-le à la fourchette.",
      "Ajoute le thon égoutté, le concombre et les tomates en dés.",
      "Assaisonne avec l'huile, le citron, du sel, du poivre et des herbes fraîches.",
    ],
    astuce: "Elle se bonifie au frigo : prépare-la la veille pour un déjeuner à emporter.",
  },
  {
    id: "dej-poulet-wrap",
    nom: "Wrap poulet crudités",
    repas: "dejeuner",
    effort: 1,
    minutes: 15,
    ingredients: [
      { food: "poulet", qty: 160, role: "proteine" },
      { food: "tortilla", qty: 120, role: "glucide" },
      { food: "salade", qty: 50 },
      { food: "tomate", qty: 80 },
      { food: "houmous", qty: 40, role: "lipide" },
    ],
    etapes: [
      "Coupe le poulet en lanières et poêle-le 5 minutes à feu vif avec du paprika.",
      "Réchauffe les galettes 20 secondes par face à la poêle sèche.",
      "Étale le houmous, garnis de poulet, salade et tomates.",
      "Roule serré et coupe en deux.",
    ],
    astuce: "Laisse une marge de deux doigts en bas et replie-la avant de rouler : rien ne tombe.",
  },
  {
    id: "dej-crevettes-riz",
    nom: "Riz sauté aux crevettes et petits pois",
    repas: "dejeuner",
    effort: 2,
    minutes: 20,
    ingredients: [
      { food: "crevettes", qty: 180, role: "proteine" },
      { food: "riz", qty: 220, role: "glucide" },
      { food: "petit_pois", qty: 120 },
      { food: "oeuf", qty: 55 },
      { food: "sauce_soja", qty: 15 },
      { food: "huile_olive", qty: 12, role: "lipide" },
    ],
    etapes: [
      "Fais chauffer une grande poêle à feu très vif avec l'huile.",
      "Saisis les crevettes 2 minutes, réserve-les : au-delà, elles deviennent caoutchouteuses.",
      "Verse le riz froid et les petits pois, fais sauter 3 minutes sans trop remuer.",
      "Pousse le riz sur un côté, casse l'œuf dans l'espace libre et brouille-le, puis mélange.",
      "Remets les crevettes, déglace à la sauce soja, sers aussitôt.",
    ],
    astuce: "Le riz de la veille, froid et sec, est le seul qui saute vraiment. Le riz frais colle.",
  },
  {
    id: "dej-seitan-poelee",
    nom: "Poêlée de seitan et légumes racines",
    repas: "dejeuner",
    effort: 1,
    minutes: 25,
    ingredients: [
      { food: "seitan", qty: 160, role: "proteine" },
      { food: "pomme_de_terre", qty: 250, role: "glucide" },
      { food: "carotte", qty: 150 },
      { food: "oignon", qty: 70 },
      { food: "huile_olive", qty: 14, role: "lipide" },
    ],
    etapes: [
      "Fais précuire les pommes de terre en cubes 8 minutes à l'eau bouillante, puis égoutte.",
      "Dans une grande poêle, fais dorer l'oignon et les carottes en rondelles 6 minutes.",
      "Ajoute les pommes de terre et laisse colorer sans remuer 4 minutes.",
      "Ajoute le seitan en tranches, thym et laurier, poursuis 4 minutes.",
    ],
    astuce: "Précuire les pommes de terre évite le duo classique : brûlées dehors, crues dedans.",
  },
  {
    id: "dej-omelette-pois-chiches",
    nom: "Grande omelette et salade de pois chiches",
    repas: "dejeuner",
    effort: 1,
    minutes: 20,
    ingredients: [
      { food: "oeuf", qty: 165, role: "proteine", min: 110, max: 275 },
      { food: "pois_chiches", qty: 200, role: "glucide" },
      { food: "salade", qty: 80 },
      { food: "feta", qty: 40 },
      { food: "huile_olive", qty: 12, role: "lipide" },
    ],
    etapes: [
      "Mélange les pois chiches égouttés, la salade et la feta émiettée, assaisonne à l'huile et au citron.",
      "Bats les œufs avec du sel, du poivre et des herbes.",
      "Cuis l'omelette à feu doux dans une poêle légèrement huilée, 4 minutes environ.",
      "Roule-la et sers-la tiède à côté de la salade.",
    ],
    astuce: "Feu doux du début à la fin : une omelette qui grésille fort devient sèche et caoutchouteuse.",
  },

  // ═══════════════════════════════════════════════════════════ dîner (12)
  {
    id: "din-saumon-patate",
    nom: "Saumon rôti et patate douce, épinards à l'ail",
    repas: "diner",
    effort: 1,
    minutes: 30,
    ingredients: [
      { food: "saumon", qty: 150, role: "proteine" },
      { food: "patate_douce", qty: 250, role: "glucide" },
      { food: "epinards", qty: 150 },
      { food: "huile_olive", qty: 8, role: "lipide" },
    ],
    etapes: [
      "Préchauffe le four à 200 °C et enfourne la patate douce en cubes 25 minutes.",
      "Pose le saumon peau vers le bas sur la plaque les 12 dernières minutes.",
      "Fais tomber les épinards 2 minutes à la poêle avec l'ail écrasé.",
      "Sale, poivre, sers avec un trait de citron.",
    ],
    astuce: "Le saumon est à point quand le centre reste légèrement translucide. Opaque partout, il est déjà sec.",
  },
  {
    id: "din-dinde-puree",
    nom: "Dinde et purée de céleri et pomme de terre",
    repas: "diner",
    effort: 2,
    minutes: 35,
    ingredients: [
      { food: "dinde", qty: 170, role: "proteine" },
      { food: "pomme_de_terre", qty: 200, role: "glucide" },
      { food: "carotte", qty: 150 },
      { food: "huile_olive", qty: 10, role: "lipide" },
    ],
    etapes: [
      "Fais cuire les pommes de terre et les carottes en morceaux 20 minutes à l'eau salée.",
      "Écrase-les au presse-purée avec un peu d'eau de cuisson et l'huile, sale et muscade.",
      "Poêle l'escalope de dinde 4 minutes par face à feu moyen.",
      "Laisse-la reposer 2 minutes avant de trancher.",
    ],
    astuce: "Jamais de mixeur pour une purée de pomme de terre : elle devient élastique. Le presse-purée suffit.",
  },
  {
    id: "din-curry-legumes",
    nom: "Curry de pois chiches et chou-fleur",
    repas: "diner",
    effort: 2,
    minutes: 30,
    ingredients: [
      { food: "pois_chiches", qty: 220, role: "proteine" },
      { food: "riz", qty: 180, role: "glucide" },
      { food: "chou_fleur", qty: 200 },
      { food: "lait_coco", qty: 60, role: "lipide" },
      { food: "oignon", qty: 80 },
    ],
    etapes: [
      "Fais revenir l'oignon 5 minutes, ajoute la pâte de curry et laisse chauffer 30 secondes.",
      "Ajoute le chou-fleur en petits bouquets et un verre d'eau, couvre 10 minutes.",
      "Verse les pois chiches et le lait de coco, laisse mijoter 8 minutes à découvert.",
      "Rectifie le sel, sers sur le riz avec de la coriandre.",
    ],
    astuce: "Le curry est meilleur réchauffé le lendemain : les épices ont eu la nuit pour se diffuser.",
  },
  {
    id: "din-cabillaud-polenta",
    nom: "Cabillaud, polenta crémeuse et brocoli",
    repas: "diner",
    effort: 2,
    minutes: 25,
    ingredients: [
      { food: "cabillaud", qty: 200, role: "proteine" },
      { food: "polenta", qty: 250, role: "glucide" },
      { food: "brocoli", qty: 180 },
      { food: "parmesan", qty: 20 },
      { food: "huile_olive", qty: 12, role: "lipide" },
    ],
    etapes: [
      "Prépare la polenta selon le paquet, en fouettant pour éviter les grumeaux.",
      "Hors du feu, ajoute le parmesan et un filet d'huile, couvre.",
      "Fais cuire le brocoli 5 minutes à la vapeur.",
      "Poêle le cabillaud 3 minutes par face à feu moyen, sale en fin de cuisson.",
    ],
    astuce: "Sale le poisson au dernier moment : salé trop tôt, il rend son eau et grille mal.",
  },
  {
    id: "din-poulet-ratatouille",
    nom: "Poulet et ratatouille au four",
    repas: "diner",
    effort: 2,
    minutes: 45,
    ingredients: [
      { food: "poulet", qty: 180, role: "proteine" },
      { food: "courgette", qty: 200 },
      { food: "poivron", qty: 150 },
      { food: "tomate", qty: 200 },
      { food: "pomme_de_terre", qty: 200, role: "glucide" },
      { food: "huile_olive", qty: 14, role: "lipide" },
    ],
    etapes: [
      "Préchauffe le four à 190 °C.",
      "Coupe tous les légumes en morceaux réguliers, mélange-les avec l'huile, l'ail et les herbes de Provence.",
      "Étale sur une plaque, pose le poulet au milieu.",
      "Enfourne 35 minutes, en remuant les légumes à mi-cuisson.",
    ],
    astuce: "Des morceaux de taille égale, c'est toute la différence entre un plat cuit et un plat inégal.",
  },
  {
    id: "din-tortilla-pdt",
    nom: "Tortilla de pommes de terre",
    repas: "diner",
    effort: 2,
    minutes: 35,
    ingredients: [
      { food: "oeuf", qty: 220, role: "proteine", min: 110, max: 330 },
      { food: "pomme_de_terre", qty: 300, role: "glucide" },
      { food: "oignon", qty: 100 },
      { food: "huile_olive", qty: 16, role: "lipide" },
      { food: "salade", qty: 60 },
    ],
    etapes: [
      "Coupe les pommes de terre en fines rondelles et fais-les confire à feu doux dans l'huile avec l'oignon, 15 minutes.",
      "Bats les œufs dans un saladier, sale, et verse les pommes de terre égouttées dedans. Laisse reposer 5 minutes.",
      "Reverse le tout dans la poêle et cuis 5 minutes à feu doux.",
      "Retourne la tortilla à l'aide d'une assiette et poursuis 4 minutes.",
      "Sers tiède avec la salade.",
    ],
    astuce: "Confire, pas frire : les pommes de terre doivent fondre dans l'huile tiède, jamais dorer.",
  },
  {
    id: "din-sardines-salade",
    nom: "Sardines, salade de pommes de terre et haricots",
    repas: "diner",
    effort: 0,
    minutes: 15,
    ingredients: [
      { food: "sardines", qty: 120, role: "proteine" },
      { food: "pomme_de_terre", qty: 280, role: "glucide" },
      { food: "haricots_verts", qty: 150 },
      { food: "oignon", qty: 40 },
      { food: "huile_olive", qty: 10, role: "lipide" },
      { food: "citron", qty: 25 },
    ],
    etapes: [
      "Fais cuire les pommes de terre en robe des champs 20 minutes, les haricots verts 8 minutes.",
      "Coupe les pommes de terre encore tièdes en rondelles : elles absorbent mieux l'assaisonnement.",
      "Assaisonne avec l'huile, le citron, l'oignon émincé, du sel et du poivre.",
      "Dépose les sardines par-dessus au dernier moment.",
    ],
    astuce: "Assaisonner tiède, servir frais : c'est la règle de toutes les salades de pommes de terre.",
  },
  {
    id: "din-tempeh-legumes",
    nom: "Tempeh laqué et légumes vapeur",
    repas: "diner",
    effort: 2,
    minutes: 25,
    ingredients: [
      { food: "tempeh", qty: 170, role: "proteine" },
      { food: "riz_complet", qty: 200, role: "glucide" },
      { food: "brocoli", qty: 150 },
      { food: "carotte", qty: 100 },
      { food: "sauce_soja", qty: 20 },
      { food: "huile_olive", qty: 12, role: "lipide" },
      { food: "miel", qty: 10 },
    ],
    etapes: [
      "Coupe le tempeh en tranches et fais-le dorer 3 minutes par face dans l'huile.",
      "Mélange sauce soja, miel et un peu d'eau, verse sur le tempeh et laisse réduire 2 minutes.",
      "Fais cuire brocoli et carottes 6 minutes à la vapeur.",
      "Sers sur le riz complet, nappé de la sauce.",
    ],
    astuce: "Fais bouillir le tempeh 10 minutes avant de le cuisiner si son amertume te gêne.",
  },
  {
    id: "din-soupe-lentilles",
    nom: "Soupe épaisse de lentilles et légumes",
    repas: "diner",
    effort: 1,
    minutes: 35,
    ingredients: [
      { food: "lentilles", qty: 250, role: "proteine" },
      { food: "pomme_de_terre", qty: 200, role: "glucide" },
      { food: "carotte", qty: 150 },
      { food: "oignon", qty: 80 },
      { food: "huile_olive", qty: 14, role: "lipide" },
      { food: "pain_complet", qty: 50 },
    ],
    etapes: [
      "Fais revenir l'oignon, les carottes et les pommes de terre en dés 6 minutes dans l'huile.",
      "Couvre d'eau à hauteur, ajoute une feuille de laurier, porte à ébullition.",
      "Ajoute les lentilles et laisse mijoter 20 minutes à couvert.",
      "Écrase grossièrement une louche de soupe pour l'épaissir, rectifie le sel.",
      "Sers avec le pain grillé.",
    ],
    astuce: "Sale les légumineuses en fin de cuisson : trop tôt, elles restent fermes.",
  },
  {
    id: "din-poulet-salade-cesar",
    nom: "Salade complète poulet, œuf et croûtons",
    repas: "diner",
    effort: 1,
    minutes: 20,
    ingredients: [
      { food: "poulet", qty: 160, role: "proteine" },
      { food: "pain_complet", qty: 80, role: "glucide" },
      { food: "salade", qty: 100 },
      { food: "oeuf", qty: 55 },
      { food: "yaourt_grec", qty: 60 },
      { food: "huile_olive", qty: 10, role: "lipide" },
    ],
    etapes: [
      "Fais cuire l'œuf 9 minutes à l'eau bouillante, puis passe-le sous l'eau froide.",
      "Coupe le pain en cubes et fais-le dorer à la poêle avec un peu d'huile et de l'ail.",
      "Poêle le poulet en lanières 5 minutes.",
      "Mélange le yaourt grec, du citron, du sel et du poivre pour la sauce.",
      "Assemble la salade, le poulet, l'œuf coupé en deux, les croûtons, et nappe de sauce.",
    ],
    astuce: "Assaisonne au dernier moment : une salade sauçée d'avance retombe en dix minutes.",
  },
  {
    id: "din-chili-vegetarien",
    nom: "Chili de haricots rouges",
    repas: "diner",
    effort: 1,
    minutes: 30,
    ingredients: [
      { food: "haricots_rouges", qty: 250, role: "proteine" },
      { food: "riz", qty: 180, role: "glucide" },
      { food: "tomate", qty: 200 },
      { food: "poivron", qty: 120 },
      { food: "mais", qty: 80 },
      { food: "huile_olive", qty: 12, role: "lipide" },
    ],
    etapes: [
      "Fais revenir le poivron en dés 5 minutes dans l'huile, avec cumin et paprika fumé.",
      "Ajoute les tomates concassées et laisse réduire 10 minutes.",
      "Ajoute les haricots rouges et le maïs égouttés, poursuis 8 minutes à feu doux.",
      "Rectifie le sel et le piment, sers sur le riz.",
    ],
    astuce: "Un carré de chocolat noir dans le chili en fin de cuisson : ça arrondit l'acidité de la tomate.",
  },
  {
    id: "din-gratin-courgettes",
    nom: "Gratin de courgettes au thon",
    repas: "diner",
    effort: 2,
    minutes: 40,
    ingredients: [
      { food: "thon", qty: 150, role: "proteine" },
      { food: "courgette", qty: 300 },
      { food: "pomme_de_terre", qty: 220, role: "glucide" },
      { food: "mozzarella", qty: 60, role: "lipide" },
      { food: "oeuf", qty: 55 },
    ],
    etapes: [
      "Préchauffe le four à 190 °C.",
      "Fais revenir les courgettes en rondelles 8 minutes à la poêle pour leur faire rendre leur eau.",
      "Précuis les pommes de terre en rondelles 10 minutes à l'eau salée.",
      "Alterne les couches dans un plat avec le thon émietté, verse l'œuf battu, couvre de mozzarella.",
      "Enfourne 20 minutes jusqu'à ce que le dessus soit doré.",
    ],
    astuce: "Faire dégorger les courgettes à la poêle avant : sans ça, le gratin baigne dans l'eau.",
  },

  // ══════════════════════════════════════════════════════════ collation (6)
  {
    id: "col-skyr-miel",
    nom: "Skyr, miel et amandes",
    repas: "collation",
    effort: 0,
    minutes: 3,
    ingredients: [
      { food: "skyr", qty: 200, role: "proteine" },
      { food: "miel", qty: 15, role: "glucide" },
      { food: "amandes", qty: 20, role: "lipide" },
    ],
    etapes: ["Verse le skyr dans un bol.", "Nappe de miel et ajoute les amandes."],
    astuce: "Prépare-le dans un bocal à visser : il tient dans un sac de sport sans couler.",
  },
  {
    id: "col-banane-cacahuete",
    nom: "Galettes de riz, banane et beurre de cacahuète",
    repas: "collation",
    effort: 0,
    minutes: 3,
    ingredients: [
      { food: "galette_riz", qty: 27, role: "glucide", min: 9, max: 63 },
      { food: "banane", qty: 120 },
      { food: "beurre_cacahuete", qty: 20, role: "lipide" },
      { food: "skyr", qty: 150, role: "proteine" },
    ],
    etapes: [
      "Étale le beurre de cacahuète sur les galettes de riz.",
      "Dispose la banane en rondelles par-dessus.",
      "Sers le skyr à côté, nature ou avec un peu de cannelle.",
    ],
    astuce: "Une pincée de cannelle transforme cette collation banale en quelque chose qu'on attend.",
  },
  {
    id: "col-toast-houmous",
    nom: "Toast houmous et tomates cerises",
    repas: "collation",
    effort: 0,
    minutes: 5,
    ingredients: [
      { food: "pain_complet", qty: 60, role: "glucide" },
      { food: "houmous", qty: 60, role: "lipide" },
      { food: "tomate", qty: 100 },
      { food: "feta", qty: 30, role: "proteine" },
    ],
    etapes: [
      "Fais griller le pain.",
      "Étale le houmous, ajoute les tomates coupées en deux et la feta émiettée.",
      "Poivre et arrose d'un filet d'huile d'olive.",
    ],
    astuce: "Grille le pain juste avant : refroidi, il ramollit sous le houmous.",
  },
  {
    id: "col-shake-avoine",
    nom: "Shake avoine, banane et cacao",
    repas: "collation",
    effort: 0,
    minutes: 3,
    ingredients: [
      { food: "whey", qty: 30, role: "proteine", min: 15, max: 50 },
      { food: "avoine", qty: 40, role: "glucide" },
      { food: "banane", qty: 120 },
      { food: "cacao", qty: 8 },
      { food: "beurre_cacahuete", qty: 10, role: "lipide" },
    ],
    etapes: [
      "Mets tous les ingrédients dans un blender avec 250 ml d'eau ou de lait.",
      "Mixe 30 secondes jusqu'à obtenir une texture lisse.",
    ],
    astuce: "Une banane congelée en rondelles donne une texture de milk-shake sans une calorie de plus.",
  },
  {
    id: "col-fruits-noix",
    nom: "Pomme, noix et compote",
    repas: "collation",
    effort: 0,
    minutes: 2,
    ingredients: [
      { food: "pomme", qty: 150, role: "glucide" },
      { food: "noix", qty: 20, role: "lipide" },
      { food: "compote", qty: 100 },
      { food: "fromage_blanc", qty: 150, role: "proteine" },
    ],
    etapes: [
      "Coupe la pomme en quartiers.",
      "Sers avec le fromage blanc, la compote et les cerneaux de noix.",
    ],
    astuce: "Garde la peau de la pomme : c'est là que se trouvent les fibres qui calent.",
  },
  {
    id: "col-oeufs-durs",
    nom: "Œufs durs et crudités",
    repas: "collation",
    effort: 1,
    minutes: 12,
    ingredients: [
      { food: "oeuf", qty: 110, role: "proteine", min: 55, max: 220 },
      { food: "pain_complet", qty: 60, role: "glucide" },
      { food: "carotte", qty: 120 },
      { food: "concombre", qty: 100 },
      { food: "houmous", qty: 40, role: "lipide" },
    ],
    etapes: [
      "Plonge les œufs dans l'eau bouillante et compte 9 minutes.",
      "Refroidis-les aussitôt sous l'eau froide, l'écalage sera plus facile.",
      "Coupe les carottes et le concombre en bâtonnets, sers avec le houmous et le pain.",
    ],
    astuce: "Cuits d'avance, les œufs durs se gardent trois jours au frigo dans leur coquille.",
  },
];
