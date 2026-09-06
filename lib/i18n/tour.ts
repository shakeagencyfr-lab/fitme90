import { pick, type Locale, type LocalText } from "./index";

// Textes du tutoriel guidé (espace client), dans les deux langues. La
// structure (page ouverte, élément encadré) vit dans components/onboarding-tour.

export interface TourText {
  tag: string;
  title: string;
  body: string;
  bullets?: string[];
}

const FR: TourText[] = [
  { tag: "Bienvenue", title: "Bienvenue dans ton espace 👋", body: "En quelques étapes, on te montre où tout se trouve. Chaque page va s'ouvrir et l'onglet concerné sera mis en évidence. Tu peux passer ce guide quand tu veux, et le revoir depuis ton profil." },
  { tag: "Programme", title: "1. Ton programme", body: "Ta page d'accueil. Tout en haut, le résumé de ton plan. Juste en dessous, tes 3 cycles à faire glisser du doigt pour comprendre chaque phase. Plus bas, tu peux changer tes jours d'entraînement." },
  { tag: "Agenda", title: "2. Ton agenda", body: "Un vrai calendrier daté. Les jours d'entraînement sont marqués, aujourd'hui est encadré, un ✓ apparaît sur les séances validées. Touche un jour pour ouvrir la séance de ce jour." },
  { tag: "Séance", title: "3. Ta séance du jour", body: "C'est ici que tu suis ton entraînement, exercice par exercice. Je te montre maintenant, un par un, exactement où toucher pour remplir une série." },
  { tag: "Séance · 1 sur 4", title: "La charge, en kilos", body: "Pour chaque série, tape ici le poids soulevé, en kilos. Par exemple 40. Laisse vide au poids du corps (pompes, gainage)." },
  { tag: "Séance · 2 sur 4", title: "Les répétitions", body: "Juste à côté, indique le nombre de répétitions réellement faites. Par exemple 10. C'est ce chiffre qui valide la série." },
  { tag: "Séance · 3 sur 4", title: "Le minuteur de repos", body: "Touche « Repos » après ta série : un minuteur de récupération se lance en bas de l'écran. Tu peux le mettre en pause, retirer 15 secondes ou l'arrêter." },
  { tag: "Séance · 4 sur 4", title: "Valider ta séance", body: "Quand tes séries sont remplies, touche ce bouton. Remplir tes charges à chaque fois permet au coach de te caler les bonnes charges ensuite. Tu peux refaire ou mettre à jour une séance quand tu veux." },
  { tag: "Nutrition", title: "4. Ta nutrition", body: "Tes repas du jour, tes macros (jour d'entraînement et jour de repos) et ta liste de courses, en respectant tes allergies et ton régime. Navigue semaine par semaine et génère des recettes." },
  { tag: "Coach IA", title: "5. Ton coach, disponible 24h/24", body: "Ce bouton, en bas à droite, est là 24 heures sur 24, 7 jours sur 7, pendant ton programme. Ouvre-le pour discuter :", bullets: [
    "Pose tes questions, envoie une photo d'un repas ou d'une machine, ou dicte à la voix.",
    "Tu peux créer plusieurs conversations (icône ≡ en haut) et les retrouver quand tu veux.",
    "Sur ta séance, le bouton « Je n'ai pas mon matériel » lui demande une version adaptée (voyage, hôtel).",
  ] },
  { tag: "Régularité", title: "6. Reste sur la durée", body: "Tout est pensé pour t'aider à aller au bout de ton programme :", bullets: [
    "Ton score de régularité et tes séances validées s'affichent sur l'accueil.",
    "Une séance oubliée apparaît « à rattraper » : tu peux la faire quand tu veux, ton programme ne se décale pas.",
    "Sur les cardios, un chrono se lance pour la durée prévue, avec un bip sur les dernières secondes.",
  ] },
  { tag: "Installe l'app", title: "7. Installe l'app et active les rappels", body: "Pour ne rien oublier, installe My Fitness App sur ton téléphone et active les notifications. C'est ce qui fait la différence sur la régularité.", bullets: [
    "Android / Chrome : menu ⋮ en haut à droite, puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
    "iPhone / Safari : bouton Partager (le carré avec la flèche), puis « Sur l'écran d'accueil ». Ouvre ensuite l'app depuis son icône.",
    "Enfin, dans Profil → « Rappels de séance », touche « Activer » et autorise les notifications.",
  ] },
];

const EN: TourText[] = [
  { tag: "Welcome", title: "Welcome to your space 👋", body: "In a few steps we show you where everything is. Each page opens and the relevant tab is highlighted. You can skip this guide any time and replay it from your profile." },
  { tag: "Program", title: "1. Your program", body: "Your home page. At the top, the summary of your plan. Just below, your 3 cycles to swipe through to understand each phase. Further down, you can change your training days." },
  { tag: "Agenda", title: "2. Your agenda", body: "A real dated calendar. Training days are marked, today is outlined, a ✓ appears on logged sessions. Tap a day to open that day's session." },
  { tag: "Session", title: "3. Today's session", body: "This is where you follow your workout, exercise by exercise. I will now show you, one by one, exactly where to tap to fill in a set." },
  { tag: "Session · 1 of 4", title: "The load, in kilos", body: "For each set, type the weight lifted here, in kilos. For example 40. Leave empty for bodyweight (push-ups, planks)." },
  { tag: "Session · 2 of 4", title: "The reps", body: "Right next to it, enter the number of reps you actually did. For example 10. This number validates the set." },
  { tag: "Session · 3 of 4", title: "The rest timer", body: "Tap “Rest” after your set: a recovery timer starts at the bottom of the screen. You can pause it, remove 15 seconds or stop it." },
  { tag: "Session · 4 of 4", title: "Log your session", body: "When your sets are filled in, tap this button. Logging your loads every time lets the coach set the right loads next. You can redo or update a session whenever you want." },
  { tag: "Nutrition", title: "4. Your nutrition", body: "Today's meals, your macros (training day and rest day) and your shopping list, respecting your allergies and diet. Browse week by week and generate recipes." },
  { tag: "AI coach", title: "5. Your coach, available 24/7", body: "This button, bottom right, is there 24 hours a day, 7 days a week, during your program. Open it to chat:", bullets: [
    "Ask your questions, send a photo of a meal or a machine, or dictate by voice.",
    "You can create several conversations (≡ icon at the top) and find them again any time.",
    "On your session, the “I don't have my equipment” button asks for an adapted version (travel, hotel).",
  ] },
  { tag: "Consistency", title: "6. Stay the course", body: "Everything is designed to help you finish your program:", bullets: [
    "Your consistency score and logged sessions show on the home page.",
    "A forgotten session appears as “to catch up”: do it whenever you want, your program does not shift.",
    "On cardio, a timer runs for the planned duration, with a beep on the last seconds.",
  ] },
  { tag: "Install the app", title: "7. Install the app and turn on reminders", body: "So you never forget, install My Fitness App on your phone and enable notifications. That is what makes the difference on consistency.", bullets: [
    "Android / Chrome: ⋮ menu top right, then “Install app” (or “Add to Home screen”).",
    "iPhone / Safari: Share button (the square with the arrow), then “Add to Home Screen”. Then open the app from its icon.",
    "Finally, in Profile → “Session reminders”, tap “Enable” and allow notifications.",
  ] },
];

const TEXTS: LocalText<TourText[]> = { fr: FR, en: EN };
const UI: LocalText<{ skip: string; next: string; start: string }> = {
  fr: { skip: "Passer", next: "Suivant", start: "C'est parti" },
  en: { skip: "Skip", next: "Next", start: "Let's go" },
};

export function tourTexts(locale: Locale): TourText[] {
  return pick(TEXTS, locale);
}

export function tourUi(locale: Locale): { skip: string; next: string; start: string } {
  return pick(UI, locale);
}
