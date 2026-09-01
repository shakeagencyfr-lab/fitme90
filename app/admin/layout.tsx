import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { PwaInstall } from "@/components/pwa-install";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";
import { tenantNode } from "@/lib/hierarchy";
import { tenantFreezeState } from "@/lib/freeze";
import { tenantMonthlyAiUsage } from "@/lib/ai-cost";
import { clientUsesCredits, getWallet } from "@/lib/credits";
import { parentDashboardBrand } from "@/lib/branding";
import { CoachFreezeBanner } from "@/components/coach-freeze-banner";

// Titre neutre : le dashboard est en marque blanche (marque du parent affichée
// dans le bandeau). On évite « My Fitness App » dans l'onglet du navigateur.
export const metadata = { title: "Espace admin" };

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
    : [[], 0, null, { frozen: false, status: null }, { costUsd: 0, calls: 0, sinceIso: "" }, null, false];
  const kind = node?.kind ?? "coach";

  // En modèle crédits, la carte du bandeau montre le solde restant plutôt qu'une
  // conso en dollars : ce coach ne paie pas Anthropic, il dépense des crédits.
  const bal = useCredits && tenantId ? await getWallet(tenantId) : null;
  const wallet = bal ? { ai: bal.aiCredits, program: bal.programCredits } : null;

  return (
    <>
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
        {freeze.frozen ? <CoachFreezeBanner /> : null}
        {children}
      </AdminShell>
      {/* Invite à installer l'app (Android : invite native ; iOS : marche à suivre). */}
      <PwaInstall />
    </>
  );
}
