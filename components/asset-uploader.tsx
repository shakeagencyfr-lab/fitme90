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

// Dimension max (px) selon l'usage — on compresse côté client pour que n'importe
// quelle photo passe sans dépasser la limite serveur.
const MAX_DIM: Record<AssetKind, number> = { portrait: 1200, logo: 700, favicon: 256 };

/**
 * Redimensionne + compresse une image côté navigateur (canvas → WEBP). SVG et
 * ICO sont renvoyés tels quels (déjà légers / non rasterisables proprement).
 */
async function compressImage(file: File, maxDim: number): Promise<File> {
  if (file.type === "image/svg+xml" || file.type.includes("icon")) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
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
    start(async () => {
      const compressed = await compressImage(file, MAX_DIM[kind]);
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", compressed);
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
