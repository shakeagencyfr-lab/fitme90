"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCustomDomain, recheckCustomDomain, type DomainState } from "@/app/admin/actions";
import { Alert, Button, Card } from "@/components/ui";
import type { CustomDomainInfo } from "@/lib/custom-domain";

// Domaine 100 % personnalisé (marque blanche totale). Le coach saisit son
// domaine, on lui donne l'enregistrement DNS exact à créer, et on vérifie en
// direct (DNS public + Vercel si l'automatisation est branchée).

function Pill({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-[#2F6B3C]/12 text-[#2F6B3C]"
      : tone === "warn"
        ? "bg-[#8A6A17]/12 text-[#8A6A17]"
        : "border border-line-4 text-muted-2";
  return <span className={`rounded-pill px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${cls}`}>{children}</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-2 py-2 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{k}</span>
      <button type="button" onClick={copy} className="tap font-mono text-[13px] text-ink hover:text-brand" title="Copier">
        {v} <span className="text-[11px] text-muted-2">{copied ? "copié ✓" : "copier"}</span>
      </button>
    </div>
  );
}

export function CustomDomainCard({ info }: { info: CustomDomainInfo }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCustomDomain, {} as DomainState);
  const [value, setValue] = useState(info.domain ?? "");
  const [checking, startCheck] = useTransition();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const live = !!info.domain && info.dns?.state === "ok" && (info.vercel ? info.vercel.verified : true);
  const dnsPending = !!info.domain && info.dns?.state !== "ok";
  const needsVercelTxt = !!info.vercel && info.vercel.attached && !info.vercel.verified && !!info.vercel.verification?.length;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-archivo font-bold text-[17px] text-ink">Domaine personnalisé</div>
        <Pill tone="muted">Premium</Pill>
        {info.domain ? live ? <Pill tone="ok">En ligne</Pill> : <Pill tone="warn">En attente DNS</Pill> : null}
      </div>
      <p className="text-[13.5px] leading-[1.6] text-muted">
        Sers ta page publique et l&apos;espace de tes clients sur <span className="font-medium text-body">ton propre nom de domaine</span>{" "}
        (ex <span className="font-mono text-body">coaching-tonnom.com</span>) : marque blanche totale, aucune mention de la plateforme dans l&apos;adresse.
      </p>

      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            name="domain"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="coaching-tonnom.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            className="h-11 min-w-[240px] flex-1 rounded-control border border-line-4 bg-surface px-3.5 font-mono text-[14px] text-ink outline-none focus:border-ink"
          />
          <Button type="submit" loading={pending} className="h-11 shrink-0">
            {info.domain && !value.trim() ? "Retirer" : "Enregistrer"}
          </Button>
        </div>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok && !state.error ? <Alert tone="info">{state.value ? "Domaine enregistré. Configure maintenant ton DNS ci-dessous." : "Domaine retiré."}</Alert> : null}
      </form>

      {info.domain && info.dns ? (
        <div className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-archivo text-[14.5px] font-bold text-ink">
              {live ? "Ton domaine est branché." : "1. Chez ton registrar (OVH, Gandi, GoDaddy…), crée cet enregistrement DNS :"}
            </div>
            <Button
              type="button"
              variant="outline"
              loading={checking}
              className="h-9"
              onClick={() =>
                startCheck(async () => {
                  await recheckCustomDomain();
                  router.refresh();
                })
              }
            >
              Vérifier maintenant
            </Button>
          </div>
          {!live ? (
            <div className="flex flex-col">
              <Row k="Type" v={info.dns.expected.type} />
              <Row k="Nom / hôte" v={info.dns.expected.name} />
              <Row k="Valeur / cible" v={info.dns.expected.value} />
            </div>
          ) : null}
          {needsVercelTxt && info.vercel?.verification ? (
            <div className="flex flex-col gap-1">
              <div className="text-[13px] font-semibold text-ink">2. Vérification de propriété demandée par l&apos;hébergeur :</div>
              {info.vercel.verification.map((v) => (
                <div key={v.value} className="flex flex-col">
                  <Row k="Type" v={v.type} />
                  <Row k="Nom / hôte" v={v.domain.replace(`.${info.domain}`, "") || "@"} />
                  <Row k="Valeur" v={v.value} />
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-[12.5px] leading-[1.6] text-muted-2">
            {dnsPending
              ? info.dns.found
                ? `Aujourd'hui, ton domaine pointe vers : ${info.dns.found}. La propagation DNS prend de quelques minutes à 24 h.`
                : "Aucun enregistrement trouvé pour l'instant. La propagation DNS prend de quelques minutes à 24 h."
              : "Le certificat HTTPS est émis automatiquement une fois le DNS en place."}
            {!info.automation
              ? " Le rattachement final côté hébergement est fait par la plateforme : préviens ton contact une fois le DNS créé."
              : ""}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
