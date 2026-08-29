import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "Créer un compte, FitMe90" };

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; offer?: string }>;
}) {
  const sp = await searchParams;
  return <SignupForm coachSlug={sp.c} offerId={sp.offer} />;
}
