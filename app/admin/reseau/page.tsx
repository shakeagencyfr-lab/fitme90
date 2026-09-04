import Link from "next/link";
import { FROZEN_STATUSES } from "@/lib/freeze";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listChildTenants } from "@/lib/hierarchy";
import { SITE_URL } from "@/lib/config";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { CreateAccountForm } from "@/components/create-account-form";
import { NetworkActionsMenu } from "@/components/network-actions-menu";
import { canGiftCredits, supplyContexts } from "@/lib/network-admin";
import { listPlans } from "@/lib/plans";
import { GRANTED_STATUS } from "@/lib/tenant-billing";

export const metadata = { title: "Mon réseau, Admin My Fitness App" };
export const dynamic = "force-dynamic";

export default async function AdminNetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ assistance?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const sp = await searchParams;

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
  const isNetworkOperator = kind !== "coach";
  const children = tenantId ? await listChildTenants(tenantId) : [];
  const giftable = new Set(
    (await Promise.all(children.map(async (c) => ((tenantId && (await canGiftCredits(tenantId, c.id))) ? c.id : null)))).filter(Boolean) as string[],
  );
  // Bascule BYOK <-> crédits : réservée aux revendeurs, et donc au seul étage
  // qui leur vend l'IA. Un coach n'a pas de fourniture propre, elle découle du
  // modèle de son revendeur.
  const supplies = tenantId
    ? await supplyContexts(
        tenantId,
        children.filter((c) => c.kind === "reseller").map((c) => ({ id: c.id, aiSupply: c.aiSupply })),
      )
    : new Map();
  // Paliers que l'acteur peut POSER sur un compte de son réseau. Ce sont ses
  // propres paliers, ceux qu'il vend déjà : offrir revient à en donner un sans
  // le facturer, pas à inventer une capacité au cas par cas.
  const planChoices = tenantId
    ? (await listPlans(tenantId)).map((p) => ({ id: p.id, name: p.name, clientLimit: p.client_limit }))
    : [];
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
              {tx("Les revendeurs et coachs rattachés directement à la plateforme. Chacun gère son propre étage et te facture (ou non) selon son modèle. Partage les liens ci-dessous pour faire grandir l'entonnoir.")}</>
          ) : (
            <>
              {tx("Les coachs et salles rattachés à ton réseau. Chacun gère ses propres clients ; toi tu définis leurs paliers et tu les factures sur ton compte Stripe.")}</>
          )}
        </p>
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          {sp.assistance === "refus" ? (
            <Alert>{tx("Accès d'assistance refusé : ce compte n'est pas dans ton réseau.")}</Alert>
          ) : sp.assistance === "echec" ? (
            <Alert>{tx("Le lien de connexion d'assistance n'a pas pu être généré. Réessaie.")}</Alert>
          ) : null}

          {/* Plateforme : recrutement des revendeurs (page publique). Un revendeur
              qui s'inscrit ici devient un enfant direct de la plateforme. */}
          {isPlatform ? (
            <Card className="flex flex-col gap-1.5">
              <MonoLabel>{tx("Inviter un revendeur")}</MonoLabel>
              <p className="text-[12.5px] leading-[1.6] text-muted-2">
                {tx("Partage ce lien à un distributeur / une enseigne. Il crée son espace revendeur (avec son propre e-mail), héberge ses coachs et encaisse sur son Stripe.")}</p>
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
                  <MonoLabel>{tx("Ta page de vente (marque blanche)")}</MonoLabel>
                  <p className="text-[12.5px] leading-[1.6] text-muted-2">
                    {tx("Ta landing à ta marque pour convaincre les coachs. Personnalise couleurs et logo dans")} <Link href="/admin/integrations" className="text-brand hover:underline">{tx("Intégrations")}</Link>.
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
                        {tx("Voir ↗")}</Link>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <MonoLabel>{isPlatform ? "Rattacher un coach en direct" : "Lien d'inscription directe"}</MonoLabel>
                {isPlatform ? (
                  <p className="text-[12.5px] leading-[1.6] text-muted-2">
                    {tx("Pour un coach sans revendeur (facturé directement par la plateforme).")}</p>
                ) : null}
                <code className="block overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink">
                  {inviteUrl}
                </code>
              </div>
            </Card>
          ) : null}

          {/* Création manuelle d'un compte enfant + lien de connexion à copier. */}
          {isNetworkOperator ? <CreateAccountForm canCreateReseller={isPlatform} /> : null}

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Stat
                label={isPlatform ? "Comptes rattachés" : "Coachs / salles"}
                value={children.length}
              />
            </Card>
            <Card>
              <Stat label={tx("Clients (réseau)")} value={children.reduce((s, c) => s + c.networkClientCount, 0)} />
            </Card>
          </div>

          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-muted-2">
                    {[isPlatform ? "Compte" : "Coach / salle", "Adresse", "Clients", "Abonnement", "Actions"].map((h) => (
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
                          {c.suspendedAt || (c.subStatus && FROZEN_STATUSES.has(c.subStatus)) ? (
                            <span className="rounded-pill bg-[#C4471A]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[#C4471A]">
                              {c.suspendedAt ? tx("Désactivé") : tx("Impayé")}
                            </span>
                          ) : null}
                          {isPlatform ? (
                            <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-2">
                              {c.kind === "reseller" ? "Revendeur" : "Coach"}
                            </span>
                          ) : null}
                          {/* Qui paie l'IA de cet étage : visible d'un coup d'œil,
                              puisque c'est ce que la bascule du menu change. */}
                          {isPlatform && c.kind === "reseller" ? (
                            <span
                              className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${
                                c.aiSupply === "platform_credits" ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted-2"
                              }`}
                            >
                              {c.aiSupply === "platform_credits" ? "Crédits IA" : "Clé perso"}
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
                      {/* Un coach a des clients en direct, plafonnés par son palier.
                          Un revendeur n'en a aucun : les siens sont chez ses coachs.
                          Afficher son compte direct revenait à annoncer « 0 client »
                          à un revendeur qui en avait dans son réseau. */}
                      <td className="px-4 py-3 tabular-nums text-body">
                        {c.kind === "coach" ? (
                          <>
                            {c.clientCount}
                            {c.clientLimit != null ? ` / ${c.clientLimit}` : ""}
                          </>
                        ) : (
                          <span className="flex flex-col leading-tight">
                            <span>{c.networkClientCount}</span>
                            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
                              {c.childCount} {c.childCount > 1 ? tx("comptes") : tx("compte")}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* Trois états, pas deux : un palier OFFERT n'est ni un
                            abonnement payant ni le palier gratuit. */}
                        {c.subStatus === GRANTED_STATUS ? (
                          <span className="rounded-pill bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">{tx("Palier offert")}</span>
                        ) : c.subStatus === "active" || c.subStatus === "trialing" ? (
                          <span className="rounded-pill bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">{tx("Payant")}</span>
                        ) : (
                          <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-muted-2">{tx("Palier gratuit")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <NetworkActionsMenu
                          tenantId={c.id}
                          name={c.name}
                          ownerUserId={c.ownerUserId}
                          suspended={!!c.suspendedAt}
                          canGift={giftable.has(c.id)}
                          supply={supplies.get(c.id) ?? null}
                          plans={planChoices}
                          currentPlanId={c.planId}
                          planGranted={c.subStatus === GRANTED_STATUS}
                        />
                      </td>
                    </tr>
                  ))}
                  {children.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
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
