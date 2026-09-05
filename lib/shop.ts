import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Boutique d'affiliation : produits mis en avant + interrupteur d'activation.
// Par tenant : chaque coach a sa boutique, et ne voit ni ne touche celle des
// autres. La table était globale à l'origine ; un coach pouvait alors pousser
// ses liens dans l'espace des clients de tous les autres.

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  position: number;
}

export async function isShopEnabled(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("coach_config")
      .select("shop_enabled")
      .eq("tenant_id", tenantId)
      .maybeSingle<{ shop_enabled: boolean }>();
    return !!data?.shop_enabled;
  } catch {
    return false;
  }
}

export async function getShopProducts(tenantId: string | null): Promise<ShopProduct[]> {
  if (!tenantId) return [];
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("shop_products")
      .select("id, title, description, image_url, link_url, position")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ShopProduct[]>();
    return data ?? [];
  } catch {
    return [];
  }
}
