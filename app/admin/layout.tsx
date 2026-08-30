import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { Wordmark } from "@/components/brand";
import { AdminNav } from "@/components/admin-nav";
import { CoachBell } from "@/components/coach-bell";
import { PwaInstall } from "@/components/pwa-install";
import { signOutAction } from "@/app/(auth)/actions";
import { listCoachNotifications, unreadCoachNotifCount } from "@/lib/notifications";

export const metadata = { title: "Admin, FitMe90" };

// Toutes les pages /admin/* passent par ce garde : accès réservé aux e-mails
// listés dans ADMIN_EMAILS. Sinon 404 (on ne révèle pas l'existence de l'espace).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();

  const tenantId = ctx.profile?.tenant_id ?? null;
  const [notifs, unread] = tenantId
    ? await Promise.all([listCoachNotifications(tenantId), unreadCoachNotifCount(tenantId)])
    : [[], 0];

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-5 py-6 sm:px-8">
        <header className="flex flex-col gap-3 border-b border-line pb-3">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Wordmark size={20} />
              <span className="rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CoachBell notifs={notifs} unread={unread} />
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                  className="tap flex h-10 items-center gap-1.5 rounded-btn border border-line-4 bg-surface px-3 text-[13px] font-semibold text-body-2 hover:border-ink hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M15 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
                    <path d="M10 12h11m0 0-3-3m3 3-3 3" />
                  </svg>
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </form>
            </div>
          </div>
          {/* Onglets : menu hamburger sur mobile, bande d'onglets au-delà. */}
          <AdminNav />
        </header>
        {children}
      </div>
      {/* Invite à installer l'app (Android : invite native ; iOS : marche à suivre). */}
      <PwaInstall />
    </div>
  );
}
