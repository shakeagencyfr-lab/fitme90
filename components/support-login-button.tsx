"use client";

import { supportLoginAs } from "@/app/admin/actions";

// Bouton « connexion d'assistance » : ouvre une vraie session dans le sous-compte
// pour le dépanner. Confirmation avant, car la session courante est remplacée
// (l'opérateur devra se reconnecter à son propre espace ensuite).
export function SupportLoginButton({ targetUserId, name }: { targetUserId: string; name: string }) {
  return (
    <form
      action={supportLoginAs}
      onSubmit={(e) => {
        if (
          !confirm(
            `Se connecter en assistance dans le compte « ${name} » ?\n\n` +
              `Tu vas ouvrir une session DANS ce compte. Pour revenir à ton espace, déconnecte-toi puis reconnecte-toi.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="target_user_id" value={targetUserId} />
      <button
        type="submit"
        className="tap inline-flex h-8 items-center rounded-btn border border-line-4 px-3 text-[12.5px] font-semibold text-body transition-colors hover:border-ink"
      >
        Assistance ↗
      </button>
    </form>
  );
}
