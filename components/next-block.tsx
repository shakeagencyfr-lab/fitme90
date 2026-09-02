"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";
import { useT } from "@/components/locale-provider";

/**
 * Le bloc courant est fini et le suivant n'est pas encore là (le cron passe
 * une fois par jour ; il a pu manquer une clé ou des crédits). Le client peut
 * le demander lui-même : même garde-fous côté serveur.
 */
export function NextBlockPrompt({ label }: { label: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function build() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/program/next-block", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("nextBlock.failed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("common.connectionLost"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Alert tone="info">
      <div className="flex flex-col gap-3">
        <div>
          <span className="font-semibold">{t("nextBlock.ready", { label })}</span> {t("nextBlock.body")}
        </div>
        {error ? <span className="text-[13px] text-[#C4471A]">{error}</span> : null}
        <Button onClick={build} loading={busy} className="h-11 self-start">
          {t("nextBlock.cta")}
        </Button>
      </div>
    </Alert>
  );
}
