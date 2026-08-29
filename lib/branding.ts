import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Personnalisation simple de la page publique du coach : couleur d'accent,
// accroche et titre héros. Défaut orange FitMe90 si non défini.

export interface Branding {
  brandColor: string | null;
  tagline: string | null;
  headline: string | null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalise une couleur hex (#rrggbb) ou renvoie null. */
export function normalizeColor(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return HEX.test(withHash) ? withHash.toLowerCase() : null;
}

export async function tenantBranding(tenantId: string): Promise<Branding> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("brand_color, tagline, headline")
    .eq("id", tenantId)
    .maybeSingle<{ brand_color: string | null; tagline: string | null; headline: string | null }>();
  return {
    brandColor: data?.brand_color ?? null,
    tagline: data?.tagline ?? null,
    headline: data?.headline ?? null,
  };
}

export interface SaveBrandingResult {
  ok: boolean;
  error?: string;
}

export async function saveTenantBranding(
  tenantId: string,
  input: { brandColor: string; tagline: string; headline: string },
): Promise<SaveBrandingResult> {
  const colorRaw = input.brandColor.trim();
  const brand_color = colorRaw ? normalizeColor(colorRaw) : null;
  if (colorRaw && !brand_color) {
    return { ok: false, error: "Couleur invalide (format attendu : #e0551f)." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      brand_color,
      tagline: input.tagline.trim().slice(0, 160) || null,
      headline: input.headline.trim().slice(0, 90) || null,
    })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}
