import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMealSlot, type FoodEntry } from "@/lib/food-log";

// Lecture du journal alimentaire en base, partagée par la page nutrition,
// les actions serveur et le Coach IA (qui lit la journée pour répondre en
// connaissance de cause). Client SESSION, donc RLS own_rows : le journal d'un
// client ne sort jamais de son compte par ce chemin.

export interface FoodRow {
  id: string;
  day: number;
  slot: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  grams: number | string;
  kcal_100: number | string;
  protein_100: number | string;
  carbs_100: number | string;
  fat_100: number | string;
}

export const FOOD_COLS = "id, day, slot, name, brand, barcode, grams, kcal_100, protein_100, carbs_100, fat_100";

// numeric arrive en chaîne de PostgREST : on remet des nombres.
const n = (v: number | string) => (typeof v === "number" ? v : parseFloat(v) || 0);

export function rowToEntry(r: FoodRow): FoodEntry {
  return {
    id: r.id,
    day: r.day,
    slot: isMealSlot(r.slot) ? r.slot : "collation",
    name: r.name,
    brand: r.brand,
    barcode: r.barcode,
    grams: n(r.grams),
    per100: { kcal: n(r.kcal_100), protein: n(r.protein_100), carbs: n(r.carbs_100), fat: n(r.fat_100) },
  };
}

/** Les lignes d'un jour de programme, dans l'ordre d'ajout. */
export async function readFoodDay(userId: string, day: number): Promise<FoodEntry[]> {
  if (!Number.isInteger(day) || day < 1) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_log")
    .select(FOOD_COLS)
    .eq("user_id", userId)
    .eq("day", day)
    .order("created_at", { ascending: true });
  return ((data ?? []) as FoodRow[]).map(rowToEntry);
}
