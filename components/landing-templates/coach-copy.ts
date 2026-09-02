import type { Locale, TFn } from "@/lib/i18n";
import { programDaysForMonths, monthlyEquivalentCents } from "@/lib/config";
import { productCopy } from "@/lib/i18n/products";
import type { Offer } from "@/lib/offers";
import { S } from "@/components/landing-icons";

// Tous les textes des landings coach->client (onyx, lumen…) dans les deux
// langues. Les templates ne diffèrent que par le design : ils lisent ce module.

export interface OfferCardCopy {
  eyebrow: string;
  pitch: string | null;
  bullets: string[];
  perMonthCents: number;
  featured: boolean;
}

export function durationText(months: number, t: TFn): string {
  const label = months === 12 ? t("common.year") : t("products.monthsShort", { n: months });
  return `${label} · ${programDaysForMonths(months)} ${t("common.days")}`;
}

export function offerCardCopy(offer: Offer, offers: Offer[], t: TFn): OfferCardCopy {
  const isSub = offer.billing_type === "subscription";
  const product = productCopy(offer.duration_months, t);
  const base = product ? product.bullets : [t("landing.bullets.coachProgram"), t("landing.bullets.nutrition"), t("landing.bullets.ai")];
  const bullets = [...base, ...(offer.vip_chat ? [t("landing.bullets.vip")] : []), t("landing.bullets.space")];
  const eyebrow = product
    ? `${t("products.monthsShort", { n: offer.duration_months })} · ${product.promise}`
    : isSub
      ? t("landing.subscription")
      : durationText(offer.duration_months, t);
  const perMonthCents =
    !isSub && offer.price_cents != null && offer.duration_months > 1
      ? monthlyEquivalentCents(offer.price_cents, offer.duration_months)
      : 0;
  const featured = offer.duration_months === 12 && offers.length >= 2;
  return { eyebrow, pitch: product?.pitch ?? null, bullets, perMonthCents, featured };
}

interface Feature { title: string; body: string }
type IconFeature = Feature & { icon: (typeof S)[keyof typeof S] };
const FEATURE_ICONS = [S.dumbbell, S.camera, S.shield, S.ai, S.heart, S.grid, S.timer, S.chat];
interface Step { k: string; title: string; body: string }
interface Faq { q: string; a: string }
interface Stat { v: string; l: string }

export interface LandingCopy {
  defaultTagline: string;
  login: string;
  seePrograms: string;
  howItWorks: string;
  heroChip: string;
  heroChecks: string[];
  stats: Stat[];
  featuresChip: string;
  featuresTitle: string;
  features: IconFeature[];
  gymChip: string;
  gymTitle: string;
  gymBody: string;
  gymBullets: string[];
  gymScanLabel: string;
  spaceChip: string;
  spaceTitle: string;
  spaceBody: string;
  spaceBullets: string[];
  nutritionChip: string;
  nutritionTitle: string;
  nutritionBody: string;
  nutritionBullets: string[];
  stepsTitle: string;
  steps: Step[];
  forWhoTitle: string;
  forWho: Feature[];
  aboutChip: string;
  leadChip: string;
  leadTitle: string;
  leadBody: string;
  leadCta: string;
  programsChip: string;
  programsTitle: string;
  noOffer: string;
  giftTitle: string;
  giftBody: string;
  giftCta: string;
  faqChip: string;
  faqTitle: string;
  faqs: Faq[];
  finalTitle: string;
  legalNote: string;
  footerLogin: string;
  footerLegal: string;
  footerPrivacy: string;
  footerTerms: string;
  poweredBy: string;
  mostChosen: string;
  oneTime: string;
  perMonthOn: (amount: string, months: number) => string;
  choose: string;
  soon: string;
  mockCoach: string;
  mockCoachSub: string;
  mockSession: string;
  mockDay: string;
}

const FR: Omit<LandingCopy, "features"> & { features: Feature[] } = {
  defaultTagline:
    "Un programme conçu selon la méthode de ton coach, adapté à ta salle et à tes contraintes, et suivi au quotidien. Amplifié par une IA qu'il a entraînée sur sa façon de travailler.",
  login: "Se connecter",
  seePrograms: "Voir les programmes",
  howItWorks: "Comment ça marche",
  heroChip: "Coaching personnalisé",
  heroChecks: ["Santé prise en compte", "Allergies & régimes", "Coach IA inclus"],
  stats: [
    { v: "Ton coach", l: "conçoit ta méthode" },
    { v: "100 %", l: "adapté à ta salle & ta santé" },
    { v: "Assistant IA", l: "formé par ton coach, inclus" },
    { v: "Sur mesure", l: "à l'unité ou en abonnement" },
  ],
  featuresChip: "Fonctionnalités",
  featuresTitle: "Tout ce qu'il faut pour réussir",
  features: [
    { title: "La méthode de ton coach", body: "Ton programme est bâti sur la méthode de ton coach : exercices, séries, charges et progressions, pensés par lui." },
    { title: "Analyse de ta salle", body: "Photographie tes machines : le plan n'utilise que le matériel réellement disponible." },
    { title: "100 % personnalisé", body: "Pathologies, allergies, régime, cadre religieux : chaque contrainte est prise en compte." },
    { title: "Amplifié par l'IA", body: "Ton coach s'appuie sur une IA qu'il a entraînée sur sa façon de travailler pour bâtir ton plan plus vite et plus finement." },
    { title: "Zones cardiaques précises", body: "Tes zones d'intensité calculées pour tirer le meilleur de chaque séance de cardio." },
    { title: "Espace client complet", body: "Séances interactives, calendrier, journal, courbe de poids : tout ton suivi au même endroit." },
    { title: "Outils d'entraînement", body: "Minuteur de repos intégré, journal série par série (kg × reps), progression et coches." },
    { title: "Un assistant formé par ton coach", body: "Un assistant disponible en continu, entraîné sur la méthode de ton coach. Il répond, motive et t'accompagne au quotidien." },
  ],
  gymChip: "Analyse IA de ta salle",
  gymTitle: "Ta salle analysée. Ton programme adapté.",
  gymBody: "Photographie ta salle : l'IA identifie le matériel disponible et s'assure que chaque exercice de ton programme est réalisable avec ce que tu as.",
  gymBullets: ["Haltères, barres, câbles, machines guidées", "Home-gym au matériel limité", "Salle communautaire ou hôtel", "Entraînement au poids du corps uniquement"],
  gymScanLabel: "IA en cours d'analyse, matériel détecté",
  spaceChip: "Espace client",
  spaceTitle: "Ton programme, vivant au quotidien.",
  spaceBody: "Plus qu'un document, ton programme est interactif. Coche tes exercices, lance ton chronomètre, consulte ta nutrition et dialogue avec ton coach IA.",
  spaceBullets: ["Séances interactives", "Checklist des exercices", "Chronomètre & minuteur", "Nutrition du jour", "Suivi de progression", "Assistant IA en un tap"],
  nutritionChip: "Nutrition",
  nutritionTitle: "Une nutrition aussi précise que ton entraînement.",
  nutritionBody: "Calories, macros, timing des repas et recettes adaptées. Tes allergies, intolérances et ton cadre religieux (halal, casher, végétarien…) pris en compte.",
  nutritionBullets: ["Halal / casher", "Végétarien / végétalien", "Allergies personnalisées", "Intolérances (lactose, gluten…)", "Recettes par semaine", "Macros journaliers"],
  stepsTitle: "3 étapes vers ta transformation",
  steps: [
    { k: "01", title: "Réponds au questionnaire", body: "Objectifs, niveau, disponibilités, santé, allergies et préférences alimentaires." },
    { k: "02", title: "Photographie ta salle", body: "Le système lit le matériel disponible pour adapter chaque exercice à ce que tu as." },
    { k: "03", title: "Suis ton programme", body: "Ton plan t'attend dans ton espace client, séance par séance, jour après jour." },
  ],
  forWhoTitle: "Est-ce pour toi ?",
  forWho: [
    { title: "Du débutant au confirmé", body: "Débutant, on installe la technique et l'habitude ; confirmé, on cherche la surcharge et la performance. Le programme se cale sur ton niveau." },
    { title: "Une contrainte de santé", body: "Écran santé au départ, exercices adaptés, validation médecin au besoin." },
    { title: "Allergies, végé, halal, casher", body: "Tes contraintes alimentaires respectées dans toute la nutrition." },
    { title: "Peu de temps", body: "Tu choisis tes jours ; les séances sont calibrées pour ta réalité." },
    { title: "Salle ou maison", body: "On n'utilise que ton matériel, où que tu t'entraînes." },
    { title: "Repris après une pause", body: "Le cycle d'adaptation te remet en route sans te cramer." },
  ],
  aboutChip: "À propos",
  leadChip: "Offert",
  leadTitle: "Pas encore décidé ? Reçois ton mini-programme gratuit",
  leadBody: "Une semaine d'entraînement calibrée pour toi, à télécharger en PDF. Sans engagement.",
  leadCta: "Recevoir mon programme",
  programsChip: "Programmes",
  programsTitle: "Choisis ton programme",
  noOffer: "Aucune offre disponible pour le moment. Reviens bientôt.",
  giftTitle: "Envie de faire plaisir ?",
  giftBody: "Offre un programme à quelqu'un : tu paies, la personne reçoit un code à utiliser librement.",
  giftCta: "Je veux offrir un programme",
  faqChip: "FAQ",
  faqTitle: "Questions fréquentes",
  faqs: [
    { q: "Faut-il une salle ou du matériel particulier ?", a: "Non. Tu photographies ce que tu as, salle complète, home-gym ou quelques haltères, et le programme se construit uniquement avec ce matériel." },
    { q: "Je suis débutant, est-ce adapté ?", a: "Oui. Le début du programme est dédié à la technique et à l'installation de l'habitude. On progresse ensuite graduellement." },
    { q: "Comment se passe le paiement ?", a: "Le paiement est sécurisé par Stripe, directement auprès de ton coach. Selon le programme choisi, c'est un paiement unique ou un abonnement (mensuel ou annuel), résiliable à tout moment depuis ton espace." },
    { q: "Qui conçoit vraiment le programme ?", a: "Ton coach. Le programme est bâti sur SA méthode ; il s'appuie sur une IA qu'il a entraînée sur sa façon de travailler. L'assistant IA prolonge cet accompagnement au quotidien, mais ne remplace pas ton coach ni un avis médical." },
    { q: "J'ai une blessure, une pathologie ou une grossesse ?", a: "Un écran santé au démarrage repère les situations à risque. Le programme est adapté ou mis en pause en attendant l'avis de ton médecin." },
    { q: "3 mois ou 12 mois, quelle différence ?", a: "Le 3 mois est un sprint avec une ligne d'arrivée : 3 cycles qui montent en intensité, pour un résultat visible en 12 semaines. Le 12 mois est un programme qui apprend de toi : 4 blocs de 3 mois, chacun reconstruit sur ce que tu as réellement fait dans le précédent, avec une orientation qui change en cours d'année (bases, volume, force, pic)." },
    { q: "Que se passe-t-il après le programme ?", a: "Le coach IA se désactive à la fin, mais ton plan reste consultable un moment de plus en lecture seule. Sur un 3 mois, ton coach te propose de continuer sur 12 mois en déduisant ce que tu as déjà payé." },
  ],
  finalTitle: "Ta transformation commence aujourd'hui.",
  legalNote: "Accompagnement sportif et de bien-être, sans visée thérapeutique. L'accompagnement nutritionnel est une aide au choix des repas, pas une prescription diététique. Ne remplace pas un avis médical.",
  footerLogin: "Connexion",
  footerLegal: "Mentions légales",
  footerPrivacy: "Confidentialité",
  footerTerms: "CGV",
  poweredBy: "Propulsé par",
  mostChosen: "Le plus choisi",
  oneTime: "paiement unique",
  perMonthOn: (amount, months) => `soit ${amount}/mois sur ${months} mois`,
  choose: "Choisir ce programme",
  soon: "Bientôt disponible",
  mockCoach: "Coach IA",
  mockCoachSub: "répond en direct",
  mockSession: "Séance du jour",
  mockDay: "Jour 24",
};

const EN: Omit<LandingCopy, "features"> & { features: Feature[] } = {
  defaultTagline:
    "A program built on your coach's method, adapted to your gym and your constraints, and followed day by day. Amplified by an AI trained on the way your coach works.",
  login: "Log in",
  seePrograms: "See the programs",
  howItWorks: "How it works",
  heroChip: "Personal coaching",
  heroChecks: ["Health taken into account", "Allergies & diets", "AI coach included"],
  stats: [
    { v: "Your coach", l: "designs your method" },
    { v: "100%", l: "adapted to your gym & your health" },
    { v: "AI assistant", l: "trained by your coach, included" },
    { v: "Tailored", l: "one-off or subscription" },
  ],
  featuresChip: "Features",
  featuresTitle: "Everything you need to succeed",
  features: [
    { title: "Your coach's method", body: "Your program is built on your coach's method: exercises, sets, loads and progressions, designed by them." },
    { title: "Gym analysis", body: "Photograph your machines: the plan only uses the equipment you actually have." },
    { title: "100% personalised", body: "Conditions, allergies, diet, religious framework: every constraint is taken into account." },
    { title: "Amplified by AI", body: "Your coach relies on an AI trained on the way they work to build your plan faster and finer." },
    { title: "Precise heart-rate zones", body: "Your intensity zones calculated to get the most out of every cardio session." },
    { title: "Complete client space", body: "Interactive sessions, calendar, log, weight curve: all your tracking in one place." },
    { title: "Training tools", body: "Built-in rest timer, set-by-set log (kg × reps), progress and checkmarks." },
    { title: "An assistant trained by your coach", body: "An assistant available around the clock, trained on your coach's method. It answers, motivates and supports you every day." },
  ],
  gymChip: "AI analysis of your gym",
  gymTitle: "Your gym analysed. Your program adapted.",
  gymBody: "Photograph your gym: the AI identifies the available equipment and makes sure every exercise in your program can be done with what you have.",
  gymBullets: ["Dumbbells, bars, cables, guided machines", "Home gym with limited equipment", "Community or hotel gym", "Bodyweight-only training"],
  gymScanLabel: "AI analysing, equipment detected",
  spaceChip: "Client space",
  spaceTitle: "Your program, alive every day.",
  spaceBody: "More than a document, your program is interactive. Tick your exercises, start your timer, check your nutrition and chat with your AI coach.",
  spaceBullets: ["Interactive sessions", "Exercise checklist", "Stopwatch & timer", "Today's nutrition", "Progress tracking", "AI assistant in one tap"],
  nutritionChip: "Nutrition",
  nutritionTitle: "Nutrition as precise as your training.",
  nutritionBody: "Calories, macros, meal timing and adapted recipes. Your allergies, intolerances and religious framework (halal, kosher, vegetarian…) taken into account.",
  nutritionBullets: ["Halal / kosher", "Vegetarian / vegan", "Custom allergies", "Intolerances (lactose, gluten…)", "Weekly recipes", "Daily macros"],
  stepsTitle: "3 steps to your transformation",
  steps: [
    { k: "01", title: "Answer the questionnaire", body: "Goals, level, availability, health, allergies and food preferences." },
    { k: "02", title: "Photograph your gym", body: "The system reads the available equipment to adapt every exercise to what you have." },
    { k: "03", title: "Follow your program", body: "Your plan is waiting in your client space, session by session, day after day." },
  ],
  forWhoTitle: "Is it for you?",
  forWho: [
    { title: "From beginner to advanced", body: "Beginner: we build technique and the habit; advanced: we chase overload and performance. The program fits your level." },
    { title: "A health constraint", body: "Health screening at the start, adapted exercises, doctor's approval when needed." },
    { title: "Allergies, veggie, halal, kosher", body: "Your dietary constraints respected throughout the nutrition." },
    { title: "Little time", body: "You choose your days; sessions are calibrated to your reality." },
    { title: "Gym or home", body: "We only use your equipment, wherever you train." },
    { title: "Back after a break", body: "The adaptation cycle gets you going again without burning you out." },
  ],
  aboutChip: "About",
  leadChip: "Free",
  leadTitle: "Not decided yet? Get your free mini-program",
  leadBody: "A week of training calibrated for you, to download as a PDF. No commitment.",
  leadCta: "Get my program",
  programsChip: "Programs",
  programsTitle: "Choose your program",
  noOffer: "No offer available right now. Come back soon.",
  giftTitle: "Want to treat someone?",
  giftBody: "Gift a program: you pay, they receive a code to use freely.",
  giftCta: "I want to gift a program",
  faqChip: "FAQ",
  faqTitle: "Frequently asked questions",
  faqs: [
    { q: "Do I need a gym or specific equipment?", a: "No. You photograph what you have, a full gym, a home gym or a few dumbbells, and the program is built only with that equipment." },
    { q: "I am a beginner, is it suitable?", a: "Yes. The start of the program is dedicated to technique and building the habit. Then we progress gradually." },
    { q: "How does payment work?", a: "Payment is secured by Stripe, directly with your coach. Depending on the program, it is a one-off payment or a subscription (monthly or yearly), cancellable at any time from your space." },
    { q: "Who really designs the program?", a: "Your coach. The program is built on THEIR method; they rely on an AI trained on the way they work. The AI assistant extends this support every day, but does not replace your coach or medical advice." },
    { q: "I have an injury, a condition or I am pregnant?", a: "A health screen at the start spots risky situations. The program is adapted or paused pending your doctor's advice." },
    { q: "3 months or 12 months, what is the difference?", a: "The 3-month is a sprint with a finish line: 3 cycles ramping up in intensity, for a visible result in 12 weeks. The 12-month is a program that learns from you: 4 blocks of 3 months, each rebuilt on what you actually did in the previous one, with a focus that changes through the year (foundations, volume, strength, peak)." },
    { q: "What happens after the program?", a: "The AI coach switches off at the end, but your plan stays viewable for a while in read-only mode. On a 3-month, your coach offers to continue on 12 months, deducting what you already paid." },
  ],
  finalTitle: "Your transformation starts today.",
  legalNote: "Sports and wellness coaching, not therapeutic. Nutrition coaching helps you choose meals; it is not a dietary prescription and does not replace medical advice.",
  footerLogin: "Log in",
  footerLegal: "Legal notice",
  footerPrivacy: "Privacy",
  footerTerms: "Terms",
  poweredBy: "Powered by",
  mostChosen: "Most popular",
  oneTime: "one-off payment",
  perMonthOn: (amount, months) => `that is ${amount}/month over ${months} months`,
  choose: "Choose this program",
  soon: "Coming soon",
  mockCoach: "AI coach",
  mockCoachSub: "replies live",
  mockSession: "Today's session",
  mockDay: "Day 24",
};

export function landingCopy(locale: Locale): LandingCopy {
  const base = locale === "en" ? EN : FR;
  return { ...base, features: base.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] })) };
}
