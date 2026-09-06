import { pick, type Locale, type LocalText } from "@/lib/i18n";
import { DE } from "./site-copy-de";
import type { PublicSite } from "@/lib/site";
import type { Audience } from "@/components/landing-templates/coach-copy";

// Tous les textes du mini-site, dans les deux langues. Les trois habillages ne
// diffèrent que par le DESIGN : ils lisent ce module et ne contiennent aucune
// phrase en dur.
//
// Le mini-site ne VEND pas, il PRÉSENTE. La landing /c/<slug> a déjà pour
// mission d'argumenter et de faire payer ; répéter ici son discours ferait
// deux pages qui se marchent dessus. Le site répond à ce qu'on cherche quand
// on tombe sur un professionnel : qui est-ce, que fait-il, où, quand, est-ce
// que les gens en sont contents. Les programmes en ligne arrivent en fin de
// parcours, une fois la confiance faite, et renvoient vers la landing.

export interface SiteCopy {
  navAbout: string;
  navServices: string;
  navPractical: string;
  navReviews: string;
  navPrograms: string;
  /** Repli d'accroche quand le coach n'a rien écrit. */
  defaultIntro: (name: string) => string;
  aboutChip: string;
  aboutTitle: string;
  servicesChip: string;
  servicesTitle: string;
  /** Prestations de repli, quand le coach n'en a saisi aucune. */
  defaultServices: { title: string; body: string }[];
  galleryChip: string;
  galleryTitle: string;
  practicalChip: string;
  practicalTitle: string;
  addressLabel: string;
  hoursLabel: string;
  phoneLabel: string;
  websiteLabel: string;
  itinerary: string;
  call: string;
  reviewsChip: string;
  reviewsTitle: string;
  reviewsOn: (n: number) => string;
  programsChip: string;
  /** Titre de repli de la section programmes. */
  defaultProgramsTitle: string;
  defaultProgramsText: (name: string) => string;
  programsBullets: string[];
  seePrograms: string;
  freeProgram: string;
  freeProgramBody: string;
  login: string;
  closed: string;
  legal: string;
}

const FR = (audience: Audience): SiteCopy => ({
  navAbout: "Le lieu",
  navServices: "Prestations",
  navPractical: "Infos pratiques",
  navReviews: "Avis",
  navPrograms: "Programmes en ligne",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} accueille ses adhérents toute la semaine : matériel complet, équipe présente sur le plateau, et un suivi qui continue en dehors de la salle.`
      : `${name} accompagne ses clients en séance et au quotidien : un plan qui tient compte de ton niveau, de ton matériel et de ton emploi du temps.`,
  aboutChip: audience === "gym" ? "La salle" : "Le coach",
  aboutTitle: audience === "gym" ? "Ce que tu trouves ici" : "Qui t'accompagne",
  servicesChip: "Prestations",
  servicesTitle: "Ce qui est proposé",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Accès libre", body: "Le plateau, les machines et les espaces libres aux horaires d'ouverture." },
          { title: "Cours collectifs", body: "Des séances encadrées en petit groupe, du renforcement au cardio." },
          { title: "Suivi personnalisé", body: "Un programme construit pour toi, ajusté au fil des semaines." },
        ]
      : [
          { title: "Séance individuelle", body: "Un rendez-vous en face à face, technique et progression corrigées en direct." },
          { title: "Suivi à distance", body: "Un programme construit pour toi, revu régulièrement selon tes résultats." },
          { title: "Bilan et objectifs", body: "Un point de départ mesuré, un cap clair, des étapes atteignables." },
        ],
  galleryChip: "En images",
  galleryTitle: "Le lieu en photos",
  practicalChip: "Infos pratiques",
  practicalTitle: "Où et quand",
  addressLabel: "Adresse",
  hoursLabel: "Horaires",
  phoneLabel: "Téléphone",
  websiteLabel: "Site",
  itinerary: "Itinéraire",
  call: "Appeler",
  reviewsChip: "Avis",
  reviewsTitle: "Ce qu'en disent les clients",
  reviewsOn: (n) => `${n} avis`,
  programsChip: "En ligne",
  defaultProgramsTitle: "Le suivi continue chez toi",
  defaultProgramsText: (name) =>
    `Entre deux séances, ${name} te suit dans une application : ton programme jour par jour, tes repas, tes charges, et un coach disponible quand tu en as besoin.`,
  programsBullets: [
    "Un programme construit sur ton objectif, ton niveau et ton matériel",
    "La nutrition qui va avec, recalculée au fil de tes résultats",
    "Tes séances enregistrées, tes charges suivies, ta progression visible",
  ],
  seePrograms: "Voir les programmes",
  freeProgram: "Essaie gratuitement",
  freeProgramBody: "Réponds à quelques questions et reçois un mini-programme personnalisé, sans engagement.",
  login: "Se connecter",
  closed: "Fermé",
  legal: "Mentions légales",
});

const EN = (audience: Audience): SiteCopy => ({
  navAbout: "The place",
  navServices: "Services",
  navPractical: "Visit us",
  navReviews: "Reviews",
  navPrograms: "Online programs",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} welcomes members all week: full equipment, staff on the floor, and coaching that carries on outside the gym.`
      : `${name} works with clients in session and day to day: a plan built around your level, your equipment and your schedule.`,
  aboutChip: audience === "gym" ? "The gym" : "The coach",
  aboutTitle: audience === "gym" ? "What you will find here" : "Who works with you",
  servicesChip: "Services",
  servicesTitle: "What is on offer",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Open access", body: "The floor, the machines and the open areas during opening hours." },
          { title: "Group classes", body: "Coached small-group sessions, from strength work to cardio." },
          { title: "Personal coaching", body: "A program built for you, adjusted week after week." },
        ]
      : [
          { title: "One-to-one session", body: "A face-to-face appointment, technique and progression corrected live." },
          { title: "Remote coaching", body: "A program built for you, reviewed regularly against your results." },
          { title: "Assessment and goals", body: "A measured starting point, a clear target, reachable steps." },
        ],
  galleryChip: "In pictures",
  galleryTitle: "A look inside",
  practicalChip: "Visit us",
  practicalTitle: "Where and when",
  addressLabel: "Address",
  hoursLabel: "Opening hours",
  phoneLabel: "Phone",
  websiteLabel: "Website",
  itinerary: "Directions",
  call: "Call",
  reviewsChip: "Reviews",
  reviewsTitle: "What clients say",
  reviewsOn: (n) => `${n} reviews`,
  programsChip: "Online",
  defaultProgramsTitle: "Coaching that follows you home",
  defaultProgramsText: (name) =>
    `Between sessions, ${name} coaches you through an app: your day-by-day program, your meals, your loads, and a coach on hand when you need one.`,
  programsBullets: [
    "A program built on your goal, your level and your equipment",
    "Matching nutrition, recalculated as your results come in",
    "Sessions logged, loads tracked, progress you can see",
  ],
  seePrograms: "See the programs",
  freeProgram: "Try it for free",
  freeProgramBody: "Answer a few questions and get a personalised mini program, no strings attached.",
  login: "Log in",
  closed: "Closed",
  legal: "Legal notice",
});

const COPIES: LocalText<(audience: Audience) => SiteCopy> = { fr: FR, en: EN, de: DE };

export function siteCopy(locale: Locale, audience: Audience): SiteCopy {
  return pick(COPIES, locale)(audience);
}

/**
 * Les prestations à afficher : celles du coach, ou les repli par défaut.
 *
 * Un site sans section « prestations » paraît inachevé, mais un coach qui
 * découvre son tableau de bord n'a encore rien saisi. Les textes de repli sont
 * volontairement génériques et vrais pour tout le monde, et le coach les
 * remplace en trois lignes.
 */
export function servicesOf(site: PublicSite, C: SiteCopy): { title: string; body: string }[] {
  return site.services.length > 0 ? site.services : C.defaultServices;
}

/** L'accroche du site : celle écrite par le coach, sinon la tagline, sinon un repli. */
export function introOf(site: PublicSite, C: SiteCopy): string {
  return site.intro || site.tenant.tagline || C.defaultIntro(site.tenant.name);
}
