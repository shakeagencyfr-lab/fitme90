import { getAdminOrNull } from "@/lib/admin";
import { tenantKeyStatus } from "@/lib/tenant";
import { ByokForm } from "@/components/byok-form";
import { Alert } from "@/components/ui";

export const metadata = { title: "Compte, Admin FitMe90" };

export default async function AdminAccountPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const status = tenantId
    ? await tenantKeyStatus(tenantId)
    : { configured: false, hint: null, encryptionReady: false };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Compte
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Les réglages propres à ton compte coach/salle. Ta clé Anthropic (BYOK) alimente toute
          l&apos;IA de tes clients : génération de programmes, recettes et coach.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <ByokForm
          configured={status.configured}
          hint={status.hint}
          encryptionReady={status.encryptionReady}
        />
      )}
    </div>
  );
}
