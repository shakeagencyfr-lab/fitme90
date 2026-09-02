"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLandingTemplate, type TemplateState } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";
import type { LandingTemplate } from "@/lib/offers";

// Miniature d'aperçu d'un template (rendu CSS léger, pas d'iframe).
function Thumb({ variant, accent }: { variant: LandingTemplate; accent: string }) {
  const dark = variant === "onyx";
  const bg = dark ? "#0a0b0c" : variant === "volt" ? "#eeeee8" : variant === "sage" ? "#f7f2ea" : "#f6f4ef";
  const card = dark ? "rgba(255,255,255,0.06)" : "#ffffff";
  const line = dark ? "rgba(255,255,255,0.14)" : variant === "volt" ? "rgba(0,0,0,0.35)" : variant === "sage" ? "#e7dccd" : "rgba(0,0,0,0.10)";
  const ink = dark ? "rgba(255,255,255,0.92)" : "#1b1815";
  const soft = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";
  const r = variant === "volt" ? 2 : variant === "sage" ? 999 : 4;
  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-[10px] border" style={{ background: bg, borderColor: line, ["--r" as string]: `${r}px` }}>
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className="h-1.5 w-8 rounded-full" style={{ background: soft }} />
        <span className="h-3 w-8" style={{ background: accent, borderRadius: "var(--r)" }} />
      </div>
      <div className="px-2.5">
        <div className="h-2 w-[70%] rounded-full" style={{ background: ink, opacity: 0.85 }} />
        <div className="mt-1 h-1.5 w-[85%] rounded-full" style={{ background: soft }} />
        <div className="mt-1 h-1.5 w-[55%] rounded-full" style={{ background: soft }} />
        <div className="mt-2 flex gap-1.5">
          <span className="h-3.5 w-10" style={{ background: accent, borderRadius: "var(--r)" }} />
          <span className="h-3.5 w-8 border" style={{ borderColor: line, borderRadius: "var(--r)" }} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 pb-2.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 border" style={{ background: card, borderColor: line, borderRadius: variant === "sage" ? 10 : variant === "volt" ? 2 : 5 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const TEMPLATES: { key: LandingTemplate; name: string; desc: string }[] = [
  { key: "onyx", name: "Onyx", desc: "Sombre, premium, contrasté." },
  { key: "lumen", name: "Lumen", desc: "Clair, éditorial, aéré." },
  { key: "volt", name: "Volt", desc: "Énergique, contrasté, angles nets." },
  { key: "sage", name: "Sage", desc: "Doux, bien-être, serif et arrondi." },
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
                  <span className="font-archivo font-bold text-[15px] text-ink">{t.name}</span>
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
