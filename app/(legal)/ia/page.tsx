import { AI_LITERACY_POINTS, AI_DISCLOSURE_VERSION } from "@/lib/ai-act";

export const metadata = { title: "Transparence sur l'IA, My Fitness App" };

/**
 * Page de transparence exigée en pratique par l'article 50 du règlement
 * (UE) 2024/1689 (AI Act), applicable depuis le 2 août 2026.
 *
 * L'information de première interaction est donnée dans le chat lui-même, pas
 * ici : une page que le client doit chercher n'informe que ceux qui la
 * cherchent. Cette page est le document de référence derrière, celui qu'un
 * client, un coach ou une autorité peut consulter.
 */
export default function TransparenceIaPage() {
  return (
    <>
      <h1>Transparence sur l&apos;intelligence artificielle</h1>
      <p className="muted">
        Version {AI_DISCLOSURE_VERSION}. Établie au regard du règlement (UE) 2024/1689
        sur l&apos;intelligence artificielle, dont les obligations de transparence de
        l&apos;article 50 s&apos;appliquent depuis le 2 août 2026.
      </p>

      <h2>Ce service utilise de l&apos;intelligence artificielle</h2>
      <p>
        Le programme d&apos;entraînement, le plan nutritionnel, les recettes, les
        alternatives d&apos;exercices et les réponses du Coach IA sont générés
        automatiquement par un modèle de langage. Aucun de ces contenus n&apos;est
        rédigé ni relu par un humain avant de t&apos;être présenté.
      </p>
      <p>
        Quand tu écris au Coach IA, tu échanges avec un programme, pas avec une
        personne, même s&apos;il porte le prénom de ton coach. Cette information
        t&apos;est rappelée dans la conversation elle-même.
      </p>

      <h2>Comment reconnaître un contenu généré</h2>
      <p>
        Chaque document exporté porte une mention visible et un marquage inscrit
        dans ses métadonnées, lisible par un outil sans avoir à ouvrir le
        fichier. Le marquage indique le régime invoqué, le fournisseur du modèle,
        l&apos;usage et la date de génération.
      </p>

      <h2>Qui fait quoi</h2>
      <ul>
        <li>
          <strong>Le modèle</strong> est fourni par Anthropic. Nous ne
          l&apos;entraînons pas et tes données ne servent pas à l&apos;entraîner.
        </li>
        <li>
          <strong>Le système</strong> (questionnaire, consignes données au modèle,
          contrôles, écrans) est conçu et exploité par l&apos;éditeur de My Fitness App,
          identifié dans les mentions légales.
        </li>
        <li>
          <strong>Ton coach ou ta salle</strong> déploie ce système sous sa
          marque et reste ton interlocuteur professionnel. Il peut relire et
          corriger ce que l&apos;IA propose.
        </li>
      </ul>

      <h2>Ce que le système ne fait pas</h2>
      <ul>
        <li>Il ne pose aucun diagnostic et ne suit aucune pathologie.</li>
        <li>Il n&apos;est pas un dispositif médical.</li>
        <li>
          Il ne prend aucune décision produisant des effets juridiques à ton
          égard, et n&apos;évalue ni ta solvabilité, ni ton emploi, ni ton accès à
          un service essentiel.
        </li>
        <li>
          Il ne fait pas de reconnaissance d&apos;émotions ni de catégorisation
          biométrique. Les photos que tu envoies servent à reconnaître du matériel
          ou des aliments, jamais à t&apos;identifier.
        </li>
      </ul>

      <h2>Ses limites</h2>
      <p>
        Un modèle de langage peut produire une réponse plausible mais fausse,
        mal peser une contrainte physique que tu as déclarée, ou proposer une
        charge inadaptée. La qualité de la formulation n&apos;est pas une garantie
        d&apos;exactitude. Si une consigne te paraît douteuse ou douloureuse, ne la
        suis pas et parles-en à ton coach ou à un professionnel de santé.
      </p>

      <h2>Surveillance humaine et recours</h2>
      <p>
        Ton coach garde la main : il peut consulter ton programme, le corriger et
        le régénérer. Si un contenu généré te semble inadapté ou erroné, écris à
        ton coach, qui peut intervenir directement, ou à l&apos;éditeur via
        l&apos;adresse des mentions légales. Tu peux à tout moment cesser
        d&apos;utiliser le Coach IA sans perdre l&apos;accès à ton programme.
      </p>

      <h2>Données</h2>
      <p>
        Le traitement de tes données, y compris tes données de santé, est décrit
        dans la politique de confidentialité. Tes conversations et ton programme
        sont conservés pour assurer le suivi et peuvent être supprimés sur
        demande.
      </p>

      <h2>Ce que les professionnels doivent savoir</h2>
      <p className="muted">
        Rappel destiné aux coachs et aux salles qui déploient ce système, au
        titre de l&apos;obligation de littératie en IA (article 4, applicable depuis
        le 2 février 2025).
      </p>
      <ul>
        {AI_LITERACY_POINTS.map((p) => (
          <li key={p.titre}>
            <strong>{p.titre} :</strong> {p.texte}
          </li>
        ))}
      </ul>

      <p className="muted">
        Un revendeur ou un coach qui appose sa propre marque sur ce système peut
        être regardé comme fournisseur au sens du règlement et assumer des
        obligations propres. Ce point relève du contrat de revente et doit être
        validé par un juriste.
      </p>
    </>
  );
}
