"use client";

import { useActionState, useState } from "react";
import { saveBranding, type BrandingState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";

interface Props {
  brandColor: string | null;
  tagline: string | null;
  headline: string | null;
  namePlaceholder: string;
}

export function BrandingForm({ brandColor, tagline, headline, namePlaceholder }: Props) {
  const [state, action, pending] = useActionState(saveBranding, {} as BrandingState);
  const [color, setColor] = useState(brandColor ?? DEFAULT_BRAND_COLOR);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Personnalisation</div>
        <p className="text-[13px] text-muted">Ta couleur et tes textes sur la page publique.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Titre principal</MonoLabel>
          <input
            type="text"
            name="headline"
            defaultValue={headline ?? ""}
            maxLength={90}
            placeholder={namePlaceholder}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Accroche</MonoLabel>
          <textarea
            name="tagline"
            defaultValue={tagline ?? ""}
            rows={2}
            maxLength={160}
            placeholder="Ex : Transforme ton corps en 12 semaines, encadré par un coach diplômé."
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
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

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Personnalisation enregistrée.</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
