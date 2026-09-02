import { notFound } from "next/navigation";
import { PlanPdfView } from "@/components/plan-pdf-view";
import { asLocale, type Locale } from "@/lib/i18n";
import type { Plan } from "@/lib/program";

export const dynamic = "force-dynamic";

// Aperçu de l'export PDF avec un plan fictif (démonstration / tests visuels).
// Actif uniquement avec LANDING_PREVIEW=1.

function ex(name: string, sets: number, reps: string, rest: number, note = "") {
  return { name, sets, reps, load: "", note, rest, cardio: false, duration: "", zone: "" };
}
function cardio(name: string, duration: string, zone: string, note = "") {
  return { name, sets: 0, reps: "", load: "", note, rest: undefined, cardio: true, duration, zone };
}

function demoPlan(locale: Locale): Plan {
  const fr = locale === "fr";
  const s = (a: string, b: string) => (fr ? a : b);
  const warm = [
    { name: s("Marche rapide", "Brisk walk"), detail: "5 min" },
    { name: s("Cercles d'épaules", "Shoulder circles"), detail: "2 × 10" },
    { name: s("Squat au poids du corps", "Bodyweight squat"), detail: "2 × 12" },
  ];
  const cycle = (i: number, name: string, weeks: string, body: string, rpe: string, restSec: number) => ({
    label: `${s("Cycle", "Cycle")} ${i}`,
    name,
    weeks,
    body,
    sessions: [
      {
        cycleLabel: `${s("Cycle", "Cycle")} ${i}`,
        title: s("Haut du corps · dominante poussée", "Upper body · push focus"),
        meta: rpe,
        restSec,
        warmup: warm,
        exercises: [
          ex(s("Développé couché haltères", "Dumbbell bench press"), 4, i === 3 ? "6-8" : "8-10", restSec, s("Coudes à 45°, omoplates serrées", "Elbows at 45°, shoulder blades pinched")),
          ex(s("Développé militaire", "Overhead press"), 3, "8-10", restSec),
          ex(s("Dips assistés", "Assisted dips"), 3, "10-12", restSec - 15),
          ex(s("Élévations latérales", "Lateral raises"), 3, "12-15", 60),
          ex(s("Extension triceps poulie", "Cable triceps pushdown"), 3, "12-15", 60),
          cardio(s("Rameur", "Rowing machine"), "12 min", "Z2", s("Allure régulière, respiration nasale", "Steady pace, nasal breathing")),
        ],
      },
      {
        cycleLabel: `${s("Cycle", "Cycle")} ${i}`,
        title: s("Bas du corps · quadriceps", "Lower body · quads"),
        meta: rpe,
        restSec,
        warmup: warm,
        exercises: [
          ex(s("Squat goblet", "Goblet squat"), 4, i === 3 ? "6-8" : "8-10", restSec, s("Talons au sol, descends sous la parallèle", "Heels down, below parallel")),
          ex(s("Presse à cuisses", "Leg press"), 3, "10-12", restSec),
          ex(s("Fentes marchées", "Walking lunges"), 3, "10 / jambe", restSec - 15),
          ex(s("Leg extension", "Leg extension"), 3, "12-15", 60),
          ex(s("Mollets debout", "Standing calf raise"), 4, "15", 45),
        ],
      },
      {
        cycleLabel: `${s("Cycle", "Cycle")} ${i}`,
        title: s("Haut du corps · dominante tirage", "Upper body · pull focus"),
        meta: rpe,
        restSec,
        warmup: warm,
        exercises: [
          ex(s("Tirage vertical", "Lat pulldown"), 4, "8-10", restSec, s("Tire les coudes vers les hanches", "Drive elbows to hips")),
          ex(s("Rowing haltère", "Dumbbell row"), 3, "10-12", restSec),
          ex(s("Face pull", "Face pull"), 3, "15", 60),
          ex(s("Curl biceps", "Biceps curl"), 3, "12", 60),
          cardio(s("Vélo", "Bike"), "15 min", "Z2"),
        ],
      },
    ],
  });
  return {
    summary: s(
      "Programme de 3 mois en 3 cycles de 4 semaines, 3 séances par semaine : on installe la technique, on monte le volume, puis on va chercher le résultat.",
      "A 3-month program in 3 four-week cycles, 3 sessions a week: build technique, raise volume, then go for the result.",
    ),
    cycles: [
      cycle(1, s("Fondations", "Foundations"), s("Semaines 1 à 4", "Weeks 1 to 4"), s("Technique propre, charges maîtrisées, régularité.", "Clean technique, controlled loads, consistency."), "RPE 7", 90),
      cycle(2, s("Construction", "Building"), s("Semaines 5 à 8", "Weeks 5 to 8"), s("Plus de volume et des charges qui montent.", "More volume and rising loads."), "RPE 8", 90),
      cycle(3, s("Réalisation", "Peak"), s("Semaines 9 à 12", "Weeks 9 to 12"), s("Intensité au plus haut, dernière semaine allégée.", "Intensity peaks, lighter final week."), "RPE 8-9", 120),
    ],
    weekPlan: [
      { day: "LUN", name: s("Haut · poussée", "Upper · push"), dur: "60 min", rest: false },
      { day: "MAR", name: s("Repos", "Rest"), dur: "", rest: true },
      { day: "MER", name: s("Bas · quadriceps", "Lower · quads"), dur: "60 min", rest: false },
      { day: "JEU", name: s("Repos", "Rest"), dur: "", rest: true },
      { day: "VEN", name: s("Haut · tirage", "Upper · pull"), dur: "60 min", rest: false },
      { day: "SAM", name: s("Repos", "Rest"), dur: "", rest: true },
      { day: "DIM", name: s("Repos", "Rest"), dur: "", rest: true },
    ],
    nutrition: {
      kcal: "2 350",
      protein: "150",
      carbs: "260",
      fat: "72",
      tags: [],
      meals: [{ time: "08:00", name: s("Petit-déjeuner", "Breakfast"), kcal: "550", items: [{ food: s("Flocons d'avoine", "Oats"), qty: "80 g" }] }],
    },
    warning: "",
  };
}

export default async function DemoPlanPdfPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  const locale = asLocale((await searchParams).lang);
  return (
    <PlanPdfView
      plan={demoPlan(locale)}
      clientName={locale === "en" ? "Emma" : "Léa"}
      coachName="Studio Forme"
      logoUrl={null}
      locale={locale}
      backHref={null}
    />
  );
}
