"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSubdomain, type SubdomainState } from "@/app/admin/actions";
import { Button, Alert, Card } from "@/components/ui";

// Adresse personnalisée : le nom à la FIN de l'URL (`fitme90.com/<nom>`). Si un
// domaine racine est branché, la même adresse fonctionne aussi en sous-domaine.
//
// Attention pour un REVENDEUR : le proxy réécrit `/<nom>` vers `/c/<nom>`,
// c'est-à-dire une page de type COACH, alors que sa propre page de recrutement
// vit sur `/r/<slug>`. Les deux existent volontairement, mais l'écran ne le
// disait pas et on ne savait plus laquelle on personnalisait.
export function SubdomainForm({
  current,
  slug,
  siteHost,
  rootDomain,
  kind,
}: {
  current: string | null;
  slug: string | null;
  siteHost: string;
  rootDomain: string;
  kind: "platform" | "reseller" | "coach";
}) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSubdomain, {} as SubdomainState);
  const [value, setValue] = useState(current ?? "");

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const clean = value.trim().toLowerCase();
  const shown = clean || slug || "tonnom";
  const pathUrl = `https://${siteHost}/${shown}`;
  const isReseller = kind === "reseller";
  const resellerUrl = slug ? `https://${siteHost}/r/${slug}` : null;

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Adresse personnalisée")}</div>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {isReseller
            ? tx("Le nom qui apparaît à la fin de l'adresse de la page COACH de démonstration, celle que tu montres à un coach pour lui donner un aperçu de ce qu'il obtiendra.")
            : tx("Choisis le nom qui apparaît à la fin de l'adresse de ta page publique, du type")}
          {isReseller ? null : <> <span className="font-mono text-body">{siteHost}{tx("/tonnom")}</span>.</>}
        </p>
        {isReseller && resellerUrl ? (
          <div className="flex flex-col gap-1 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.6]">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
              {tx("Tu as deux pages, ne les confonds pas")}</span>
            <span className="text-body">
              <span className="font-semibold text-ink">{tx("Ta page revendeur")}</span>{tx(" (celle que tu personnalises ici, pour recruter des coachs) :")}{" "}
              <a href={resellerUrl} target="_blank" rel="noreferrer" className="font-mono font-medium text-brand underline">
                {siteHost}/r/{slug}
              </a>
            </span>
            <span className="text-body">
              <span className="font-semibold text-ink">{tx("Une page coach d'exemple")}</span>{tx(" (à montrer en démonstration) : l'adresse que tu règles ci-dessous.")}</span>
          </div>
        ) : null}
      </div>

      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex min-w-[240px] flex-1 items-center overflow-hidden rounded-control border border-line-4 bg-surface focus-within:border-ink">
            <span className="whitespace-nowrap pl-3.5 pr-0.5 font-mono text-[13px] text-muted-2">{siteHost}/</span>
            <input
              name="subdomain"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={slug ?? "tonnom"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-[14px] text-ink outline-none"
            />
          </div>
          <Button type="submit" loading={pending} className="h-11 shrink-0">
            {tx("Enregistrer")}</Button>
        </div>

        <p className="text-[13px] text-muted">
          {tx("Ta page sera accessible sur")}{" "}
          <a href={pathUrl} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
            {siteHost}/{shown}
          </a>
          {rootDomain ? (
            <>
              {" "}{tx("et sur")} <span className="font-mono text-body">{shown}.{rootDomain}</span>
            </>
          ) : null}
          .
        </p>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? (
          <Alert tone="info">{state.value ? "Adresse enregistrée." : "Adresse retirée."}</Alert>
        ) : null}
      </form>
    </Card>
  );
}
