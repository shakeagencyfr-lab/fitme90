import { PRICE_EUR, GRACE_DAYS } from "@/lib/config";

export const metadata = { title: "Conditions générales de vente, My Fitness App" };

export default function CgvPage() {
  return (
    <>
      <h1>Conditions générales de vente</h1>
      <p className="muted">Dernière mise à jour : à compléter.</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGV encadrent la vente du programme My Fitness App : un programme
        d'entraînement et un accompagnement nutritionnel personnalisés sur toute la durée du programme,
        conçus par un coach professionnel diplômé d'État. Il s'agit d'un accompagnement
        sportif et de bien-être, sans visée médicale ni thérapeutique.
      </p>

      <h2>2. Prix et paiement</h2>
      <p>
        Le programme est vendu {PRICE_EUR} € TTC, en paiement unique, sans
        abonnement. Le paiement est opéré par Stripe. L'accès est débloqué après
        confirmation du paiement.
      </p>

      <h2>3. Durée d'accès</h2>
      <ul>
        <li>Coach IA et suivi actif : la durée de l'offre souscrite à compter de la génération du programme.</li>
        <li>Consultation du plan en lecture seule : {GRACE_DAYS} jours supplémentaires.</li>
        <li>Au-delà, l'accès prend fin. Un nouveau programme peut être commandé.</li>
      </ul>

      <h2>4. Droit de rétractation</h2>
      <p>
        Le programme étant un contenu numérique personnalisé fourni immédiatement, le
        client peut être invité à renoncer à son droit de rétractation lors de la
        génération. Les modalités exactes (délai de 14 jours, exceptions applicables
        aux contenus numériques) sont à préciser avec un juriste.
      </p>

      <h2>5. Exclusion médicale</h2>
      <p>
        My Fitness App s'adresse à des personnes en bonne santé. En cas de pathologie, de
        grossesse, de blessure ou de traitement déclaré, la génération est suspendue
        et un avis médical est requis. Le client s'engage à déclarer honnêtement son
        état de santé et à consulter un médecin en cas de doute.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        Le programme est une aide à l'entraînement et à l'hygiène alimentaire. Le
        client reste responsable de l'exécution des exercices dans de bonnes
        conditions de sécurité et de la vérification des ingrédients (notamment en
        cas d'allergie : le filtrage est une aide, pas une garantie). My Fitness App ne
        saurait être tenu responsable d'un usage contraire aux consignes ou d'une
        contre-indication non déclarée.
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la politique de confidentialité.
      </p>

      <h2>8. Droit applicable</h2>
      <p>
        Droit français. Médiation de la consommation et juridiction compétente à
        préciser.
      </p>
    </>
  );
}
