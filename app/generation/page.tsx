import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { confirmCoachCheckout } from "@/lib/coach-payments";
import { hasProgram } from "@/lib/queries";
import { GenerateStep } from "@/components/generate-step";
import { CoachMark } from "@/components/brand";
import { brandForUser } from "@/lib/branding";
import { brandMetadataForUser } from "@/lib/brand-metadata";
import { TenantLocale } from "@/components/tenant-locale";

export async function generateMetadata() {
  const ctx = await getSessionContext();
  return brandMetadataForUser(ctx?.userId ?? null, "Génération");
}

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

  // Programme déjà écrit (il n'a peut-être pas encore commencé) : cette page
  // n'a plus rien à faire. La laisser se relancer coûtait une génération au
  // coach à chaque retour arrière ou rechargement. C'est le seul motif de
  // renvoi : la phase d'accès, elle, fermait aussi la porte aux comptes actifs
  // qui n'ont pas encore de programme, créés à la main par leur coach.
  const supabase = await createClient();
  if (await hasProgram(ctx.userId)) redirect("/app");

  // Le questionnaire doit être rempli avant de générer.
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
    <TenantLocale userId={ctx.userId}>
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <CoachMark brand={await brandForUser(ctx.userId)} imgClass="h-9" />
      </header>
      <div className="flex min-h-[70dvh] items-center px-4 py-8 sm:px-8">
        <div className="w-full">
          <GenerateStep />
        </div>
      </div>
    </div>
    </TenantLocale>
  );
}
