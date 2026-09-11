import { PRODUCT_NAME } from "@/lib/config";
import { CONSENT_TEXT_VERSION, HEALTH_LABELS, RETENTION, SUBPROCESSORS } from "@/lib/gdpr";

export const metadata = { title: "Accord de sous-traitance, My Fitness App" };

// L'accord de l'article 28, entre la plateforme et le professionnel.
//
// POURQUOI IL MANQUAIT, ET POURQUOI C'EST LE PLUS IMPORTANT. L'application est
// vendue en marque blanche : c'est le COACH qui décide de traiter les données
// de ses clients, donc c'est lui le responsable du traitement, et la
// plateforme son sous-traitant. L'article 28.3 exige un contrat écrit entre
// les deux. Sans lui, le coach est en faute dès son premier client, sans
// même le savoir, et la plateforme avec lui.
//
// La page s'adresse au PROFESSIONNEL, pas au client final : c'est lui qui
// l'accepte en ouvrant son espace.

export default function SousTraitancePage() {
  return (
    <>
      <h1>Accord de sous-traitance</h1>
      <p className="muted">
        Version du {CONSENT_TEXT_VERSION}. Article 28 du règlement (UE) 2016/679. S&apos;applique
        entre l&apos;éditeur de {PRODUCT_NAME} et tout professionnel qui ouvre un espace.
      </p>

      <h2>Qui est qui</h2>
      <p>
        Tu es <strong>responsable du traitement</strong> des données de tes clients : tu décides de
        les accompagner, de ce que tu leur demandes et de l&apos;usage que tu en fais. L&apos;éditeur
        de {PRODUCT_NAME} est ton <strong>sous-traitant</strong> : il fournit l&apos;outil et ne
        traite ces données que sur tes instructions.
      </p>
      <p>
        Si tu passes par un revendeur, celui-ci est sous-traitant ultérieur pour ce qui le concerne,
        aux mêmes conditions. Tu restes le responsable devant tes clients.
      </p>

      <h2>Ce que l&apos;éditeur traite, et pour quoi faire</h2>
      <ul>
        <li>
          <strong>Objet.</strong> Héberger et faire fonctionner ton espace : comptes, questionnaires,
          programmes, nutrition, échanges avec le Coach IA, réservations, paiements.
        </li>
        <li>
          <strong>Durée.</strong> Tant que ton contrat dure, puis le temps de te restituer ou
          d&apos;effacer les données.
        </li>
        <li>
          <strong>Personnes concernées.</strong> Tes clients, tes prospects, et toi-même.
        </li>
        <li>
          <strong>Catégories de données.</strong> Identité, coordonnées, données de forme et de
          santé ({HEALTH_LABELS.join(", ")}), activité dans l&apos;application, données de
          facturation.
        </li>
      </ul>

      <h2>Les engagements de l&apos;éditeur</h2>
      <ol>
        <li>
          <strong>Agir sur instruction.</strong> Ne traiter les données que pour te fournir le
          service, jamais pour son propre compte, jamais pour les revendre, jamais pour entraîner un
          modèle.
        </li>
        <li>
          <strong>Confidentialité.</strong> N&apos;y donner accès qu&apos;aux personnes qui en ont
          besoin, tenues à la confidentialité.
        </li>
        <li>
          <strong>Sécurité (article 32).</strong> Cloisonnement par espace au niveau de la base,
          chiffrement en transit, secrets chiffrés au repos, fichiers privés servis par liens
          temporaires, journalisation des accès en assistance.
        </li>
        <li>
          <strong>Sous-traitants ultérieurs.</strong> Ceux listés ci-dessous, que tu autorises en
          acceptant le présent accord. Tout ajout t&apos;est annoncé avant sa mise en service, et tu
          peux t&apos;y opposer en résiliant.
        </li>
        <li>
          <strong>Aide sur les droits des personnes.</strong> L&apos;export complet et la suppression
          définitive sont disponibles dans l&apos;espace de chaque client : tu réponds à une demande
          d&apos;accès ou d&apos;effacement sans dépendre de personne.
        </li>
        <li>
          <strong>Violation de données (article 33).</strong> T&apos;alerter sans délai injustifié
          après en avoir pris connaissance, avec ce qu&apos;on sait, pour que tu puisses notifier la
          CNIL dans les 72 heures.
        </li>
        <li>
          <strong>Sort des données à la fin.</strong> À ton choix, restitution ou effacement, puis
          suppression des copies, sauf ce que la loi impose de garder.
        </li>
        <li>
          <strong>Audit.</strong> Mettre à ta disposition les informations nécessaires pour
          démontrer le respect de l&apos;article 28.
        </li>
      </ol>

      <h2>Tes engagements</h2>
      <ol>
        <li>
          Ne verser que des données que tu as le droit de traiter, et informer tes clients
          conformément à l&apos;article 13 (la{" "}
          <a href="/confidentialite">politique de confidentialité</a> de ton espace le fait pour toi,
          sous ton nom).
        </li>
        <li>
          Recueillir, pour les données de santé, le consentement explicite exigé par l&apos;article
          9. L&apos;application le demande à ta place au questionnaire, l&apos;horodate et en garde
          la preuve.
        </li>
        <li>
          Ne pas inscrire de personne de moins de 15 ans sans l&apos;accord du titulaire de
          l&apos;autorité parentale.
        </li>
        <li>
          N&apos;utiliser le mode assistance que pour aider le client concerné. Chaque entrée est
          journalisée pendant {RETENTION.supportLogMonths} mois.
        </li>
        <li>
          Tenir ton propre registre des traitements (article 30) et répondre aux demandes de tes
          clients dans le mois.
        </li>
      </ol>

      <h2>Sous-traitants ultérieurs autorisés</h2>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Rôle</th>
              <th>Traitement</th>
              <th>Transfert hors UE</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.role}</td>
                <td>{s.region}</td>
                <td>{s.transfer ?? "Aucun"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Quand tu apportes ta propre clé Anthropic ou ton propre serveur d&apos;envoi d&apos;e-mails,
        c&apos;est toi qui contractes avec ce fournisseur : il devient ton sous-traitant direct, et
        l&apos;éditeur n&apos;intervient pas dans cette relation.
      </p>

      <h2>Ce que cet accord ne règle pas</h2>
      <p>
        Il décrit ce que le logiciel fait réellement. Il ne remplace ni ton registre des traitements,
        ni l&apos;analyse d&apos;impact que tes volumes de données de santé peuvent rendre
        obligatoire (article 35), ni la désignation d&apos;un délégué à la protection des données si
        ton activité l&apos;impose. Fais-le relire par un juriste avant de l&apos;opposer à qui que
        ce soit.
      </p>
    </>
  );
}
