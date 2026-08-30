"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSubdomain, type SubdomainState } from "@/app/admin/actions";
import { Button, Alert, Card } from "@/components/ui";

// Réglage du sous-domaine personnalisé de la landing coach. La prévisualisation
// de l'URL n'est complète que si un domaine racine est configuré (sinon on
// explique que ce sera actif une fois le domaine branché).
export function SubdomainForm({
  current,
  slug,
  rootDomain,
}: {
  current: string | null;
  slug: string | null;
  rootDomain: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveSubdomain, {} as SubdomainState);
  const [value, setValue] = useState(current ?? "");

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const clean = value.trim().toLowerCase();
  const preview = clean && rootDomain ? `https://${clean}.${rootDomain}` : null;

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Sous-domaine personnalisé</div>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          Donne à ta page publique une adresse à ton nom, du type{" "}
          <span className="font-mono text-body">tonnom.{rootDomain || "domaine.com"}</span>. Elle
          pointera vers ta landing (aujourd&apos;hui accessible via{" "}
          <span className="font-mono text-body">/c/{slug ?? "…"}</span>).
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex min-w-[220px] flex-1 items-center overflow-hidden rounded-control border border-line-4 bg-surface focus-within:border-ink">
            <span className="pl-3.5 pr-1 font-mono text-[13px] text-muted-2">https://</span>
            <input
              name="subdomain"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={slug ?? "tonnom"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] text-ink outline-none"
            />
            <span className="whitespace-nowrap pr-3.5 pl-1 font-mono text-[13px] text-muted-2">
              .{rootDomain || "…"}
            </span>
          </div>
          <Button type="submit" loading={pending} className="h-11 shrink-0">
            Enregistrer
          </Button>
        </div>

        {preview ? (
          <p className="text-[13px] text-muted">
            Ta page sera accessible sur{" "}
            <a href={preview} target="_blank" rel="noreferrer" className="font-medium text-brand underline">
              {preview}
            </a>
            .
          </p>
        ) : null}

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? (
          <Alert tone="info">
            {state.value ? "Sous-domaine enregistré." : "Sous-domaine retiré."}
          </Alert>
        ) : null}

        {!rootDomain ? (
          <p className="rounded-control border border-line-2 bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-[1.6] text-muted-2">
            Le domaine n&apos;est pas encore branché : ton choix est mémorisé et deviendra actif dès que le
            domaine racine et le DNS générique (<span className="font-mono">*.tondomaine</span>) seront
            configurés côté hébergeur.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
