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
        "inline-flex items-center rounded-pill border p-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
        tone === "dark" ? "border-white/20 bg-white/[0.06]" : "border-line-4 bg-surface",
        pending ? "opacity-60" : "",
        className,
      ].join(" ")}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-pressed={l === current}
          className={[
            "tap rounded-pill transition-colors",
            compact ? "px-2 py-1" : "px-2.5 py-1.5",
            tone === "dark"
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
      ))}
    </div>
  );
}
