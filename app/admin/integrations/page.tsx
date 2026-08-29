import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { tenantKeyStatus } from "@/lib/tenant";
import { tenantStripeStatus } from "@/lib/coach-payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { ByokForm } from "@/components/byok-form";
import { StripeKeyForm } from "@/components/stripe-key-form";
import { Alert } from "@/components/ui";

export const metadata = { title: "Intégrations, Admin FitMe90" };

export default async function AdminIntegrationsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  const empty = { configured: false, hint: null, encryptionReady: false };
  const anthropic = tenantId ? await tenantKeyStatus(tenantId) : empty;
  const stripe = tenantId ? await tenantStripeStatus(tenantId) : empty;

  let slug: string | null = null;
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string }>();
    slug = data?.slug ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Intégrations
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Tes deux clés indispensables : <span className="text-body">Anthropic</span> (l&apos;IA
          de tes clients) et <span className="text-body">Stripe</span> (l&apos;encaissement de tes
          offres). Sans elles, ton espace ne peut pas fonctionner.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <>
          {/* Aperçu de la page publique */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-5">
            <div className="flex flex-col gap-0.5">
              <div className="font-archivo font-bold text-[16px] text-ink">Ta page publique</div>
              <p className="text-[13px] text-muted">
                {slug ? (
                  <>C&apos;est là que tes clients découvrent et achètent tes offres.</>
                ) : (
                  <>Slug de compte introuvable.</>
                )}
              </p>
            </div>
            {slug ? (
              <Link
                href={`/c/${slug}`}
                target="_blank"
                className="tap inline-flex h-11 items-center rounded-btn bg-brand px-5 font-plex font-semibold text-[15px] text-white hover:bg-brand-hover"
              >
                Voir ma page publique ↗
              </Link>
            ) : null}
          </div>

          <ByokForm
            configured={anthropic.configured}
            hint={anthropic.hint}
            encryptionReady={anthropic.encryptionReady}
          />

          <StripeKeyForm
            configured={stripe.configured}
            hint={stripe.hint}
            encryptionReady={stripe.encryptionReady}
          />
        </>
      )}
    </div>
  );
}
