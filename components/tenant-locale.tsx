import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { resolveLocale, tenantLocaleBySlug, userLocale } from "@/lib/i18n/server";

// Pose la langue d'une page rattachée à un tenant : par le slug du coach ou du
// revendeur (pages publiques, auth) ou par la personne connectée (onboarding).
// Le cookie de la personne prime toujours (choix explicite).
export async function TenantLocale({
  slug,
  userId,
  children,
}: {
  slug?: string | null;
  userId?: string | null;
  children: ReactNode;
}) {
  const tenant = userId ? await userLocale(userId) : await tenantLocaleBySlug(slug);
  const locale = await resolveLocale(tenant);
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
