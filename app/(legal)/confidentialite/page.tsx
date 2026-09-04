export const metadata = { title: "Politique de confidentialité, My Fitness App" };

export default function ConfidentialitePage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="muted">Dernière mise à jour : à compléter. Conforme au RGPD.</p>

      <h2>Responsable du traitement</h2>
      <p>[Exploitant de My Fitness App, voir mentions légales]. Contact : [e-mail].</p>

      <h2>Données collectées</h2>
      <ul>
        <li>Identité et compte : e-mail, mot de passe (chiffré), prénom.</li>
        <li>
          Données de santé et de forme : âge, sexe, poids, taille, fréquence
          cardiaque, pathologies déclarées, allergies, régime, blessures.
        </li>
        <li>Photos de la salle (reconnaissance du matériel).</li>
        <li>Journal des séances, mesures, conversations avec le coach.</li>
        <li>Données de paiement : gérées par Stripe (nous ne stockons aucune carte).</li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Générer et suivre ton programme d'entraînement et de nutrition.</li>
        <li>Fournir l'accompagnement du coach pendant la durée de ton programme.</li>
        <li>Gérer le paiement, le compte et le support.</li>
      </ul>

      <h2>Base légale</h2>
      <p>
        Exécution du contrat (fourniture du programme) et consentement explicite
        pour les données de santé, recueilli séparément et révocable à tout moment.
      </p>

      <h2>Décisions automatisées et intelligence artificielle</h2>
      <p>
        Ton programme, ton plan nutritionnel et les réponses du Coach IA sont
        produits automatiquement par un modèle de langage, sans relecture
        humaine préalable. Il ne s&apos;agit pas d&apos;une décision produisant des
        effets juridiques ou t&apos;affectant de manière significative au sens de
        l&apos;article 22 du RGPD : ton coach reste ton interlocuteur et peut
        corriger ce qui est proposé.
      </p>
      <p>
        Le détail du fonctionnement, des limites et des recours figure sur la
        page <a href="/ia">Transparence sur l&apos;IA</a>, établie au regard de
        l&apos;article 50 du règlement (UE) 2024/1689.
      </p>
      <p>
        Tes données ne servent pas à entraîner le modèle. Les contenus générés
        portent une mention visible et un marquage lisible par machine.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li>Vercel, hébergement de l'application (région UE, Paris).</li>
        <li>Supabase, base de données, authentification, stockage (région UE).</li>
        <li>Anthropic, génération du programme et coach (traitement à la demande).</li>
        <li>Stripe, paiement.</li>      </ul>
      <p className="muted">
        Vérifier les garanties de transfert hors UE (clauses contractuelles types) de
        chaque sous-traitant et compléter cette liste, à valider par un juriste.
      </p>

      <h2>Durées de conservation</h2>
      <p>
        Données conservées le temps de la relation, puis supprimées ou anonymisées
        [durées précises à compléter]. La suppression du compte purge immédiatement
        les lignes en base et les fichiers du bucket (photos).
      </p>

      <h2>Tes droits</h2>
      <ul>
        <li>Accès, rectification, effacement, portabilité, opposition, limitation.</li>
        <li>
          Export de tes données en JSON et suppression réelle du compte disponibles
          directement dans ton espace, onglet Profil.
        </li>
        <li>Réclamation auprès de la CNIL.</li>
      </ul>

      <h2>Sécurité</h2>
      <p>
        Cloisonnement par utilisateur (Row Level Security), fichiers privés et
        liens temporaires signés, secrets côté serveur uniquement, chiffrement en
        transit (HTTPS/HSTS).
      </p>
    </>
  );
}
