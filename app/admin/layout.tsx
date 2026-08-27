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
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Wordmark size={20} />
            <span className="rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
              Admin
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
            <Link href="/admin" className="font-medium text-body-2 hover:text-ink">Clients</Link>
            <Link href="/admin/config" className="font-medium text-body-2 hover:text-ink">Configuration IA</Link>
            <Link href="/admin/shop" className="font-medium text-body-2 hover:text-ink">Boutique</Link>
            <Link href="/app" className="font-medium text-muted-2 hover:text-ink">← Retour à l&apos;app</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
