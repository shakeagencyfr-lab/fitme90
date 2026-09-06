import { notFound } from "next/navigation";
import { OfferForm } from "@/components/offer-form";
import { OfferEditor } from "@/components/offer-editor";
import type { Offer } from "@/lib/offers";

// Bac à sable de l'écran Plans : le formulaire de création et l'éditeur d'un
// plan existant, avec des données fictives, pour regarder les formules Mini et
// Max dans un vrai navigateur sans compte coach. Désactivé sauf si
// LANDING_PREVIEW=1, donc jamais en production.
export const dynamic = "force-dynamic";

const OFFRE: Offer = {
  id: "o1",
  tenant_id: "t1",
  name: "Transformation 3 mois",
  duration_months: 3,
  price_cents: 19000,
  currency: "eur",
  position: 0,
  is_active: true,
  is_listed: true,
  vip_chat: true,
  coach_ai: true,
  coach_ai_daily_limit: 20,
  recipe_ai_daily_limit: null,
  billing_type: "one_time",
  price_month_cents: null,
  price_year_cents: null,
  created_at: new Date().toISOString(),
};

export default function DevPlansPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5 p-4">
      <h1 className="font-archivo font-extrabold text-[32px] leading-[1.05] tracking-[-0.03em] text-ink">Plans</h1>
      <OfferEditor
        offer={OFFRE}
        defaultQuota={60}
        creditMode={false}
        programCredits={10}
        bestPack={null}
        unitCents={null}
        resellerCap={0}
      />
      <OfferForm atLimit={false} programCredits={10} creditMode={false} defaultQuota={60} bestPack={null} resellerCap={0} />
    </div>
  );
}
