"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBranding, type BrandingState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import { AssetUploader } from "@/components/asset-uploader";
import type { Branding } from "@/lib/branding";

export function BrandingForm({ branding, namePlaceholder }: { branding: Branding; namePlaceholder: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBranding, {} as BrandingState);
  const [color, setColor] = useState(branding.brandColor ?? DEFAULT_BRAND_COLOR);
  const [aboutOn, setAboutOn] = useState(branding.aboutEnabled);

  // Rafraîchit la page (et l'aperçu live du studio marque blanche) après save.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Personnalisation</div>
        <p className="text-[13px] text-muted">Ton identité visuelle et tes textes sur la page publique.</p>
      </div>

      {/* Images (formulaires indépendants) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AssetUploader kind="logo" label="Logo" hint="PNG/SVG, fond transparent idéalement. Compressé automatiquement (3 Mo max)." currentUrl={branding.logoUrl} />
        <AssetUploader kind="favicon" label="Favicon" hint="Petite icône d'onglet (carré, PNG/ICO)." currentUrl={branding.faviconUrl} />
      </div>

      {/* Textes + couleur (un seul formulaire) */}
      <form action={action} className="flex flex-col gap-4 border-t border-line pt-5">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Titre principal</MonoLabel>
          <input
            type="text"
            name="headline"
            defaultValue={branding.headline ?? ""}
            maxLength={90}
            placeholder={namePlaceholder}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Accroche</MonoLabel>
          <textarea
            name="tagline"
            defaultValue={branding.tagline ?? ""}
            rows={2}
            maxLength={160}
            placeholder="Ex : Transforme ton corps en 12 semaines, encadré par un coach diplômé."
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Langue de tes clients</MonoLabel>
          <select
            name="language"
            defaultValue={branding.language}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink sm:max-w-[280px]"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
          <span className="text-[12px] text-muted-2">
            Langue par défaut de ta page publique, de l&apos;espace client et du coach IA. Chaque client peut ensuite basculer lui-même (FR / EN) ; l&apos;IA lui répond dans sa langue.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Couleur d&apos;accent</MonoLabel>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="brand_color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-control border border-line-4 bg-surface"
            />
            <span className="font-plex text-[14px] text-body">{color}</span>
          </div>
        </label>

        {/* Section « à propos » optionnelle */}
        <div className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="about_enabled"
              checked={aboutOn}
              onChange={(e) => setAboutOn(e.target.checked)}
              className="size-4 accent-brand"
            />
            <span className="font-semibold text-[14px] text-ink">Afficher une section « À propos »</span>
          </label>
          <p className="text-[12px] text-muted-2">
            Décochée, cette section n&apos;apparaît pas sur ta page.
          </p>

          {aboutOn ? (
            <div className="flex flex-col gap-3 pt-1">
              <AssetUploader kind="portrait" label="Photo portrait" currentUrl={branding.aboutPhotoUrl} round hint="Une photo de toi (JPG/PNG). Compressée automatiquement, aucune limite de taille à gérer." />
              <label className="flex flex-col gap-1.5">
                <MonoLabel>Titre de la section</MonoLabel>
                <input
                  type="text"
                  name="about_title"
                  defaultValue={branding.aboutTitle ?? ""}
                  maxLength={90}
                  placeholder="À propos de moi"
                  className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <MonoLabel>Ton texte</MonoLabel>
                <textarea
                  name="about_text"
                  defaultValue={branding.aboutText ?? ""}
                  rows={5}
                  maxLength={1200}
                  placeholder="Présente ton parcours, ta philosophie, tes diplômes…"
                  className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
                />
              </label>
            </div>
          ) : (
            <>
              <input type="hidden" name="about_title" value={branding.aboutTitle ?? ""} />
              <input type="hidden" name="about_text" value={branding.aboutText ?? ""} />
            </>
          )}
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Personnalisation enregistrée.</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
