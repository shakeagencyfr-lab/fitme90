"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";

export interface ConfigState {
  ok?: boolean;
  error?: string;
}

// Enregistre la configuration de génération (mode + méthodologie personnalisée).
// Réservé aux admins (double contrôle serveur).
export async function saveCoachConfig(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };

  const mode = formData.get("mode") === "custom" ? "custom" : "auto";
  const custom = String(formData.get("custom_methodology") ?? "").slice(0, 8000);

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .update({ generation_mode: mode, custom_methodology: custom, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/config");
  return { ok: true };
}

// ------------------------------------------------------------------ boutique
export interface ShopState {
  ok?: boolean;
  error?: string;
}

/** Active ou désactive la boutique pour tous les clients. */
export async function setShopEnabled(_prev: ShopState, formData: FormData): Promise<ShopState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const enabled = formData.get("shop_enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .update({ shop_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
  return { ok: true };
}

/** Ajoute un produit à la boutique (image via URL, lien vers la boutique externe). */
export async function addShopProduct(_prev: ShopState, formData: FormData): Promise<ShopState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const image_url = String(formData.get("image_url") ?? "").trim().slice(0, 1000);
  const link_url = String(formData.get("link_url") ?? "").trim().slice(0, 1000);
  const position = Number(formData.get("position") ?? 0) || 0;
  if (!title) return { error: "Le titre est obligatoire." };
  if (link_url && !/^https?:\/\//i.test(link_url)) return { error: "Le lien doit commencer par http(s)://" };
  if (image_url && !/^https?:\/\//i.test(image_url)) return { error: "L'image doit être une URL http(s)://" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_products")
    .insert({ title, description, image_url, link_url, position });
  if (error) return { error: "Ajout impossible." };
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
  return { ok: true };
}

/** Supprime un produit (form action directe). */
export async function deleteShopProduct(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("shop_products").delete().eq("id", id);
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
}
