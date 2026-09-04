/**
 * TRANSPARENCE IA (règlement (UE) 2024/1689, « AI Act »).
 *
 * L'article 50 est applicable depuis le 2 août 2026. Deux obligations nous
 * concernent directement, et une troisième encadre la marque blanche.
 *
 * 50(1) INFORMER QUE C'EST UNE IA. Un système conçu pour interagir directement
 * avec des personnes doit le leur dire, au moment de la première interaction,
 * sauf si c'est évident pour une personne raisonnablement avertie. Notre
 * positionnement rend justement l'exception inapplicable : le Coach IA porte
 * le prénom du coach, sur une marque qui n'est pas la nôtre. Un client peut
 * légitimement croire qu'il écrit à un humain. On le dit donc explicitement.
 *
 * 50(2) MARQUER LES CONTENUS GÉNÉRÉS, dans un format lisible par machine.
 * Programmes, plans nutritionnels, recettes et PDF exportés sont des contenus
 * générés : ils portent une marque, pas seulement une phrase à l'écran.
 * Échéance pour les systèmes déjà sur le marché avant le 2 août 2026 :
 * 2 décembre 2026.
 *
 * ARTICLE 25 (MARQUE BLANCHE). Un revendeur ou un coach qui appose son nom sur
 * le système peut devenir « fournisseur » au sens du règlement, avec les
 * obligations qui vont avec. Le produit ne peut pas trancher ça à sa place :
 * il nomme la chaîne pour que chacun sache où il se situe, et le contrat de
 * revente doit le régler. C'est un point à faire valider par un juriste.
 *
 * ARTICLE 4 (LITTÉRATIE IA), applicable depuis le 2 février 2025 : ceux qui
 * exploitent le système doivent le comprendre. D'où `AI_LITERACY_POINTS`,
 * affiché aux coachs et revendeurs plutôt que rangé dans un PDF que personne
 * n'ouvre.
 *
 * CE MODULE N'EST PAS UN AVIS JURIDIQUE. Il implémente des mesures concrètes
 * et vérifiables ; la qualification finale du système et les contrats
 * relèvent d'un juriste.
 */

/** Version du dispositif de transparence, écrite dans les contenus marqués. */
export const AI_DISCLOSURE_VERSION = "2026-08";

/** Qui est quoi dans la chaîne, au sens du règlement. */
export type AiActRole = "provider" | "deployer" | "user";

/**
 * Le modèle qui a produit un contenu, tel qu'on l'inscrit dans la marque.
 * On nomme la famille, pas la version exacte : elle change sans que la nature
 * du contenu change, et une version périmée dans un PDF vieux d'un an
 * induirait davantage en erreur qu'elle n'informerait.
 */
export interface AiOrigin {
  /** Fournisseur du modèle sous-jacent. */
  vendor: string;
  /** À quoi a servi la génération (programme, nutrition, recette...). */
  purpose: string;
  /** Horodatage ISO de la génération. */
  generatedAt: string;
}

/**
 * Marque LISIBLE PAR MACHINE d'un contenu généré, au sens de l'article 50(2).
 *
 * Volontairement un objet stable et plat : c'est ce qui part dans les
 * métadonnées d'un PDF et dans la colonne d'un plan. Un format qui bouge à
 * chaque version rendrait la détection impossible, ce qui est précisément ce
 * que l'obligation cherche à éviter.
 */
export interface AiContentMark {
  /** Discriminant : ce contenu est généré ou manipulé par une IA. */
  "ai-generated": true;
  /** Régime invoqué, pour qu'un outil sache quoi chercher. */
  standard: "EU-AI-Act-Art-50";
  version: string;
  vendor: string;
  purpose: string;
  generatedAt: string;
}

export function contentMark(o: AiOrigin): AiContentMark {
  return {
    "ai-generated": true,
    standard: "EU-AI-Act-Art-50",
    version: AI_DISCLOSURE_VERSION,
    vendor: o.vendor,
    purpose: o.purpose,
    generatedAt: o.generatedAt,
  };
}

/** La marque sérialisée pour un champ texte (métadonnée PDF, attribut HTML). */
export function contentMarkString(o: AiOrigin): string {
  return JSON.stringify(contentMark(o));
}

/**
 * Reconnaît notre marque dans une valeur quelconque. Marquer sans savoir
 * relire n'aurait aucun intérêt : c'est cette fonction qui rend la marque
 * vérifiable, et donc les tests possibles.
 */
export function isAiMarked(raw: unknown): boolean {
  if (!raw) return false;
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    return !!o && typeof o === "object" && (o as Record<string, unknown>)["ai-generated"] === true;
  } catch {
    return false;
  }
}

/**
 * La phrase d'information de l'article 50(1), au moment de la première
 * interaction.
 *
 * `brand` est la marque que le client voit : en marque blanche, lui parler de
 * « My Fitness App » ne l'informerait de rien, il ne connaît que son coach.
 * Le nom du coach est repris tel quel, parce que c'est précisément ce nom qui
 * pouvait laisser croire à un humain.
 */
export function chatDisclosure(brand: string, coachName: string): string {
  const marque = brand.trim() || "ton coach";
  const prenom = coachName.trim();
  return (
    `${prenom} est un assistant automatique. Tu échanges avec une intelligence artificielle, ` +
    `pas avec une personne. Ses réponses sont générées à partir de ton programme et de tes ` +
    `réponses au questionnaire, et elles ne remplacent ni un avis médical, ni le suivi de ${marque}.`
  );
}

/** La mention portée par un contenu généré, à l'écran et sur les exports. */
export function contentDisclosure(purpose: string): string {
  return `${purpose} généré par une intelligence artificielle, à partir de tes réponses. À vérifier avec un professionnel avant toute décision de santé.`;
}

/**
 * Les points de littératie IA (article 4) destinés aux coachs et revendeurs.
 *
 * Ils disent ce que le système fait, ce qu'il ne fait pas, et ce qui reste à
 * la charge de l'humain. Un coach qui vend l'outil sous sa marque doit pouvoir
 * répondre à ses clients sans nous appeler.
 */
export const AI_LITERACY_POINTS: { titre: string; texte: string }[] = [
  {
    titre: "Ce que l'IA produit",
    texte:
      "Les programmes, les plans nutritionnels et les réponses du Coach IA sont générés automatiquement à partir du questionnaire et de l'historique du client. Rien n'est relu par un humain avant d'être affiché.",
  },
  {
    titre: "Ce qu'elle peut se tromper",
    texte:
      "Un modèle de langage peut produire une réponse plausible mais fausse, mal peser une contrainte physique, ou proposer une charge inadaptée. La vraisemblance d'une réponse n'est pas une garantie d'exactitude.",
  },
  {
    titre: "Ce qui reste à ta charge",
    texte:
      "Tu restes le professionnel responsable de l'accompagnement. Vérifie les programmes des clients qui déclarent une pathologie, une blessure ou une grossesse, et corrige ce qui doit l'être : l'outil ne te dispense pas de ton jugement.",
  },
  {
    titre: "Ce que tes clients doivent savoir",
    texte:
      "Ils sont informés qu'ils échangent avec une IA dès leur premier message, et chaque document exporté porte la mention de sa génération automatique. Tu ne dois jamais présenter le Coach IA comme une personne.",
  },
  {
    titre: "Ce qui n'est pas un usage prévu",
    texte:
      "L'outil ne pose aucun diagnostic, ne suit aucune pathologie et ne se substitue à aucun professionnel de santé. Il n'est pas un dispositif médical et ne doit pas être vendu comme tel.",
  },
];
