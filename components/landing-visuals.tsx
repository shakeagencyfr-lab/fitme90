/* ------------------------------------------------------------------ *
 * Visuels animés de la landing (3D en CSS pur, sans JS ni réseau).
 * Rendus côté serveur : les @keyframes vivent dans globals.css.
 * Chaque visuel dégrade proprement en réduit-mouvement (état initial lisible).
 * ------------------------------------------------------------------ */
import type { CSSProperties } from "react";

/** Grille de scan en perspective + points de détection pulsés. */
export function GridScan({ label }: { label?: string }) {
  const nodes = [
    { top: "38%", left: "22%", d: "0s" },
    { top: "54%", left: "64%", d: "0.6s" },
    { top: "30%", left: "72%", d: "1.2s" },
    { top: "66%", left: "40%", d: "1.8s" },
    { top: "46%", left: "48%", d: "2.4s" },
  ];
  return (
    <div
      className="relative overflow-hidden rounded-card-lg border border-white/10 bg-[#0d0e10]"
      style={{ aspectRatio: "4 / 3" }}
    >
      <div className="lv-grid-plane" />
      <div
        className="pointer-events-none absolute left-1/2 top-[58%] h-40 w-56 -translate-x-1/2 rounded-full bg-brand/25 blur-[70px]"
        style={{ animation: "lv-glow 3.5s ease-in-out infinite" }}
      />
      {nodes.map((n) => (
        <span key={n.top + n.left} className="absolute" style={{ top: n.top, left: n.left }}>
          <span
            className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-brand"
            style={{ animation: "lv-ping 2.6s ease-out infinite", animationDelay: n.d }}
          />
          <span className="block h-1 w-1 rounded-full bg-brand shadow-[0_0_8px_rgba(224,85,31,0.9)]" />
        </span>
      ))}
      {label ? (
        <div className="absolute inset-x-4 bottom-4">
          <div className="flex items-center gap-3 rounded-control border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-brand/70" style={{ animation: "lv-ping 2s ease-out infinite" }} />
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <span className="text-[13.5px] font-medium text-white/90">{label}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Aperçu 3D de l'espace client : carte flottante + minuteur + bulle coach. */
export function AppPreview() {
  const tasks = ["Développé couché", "Rowing haltère", "Gainage 45 s"];
  return (
    <div
      className="relative flex items-center justify-center rounded-card-lg border border-white/10 bg-[#0d0e10] p-6"
      style={{ aspectRatio: "4 / 3", perspective: "1000px" } as CSSProperties}
    >
      <div
        className="pointer-events-none absolute right-6 top-6 h-32 w-32 rounded-full bg-brand/25 blur-[60px]"
        style={{ animation: "lv-glow 4s ease-in-out infinite" }}
      />
      <div
        className="relative w-full max-w-[300px] rounded-card border border-white/12 bg-white/[0.05] p-5 backdrop-blur-sm"
        style={{ transformStyle: "preserve-3d", animation: "lv-tilt 7s ease-in-out infinite, lv-float 6s ease-in-out infinite" }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Séance du jour</span>
          <span className="h-2 w-2 rounded-full bg-brand" style={{ animation: "lv-glow 1.6s ease-in-out infinite" }} />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 100 100" className="h-16 w-16 -rotate-90">
              <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="37" fill="none" stroke="var(--color-brand)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray="232"
                style={{ animation: "lv-ringfill 3.2s ease-in-out infinite alternate" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-archivo text-[15px] font-bold text-white">45s</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-white">Minuteur de repos</span>
            <span className="text-[12px] text-white/50">Série 2 / 4 · 12 reps</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {tasks.map((t, i) => (
            <div key={t} className="flex items-center gap-2.5">
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] border border-brand/40 bg-brand/15 text-brand"
                style={{ animation: "lv-tick 3s ease-in-out infinite", animationDelay: `${i * 0.4}s` }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M5 12.5l4 4 10-10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[13px] text-white/75">{t}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand" style={{ animation: "lv-bar 4s ease-in-out infinite alternate" }} />
        </div>
      </div>

      <div
        className="absolute inset-x-6 bottom-5"
        style={{ animation: "lv-bubble 6s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-3 rounded-control border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-sm">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/15 text-brand">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v6A1.5 1.5 0 0 1 19 14.5H9l-4 3v-3A1.5 1.5 0 0 1 3.5 13V7A1.5 1.5 0 0 1 5 5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[12.5px] italic text-white/80">« Coach, puis-je remplacer le squat aujourd'hui ? »</span>
        </div>
      </div>
    </div>
  );
}

/** Anneau nutritionnel : donut de macros + pastilles en orbite. */
export function MacroOrbit() {
  const macros = [
    { label: "Protéines", pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
    { label: "Glucides", pos: "right-0 bottom-[22%] translate-x-1/2" },
    { label: "Lipides", pos: "left-0 bottom-[22%] -translate-x-1/2" },
  ];
  return (
    <div
      className="relative flex items-center justify-center rounded-card-lg border border-white/10 bg-[#0d0e10] p-6"
      style={{ aspectRatio: "4 / 3" }}
    >
      <div
        className="pointer-events-none absolute h-40 w-40 rounded-full bg-brand/20 blur-[70px]"
        style={{ animation: "lv-glow 4s ease-in-out infinite" }}
      />
      <div className="relative h-[230px] w-[230px] max-w-full">
        {/* Donut de macros */}
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background:
              "conic-gradient(var(--color-brand) 0 42%, #e6a06b 42% 70%, rgba(255,255,255,0.28) 70% 100%)",
            WebkitMask: "radial-gradient(closest-side, transparent 60%, #000 61%)",
            mask: "radial-gradient(closest-side, transparent 60%, #000 61%)",
            animation: "lv-spin 22s linear infinite",
          } as CSSProperties}
        />
        {/* Libellé central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-archivo text-[26px] font-extrabold leading-none tracking-[-0.03em] text-white">2580</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">kcal / jour</span>
        </div>
        {/* Orbite */}
        <div className="absolute inset-0" style={{ animation: "lv-spin 16s linear infinite" }}>
          {macros.map((m) => (
            <div key={m.label} className={`absolute ${m.pos}`}>
              <div
                className="flex items-center gap-1.5 rounded-pill border border-white/12 bg-black/70 px-2.5 py-1 backdrop-blur-sm"
                style={{ animation: "lv-spin-rev 16s linear infinite" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="text-[11px] font-medium text-white/85">{m.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
