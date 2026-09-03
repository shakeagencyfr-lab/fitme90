"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import { useLocale } from "@/components/locale-provider";
import { LOCALES, type Locale } from "@/lib/i18n";

// Bascule FR / EN, compacte : deux pastilles. Le choix est un cookie (et le
// profil si la personne est connectée) ; la page se recharge côté serveur.
/**
 * `tone="dark"` : les landings sombres figent leur encre mais PAS les surfaces
 * du thème. Sans ce réglage, la bascule s'affichait en pastille blanche sur un
 * en-tête noir, comme un morceau d'interface collé par erreur.
 */
export function LangSwitch({ className = "", compact = false, tone = "auto" }: { className?: string; compact?: boolean; tone?: "auto" | "dark" }) {
  const ctxLocale = useLocale();
  // État local optimiste : le provider racine peut se rafraîchir un peu après
  // la page ; la pastille active suit tout de suite le choix.
  const [picked, setPicked] = useState<{ base: Locale; value: Locale }>({ base: ctxLocale, value: ctxLocale });
  // Si le provider a changé depuis le dernier clic, il fait foi.
  const current = picked.base === ctxLocale ? picked.value : ctxLocale;
  const setCurrent = (l: Locale) => setPicked({ base: ctxLocale, value: l });
  const router = useRouter();
  const [pending, start] = useTransition();
  function pick(l: Locale) {
    if (l === current || pending) return;
    setCurrent(l);
    start(async () => {
      const res = await setLocaleAction(l);
      if (!res.ok) setCurrent(ctxLocale);
      router.refresh();
    });
  }
  return (
    <div
      role="group"
      aria-label="Language"
      className={[
        "inline-flex items-center font-mono uppercase",
        // Compact : deux libellés séparés d'un point, sans cadre ni pastille
        // pleine. La version encadrée pesait autant que le bouton d'action et
        // devenait le deuxième élément le plus visible de la barre, pour un
        // réglage que presque personne ne touche.
        compact ? "gap-1 text-[10px] tracking-[0.1em]" : "rounded-pill border p-0.5 text-[10.5px] tracking-[0.08em]",
        compact ? "" : tone === "dark" ? "border-white/20 bg-white/[0.06]" : "border-line-4 bg-surface",
        pending ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      {LOCALES.map((l, i) => (
        <span key={l} className="inline-flex items-center">
        {compact && i > 0 ? <span className="mx-0.5 text-muted-2/50" aria-hidden>·</span> : null}
        <button
          type="button"
          onClick={() => pick(l)}
          aria-pressed={l === current}
          className={[
            "tap transition-colors",
            compact ? "px-0.5" : "rounded-pill px-2.5 py-1.5",
            compact
              ? l === current
                ? tone === "dark"
                  ? "font-semibold text-white"
                  : "font-semibold text-ink"
                : tone === "dark"
                  ? "text-white/35 hover:text-white/70"
                  : "text-muted-2 hover:text-ink"
              : tone === "dark"
                ? l === current
                  ? "bg-white text-[#0b0c0e]"
                  : "text-white/50 hover:text-white"
                : l === current
                  ? "bg-fill text-fillfg"
                  : "text-muted-2 hover:text-ink",
          ].join(" ")}
        >
          {l}
        </button>
        </span>
      ))}
    </div>
  );
}
