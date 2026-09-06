import type { Audience } from "@/components/landing-templates/coach-copy";
import type { SiteCopy } from "./site-copy";

// Textes du mini-site de présentation, en allemand.
export const DE = (audience: Audience): SiteCopy => ({
  navAbout: "Der Ort",
  navServices: "Leistungen",
  navPractical: "Praktische Infos",
  navReviews: "Bewertungen",
  navPrograms: "Online-Programme",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} empfängt seine Mitglieder die ganze Woche: komplette Ausstattung, Team auf der Trainingsfläche und eine Betreuung, die außerhalb des Studios weitergeht.`
      : `${name} begleitet seine Kunden im Training und im Alltag: ein Plan, der dein Niveau, deine Ausstattung und deinen Zeitplan berücksichtigt.`,
  aboutChip: audience === "gym" ? "Das Studio" : "Der Coach",
  aboutTitle: audience === "gym" ? "Was du hier findest" : "Wer dich begleitet",
  servicesChip: "Leistungen",
  servicesTitle: "Was angeboten wird",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Freies Training", body: "Trainingsfläche, Maschinen und freie Bereiche zu den Öffnungszeiten." },
          { title: "Gruppenkurse", body: "Betreute Einheiten in kleinen Gruppen, von Kräftigung bis Cardio." },
          { title: "Persönliche Betreuung", body: "Ein für dich gebautes Programm, Woche für Woche angepasst." },
        ]
      : [
          { title: "Einzeltraining", body: "Ein Termin von Angesicht zu Angesicht, Technik und Progression live korrigiert." },
          { title: "Betreuung aus der Ferne", body: "Ein für dich gebautes Programm, regelmäßig nach deinen Ergebnissen überarbeitet." },
          { title: "Check-up und Ziele", body: "Ein gemessener Ausgangspunkt, ein klarer Kurs, erreichbare Etappen." },
        ],
  galleryChip: "In Bildern",
  galleryTitle: "Der Ort in Fotos",
  practicalChip: "Praktische Infos",
  practicalTitle: "Wo und wann",
  addressLabel: "Adresse",
  hoursLabel: "Öffnungszeiten",
  phoneLabel: "Telefon",
  websiteLabel: "Website",
  itinerary: "Route",
  call: "Anrufen",
  reviewsChip: "Bewertungen",
  reviewsTitle: "Was die Kunden sagen",
  reviewsOn: (n) => `${n} Bewertungen`,
  programsChip: "Online",
  defaultProgramsTitle: "Die Betreuung geht bei dir zu Hause weiter",
  defaultProgramsText: (name) =>
    `Zwischen zwei Trainings begleitet dich ${name} in einer App: dein Programm Tag für Tag, deine Mahlzeiten, deine Gewichte und ein Coach, der da ist, wenn du ihn brauchst.`,
  programsBullets: [
    "Ein Programm, gebaut auf deinem Ziel, deinem Niveau und deiner Ausstattung",
    "Die passende Ernährung, neu berechnet nach deinen Ergebnissen",
    "Deine Trainings gespeichert, deine Gewichte verfolgt, dein Fortschritt sichtbar",
  ],
  seePrograms: "Programme ansehen",
  freeProgram: "Kostenlos ausprobieren",
  freeProgramBody: "Beantworte ein paar Fragen und erhalte ein persönliches Mini-Programm, ohne Bindung.",
  login: "Anmelden",
  closed: "Geschlossen",
  legal: "Impressum",
});
