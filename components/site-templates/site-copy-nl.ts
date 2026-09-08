import type { Audience } from "@/components/landing-templates/coach-copy";
import type { SiteCopy } from "./site-copy";

// Textes du mini-site de présentation, en néerlandais.
export const NL = (audience: Audience): SiteCopy => ({
  navAbout: "De plek",
  navServices: "Diensten",
  navPractical: "Praktische info",
  navReviews: "Beoordelingen",
  navPrograms: "Online programma's",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} ontvangt zijn leden de hele week: volledig materiaal, een team dat in de zaal staat, en begeleiding die ook buiten de sportschool doorloopt.`
      : `${name} begeleidt zijn klanten tijdens de training en daarbuiten: een plan dat rekening houdt met je niveau, je materiaal en je agenda.`,
  aboutChip: audience === "gym" ? "De sportschool" : "De coach",
  aboutTitle: audience === "gym" ? "Wat je hier vindt" : "Wie je begeleidt",
  servicesChip: "Diensten",
  servicesTitle: "Wat er wordt aangeboden",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Vrije toegang", body: "De zaal, de machines en de vrije ruimtes tijdens de openingstijden." },
          { title: "Groepslessen", body: "Begeleide trainingen in kleine groep, van krachttraining tot cardio." },
          { title: "Persoonlijke begeleiding", body: "Een programma gebouwd voor jou, week na week bijgesteld." },
        ]
      : [
          { title: "Individuele training", body: "Een afspraak onder vier ogen, techniek en progressie ter plekke bijgestuurd." },
          { title: "Begeleiding op afstand", body: "Een programma gebouwd voor jou, regelmatig herzien op je resultaten." },
          { title: "Intake en doelen", body: "Een gemeten startpunt, een duidelijke koers, haalbare tussenstappen." },
        ],
  galleryChip: "In beeld",
  galleryTitle: "De plek in foto's",
  practicalChip: "Praktische info",
  practicalTitle: "Waar en wanneer",
  addressLabel: "Adres",
  hoursLabel: "Openingstijden",
  phoneLabel: "Telefoon",
  websiteLabel: "Website",
  itinerary: "Route",
  call: "Bellen",
  reviewsChip: "Beoordelingen",
  reviewsTitle: "Wat de klanten zeggen",
  reviewsOn: (n) => `${n} beoordelingen`,
  programsChip: "Online",
  defaultProgramsTitle: "De begeleiding gaat bij jou thuis verder",
  defaultProgramsText: (name) =>
    `Tussen twee trainingen volgt ${name} je in een app: je programma dag voor dag, je maaltijden, je gewichten, en een coach die er is wanneer je hem nodig hebt.`,
  programsBullets: [
    "Een programma gebouwd op je doel, je niveau en je materiaal",
    "De voeding die erbij hoort, herberekend op je resultaten",
    "Je trainingen vastgelegd, je gewichten gevolgd, je vooruitgang zichtbaar",
  ],
  seePrograms: "Bekijk de programma's",
  freeProgram: "Gratis proberen",
  freeProgramBody: "Beantwoord een paar vragen en ontvang een persoonlijk miniprogramma, vrijblijvend.",
  login: "Inloggen",
  closed: "Gesloten",
  legal: "Juridische informatie",
});
