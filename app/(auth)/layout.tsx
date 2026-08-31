import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Le bandeau de marque (logo du coach ou My Fitness App) est rendu par chaque page
  // via <CoachBrandHeader>, pour pouvoir l'adapter au coach (marque blanche).
  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <main className="flex-1 flex items-center justify-center px-5 pb-12 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))]">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
