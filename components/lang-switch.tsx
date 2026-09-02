"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import { useLocale } from "@/components/locale-provider";
import { LOCALES, type Locale } from "@/lib/i18n";

// Bascule FR / EN, compacte : deux pastilles. Le choix est un cookie (et le
// profil si la personne est connectée) ; la page se recharge côté serveur.
export function LangSwitch({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  function pick(l: Locale) {
    if (l === current || pending) return;
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  }
  return (
    <div
      role="group"
      aria-label="Language"
      className={[
        "inline-flex items-center rounded-pill border border-line-4 bg-surface p-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em]",
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
            l === current ? "bg-fill text-fillfg" : "text-muted-2 hover:text-ink",
          ].join(" ")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
