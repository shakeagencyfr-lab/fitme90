import type { ReactNode } from "react";

/**
 * Aucun cadre ici, à dessein.
 *
 * Le cadre des pages d'authentification est rendu par `<AuthShell>`, que chaque
 * page appelle avec son slug. Une mise en page (layout) ne reçoit pas les
 * paramètres d'URL : si elle peignait le fond, le thème du coach se poserait
 * forcément plus bas, sur un élément trop étroit, et le motif d'arrière-plan
 * s'arrêterait au bord du formulaire.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
