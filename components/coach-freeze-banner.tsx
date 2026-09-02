import Link from "next/link";

// Bandeau affiché en haut du dashboard coach quand son compte est gelé (défaut
// de paiement auprès de son revendeur). Ses clients sont suspendus tant qu'il
// n'a pas régularisé depuis « Mon abonnement ».
export function CoachFreezeBanner({ suspended = false }: { suspended?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-card border border-alert-line bg-alert p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <div className="flex flex-col gap-0.5">
          <div className="font-archivo font-bold text-[14.5px] text-alert-ink">
            {suspended ? "Compte désactivé" : "Compte suspendu : paiement en échec"}
          </div>
          <p className="text-[13px] leading-[1.5] text-body">
            {suspended
              ? "Ton compte a été désactivé par ton fournisseur. Tes clients n'ont plus accès à leur espace. Tes données et les leurs sont conservées : contacte ton fournisseur pour le réactiver."
              : "Ton abonnement n'a pas pu être prélevé. Tes clients n'ont plus accès à leur espace tant que la situation n'est pas régularisée. Tes données et les leurs sont conservées."}
          </p>
        </div>
      </div>
      {suspended ? null : (
      <Link
        href="/admin/abonnement"
        className="tap inline-flex h-10 shrink-0 items-center justify-center rounded-btn bg-brand px-4 text-[13.5px] font-semibold text-white hover:bg-brand-hover"
      >
        Régulariser
      </Link>
      )}
    </div>
  );
}
