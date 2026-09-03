import { readSupportReturn } from "@/lib/support-return";
import { tx } from "@/lib/i18n/request";
import { returnFromSupport } from "@/app/admin/actions";

// Bandeau affiché en haut du dashboard quand l'opérateur est connecté en
// assistance dans un sous-compte : un clic le ramène à son propre espace.
export async function SupportReturnBar() {
  const back = await readSupportReturn();
  if (!back) return null;
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
        {tx("Retour à mon espace")}{back.actorName ? ` (${back.actorName})` : ""}
      </button>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/60">{tx("Assistance")}</span>
    </form>
  );
}
