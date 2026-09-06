import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { brandForUser } from "@/lib/branding";
import type { Plan } from "@/lib/program";
import { PlanPdfView } from "@/components/plan-pdf-view";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan" };

// Page autonome (hors coquille client) pour un export PDF propre du plan : le
// client l'ouvre puis « Enregistrer en PDF ». Consultable tant que l'accès
// permet de voir le plan (actif, grâce, ou programme à prix unique terminé).
export default async function PlanPdfPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion");
  if (!ctx.access.planViewable) redirect("/app");

  const supabase = await createClient();
  const { data: prog } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: Plan }>();
  const plan = prog?.plan ?? null;
  if (!plan) redirect("/app");

  const [brand, locale] = await Promise.all([brandForUser(ctx.userId), resolveLocale(await userLocale(ctx.userId))]);
  return (
    <PlanPdfView
      plan={plan}
      clientName={ctx.profile?.name ?? ""}
      coachName={brand?.name ?? makeT(locale)("pdf.yourCoach")}
      logoUrl={brand?.logoUrl ?? null}
      locale={locale}
      downloadHref="/api/plan-pdf"
    />
  );
}
