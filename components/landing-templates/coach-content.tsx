// Contenu éditorial partagé des templates de landing coach->client (onyx, lumen).
// Textes + icônes centralisés ici pour que chaque template ne diffère que par le
// design, jamais par le fond. Les icônes sont des composants SVG (RSC-safe).

import { S } from "@/components/landing-icons";
import { programDaysForMonths, productFor, monthlyEquivalentCents } from "@/lib/config";
import type { Offer } from "@/lib/offers";

export function durationText(months: number): string {
  const label = months === 12 ? "1 an" : `${months} mois`;
  return `${label} · ${programDaysForMonths(months)} jours`;
}

/**
 * Ce que dit la carte d'une offre. Deux produits, deux discours : le 3 mois se
 * vend sur un résultat daté, le 12 mois sur un programme qui apprend du client.
 * Partagé par tous les templates pour que seul le design diffère.
 */
export interface OfferCardCopy {
  /** Petit libellé au-dessus du nom : la promesse, pas la durée. */
  eyebrow: string;
  /** Une phrase sous le nom, ce que le client comprend. */
  pitch: string | null;
  /** Arguments de la carte. */
  bullets: string[];
  /** Équivalent mensuel d'un prix unique (« soit 41 €/mois »), 0 si non pertinent. */
  perMonthCents: number;
  /** Carte à mettre en avant (le 12 mois, quand il y a le choix). */
  featured: boolean;
}

export function offerCardCopy(offer: Offer, offers: Offer[]): OfferCardCopy {
  const isSub = offer.billing_type === "subscription";
  const product = productFor(offer.duration_months);
  const base = product
    ? product.bullets
    : ["Programme conçu par ton coach", "Accompagnement nutritionnel", "Coach IA inclus"];
  const bullets = [
    ...base,
    ...(offer.vip_chat ? ["Chat VIP avec ton coach"] : []),
    "Espace client et suivi",
  ];
  const eyebrow = product
    ? `${product.months} mois · ${product.promise}`
    : isSub
      ? "Abonnement"
      : durationText(offer.duration_months);
  const perMonthCents =
    !isSub && offer.price_cents != null && offer.duration_months > 1
      ? monthlyEquivalentCents(offer.price_cents, offer.duration_months)
      : 0;
  // « Le plus choisi » : le 12 mois, seulement s'il y a une alternative à côté.
  const featured = offer.duration_months === 12 && offers.length >= 2;
  return { eyebrow, pitch: product?.pitch ?? null, bullets, perMonthCents, featured };
}

export const features = [
  { icon: S.dumbbell, title: "La méthode de ton coach", body: "Ton programme est bâti sur la méthode de ton coach : exercices, séries, charges et progressions, pensés par lui." },
  { icon: S.camera, title: "Analyse de ta salle", body: "Photographie tes machines : le plan n'utilise que le matériel réellement disponible." },
  { icon: S.shield, title: "100 % personnalisé", body: "Pathologies, allergies, régime, cadre religieux : chaque contrainte est prise en compte." },
  { icon: S.ai, title: "Amplifié par l'IA", body: "Ton coach s'appuie sur une IA qu'il a entraînée sur sa façon de travailler pour bâtir ton plan plus vite et plus finement." },
  { icon: S.heart, title: "Zones cardiaques précises", body: "Tes zones d'intensité calculées pour tirer le meilleur de chaque séance de cardio." },
  { icon: S.grid, title: "Espace client complet", body: "Séances interactives, calendrier, journal, courbe de poids : tout ton suivi au même endroit." },
  { icon: S.timer, title: "Outils d'entraînement", body: "Minuteur de repos intégré, journal série par série (kg × reps), progression et coches." },
  { icon: S.chat, title: "Un assistant formé par ton coach", body: "Un assistant disponible en continu, entraîné sur la méthode de ton coach. Il répond, motive et t'accompagne au quotidien." },
];

export const salleBullets = [
  "Haltères, barres, câbles, machines guidées",
  "Home-gym au matériel limité",
  "Salle communautaire ou hôtel",
  "Entraînement au poids du corps uniquement",
];

export const steps = [
  { k: "01", title: "Réponds au questionnaire", body: "Objectifs, niveau, disponibilités, santé, allergies et préférences alimentaires." },
  { k: "02", title: "Photographie ta salle", body: "Le système lit le matériel disponible pour adapter chaque exercice à ce que tu as." },
  { k: "03", title: "Suis ton programme", body: "Ton plan t'attend dans ton espace client, séance par séance, jour après jour." },
];

export const espaceBullets = [
  "Séances interactives",
  "Checklist des exercices",
  "Chronomètre & minuteur",
  "Nutrition du jour",
  "Suivi de progression",
  "Assistant IA en un tap",
];

export const nutritionBullets = [
  "Halal / casher",
  "Végétarien / végétalien",
  "Allergies personnalisées",
  "Intolérances (lactose, gluten…)",
  "Recettes par semaine",
  "Macros journaliers",
];

export const forWho = [
  { title: "Du débutant au confirmé", body: "Débutant, on installe la technique et l'habitude ; confirmé, on cherche la surcharge et la performance. Le programme se cale sur ton niveau." },
  { title: "Une contrainte de santé", body: "Écran santé au départ, exercices adaptés, validation médecin au besoin." },
  { title: "Allergies, végé, halal, casher", body: "Tes contraintes alimentaires respectées dans toute la nutrition." },
  { title: "Peu de temps", body: "Tu choisis tes jours ; les séances sont calibrées pour ta réalité." },
  { title: "Salle ou maison", body: "On n'utilise que ton matériel, où que tu t'entraînes." },
  { title: "Repris après une pause", body: "Le cycle d'adaptation te remet en route sans te cramer." },
];

export const faqs = [
  { q: "Faut-il une salle ou du matériel particulier ?", a: "Non. Tu photographies ce que tu as, salle complète, home-gym ou quelques haltères, et le programme se construit uniquement avec ce matériel." },
  { q: "Je suis débutant, est-ce adapté ?", a: "Oui. Le début du programme est dédié à la technique et à l'installation de l'habitude. On progresse ensuite graduellement." },
  { q: "Comment se passe le paiement ?", a: "Le paiement est sécurisé par Stripe, directement auprès de ton coach. Selon le programme choisi, c'est un paiement unique ou un abonnement (mensuel ou annuel), résiliable à tout moment depuis ton espace." },
  { q: "Qui conçoit vraiment le programme ?", a: "Ton coach. Le programme est bâti sur SA méthode ; il s'appuie sur une IA qu'il a entraînée sur sa façon de travailler. L'assistant IA prolonge cet accompagnement au quotidien, mais ne remplace pas ton coach ni un avis médical." },
  { q: "J'ai une blessure, une pathologie ou une grossesse ?", a: "Un écran santé au démarrage repère les situations à risque. Le programme est adapté ou mis en pause en attendant l'avis de ton médecin." },
  { q: "3 mois ou 12 mois, quelle différence ?", a: "Le 3 mois est un sprint avec une ligne d'arrivée : 3 cycles qui montent en intensité, pour un résultat visible en 12 semaines. Le 12 mois est un programme qui apprend de toi : 4 blocs de 3 mois, chacun reconstruit sur ce que tu as réellement fait dans le précédent, avec une orientation qui change en cours d'année (bases, volume, force, pic)." },
  { q: "Que se passe-t-il après le programme ?", a: "Le coach IA se désactive à la fin, mais ton plan reste consultable un moment de plus en lecture seule. Sur un 3 mois, ton coach te propose de continuer sur 12 mois en déduisant ce que tu as déjà payé." },
];
