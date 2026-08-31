import type { CSSProperties } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import type { PublicBrand } from "@/lib/branding";

// Écran affiché à un client dont le coach est temporairement suspendu (défaut de
// paiement du coach auprès de son revendeur). L'accès reprend dès que le coach
// régularise. Aux couleurs du coach (marque blanche).
export function FrozenScreen({ brand }: { brand: PublicBrand | null }) {
  const name = brand?.name ?? "ton coach";
  const accentStyle = brand?.brandColor
    ? ({ ["--color-brand" as string]: brand.brandColor } as CSSProperties)
    : undefined;

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-5 py-10" style={accentStyle}>
      <div className="w-full max-w-[440px] rounded-card border border-line bg-surface p-8 text-center shadow-[0_10px_40px_rgba(23,25,27,0.08)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 10V8a6 6 0 0 1 12 0v2" />
            <rect x="4" y="10" width="16" height="10" rx="2" />
          </svg>
        </div>
        <h1 className="mt-5 font-archivo text-[22px] font-extrabold tracking-[-0.02em] text-ink">
          Espace momentanément en pause
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">
          L&apos;espace de {name} est temporairement suspendu. Ton programme et tes données sont
          bien conservés : l&apos;accès reprendra dès que {name} aura régularisé la situation.
        </p>
        <p className="mt-3 text-[13px] leading-[1.6] text-muted-2">
          Rien à faire de ton côté. Reviens un peu plus tard, ou reconnecte-toi pour vérifier.
        </p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="tap inline-flex h-11 items-center justify-center rounded-btn border border-line-4 bg-surface px-5 text-[14px] font-semibold text-ink hover:border-ink"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
