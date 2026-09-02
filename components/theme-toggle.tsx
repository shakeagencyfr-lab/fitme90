"use client";

import { useT } from "@/components/locale-provider";

// Sélecteur de thème Clair / Sombre. Aucun état React : on écrit la classe
// .dark sur <html> + la préférence dans localStorage. L'onglet actif est mis en
// évidence purement en CSS via la variante `dark:` (pas de mismatch d'hydratation).
function apply(mode: "light" | "dark") {
  const el = document.documentElement;
  el.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem("theme", mode);
  } catch {
    /* stockage indisponible : la bascule reste effective pour la session */
  }
}

const SunIcon = (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const MoonIcon = (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
  </svg>
);

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={["inline-flex rounded-control border border-line-4 bg-surface-2 p-1", className ?? ""].join(" ")}>
      <button
        type="button"
        onClick={() => apply("light")}
        className="tap inline-flex items-center gap-2 rounded-[7px] px-3.5 py-2 text-[14px] font-semibold text-muted transition-colors bg-fill text-fillfg dark:bg-transparent dark:text-muted"
      >
        {SunIcon}
        {t("profile.light")}
      </button>
      <button
        type="button"
        onClick={() => apply("dark")}
        className="tap inline-flex items-center gap-2 rounded-[7px] px-3.5 py-2 text-[14px] font-semibold text-muted transition-colors dark:bg-fill dark:text-fillfg"
      >
        {MoonIcon}
        {t("profile.dark")}
      </button>
    </div>
  );
}
