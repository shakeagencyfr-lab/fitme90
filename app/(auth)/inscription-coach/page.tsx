import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { CoachSignupForm } from "@/components/auth-forms";

export const metadata = { title: "Créer mon espace coach, FitMe90" };

// Inscription COACH (page de vente B2B → création d'espace). Distincte de
// l'inscription client (/inscription), qui est brandée par le coach.
// `?r=<slug>` rattache le coach à un revendeur (lien partagé par le revendeur).
export default async function InscriptionCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const sp = await searchParams;
  const resellerSlug = (sp.r ?? "").trim().slice(0, 80) || undefined;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="self-center">
        <Wordmark size={22} />
      </Link>
      <CoachSignupForm resellerSlug={resellerSlug} />
    </div>
  );
}
