import type { Audience } from "@/components/landing-templates/coach-copy";
import type { SiteCopy } from "./site-copy";

// Textes du mini-site de présentation, en italien.
export const IT = (audience: Audience): SiteCopy => ({
  navAbout: "Il posto",
  navServices: "Servizi",
  navPractical: "Info pratiche",
  navReviews: "Recensioni",
  navPrograms: "Programmi online",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} accoglie i suoi iscritti tutta la settimana: materiale completo, team presente in sala, e un seguito che continua fuori dalla palestra.`
      : `${name} accompagna i suoi clienti in seduta e ogni giorno: un piano che tiene conto del tuo livello, del tuo materiale e dei tuoi orari.`,
  aboutChip: audience === "gym" ? "La palestra" : "Il coach",
  aboutTitle: audience === "gym" ? "Quello che trovi qui" : "Chi ti accompagna",
  servicesChip: "Servizi",
  servicesTitle: "Quello che viene proposto",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Accesso libero", body: "La sala, le macchine e gli spazi liberi negli orari di apertura." },
          { title: "Corsi collettivi", body: "Sedute guidate in piccolo gruppo, dal potenziamento al cardio." },
          { title: "Seguito personalizzato", body: "Un programma costruito per te, regolato settimana dopo settimana." },
        ]
      : [
          { title: "Seduta individuale", body: "Un appuntamento faccia a faccia, tecnica e progressione corrette dal vivo." },
          { title: "Seguito a distanza", body: "Un programma costruito per te, rivisto regolarmente secondo i tuoi risultati." },
          { title: "Valutazione e obiettivi", body: "Un punto di partenza misurato, una rotta chiara, tappe raggiungibili." },
        ],
  galleryChip: "In immagini",
  galleryTitle: "Il posto in foto",
  practicalChip: "Info pratiche",
  practicalTitle: "Dove e quando",
  addressLabel: "Indirizzo",
  hoursLabel: "Orari",
  phoneLabel: "Telefono",
  websiteLabel: "Sito",
  itinerary: "Come arrivare",
  call: "Chiamare",
  reviewsChip: "Recensioni",
  reviewsTitle: "Quello che dicono i clienti",
  reviewsOn: (n) => `${n} recensioni`,
  programsChip: "Online",
  defaultProgramsTitle: "Il seguito continua a casa tua",
  defaultProgramsText: (name) =>
    `Tra due sedute, ${name} ti segue in un'applicazione: il tuo programma giorno per giorno, i tuoi pasti, i tuoi carichi, e un coach disponibile quando ne hai bisogno.`,
  programsBullets: [
    "Un programma costruito sul tuo obiettivo, il tuo livello e il tuo materiale",
    "La nutrizione che lo accompagna, ricalcolata secondo i tuoi risultati",
    "Le tue sedute registrate, i tuoi carichi monitorati, i tuoi progressi visibili",
  ],
  seePrograms: "Vedi i programmi",
  freeProgram: "Prova gratis",
  freeProgramBody: "Rispondi a qualche domanda e ricevi un mini programma personalizzato, senza impegno.",
  login: "Accedi",
  closed: "Chiuso",
  legal: "Note legali",
});
