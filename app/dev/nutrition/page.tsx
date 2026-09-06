import { notFound } from "next/navigation";
import { FoodJournal } from "@/components/food-journal";
import type { FoodEntry } from "@/lib/food-log";

// Bac à sable du journal alimentaire : quelques lignes fictives face à une
// cible, pour regarder les jauges, les feuilles et le lecteur de code-barres
// dans un vrai navigateur. Les actions serveur échouent sans compte (c'est
// attendu) ; la lecture de fiche passe par /api/food/lookup et demande une
// session. Désactivé sauf si LANDING_PREVIEW=1.
export const dynamic = "force-dynamic";

const LIGNES: FoodEntry[] = [
  { id: "a", day: 12, slot: "petit-dejeuner", name: "Flocons d'avoine", brand: "Bjorg", barcode: "3229820100227", grams: 60, per100: { kcal: 370, protein: 13, carbs: 60, fat: 7 } },
  { id: "b", day: 12, slot: "petit-dejeuner", name: "Skyr nature", brand: "Danone", barcode: "3033490004743", grams: 150, per100: { kcal: 63, protein: 10.5, carbs: 3.9, fat: 0.2 } },
  { id: "c", day: 12, slot: "dejeuner", name: "Blanc de poulet rôti", brand: null, barcode: null, grams: 180, per100: { kcal: 106, protein: 23, carbs: 0, fat: 1.5 } },
  { id: "d", day: 12, slot: "dejeuner", name: "Riz basmati cuit", brand: null, barcode: null, grams: 200, per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
];

export default function DevNutritionPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 p-4">
      <h1 className="font-archivo font-extrabold text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">Journal alimentaire</h1>
      <FoodJournal day={12} target={{ kcal: 2300, protein: 150, carbs: 260, fat: 70 }} slots={["petit-dejeuner", "dejeuner", "diner"]} canLog initialEntries={LIGNES} initialDay={12} />
      <h2 className="font-archivo font-extrabold text-[22px] text-ink">Programme terminé (lecture seule)</h2>
      <FoodJournal day={12} target={{ kcal: 2300, protein: 150, carbs: 260, fat: 70 }} slots={["petit-dejeuner", "dejeuner", "diner"]} canLog={false} initialEntries={[]} initialDay={12} />
    </div>
  );
}
