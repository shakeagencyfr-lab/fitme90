import { getAdminOrNull } from "@/lib/admin";
import { refreshConnectStatus, tenantConnect } from "@/lib/connect";
import { startStripeOnboarding, openStripeDashboard } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Paiements, Admin FitMe90" };

const stripeReady = () => !!process.env.STRIPE_SECRET_KEY;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  // À l'affichage, on resynchronise l'état d'encaissement depuis Stripe.
  const connect = tenantId
    ? stripeReady()
      ? await refreshConnectStatus(tenantId)
      : await tenantConnect(tenantId)
    : { stripe_account_id: null, stripe_charges_enabled: false, commission_bps: null };

  const connected = !!connect.stripe_account_id;
  const enabled = connect.stripe_charges_enabled;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Paiements
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Connecte ton compte Stripe pour encaisser tes clients. Les paiements
          arrivent <span className="text-body">directement sur ton compte</span> ;
          la plateforme prélève une commission automatique sur chaque vente.
        </p>
      </div>

      {sp.error ? (
        <Alert>
          {sp.error === "stripe"
            ? "Une erreur Stripe est survenue. Réessaie dans un instant."
            : `Stripe : ${sp.error}`}
        </Alert>
      ) : null}
      {sp.done === "1" && !enabled ? (
        <Alert tone="info">
          Merci. Stripe finalise la vérification de ton compte : le statut peut mettre
          quelques minutes à passer au vert.
        </Alert>
      ) : null}

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : !stripeReady() ? (
        <Alert>
          Stripe n&apos;est pas configuré côté serveur (STRIPE_SECRET_KEY manquante).
        </Alert>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className={[
                "inline-block h-2.5 w-2.5 rounded-full",
                enabled ? "bg-brand" : connected ? "bg-amber-400" : "bg-line-4",
              ].join(" ")}
            />
            <span className="text-[14px] text-body">
              {enabled
                ? "Compte connecté et prêt à encaisser."
                : connected
                  ? "Compte connecté — vérification Stripe en cours."
                  : "Aucun compte Stripe connecté."}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!enabled ? (
              <form action={startStripeOnboarding}>
                <button
                  type="submit"
                  className="tap inline-flex h-11 items-center rounded-btn bg-brand px-5 font-plex font-semibold text-[15px] text-white hover:bg-brand-hover"
                >
                  {connected ? "Terminer la configuration Stripe" : "Connecter mon compte Stripe"}
                </button>
              </form>
            ) : (
              <form action={openStripeDashboard}>
                <button
                  type="submit"
                  className="tap inline-flex h-11 items-center rounded-btn border border-line-4 bg-surface px-5 font-plex font-semibold text-[15px] text-ink hover:border-ink"
                >
                  Ouvrir mon tableau de bord Stripe
                </button>
              </form>
            )}
          </div>

          <p className="text-[12px] text-muted-2">
            Tu seras redirigé vers Stripe pour renseigner tes informations (identité,
            IBAN). Tes clients pourront ensuite acheter tes offres depuis ta page publique.
          </p>
        </Card>
      )}
    </div>
  );
}
