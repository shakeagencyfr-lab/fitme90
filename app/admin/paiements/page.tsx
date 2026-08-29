import { getAdminOrNull } from "@/lib/admin";
import { tenantStripeStatus } from "@/lib/coach-payments";
import { StripeKeyForm } from "@/components/stripe-key-form";
import { Alert } from "@/components/ui";

export const metadata = { title: "Paiements, Admin FitMe90" };

export default async function AdminPaymentsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const status = tenantId
    ? await tenantStripeStatus(tenantId)
    : { configured: false, hint: null, encryptionReady: false };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Paiements
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Connecte ton compte Stripe pour encaisser tes clients. Tu utilises{" "}
          <span className="text-body">ta propre clé Stripe</span> : les paiements arrivent
          directement chez toi, sans intermédiaire et sans commission.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <StripeKeyForm
          configured={status.configured}
          hint={status.hint}
          encryptionReady={status.encryptionReady}
        />
      )}
    </div>
  );
}
