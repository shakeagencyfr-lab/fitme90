"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  image?: string; // aperçu (data URL) pour la bulle utilisateur
}

type Attached = { data: string; media_type: "image/jpeg"; preview: string };

// — Web Speech API (dictée vocale) : typage minimal, sans `any`. -----------
interface SpeechResultList {
  readonly length: number;
  [i: number]: { readonly isFinal: boolean; [j: number]: { transcript: string } };
}
interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
function newRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      resolve(im);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    im.src = url;
  });
}

// Coach flottant : accessible depuis tout l'espace client (README).
// Texte + photo (vision) + dictée vocale. Monté uniquement si le coach est
// activé (avant J90) — le layout ne le rend pas au-delà.
export function CoachWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Salut. Pose-moi une question sur ta séance, un exercice, une substitution ou un repas — tu peux aussi m'envoyer une photo (repas, machine) ou dicter à la voix.",
    },
  ]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<Attached | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const img = await loadImage(file);
      const max = 1024;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const cx = canvas.getContext("2d");
      if (!cx) throw new Error("canvas");
      cx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const b64 = dataUrl.split(",")[1] ?? "";
      setImage({ data: b64, media_type: "image/jpeg", preview: dataUrl });
    } catch {
      setError("Image illisible. Essaie une autre photo.");
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = newRecognition();
    if (!rec) {
      setError("La dictée vocale n'est pas supportée par ce navigateur.");
      return;
    }
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? input + " " : "";
    rec.onresult = (e) => {
      let s = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        s += e.results[i][0].transcript;
      }
      setInput((base + s).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function send() {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    if (listening) recRef.current?.stop();
    setError("");
    const outText = text || "Peux-tu regarder cette image ?";
    const sent = image;
    setInput("");
    setImage(null);
    setMessages((m) => [...m, { role: "user", content: outText, image: sent?.preview }]);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: outText,
          image: sent ? { data: sent.data, media_type: sent.media_type } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      const list: string[] = Array.isArray(data.messages)
        ? data.messages
        : [data.answer].filter(Boolean);
      for (let i = 0; i < list.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 650));
        setMessages((m) => [...m, { role: "assistant", content: list[i] }]);
      }
      if (data.adapted) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le coach est indisponible.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex items-center gap-2.5 rounded-pill bg-fill px-5 py-3.5 text-fillfg shadow-[0_6px_20px_rgba(23,25,27,0.22)] transition-transform hover:scale-[1.03] active:scale-95 nav:bottom-6"
        aria-label="Ouvrir le coach"
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4FBF6A] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#4FBF6A]" />
        </span>
        <span className="font-plex font-semibold text-[15px]">Coach</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface nav:inset-auto nav:bottom-6 nav:right-6 nav:max-h-[70dvh] nav:w-[380px] nav:rounded-card nav:border nav:border-line">
      <div className="safe-top flex items-center justify-between border-b border-line px-4 py-3">
        <div className="font-archivo font-semibold text-[15px] text-ink">Coach FitMe90</div>
        <button onClick={() => setOpen(false)} className="tap text-muted-2" aria-label="Fermer">
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] self-end rounded-card bg-fill px-3.5 py-2.5 text-[14px] text-fillfg"
                : "max-w-[90%] self-start rounded-card bg-paper px-3.5 py-2.5 text-[14px] leading-relaxed text-body"
            }
          >
            {m.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.image}
                alt="Photo envoyée"
                className="mb-2 max-h-40 w-full rounded-control object-cover"
              />
            ) : null}
            {m.content}
          </div>
        ))}
        {busy ? <div className="self-start text-[13px] text-muted-2">Le coach réfléchit…</div> : null}
        {error ? (
          <div className="self-start rounded-control border border-alert-line bg-alert px-3 py-2 text-[13px] text-alert-ink">
            {error}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {image ? (
        <div className="flex items-center gap-3 border-t border-line px-3 pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.preview} alt="Aperçu" className="h-12 w-12 rounded-control object-cover" />
          <span className="text-[13px] text-muted">Photo prête à envoyer</span>
          <button
            onClick={() => setImage(null)}
            className="tap ml-auto text-[13px] font-medium text-muted-2 hover:text-ink"
            aria-label="Retirer la photo"
          >
            Retirer
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] nav:pb-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="tap flex size-11 shrink-0 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-ink"
          aria-label="Joindre une photo"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path
              d="M21 11.5l-8.4 8.4a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={toggleMic}
          className={`tap flex size-11 shrink-0 items-center justify-center rounded-control border transition-colors ${
            listening
              ? "border-brand bg-brand/10 text-brand"
              : "border-line-4 text-muted hover:border-ink hover:text-ink"
          }`}
          aria-label={listening ? "Arrêter la dictée" : "Dicter à la voix"}
          type="button"
        >
          {listening ? (
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-brand" />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={listening ? "Parle, je t'écoute…" : "Ta question…"}
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-control border border-line-4 bg-surface px-3 py-2.5 text-ink outline-none focus:border-ink"
        />
        <Button onClick={send} loading={busy} className="h-11 px-4">
          Envoyer
        </Button>
      </div>
    </div>
  );
}
