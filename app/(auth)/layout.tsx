import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Link href="/" aria-label="Accueil FitMe90">
          <Wordmark />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
