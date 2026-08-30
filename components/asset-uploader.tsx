"use client";

import { useActionState } from "react";
import { uploadAssetAction, removeAssetAction, type BrandingState } from "@/app/admin/actions";
import { Alert, MonoLabel } from "@/components/ui";
import type { AssetKind } from "@/lib/branding";

interface Props {
  kind: AssetKind;
  label: string;
  hint?: string;
  currentUrl: string | null;
  round?: boolean;
}

export function AssetUploader({ kind, label, hint, currentUrl, round }: Props) {
  const [state, action, pending] = useActionState(uploadAssetAction, {} as BrandingState);

  return (
    <div className="flex flex-col gap-2">
      <MonoLabel>{label}</MonoLabel>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={label}
            className={`h-14 w-14 border border-line-4 bg-surface-2 object-contain ${round ? "rounded-full" : "rounded-control"}`}
          />
        ) : (
          <div className={`flex h-14 w-14 items-center justify-center border border-dashed border-line-4 bg-surface-2 text-[10px] text-muted-2 ${round ? "rounded-full" : "rounded-control"}`}>
            vide
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="kind" value={kind} />
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
              required
              className="max-w-[190px] text-[12px] text-body file:mr-2 file:rounded-btn file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
            />
            <button
              type="submit"
              disabled={pending}
              className="tap rounded-btn border border-line-4 px-3 py-1.5 text-[12px] font-semibold text-body hover:border-ink disabled:opacity-50"
            >
              {pending ? "…" : "Envoyer"}
            </button>
          </form>
          {currentUrl ? (
            <form action={removeAssetAction}>
              <input type="hidden" name="kind" value={kind} />
              <button type="submit" className="text-[12px] text-muted-2 underline hover:text-ink">
                Retirer
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {hint ? <span className="text-[12px] text-muted-2">{hint}</span> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}
    </div>
  );
}
