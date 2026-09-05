"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePhrase } from "@/components/locale-provider";
import { formatEuros } from "@/lib/config";
import type { Plan } from "@/lib/plans";

/**
 * Le prix d'un palier sur une page de vente, et la bascule mensuel / annuel.
 *
 * La bascule n'apparaît que si AU MOINS UN palier a les deux prix : sinon
 * elle promettrait un choix qui n'existe pas. Et un palier qui n'a qu'un prix
 * l'affiche tel quel, quelle que soit la position de la bascule : un prix qui
 * disparaît quand on change d'onglet se lit comme un palier qui disparaît.
 *
 * Les gabarits de landing sont des composants serveur : la bascule vit ici,
 * dans un contexte, pour que chaque gabarit garde sa mise en page et n'ait
 * qu'à poser trois balises.
 */
type Interval = "month" | "year";

const Ctx = createContext<{ interval: Interval; setInterval: (i: Interval) => void; both: boolean }>({
  interval: "month",
  setInterval: () => {},
  both: false,
});

function hasBoth(p: Plan): boolean {
  return p.price_month_cents != null && p.price_year_cents != null;
}

export function PricingProvider({ plans, children }: { plans: Plan[]; children: ReactNode }) {
  const [interval, setInterval] = useState<Interval>("month");
  const both = plans.some(hasBoth);
  return <Ctx.Provider value={{ interval, setInterval, both }}>{children}</Ctx.Provider>;
}

/** La bascule, rendue seulement quand elle a un sens. `tone` suit le fond du gabarit. */
export function PricingSwitch({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const tx = usePhrase();
  const { interval, setInterval, both } = useContext(Ctx);
  if (!both) return null;
  const frame = tone === "dark" ? "border-white/15 bg-white/[0.04]" : "border-black/10 bg-black/[0.03]";
  const on = tone === "dark" ? "bg-white text-[#0a0b0c]" : "bg-ink text-white";
  const off = tone === "dark" ? "text-white/60 hover:text-white" : "text-ink/60 hover:text-ink";
  return (
    <div
      role="group"
      aria-label={tx("Périodicité de facturation")}
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${frame} ${className}`}
    >
      {(["month", "year"] as const).map((i) => (
        <button
          key={i}
          type="button"
          aria-pressed={interval === i}
          onClick={() => setInterval(i)}
          className={`tap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${interval === i ? on : off}`}
        >
          {i === "month" ? tx("Mensuel") : tx("Annuel")}
        </button>
      ))}
    </div>
  );
}

/**
 * Le prix d'un palier pour la périodicité choisie, avec son suffixe. Un
 * palier à prix unique ignore la bascule.
 */
export function PlanPrice({ plan, className = "", subClassName = "" }: { plan: Plan; className?: string; subClassName?: string }) {
  const tx = usePhrase();
  const { interval } = useContext(Ctx);
  const monthOnly = plan.price_month_cents != null && plan.price_year_cents == null;
  const yearOnly = plan.price_year_cents != null && plan.price_month_cents == null;
  const showYear = yearOnly || (!monthOnly && interval === "year");
  const cents = showYear ? plan.price_year_cents : plan.price_month_cents;
  if (cents == null) return <span className={className}>{tx("Sur mesure")}</span>;
  const perMonth = showYear ? Math.round(cents / 12) : null;
  return (
    <span className="flex flex-col">
      <span className={className}>
        {formatEuros(cents)}
        {showYear ? tx("/an") : tx("/mois")}
      </span>
      {perMonth != null ? (
        <span className={subClassName}>{tx("soit")} {formatEuros(perMonth)}{tx("/mois")}</span>
      ) : null}
    </span>
  );
}

/**
 * La carte du palier gratuit, première de la grille quand le vendeur le
 * propose. Elle dit ce qu'on obtient sans payer, pour de vrai : un client, et
 * les crédits de départ quand l'IA est fournie en crédits.
 */
export function FreePlanCard({
  plan,
  href,
  tone = "dark",
  className = "",
}: {
  plan: Plan;
  href: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const tx = usePhrase();
  const text = tone === "dark" ? "text-white" : "text-ink";
  const muted = tone === "dark" ? "text-white/70" : "text-ink/70";
  const faint = tone === "dark" ? "text-white/45" : "text-ink/45";
  return (
    <div className={`flex flex-col gap-4 rounded-[24px] border border-brand/40 bg-gradient-to-b from-brand/[0.14] to-transparent p-7 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`font-archivo text-[20px] font-bold ${text}`}>{plan.name}</span>
        <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
          {tx("Offert")}
        </span>
      </div>
      <div>
        <span className="font-archivo text-[30px] font-extrabold tracking-[-0.02em] text-brand">0 €</span>
      </div>
      <div className={`text-[14px] ${muted}`}>{tx("Ton premier client, offert")}</div>
      {plan.ai_supply === "credits" && plan.starter_credits > 0 ? (
        <div className={`text-[13px] ${muted}`}>
          + {plan.starter_credits.toLocaleString("fr-FR")} {tx("crédits IA offerts pour démarrer")}
        </div>
      ) : null}
      <div className={`text-[12.5px] ${faint}`}>{tx("Sans carte bancaire. Tu passes à une formule quand tu grandis.")}</div>
      <Link
        href={href}
        className="tap mt-auto inline-flex items-center justify-center rounded-btn bg-brand px-5 py-3.5 text-[14.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]"
      >
        {tx("Démarrer gratuitement")}
      </Link>
    </div>
  );
}
