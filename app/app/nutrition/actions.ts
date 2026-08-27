"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

// Persiste l'état coché de la liste des courses. La liste elle-même est
// recalculée côté client (déterministe) ; seule la coche est stockée, par
// clé d'article stable (« aliment|unité »). RLS own_rows : chacun ses lignes.
export async function setShoppingCheck(itemKey: string, checked: boolean): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false };
  const key = String(itemKey).slice(0, 200);
  if (!key) return { ok: false };

  const supabase = await createClient();
  if (checked) {
    const { error } = await supabase
      .from("shopping_checks")
      .upsert({ user_id: ctx.userId, item_key: key }, { onConflict: "user_id,item_key" });
    return { ok: !error };
  }
  const { error } = await supabase
    .from("shopping_checks")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("item_key", key);
  return { ok: !error };
}
