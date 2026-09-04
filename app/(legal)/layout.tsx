import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Link href="/" aria-label="Accueil My Fitness App">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[760px] px-5 py-10 sm:px-8">
        <div className="mb-8 rounded-control border border-alert-line bg-alert px-4 py-3 text-[13px] leading-relaxed text-alert-ink">
          <strong>Brouillon.</strong> Ce texte est un modèle de départ à faire
          relire et compléter par un juriste avant toute mise en ligne. My Fitness App
          vend de l'accompagnement lié à la santé : la responsabilité n'est pas
          théorique.
        </div>
        <article className="legal flex flex-col gap-4">{children}</article>
        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-5 text-[13px] text-muted-2">
          <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
          <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
          <Link href="/cgv" className="hover:text-ink">CGV</Link>
          <Link href="/ia" className="hover:text-ink">Transparence IA</Link>
          <Link href="/" className="hover:text-ink">Accueil</Link>
        </nav>
      </main>
    </div>
  );
}
