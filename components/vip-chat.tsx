"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendClientVipMessage } from "@/app/app/chat/actions";
import { sendCoachVipMessage } from "@/app/admin/actions";
import { Button, Alert } from "@/components/ui";
import type { VipMessage, VipSender } from "@/lib/vip";

// Compresse une image côté navigateur (canvas → WEBP) avant l'envoi. Images
// uniquement — aucune vidéo ni fichier lourd n'est accepté par l'input.
async function compressImage(file: File, maxDim = 1400): Promise<File> {
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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function VipChat({
  messages,
  me,
  clientId,
  emptyHint,
}: {
  messages: VipMessage[];
  me: VipSender;
  clientId?: string; // requis côté coach
  emptyHint: string;
}) {
  const router = useRouter();
  const action = me === "coach" ? sendCoachVipMessage : sendClientVipMessage;
  const [pending, start] = useTransition();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    setError("");
    setImage(f);
    setPreview(URL.createObjectURL(f));
  }

  function submit() {
    const body = textRef.current?.value.trim() ?? "";
    if (!body && !image) {
      setError("Écris un message ou ajoute une image.");
      return;
    }
    setError("");
    start(async () => {
      const fd = new FormData();
      fd.set("body", body);
      if (clientId) fd.set("client_id", clientId);
      if (image) {
        const compressed = await compressImage(image);
        fd.set("image", compressed);
      }
      const res = await action({}, fd);
      if (res.ok) {
        if (textRef.current) textRef.current.value = "";
        setImage(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(res.error ?? "Envoi impossible.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Fil */}
      <div className="flex min-h-[42vh] flex-col gap-2.5 rounded-card border border-line bg-surface p-4">
        {messages.length === 0 ? (
          <div className="m-auto max-w-[36ch] text-center text-[13.5px] leading-relaxed text-muted">{emptyHint}</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "flex max-w-[78%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5",
                    mine ? "bg-brand text-white" : "bg-surface-2 text-body border border-line-3",
                  ].join(" ")}
                >
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" className="max-h-[280px] w-full rounded-lg object-cover" />
                  ) : null}
                  {m.body ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.body}</p> : null}
                  <span className={`text-[10.5px] ${mine ? "text-white/70" : "text-muted-2"}`}>{fmtTime(m.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3.5">
        {preview ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Aperçu" className="max-h-28 rounded-lg border border-line-3 object-cover" />
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-ink text-[13px] text-paper"
              aria-label="Retirer l'image"
            >
              ×
            </button>
          </div>
        ) : null}

        <textarea
          ref={textRef}
          rows={2}
          maxLength={4000}
          placeholder="Écris ton message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full resize-none rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
        />

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex items-center justify-between gap-2">
          <label className="tap inline-flex cursor-pointer items-center gap-1.5 rounded-btn border border-line-4 bg-surface px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
              <circle cx="8.5" cy="9" r="1.6" />
              <path d="M4 17l4.5-4 3.5 3 3-2.5L20 16" />
            </svg>
            Photo
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} disabled={pending} className="hidden" />
          </label>
          <Button type="button" onClick={submit} loading={pending} className="h-10">
            Envoyer
          </Button>
        </div>
        <span className="text-[11px] text-muted-2">Texte et photos uniquement. ⌘/Ctrl + Entrée pour envoyer.</span>
      </div>
    </div>
  );
}
