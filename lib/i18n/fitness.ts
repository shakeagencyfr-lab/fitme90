import { RPE, RPE_INTRO, type RpeStep } from "@/lib/fitness";
import { pick, type Locale, type LocalText } from "./index";
import { RPE_DE, RPE_INTRO_DE } from "./pack-de";
import { RPE_ES, RPE_INTRO_ES } from "./pack-es";

// Échelle RPE dans la langue de la page (la source française vit dans lib/fitness).
const RPE_EN: RpeStep[] = [
  { id: "6", label: "Easy", body: "You could do 4 more reps" },
  { id: "7", label: "Moderate", body: "3 reps in reserve, breathing picks up" },
  { id: "8", label: "Hard", body: "2 reps in reserve, technique still holds" },
  { id: "9", label: "Very hard", body: "1 rep in reserve, last rep is slow" },
  { id: "10", label: "Maximal", body: "No reps in reserve, avoid in cycle 1" },
];

const RPE_INTRO_EN =
  "No load is imposed: you do not know your maxes yet. Pick a weight by feel to hit the target RPE, log what you did, and the coach will suggest loads for the next session from that data.";

const SCALES: LocalText<{ RPE: RpeStep[]; RPE_INTRO: string }> = {
  fr: { RPE, RPE_INTRO },
  en: { RPE: RPE_EN, RPE_INTRO: RPE_INTRO_EN },
  de: { RPE: RPE_DE, RPE_INTRO: RPE_INTRO_DE },
  es: { RPE: RPE_ES, RPE_INTRO: RPE_INTRO_ES },
};

export function rpeScale(locale: Locale): { RPE: RpeStep[]; RPE_INTRO: string } {
  return pick(SCALES, locale);
}
