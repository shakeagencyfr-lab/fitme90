"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import { useLocale } from "@/components/locale-provider";
import { LIVE_LOCALES, localeLabel, type Locale } from "@/lib/i18n";

// Bascule de langue : le code de la langue courante, et un menu avec les
// langues proposées, chacune dans sa propre langue. Le choix est un cookie (et
// le profil si la personne est connectée) ; la page se recharge côté serveur.
//
// Deux langues tenaient en deux pastilles ; à six, une rangée de codes
// devenait le premier élément visible de la barre, pour un réglage que presque
// personne ne touche. D'où le menu : un mot, et la liste au clic.
/**
 * `tone="dark"` : les landings sombres figent leur encre mais PAS les surfaces
 * du thème. Sans ce réglage, la bascule s'affichait en pastille blanche sur un
 * en-tête noir, comme un morceau d'interface collé par erreur.
 */
export function LangSwitch({ className = "", compact = false, tone = "auto" }: { className?: string; compact?: boolean; tone?: "auto" | "dark" }) {
  const ctxLocale = useLocale();
  // État local optimiste : le provider racine peut se rafraîchir un peu après
  // la page ; le libellé actif suit tout de suite le choix.
  const [picked, setPicked] = useState<{ base: Locale; value: Locale }>({ base: ctxLocale, value: ctxLocale });
  // Si le provider a changé depuis le dernier clic, il fait foi.
  const current = picked.base === ctxLocale ? picked.value : ctxLocale;
  const setCurrent = (l: Locale) => setPicked({ base: ctxLocale, value: l });
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function pick(l: Locale) {
    setOpen(false);
    if (l === current || pending) return;
    setCurrent(l);
    start(async () => {
      const res = await setLocaleAction(l);
      if (!res.ok) setCurrent(ctxLocale);
      router.refresh();
    });
  }

  const dark = tone === "dark";
  return (
    <div ref={root} className={["relative inline-flex", pending ? "opacity-60" : "", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localeLabel(current)}
        className={[
          "tap inline-flex items-center gap-1 font-mono uppercase transition-colors",
          compact
            ? ["px-0.5 text-[10px] tracking-[0.1em]", dark ? "text-white/70 hover:text-white" : "text-muted-2 hover:text-ink"].join(" ")
            : [
                "rounded-pill border px-2.5 py-1.5 text-[10.5px] tracking-[0.08em]",
                dark ? "border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]" : "border-line-4 bg-surface text-ink hover:border-ink",
              ].join(" "),
        ].join(" ")}
      >
        {current}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={open ? "rotate-180 transition-transform" : "transition-transform"}>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Language"
          className={[
            "absolute right-0 top-full z-50 mt-1.5 min-w-[150px] overflow-hidden rounded-control border py-1 shadow-lg",
            dark ? "border-white/15 bg-[#121316] text-white" : "border-line-4 bg-surface text-ink",
          ].join(" ")}
        >
          {LIVE_LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === current}>
              <button
                type="button"
                onClick={() => pick(l)}
                className={[
                  "tap flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px]",
                  l === current ? "font-semibold" : "",
                  dark ? "hover:bg-white/[0.08]" : "hover:bg-surface-2",
                ].join(" ")}
              >
                <span>{localeLabel(l)}</span>
                <span className={["font-mono text-[10px] uppercase tracking-[0.1em]", dark ? "text-white/45" : "text-muted-2"].join(" ")}>{l}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
