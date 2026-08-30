"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadAsset, removeAsset } from "@/app/admin/actions";
import { Alert, MonoLabel } from "@/components/ui";
import type { AssetKind } from "@/lib/branding";

interface Props {
  kind: AssetKind;
  label: string;
  hint?: string;
  currentUrl: string | null;
  round?: boolean;
}

// Upload AUTOMATIQUE dès qu'une image est choisie (aucun bouton « Envoyer »).
// N'utilise pas de <form> : appelle directement l'action serveur, ce qui évite
// aussi le bug de <form> imbriqué qui cassait l'upload du portrait.
export function AssetUploader({ kind, label, hint, currentUrl, round }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setError("");
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    start(async () => {
      const res = await uploadAsset(fd);
      if (res?.error) setError(res.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function onRemove() {
    setError("");
    start(async () => {
      const res = await removeAsset(kind);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const shape = round ? "rounded-full" : "rounded-control";

  return (
    <div className="flex flex-col gap-2">
      <MonoLabel>{label}</MonoLabel>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={label} className={`h-16 w-16 border border-line-4 bg-surface-2 object-contain ${shape}`} />
        ) : (
          <div className={`flex h-16 w-16 items-center justify-center border border-dashed border-line-4 bg-surface-2 text-[10px] text-muted-2 ${shape}`}>
            {pending ? "…" : "vide"}
          </div>
        )}
        <div className="flex flex-col items-start gap-1.5">
          <label className="tap cursor-pointer rounded-btn bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover">
            {pending ? "Envoi…" : currentUrl ? "Remplacer" : "Choisir une image"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
              onChange={onPick}
              disabled={pending}
              className="hidden"
            />
          </label>
          {currentUrl ? (
            <button type="button" onClick={onRemove} disabled={pending} className="text-[12px] text-muted-2 underline hover:text-ink disabled:opacity-50">
              Retirer
            </button>
          ) : null}
        </div>
      </div>
      {hint ? <span className="text-[12px] text-muted-2">{hint}</span> : null}
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
