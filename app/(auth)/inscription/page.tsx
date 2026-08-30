import { SignupForm } from "@/components/auth-forms";
import { CoachAccent } from "@/components/coach-accent";

export const metadata = { title: "Créer un compte, FitMe90" };

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; offer?: string; interval?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CoachAccent slug={sp.c}>
      <SignupForm coachSlug={sp.c} offerId={sp.offer} interval={sp.interval} />
    </CoachAccent>
  );
}
