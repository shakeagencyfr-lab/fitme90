import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { CoachAccent } from "@/components/coach-accent";
import { CoachBrandHeader } from "@/components/coach-brand-header";
import { brandMetadata } from "@/lib/brand-metadata";
import { TenantLocale } from "@/components/tenant-locale";
import { getT, tenantLocaleBySlug } from "@/lib/i18n/server";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ c?: string; r?: string }> }) {
  return brandMetadata(searchParams, "Connexion");
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" ? sp.suite : undefined;
  const resellerSlug = typeof sp.r === "string" ? sp.r : undefined;
  const coachSlug = resellerSlug ?? (typeof sp.c === "string" ? sp.c : undefined);
  const hrefBase = resellerSlug ? "/r" : "/c";
  const erreur = sp.erreur;
  const { t } = await getT(await tenantLocaleBySlug(coachSlug));
  return (
    <TenantLocale slug={coachSlug}>
    <CoachAccent slug={coachSlug}>
      <CoachBrandHeader slug={coachSlug} hrefBase={hrefBase} />
      <div className="flex flex-col gap-4">
        {erreur === "lien_invalide" ? (
          <Alert>{t("auth.linkExpired")}</Alert>
        ) : null}
        <LoginForm suite={suite} coachSlug={typeof sp.c === "string" ? sp.c : undefined} resellerSlug={resellerSlug} />
      </div>
    </CoachAccent>
    </TenantLocale>
  );
}
