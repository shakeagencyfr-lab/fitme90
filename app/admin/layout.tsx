import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { PwaInstall } from "@/components/pwa-install";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";
import { tenantNode } from "@/lib/hierarchy";
import { tenantFreezeState } from "@/lib/freeze";
import { tenantMonthlyAiUsage } from "@/lib/ai-cost";
import { parentDashboardBrand } from "@/lib/branding";
import { CoachFreezeBanner } from "@/components/coach-freeze-banner";

// Titre neutre : le dashboard est en marque blanche (marque du parent affichée
// dans le bandeau). On évite « FitMe90 » dans l'onglet du navigateur.
export const metadata = { title: "Espace admin" };

// Toutes les pages /admin/* passent par ce garde : accès réservé aux e-mails
// listés dans ADMIN_EMAILS. Sinon 404 (on ne révèle pas l'existence de l'espace).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();

  const tenantId = ctx.profile?.tenant_id ?? null;
  const [notifs, unread, node, freeze, aiUsage, parentBrand] = tenantId
    ? await Promise.all([
        listCoachNotifications(tenantId),
        unreadCoachNotifCount(tenantId),
        tenantNode(tenantId),
        tenantFreezeState(tenantId),
        tenantMonthlyAiUsage(tenantId),
        parentDashboardBrand(tenantId),
      ])
    : [[], 0, null, { frozen: false, status: null }, { costUsd: 0, calls: 0, sinceIso: "" }, null];
  const kind = node?.kind ?? "coach";

  return (
    <>
      <AdminShell
        notifs={notifs}
        unread={unread}
        email={ctx.email ?? ""}
        kind={kind}
        aiCostUsd={aiUsage.costUsd}
        aiCalls={aiUsage.calls}
        brandName={parentBrand?.name ?? null}
        brandLogoUrl={parentBrand?.logoUrl ?? null}
        brandColor={parentBrand?.brandColor ?? null}
      >
        {freeze.frozen ? <CoachFreezeBanner /> : null}
        {children}
      </AdminShell>
      {/* Invite à installer l'app (Android : invite native ; iOS : marche à suivre). */}
      <PwaInstall />
    </>
  );
}
