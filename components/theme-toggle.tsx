"use client";

// Bascule clair / sombre. Aucun état React : on lit/écrit directement la classe
// .dark sur <html> et la préférence dans localStorage. L'icône et le libellé
// s'échangent via la variante `dark:` (pas de risque d'hydratation).
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : la bascule reste effective pour la session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer le thème clair/sombre"
      className={[
        "tap inline-flex items-center gap-2.5 rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] font-semibold text-body transition-colors hover:border-ink",
        className ?? "",
      ].join(" ")}
    >
      {/* Lune (mode clair actif → proposer sombre) */}
      <span className="inline-flex items-center gap-2.5 dark:hidden">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
        </svg>
        Passer en mode sombre
      </span>
      {/* Soleil (mode sombre actif → proposer clair) */}
      <span className="hidden items-center gap-2.5 dark:inline-flex">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        Passer en mode clair
      </span>
    </button>
  );
}
