import { getAdminOrNull } from "@/lib/admin";
import { listOffers } from "@/lib/offers";
import { listPromos } from "@/lib/promo";
import { listGiftCodes } from "@/lib/gift";
import { formatEuros } from "@/lib/config";
import { PromoForm } from "@/components/promo-form";
import { GiftGenerator } from "@/components/gift-generator";
import { togglePromo, removePromo } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Codes promo & cadeaux, Admin My Fitness App" };

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : null;

export default async function AdminCodesPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const [offers, promos, gifts] = tenantId
    ? await Promise.all([listOffers(tenantId), listPromos(tenantId), listGiftCodes(tenantId)])
    : [[], [], []];
  const oneTimeOffers = offers.filter((o) => o.billing_type !== "subscription");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Codes promo &amp; cadeaux
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Des codes promo (remise) sur tes offres à paiement unique, et des cartes cadeaux (accès offert). Les cadeaux
          achetés depuis ta page publique apparaissent aussi ici.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <>
          {/* ---- Codes promo ---- */}
          <section className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">Codes promo</div>
            {promos.length === 0 ? (
              <Alert tone="info">Aucun code promo. Crée le premier ci-dessous.</Alert>
            ) : (
              promos.map((p) => (
                <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold tracking-[0.08em] text-[15px] text-ink">{p.code}</span>
                      <span className="rounded-pill bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                        {p.discount_type === "percent" ? `-${p.discount_value} %` : `-${formatEuros(p.discount_value)}`}
                      </span>
                      {!p.active ? (
                        <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                          Inactif
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[12.5px] text-muted-2">
                      {p.used_count} utilisation{p.used_count > 1 ? "s" : ""}
                      {p.max_uses != null ? ` / ${p.max_uses}` : ""}
                      {p.expires_at ? ` · expire le ${fmtDate(p.expires_at)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={togglePromo}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={p.active ? "" : "on"} />
                      <button type="submit" className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
                        {p.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                    <form action={removePromo}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </Card>
              ))
            )}
            <PromoForm />
          </section>

          {/* ---- Cartes cadeaux ---- */}
          <section className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">Cartes cadeaux</div>
            <GiftGenerator offers={oneTimeOffers.map((o) => ({ id: o.id, name: o.name }))} />

            {gifts.length > 0 ? (
              <Card className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-muted-2">
                        {["Code", "Offre", "Origine", "Statut", "Créé"].map((h) => (
                          <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gifts.map((g) => (
                        <tr key={g.code} className="border-b border-line-2 last:border-0">
                          <td className="px-4 py-3 font-mono font-semibold tracking-[0.08em] text-ink">{g.code}</td>
                          <td className="px-4 py-3 text-body">{g.offer_name ?? "·"}</td>
                          <td className="px-4 py-3 text-muted">{g.kind === "gift_purchase" ? "Acheté" : "Offert"}</td>
                          <td className="px-4 py-3">
                            {g.used_by ? (
                              <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] text-muted-2">Utilisé</span>
                            ) : (
                              <span className="rounded-pill bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">Disponible</span>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted">{fmtDate(g.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
