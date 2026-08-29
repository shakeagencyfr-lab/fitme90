import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { confirmCoachCheckout } from "@/lib/coach-payments";
import { GenerateStep } from "@/components/generate-step";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Génération, FitMe90" };

export default async function GenerationPage({
  searchParams,
}: {
  searchParams: Promise<{ coach_paid?: string; session_id?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/generation");

  // Retour d'un paiement d'offre coach (BYOK, sans webhook) : on vérifie la
  // session avec la clé du coach et on marque le compte payé avant génération.
  const sp = await searchParams;
  if (ctx.access.phase === "not_paid" && sp.coach_paid === "1" && sp.session_id) {
    await confirmCoachCheckout(ctx.userId, sp.session_id);
  }

  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");

  // Le questionnaire doit être rempli avant de générer.
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("id")
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!quiz) redirect("/questionnaire");

  // On NE bloque PAS sur not_paid ici : après paiement Stripe, le webhook peut
  // mettre une ou deux secondes à marquer le compte payé. GenerateStep gère
  // cette attente (retente si le paiement n'est pas encore confirmé).

  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Wordmark />
      </header>
      <div className="flex min-h-[70dvh] items-center px-4 py-8 sm:px-8">
        <div className="w-full">
          <GenerateStep />
        </div>
      </div>
    </div>
  );
}
