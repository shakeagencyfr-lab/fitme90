import "server-only";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantKeyStatus } from "@/lib/tenant";
import { coachPathUrl } from "@/lib/config";

// Onboarding coach : liste de démarrage affichée sur le dashboard tant que
// l'espace n'est pas configuré (clé IA, marque, première offre). Se complète
// automatiquement et disparaît une fois les 3 étapes faites.

type Step = { key: string; done: boolean; title: string; desc: string; href: string; cta: string };

export async function CoachOnboarding({ tenantId }: { tenantId: string }) {
  const admin = createAdminClient();
  const [key, tenantRes, offersRes] = await Promise.all([
    tenantKeyStatus(tenantId),
    admin
      .from("tenants")
      .select("slug, brand_color, logo_url")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string | null; brand_color: string | null; logo_url: string | null }>(),
    admin.from("offers").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  const tenant = tenantRes.data;
  const steps: Step[] = [
    {
      key: "ai",
      done: key.configured,
      title: "Connecte ton IA",
      desc: "Renseigne ta clé Anthropic : l'IA tourne sur ta clé, tu gardes la main sur tes coûts.",
      href: "/admin/config",
      cta: "Configuration IA",
    },
    {
      key: "brand",
      done: !!(tenant?.brand_color || tenant?.logo_url),
      title: "Personnalise ta marque",
      desc: "Ton logo, ta couleur, ton adresse : tes clients ne voient que toi.",
      href: "/admin/offres",
      cta: "Ma page",
    },
    {
      key: "offer",
      done: (offersRes.count ?? 0) > 0,
      title: "Crée ta première offre",
      desc: "Le programme ou l'abonnement que tes clients achèteront.",
      href: "/admin/offres",
      cta: "Créer une offre",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // espace configuré : on masque

  const shareUrl = coachPathUrl(tenant?.slug);

  return (
    <section className="flex flex-col gap-4 rounded-card border border-brand/30 bg-brand/[0.05] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-archivo font-extrabold text-[18px] leading-tight text-ink">
            Bienvenue. Configure ton espace
          </span>
          <span className="text-[13px] text-muted">Trois étapes pour être prêt à vendre.</span>
        </div>
        <span className="rounded-pill bg-brand px-2.5 py-1 font-mono text-[11px] font-bold text-white">
          {doneCount}/{steps.length}
        </span>
      </div>

      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={[
              "flex items-center gap-3 rounded-control border p-3.5",
              s.done ? "border-line-2 bg-surface/60" : "border-line-4 bg-surface",
            ].join(" ")}
          >
            <span
              className={[
                "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold",
                s.done ? "bg-brand/15 text-brand" : "border border-line-4 bg-surface-2 text-muted-2",
              ].join(" ")}
            >
              {s.done ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={["text-[14.5px] font-semibold", s.done ? "text-muted line-through" : "text-ink"].join(" ")}>
                {s.title}
              </span>
              {!s.done ? <span className="text-[12.5px] leading-snug text-muted">{s.desc}</span> : null}
            </div>
            {!s.done ? (
              <Link
                href={s.href}
                className="tap shrink-0 rounded-btn bg-fill px-3.5 py-2 text-[13px] font-semibold text-fillfg transition-transform hover:opacity-90 active:scale-95"
              >
                {s.cta}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>

      {shareUrl ? (
        <p className="text-[12.5px] text-muted-2">
          Ta page publique : <span className="font-mono text-muted">{shareUrl}</span> — partage-la à tes clients une fois prêt.
        </p>
      ) : null}
    </section>
  );
}
