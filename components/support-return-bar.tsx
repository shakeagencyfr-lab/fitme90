import { readSupportReturn } from "@/lib/support-return";
import { tx } from "@/lib/i18n/request";
import { returnFromSupport } from "@/app/admin/actions";

/**
 * Bandeau affiché tant qu'on est connecté à la place de quelqu'un d'autre.
 *
 * Deux situations, deux formulations. Un opérateur réseau est DANS un compte
 * qui n'est pas le sien et doit pouvoir en sortir ; un coach saisit POUR son
 * client pendant la séance et doit surtout se rappeler à chaque instant que ce
 * qu'il tape est enregistré au nom de cette personne. D'où le prénom en clair
 * plutôt qu'un simple « Assistance ».
 */
export async function SupportReturnBar() {
  const back = await readSupportReturn();
  if (!back) return null;
  const client = back.kind === "client";
  return (
    // Couleurs FIXES, pas les jetons de thème : `bg-ink` vaut #f3f2ef en thème
    // sombre, ce qui donnait du blanc sur blanc. Et `sticky` parce qu'un bandeau
    // d'assistance qui défile hors de l'écran laisse l'opérateur croire qu'il
    // est chez lui.
    <form
      action={returnFromSupport}
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-[#17191b] px-4 py-2 text-white shadow-[0_1px_0_rgba(255,255,255,.12)]"
    >
      <button type="submit" className="tap inline-flex items-center gap-2 text-[13.5px] font-semibold hover:underline">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
        {client ? tx("Terminer la saisie") : tx("Retour à mon espace")}
        {!client && back.actorName ? ` (${back.actorName})` : ""}
      </button>
      <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/60">
        {client
          ? `${tx("Tu saisis pour")} ${back.targetName || tx("ce client")}`
          : tx("Assistance")}
      </span>
    </form>
  );
}
