import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { clientDisplayName } from "@/lib/display-name";
import { tx } from "@/lib/i18n/request";
import { affiliationConfig, coachAffiliationOverview } from "@/lib/affiliation";
import { AffiliationForm } from "@/components/affiliation-form";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Affiliation" };
export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default async function AdminAffiliationPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Affiliation")}</h1>
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  const [cfg, overview] = await Promise.all([
    affiliationConfig(tenantId),
    coachAffiliationOverview(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Affiliation")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Transforme tes clients en ambassadeurs. Ils partagent leur lien, tu suis les parrainages et tu récompenses ceux qui font grandir ton réseau.")}</p>
      </div>

      <AffiliationForm enabled={cfg.enabled} reward={cfg.reward} />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Parrainages")}</span>
          <span className="font-archivo text-[26px] font-extrabold text-ink">{overview.total}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Convertis")}</span>
          <span className="font-archivo text-[26px] font-extrabold text-brand">{overview.converted}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Statut")}</span>
          <span className="font-archivo text-[18px] font-extrabold text-ink">{cfg.enabled ? "Actif" : "Inactif"}</span>
        </Card>
      </div>

      {/* Détail */}
      <div className="flex flex-col gap-3">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Détail des parrainages")}</div>
        {overview.rows.length === 0 ? (
          <Alert tone="info">{tx("Aucun parrainage pour l'instant.")}</Alert>
        ) : (
          <Card className="flex flex-col gap-0 p-0">
            <div className="hidden grid-cols-[1fr_1fr_auto_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2 sm:grid">
              <span>{tx("Parrain")}</span><span>{tx("Filleul")}</span><span>{tx("Inscrit")}</span><span>{tx("Statut")}</span>
            </div>
            {overview.rows.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3 last:border-0 sm:grid sm:grid-cols-[1fr_1fr_auto_auto]">
                <span className="flex flex-col leading-tight">
                  {r.sponsorId ? (
                    <Link href={`/admin/clients/${r.sponsorId}`} className="text-[14px] font-semibold text-ink hover:text-brand hover:underline">
                      {clientDisplayName(r.sponsorName, r.sponsorEmail, tx("Parrain inconnu"))}
                    </Link>
                  ) : (
                    <span className="text-[14px] font-semibold text-ink">{tx("Parrain inconnu")}</span>
                  )}
                  {r.sponsorEmail ? <span className="text-[12px] text-muted-2">{r.sponsorEmail}</span> : null}
                </span>
                <span className="flex flex-col leading-tight">
                  <Link href={`/admin/clients/${r.referredId}`} className="text-[14px] text-body hover:text-brand hover:underline">
                    {clientDisplayName(r.referredName, r.referredEmail, tx("Nouveau client"))}
                  </Link>
                  {r.referredEmail ? <span className="text-[12px] text-muted-2">{r.referredEmail}</span> : null}
                </span>
                <span className="text-[12.5px] text-muted-2">{fmtDate(r.joinedAt)}</span>
                <span className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${r.converted ? "bg-brand/10 text-brand" : "border border-line-4 text-muted-2"}`}>
                  {r.converted ? "Converti" : "Inscrit"}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
