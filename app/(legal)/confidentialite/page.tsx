import { CONSENT_TEXT_VERSION, LEGAL_BASIS_LABEL, MIN_AGE, PERSONAL_TABLES, RETENTION, SUBPROCESSORS } from "@/lib/gdpr";

export const metadata = { title: "Politique de confidentialité, My Fitness App" };

// La politique de confidentialité, écrite DEPUIS le registre du code.
//
// Le tableau des données, les bases légales, les durées et la liste des
// sous-traitants sont lus dans lib/gdpr.ts. Autrement dit : cette page ne peut
// plus décrire un traitement qui n'existe pas, ni passer sous silence une
// table qu'on vient d'ajouter, parce qu'un test échoue avant.

export default function ConfidentialitePage() {
  const sante = PERSONAL_TABLES.filter((t) => t.health);
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="muted">Version du {CONSENT_TEXT_VERSION}. Règlement (UE) 2016/679 (RGPD).</p>

      <h2>Qui traite tes données, et à quel titre</h2>
      <p>
        L&apos;application est vendue en marque blanche : le professionnel dont tu vois le nom et les
        couleurs (ton coach ou ta salle) est le <strong>responsable du traitement</strong> de tes
        données. C&apos;est lui qui décide de t&apos;accompagner, de ce qu&apos;il te demande et de ce
        qu&apos;il en fait. Son identité et son contact figurent dans les{" "}
        <a href="/mentions-legales">mentions légales</a> de son espace.
      </p>
      <p>
        L&apos;éditeur de la plateforme agit comme <strong>sous-traitant</strong> au sens de
        l&apos;article 28 : il fournit l&apos;outil et n&apos;utilise tes données que sur instruction
        de ton professionnel, jamais pour son propre compte. Les conditions de cette sous-traitance
        sont décrites dans l&apos;<a href="/sous-traitance">accord de sous-traitance</a>.
      </p>
      <p>
        Pour exercer tes droits, écris à ton professionnel. S&apos;il ne répond pas, l&apos;éditeur
        peut être saisi et relaiera la demande.
      </p>

      <h2>Ce qui est collecté, pourquoi, et pour combien de temps</h2>
      <p>
        Le tableau ci-dessous est la liste complète. Il est tenu dans le code de
        l&apos;application, et un test de non-régression échoue si une catégorie de données venait à
        exister sans y figurer.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Donnée</th>
              <th>Pourquoi</th>
              <th>Base légale</th>
              <th>Conservation</th>
            </tr>
          </thead>
          <tbody>
            {PERSONAL_TABLES.map((t) => (
              <tr key={t.table}>
                <td>
                  <strong>{t.label}</strong>
                  {t.health ? <> (santé)</> : null}
                </td>
                <td>{t.purpose}</td>
                <td>{LEGAL_BASIS_LABEL[t.basis]}</td>
                <td>{t.retention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Autres durées : prospects du mini-programme gratuit, {RETENTION.prospectMonths} mois après le
        dernier contact. Journal technique des appels au modèle, {RETENTION.aiLogMonths} mois.
        Journal des accès en assistance, {RETENTION.supportLogMonths} mois.
      </p>

      <h2>Données de santé</h2>
      <p>
        L&apos;article 9 du RGPD interdit par principe de traiter des données de santé, sauf
        consentement explicite. Le questionnaire en recueille :{" "}
        {sante.map((t) => t.label.toLowerCase()).join(", ")}.
        Ton accord est demandé au moment précis où elles entrent en base, à la fin du questionnaire,
        et il est horodaté avec la version du texte que tu as lue.
      </p>
      <p>
        Tu peux le retirer à tout moment depuis ton profil. Le retirer met fin à la construction et à
        l&apos;adaptation de ton programme, puisque c&apos;est ce qu&apos;il autorise : ce n&apos;est
        pas une sanction, c&apos;est la conséquence directe.
      </p>

      <h2>Âge minimum</h2>
      <p>
        Il faut avoir {MIN_AGE} ans pour ouvrir un espace seul, conformément à l&apos;article 8 du
        RGPD tel qu&apos;appliqué en France. En dessous, l&apos;accord du titulaire de
        l&apos;autorité parentale est nécessaire : le professionnel inscrit alors la personne
        lui-même, après l&apos;avoir recueilli.
      </p>

      <h2>Décisions automatisées et intelligence artificielle</h2>
      <p>
        Ton programme, ton plan nutritionnel et les réponses du Coach IA sont produits
        automatiquement par un modèle de langage, sans relecture humaine préalable. Il ne
        s&apos;agit pas d&apos;une décision produisant des effets juridiques ou t&apos;affectant de
        manière significative au sens de l&apos;article 22 : ton coach reste ton interlocuteur et
        peut corriger ce qui est proposé.
      </p>
      <p>
        Le détail du fonctionnement, des limites et des recours figure sur la page{" "}
        <a href="/ia">Transparence sur l&apos;IA</a>, établie au regard de l&apos;article 50 du
        règlement (UE) 2024/1689. Tes données ne servent pas à entraîner le modèle. Les contenus
        générés portent une mention visible et un marquage lisible par machine.
      </p>

      <h2>Sous-traitants</h2>
      <p>Chaque service ci-dessous est réellement appelé par l&apos;application. Aucun autre ne l&apos;est.</p>
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

      <h2>Cookies et traceurs</h2>
      <p>
        L&apos;application ne pose <strong>aucun cookie publicitaire, aucun traceur et aucun outil de
        mesure d&apos;audience</strong>. Les seuls cookies déposés sont strictement nécessaires au
        service que tu demandes : ta session de connexion, la langue que tu as choisie, et le retour
        à son propre compte pour un professionnel entré en assistance.
      </p>
      <p>
        Ces cookies-là sont exemptés de consentement (article 82 de la loi Informatique et Libertés,
        recommandation de la CNIL). C&apos;est pourquoi tu ne vois pas de bandeau : il n&apos;y a
        rien à accepter ou à refuser.
      </p>

      <h2>Tes droits</h2>
      <ul>
        <li>
          <strong>Accès et portabilité.</strong> Depuis ton profil, « Exporter mes données » produit
          un fichier JSON contenant l&apos;intégralité de ton dossier, y compris les notes que ton
          coach a écrites à ton sujet et tes rendez-vous.
        </li>
        <li>
          <strong>Rectification.</strong> Tes informations et tes mesures se modifient dans ton
          espace. Pour le reste, demande à ton coach.
        </li>
        <li>
          <strong>Effacement.</strong> « Supprimer mon compte » efface immédiatement et
          définitivement le compte, les données et les fichiers. Seules les ventes restent, sans lien
          avec toi : la comptabilité de ton coach en a besoin, et la ligne ne te désigne plus.
        </li>
        <li>
          <strong>Retrait du consentement.</strong> À tout moment, depuis ton profil, sans que cela
          remette en cause ce qui a été fait avant.
        </li>
        <li>
          <strong>Opposition et limitation.</strong> Par demande à ton professionnel.
        </li>
        <li>
          <strong>Réclamation.</strong> Auprès de la CNIL, 3 place de Fontenoy, 75007 Paris, ou sur
          cnil.fr.
        </li>
      </ul>

      <h2>Sécurité</h2>
      <p>
        Cloisonnement par utilisateur et par espace professionnel (Row Level Security au niveau de la
        base), fichiers privés servis par liens temporaires signés, secrets chiffrés et détenus côté
        serveur uniquement, chiffrement en transit (HTTPS, HSTS). Les accès d&apos;un professionnel
        au compte d&apos;un de ses clients en mode assistance sont journalisés.
      </p>
      <p>
        En cas de violation de données susceptible d&apos;engendrer un risque pour tes droits, ton
        professionnel en est informé sans délai injustifié afin de pouvoir notifier la CNIL dans les
        72 heures, et toi-même lorsque le risque est élevé.
      </p>
    </>
  );
}
