"use client";

export function PrintButton({ label = "Enregistrer en PDF", className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className ?? "tap inline-flex h-11 items-center justify-center gap-2 rounded-btn bg-brand px-5 text-[14.5px] font-semibold text-white hover:bg-brand-hover"}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
      </svg>
      {label}
    </button>
  );
}
