import {
  CONSENT_LABEL,
  CONSENT_TEXT_VERSION,
  LEGAL_BASIS_LABEL,
  MIN_AGE,
  PERSONAL_TABLES,
  RETENTION,
  SUBPROCESSORS,
} from "@/lib/gdpr";

// Le registre des traitements de l'article 30, écrit DEPUIS le code.
//
// POURQUOI GÉNÉRÉ, ET NON RÉDIGÉ. Un registre tenu à la main dans un tableur
// est faux trois mois après sa création : on ajoute une table, on oublie la
// ligne. Celui-ci est produit à partir du même registre que l'export, la page
// de confidentialité et l'accord de sous-traitance, et un test échoue si le
// fichier RGPD.md diverge. Il ne peut donc pas prendre de retard en silence.
//
// CE QU'IL NE REMPLACE PAS. L'identité du responsable, ses coordonnées, le
// délégué s'il y en a un : ce sont des informations d'entreprise, pas de code.
// Elles sont marquées « à compléter » plutôt que devinées.

export const DOC_START = "<!-- registre:debut -->";
export const DOC_END = "<!-- registre:fin -->";

/** Le bloc du registre, tel qu'il doit figurer dans RGPD.md. */
export function registerMarkdown(): string {
  const lignes = PERSONAL_TABLES.map(
    (t) =>
      `| ${t.label} | \`${t.table}\` | ${t.purpose} | ${LEGAL_BASIS_LABEL[t.basis]} | ${t.health ? "oui" : "non"} | ${t.retention} |`,
  );
  const sous = SUBPROCESSORS.map(
    (s) => `| ${s.name} | ${s.role} | ${s.region} | ${s.transfer ?? "Aucun"} |`,
  );
  const consentements = (Object.keys(CONSENT_LABEL) as (keyof typeof CONSENT_LABEL)[]).map(
    (k) => `| \`${k}\` | ${CONSENT_LABEL[k]} |`,
  );

  return [
    DOC_START,
    "",
    `_Généré depuis \`lib/gdpr.ts\`. Ne pas modifier à la main : lancer \`npm run rgpd\`._`,
    "",
    "### Catégories de données",
    "",
    "| Donnée | Table | Finalité | Base légale | Santé | Conservation |",
    "| --- | --- | --- | --- | --- | --- |",
    ...lignes,
    "",
    "### Autres durées",
    "",
    `- Prospects du mini-programme gratuit, sans conversion : ${RETENTION.prospectMonths} mois.`,
    `- Journal technique des appels au modèle : ${RETENTION.aiLogMonths} mois.`,
    `- Journal des accès en assistance : ${RETENTION.supportLogMonths} mois.`,
    `- Preuve d'un consentement, après son retrait : ${RETENTION.consentProofMonths} mois.`,
    `- Compte inactif, avant proposition de suppression : ${RETENTION.dormantAccountMonths} mois.`,
    "",
    "### Sous-traitants ultérieurs",
    "",
    "| Service | Rôle | Traitement | Transfert hors UE |",
    "| --- | --- | --- | --- |",
    ...sous,
    "",
    "### Consentements recueillis",
    "",
    "| Clé | Intitulé |",
    "| --- | --- |",
    ...consentements,
    "",
    `Version courante des textes : **${CONSENT_TEXT_VERSION}**. Âge minimum pour ouvrir un compte seul : **${MIN_AGE} ans** (article 8, France).`,
    "",
    DOC_END,
  ].join("\n");
}
