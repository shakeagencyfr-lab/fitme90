"use client";

// L'envoi différé d'une demande externe (bouton dépannage) déclenche un
// setState en effet, volontairement, en réaction à un événement.
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { COACH_NAME } from "@/lib/config";

interface Msg {
  role: "user" | "assistant";
  content: string;
  image?: string; // aperçu (data URL) pour la bulle utilisateur
}

interface Conv {
  id: string;
  title: string;
  updated_at: string;
}

type Attached = { data: string; media_type: "image/jpeg"; preview: string };

const GREETING: Msg = {
  role: "assistant",
  content: `Salut, moi c'est ${COACH_NAME}, ton coach. Pose-moi une question sur ta séance, un exercice, une substitution ou un repas. Tu peux aussi m'envoyer une photo (repas, machine) ou dicter à la voix.`,
};

function mapMsgs(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: { content?: string }) => m?.content)
    .map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
}

function relDate(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  if (diff < 7) return `il y a ${diff} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

//, Web Speech API (dictée vocale) : typage minimal, sans `any`. -----------
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
// activé (avant J90), le layout ne le rend pas au-delà.
export function CoachWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<Attached | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const historyLoaded = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // À la première ouverture : liste des conversations + fil de la plus récente.
  // La conversation ne repart plus de zéro, tout l'historique réapparaît.
  useEffect(() => {
    if (!open || historyLoaded.current) return;
    historyLoaded.current = true;
    setLoadingHistory(true);
    (async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          fetch("/api/coach/conversations"),
          fetch("/api/coach"),
        ]);
        const cData = await cRes.json();
        const mData = await mRes.json();
        if (Array.isArray(cData.conversations)) setConversations(cData.conversations);
        setConvId(mData.conversationId ?? null);
        const past = mapMsgs(mData.messages);
        if (past.length) setMessages(past);
      } catch {
        /* on garde le message d'accueil par défaut */
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [open]);

  // Demande externe (ex. bouton « je n'ai pas mon matériel » sur la séance) :
  // on ouvre le coach et on mémorise le message à envoyer.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message;
      if (!msg) return;
      setOpen(true);
      setShowList(false);
      setPendingAsk(msg);
    };
    window.addEventListener("fitme90:coach-ask", onAsk as EventListener);
    return () => window.removeEventListener("fitme90:coach-ask", onAsk as EventListener);
  }, []);

  // Envoi différé : une fois le panneau ouvert et l'historique chargé.
  useEffect(() => {
    if (!open || !pendingAsk || busy || loadingHistory) return;
    const msg = pendingAsk;
    setPendingAsk(null);
    pushMessage(msg, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingAsk, busy, loadingHistory]);

  async function refreshConversations() {
    try {
      const r = await fetch("/api/coach/conversations");
      const d = await r.json();
      if (Array.isArray(d.conversations)) setConversations(d.conversations);
    } catch {
      /* silencieux */
    }
  }

  function newConversation() {
    setConvId(null);
    setMessages([GREETING]);
    setError("");
    setShowList(false);
  }

  async function renameConversation(id: string, current: string) {
    const title = window.prompt("Renommer la conversation", current)?.trim();
    if (!title || title === current) return;
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await fetch("/api/coach/conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
    } catch {
      refreshConversations();
    }
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Supprimer cette conversation ? Cette action est définitive.")) return;
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (id === convId) newConversation();
    try {
      await fetch("/api/coach/conversations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      refreshConversations();
    }
  }

  async function openConversation(id: string) {
    setShowList(false);
    if (id === convId) return;
    setError("");
    setLoadingHistory(true);
    try {
      const r = await fetch(`/api/coach?conversation=${encodeURIComponent(id)}`);
      const d = await r.json();
      const past = mapMsgs(d.messages);
      setConvId(id);
      setMessages(past.length ? past : [GREETING]);
    } catch {
      /* silencieux */
    } finally {
      setLoadingHistory(false);
    }
  }

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

  // Envoie un message (texte + image éventuelle) au coach et affiche la réponse.
  async function pushMessage(outText: string, sent: Attached | null) {
    setError("");
    setMessages((m) => [...m, { role: "user", content: outText, image: sent?.preview }]);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: outText,
          conversation_id: convId ?? undefined,
          image: sent ? { data: sent.data, media_type: sent.media_type } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data.conversationId && data.conversationId !== convId) setConvId(data.conversationId);
      const list: string[] = Array.isArray(data.messages)
        ? data.messages
        : [data.answer].filter(Boolean);
      for (let i = 0; i < list.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 650));
        setMessages((m) => [...m, { role: "assistant", content: list[i] }]);
      }
      refreshConversations(); // titre + ordre à jour
      if (data.adapted) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le coach est indisponible.");
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const text = input.trim();
    if ((!text && !image) || busy) return;
    if (listening) recRef.current?.stop();
    const outText = text || "Peux-tu regarder cette image ?";
    const sent = image;
    setInput("");
    setImage(null);
    pushMessage(outText, sent);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-tour="coach"
        className="tap fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex items-center gap-2.5 rounded-pill bg-fill px-5 py-3.5 text-fillfg shadow-[0_6px_20px_rgba(23,25,27,0.22)] transition-transform hover:scale-[1.03] active:scale-95 nav:bottom-6"
        aria-label="Ouvrir le coach"
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4FBF6A] opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[#4FBF6A]" />
        </span>
        <span className="font-plex font-semibold text-[15px]">Coach IA</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface nav:inset-auto nav:bottom-6 nav:right-6 nav:max-h-[70dvh] nav:w-[380px] nav:rounded-card nav:border nav:border-line">
      <div className="safe-top flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <button
          onClick={() => setShowList(true)}
          className="tap flex size-9 shrink-0 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-ink"
          aria-label="Mes conversations"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-archivo font-semibold text-[15px] text-ink">{COACH_NAME}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">Coach FitMe90</div>
        </div>
        <button
          onClick={newConversation}
          className="tap flex size-9 shrink-0 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-ink"
          aria-label="Nouvelle conversation"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button onClick={() => setOpen(false)} className="tap shrink-0 pl-1 text-muted-2" aria-label="Fermer">
          ✕
        </button>
      </div>

      {/* Tiroir des conversations */}
      {showList ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-surface animate-[fadein_0.15s_ease-out]">
          <div className="safe-top flex items-center justify-between border-b border-line px-4 py-3">
            <div className="font-archivo font-semibold text-[15px] text-ink">Mes conversations</div>
            <button onClick={() => setShowList(false)} className="tap text-muted-2" aria-label="Fermer la liste">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <button
              onClick={newConversation}
              className="tap mb-2 flex w-full items-center gap-2.5 rounded-control border border-brand/40 bg-brand/10 px-3.5 py-3 text-left font-semibold text-brand"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouvelle conversation
            </button>
            {conversations.length === 0 ? (
              <p className="px-1 py-3 text-[13px] text-muted-2">Aucune conversation pour l&apos;instant.</p>
            ) : (
              conversations.map((c) => {
                const active = c.id === convId;
                return (
                  <div
                    key={c.id}
                    className={[
                      "mb-1.5 flex items-center gap-1 rounded-control border pr-1 transition-colors",
                      active ? "border-ink bg-surface-2" : "border-line hover:border-line-4",
                    ].join(" ")}
                  >
                    <button
                      onClick={() => openConversation(c.id)}
                      className="tap flex min-w-0 flex-1 items-center justify-between gap-3 px-3.5 py-3 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{c.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-2">{relDate(c.updated_at)}</span>
                    </button>
                    <button
                      onClick={() => renameConversation(c.id, c.title)}
                      className="tap flex size-8 shrink-0 items-center justify-center rounded-control text-muted-2 hover:text-ink"
                      aria-label="Renommer"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteConversation(c.id)}
                      className="tap flex size-8 shrink-0 items-center justify-center rounded-control text-muted-2 hover:text-[#C4471A]"
                      aria-label="Supprimer"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {loadingHistory ? (
          <div className="self-center text-[12.5px] text-muted-2">Chargement de la conversation…</div>
        ) : null}
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
