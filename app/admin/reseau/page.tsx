import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listChildTenants } from "@/lib/hierarchy";
import { SITE_URL } from "@/lib/config";
import { Alert, Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Mes coachs, Admin FitMe90" };

export default async function AdminNetworkPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  let slug: string | null = null;
  let kind: "platform" | "reseller" | "coach" = "reseller";
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select("slug, kind")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string; kind: string | null }>();
    slug = data?.slug ?? null;
    kind = data?.kind === "platform" || data?.kind === "coach" ? data.kind : "reseller";
  }
  const isPlatform = kind === "platform";
  const children = tenantId ? await listChildTenants(tenantId) : [];
  const base = SITE_URL || "";
  const landingUrl = slug ? `${base}/r/${slug}` : null;
  // Un revendeur recrute des coachs (?r=<son slug>). La plateforme recrute des
  // revendeurs (page publique) et peut aussi rattacher un coach en direct.
  const inviteUrl = slug ? `${base}/inscription-coach?r=${slug}` : null;
  const resellerInviteUrl = `${base}/inscription-revendeur`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {isPlatform ? "Mon réseau" : "Mes coachs"}
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {isPlatform ? (
            <>
              Les revendeurs et coachs rattachés directement à la plateforme. Chacun gère son
              propre étage et te facture (ou non) selon son modèle. Partage les liens ci-dessous
              pour faire grandir l&apos;entonnoir.
            </>
          ) : (
            <>
              Les coachs et salles rattachés à ton réseau. Chacun gère ses propres clients ; toi tu
              définis leurs paliers et tu les factures sur ton compte Stripe.
            </>
          )}
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <>
          {/* Plateforme : recrutement des revendeurs (page publique). Un revendeur
              qui s'inscrit ici devient un enfant direct de la plateforme. */}
          {isPlatform ? (
            <Card className="flex flex-col gap-1.5">
              <MonoLabel>Inviter un revendeur</MonoLabel>
              <p className="text-[12.5px] leading-[1.6] text-muted-2">
                Partage ce lien à un distributeur / une enseigne. Il crée son espace revendeur
                (avec son propre e-mail), héberge ses coachs et encaisse sur son Stripe.
              </p>
              <code className="block overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink">
                {resellerInviteUrl}
              </code>
            </Card>
          ) : null}

          {/* Liens à partager : ta page de vente (marque blanche) et le lien
              d'inscription directe. Un coach qui passe par là rejoint ton réseau. */}
          {inviteUrl ? (
            <Card className="flex flex-col gap-3">
              {!isPlatform ? (
                <div className="flex flex-col gap-1.5">
                  <MonoLabel>Ta page de vente (marque blanche)</MonoLabel>
                  <p className="text-[12.5px] leading-[1.6] text-muted-2">
                    Ta landing à ta marque pour convaincre les coachs. Personnalise couleurs et logo
                    dans <Link href="/admin/integrations" className="text-brand hover:underline">Intégrations</Link>.
                  </p>
                  {landingUrl ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink">
                        {landingUrl}
                      </code>
                      <Link
                        href={`/r/${slug}`}
                        target="_blank"
                        className="tap inline-flex h-10 items-center rounded-btn border border-line-4 px-3.5 text-[13px] font-semibold text-body hover:border-ink"
                      >
                        Voir ↗
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <MonoLabel>{isPlatform ? "Rattacher un coach en direct" : "Lien d'inscription directe"}</MonoLabel>
                {isPlatform ? (
                  <p className="text-[12.5px] leading-[1.6] text-muted-2">
                    Pour un coach sans revendeur (facturé directement par la plateforme).
                  </p>
                ) : null}
                <code className="block overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink">
                  {inviteUrl}
                </code>
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Stat
                label={isPlatform ? "Comptes rattachés" : "Coachs / salles"}
                value={children.length}
              />
            </Card>
            <Card>
              <Stat label="Clients (réseau)" value={children.reduce((s, c) => s + c.clientCount, 0)} />
            </Card>
          </div>

          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-muted-2">
                    {[isPlatform ? "Compte" : "Coach / salle", "Adresse", "Clients", "Abonnement"].map((h) => (
                      <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {children.map((c) => (
                    <tr key={c.id} className="border-b border-line-2 last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 font-semibold text-ink">
                        <span className="flex items-center gap-2">
                          {c.name}
                          {isPlatform ? (
                            <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-2">
                              {c.kind === "reseller" ? "Revendeur" : "Coach"}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${c.kind === "reseller" ? "r" : "c"}/${c.slug}`}
                          target="_blank"
                          className="font-mono text-[12px] text-brand hover:underline"
                        >
                          /{c.kind === "reseller" ? "r" : "c"}/{c.slug}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-body">
                        {c.clientCount}
                        {c.clientLimit != null ? ` / ${c.clientLimit}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {c.subStatus === "active" || c.subStatus === "trialing" ? (
                          <span className="rounded-pill bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">Payant</span>
                        ) : (
                          <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-muted-2">Palier gratuit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {children.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted">
                        {isPlatform
                          ? "Aucun compte rattaché pour l'instant. Partage un lien d'invitation ci-dessus."
                          : "Aucun coach pour l'instant. Partage ton lien d'invitation ci-dessus."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink">{value}</div>
    </div>
  );
}
