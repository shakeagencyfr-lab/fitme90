"use client";

import { useEffect, useState } from "react";
import { Card, Button, MonoLabel, Alert } from "@/components/ui";

// Réglage « Rappels de séance » : demande la permission, s'abonne au Web Push
// et enregistre l'abonnement côté serveur. Fonctionne sur Android/Chrome et sur
// iOS 16.4+ à condition que l'app soit installée sur l'écran d'accueil.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "busy";

export function NotificationSetting() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return;
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iOS : le push n'existe qu'en app installée (mode standalone).
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        setState(isIOS && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (!PUBLIC_KEY) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enable() {
    setError(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("save");
      setState("on");
    } catch {
      setError("Activation impossible. Réessaie depuis l'app installée.");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <MonoLabel>Rappels de séance</MonoLabel>
        {state === "on" ? (
          <span className="rounded-pill bg-brand/10 px-2.5 py-1 text-[12px] font-semibold text-brand">
            Activés
          </span>
        ) : null}
      </div>
      <p className="text-[13.5px] leading-[1.6] text-muted">
        Reçois une notification les jours d'entraînement pour ne jamais oublier ta séance.
        La régularité fait la moitié du résultat.
      </p>

      {error ? <Alert>{error}</Alert> : null}

      {state === "loading" ? (
        <div className="text-[13px] text-muted-2">Vérification…</div>
      ) : state === "on" ? (
        <Button variant="outline" className="h-11 self-start" onClick={disable}>
          Désactiver les rappels
        </Button>
      ) : state === "off" ? (
        <Button className="h-11 self-start" onClick={enable}>
          Activer les rappels
        </Button>
      ) : state === "busy" ? (
        <Button className="h-11 self-start" loading disabled>
          Un instant
        </Button>
      ) : state === "denied" ? (
        <Alert tone="info">
          Les notifications sont bloquées pour ce site. Autorise-les dans les réglages de
          ton navigateur, puis reviens ici.
        </Alert>
      ) : state === "ios-install" ? (
        <Alert tone="info">
          Sur iPhone, installe d'abord FitMe90 sur ton écran d'accueil (bouton Partager,
          « Sur l'écran d'accueil »), puis ouvre l'app pour activer les rappels.
        </Alert>
      ) : (
        <Alert tone="info">Ton navigateur ne prend pas en charge les notifications.</Alert>
      )}
    </Card>
  );
}
