import type { CSSProperties } from "react";
import Link from "next/link";
import { brandForSlug } from "@/lib/branding";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import {
  buildMiniProgram, isGoal, isLevel, isEquipment, type Goal, type Level, type Equipment,
} from "@/lib/lead-magnet";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ta semaine découverte" };

export default async function ResultatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ n?: string; g?: string; l?: string; e?: string; d?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await brandForSlug(slug);
  const accent = brand?.brandColor || DEFAULT_BRAND_COLOR;
  const coachName = brand?.name || "ton coach";

  const goal: Goal = isGoal(sp.g ?? "") ? (sp.g as Goal) : "forme";
  const level: Level = isLevel(sp.l ?? "") ? (sp.l as Level) : "debutant";
  const equipment: Equipment = isEquipment(sp.e ?? "") ? (sp.e as Equipment) : "maison";
  const days = Math.max(2, Math.min(4, Number(sp.d ?? 3) || 3));
  const firstName = (sp.n ?? "").slice(0, 40);

  const prog = buildMiniProgram({ goal, level, days, equipment });

  return (
    <div
      className="min-h-dvh bg-paper"
      style={{ ["--color-brand" as string]: accent, ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)` } as CSSProperties}
    >
      {/* Barre d'action (masquée à l'impression) */}
      <div className="no-print sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <span className="text-[13.5px] text-muted">Ton programme est prêt 🎉</span>
          <PrintButton />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[820px] px-5 py-8 sm:px-8 sm:py-12">
        {/* En-tête document */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-brand pb-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Semaine découverte</span>
            <h1 className="font-archivo text-[clamp(22px,4vw,32px)] font-extrabold leading-tight tracking-[-0.02em] text-ink">
              {prog.title}
            </h1>
          </div>
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={coachName} className="h-12 w-auto max-w-[150px] object-contain" />
          ) : (
            <span className="font-archivo text-[16px] font-extrabold text-ink">{coachName}</span>
          )}
        </div>

        <p className="mt-5 text-[15px] leading-[1.6] text-body">
          {firstName ? `Bravo ${firstName} ! ` : "Bravo ! "}{prog.intro}
        </p>

        {/* Séances */}
        <div className="mt-8 flex flex-col gap-6">
          {prog.sessions.map((s) => (
            <section key={s.title} className="break-inside-avoid rounded-card border border-line bg-surface p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-line-2 pb-2">
                <h2 className="font-archivo text-[18px] font-bold tracking-[-0.01em] text-ink">{s.title}</h2>
                <span className="text-[12.5px] text-muted-2">{s.focus}</span>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                    <th className="pb-1.5 font-medium">Exercice</th>
                    <th className="pb-1.5 pl-2 font-medium">Séries</th>
                    <th className="pb-1.5 pl-2 font-medium">Reps</th>
                    <th className="pb-1.5 pl-2 font-medium">Repos</th>
                  </tr>
                </thead>
                <tbody>
                  {s.exercises.map((e) => (
                    <tr key={e.name} className="border-t border-line-2 text-[13.5px] text-body">
                      <td className="py-2 pr-2 font-medium text-ink">{e.name}</td>
                      <td className="py-2 pl-2 tabular-nums">{e.sets}</td>
                      <td className="py-2 pl-2">{e.reps}</td>
                      <td className="py-2 pl-2">{e.rest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        {/* Nutrition + conseils */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="break-inside-avoid rounded-card border border-line bg-surface p-5">
            <h3 className="mb-2 font-archivo text-[15px] font-bold text-ink">Nutrition</h3>
            <ul className="flex flex-col gap-1.5">
              {prog.nutrition.map((n) => (
                <li key={n} className="flex items-start gap-2 text-[13px] leading-snug text-body"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{n}</li>
              ))}
            </ul>
          </div>
          <div className="break-inside-avoid rounded-card border border-line bg-surface p-5">
            <h3 className="mb-2 font-archivo text-[15px] font-bold text-ink">Conseils</h3>
            <ul className="flex flex-col gap-1.5">
              {prog.tips.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] leading-snug text-body"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA (masqué à l'impression) */}
        <div className="no-print mt-8 flex flex-col items-center gap-3 rounded-card border border-brand/30 bg-brand/[0.06] p-6 text-center">
          <div className="font-archivo text-[18px] font-bold text-ink">Prêt·e à aller plus loin ?</div>
          <p className="max-w-[52ch] text-[14px] leading-[1.55] text-muted">
            Le programme complet s&apos;adapte à 100 % à ton profil et évolue avec toi, avec le suivi de {coachName}.
          </p>
          <Link href={`/c/${slug}`} className="tap mt-1 inline-flex h-11 items-center justify-center rounded-btn bg-brand px-6 text-[14.5px] font-semibold text-white hover:bg-brand-hover">
            Découvrir les programmes
          </Link>
        </div>

        <p className="mt-6 text-center text-[11.5px] leading-[1.5] text-muted-2">
          Accompagnement sportif et de bien-être, sans visée thérapeutique. En cas de douleur ou de pathologie, consulte un professionnel de santé.
        </p>
      </main>

      <style dangerouslySetInnerHTML={{ __html: "@media print { .no-print { display:none !important } body { background:#fff } }" }} />
    </div>
  );
}
