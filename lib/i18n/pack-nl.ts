import { PRODUCT_NAME } from "@/lib/config";
import type { RpeStep } from "@/lib/fitness";
import type { SensationStep } from "@/lib/circuit";
import type { TourText } from "./tour";
import type { WaiverText } from "./waiver";

// Tout ce qui, en néerlandais, ne tient pas dans le dictionnaire à clés.

export const TOUR_NL: TourText[] = [
  { tag: "Welkom", title: "Welkom in je omgeving 👋", body: "In een paar stappen laten we je zien waar alles staat. Elke pagina gaat open en het bijbehorende tabblad blijft uitgelicht. Je kunt deze rondleiding altijd overslaan en later terugvinden bij je profiel." },
  { tag: "Programma", title: "1. Jouw programma", body: "Je beginpagina. Bovenaan het overzicht van je plan. Daar meteen onder je 3 cycli om met je vinger doorheen te vegen en elke fase te begrijpen. Verderop kun je je trainingsdagen wijzigen." },
  { tag: "Agenda", title: "2. Jouw agenda", body: "Een echte kalender met datums. De trainingsdagen zijn gemarkeerd, vandaag staat omkaderd, een ✓ verschijnt bij afgeronde trainingen. Tik op een dag om de training van die dag te openen." },
  { tag: "Training", title: "3. Je training van vandaag", body: "Hier volg je je training, oefening voor oefening. Ik laat je nu stuk voor stuk zien waar je precies moet tikken om een set in te vullen." },
  { tag: "Training · 1 van 4", title: "Het gewicht, in kilo's", body: "Schrijf hier voor elke set het getilde gewicht op, in kilo's. Bijvoorbeeld 40. Laat leeg bij lichaamsgewicht (push-ups, plank)." },
  { tag: "Training · 2 van 4", title: "De herhalingen", body: "Daar meteen naast geef je het aantal echt gemaakte herhalingen aan. Bijvoorbeeld 10. Dit getal maakt de set geldig." },
  { tag: "Training · 3 van 4", title: "De rusttimer", body: "Tik na je set op « Rust »: onderaan het scherm start een hersteltimer. Je kunt hem pauzeren, er 15 seconden af halen of hem stoppen." },
  { tag: "Training · 4 van 4", title: "Je training afronden", body: "Als je sets ingevuld zijn, tik je op deze knop. Door je gewichten elke keer in te vullen kan de coach je daarna de juiste gewichten geven. Je kunt een training altijd overdoen of bijwerken." },
  { tag: "Voeding", title: "4. Jouw voeding", body: "Je maaltijden van de dag, je macro's (trainingsdag en rustdag) en je boodschappenlijst, met respect voor je allergieën en je dieet. Blader week per week en genereer recepten." },
  { tag: "AI-coach", title: "5. Je coach, 24 uur per dag beschikbaar", body: "Deze knop, rechtsonder, staat er 24 uur per dag, 7 dagen per week, zolang je programma loopt. Open hem om te praten:", bullets: [
    "Stel je vragen, stuur een foto van een maaltijd of een machine, of spreek in.",
    "Je kunt meerdere gesprekken aanmaken (icoon ≡ bovenaan) en ze altijd terugvinden.",
    "In je training vraagt de knop « Ik heb mijn materiaal niet » om een aangepaste versie (op reis, hotel).",
  ] },
  { tag: "Regelmaat", title: "6. Houd het vol", body: "Alles is bedacht om je te helpen je programma af te maken:", bullets: [
    "Je regelmaatscore en je afgeronde trainingen staan op de beginpagina.",
    "Een vergeten training verschijnt als « in te halen »: je kunt hem doen wanneer je wilt, je programma schuift niet op.",
    "Bij cardio start er een klok voor de geplande duur, met een piep in de laatste seconden.",
  ] },
  { tag: "Installeer de app", title: "7. Installeer de app en zet de herinneringen aan", body: "Om niets te vergeten: installeer My Fitness App op je telefoon en zet de meldingen aan. Dat maakt het verschil in regelmaat.", bullets: [
    "Android / Chrome: menu ⋮ rechtsboven, dan « App installeren » (of « Toevoegen aan beginscherm »).",
    "iPhone / Safari: knop Delen (het vierkantje met de pijl), dan « Zet op beginscherm ». Open de app daarna via het icoon.",
    "Tot slot: ga naar Profiel → « Trainingsherinneringen », tik op « Aanzetten » en sta de meldingen toe.",
  ] },
];

export const TOUR_UI_NL = { skip: "Overslaan", next: "Volgende", start: "Aan de slag" };

export const WAIVER_NL: WaiverText = {
  title: "Vrijwaring van aansprakelijkheid en geïnformeerde toestemming",
  intro: `${PRODUCT_NAME} biedt sport- en voedingsbegeleiding gericht op fitheid en welzijn. Op basis van je antwoorden verdienen sommige gezondheidsaspecten bijzondere aandacht. We blokkeren je toegang niet, maar we vragen je de onderstaande vrijwaring te lezen en te aanvaarden.`,
  clauses: [
    { title: "Aard van de dienst", body: `${PRODUCT_NAME} is sport- en voedingsbegeleiding op het gebied van fitheid. Het vormt geen medisch advies, geen diagnose en geen behandeling, en vervangt geen consult bij een zorgverlener.` },
    { title: "Medische aanbeveling", body: "Gezien de gezondheidsaspecten die ik heb opgegeven (behandeling, aandoening, zwangerschap of anders), erken ik geïnformeerd te zijn dat mij wordt aangeraden het advies van mijn arts te vragen voordat ik het programma begin of voortzet." },
    { title: "Geschiktheid en verantwoordelijkheid", body: "Ik sport op eigen verantwoordelijkheid. Ik verklaar in staat te zijn om te bewegen, of ik verbind me ertoe een positief medisch advies te verkrijgen. Bij twijfel win ik advies in voordat ik begin." },
    { title: "Oplettendheid tijdens het sporten", body: "Ik verbind me ertoe de intensiteit aan mijn gevoel aan te passen, elke oefening onmiddellijk te stoppen bij pijn, ongemak, abnormale kortademigheid of onwel worden, en een zorgverlener te raadplegen als deze klachten aanhouden." },
    { title: "Juistheid van de informatie", body: "Ik verklaar eerlijk en nauwkeurig te hebben gemeld hoe het met mijn gezondheid staat. Ik meld de coach elke verandering die invloed kan hebben op mijn sporten." },
    { title: "Beperking van aansprakelijkheid", body: `Ik erken dat ${PRODUCT_NAME} en zijn coach niet aansprakelijk kunnen worden gesteld voor de gevolgen van sporten dat niet in overeenstemming is met de aanwijzingen, van onjuiste of onvolledige gezondheidsinformatie van mijn kant, of van een niet-gemelde contra-indicatie, binnen de door de wet toegestane grenzen.` },
    { title: "Gezondheidsgegevens", body: "De gezondheidsinformatie die ik doorgeef wordt vertrouwelijk verwerkt, met mijn toestemming, met als enig doel mijn begeleiding aan te passen (conform de AVG)." },
  ],
  consent: "Ik heb deze vrijwaring gelezen en begrepen. Ik aanvaard hem vrijwillig en met kennis van zaken.",
  lastStep: "Nog één stap",
  consider: "Om rekening mee te houden:",
  signature: "Handtekening (voor- en achternaam)",
  signaturePlaceholder: "Je voor- en achternaam",
  dated: (date) => `Ondertekend op ${date}. Je elektronische handtekening wordt gedateerd en bewaard.`,
};

export const RPE_NL: RpeStep[] = [
  { id: "6", label: "Makkelijk", body: "Je zou nog 4 herhalingen kunnen doen" },
  { id: "7", label: "Gemiddeld", body: "3 herhalingen in reserve, de ademhaling gaat omhoog" },
  { id: "8", label: "Zwaar", body: "2 herhalingen in reserve, de techniek houdt nog stand" },
  { id: "9", label: "Heel zwaar", body: "1 herhaling in reserve, laatste rep gaat traag" },
  { id: "10", label: "Maximaal", body: "Geen enkele herhaling in reserve, vermijd dit in cyclus 1" },
];

export const RPE_INTRO_NL =
  "Er wordt geen gewicht opgelegd: je kent je maxima nog niet. Kies op gevoel een gewicht om de beoogde RPE te halen, noteer wat je gedaan hebt, en de coach stelt op basis daarvan de gewichten voor de volgende training voor.";

export const SENSATIONS_NL: SensationStep[] = [
  { id: 1, label: "Makkelijk", body: "Je zou het dubbele volhouden zonder te forceren, je praat zonder buiten adem te raken." },
  { id: 2, label: "Het werkt", body: "De ademhaling gaat omhoog, de spieren worden warm, je kunt nog in korte zinnen praten." },
  { id: 3, label: "Zwaar", body: "Je telt de seconden, nog maar een paar woorden, de techniek houdt stand." },
  { id: 4, label: "Alles eruit", body: "Alles wat je hebt tot het signaal, praten gaat niet meer. Alleen voor de finishers." },
];

export const SENSATION_INTRO_NL =
  "Hier valt geen gewicht te noteren: wat telt is wat je voelt tijdens de inspanning. Stel je tempo bij (bereik, snelheid, makkelijkere of zwaardere variant) om het beoogde gevoel te halen, en noteer het aan het eind van elk blok.";

export const RESCUE_WARMUP_NL: { name: string; detail: string }[] = [
  { name: "Temperatuur omhoog", detail: "3 min marcheren op de plaats, knieën hoog en daarna hakken naar de billen, steeds sneller." },
  { name: "Mobiliteit", detail: "Armcirkels 10 per richting, heupdraaien 8 per richting, squats zonder gewicht 10, lunges achteruit 6 per been." },
  { name: "Activatie", detail: "1 ronde van het eerste blok op halve snelheid, om je steunpunten en je ademhaling op orde te krijgen." },
];

export const WARMUP_RULES_NL: string[] = [
  "Glute bridge 2 x 15, staande abducties of met elastiek 2 x 15 per kant: span de bil bij elke herhaling bewust aan in de bovenste stand.",
  "1 tot 2 heel lichte sets van de eerste oefening van de training (ongeveer de helft van het werkgewicht), traag tempo, om de techniek af te stellen voor je verzwaart.",
  "Heupcirkels 8 per richting, dynamische lunges 8 per been, beenzwaaien voor-achter 10 per been, dan enkelcirkels 10 per richting en kuitheffen 15.",
  "Heupcirkels 8 per richting, beenzwaaien voor-achter en daarna zijwaarts 10 per been, squats zonder gewicht 10, dynamische lunges 8 per been.",
  "Armcirkels 10 per richting, externe rotaties met elastiek of zonder gewicht 15, Y- en T-heffingen 10 elk, scapula push-ups 10.",
  "Cat-cow 10, borstwervelrotaties op handen en knieën 8 per kant, borstopening tegen een muur 8 per kant, good mornings op lichaamsgewicht 10.",
  "Enkelcirkels 10 per richting, knie naar de muur 10 per been, traag kuitheffen 15.",
  "Polscirkels 10 per richting, pols buigen en strekken 15, geleidelijk steunen op de handen op de grond.",
  "Trage squats zonder gewicht 10, korte lunges 8 per been, knieën hoog op de plaats 20.",
  "Heupen, schouders, enkels en wervelkolom: 6 tot 8 trage en ruime bewegingen, zonder forceren, 8 tot 10 herhalingen elk.",
];

export const CARDIO_HOW_NL = "Rustig tempo, je kunt praten zonder buiten adem te raken; ga in de laatste minuut iets sneller.";

export const ZONE_DEFS_NL: [string, string, string][] = [
  ["Z1", "Herstel", "Warming-up, cooling-down, wandelen"],
  ["Z2", "Duur", "Cardiobasis, een tempo waarop je kunt praten"],
  ["Z3", "Tempo", "Stevig tempo, korte zinnen"],
  ["Z4", "Drempel", "Lange intervallen, zware ademhaling"],
  ["Z5", "VO2 max", "Korte sprints, maximale inspanning"],
];

interface Expl { why: string; aims: string[]; how: string[] }

export const CYCLE_EXPL_NL: Expl[] = [
  {
    why: "We leggen de fundering. Doel nummer 1: nette techniek en de gewoonte om te komen. We (her)leren de bewegingen met beheerste gewichten en bouwen de regelmaat op.",
    aims: ["Techniek en bereik", "Regelmaat", "Cardiobasis"],
    how: ["RPE 6 tot 7", "Beheerst tempo", "Redelijk volume"],
  },
  {
    why: "We gaan een trede omhoog. Het lichaam verdraagt meer: we verhogen het volume en de gewichten. Hier worden de veranderingen echt zichtbaar.",
    aims: ["Meer volume", "Hogere dichtheid", "Zichtbare vooruitgang"],
    how: ["RPE 7 tot 8", "Extra sets", "Progressieve overbelasting"],
  },
  {
    why: "De piek. We richten de inspanning op jouw doel om het resultaat te pakken. De laatste week wordt lichter om te herstellen en de winst zichtbaar te laten worden.",
    aims: ["Piekvorm", "Naar het resultaat", "Herstellen aan het eind"],
    how: ["RPE 8 tot 9, beheerst", "Focus op zwakke punten", "Deloadweek"],
  },
];

export const CYCLE_SINGLE_NL: Expl = {
  why: "Eén volledig blok van 4 weken: we bouwen de techniek en de regelmaat op, verhogen geleidelijk de intensiteit, en de laatste week wordt lichter om te herstellen en de vooruitgang te zien.",
  aims: ["Techniek en regelmaat", "Zichtbare vooruitgang", "Herstellen aan het eind"],
  how: ["RPE 6 tot 8", "Progressieve overbelasting", "Week 4 lichter"],
};

export const GEN_PHRASES_NL: string[] = [
  "De training die je niet overslaat is de training die telt.",
  "We bouwen een plan dat je kunt volhouden, geen plan dat indruk maakt.",
  "Regelmaat wint van intensiteit, elke maand van het jaar.",
  "Drie maanden is weinig in een leven. Het is veel in een lichaam.",
  "Het eerste doel: volgende week terugkomen.",
  "Eén beheerst gewicht is meer waard dan twee die je zomaar omhoog gooit.",
  "Je beste oefening is die je goed uitvoert.",
  "Rust hoort bij het programma. Het is geen pauze in het programma.",
  "Je traint niet om moe te zijn, je traint om vooruit te gaan.",
  "Wat je na de training eet, werkt terwijl je slaapt.",
  "Niemand wordt sterk op een maandag. Iedereen lukt het in drie maanden.",
  "Pak je tas vanavond al in. De helft van het werk is dan gedaan.",
];

export const FORMULAS_NL = {
  mini: {
    name: "Mini",
    tagline: "Het programma, en verder niets",
    body: "De klant krijgt zijn volledige programma, zijn voeding dag voor dag, zijn trainingen, zijn pdf-export, de recepten, de alternatieve oefeningen en de nood-training. Hij heeft GEEN AI-coach: geen vragen op elk moment, geen geanalyseerde foto van producten, geen aanpassing onderweg.",
    cost: "Deze formule kost je alleen het genereren van het programma, één keer. Daarna niets meer, wat de klant ook doet.",
    fit: "Ideaal voor een instapprijs, een eerste programma, een groot aantal klanten.",
  },
  max: {
    name: "Max",
    tagline: "Het programma en de AI-coach voor de hele duur",
    body: "Alles wat in Mini zit, plus de AI-coach: de klant stelt zijn vragen op elk moment, past zijn trainingen aan (blessure, ontbrekend materiaal, tijdstip), fotografeert zijn producten voor een recept, en krijgt gewichtsvoorstellen op basis van wat hij echt getild heeft.",
    cost: "Elke uitwisseling met de AI-coach wordt bij jou in rekening gebracht. Hieronder stel je in hoeveel je er per dag en per klant meegeeft: die instelling bepaalt je uitgaven.",
    fit: "Ideaal voor een duurder verkocht programma en een vip-begeleiding.",
  },
};
