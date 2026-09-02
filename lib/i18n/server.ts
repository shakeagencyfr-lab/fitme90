import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { asLocale, isLocale, localeFromAcceptLanguage, makeT, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, type TFn } from "./index";

// Résolution de la langue côté serveur. Ordre : cookie (choix explicite) >
// langue du tenant (marque blanche du coach ou du revendeur) > Accept-Language
// > français. `cache()` dédoublonne au sein d'un même rendu.

/** Langue réglée sur un tenant (colonne tenants.language), ou null. */
export async function tenantLocale(tenantId: string | null | undefined): Promise<Locale | null> {
  if (!tenantId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("language")
    .eq("id", tenantId)
    .maybeSingle<{ language: string | null }>();
  return isLocale(data?.language) ? data.language : null;
}

/** Langue d'un tenant par son slug (ou sous-domaine), ou null. */
export async function tenantLocaleBySlug(slug: string | null | undefined): Promise<Locale | null> {
  const key = (slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(key)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("language")
    .or(`slug.eq.${key},subdomain.eq.${key}`)
    .limit(1)
    .maybeSingle<{ language: string | null }>();
  return isLocale(data?.language) ? data.language : null;
}

/**
 * Langue d'un utilisateur connecté : son choix propre (profiles.language,
 * posé quand il bascule la langue), sinon celle du tenant de son coach.
 * Sert aussi hors requête (cron des blocs) pour que l'IA écrive dans sa langue.
 */
export const userLocale = cache(async (userId: string | null | undefined): Promise<Locale | null> => {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id, language")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; language: string | null }>();
  if (isLocale(prof?.language)) return prof.language;
  return tenantLocale(prof?.tenant_id);
});

/** Choix explicite de la personne (cookie), ou null. */
export const cookieLocale = cache(async (): Promise<Locale | null> => {
  try {
    const store = await cookies();
    const v = store.get(LOCALE_COOKIE)?.value;
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
});

/** Langue préférée du navigateur, ou null. */
export const browserLocale = cache(async (): Promise<Locale | null> => {
  try {
    const h = await headers();
    return localeFromAcceptLanguage(h.get("accept-language"));
  } catch {
    return null;
  }
});

/**
 * Langue effective d'une page. `tenant` : la langue du tenant concerné si la
 * page en a un (déjà résolue par l'appelant, pour ne pas multiplier les
 * requêtes). Le cookie prime toujours : c'est un choix explicite.
 */
export async function resolveLocale(tenant: Locale | null | undefined): Promise<Locale> {
  return (await cookieLocale()) ?? tenant ?? (await browserLocale()) ?? DEFAULT_LOCALE;
}

/** `t` prêt à l'emploi pour un composant serveur. */
export async function getT(tenant?: Locale | null): Promise<{ locale: Locale; t: TFn }> {
  const locale = await resolveLocale(tenant ?? null);
  return { locale, t: makeT(locale) };
}

export { asLocale };
