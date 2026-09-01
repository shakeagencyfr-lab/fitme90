import { redirect } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { billingParentId } from "@/lib/hierarchy";
import { getWallet, listCreditPacks, clientUsesCredits } from "@/lib/credits";
import { verifyPackCheckout } from "@/lib/credit-billing";
import { BuyPackButton } from "@/components/buy-pack-button";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { creditPackContents } from "@/lib/config";
import type { CreditPack } from "@/lib/credits";

export const metadata = { title: "Crédits IA" };

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; annule?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) redirect("/admin");
  const sp = await searchParams;

  // Retour de paiement : on crédite le portefeuille (idempotent). Un pack
  // hybride ajoute les deux types en une seule fois.
  let justCredited: string | null = null;
  if (sp.session_id) {
    const r = await verifyPackCheckout(tenantId, sp.session_id);
    if (r.credited) justCredited = creditPackContents(r.aiCredits ?? 0, r.programCredits ?? 0);
  }

  const [wallet, credits, resellerId] = await Promise.all([
    getWallet(tenantId),
    clientUsesCredits(tenantId),
    billingParentId(tenantId),
  ]);
  const packs = resellerId ? (await listCreditPacks(resellerId)).filter((p) => p.is_active) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Crédits IA
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Recharge tes crédits pour faire tourner l&apos;IA de tes clients. 1 crédit IA = une action
          (chat, recette, exercice) ; 1 crédit programme = une génération de programme.
        </p>
      </div>

      {justCredited ? (
        <Alert tone="info">Paiement confirmé : {justCredited} ajoutés à ton solde.</Alert>
      ) : null}
      {sp.annule ? <Alert>Paiement annulé. Ton solde n&apos;a pas changé.</Alert> : null}

      {/* Solde */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <MonoLabel>Crédits IA</MonoLabel>
          <div className="mt-1 font-archivo text-[30px] font-extrabold leading-none tracking-[-0.02em] text-ink tabular-nums">
            {wallet.aiCredits}
          </div>
        </Card>
        <Card>
          <MonoLabel>Crédits programme</MonoLabel>
          <div className="mt-1 font-archivo text-[30px] font-extrabold leading-none tracking-[-0.02em] text-ink tabular-nums">
            {wallet.programCredits}
          </div>
        </Card>
      </div>

      {!credits ? (
        <Alert>
          Ton offre actuelle n&apos;utilise pas de crédits (tu es en formule abonnement / clé
          personnelle). Les crédits ne sont nécessaires que si ton revendeur fournit l&apos;IA.
        </Alert>
      ) : packs.length === 0 ? (
        <Alert>Ton revendeur n&apos;a pas encore mis de packs en vente. Contacte-le pour recharger.</Alert>
      ) : (
        <PackGroup packs={packs} />
      )}
    </div>
  );
}

function PackGroup({ packs }: { packs: CreditPack[] }) {
  if (packs.length === 0) return null;
  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="font-archivo font-bold text-[16px] text-ink">Packs disponibles</div>
      <div className="flex flex-col gap-2">
        {packs.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-control border border-line-4 bg-surface-2 px-4 py-3">
            <div>
              <div className="font-semibold text-ink">{p.name}</div>
              <div className="text-[13px] text-muted">
                {creditPackContents(p.ai_credits, p.program_credits)} ·{" "}
                <span className="text-body">{(p.price_cents / 100).toFixed(2)} €</span>
              </div>
            </div>
            <BuyPackButton packId={p.id} label={`${(p.price_cents / 100).toFixed(0)} €`} />
          </div>
        ))}
      </div>
    </Card>
  );
}
