import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { SupportBanner, type SupportAccount } from "@/components/support-banner";

// Bac à sable du shell admin, sur le même principe que /dev/landing : il rend
// la barre latérale avec des données fictives, sans session ni base, pour
// pouvoir vérifier ses trois états (déployé, rail, coup d'oeil) dans un vrai
// navigateur. Désactivé sauf si LANDING_PREVIEW=1, donc jamais en production.
//
// Le bandeau d'assistance est rendu ici aussi : il ne se voit autrement
// qu'en étant réellement connecté à la place de quelqu'un, ce qui est
// coûteux à reproduire pour un simple coup d'oeil. Les formulaires pointent
// sur les vraies actions serveur, qui refuseront faute de session.
export const dynamic = "force-dynamic";

const COMPTES: SupportAccount[] = [
  { tenantId: "1", name: "Atlas Coaching", ownerUserId: "u1", email: "contact@atlas-coaching.fr", kind: "coach", suspended: false },
  { tenantId: "2", name: "Studio Nord", ownerUserId: "u2", email: "bonjour@studionord.fr", kind: "coach", suspended: false },
  { tenantId: "3", name: "Salle Vertika", ownerUserId: "u3", email: "gestion@vertika.fr", kind: "coach", suspended: true },
  { tenantId: "4", name: "Réseau Sud-Ouest", ownerUserId: "u4", email: "direction@rso.fr", kind: "reseller", suspended: false },
];

export default function DevShellPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  return (
    <>
      <SupportBanner currentName="Atlas Coaching" actorName="My Fitness App" accounts={COMPTES} client={false} />
      <AdminShell
        notifs={[]}
        unread={3}
        email="coach@exemple.com"
        kind="platform"
        aiCostUsd={0.64}
        aiCalls={37}
        support={{ currentName: "Atlas Coaching", accounts: COMPTES }}
      >
        <h1 className="font-archivo text-[26px] font-extrabold tracking-[-0.02em] text-ink">Contenu de démonstration</h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-muted">
          Cette page ne sert qu&apos;à photographier la barre latérale et le bandeau d&apos;assistance :
          replier, survoler le rail, épingler, ouvrir le sélecteur de compte.
        </p>
      </AdminShell>
    </>
  );
}
