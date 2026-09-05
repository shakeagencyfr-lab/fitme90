import { notFound } from "next/navigation";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale, tx } from "@/lib/i18n/request";
import { resolveLocale, tenantLocale } from "@/lib/i18n/server";
import { getAdminOrNull } from "@/lib/admin";
import { AdminShell } from "@/components/admin-shell";
import { PwaInstall } from "@/components/pwa-install";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";
import { tenantNode } from "@/lib/hierarchy";
import { tenantFreezeState } from "@/lib/freeze";
import { tenantMonthlyAiUsage } from "@/lib/ai-cost";
import { getWallet } from "@/lib/credits";
import { costViewOf } from "@/lib/cost-view";
import { parentDashboardBrand, platformBrand } from "@/lib/branding";
import type { Metadata } from "next";
import { CoachFreezeBanner } from "@/components/coach-freeze-banner";
import { tenantAiReady, readinessMessage } from "@/lib/ai-readiness";
import { tenantStripeStatus } from "@/lib/coach-payments";
import { SupportReturnBar } from "@/components/support-return-bar";

// Titre neutre : le dashboard est en marque blanche (marque du parent affichée
// dans le bandeau). L'icône d'onglet est le favicon du parent (celui chargé
// dans sa section « Marque blanche »), sinon celui de la plateforme.
export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const brand = (tenantId ? await parentDashboardBrand(tenantId) : null) ?? (await platformBrand());
  // Le titre d'onglet porte la marque du PARENT (revendeur pour un coach,
  // plateforme pour un revendeur), jamais un nom en dur : chaque page ne
  // donne que son propre mot, le gabarit ajoute la marque.
  const espace = brand?.name ? `Espace admin, ${brand.name}` : "Espace admin";
  const meta: Metadata = { title: { default: espace, template: `%s, ${espace}` } };
  if (brand?.faviconUrl) meta.icons = { icon: [{ url: brand.faviconUrl }], apple: [{ url: brand.faviconUrl }] };
  return meta;
}

// Toutes les pages /admin/* passent par ce garde : accès réservé aux e-mails
// listés dans ADMIN_EMAILS. Sinon 404 (on ne révèle pas l'existence de l'espace).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();

  const tenantId = ctx.profile?.tenant_id ?? null;
  const [notifs, unread, node, freeze, aiUsage, parentBrand, view] = tenantId
    ? await Promise.all([
        listCoachNotifications(tenantId),
        unreadCoachNotifCount(tenantId),
        tenantNode(tenantId),
        tenantFreezeState(tenantId),
        tenantMonthlyAiUsage(tenantId),
        parentDashboardBrand(tenantId),
        costViewOf(tenantId),
      ])
    : [[], 0, null, { frozen: false, status: null, suspended: false }, { costUsd: 0, calls: 0, credits: 0, supplierCredits: 0, sinceIso: "" }, null, "usd" as const];
  const kind = node?.kind ?? "coach";
  // Un coach ne doit pas pouvoir promettre ce que son espace ne livrera pas :
  // sans IA au bout de sa chaîne de fourniture, le programme ne se générera
  // pas après le paiement.
  const venteBloquee =
    kind === "coach" && tenantId
      ? readinessMessage({
          aiReady: await tenantAiReady(tenantId),
          chargesEnabled: (await tenantStripeStatus(tenantId)).configured,
        })
      : null;
  // Langue du dashboard : choix de la personne (cookie), sinon langue du tenant.
  const locale = await resolveLocale(await tenantLocale(tenantId));
  setRequestLocale(locale);

  // Un compte qui achète des crédits voit son solde dans le bandeau, jamais
  // une conso en dollars : ce chiffre-là contiendrait la marge de son
  // fournisseur. La règle est dans lib/ai-supply, appliquée par costViewOf.
  const bal = view === "credits" && tenantId ? await getWallet(tenantId) : null;
  const wallet = bal ? { credits: bal.credits } : null;

  return (
    <LocaleProvider locale={locale}>
      <SupportReturnBar />
      <AdminShell
        notifs={notifs}
        unread={unread}
        email={ctx.email ?? ""}
        kind={kind}
        aiCostUsd={aiUsage.costUsd}
        aiCalls={aiUsage.calls}
        aiView={view}
        wallet={wallet}
        brandName={parentBrand?.name ?? null}
        brandLogoUrl={parentBrand?.logoUrl ?? null}
        brandLogoDarkUrl={parentBrand?.logoDarkUrl ?? null}
        brandTheme={parentBrand?.theme ?? null}
      >
        {freeze.frozen ? <CoachFreezeBanner suspended={freeze.suspended} /> : null}
        {/* Ce qui empêche de vendre, dit avant que le coach le découvre par un
            client mécontent. Masqué pour un revendeur ou la plateforme : ils ne
            vendent pas de programmes. */}
        {kind === "coach" && !freeze.frozen && venteBloquee ? (
          <div className="mb-5 flex flex-col gap-1.5 rounded-card border border-alert-line bg-alert p-4">
            <span className="font-archivo font-bold text-[15px] text-alert-ink">
              {tx("Tes offres ne sont pas encore en vente")}
            </span>
            <p className="text-[13.5px] leading-relaxed text-alert-ink">{venteBloquee}</p>
          </div>
        ) : null}
        {children}
      </AdminShell>
      {/* Invite à installer l'app (Android : invite native ; iOS : marche à suivre). */}
      <PwaInstall />
    </LocaleProvider>
  );
}
