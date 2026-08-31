import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { isShopEnabled, getShopProducts } from "@/lib/shop";
import { Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Boutique" };

export default async function ShopPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/shop");

  const [enabled, products] = await Promise.all([
    isShopEnabled(ctx.profile?.tenant_id ?? null),
    getShopProducts(),
  ]);
  if (!enabled) redirect("/app");

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Boutique
        </h1>
        <p className="text-[14px] text-muted">Une sélection de produits recommandés. Les achats se font sur la boutique partenaire.</p>
      </div>

      {products.length === 0 ? (
        <Card>
          <p className="text-[14px] text-muted">La sélection arrive bientôt.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const inner = (
              <>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.title} className="aspect-[4/3] w-full rounded-control object-cover" />
                ) : (
                  <div className="aspect-[4/3] w-full rounded-control bg-surface-2" />
                )}
                <div className="flex flex-col gap-1">
                  <div className="font-archivo font-semibold text-[16px] text-ink">{p.title}</div>
                  {p.description ? <p className="text-[13.5px] leading-[1.5] text-muted">{p.description}</p> : null}
                </div>
                {p.link_url ? (
                  <span className="mt-auto inline-flex w-fit items-center gap-1 text-[13.5px] font-semibold text-brand">
                    Voir le produit →
                  </span>
                ) : null}
              </>
            );
            return p.link_url ? (
              <a
                key={p.id}
                href={p.link_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="tap flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5 transition-colors hover:border-ink"
              >
                {inner}
              </a>
            ) : (
              <div key={p.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      <MonoLabel>Liens partenaires : une commission peut être perçue sur les achats.</MonoLabel>
    </div>
  );
}
