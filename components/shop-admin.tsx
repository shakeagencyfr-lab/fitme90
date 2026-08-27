"use client";

import { useActionState } from "react";
import {
  setShopEnabled,
  addShopProduct,
  deleteShopProduct,
  type ShopState,
} from "@/app/admin/actions";
import type { ShopProduct } from "@/lib/shop";
import { Card, Button, Alert, MonoLabel, Field, TextArea } from "@/components/ui";

export function ShopAdmin({ enabled, products }: { enabled: boolean; products: ShopProduct[] }) {
  const [tState, tAction, tPending] = useActionState(setShopEnabled, {} as ShopState);
  const [aState, aAction, aPending] = useActionState(addShopProduct, {} as ShopState);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">Boutique</h1>
        <p className="text-[14px] text-muted">
          Produits d&apos;affiliation mis en avant dans l&apos;app (compléments, matériel…). Chaque
          produit renvoie vers ta boutique externe. Tu peux activer ou désactiver la boutique.
        </p>
      </div>

      {/* Activation */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Activation</MonoLabel>
        <form action={tAction} className="flex items-center gap-4">
          <label className="flex items-center gap-2.5 text-[15px] text-ink">
            <input
              type="checkbox"
              name="shop_enabled"
              defaultChecked={enabled}
              className="size-4 accent-[var(--color-brand)]"
            />
            Boutique visible par les clients
          </label>
          <Button type="submit" loading={tPending} className="h-10">Enregistrer</Button>
        </form>
        {tState.ok ? <Alert tone="info">Réglage enregistré.</Alert> : null}
        {tState.error ? <Alert>{tState.error}</Alert> : null}
      </Card>

      {/* Ajout d'un produit */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Ajouter un produit</MonoLabel>
        <form action={aAction} className="flex flex-col gap-3">
          <Field name="title" label="Titre" placeholder="Whey isolate vanille" />
          <TextArea name="description" label="Description" placeholder="Protéine à digestion rapide, 24 g par dose…" rows={2} />
          <Field name="image_url" label="URL de l'image" placeholder="https://…/produit.jpg" />
          <Field name="link_url" label="Lien vers la boutique" placeholder="https://ma-boutique.com/whey" />
          <Field name="position" label="Ordre d'affichage (0 = en premier)" placeholder="0" />
          {aState.error ? <Alert>{aState.error}</Alert> : null}
          {aState.ok ? <Alert tone="info">Produit ajouté.</Alert> : null}
          <Button type="submit" loading={aPending} className="self-start h-11">Ajouter le produit</Button>
        </form>
      </Card>

      {/* Liste des produits */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Produits ({products.length})</MonoLabel>
        {products.length === 0 ? (
          <p className="text-[13.5px] text-muted-2">Aucun produit pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="size-12 shrink-0 rounded-control object-cover" />
                ) : (
                  <div className="size-12 shrink-0 rounded-control bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-archivo font-semibold text-[14px] text-ink">{p.title}</div>
                  <div className="truncate text-[12px] text-muted-2">{p.link_url || "sans lien"}</div>
                </div>
                <form action={deleteShopProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="tap rounded-control border border-alert-line bg-alert px-3 py-1.5 text-[13px] font-semibold text-alert-ink">
                    Supprimer
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
