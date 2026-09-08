import { PRODUCT_NAME } from "@/lib/config";
import type { RpeStep } from "@/lib/fitness";
import type { SensationStep } from "@/lib/circuit";
import type { TourText } from "./tour";
import type { WaiverText } from "./waiver";

// Tout ce qui, en italien, ne tient pas dans le dictionnaire à clés.

export const TOUR_IT: TourText[] = [
  { tag: "Benvenuto", title: "Benvenuto nel tuo spazio 👋", body: "In pochi passaggi ti mostriamo dove si trova tutto. Ogni pagina si aprirà e la scheda corrispondente resterà evidenziata. Puoi saltare questa guida quando vuoi e rivederla dal tuo profilo." },
  { tag: "Programma", title: "1. Il tuo programma", body: "La tua pagina iniziale. In alto, il riepilogo del tuo piano. Subito sotto, i tuoi 3 cicli da scorrere con il dito per capire ogni fase. Più in basso, puoi cambiare i tuoi giorni di allenamento." },
  { tag: "Agenda", title: "2. La tua agenda", body: "Un vero calendario con le date. I giorni di allenamento sono segnati, oggi è incorniciato, una ✓ compare sulle sedute convalidate. Tocca un giorno per aprire la seduta di quel giorno." },
  { tag: "Seduta", title: "3. La tua seduta di oggi", body: "È qui che segui il tuo allenamento, esercizio dopo esercizio. Ora ti mostro, uno per uno, esattamente dove toccare per compilare una serie." },
  { tag: "Seduta · 1 di 4", title: "Il carico, in chili", body: "Per ogni serie, scrivi qui il peso sollevato, in chili. Per esempio 40. Lascia vuoto a corpo libero (flessioni, plank)." },
  { tag: "Seduta · 2 di 4", title: "Le ripetizioni", body: "Subito accanto, indica il numero di ripetizioni davvero eseguite. Per esempio 10. È questa cifra che convalida la serie." },
  { tag: "Seduta · 3 di 4", title: "Il timer di recupero", body: "Tocca «Recupero» dopo la tua serie: parte un timer di recupero in fondo allo schermo. Puoi metterlo in pausa, togliere 15 secondi o fermarlo." },
  { tag: "Seduta · 4 di 4", title: "Convalidare la tua seduta", body: "Quando le tue serie sono compilate, tocca questo pulsante. Compilare i tuoi carichi ogni volta permette al coach di regolarti i carichi giusti dopo. Puoi rifare o aggiornare una seduta quando vuoi." },
  { tag: "Nutrizione", title: "4. La tua nutrizione", body: "I tuoi pasti del giorno, i tuoi macro (giorno di allenamento e giorno di riposo) e la tua lista della spesa, nel rispetto delle tue allergie e della tua dieta. Naviga settimana per settimana e genera delle ricette." },
  { tag: "Coach IA", title: "5. Il tuo coach, disponibile 24 ore su 24", body: "Questo pulsante, in basso a destra, è lì 24 ore su 24, 7 giorni su 7, per tutta la durata del tuo programma. Aprilo per parlare:", bullets: [
    "Fai le tue domande, invia una foto di un pasto o di una macchina, oppure detta a voce.",
    "Puoi creare più conversazioni (icona ≡ in alto) e ritrovarle quando vuoi.",
    "Nella tua seduta, il pulsante «Non ho il mio materiale» gli chiede una versione adattata (viaggio, hotel).",
  ] },
  { tag: "Costanza", title: "6. Tieni duro nel tempo", body: "Tutto è pensato per aiutarti ad arrivare in fondo al tuo programma:", bullets: [
    "Il tuo punteggio di costanza e le tue sedute convalidate sono mostrati nella pagina iniziale.",
    "Una seduta dimenticata compare «da recuperare»: puoi farla quando vuoi, il tuo programma non slitta.",
    "Sui cardio, parte un crono per la durata prevista, con un bip negli ultimi secondi.",
  ] },
  { tag: "Installa l'app", title: "7. Installa l'app e attiva i promemoria", body: "Per non dimenticare nulla, installa My Fitness App sul tuo telefono e attiva le notifiche. È quello che fa la differenza sulla costanza.", bullets: [
    "Android / Chrome: menu ⋮ in alto a destra, poi «Installa applicazione» (o «Aggiungi a schermata Home»).",
    "iPhone / Safari: pulsante Condividi (il quadrato con la freccia), poi «Aggiungi a schermata Home». Apri poi l'app dalla sua icona.",
    "Infine, in Profilo → «Promemoria di seduta», tocca «Attivare» e autorizza le notifiche.",
  ] },
];

export const TOUR_UI_IT = { skip: "Salta", next: "Avanti", start: "Andiamo" };

export const WAIVER_IT: WaiverText = {
  title: "Esonero di responsabilità e consenso informato",
  intro: `${PRODUCT_NAME} propone un accompagnamento sportivo e nutrizionale orientato alla forma fisica e al benessere. In base alle tue risposte, alcuni aspetti di salute meritano un'attenzione particolare. Non blocchiamo il tuo accesso, ma ti chiediamo di leggere e accettare l'esonero seguente.`,
  clauses: [
    { title: "Natura del servizio", body: `${PRODUCT_NAME} è un accompagnamento sportivo e nutrizionale di forma fisica. Non costituisce un parere, una diagnosi né un trattamento medico e non sostituisce una consulenza con un professionista sanitario.` },
    { title: "Raccomandazione medica", body: "Tenuto conto degli aspetti di salute che ho dichiarato (trattamento, patologia, gravidanza o altro), riconosco di essere stato informato che mi si raccomanda di chiedere il parere del mio medico prima di iniziare o proseguire il programma." },
    { title: "Idoneità e responsabilità", body: "Mi alleno sotto la mia responsabilità. Dichiaro di essere in grado di praticare attività fisica, oppure mi impegno a ottenere un parere medico favorevole. In caso di dubbio, mi informo prima di iniziare." },
    { title: "Attenzione durante la pratica", body: "Mi impegno ad adattare l'intensità alle mie sensazioni, a fermare immediatamente qualsiasi esercizio in caso di dolore, fastidio, fiato corto anomalo o malessere, e a consultare un professionista sanitario se questi sintomi persistono." },
    { title: "Veridicità delle informazioni", body: "Dichiaro di aver informato in modo sincero e preciso sulla mia situazione di salute. Avviserò il coach di ogni cambiamento che possa influire sulla mia pratica." },
    { title: "Limitazione di responsabilità", body: `Riconosco che ${PRODUCT_NAME} e il suo coach non potranno essere ritenuti responsabili delle conseguenze di una pratica non conforme alle indicazioni, di informazioni di salute inesatte o incomplete da parte mia, o di una controindicazione non dichiarata, nei limiti consentiti dalla legge.` },
    { title: "Dati di salute", body: "Le informazioni di salute che comunico sono trattate in modo riservato, con il mio consenso, al solo scopo di adattare il mio accompagnamento (in conformità al GDPR)." },
  ],
  consent: "Ho letto e compreso questo esonero. Lo accetto liberamente e con cognizione di causa.",
  lastStep: "Un ultimo passaggio",
  consider: "Da tenere presente:",
  signature: "Firma (nome e cognome)",
  signaturePlaceholder: "Il tuo nome e cognome",
  dated: (date) => `Firmato il ${date}. La tua firma elettronica è datata e conservata.`,
};

export const RPE_IT: RpeStep[] = [
  { id: "6", label: "Facile", body: "Potresti fare 4 ripetizioni in più" },
  { id: "7", label: "Moderato", body: "3 ripetizioni di riserva, il respiro sale" },
  { id: "8", label: "Difficile", body: "2 ripetizioni di riserva, la tecnica regge ancora" },
  { id: "9", label: "Molto difficile", body: "1 ripetizione di riserva, ultima rep lenta" },
  { id: "10", label: "Massimo", body: "Nessuna ripetizione di riserva, da evitare nel ciclo 1" },
];

export const RPE_INTRO_IT =
  "Nessun carico imposto: non conosci ancora i tuoi massimali. Scegli un peso a sensazione per raggiungere l'RPE previsto, annota quello che hai fatto, e il coach ti proporrà i carichi per la seduta successiva a partire da questi dati.";

export const SENSATIONS_IT: SensationStep[] = [
  { id: 1, label: "Facile", body: "Potresti tenere il doppio senza forzare, parli senza restare senza fiato." },
  { id: 2, label: "Lavora", body: "Il respiro sale, i muscoli si scaldano, riesci ancora a parlare a frasi corte." },
  { id: 3, label: "Duro", body: "Conti i secondi, solo qualche parola, la tecnica regge." },
  { id: 4, label: "A tutta", body: "Tutto quello che hai fino al segnale, impossibile parlare. Riservato ai finisher." },
];

export const SENSATION_INTRO_IT =
  "Nessun carico da annotare qui: quello che conta è ciò che senti durante lo sforzo. Regola il tuo ritmo (ampiezza, velocità, variante più facile o più dura) per raggiungere la sensazione prevista, e annotala alla fine di ogni blocco.";

export const RESCUE_WARMUP_IT: { name: string; detail: string }[] = [
  { name: "Alzare la temperatura", detail: "3 min di marcia sul posto, ginocchia alte poi talloni ai glutei, sempre più veloce." },
  { name: "Mobilità", detail: "Cerchi con le braccia 10 per senso, rotazioni del bacino 8 per senso, squat a corpo libero 10, affondi indietro 6 per gamba." },
  { name: "Attivazione", detail: "1 giro del primo blocco a metà velocità, per sistemare gli appoggi e il respiro." },
];

export const WARMUP_RULES_IT: string[] = [
  "Ponte per i glutei 2 x 15, abduzioni in piedi o con elastico 2 x 15 per lato: contrai volontariamente il gluteo in alto a ogni ripetizione.",
  "1 o 2 serie molto leggere del primo esercizio della seduta (circa metà del carico di lavoro), tempo lento, per sistemare la tecnica prima di caricare.",
  "Cerchi con il bacino 8 per senso, affondi dinamici 8 per gamba, slanci della gamba avanti-indietro 10 per gamba, poi cerchi con le caviglie 10 per senso e sollevamenti sui talloni 15.",
  "Cerchi con il bacino 8 per senso, slanci della gamba avanti-indietro poi laterali 10 per gamba, squat a corpo libero 10, affondi dinamici 8 per gamba.",
  "Cerchi con le braccia 10 per senso, rotazioni esterne con elastico o senza peso 15, sollevamenti a Y e a T 10 ciascuno, flessioni scapolari 10.",
  "Gatto-mucca 10, rotazioni toraciche a quattro zampe 8 per lato, aperture del petto contro un muro 8 per lato, good morning a corpo libero 10.",
  "Cerchi con le caviglie 10 per senso, ginocchio verso il muro 10 per gamba, sollevamenti sui talloni lenti 15.",
  "Cerchi con i polsi 10 per senso, flessioni ed estensioni del polso 15, appoggi progressivi sulle mani a terra.",
  "Squat a corpo libero lenti 10, affondi corti 8 per gamba, ginocchia alte sul posto 20.",
  "Anche, spalle, caviglie e colonna: da 6 a 8 movimenti lenti e ampi, senza forzare, da 8 a 10 ripetizioni ciascuno.",
];

export const CARDIO_HOW_IT = "Ritmo facile, riesci a parlare senza restare senza fiato; alza un po' il ritmo nell'ultimo minuto.";

export const ZONE_DEFS_IT: [string, string, string][] = [
  ["Z1", "Recupero", "Riscaldamento, defaticamento, camminata"],
  ["Z2", "Resistenza", "Base cardio, un ritmo in cui riesci a parlare"],
  ["Z3", "Tempo", "Ritmo sostenuto, frasi corte"],
  ["Z4", "Soglia", "Intervalli lunghi, respiro pesante"],
  ["Z5", "VO2 max", "Sprint corti, sforzo massimo"],
];

interface Expl { why: string; aims: string[]; how: string[] }

export const CYCLE_EXPL_IT: Expl[] = [
  {
    why: "Posiamo le fondamenta. Obiettivo n. 1: una tecnica pulita e l'abitudine di venire. (Ri)impariamo i movimenti con carichi controllati e installiamo la costanza.",
    aims: ["Tecnica e ampiezza", "Costanza", "Base cardio"],
    how: ["RPE da 6 a 7", "Tempo controllato", "Volume ragionevole"],
  },
  {
    why: "Saliamo di un gradino. Il corpo regge di più: aumentiamo il volume e i carichi. È qui che i cambiamenti cominciano davvero a vedersi.",
    aims: ["Più volume", "Maggiore densità", "Progresso visibile"],
    how: ["RPE da 7 a 8", "Serie in più", "Sovraccarico progressivo"],
  },
  {
    why: "Il picco. Concentriamo lo sforzo sul tuo obiettivo per andare a prendere il risultato. L'ultima settimana si alleggerisce per recuperare e lasciar emergere i progressi.",
    aims: ["Picco di forma", "Andare al risultato", "Recuperare alla fine"],
    how: ["RPE da 8 a 9 controllato", "Focus sui punti deboli", "Settimana di scarico"],
  },
];

export const CYCLE_SINGLE_IT: Expl = {
  why: "Un blocco completo di 4 settimane: installiamo la tecnica e la costanza, alziamo progressivamente l'intensità, e l'ultima settimana si alleggerisce per recuperare e vedere i progressi.",
  aims: ["Tecnica e costanza", "Progresso visibile", "Recuperare alla fine"],
  how: ["RPE da 6 a 8", "Sovraccarico progressivo", "Settimana 4 alleggerita"],
};

export const GEN_PHRASES_IT: string[] = [
  "La seduta che non salti è quella che conta.",
  "Costruiamo un piano che puoi mantenere, non un piano che impressiona.",
  "La costanza batte l'intensità, tutti i mesi dell'anno.",
  "Tre mesi sono poco in una vita. Sono tanto in un corpo.",
  "Il primo obiettivo: tornare la settimana prossima.",
  "Un carico controllato vale più di due carichi sollevati alla bell'e meglio.",
  "Il tuo miglior esercizio è quello che fai correttamente.",
  "Il riposo fa parte del programma. Non è una pausa nel programma.",
  "Non ti alleni per essere stanco, ti alleni per progredire.",
  "Quello che mangi dopo la seduta lavora mentre dormi.",
  "Nessuno diventa forte in un lunedì. Tutti ci riescono in tre mesi.",
  "Prepara la borsa stasera. Metà del lavoro è già fatta.",
];

export const FORMULAS_IT = {
  mini: {
    name: "Mini",
    tagline: "Il programma, e nient'altro",
    body: "Il cliente riceve il suo programma completo, la sua nutrizione giorno per giorno, le sue sedute, la sua esportazione PDF, le ricette, le alternative di esercizio e la seduta di emergenza. NON ha il Coach IA: né domande a qualsiasi ora, né foto di alimenti analizzata, né adattamento al volo.",
    cost: "Questa formula ti costa solo la generazione del programma, una volta. Nulla dopo, qualunque cosa faccia il cliente.",
    fit: "Ideale per un prezzo di ingresso, un primo programma, un grande volume di clienti.",
  },
  max: {
    name: "Max",
    tagline: "Il programma e il Coach IA per tutta la durata",
    body: "Tutto quello che c'è in Mini, più il Coach IA: il cliente fa le sue domande a qualsiasi ora, adatta le sue sedute (infortunio, materiale mancante, orario), fotografa i suoi alimenti per una ricetta, e riceve proposte di carichi a partire da quello che ha davvero sollevato.",
    cost: "Ogni scambio con il Coach IA ti viene fatturato. Regoli qui sotto quanti ne includi al giorno e per cliente: è questa regolazione che delimita la tua spesa.",
    fit: "Ideale per un programma venduto più caro e un seguimento VIP.",
  },
};
