"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLandingTemplate, type TemplateState } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";
import { PREMIUM_TEMPLATES, type LandingTemplate } from "@/lib/landing-templates";

// Palette de chaque miniature, alignée sur le fond réel du template : le coach
// doit reconnaître ce qu'il a choisi en ouvrant sa page.
const SKIN: Record<LandingTemplate, { bg: string; dark: boolean; radius: number }> = {
  onyx: { bg: "#0a0b0c", dark: true, radius: 4 },
  lumen: { bg: "#f6f4ef", dark: false, radius: 4 },
  volt: { bg: "#0b0c0e", dark: true, radius: 0 },
  sage: { bg: "#f4f1ea", dark: false, radius: 999 },
  kinetic: { bg: "#08090b", dark: true, radius: 2 },
  aurora: { bg: "#faf8f4", dark: false, radius: 999 },
};

/** Miniature d'aperçu d'un template (rendu CSS léger, pas d'iframe). */
function Thumb({ variant, accent }: { variant: LandingTemplate; accent: string }) {
  const { bg, dark, radius } = SKIN[variant];
  const line = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
  const ink = dark ? "rgba(255,255,255,0.92)" : "#1b1815";
  const soft = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";
  const card = dark ? (variant === "volt" ? "#111316" : "rgba(255,255,255,0.06)") : "#ffffff";
  // Les templates premium se distinguent par le défilement latéral : la
  // miniature le montre avec une rangée de cartes qui sort du cadre, plus une
  // barre de progression de lecture pour kinetic.
  const premium = PREMIUM_TEMPLATES.includes(variant);
  const veil =
    variant === "aurora"
      ? "radial-gradient(120% 90% at 15% 0%, color-mix(in srgb, var(--tint) 22%, transparent), transparent 60%)"
      : variant === "kinetic"
        ? "radial-gradient(90% 70% at 80% 10%, color-mix(in srgb, var(--tint) 26%, transparent), transparent 65%)"
        : "none";
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] border"
      style={{ background: bg, borderColor: line, ["--r" as string]: `${radius}px`, ["--tint" as string]: accent }}
    >
      <div className="absolute inset-0" style={{ background: veil }} />
      {variant === "kinetic" ? (
        <span className="absolute left-0 top-0 h-[2px] w-[62%]" style={{ background: accent }} />
      ) : null}
      <div className="relative flex items-center justify-between px-2.5 py-2">
        <span className="h-1.5 w-8 rounded-full" style={{ background: soft }} />
        <span className="h-3 w-8" style={{ background: accent, borderRadius: "var(--r)" }} />
      </div>
      <div className="relative px-2.5">
        <div className="h-2 w-[70%] rounded-full" style={{ background: ink, opacity: 0.85 }} />
        <div className="mt-1 h-1.5 w-[85%] rounded-full" style={{ background: soft }} />
        <div className="mt-1 h-1.5 w-[55%] rounded-full" style={{ background: soft }} />
        <div className="mt-2 flex gap-1.5">
          <span className="h-3.5 w-10" style={{ background: accent, borderRadius: "var(--r)" }} />
          <span className="h-3.5 w-8 border" style={{ borderColor: line, borderRadius: "var(--r)" }} />
        </div>
      </div>
      {premium ? (
        <div className="relative mt-2 flex items-center gap-1.5 pb-2.5 pl-2.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-6 shrink-0 border"
              style={{
                width: i === 0 ? 34 : 30,
                background: card,
                borderColor: line,
                borderRadius: variant === "aurora" ? 12 : 3,
                opacity: 1 - i * 0.22,
              }}
            />
          ))}
          <svg viewBox="0 0 24 24" className="absolute bottom-[13px] right-[7px] h-3 w-3" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      ) : (
        <div className="relative mt-2 grid grid-cols-3 gap-1.5 px-2.5 pb-2.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 border" style={{ background: card, borderColor: line, borderRadius: variant === "sage" ? 14 : variant === "volt" ? 0 : 5 }} />
          ))}
        </div>
      )}
    </div>
  );
}

const TEMPLATES: { key: LandingTemplate; name: string; desc: string }[] = [
  { key: "onyx", name: "Onyx", desc: "Sombre, premium, contrasté." },
  { key: "lumen", name: "Lumen", desc: "Clair, éditorial, aéré." },
  { key: "volt", name: "Volt", desc: "Sombre et tranchant. Titres en capitales, rails horizontaux." },
  { key: "sage", name: "Sage", desc: "Clair et posé. Mise en page de revue, beaucoup d'air." },
  { key: "kinetic", name: "Kinetic", desc: "Sombre et spectaculaire. Sections qui défilent sur le côté, compteurs, relief au survol." },
  { key: "aurora", name: "Aurora", desc: "Clair et cinématique. Voiles en parallaxe et défilement latéral tout en douceur." },
];

export function TemplateSelector({ current, accent }: { current: LandingTemplate; accent: string }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveLandingTemplate, {} as TemplateState);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Template de page")}</div>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("Choisis la présentation de ta page publique. Ta marque (logo, couleurs, textes) s'applique quel que soit le template.")}</p>
      </div>

      <form action={action} className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const on = current === t.key;
          const premium = PREMIUM_TEMPLATES.includes(t.key);
          return (
            <button
              key={t.key}
              type="submit"
              name="template"
              value={t.key}
              disabled={pending}
              aria-pressed={on}
              className={[
                "tap group flex flex-col gap-2.5 rounded-card border p-3 text-left transition-all disabled:opacity-60",
                on ? "border-brand ring-2 ring-brand/25" : "border-line-4 hover:border-ink",
              ].join(" ")}
            >
              <Thumb variant={t.key} accent={accent} />
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="font-archivo font-bold text-[15px] text-ink">{t.name}</span>
                    {premium ? (
                      <span className="rounded-pill bg-brand/12 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-brand">
                        {tx("Animé")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-muted-2">{t.desc}</span>
                </div>
                <span
                  className={[
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-white",
                    on ? "border-brand bg-brand" : "border-line-4",
                  ].join(" ")}
                >
                  {on ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
              </div>
            </button>
          );
        })}
      </form>

      {state.error ? <Alert>{state.error}</Alert> : null}
    </Card>
  );
}
