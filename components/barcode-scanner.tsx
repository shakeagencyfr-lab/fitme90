"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ModalLayer } from "@/components/modal-layer";
import { Button } from "@/components/ui";
import { useT } from "@/components/locale-provider";
import { normalizeBarcode } from "@/lib/food-log";

// ------------------------------------------------------------------ *
// Lecteur de code-barres, dans une fenêtre : la caméra arrière, un cadre, et
// le code est lu tout seul.
//
// DEUX MOTEURS. Le navigateur sait lire les codes-barres nativement sur
// Android (API BarcodeDetector) : rapide, sans rien charger. Ailleurs, et
// notamment sur iPhone, on charge à la demande une bibliothèque de lecture
// (@zxing/browser), donc seulement au premier scan, jamais au chargement de
// la page nutrition.
//
// UNE LECTURE CONFIRMÉE. Un moteur peut se tromper d'un chiffre sur une image
// floue. On n'accepte un code qu'après l'avoir lu deux fois de suite, ce qui
// prend une fraction de seconde de plus et évite d'ouvrir la mauvaise fiche.
//
// SANS CAMÉRA. Sur un ordinateur, ou si l'accès est refusé, on tape le code.
// ------------------------------------------------------------------ */

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorCtor = { new (opts?: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "live" | "denied">("starting");
  const [manual, setManual] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let controls: { stop: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = "";

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((tr) => tr.stop());
      if (video.srcObject) video.srcObject = null;
    };
    const found = (raw: string) => {
      if (stopped) return;
      const code = normalizeBarcode(raw);
      if (!code) return;
      if (code !== last) {
        last = code;
        return;
      }
      stopped = true;
      cleanup();
      onDetected(code);
    };

    (async () => {
      const BD = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      let native = false;
      if (BD) {
        try {
          const formats = (await BD.getSupportedFormats?.()) ?? FORMATS;
          native = formats.includes("ean_13");
        } catch {
          native = false;
        }
      }
      if (native && BD) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
          if (stopped) return cleanup();
          video.srcObject = stream;
          await video.play();
          setState("live");
          const det = new BD({ formats: FORMATS });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await det.detect(video);
              if (codes[0]?.rawValue) found(codes[0].rawValue);
            } catch {
              /* image pas encore prête */
            }
            if (!stopped) timer = setTimeout(tick, 150);
          };
          tick();
          return;
        } catch {
          setState("denied");
          return;
        }
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video, (result) => {
          if (result) found(result.getText());
        });
        if (stopped) cleanup();
        else setState("live");
      } catch {
        setState("denied");
      }
    })();

    return () => {
      stopped = true;
      cleanup();
    };
  }, [onDetected]);

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const code = normalizeBarcode(manual);
    if (code) onDetected(code);
  }

  return (
    <ModalLayer onClose={onClose} label={t("nutrition.scanTitle")} closeLabel={t("common.close")}>
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        <div className="flex items-center justify-between gap-3 border-b border-line-2 px-5 py-4">
          <h2 className="font-archivo font-extrabold text-[19px] leading-tight tracking-[-0.02em] text-ink">{t("nutrition.scanTitle")}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-ink">
          <video ref={videoRef} muted playsInline autoPlay className={["h-full w-full object-cover", state === "live" ? "" : "opacity-0"].join(" ")} />
          {state === "live" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="h-[38%] w-[78%] rounded-[10px] border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          ) : null}
          {state === "starting" ? (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/80">…</div>
          ) : null}
          {state === "denied" ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13.5px] leading-[1.5] text-white/85">{t("nutrition.cameraDenied")}</div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          {state === "live" ? <p className="text-[13px] text-muted">{t("nutrition.scanHint")}</p> : null}
          <form onSubmit={submitManual} className="flex items-center gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("nutrition.scanManual")}
              aria-label={t("nutrition.scanManual")}
              className="h-11 min-w-0 flex-1 rounded-control border border-line-4 bg-surface px-3 text-[16px] text-ink"
            />
            <Button type="submit" variant="outline" disabled={!normalizeBarcode(manual)} className="h-11">
              {t("common.continue")}
            </Button>
          </form>
        </div>
      </div>
    </ModalLayer>
  );
}
