import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmGiftPurchase } from "@/lib/gift";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import { GiftCodeReveal } from "@/components/gift-code-reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merci, ton cadeau est prêt" };

export default async function GiftThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, slug, brand_color")
    .eq("slug", slug)
    .maybeSingle<{ id: string; name: string; slug: string; brand_color: string | null }>();
  if (!tenant) notFound();

  const accent = tenant.brand_color || DEFAULT_BRAND_COLOR;
  const result = session_id ? await confirmGiftPurchase(tenant.id, session_id) : { ok: false, error: "Session manquante." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redeemUrl = `${site}/inscription?c=${slug}`;

  return (
    <div
      className="min-h-dvh bg-[#0a0b0c] text-white"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
        } as CSSProperties
      }
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-7 px-5 py-14 sm:py-20">
        {result.ok && result.code ? (
          <>
            <header className="flex flex-col gap-3">
              <span className="w-fit rounded-pill border border-brand/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
                Paiement confirmé
              </span>
              <h1 className="font-archivo text-[clamp(28px,6vw,42px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Merci, ton cadeau est prêt
              </h1>
              <p className="text-[15px] leading-[1.6] text-white/65">
                Voici le code cadeau pour <span className="text-white">{result.offerName ?? "le programme offert"}</span>.
                Transmets-le à la personne de ton choix.
              </p>
            </header>

            <GiftCodeReveal code={result.code} />

            <div className="rounded-card border border-white/10 bg-white/[0.03] p-5">
              <div className="font-archivo font-bold text-[15px] text-white">Comment l&apos;utiliser</div>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-[1.6] text-white/65">
                <li>La personne crée son compte sur la page du coach.</li>
                <li>Au moment de débloquer son programme, elle clique sur « J&apos;ai un code cadeau ».</li>
                <li>Elle saisit ce code : son accompagnement est débloqué, sans paiement.</li>
              </ol>
              <Link
                href={redeemUrl}
                className="tap mt-4 inline-flex h-11 items-center justify-center rounded-btn bg-brand px-5 text-[14px] font-semibold text-white hover:bg-brand-hover"
              >
                Lien d&apos;inscription du coach
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-archivo text-[clamp(26px,6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
              Paiement en cours de vérification
            </h1>
            <p className="text-[15px] leading-[1.6] text-white/65">
              {result.error === "Paiement non confirmé."
                ? "Ton paiement n'est pas encore confirmé. Si tu viens de payer, recharge cette page dans quelques secondes."
                : "Nous n'avons pas pu récupérer ton cadeau. Recharge la page, ou réessaie."}
            </p>
            <Link href={`/c/${slug}/offrir`} className="text-[14px] font-semibold text-brand hover:underline">
              ← Revenir à la page cadeau
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
