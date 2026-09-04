import { redirect } from "next/navigation";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { billingParentId, tenantNode } from "@/lib/hierarchy";
import { getWallet, listCreditPacks, clientUsesCredits, listLedger, programCreditCost, creditPriceToday, type LedgerEntry } from "@/lib/credits";
import { CreditScale, CreditScaleNote } from "@/components/credit-scale";
import { verifyPackCheckout } from "@/lib/credit-billing";
import { BuyPackButton } from "@/components/buy-pack-button";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { creditPackContents } from "@/lib/config";
import type { CreditPack } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Crédits IA" };

/** Libellé lisible d'un mouvement du journal. */
function reasonLabel(r: string): string {
  switch (r) {
    case "purchase": return "Achat de pack";
    case "adjust": return "Ajustement";
    case "message": return "Message coach IA";
    case "recipe": return "Recette";
    case "alternative": return "Alternative d'exercice";
    case "guide": return "Fiche exercice";
    case "generate": return "Génération de programme";
    case "block": return "Bloc suivant du programme";
    default: return r;
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; annule?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) redirect("/admin");
  const sp = await searchParams;

  // Retour de paiement : on crédite le portefeuille (idempotent).
  let justCredited: number | null = null;
  if (sp.session_id) {
    const r = await verifyPackCheckout(tenantId, sp.session_id);
    if (r.credited && r.credits) justCredited = r.credits;
  }

  // Qui consomme des crédits ici ? Un coach dont le revendeur est en modèle
  // crédits, ou un revendeur qui achète ses crédits à la plateforme.
  const node = await tenantNode(tenantId);
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("ai_supply")
    .eq("id", tenantId)
    .maybeSingle<{ ai_supply: string | null }>();
  const isReseller = node?.kind === "reseller";
  const buysFromPlatform = isReseller && t?.ai_supply === "platform_credits";
  const [wallet, coachUsesCredits, supplierId, programCredits, ledger, unitCents] = await Promise.all([
    getWallet(tenantId),
    isReseller ? Promise.resolve(buysFromPlatform) : clientUsesCredits(tenantId),
    billingParentId(tenantId),
    programCreditCost(tenantId),
    listLedger(tenantId, 200),
    // Ce qu'un crédit lui coûte VRAIMENT : la moyenne de ses achats, sinon le
    // meilleur tarif qu'il obtiendrait aujourd'hui. Sans ce chiffre, un solde
    // en crédits ne veut rien dire.
    creditPriceToday(tenantId),
  ]);
  const usesCredits = coachUsesCredits;
  const packs = supplierId ? (await listCreditPacks(supplierId)).filter((p) => p.is_active) : [];
  const supplierLabel = isReseller ? "la plateforme" : "ton revendeur";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Crédits IA")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Un seul type de crédit, deux tarifs à retenir.")}{" "}
          {isReseller
            ? tx("Tes coachs te les achètent, tu les achètes à la plateforme.")
            : tx("Tu n'es débité que de ce que tes clients utilisent réellement.")}
        </p>
      </div>

      {/* Le barème avant tout le reste : un solde ne veut rien dire tant qu'on
          ne sait pas ce que coûte une action. */}
      <CreditScale programCredits={programCredits} unitCents={unitCents} />
      <CreditScaleNote programCredits={programCredits} unitCents={unitCents} />

      {justCredited ? (
        <Alert tone="info">{tx("Paiement confirmé :")} {creditPackContents(justCredited)} {tx("ajoutés à ton solde.")}</Alert>
      ) : null}
      {sp.annule ? <Alert>{tx("Paiement annulé. Ton solde n'a pas changé.")}</Alert> : null}

      <Card>
        <MonoLabel>{tx("Solde")}</MonoLabel>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`font-archivo text-[34px] font-extrabold leading-none tracking-[-0.02em] tabular-nums ${wallet.credits <= 0 ? "text-[#C4471A]" : "text-ink"}`}>
            {wallet.credits}
          </span>
          <span className="text-[13px] text-muted">{tx("crédit")}{wallet.credits > 1 ? "s" : ""} IA</span>
        </div>
        {/* Traduit le solde en ce qu'il permet de FAIRE : « 596 crédits » ne
            dit rien, « 596 actions ou 19 générations » se comprend. */}
        <p className="mt-2 text-[13px] leading-[1.6] text-muted">
          {wallet.credits < programCredits ? (
            <>
              {tx("Il en faut")} {programCredits} {tx("pour une génération de programme.")}
            </>
          ) : (
            <>
              {tx("De quoi couvrir")} <span className="text-body">{wallet.credits}</span>{" "}
              {wallet.credits > 1 ? tx("actions") : tx("action")}, {tx("ou")}{" "}
              <span className="text-body">{Math.floor(wallet.credits / Math.max(1, programCredits))}</span>{" "}
              {Math.floor(wallet.credits / Math.max(1, programCredits)) > 1
                ? tx("générations de programme")
                : tx("génération de programme")}.
            </>
          )}
        </p>
      </Card>

      {!usesCredits ? (
        <Alert>
          {isReseller
            ? "Tu fournis l'IA avec ta propre clé Anthropic : pas de crédits à acheter ici."
            : "Ton offre actuelle n'utilise pas de crédits (formule abonnement / clé personnelle). Les crédits ne sont nécessaires que si ton revendeur fournit l'IA."}
        </Alert>
      ) : packs.length === 0 ? (
        <Alert>{supplierLabel === "la plateforme" ? "La plateforme" : "Ton revendeur"} {tx("n'a pas encore mis de packs en vente. Contacte-le pour recharger.")}</Alert>
      ) : (
        <PackGroup packs={packs} />
      )}

      <Journal entries={ledger} />
    </div>
  );
}

function PackGroup({ packs }: { packs: CreditPack[] }) {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="font-archivo font-bold text-[16px] text-ink">{tx("Recharger")}</div>
      <div className="flex flex-col gap-2">
        {packs.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-control border border-line-4 bg-surface-2 px-4 py-3">
            <div>
              <div className="font-semibold text-ink">{p.name}</div>
              <div className="text-[13px] text-muted">
                {creditPackContents(p.credits)} · <span className="text-body">{(p.price_cents / 100).toFixed(2)} €</span>
                <span className="text-muted-2"> · {(p.price_cents / 100 / p.credits).toFixed(2)} {tx("€ le crédit")}</span>
              </div>
            </div>
            <BuyPackButton packId={p.id} label={`${(p.price_cents / 100).toFixed(0)} €`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Où passent les crédits : chaque mouvement avec sa date, son heure, son motif
 * et le client concerné. C'est la pièce comptable du coach.
 */
function Journal({ entries }: { entries: LedgerEntry[] }) {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="font-archivo font-bold text-[16px] text-ink">{tx("Détail de la consommation")}</div>
        <p className="text-[13px] text-muted">{tx("Les 200 derniers mouvements, du plus récent au plus ancien.")}</p>
      </div>
      {entries.length === 0 ? (
        <p className="text-[13px] text-muted-2">{tx("Aucun mouvement pour l'instant.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Date", "Crédits", "Action", "Client"].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.07em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-line-2 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">{fmtDate(e.createdAt)}</td>
                  <td className={`px-3 py-2 tabular-nums font-semibold ${e.delta > 0 ? "text-brand" : "text-ink"}`}>
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </td>
                  <td className="px-3 py-2 text-body">{reasonLabel(e.reason)}</td>
                  <td className="px-3 py-2 text-body">{e.clientName ?? <span className="text-muted-2">·</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
