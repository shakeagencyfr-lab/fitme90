import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Admin, FitMe90" };

// Toutes les pages /admin/* passent par ce garde : accès réservé aux e-mails
// listés dans ADMIN_EMAILS. Sinon 404 (on ne révèle pas l'existence de l'espace).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-5 py-6 sm:px-8">
        <header className="flex flex-col gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <Wordmark size={20} />
            <span className="rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
              Admin
            </span>
          </div>
          {/* Onglets : bande défilable horizontalement sur mobile, pleine largeur au-delà. */}
          <nav className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-0.5 text-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
            {[
              ["/admin", "Clients"],
              ["/admin/chat", "Chat VIP"],
              ["/admin/offres", "Ma page"],
              ["/admin/abonnements", "Abonnements"],
              ["/admin/integrations", "Intégrations"],
              ["/admin/config", "Configuration IA"],
              ["/admin/shop", "Boutique"],
              ["/admin/notifications", "Notifications"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="tap shrink-0 rounded-btn px-3 py-1.5 font-medium text-body-2 hover:bg-surface-2 hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
