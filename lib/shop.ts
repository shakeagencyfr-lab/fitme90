import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Boutique d'affiliation : produits mis en avant + interrupteur d'activation.
// Global pour l'instant, deviendra par tenant en marque blanche.

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

export async function getShopProducts(): Promise<ShopProduct[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("shop_products")
      .select("id, title, description, image_url, link_url, position")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ShopProduct[]>();
    return data ?? [];
  } catch {
    return [];
  }
}
