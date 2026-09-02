import { SignupForm } from "@/components/auth-forms";
import { CoachAccent } from "@/components/coach-accent";
import { CoachBrandHeader } from "@/components/coach-brand-header";
import { brandMetadata } from "@/lib/brand-metadata";
import { TenantLocale } from "@/components/tenant-locale";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ c?: string; r?: string }> }) {
  return brandMetadata(searchParams, "Créer un compte");
}

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; r?: string; offer?: string; interval?: string; ref?: string }>;
}) {
  const sp = await searchParams;
  const slug = sp.c ?? sp.r;
  const hrefBase = sp.r ? "/r" : "/c";
  return (
    <TenantLocale slug={slug}>
      <CoachAccent slug={slug}>
        <CoachBrandHeader slug={slug} hrefBase={hrefBase} />
        <SignupForm coachSlug={sp.c} offerId={sp.offer} interval={sp.interval} refCode={sp.ref} />
      </CoachAccent>
    </TenantLocale>
  );
}
