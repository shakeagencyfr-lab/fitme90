import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { coachDashboard, resellerDashboard } from "@/lib/dashboard";
import { Alert } from "@/components/ui";
import { CoachView, NetworkView } from "@/components/dashboard-views";

export const metadata = { title: "Tableau de bord, Admin My Fitness App" };
export const dynamic = "force-dynamic";

/**
 * Tableau de bord chiffré.
 *
 * Deux lectures d'un même écran, parce que les deux métiers ne pilotent pas la
 * même chose : un coach ou une salle pilote des ventes et des clients, un
 * revendeur pilote un parc de comptes. Chacun a sa version, pas une vue
 * commune édulcorée qui n'aiderait ni l'un ni l'autre.
 */
export default async function AdminDashboardPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-archivo text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">
          {tx("Tableau de bord")}
        </h1>
        <Alert tone="info">{tx("Ce compte n'est rattaché à aucune plateforme.")}</Alert>
      </div>
    );
  }
  const node = await tenantNode(tenantId);
  if (node?.kind === "reseller" || node?.kind === "platform") {
    return <NetworkView d={await resellerDashboard(tenantId)} />;
  }
  return <CoachView d={await coachDashboard(tenantId)} />;
}
