// Le registre des données personnelles : une seule source de vérité.
//
// POURQUOI CE FICHIER EXISTE. Un export « droit à la portabilité » écrit à la
// main vieillit mal : on ajoute une table, on oublie de l'y mettre, et le
// client qui demande ses données en reçoit une partie sans que personne ne
// s'en aperçoive. Ici, chaque table qui contient de la donnée personnelle est
// déclarée UNE FOIS, avec sa finalité, sa base légale et sa durée de
// conservation. L'export, la page de confidentialité et le test de dérive
// lisent tous ce même tableau.
//
// LE TEST QUI TIENT L'ENSEMBLE. lib/gdpr.test.ts relit supabase/schema.sql et
// échoue si une table porte une colonne `user_id` ou `client_id` sans être
// déclarée ici. Autrement dit : on ne peut plus ajouter une table de données
// personnelles en oubliant l'export.
//
// CE QUE CE FICHIER NE FAIT PAS. Il ne rend personne conforme tout seul. Il
// décrit ce que le code fait vraiment, ce qui est la condition pour que le
// registre de l'article 30 et la politique de confidentialité disent vrai.

/** Sur quel fondement de l'article 6 (et 9 pour la santé) repose un traitement. */
export type LegalBasis =
  | "contrat"
  | "consentement"
  | "consentement-sante"
  | "obligation-legale"
  | "interet-legitime";

export const LEGAL_BASIS_LABEL: Record<LegalBasis, string> = {
  contrat: "Exécution du contrat (article 6.1.b)",
  consentement: "Consentement (article 6.1.a)",
  "consentement-sante": "Consentement explicite, données de santé (articles 6.1.a et 9.2.a)",
  "obligation-legale": "Obligation légale (article 6.1.c)",
  "interet-legitime": "Intérêt légitime (article 6.1.f)",
};

/**
 * Comment une table est rattachée à une personne.
 *
 * `user` : la personne est titulaire du compte (colonne user_id, ou id pour
 * les profils). `client` : la ligne a été écrite PAR LE COACH AU SUJET de la
 * personne (ses notes, ses rendez-vous, ses messages). Ces lignes-là sont
 * aussi ses données personnelles : l'article 15 lui en ouvre l'accès, et
 * c'est exactement ce que l'ancien export oubliait.
 */
export type OwnerColumn = "user_id" | "client_id" | "id";

export interface PersonalTable {
  table: string;
  /**
   * Le nom de la chose, écrit pour la personne concernée.
   *
   * Le nom de la table est du vocabulaire de développeur : il a sa place dans
   * l'export, qui est un fichier technique, pas dans un document qu'on
   * présente à quelqu'un pour l'informer de ses droits.
   */
  label: string;
  column: OwnerColumn;
  /** Ce que cette table sert à faire, en une phrase lisible par le client. */
  purpose: string;
  basis: LegalBasis;
  /** Contient des données de santé au sens de l'article 9. */
  health?: boolean;
  /** Combien de temps la ligne est gardée, en clair. */
  retention: string;
  /**
   * La ligne survit à la suppression du compte, sans le lien à la personne.
   * C'est le cas des ventes : la compta du coach en a besoin, la personne
   * n'y est plus rattachée (user_id passe à null).
   */
  survivesDeletion?: boolean;
}

/**
 * Toutes les tables contenant de la donnée personnelle d'un client.
 *
 * L'ordre est celui de l'export : identité, santé, programme, activité,
 * échanges, technique. C'est l'ordre dans lequel un humain lit un dossier.
 */
export const PERSONAL_TABLES: readonly PersonalTable[] = [
  {
    table: "profiles",
    label: "Ton compte",
    column: "id",
    purpose: "Ton compte : prénom, langue, accès, rattachement à ton coach.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "consents",
    label: "Tes accords",
    column: "user_id",
    purpose: "La trace de ce que tu as accepté, quand, et dans quelle version du texte.",
    basis: "obligation-legale",
    retention:
      "Tant que ton compte existe, comme preuve de ton accord, puis supprimée avec lui : garder une preuve au sujet de quelqu'un qu'on a effacé n'aurait aucun sens.",
  },
  {
    table: "questionnaires",
    label: "Ton questionnaire",
    column: "user_id",
    purpose: "Tes réponses : objectif, niveau, pathologies déclarées, allergies, régime.",
    basis: "consentement-sante",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "equipment",
    label: "Ton matériel",
    column: "user_id",
    purpose: "Le matériel dont tu disposes, pour n'écrire que des exercices faisables.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "programs",
    label: "Ton programme",
    column: "user_id",
    purpose: "Ton programme d'entraînement et ton plan nutritionnel.",
    basis: "contrat",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "session_logs",
    label: "Tes séances",
    column: "user_id",
    purpose: "Tes séances validées, tes charges et tes répétitions.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "weights",
    label: "Tes pesées",
    column: "user_id",
    purpose: "Tes pesées, telles que tu les as notées au fil du programme.",
    basis: "consentement-sante",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "measurements",
    label: "Tes mensurations",
    column: "user_id",
    purpose: "Tes mensurations, telles que tu les as notées au fil du programme.",
    basis: "consentement-sante",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "photos",
    label: "Tes photos",
    column: "user_id",
    purpose: "Les photos que tu as chargées.",
    basis: "consentement",
    retention: "Pendant la relation, puis supprimées avec le compte, fichiers compris.",
  },
  {
    table: "food_log",
    label: "Ton journal alimentaire",
    column: "user_id",
    purpose: "Ton journal alimentaire, y compris les produits scannés.",
    basis: "consentement-sante",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "saved_recipes",
    label: "Tes recettes gardées",
    column: "user_id",
    purpose: "Les recettes que tu as gardées.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimées avec le compte.",
  },
  {
    table: "shopping_checks",
    label: "Ta liste de courses",
    column: "user_id",
    purpose: "Ce que tu as coché sur ta liste de courses.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "coach_conversations",
    label: "Tes conversations avec le Coach IA",
    column: "user_id",
    purpose: "Tes conversations avec le Coach IA.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimées avec le compte.",
  },
  {
    table: "coach_messages",
    label: "Tes messages au Coach IA",
    column: "user_id",
    purpose: "Le contenu de tes échanges avec le Coach IA, photos comprises.",
    basis: "contrat",
    health: true,
    retention: "Pendant la relation, puis supprimé avec le compte.",
  },
  {
    table: "vip_messages",
    label: "Tes messages à ton coach",
    column: "client_id",
    purpose: "Tes échanges écrits avec ton coach, quand ton plan les inclut.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimés avec le compte.",
  },
  {
    table: "coach_notes",
    label: "Les notes de ton coach sur toi",
    column: "client_id",
    purpose: "Les notes que ton coach a écrites à ton sujet pour préparer ton suivi.",
    basis: "interet-legitime",
    retention: "Pendant la relation, puis supprimées avec le compte.",
  },
  {
    table: "coach_notifications",
    label: "Les alertes envoyées à ton coach",
    column: "client_id",
    purpose: "Les alertes remontées à ton coach à ton sujet (séance manquée, message).",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimées avec le compte.",
  },
  {
    table: "bookings",
    label: "Tes rendez-vous",
    column: "client_id",
    purpose: "Tes rendez-vous en présentiel, passés et à venir.",
    basis: "contrat",
    retention: "Pendant la relation, puis supprimés avec le compte.",
  },
  {
    table: "push_subscriptions",
    label: "Tes rappels de séance",
    column: "user_id",
    purpose: "L'abonnement de ton navigateur aux rappels de séance.",
    basis: "consentement",
    retention: "Jusqu'à ce que tu coupes les notifications, ou à la suppression du compte.",
  },
  {
    table: "orders",
    label: "Tes achats",
    column: "user_id",
    purpose: "Tes achats : montant, date, offre, référence de paiement.",
    basis: "obligation-legale",
    retention:
      "La vente est conservée pour la comptabilité de ton coach, mais le lien avec ton compte est coupé à la suppression : la ligne ne te désigne plus.",
    survivesDeletion: true,
  },
  {
    table: "credit_ledger",
    label: "Ta consommation de crédits IA",
    column: "client_id",
    purpose: "Les crédits IA consommés par tes actions, pour la facturation entre professionnels.",
    basis: "interet-legitime",
    retention: "36 mois, pour la facturation entre le coach et son revendeur.",
    survivesDeletion: true,
  },
  {
    table: "ai_calls",
    label: "Le journal technique de l'IA",
    column: "user_id",
    purpose: "Le journal technique des appels au modèle : quoi, quand, combien de jetons.",
    basis: "interet-legitime",
    retention: "12 mois, pour le suivi des coûts et la détection d'abus.",
  },
];

/** Les tables dont le contenu relève de l'article 9 (données de santé). */
export const HEALTH_TABLES: readonly string[] = PERSONAL_TABLES.filter((t) => t.health).map((t) => t.table);

/** Les mêmes, sous leur intitulé lisible, pour les documents. */
export const HEALTH_LABELS: readonly string[] = PERSONAL_TABLES.filter((t) => t.health).map((t) =>
  t.label.toLowerCase(),
);

// ───────────────────────────────────────────────────────── sous-traitants

export interface Subprocessor {
  name: string;
  role: string;
  /** Où la donnée est traitée. */
  region: string;
  /** Transfert hors UE, et sur quelle garantie il repose. */
  transfer: string | null;
}

/**
 * Les sous-traitants réellement appelés par le code.
 *
 * Chaque ligne correspond à un appel qu'on peut retrouver dans le dépôt. Un
 * service qu'on n'appelle pas n'a rien à faire ici, et un service qu'on
 * appelle sans l'y écrire rend la politique de confidentialité fausse.
 */
export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    name: "Vercel",
    role: "Hébergement de l'application et exécution des pages.",
    region: "Union européenne (Paris, cdg1)",
    transfer: "Clauses contractuelles types pour le support et la supervision depuis les États-Unis.",
  },
  {
    name: "Supabase",
    role: "Base de données, authentification, stockage des fichiers.",
    region: "Union européenne",
    transfer: "Clauses contractuelles types pour le support depuis les États-Unis.",
  },
  {
    name: "Anthropic",
    role: "Génération du programme, réponses du Coach IA, analyse des photos envoyées au chat.",
    region: "États-Unis",
    transfer: "Clauses contractuelles types. Les données ne servent pas à entraîner le modèle.",
  },
  {
    name: "Stripe",
    role: "Encaissement des paiements. Aucune donnée de carte ne transite par l'application.",
    region: "Union européenne et États-Unis",
    transfer: "Clauses contractuelles types et Data Privacy Framework.",
  },
  {
    name: "Open Food Facts",
    role: "Fiches produits interrogées au scan d'un code-barres.",
    region: "Union européenne",
    transfer: null,
  },
  {
    name: "SerpApi",
    role: "Import de la fiche d'établissement d'un coach, à sa demande. Aucune donnée de client.",
    region: "États-Unis",
    transfer: "Clauses contractuelles types.",
  },
];

// ─────────────────────────────────────────────────────────── consentements

/**
 * Les consentements qu'on sait recueillir, et qu'on doit savoir PROUVER.
 *
 * L'article 7.1 demande au responsable d'être en mesure de démontrer que la
 * personne a consenti. Une case cochée dans un formulaire ne prouve rien si
 * rien n'est écrit ensuite : c'est le trou que la table `consents` comble.
 */
export type ConsentKind = "cgv" | "confidentialite" | "sante" | "prospection";

export const CONSENT_LABEL: Record<ConsentKind, string> = {
  cgv: "Conditions générales de vente",
  confidentialite: "Politique de confidentialité",
  sante: "Traitement des données de santé",
  prospection: "Recevoir des conseils et des offres par e-mail",
};

/**
 * La version du texte acceptée, pour savoir À QUOI la personne a consenti.
 *
 * On l'incrémente quand le texte change sur le fond. Un consentement donné
 * sur la version 1 ne vaut pas pour une version 2 qui ajoute une finalité.
 */
export const CONSENT_TEXT_VERSION = "2026-09-11";

/** Âge minimum pour ouvrir un compte seul (article 8 du RGPD, France : 15 ans). */
export const MIN_AGE = 15;

// ────────────────────────────────────────────────────── durées, en un mot

/**
 * Les durées de conservation qui ne tiennent pas dans une ligne de table.
 *
 * Elles sont ici pour que le cron de purge et la page de confidentialité
 * lisent le même chiffre, et pas deux chiffres qui divergent avec le temps.
 */
export const RETENTION = {
  /** Prospects du mini-programme gratuit, sans achat (recommandation CNIL). */
  prospectMonths: 36,
  /** Journal technique des appels au modèle. */
  aiLogMonths: 12,
  /** Journal des accès en assistance d'un coach au compte d'un client. */
  supportLogMonths: 12,
  /** Preuve d'un consentement, après son retrait. */
  consentProofMonths: 36,
  /** Compte inactif : délai avant de proposer la suppression. */
  dormantAccountMonths: 24,
} as const;
