import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { PwaInstall } from "@/components/pwa-install";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";
import { tenantNode } from "@/lib/hierarchy";
import { tenantFreezeState } from "@/lib/freeze";
import { tenantMonthlyAiUsage } from "@/lib/ai-cost";
import { clientUsesCredits, getWallet, resellerSupply } from "@/lib/credits";
import { parentDashboardBrand, platformBrand } from "@/lib/branding";
import type { Metadata } from "next";
import { CoachFreezeBanner } from "@/components/coach-freeze-banner";
import { SupportReturnBar } from "@/components/support-return-bar";

// Titre neutre : le dashboard est en marque blanche (marque du parent affichée
// dans le bandeau). L'icône d'onglet est le favicon du parent (celui chargé
// dans sa section « Marque blanche »), sinon celui de la plateforme.
export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const brand = (tenantId ? await parentDashboardBrand(tenantId) : null) ?? (await platformBrand());
  const meta: Metadata = { title: brand?.name ? `Espace admin, ${brand.name}` : "Espace admin" };
  if (brand?.faviconUrl) meta.icons = { icon: [{ url: brand.faviconUrl }], apple: [{ url: brand.faviconUrl }] };
  return meta;
}

// Toutes les pages /admin/* passent par ce garde : accès réservé aux e-mails
// listés dans ADMIN_EMAILS. Sinon 404 (on ne révèle pas l'existence de l'espace).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();

  const tenantId = ctx.profile?.tenant_id ?? null;
  const [notifs, unread, node, freeze, aiUsage, parentBrand, useCredits] = tenantId
    ? await Promise.all([
        listCoachNotifications(tenantId),
        unreadCoachNotifCount(tenantId),
        tenantNode(tenantId),
        tenantFreezeState(tenantId),
        tenantMonthlyAiUsage(tenantId),
        parentDashboardBrand(tenantId),
        clientUsesCredits(tenantId),
      ])
    : [[], 0, null, { frozen: false, status: null, suspended: false }, { costUsd: 0, calls: 0, sinceIso: "" }, null, false];
  const kind = node?.kind ?? "coach";

  // En modèle crédits, la carte du bandeau montre le solde restant plutôt qu'une
  // conso en dollars : ce coach ne paie pas Anthropic, il dépense des crédits.
  const buysFromPlatform = kind === "reseller" && tenantId ? (await resellerSupply(tenantId)) === "platform_credits" : false;
  const bal = (useCredits || buysFromPlatform) && tenantId ? await getWallet(tenantId) : null;
  const wallet = bal ? { credits: bal.credits } : null;

  return (
    <>
      <SupportReturnBar />
      <AdminShell
        notifs={notifs}
        unread={unread}
        email={ctx.email ?? ""}
        kind={kind}
        aiCostUsd={aiUsage.costUsd}
        aiCalls={aiUsage.calls}
        wallet={wallet}
        brandName={parentBrand?.name ?? null}
        brandLogoUrl={parentBrand?.logoUrl ?? null}
        brandColor={parentBrand?.brandColor ?? null}
      >
        {freeze.frozen ? <CoachFreezeBanner suspended={freeze.suspended} /> : null}
        {children}
      </AdminShell>
      {/* Invite à installer l'app (Android : invite native ; iOS : marche à suivre). */}
      <PwaInstall />
    </>
  );
}
