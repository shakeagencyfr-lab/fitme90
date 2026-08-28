import { PRODUCT_NAME } from "@/lib/config";

// ------------------------------------------------------------------ *
// FitMe90 — Décharge de responsabilité / consentement éclairé
//
// Quand une situation de santé est déclarée au questionnaire (traitement,
// pathologie, grossesse…), on N'EMPÊCHE PLUS l'activation : on présente une
// alerte claire et on demande la signature électronique d'une décharge
// (consentement éclairé). Le service est positionné comme un accompagnement
// SPORTIF et non médical.
//
// IMPORTANT (juridique) : ce texte est un modèle de bonne foi, à FAIRE VALIDER
// PAR UN JURISTE avant exploitation. En droit français, une décharge ne peut
// pas exonérer d'une faute lourde ou dolosive ; d'où la formule « dans les
// limites permises par la loi ». Voir DEPLOY.md.
// ------------------------------------------------------------------ */

export const MEDICAL_WAIVER_TITLE = "Décharge de responsabilité et consentement éclairé";

export const MEDICAL_WAIVER_INTRO = `${PRODUCT_NAME} propose un accompagnement sportif et nutritionnel à visée de forme et de bien-être. D'après tes réponses, certains éléments de santé méritent une vigilance particulière. Nous ne bloquons pas ton accès, mais nous te demandons de lire et d'accepter la décharge ci-dessous.`;

export const MEDICAL_WAIVER_CLAUSES: { title: string; body: string }[] = [
  {
    title: "Nature du service",
    body: `${PRODUCT_NAME} est un accompagnement sportif et nutritionnel de forme. Il ne constitue pas un avis, un diagnostic ni un traitement médical et ne remplace pas une consultation auprès d'un professionnel de santé.`,
  },
  {
    title: "Recommandation médicale",
    body: "Compte tenu des éléments de santé que j'ai déclarés (traitement, pathologie, grossesse ou autre), je reconnais avoir été informé(e) qu'il m'est recommandé de recueillir l'avis de mon médecin avant de débuter ou de poursuivre le programme.",
  },
  {
    title: "Aptitude et responsabilité",
    body: "Je pratique sous ma propre responsabilité. Je déclare être en capacité de pratiquer une activité physique, ou je m'engage à obtenir un avis médical favorable. En cas de doute, je consulte avant de commencer.",
  },
  {
    title: "Vigilance pendant la pratique",
    body: "Je m'engage à adapter l'intensité à mes sensations, à cesser immédiatement tout exercice en cas de douleur, de gêne, d'essoufflement anormal ou de malaise, et à consulter un professionnel de santé si ces symptômes persistent.",
  },
  {
    title: "Sincérité des informations",
    body: "Je déclare avoir renseigné avec sincérité et exactitude ma situation de santé. Je préviendrai le coach de tout changement susceptible d'influer sur ma pratique.",
  },
  {
    title: "Limitation de responsabilité",
    body: `Je reconnais que ${PRODUCT_NAME} et son coach ne pourront être tenus responsables des conséquences d'une pratique non conforme aux consignes, d'informations de santé inexactes ou incomplètes de ma part, ou d'une contre-indication non déclarée, dans les limites permises par la loi.`,
  },
  {
    title: "Données de santé",
    body: "Les informations de santé que je communique sont traitées de façon confidentielle, avec mon consentement, dans le seul but d'adapter mon accompagnement (conformément au RGPD).",
  },
];

export const MEDICAL_WAIVER_CONSENT =
  "J'ai lu et compris cette décharge. Je l'accepte librement et en connaissance de cause.";
