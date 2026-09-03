import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";

// Bac à sable du shell admin, sur le même principe que /dev/landing : il rend
// la barre latérale avec des données fictives, sans session ni base, pour
// pouvoir vérifier ses trois états (déployé, rail, coup d'oeil) dans un vrai
// navigateur. Désactivé sauf si LANDING_PREVIEW=1, donc jamais en production.
export const dynamic = "force-dynamic";

export default function DevShellPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <AdminShell notifs={[]} unread={3} email="coach@exemple.com" kind="platform" aiCostUsd={0.64} aiCalls={37}>
      <h1 className="font-archivo text-[26px] font-extrabold tracking-[-0.02em] text-ink">Contenu de démonstration</h1>
      <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-muted">
        Cette page ne sert qu&apos;à photographier la barre latérale : replier, survoler le rail, épingler.
      </p>
    </AdminShell>
  );
}
