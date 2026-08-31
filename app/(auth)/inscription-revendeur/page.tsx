import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ResellerSignupForm } from "@/components/auth-forms";

export const metadata = { title: "Créer mon espace revendeur, FitMe90" };

// Inscription REVENDEUR / distributeur : crée un espace au-dessus des coachs /
// salles (héberge des coachs, fixe ses prix, encaisse sur son propre Stripe).
export default function InscriptionRevendeurPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="self-center">
        <Wordmark size={22} />
      </Link>
      <ResellerSignupForm />
    </div>
  );
}
