import { pick, type Locale, type LocalText, type TFn } from "@/lib/i18n";
import { programDaysForMonths, monthlyEquivalentCents } from "@/lib/config";
import { productCopy } from "@/lib/i18n/products";
import type { Offer } from "@/lib/offers";
import { S } from "@/components/landing-icons";
import { DE, GYM_DE } from "./coach-copy-de";

// Tous les textes des landings pro->client (onyx, lumen, volt, sage) dans les
// deux langues. Les templates ne diffèrent que par le DESIGN : ils lisent ce
// module, et rien d'autre ne doit contenir de phrase de vente.
//
// Deux axes indépendants :
//   locale    fr | en | de | es | it | nl (anglais à défaut)
//   audience  coach | gym
//
// L'audience n'est pas un détail de vocabulaire. Un coach indépendant vend SA
// méthode et SA signature ; une salle vend son équipe, ses machines et la
// continuité entre la séance en salle et le reste de la semaine. Les deux
// promesses ne se disent pas avec les mêmes mots, d'où un jeu de remplacements
// complet plutôt qu'un simple « coach » -> « salle ».
//
// Règle de fond, valable pour les deux audiences : LE PROFESSIONNEL EST LE
// HÉROS. C'est le coach ou la salle qui conçoit les programmes. Le moteur IA
// est un outil spécialisé dans la transformation physique qu'il pilote ; sa
// plus-value est expliquée, jamais mise devant le pro.

export type Audience = "coach" | "gym";

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
  // La page de vente n'annonce QUE ce que le plan contient vraiment : le Coach
  // IA seulement en formule Max, le chat avec le coach seulement s'il est
  // inclus. Un plan Mini qui promettrait « Coach IA pendant 90 jours »
  // vendrait un accompagnement que l'app refuserait ensuite au client.
  const base = product ? product.bullets : [t("landing.bullets.coachProgram"), t("landing.bullets.nutrition")];
  const ai = product ? product.aiBullet : t("landing.bullets.ai");
  const bullets = [
    ...base,
    ...(offer.coach_ai ? [ai] : []),
    ...(offer.vip_chat ? [t("landing.bullets.vip")] : []),
    t("landing.bullets.space"),
  ];
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

export interface Feature { title: string; body: string }
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
  /** Libellés de la barre de navigation. Courts par obligation : un lien de
   *  vingt-cinq caractères en capitales espacées ecrase tout le reste. */
  navMethod: string;
  navPrograms: string;
  navFaq: string;
  /** Ce que contient vraiment le mini-programme. C'est ce niveau de detail qui
   *  decide si on laisse son adresse, pas la promesse generale. */
  leadPoints: string[];
  leadReassure: string;
  /** Qui signe le programme. Bloc mis en avant : c'est l'argument central. */
  authorChip: string;
  authorTitle: string;
  authorBody: string;
  authorPoints: Feature[];
  authorSignature: (name: string) => string;
  /** Ce que le moteur IA apporte, et ce qu'il n'est pas. */
  engineChip: string;
  engineTitle: string;
  engineBody: string;
  enginePoints: Feature[];
  engineLimit: string;
  /** Titre de la section des avis clients. */
  testimonialsTitle: string;
  leadChip: string;
  leadTitle: string;
  leadBody: string;
  leadCta: string;
  /** Bouton du héros vers le mini-programme offert. */
  heroLead: string;
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
  /** Bascule et mentions du paiement en N mensualités. */
  payOnce: string;
  payInstallments: (n: number) => string;
  perMonthTimes: (n: number) => string;
  autoStop: (n: number) => string;
  totalOver: (amount: string, n: number) => string;
  mockCoach: string;
  mockCoachSub: string;
  mockSession: string;
  mockDay: string;
}

const FR: Omit<LandingCopy, "features"> & { features: Feature[] } = {
  defaultTagline:
    "Un programme conçu par ton coach, selon sa méthode, adapté à ta salle et à tes contraintes, et suivi au quotidien. Assisté par un moteur d'IA spécialisé dans la transformation physique.",
  login: "Se connecter",
  seePrograms: "Voir les programmes",
  howItWorks: "Comment ça marche",
  heroChip: "Coaching personnalisé",
  heroChecks: ["Programme signé par ton coach", "Santé et allergies prises en compte", "Suivi au quotidien"],
  stats: [
    { v: "Ton coach", l: "conçoit ta méthode" },
    { v: "100 %", l: "adapté à ta salle & ta santé" },
    { v: "Moteur IA", l: "au service de sa méthode" },
    { v: "Sur mesure", l: "à l'unité ou en abonnement" },
  ],
  featuresChip: "Fonctionnalités",
  featuresTitle: "Tout ce qu'il faut pour réussir",
  features: [
    { title: "La méthode de ton coach", body: "Ton programme est bâti sur la méthode de ton coach : exercices, séries, charges et progressions, pensés par lui." },
    { title: "Analyse de ta salle", body: "Photographie tes machines : le plan n'utilise que le matériel réellement disponible." },
    { title: "100 % personnalisé", body: "Pathologies, allergies, régime, cadre religieux : chaque contrainte est prise en compte." },
    { title: "Un moteur, pas un pilote", body: "Ton coach garde la main sur chaque décision. Le moteur IA lui sert à appliquer sa méthode à ton cas sans rien laisser passer." },
    { title: "Zones cardiaques précises", body: "Tes zones d'intensité calculées pour tirer le meilleur de chaque séance de cardio." },
    { title: "Espace client complet", body: "Séances interactives, calendrier, journal alimentaire par scan de code-barres, courbe de poids : tout ton suivi au même endroit." },
    { title: "Outils d'entraînement", body: "Minuteur de repos intégré, journal série par série (kg × reps), progression et coches." },
    { title: "Un assistant formé par ton coach", body: "Un assistant disponible en continu, entraîné sur la méthode de ton coach. Il répond, motive et t'accompagne au quotidien." },
  ],
  gymChip: "Ta salle, ton matériel",
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
  nutritionBody: "Calories, macros, timing des repas et recettes adaptées. Tes allergies, intolérances et ton cadre religieux (halal, casher, végétarien…) pris en compte. Et pour savoir où tu en es : tu scannes le code-barres de ce que tu manges, les calories et les macros se remplissent tout seuls, face à ta cible du jour.",
  nutritionBullets: ["Scan de code-barres", "Journal du jour face à ta cible", "Halal / casher", "Végétarien / végétalien", "Allergies et intolérances", "Recettes par semaine"],
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
  authorChip: "Qui conçoit ton programme",
  authorTitle: "Ton coach écrit ton programme. Pas un robot.",
  authorBody:
    "Les exercices, l'ordre des séances, les charges de départ, la vitesse de progression : tout vient de la méthode de ton coach, de ce qu'il a appris sur le terrain avec ses clients. Rien n'est tiré d'un catalogue générique.",
  authorPoints: [
    { title: "Sa méthode, écrite noir sur blanc", body: "Ton coach a consigné sa façon de travailler : ses principes, ses exercices de prédilection, ses progressions, ce qu'il refuse de faire faire. Ton programme s'y conforme." },
    { title: "Ses choix, pas des moyennes", body: "Deux personnes avec le même objectif ne reçoivent pas le même plan. C'est le jugement de ton coach sur ton cas qui tranche." },
    { title: "Il reste joignable", body: "Un programme n'est pas un PDF qu'on t'envoie et qu'on oublie. Ton coach suit ce que tu fais et ajuste." },
  ],
  authorSignature: (name) => `Programmes signés ${name}`,
  engineChip: "Le moteur derrière",
  engineTitle: "Un moteur spécialisé dans la transformation physique.",
  engineBody:
    "Pour appliquer sa méthode à ton cas précis, ton coach s'appuie sur un moteur d'IA entraîné pour une seule chose : bâtir des plans d'entraînement et de nutrition. Ce n'est pas un assistant générique à qui on demande la météo.",
  enginePoints: [
    { title: "Ce qui prenait des heures prend des minutes", body: "Croiser ton objectif, ton niveau, tes jours disponibles, ton matériel, tes contraintes de santé et tes interdits alimentaires : le moteur fait ce travail d'assemblage pour que ton coach passe son temps sur les décisions, pas sur la mise en forme." },
    { title: "Rien n'est oublié en route", body: "Une allergie déclarée au questionnaire se retrouve dans chaque recette des douze semaines. Une épaule douloureuse écarte les exercices concernés dans tout le plan, pas seulement la première semaine." },
    { title: "Ton plan continue d'apprendre", body: "Les charges que tu notes, les séances que tu sautes, ton poids qui bouge : le bloc suivant est reconstruit sur ce que tu as réellement fait, pas sur ce qui était prévu." },
    { title: "Un interlocuteur à toute heure", body: "Le coach IA reprend la méthode de ton coach pour répondre à 23 h un dimanche, quand une machine est prise ou qu'un repas ne colle pas. Ton coach n'a pas à être debout pour ça." },
  ],
  engineLimit:
    "Le moteur ne décide pas à la place de ton coach : il applique sa méthode. Et il ne remplace ni un avis médical, ni le regard d'un professionnel sur ta technique.",
  navMethod: "La méthode",
  navPrograms: "Programmes",
  navFaq: "Questions",
  leadPoints: [
    "Une semaine complète, jour par jour",
    "Charges à viser et consignes techniques",
    "Nutrition chiffrée et liste de courses",
    "Tableau de suivi à imprimer",
  ],
  leadReassure: "Sans engagement, sans carte bancaire",
  testimonialsTitle: "Ce qu'en disent ses clients",
  leadChip: "Offert",
  leadTitle: "Ta première semaine, offerte",
  heroLead: "Ma première semaine, offerte",
  leadBody: "Un vrai plan à suivre, calibré sur ton objectif, ton niveau et ton matériel. Prêt à imprimer.",
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
  payOnce: "En 1 fois",
  payInstallments: (n) => `En ${n} fois`,
  perMonthTimes: (n) => `/mois × ${n}`,
  autoStop: (n) => `${n} paiements, puis plus rien : l'arrêt est automatique.`,
  totalOver: (amount, n) => `soit ${amount} au total sur ${n} mois`,
  mockCoach: "Coach IA",
  mockCoachSub: "répond en direct",
  mockSession: "Séance du jour",
  mockDay: "Jour 24",
};

const EN: Omit<LandingCopy, "features"> & { features: Feature[] } = {
  defaultTagline:
    "A program designed by your coach, on their method, adapted to your gym and your constraints, and followed day by day. Assisted by an AI engine built for physical transformation.",
  login: "Log in",
  seePrograms: "See the programs",
  howItWorks: "How it works",
  heroChip: "Personal coaching",
  heroChecks: ["Program signed by your coach", "Health and allergies accounted for", "Followed day by day"],
  stats: [
    { v: "Your coach", l: "designs your method" },
    { v: "100%", l: "adapted to your gym & your health" },
    { v: "AI engine", l: "serving their method" },
    { v: "Tailored", l: "one-off or subscription" },
  ],
  featuresChip: "Features",
  featuresTitle: "Everything you need to succeed",
  features: [
    { title: "Your coach's method", body: "Your program is built on your coach's method: exercises, sets, loads and progressions, designed by them." },
    { title: "Gym analysis", body: "Photograph your machines: the plan only uses the equipment you actually have." },
    { title: "100% personalised", body: "Conditions, allergies, diet, religious framework: every constraint is taken into account." },
    { title: "An engine, not a pilot", body: "Your coach keeps every decision. The AI engine is how they apply their method to your case without missing anything." },
    { title: "Precise heart-rate zones", body: "Your intensity zones calculated to get the most out of every cardio session." },
    { title: "Complete client space", body: "Interactive sessions, calendar, barcode-scan food log, weight curve: all your tracking in one place." },
    { title: "Training tools", body: "Built-in rest timer, set-by-set log (kg × reps), progress and checkmarks." },
    { title: "An assistant trained by your coach", body: "An assistant available around the clock, trained on your coach's method. It answers, motivates and supports you every day." },
  ],
  gymChip: "Your gym, your equipment",
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
  nutritionBody: "Calories, macros, meal timing and adapted recipes. Your allergies, intolerances and religious framework (halal, kosher, vegetarian…) taken into account. And to know where you stand: scan the barcode of what you eat, calories and macros fill in by themselves, against your target for the day.",
  nutritionBullets: ["Barcode scanning", "Daily log against your target", "Halal / kosher", "Vegetarian / vegan", "Allergies and intolerances", "Weekly recipes"],
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
  authorChip: "Who designs your program",
  authorTitle: "Your coach writes your program. Not a robot.",
  authorBody:
    "The exercises, the order of the sessions, the starting loads, the rate of progression: everything comes from your coach's method, from what they learned on the floor with their clients. Nothing is pulled from a generic catalogue.",
  authorPoints: [
    { title: "Their method, written down", body: "Your coach has recorded the way they work: their principles, their go-to exercises, their progressions, what they refuse to have you do. Your program follows it." },
    { title: "Their calls, not averages", body: "Two people with the same goal do not get the same plan. Your coach's judgement on your case is what decides." },
    { title: "They stay reachable", body: "A program is not a PDF you get sent and then forgotten. Your coach follows what you do and adjusts." },
  ],
  authorSignature: (name) => `Programs signed ${name}`,
  engineChip: "The engine behind it",
  engineTitle: "An engine built for one thing: physical transformation.",
  engineBody:
    "To apply their method to your specific case, your coach relies on an AI engine trained for a single purpose: building training and nutrition plans. It is not a general assistant you ask about the weather.",
  enginePoints: [
    { title: "What took hours takes minutes", body: "Cross-referencing your goal, your level, your available days, your equipment, your health constraints and your dietary rules: the engine does that assembly work so your coach spends their time on decisions, not on formatting." },
    { title: "Nothing gets lost on the way", body: "An allergy declared in the questionnaire shows up in every recipe across the twelve weeks. A painful shoulder removes the relevant exercises from the whole plan, not just the first week." },
    { title: "Your plan keeps learning", body: "The loads you log, the sessions you skip, your weight moving: the next block is rebuilt on what you actually did, not on what was planned." },
    { title: "Someone to ask at any hour", body: "The AI coach applies your coach's method to answer at 11 pm on a Sunday, when a machine is taken or a meal does not fit. Your coach does not have to be awake for that." },
  ],
  engineLimit:
    "The engine does not decide in your coach's place: it applies their method. And it replaces neither medical advice nor a professional's eye on your technique.",
  navMethod: "The method",
  navPrograms: "Programs",
  navFaq: "Questions",
  leadPoints: [
    "A full week, day by day",
    "Loads to aim for and technique cues",
    "Numbers-based nutrition and a shopping list",
    "A tracking table to print",
  ],
  leadReassure: "No commitment, no card",
  testimonialsTitle: "What their clients say",
  leadChip: "Free",
  leadTitle: "Your first week, on us",
  heroLead: "My first week, free",
  leadBody: "A real plan to follow, calibrated on your goal, your level and your equipment. Ready to print.",
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
  payOnce: "Pay once",
  payInstallments: (n) => `In ${n} payments`,
  perMonthTimes: (n) => `/month × ${n}`,
  autoStop: (n) => `${n} payments, then nothing more: it stops by itself.`,
  totalOver: (amount, n) => `that is ${amount} in total over ${n} months`,
  mockCoach: "AI coach",
  mockCoachSub: "replies live",
  mockSession: "Today's session",
  mockDay: "Day 24",
};

// ─────────────────────────────────────────────────────────────
// Variante SALLE.
//
// Une salle ne vend pas la même chose qu'un coach indépendant. Le coach vend
// sa signature ; la salle vend ce que l'adhérent vit déjà sur place et ce qui
// lui manque : savoir quoi faire en arrivant, et tenir entre deux visites.
// Le parc de machines devient un argument (elles sont DANS le programme parce
// que la salle sait exactement ce qu'elle possède), l'équipe de coachs devient
// l'auteur, et l'abandon au bout de six semaines devient le problème résolu.
//
// Seules les clés qui changent sont redéfinies ; le reste vient du socle.
// ─────────────────────────────────────────────────────────────
export type Overrides = Partial<Omit<LandingCopy, "features">> & { features?: Feature[] };

const GYM_FR: Overrides = {
  testimonialsTitle: "Ce qu'en disent ses adhérents",
  defaultTagline:
    "Un programme construit par l'équipe de ta salle, avec les machines qui sont ici, et qui te suit aussi les jours où tu ne viens pas. Assisté par un moteur spécialisé dans la transformation physique.",
  heroChip: "Programme inclus dans ton adhésion",
  heroChecks: ["Bâti sur le matériel de la salle", "Suivi par l'équipe", "Aussi les jours sans venir"],
  stats: [
    { v: "Notre équipe", l: "conçoit ton programme" },
    { v: "Nos machines", l: "celles que tu as sous la main" },
    { v: "7 j / 7", l: "un plan même hors de la salle" },
    { v: "Sans surcoût", l: "compris dans ton abonnement" },
  ],
  featuresTitle: "Ce que ton adhésion t'apporte en plus",
  features: [
    { title: "La méthode de la salle", body: "Nos coachs ont consigné leur façon de faire progresser : c'est elle qui construit ton plan, pas un modèle générique acheté ailleurs." },
    { title: "Nos machines, pas celles d'un catalogue", body: "Le parc de la salle est connu au poste près. Ton programme n'envoie jamais sur un appareil que nous n'avons pas, ni sur celui qui est toujours pris à 18 h." },
    { title: "Adapté à toi, pas au groupe", body: "Pathologies, allergies, régime, cadre religieux, horaires : ton plan tient compte de ta situation, pas de la moyenne des adhérents." },
    { title: "Un moteur, pas un pilote", body: "L'équipe garde la main sur chaque décision. Le moteur IA lui sert à appliquer sa méthode à chaque adhérent sans rien laisser passer." },
    { title: "Zones cardiaques précises", body: "Tes zones d'intensité calculées, pour que le cardio de la salle serve vraiment à quelque chose." },
    { title: "Ton espace membre", body: "Séances interactives, calendrier, journal de charges, journal alimentaire par scan de code-barres, courbe de poids : ce que tu fais ici et ailleurs, au même endroit." },
    { title: "Outils d'entraînement", body: "Minuteur de repos, journal série par série, progression visible : de quoi t'entraîner seul sans perdre le fil." },
    { title: "Un interlocuteur hors des heures d'ouverture", body: "Le coach IA reprend la méthode de la salle et répond quand l'accueil est fermé, en déplacement ou en vacances." },
  ],
  gymChip: "Notre parc",
  gymTitle: "Nos machines sont déjà dans ton programme.",
  gymBody:
    "Nous savons exactement ce que contient la salle. Ton plan est écrit avec ce matériel-là, et si tu t'entraînes ailleurs pendant une semaine, tu photographies l'endroit et le programme s'adapte.",
  gymBullets: ["Le plateau de charges libres", "Les machines guidées", "L'espace cardio", "Et ta salle de vacances, en photo"],
  spaceChip: "Espace membre",
  spaceTitle: "Ton programme te suit hors de la salle.",
  spaceBody:
    "La plupart des abandons arrivent les semaines où l'on ne vient pas. Ton espace membre te dit quoi faire ce jour-là, en salle ou ailleurs, et garde la trace de ce que tu as fait.",
  authorChip: "Qui conçoit ton programme",
  authorTitle: "Les coachs de la salle. Pas un robot.",
  authorBody:
    "Les exercices, l'ordre des séances, les charges de départ, la vitesse de progression : tout vient de la méthode de notre équipe, de ce qu'elle voit fonctionner ici, sur ce plateau, avec nos adhérents.",
  authorPoints: [
    { title: "Une méthode maison", body: "Nos coachs ont écrit leur façon de travailler : leurs principes, leurs exercices de référence, leurs progressions, ce qu'ils refusent de faire faire. Ton programme s'y conforme." },
    { title: "Des gens que tu peux croiser", body: "Ce ne sont pas des programmes achetés à un prestataire lointain. L'équipe qui les signe est celle que tu vois sur le plateau." },
    { title: "Un relais entre deux passages", body: "Ce qu'un coach t'a corrigé en séance se retrouve dans ton plan de la semaine, au lieu de se perdre." },
  ],
  authorSignature: (name) => `Programmes signés par l'équipe ${name}`,
  engineBody:
    "Pour appliquer sa méthode à chaque adhérent, l'équipe s'appuie sur un moteur d'IA entraîné pour une seule chose : bâtir des plans d'entraînement et de nutrition. Ce n'est pas un assistant générique à qui on demande la météo.",
  enginePoints: [
    { title: "Un plan sur mesure pour chaque adhérent", body: "Écrire à la main un programme personnalisé par membre serait impossible à l'échelle d'une salle. Le moteur rend la chose faisable sans tomber dans le programme photocopié." },
    { title: "Rien n'est oublié en route", body: "Une allergie déclarée à l'inscription se retrouve dans chaque recette des douze semaines. Une épaule douloureuse écarte les exercices concernés dans tout le plan." },
    { title: "Ton plan continue d'apprendre", body: "Les charges que tu notes, les séances que tu sautes, ton poids qui bouge : le bloc suivant est reconstruit sur ce que tu as réellement fait." },
    { title: "Disponible quand la salle est fermée", body: "Le coach IA reprend la méthode de l'équipe pour répondre à 23 h un dimanche, quand une machine est prise ou qu'un repas ne colle pas." },
  ],
  engineLimit:
    "Le moteur ne décide pas à la place de nos coachs : il applique leur méthode. Et il ne remplace ni un avis médical, ni le regard d'un coach sur ta technique.",
  stepsTitle: "3 étapes, dès aujourd'hui",
  steps: [
    { k: "01", title: "Réponds au questionnaire", body: "Objectifs, niveau, disponibilités, santé, allergies et préférences alimentaires. Dix minutes, une fois." },
    { k: "02", title: "Ton plan est bâti sur notre parc", body: "Le matériel de la salle est déjà connu. Tu photographies seulement si tu t'entraînes ailleurs." },
    { k: "03", title: "Entraîne-toi, ici et ailleurs", body: "Ton espace membre te dit quoi faire chaque jour, et note ce que tu fais." },
  ],
  forWhoTitle: "Pour quel adhérent ?",
  forWho: [
    { title: "Celui qui tourne en rond", body: "Tu viens régulièrement mais tu refais les mêmes machines depuis des mois. On te donne une progression écrite." },
    { title: "Celui qui vient d'arriver", body: "Tu ne sais pas par où commencer sur le plateau. Le plan te dit quoi faire, dans quel ordre, avec quelle charge." },
    { title: "Celui qui décroche l'hiver", body: "Les semaines où tu ne viens pas ne sont plus des semaines perdues : le plan te suit chez toi." },
    { title: "Celui qui a une contrainte de santé", body: "Écran santé au départ, exercices adaptés, validation médecin au besoin." },
    { title: "Celui qui voyage", body: "Une photo de la salle d'hôtel suffit pour adapter la semaine." },
    { title: "Celui qui veut de la nutrition", body: "Pas seulement l'entraînement : calories, macros et recettes qui tiennent compte de tes contraintes." },
  ],
  leadTitle: "Repars avec une semaine offerte",
  heroLead: "Une semaine offerte, pour commencer",
  leadBody: "Un vrai plan à suivre, calibré sur ton objectif et sur le matériel que tu as. Prêt à imprimer.",
  programsTitle: "Nos formules",
  finalTitle: "Ta salle. Ton programme. Dès la prochaine séance.",
  giftTitle: "Envie d'offrir ?",
  giftBody: "Offre un accompagnement à quelqu'un : tu paies, la personne reçoit un code à utiliser librement.",
};

const GYM_EN: Overrides = {
  testimonialsTitle: "What their members say",
  defaultTagline:
    "A program built by your gym's team, around the machines that are here, and that follows you on the days you do not come in. Assisted by an engine built for physical transformation.",
  heroChip: "Included in your membership",
  heroChecks: ["Built on the gym's equipment", "Followed by the team", "Also on the days you skip"],
  stats: [
    { v: "Our team", l: "designs your program" },
    { v: "Our machines", l: "the ones actually here" },
    { v: "7 days a week", l: "a plan even outside the gym" },
    { v: "No extra cost", l: "included in your membership" },
  ],
  featuresTitle: "What your membership adds",
  features: [
    { title: "The gym's method", body: "Our coaches wrote down how they make people progress: that is what builds your plan, not a generic template bought elsewhere." },
    { title: "Our machines, not a catalogue's", body: "We know our floor piece by piece. Your program never sends you to a machine we do not have, nor to the one that is always taken at 6 pm." },
    { title: "Fitted to you, not to the group", body: "Conditions, allergies, diet, religious framework, schedule: your plan accounts for your situation, not the average member's." },
    { title: "An engine, not a pilot", body: "The team keeps every decision. The AI engine is how they apply their method to each member without missing anything." },
    { title: "Precise heart-rate zones", body: "Your intensity zones calculated, so the cardio floor actually does something for you." },
    { title: "Your member space", body: "Interactive sessions, calendar, load log, barcode-scan food log, weight curve: what you do here and elsewhere, in one place." },
    { title: "Training tools", body: "Rest timer, set-by-set log, visible progress: enough to train alone without losing the thread." },
    { title: "Someone to ask outside opening hours", body: "The AI coach applies the gym's method and answers when the desk is closed, on the road or on holiday." },
  ],
  gymChip: "Our floor",
  gymTitle: "Our machines are already in your program.",
  gymBody:
    "We know exactly what the gym holds. Your plan is written with that equipment, and if you train elsewhere for a week, you photograph the place and the program adapts.",
  gymBullets: ["The free-weight floor", "The guided machines", "The cardio area", "And your holiday gym, from a photo"],
  spaceChip: "Member space",
  spaceTitle: "Your program follows you outside the gym.",
  spaceBody:
    "Most people drop out during the weeks they do not come in. Your member space tells you what to do that day, here or elsewhere, and keeps track of what you did.",
  authorChip: "Who designs your program",
  authorTitle: "The gym's coaches. Not a robot.",
  authorBody:
    "The exercises, the order of the sessions, the starting loads, the rate of progression: everything comes from our team's method, from what they see working here, on this floor, with our members.",
  authorPoints: [
    { title: "An in-house method", body: "Our coaches wrote down how they work: their principles, their reference exercises, their progressions, what they refuse to have you do. Your program follows it." },
    { title: "People you can actually meet", body: "These are not programs bought from a distant supplier. The team signing them is the one you see on the floor." },
    { title: "A relay between two visits", body: "What a coach corrected in a session shows up in your plan for the week, instead of being lost." },
  ],
  authorSignature: (name) => `Programs signed by the ${name} team`,
  engineBody:
    "To apply their method to every member, the team relies on an AI engine trained for a single purpose: building training and nutrition plans. It is not a general assistant you ask about the weather.",
  enginePoints: [
    { title: "A tailored plan for every member", body: "Hand-writing a personal program per member would be impossible at a gym's scale. The engine makes it feasible without falling back on the photocopied program." },
    { title: "Nothing gets lost on the way", body: "An allergy declared at sign-up shows up in every recipe across the twelve weeks. A painful shoulder removes the relevant exercises from the whole plan." },
    { title: "Your plan keeps learning", body: "The loads you log, the sessions you skip, your weight moving: the next block is rebuilt on what you actually did." },
    { title: "Available when the gym is closed", body: "The AI coach applies the team's method to answer at 11 pm on a Sunday, when a machine is taken or a meal does not fit." },
  ],
  engineLimit:
    "The engine does not decide in our coaches' place: it applies their method. And it replaces neither medical advice nor a coach's eye on your technique.",
  stepsTitle: "3 steps, starting today",
  steps: [
    { k: "01", title: "Answer the questionnaire", body: "Goals, level, availability, health, allergies and food preferences. Ten minutes, once." },
    { k: "02", title: "Your plan is built on our floor", body: "The gym's equipment is already known. You only photograph if you train elsewhere." },
    { k: "03", title: "Train, here and elsewhere", body: "Your member space tells you what to do each day, and logs what you did." },
  ],
  forWhoTitle: "Which member is it for?",
  forWho: [
    { title: "The one going in circles", body: "You come in regularly but you have been doing the same machines for months. We give you a written progression." },
    { title: "The one who just joined", body: "You do not know where to start on the floor. The plan tells you what to do, in which order, with which load." },
    { title: "The one who drops off in winter", body: "The weeks you do not come in are no longer lost weeks: the plan follows you home." },
    { title: "The one with a health constraint", body: "Health screening at the start, adapted exercises, doctor's approval when needed." },
    { title: "The one who travels", body: "A photo of the hotel gym is enough to adapt the week." },
    { title: "The one who wants nutrition too", body: "Not just training: calories, macros and recipes that respect your constraints." },
  ],
  leadTitle: "Leave with a free week",
  heroLead: "A free week, to start",
  leadBody: "A real plan to follow, calibrated on your goal and on the equipment you have. Ready to print.",
  programsTitle: "Our plans",
  finalTitle: "Your gym. Your program. From the next session.",
  giftTitle: "Want to gift it?",
  giftBody: "Gift coaching to someone: you pay, they receive a code to use freely.",
};

const BASES: LocalText<typeof FR> = { fr: FR, en: EN, de: DE };
const GYMS: LocalText<Overrides> = { fr: GYM_FR, en: GYM_EN, de: GYM_DE };

export function landingCopy(locale: Locale, audience: Audience = "coach"): LandingCopy {
  const base = pick(BASES, locale);
  const over = audience === "gym" ? pick(GYMS, locale) : null;
  const merged = over ? { ...base, ...over } : base;
  // Les icônes sont posées APRÈS la fusion : une variante qui redéfinit
  // `features` fournit du texte, jamais des icônes, et l'ordre reste le même.
  const features = (over?.features ?? base.features).map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }));
  return { ...merged, features } as LandingCopy;
}
