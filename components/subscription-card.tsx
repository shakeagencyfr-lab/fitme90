"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/app/app/profil/actions";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";

interface Props {
  interval: string | null; // 'month' | 'year'
  periodEnd: string | null; // ISO
  cancelAtPeriodEnd: boolean;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : null;

export function SubscriptionCard({ interval, periodEnd, cancelAtPeriodEnd }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [doneAt, setDoneAt] = useState<string | null>(null);

  const cadence = interval === "year" ? "annuel" : "mensuel";
  const end = fmtDate(periodEnd);
  const canceled = cancelAtPeriodEnd || doneAt != null;

  function confirmCancel() {
    setError("");
    start(async () => {
      const res = await cancelSubscription();
      if (res.ok) {
        setDoneAt(res.endsAt ?? periodEnd ?? null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "La résiliation a échoué.");
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <MonoLabel>Mon abonnement</MonoLabel>

      {canceled ? (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            Ton abonnement {cadence} est <span className="font-semibold text-ink">résilié</span>. Tu gardes un accès
            complet jusqu&apos;au <span className="font-semibold text-ink">{fmtDate(doneAt) ?? end ?? "terme de la période"}</span>.
            Ensuite, ton espace passera en lecture seule (tu pourras toujours consulter ce qui a été généré).
          </p>
        </>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            Abonnement <span className="font-semibold text-ink">{cadence}</span> actif.
            {end ? <> Prochaine échéance le <span className="font-semibold text-ink">{end}</span>.</> : null} Sans engagement,
            résiliable à tout moment.
          </p>
          {error ? <Alert>{error}</Alert> : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start text-[13px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink"
          >
            Résilier mon abonnement
          </button>
        </>
      )}

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label="Fermer" onClick={() => !pending && setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <h2 className="font-archivo font-extrabold text-[20px] tracking-[-0.02em] text-ink">Résilier ton abonnement ?</h2>
            <p className="text-[14px] leading-relaxed text-body">
              Cette action est <span className="font-semibold text-ink">irréversible</span>. Ton abonnement {cadence} s&apos;arrêtera
              à la fin de la période en cours{end ? <> (le <span className="font-semibold text-ink">{end}</span>)</> : null}.
              Jusque-là, tu conserves l&apos;accès complet ; ensuite, ton espace passera en lecture seule. Aucun nouveau
              prélèvement ne sera effectué.
            </p>
            {error ? <Alert>{error}</Alert> : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" onClick={confirmCancel} loading={pending} className="h-11">
                Oui, résilier
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="tap rounded-btn border border-line-4 px-4 py-2.5 text-[14px] font-semibold text-body hover:border-ink disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
