import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachMark } from "@/components/brand";
import { publicResellerBySlug } from "@/lib/reseller";
import { DEFAULT_BRAND_COLOR, formatEuros } from "@/lib/config";
import type { Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  return { title: data ? `${data.reseller.name} — Ta plateforme de coaching` : "FitMe90" };
}

const INCLUDED = [
  "Une application marque blanche, à ton nom et tes couleurs",
  "Un coach IA entraîné sur ta méthode",
  "Des programmes 90 jours générés et adaptés à chaque client",
  "Nutrition, recettes et liste de courses automatiques",
  "Un chat VIP avec tes clients",
  "Paiements Stripe, CRM clients et notifications",
];

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function priceLine(p: Plan): string {
  const parts: string[] = [];
  if (p.price_month_cents != null) parts.push(`${formatEuros(p.price_month_cents)}/mois`);
  if (p.price_year_cents != null) parts.push(`${formatEuros(p.price_year_cents)}/an`);
  return parts.join(" ou ");
}

export default async function ResellerLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  if (!data) notFound();

  const { reseller, plans } = data;
  const accent = reseller.brandColor || DEFAULT_BRAND_COLOR;
  const title = reseller.headline || `Ta propre app de coaching, prête à vendre.`;
  const tagline =
    reseller.tagline ||
    `${reseller.name} met à ta disposition une plateforme de coaching complète, à ta marque. Tu gères tes clients, on s'occupe de la technique.`;
  const signup = `/inscription-coach?r=${reseller.slug}`;

  return (
    <div
      id="top"
      className="min-h-dvh scroll-smooth bg-[#0a0b0c] text-white [scrollbar-color:#333_#0a0b0c]"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
        } as CSSProperties
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b0c]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <span className="text-white [&_span]:text-white">
            <CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={22} imgClass="h-10 sm:h-12" />
          </span>
          <Link
            href={signup}
            className="tap inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover"
          >
            Créer mon espace
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-[900px] px-5 py-16 text-center sm:px-8 sm:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/15 px-3 py-1 text-[12px] text-white/70">
          <span className="size-1.5 rounded-full bg-brand" /> Proposé par {reseller.name}
        </span>
        <h1 className="mt-5 font-archivo text-[clamp(32px,7vw,56px)] font-extrabold leading-[1.03] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-[60ch] text-[16px] leading-[1.7] text-white/70">{tagline}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signup}
            className="tap inline-flex items-center justify-center gap-1.5 rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
          >
            Créer mon espace coach
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/55">
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> Premier client offert</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> Aucune ligne de code</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand" /> Ta marque, tes clients</span>
        </div>
      </section>

      {/* Inclus */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Tout inclus</span>
          <h2 className="mt-3 font-archivo text-[clamp(24px,4vw,34px)] font-extrabold tracking-[-0.02em]">
            Une plateforme complète, clé en main
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((f) => (
              <div key={f} className="flex items-start gap-3 rounded-card border border-white/10 bg-white/[0.02] p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span className="text-[15px] leading-[1.5] text-white/85">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarif */}
      <section id="formules" className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Tarif</span>
          <h2 className="mt-3 font-archivo text-[clamp(24px,4vw,34px)] font-extrabold tracking-[-0.02em]">
            Ton premier client est offert
          </h2>
          <p className="mx-auto mt-3 max-w-[54ch] text-[15px] leading-[1.6] text-white/65">
            Lance ton activité gratuitement. Tu passes à une formule quand tu accueilles ton deuxième client.
          </p>
        </div>

        {plans.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-[20px] border border-white/12 bg-white/[0.03] p-6">
                <div className="font-archivo text-[19px] font-bold">{p.name}</div>
                <div className="font-archivo text-[26px] font-extrabold tracking-[-0.02em] text-brand">
                  {priceLine(p)}
                </div>
                <div className="text-[14px] text-white/70">
                  {p.client_limit == null ? "Clients illimités" : `Jusqu'à ${p.client_limit} client${p.client_limit > 1 ? "s" : ""}`}
                </div>
                {p.setup_fee_cents > 0 ? (
                  <div className="text-[12.5px] text-white/50">+ {formatEuros(p.setup_fee_cents)} de mise en place (une fois)</div>
                ) : null}
                <Link
                  href={signup}
                  className="tap mt-2 inline-flex items-center justify-center rounded-btn bg-brand px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-hover"
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-[440px] rounded-[20px] border border-white/12 bg-white/[0.03] p-8 text-center">
            <div className="font-archivo text-[22px] font-extrabold">Premier client offert</div>
            <p className="mt-2 text-[14px] leading-[1.6] text-white/65">
              Crée ton espace et démarre. {reseller.name} te proposera ses formules dès que tu grandis.
            </p>
            <Link
              href={signup}
              className="tap mt-6 inline-flex items-center justify-center rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-brand-hover"
            >
              Créer mon espace coach
            </Link>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-2 px-5 py-10 text-center sm:px-8">
          <span className="text-white [&_span]:text-white">
            <CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={18} imgClass="h-8" />
          </span>
          <p className="text-[12.5px] text-white/45">
            Plateforme de coaching propulsée en marque blanche. Premier client offert, sans engagement.
          </p>
        </div>
      </footer>
    </div>
  );
}
