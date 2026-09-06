import { PRODUCT_NAME } from "@/lib/config";
import type { RpeStep } from "@/lib/fitness";
import type { SensationStep } from "@/lib/circuit";
import type { TourText } from "./tour";
import type { WaiverText } from "./waiver";

// Tout ce qui, en allemand, ne tient pas dans le dictionnaire à clés : les
// textes structurés (tutoriel, décharge, échelles, échauffements, formules).
// Chaque module les branche dans sa table locale sous la clé `de`.

export const TOUR_DE: TourText[] = [
  { tag: "Willkommen", title: "Willkommen in deinem Bereich 👋", body: "In ein paar Schritten zeigen wir dir, wo alles ist. Jede Seite öffnet sich und der passende Tab wird hervorgehoben. Du kannst diesen Guide jederzeit überspringen und ihn aus deinem Profil erneut ansehen." },
  { tag: "Programm", title: "1. Dein Programm", body: "Deine Startseite. Ganz oben die Zusammenfassung deines Plans. Direkt darunter deine 3 Zyklen zum Durchwischen, um jede Phase zu verstehen. Weiter unten kannst du deine Trainingstage ändern." },
  { tag: "Kalender", title: "2. Dein Kalender", body: "Ein echter Kalender mit Daten. Trainingstage sind markiert, heute ist umrahmt, ein ✓ erscheint bei abgehakten Trainings. Tippe auf einen Tag, um das Training dieses Tages zu öffnen." },
  { tag: "Training", title: "3. Dein Training heute", body: "Hier verfolgst du dein Training, Übung für Übung. Ich zeige dir jetzt, eins nach dem anderen, genau wo du tippen musst, um einen Satz einzutragen." },
  { tag: "Training · 1 von 4", title: "Das Gewicht, in Kilo", body: "Tippe für jeden Satz hier das gehobene Gewicht ein, in Kilo. Zum Beispiel 40. Bei Körpergewicht leer lassen (Liegestütze, Planks)." },
  { tag: "Training · 2 von 4", title: "Die Wiederholungen", body: "Direkt daneben trägst du die Anzahl der wirklich gemachten Wiederholungen ein. Zum Beispiel 10. Diese Zahl bestätigt den Satz." },
  { tag: "Training · 3 von 4", title: "Der Pausen-Timer", body: "Tippe nach deinem Satz auf „Pause“: Ein Erholungs-Timer startet unten auf dem Bildschirm. Du kannst ihn anhalten, 15 Sekunden abziehen oder stoppen." },
  { tag: "Training · 4 von 4", title: "Dein Training abhaken", body: "Wenn deine Sätze ausgefüllt sind, tippe auf diesen Button. Deine Gewichte jedes Mal einzutragen erlaubt dem Coach, dir danach die richtigen Gewichte einzustellen. Du kannst ein Training jederzeit wiederholen oder aktualisieren." },
  { tag: "Ernährung", title: "4. Deine Ernährung", body: "Deine Mahlzeiten des Tages, deine Makros (Trainingstag und Ruhetag) und deine Einkaufsliste, unter Berücksichtigung deiner Allergien und deiner Ernährungsweise. Navigiere Woche für Woche und erstelle Rezepte." },
  { tag: "KI-Coach", title: "5. Dein Coach, rund um die Uhr verfügbar", body: "Dieser Button unten rechts ist während deines Programms 24 Stunden am Tag, 7 Tage die Woche da. Öffne ihn zum Chatten:", bullets: [
    "Stell deine Fragen, schick ein Foto einer Mahlzeit oder eines Geräts, oder diktiere per Sprache.",
    "Du kannst mehrere Unterhaltungen anlegen (Symbol ≡ oben) und sie jederzeit wiederfinden.",
    "In deinem Training bittet ihn der Button „Ich habe meine Ausstattung nicht“ um eine angepasste Version (Reise, Hotel).",
  ] },
  { tag: "Regelmäßigkeit", title: "6. Bleib dran", body: "Alles ist darauf ausgelegt, dir zu helfen, dein Programm zu Ende zu bringen:", bullets: [
    "Dein Regelmäßigkeits-Score und deine abgehakten Trainings erscheinen auf der Startseite.",
    "Ein vergessenes Training erscheint als „nachzuholen“: Du kannst es machen, wann du willst, dein Programm verschiebt sich nicht.",
    "Beim Cardio läuft ein Timer für die geplante Dauer, mit einem Piepton in den letzten Sekunden.",
  ] },
  { tag: "App installieren", title: "7. Installiere die App und aktiviere die Erinnerungen", body: "Damit du nichts vergisst, installiere My Fitness App auf deinem Handy und aktiviere die Benachrichtigungen. Das macht den Unterschied bei der Regelmäßigkeit.", bullets: [
    "Android / Chrome: Menü ⋮ oben rechts, dann „App installieren“ (oder „Zum Startbildschirm hinzufügen“).",
    "iPhone / Safari: Teilen-Button (das Quadrat mit dem Pfeil), dann „Zum Home-Bildschirm“. Öffne die App danach über ihr Symbol.",
    "Zum Schluss tippe unter Profil → „Trainingserinnerungen“ auf „Aktivieren“ und erlaube die Benachrichtigungen.",
  ] },
];

export const TOUR_UI_DE = { skip: "Überspringen", next: "Weiter", start: "Los geht's" };

export const WAIVER_DE: WaiverText = {
  title: "Haftungsausschluss und informierte Einwilligung",
  intro: `${PRODUCT_NAME} bietet eine sportliche und ernährungsbezogene Begleitung für Fitness und Wohlbefinden. Nach deinen Antworten verdienen einige gesundheitliche Punkte besondere Aufmerksamkeit. Wir sperren deinen Zugang nicht, bitten dich aber, den folgenden Haftungsausschluss zu lesen und zu akzeptieren.`,
  clauses: [
    { title: "Art der Leistung", body: `${PRODUCT_NAME} ist eine sportliche und ernährungsbezogene Fitnessbegleitung. Sie ist keine ärztliche Beratung, Diagnose oder Behandlung und ersetzt keine Konsultation bei einer medizinischen Fachkraft.` },
    { title: "Ärztliche Empfehlung", body: "Angesichts der gesundheitlichen Angaben, die ich gemacht habe (Behandlung, Erkrankung, Schwangerschaft oder anderes), bestätige ich, darüber informiert worden zu sein, dass mir empfohlen wird, vor Beginn oder Fortsetzung des Programms den Rat meines Arztes einzuholen." },
    { title: "Eignung und Verantwortung", body: "Ich trainiere auf eigene Verantwortung. Ich erkläre, in der Lage zu sein, körperliche Aktivität auszuüben, oder verpflichte mich, eine positive ärztliche Beurteilung einzuholen. Im Zweifel konsultiere ich vor dem Start." },
    { title: "Achtsamkeit beim Training", body: "Ich verpflichte mich, die Intensität an mein Befinden anzupassen, jede Übung bei Schmerzen, Beschwerden, ungewöhnlicher Atemnot oder Unwohlsein sofort abzubrechen und bei anhaltenden Symptomen eine medizinische Fachkraft aufzusuchen." },
    { title: "Richtigkeit der Angaben", body: "Ich erkläre, meine gesundheitliche Situation wahrheitsgemäß und genau angegeben zu haben. Ich werde den Coach über jede Änderung informieren, die mein Training beeinflussen könnte." },
    { title: "Haftungsbeschränkung", body: `Ich erkenne an, dass ${PRODUCT_NAME} und sein Coach im gesetzlich zulässigen Rahmen nicht für die Folgen eines Trainings entgegen den Anweisungen, ungenauer oder unvollständiger Gesundheitsangaben meinerseits oder einer nicht angegebenen Kontraindikation haftbar gemacht werden können.` },
    { title: "Gesundheitsdaten", body: "Die Gesundheitsinformationen, die ich angebe, werden vertraulich, mit meiner Einwilligung und ausschließlich zur Anpassung meiner Begleitung verarbeitet (gemäß DSGVO)." },
  ],
  consent: "Ich habe diesen Haftungsausschluss gelesen und verstanden. Ich akzeptiere ihn freiwillig und in Kenntnis der Sachlage.",
  lastStep: "Ein letzter Schritt",
  consider: "Zu berücksichtigen:",
  signature: "Unterschrift (Vor- und Nachname)",
  signaturePlaceholder: "Dein Vor- und Nachname",
  dated: (date) => `Unterzeichnet am ${date}. Deine elektronische Unterschrift wird mit Zeitstempel gespeichert.`,
};

export const RPE_DE: RpeStep[] = [
  { id: "6", label: "Leicht", body: "Du könntest 4 Wiederholungen mehr machen" },
  { id: "7", label: "Moderat", body: "3 Wiederholungen in Reserve, die Atmung wird schwerer" },
  { id: "8", label: "Schwer", body: "2 Wiederholungen in Reserve, die Technik hält noch" },
  { id: "9", label: "Sehr schwer", body: "1 Wiederholung in Reserve, die letzte ist langsam" },
  { id: "10", label: "Maximal", body: "Keine Wiederholung in Reserve, in Zyklus 1 vermeiden" },
];

export const RPE_INTRO_DE =
  "Es wird kein Gewicht vorgegeben: Du kennst deine Maximalwerte noch nicht. Wähle ein Gewicht nach Gefühl, um den Ziel-RPE zu treffen, trage ein, was du gemacht hast, und der Coach schlägt dir aus diesen Daten die Gewichte für das nächste Training vor.";

export const SENSATIONS_DE: SensationStep[] = [
  { id: 1, label: "Leicht", body: "Du könntest doppelt so lange durchhalten, ohne dich anzustrengen, du redest ohne außer Atem zu kommen." },
  { id: 2, label: "Es arbeitet", body: "Die Atmung wird schwerer, die Muskeln werden warm, du kannst noch in kurzen Sätzen sprechen." },
  { id: 3, label: "Hart", body: "Du zählst die Sekunden, nur noch ein paar Worte, die Technik hält." },
  { id: 4, label: "Alles geben", body: "Alles, was du hast, bis zum Signal, Sprechen unmöglich. Nur für Finisher." },
];

export const SENSATION_INTRO_DE =
  "Hier ist kein Gewicht einzutragen: Was zählt, ist, was du während der Belastung spürst. Regle dein Tempo (Bewegungsumfang, Geschwindigkeit, leichtere oder härtere Variante), um das Zielgefühl zu erreichen, und trage es am Ende jedes Blocks ein.";

export const RESCUE_WARMUP_DE: { name: string; detail: string }[] = [
  { name: "Aufwärmen", detail: "3 Min. Marschieren auf der Stelle, Knieheben, dann Anfersen, immer schneller." },
  { name: "Mobilität", detail: "Armkreisen 10 pro Richtung, Hüftkreisen 8 pro Richtung, 10 Kniebeugen ohne Gewicht, 6 Ausfallschritte nach hinten pro Bein." },
  { name: "Aktivierung", detail: "1 Runde des ersten Blocks mit halbem Tempo, um Stand und Atmung einzurichten." },
];

/** Les règles d'échauffement, dans l'ordre de lib/warmup-guide. */
export const WARMUP_RULES_DE: string[] = [
  "Glute Bridge 2 x 15, Abduktionen im Stehen oder mit Band 2 x 15 pro Seite: Spann den Po am höchsten Punkt jeder Wiederholung bewusst an.",
  "1 bis 2 sehr leichte Sätze der ersten Übung des Trainings (etwa die Hälfte des Arbeitsgewichts), langsames Tempo, um die Technik vor dem Beladen einzustellen.",
  "Hüftkreisen 8 pro Richtung, dynamische Ausfallschritte 8 pro Bein, Beinschwingen vor und zurück 10 pro Bein, dann Fußkreisen 10 pro Richtung und 15 Wadenheben.",
  "Hüftkreisen 8 pro Richtung, Beinschwingen vor und zurück, dann seitlich 10 pro Bein, 10 Kniebeugen ohne Gewicht, dynamische Ausfallschritte 8 pro Bein.",
  "Armkreisen 10 pro Richtung, Außenrotationen mit Band oder ohne Gewicht 15, Y- und T-Heben je 10, Scapula-Liegestütze 10.",
  "Katze-Kuh 10, Brustwirbelsäulen-Rotationen im Vierfüßlerstand 8 pro Seite, Brustöffner an der Wand 8 pro Seite, Good Mornings mit Körpergewicht 10.",
  "Fußkreisen 10 pro Richtung, Knie zur Wand 10 pro Bein, langsames Wadenheben 15.",
  "Handgelenkkreisen 10 pro Richtung, Beugen und Strecken der Handgelenke 15, allmähliche Belastung der Hände am Boden.",
  "Langsame Kniebeugen ohne Gewicht 10, kurze Ausfallschritte 8 pro Bein, Knieheben auf der Stelle 20.",
  "Hüften, Schultern, Fußgelenke und Wirbelsäule: 6 bis 8 langsame, weite Bewegungen, ohne zu forcieren, je 8 bis 10 Wiederholungen.",
];

export const CARDIO_HOW_DE = "Lockeres Tempo, du kannst reden, ohne außer Atem zu kommen; zieh in der letzten Minute das Tempo etwas an.";

export const ZONE_DEFS_DE: [string, string, string][] = [
  ["Z1", "Erholung", "Aufwärmen, Auslaufen, Gehen"],
  ["Z2", "Ausdauer", "Cardio-Grundlage, ein Tempo, bei dem du reden kannst"],
  ["Z3", "Tempo", "Zügiges Tempo, kurze Sätze"],
  ["Z4", "Schwelle", "Lange Intervalle, schwere Atmung"],
  ["Z5", "VO2 max", "Kurze Sprints, maximale Anstrengung"],
];

interface Expl { why: string; aims: string[]; how: string[] }

export const CYCLE_EXPL_DE: Expl[] = [
  {
    why: "Wir legen das Fundament. Ziel Nr. 1: eine saubere Technik und die Gewohnheit, zu kommen. Wir lernen die Bewegungen (neu) mit kontrollierten Gewichten und bauen Regelmäßigkeit auf.",
    aims: ["Technik und Bewegungsumfang", "Regelmäßigkeit", "Cardio-Grundlage"],
    how: ["RPE 6 bis 7", "Kontrolliertes Tempo", "Vernünftiges Volumen"],
  },
  {
    why: "Wir legen eine Stufe zu. Der Körper verträgt mehr: Wir erhöhen Volumen und Gewichte. Hier beginnen sich die Veränderungen wirklich zu zeigen.",
    aims: ["Mehr Volumen", "Höhere Dichte", "Sichtbarer Fortschritt"],
    how: ["RPE 7 bis 8", "Zusätzliche Sätze", "Progressive Überlastung"],
  },
  {
    why: "Der Peak. Wir konzentrieren die Anstrengung auf dein Ziel, um das Ergebnis zu holen. Die letzte Woche wird leichter, um zu erholen und den Fortschritt sichtbar werden zu lassen.",
    aims: ["Topform", "Zum Ergebnis gehen", "Am Ende erholen"],
    how: ["RPE 8 bis 9, kontrolliert", "Fokus auf Schwachstellen", "Deload-Woche"],
  },
];

export const CYCLE_SINGLE_DE: Expl = {
  why: "Ein kompletter 4-Wochen-Block: Wir bauen Technik und Regelmäßigkeit auf, steigern die Intensität schrittweise, und die letzte Woche wird leichter, um zu erholen und den Fortschritt zu sehen.",
  aims: ["Technik und Regelmäßigkeit", "Sichtbarer Fortschritt", "Am Ende erholen"],
  how: ["RPE 6 bis 8", "Progressive Überlastung", "Leichtere Woche 4"],
};

export const GEN_PHRASES_DE: string[] = [
  "Das Training, das du nicht auslässt, ist das, das zählt.",
  "Wir bauen einen Plan, den du durchhalten kannst, nicht einen, der beeindruckt.",
  "Regelmäßigkeit schlägt Intensität, in jedem Monat des Jahres.",
  "Drei Monate sind kurz in einem Leben. Sie sind lang in einem Körper.",
  "Das erste Ziel: nächste Woche wiederkommen.",
  "Ein kontrolliertes Gewicht ist mehr wert als zwei irgendwie gehobene.",
  "Deine beste Übung ist die, die du sauber ausführst.",
  "Die Erholung gehört zum Programm. Sie ist keine Pause vom Programm.",
  "Du trainierst nicht, um müde zu sein, du trainierst, um voranzukommen.",
  "Was du nach dem Training isst, arbeitet, während du schläfst.",
  "Niemand wird an einem Montag stark. Jeder wird es in drei Monaten.",
  "Pack deine Tasche heute Abend. Die halbe Arbeit ist schon getan.",
];

export const FORMULAS_DE = {
  mini: {
    name: "Mini",
    tagline: "Das Programm, und sonst nichts",
    body: "Der Kunde bekommt sein komplettes Programm, seine Ernährung Tag für Tag, seine Trainings, seinen PDF-Export, die Rezepte, die Übungsalternativen und das Ersatztraining. Er hat KEINEN KI-Coach: keine Fragen rund um die Uhr, keine Analyse von Lebensmittelfotos, keine Anpassung unterwegs.",
    cost: "Dieser Plan kostet dich nur die Programmerstellung, einmal. Danach nichts mehr, was auch immer der Kunde tut.",
    fit: "Ideal für einen Einstiegspreis, ein erstes Programm, eine große Zahl an Kunden.",
  },
  max: {
    name: "Max",
    tagline: "Das Programm und der KI-Coach über die gesamte Dauer",
    body: "Alles aus Mini, plus der KI-Coach: Der Kunde stellt seine Fragen rund um die Uhr, lässt seine Trainings anpassen (Verletzung, fehlende Ausstattung, Zeitplan), fotografiert seine Lebensmittel für ein Rezept und bekommt Gewichtsvorschläge aus dem, was er wirklich gehoben hat.",
    cost: "Jeder Austausch mit dem KI-Coach wird dir berechnet. Unten legst du fest, wie viele du pro Tag und Kunde einschließt: Diese Einstellung begrenzt deine Ausgabe.",
    fit: "Ideal für ein teurer verkauftes Programm mit VIP-Betreuung.",
  },
};

