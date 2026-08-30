import { SignupForm } from "@/components/auth-forms";
import { CoachAccent } from "@/components/coach-accent";
import { CoachBrandHeader } from "@/components/coach-brand-header";
import { brandMetadata } from "@/lib/brand-metadata";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  return brandMetadata(searchParams, "Créer un compte");
}

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; offer?: string; interval?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CoachAccent slug={sp.c}>
      <CoachBrandHeader slug={sp.c} />
      <SignupForm coachSlug={sp.c} offerId={sp.offer} interval={sp.interval} />
    </CoachAccent>
  );
}
