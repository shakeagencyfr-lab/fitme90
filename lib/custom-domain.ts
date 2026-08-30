import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Résolution d'un DOMAINE PERSONNALISÉ (premium, white label total) vers le slug
// du coach. Appelé par le proxy uniquement pour un hôte « étranger » (ni le
// domaine racine, ni un sous-domaine, ni un hôte de prévisualisation), donc
// jamais sur le trafic normal. Retourne le slug de la landing, ou null.
export async function slugForCustomHost(host: string): Promise<string | null> {
  const domain = host.split(":")[0].trim().toLowerCase().replace(/\.$/, "");
  if (!domain) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("slug")
    .eq("custom_domain", domain)
    .maybeSingle<{ slug: string | null }>();
  return data?.slug ?? null;
}
