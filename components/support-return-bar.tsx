import { supportContext } from "@/lib/support-accounts";
import { SupportBanner } from "@/components/support-banner";

/**
 * Le bandeau affiché tant qu'on est connecté à la place de quelqu'un d'autre.
 *
 * Ce fichier ne fait plus que lire l'état côté serveur : tout ce qui se voit
 * est dans components/support-banner.tsx, qui sert aussi la pastille du menu
 * latéral. Deux emplacements, un seul rendu, une seule source de vérité.
 *
 * Deux situations, deux formulations. Un opérateur réseau est DANS un compte
 * qui n'est pas le sien et doit pouvoir en sortir ou en changer ; un coach
 * assiste son client pendant la séance et doit se rappeler à chaque instant
 * que ce qu'il tape est enregistré au nom de cette personne.
 */
export async function SupportReturnBar() {
  const ctx = await supportContext();
  if (!ctx) return null;
  return (
    <SupportBanner
      currentName={ctx.currentName}
      actorName={ctx.actorName}
      accounts={ctx.accounts}
      client={ctx.client}
    />
  );
}
