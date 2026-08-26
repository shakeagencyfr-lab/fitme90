"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// Coach flottant : accessible depuis tout l'espace client (README).
// Texte + pièce jointe image. Ne s'affiche que si le coach est activé
// (avant J90) — le composant n'est monté que dans ce cas par le layout.
export function CoachWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Salut. Pose-moi une question sur ta séance, un exercice, une substitution ou un repas — je connais ton profil et ton programme.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      const list: string[] = Array.isArray(data.messages)
        ? data.messages
        : [data.answer].filter(Boolean);
      // Révélation rythmée : une bulle après l'autre, avec un temps de « frappe ».
      for (let i = 0; i < list.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 650));
        setMessages((m) => [...m, { role: "assistant", content: list[i] }]);
      }
      // Le coach a régénéré le programme → rafraîchir l'espace (séance, agenda…).
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
        className="tap fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex items-center gap-2.5 rounded-pill bg-ink px-5 py-3.5 text-white shadow-[0_6px_20px_rgba(23,25,27,0.22)] transition-transform hover:scale-[1.03] active:scale-95 nav:bottom-6"
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
    <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-card border border-line bg-surface nav:inset-x-auto nav:right-6 nav:bottom-6 nav:w-[380px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="font-archivo font-semibold text-[15px] text-ink">Coach FitMe90</div>
        <button onClick={() => setOpen(false)} className="tap text-muted-2" aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-card bg-ink px-3.5 py-2.5 text-[14px] text-white"
                : "self-start max-w-[90%] rounded-card bg-paper px-3.5 py-2.5 text-[14px] text-body leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        {busy ? <div className="self-start text-[13px] text-muted-2">Le coach réfléchit…</div> : null}
        {error ? (
          <div className="self-start rounded-control bg-alert border border-alert-line px-3 py-2 text-[13px] text-alert-ink">
            {error}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ta question…"
          rows={1}
          className="flex-1 resize-none rounded-control border border-line-4 bg-surface px-3 py-2.5 text-ink outline-none focus:border-ink max-h-24"
        />
        <Button onClick={send} loading={busy} className="h-11 px-4">
          Envoyer
        </Button>
      </div>
    </div>
  );
}
