"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePhrase } from "@/components/locale-provider";
import { resyncGoogleListing } from "@/app/admin/actions";
import { Alert } from "@/components/ui";

/** Ce que le studio sait de la fiche Google rattachée au compte. */
export interface GoogleLink {
  name: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviewsCount: number | null;
  category: string | null;
  address: string | null;
}

/**
 * La fiche Google, vue depuis le studio du site.
 *
 * Elle n'est pas ici pour décorer : c'est elle qui remplit les quatre champs
 * les plus pénibles à saisir (adresse, téléphone, horaires, catégorie) et qui
 * fournit les avis affichés en bas de page. Le coach doit donc voir, à
 * l'endroit où il travaille sa page, ce que Google y met et comment le
 * rafraîchir.
 *
 * LE BOUTON DE MISE À JOUR EXISTE PARCE QUE CES DONNÉES BOUGENT. Des horaires
 * d'été affichés en décembre sont pires qu'une absence d'horaires : ils font
 * venir quelqu'un devant une porte fermée.
 */
export function SiteGoogleCard({ google, serpReady }: { google: GoogleLink | null; serpReady: boolean }) {
  const tx = usePhrase();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  if (!serpReady) return null;

  const REMPLIT = [tx("Adresse"), tx("Téléphone"), tx("Horaires"), tx("Catégorie"), tx("Avis"), tx("Photos")];

  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo text-[17px] font-bold text-ink">{tx("Ta fiche Google")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {google
            ? tx("Elle remplit une partie de cette page toute seule. Les champs ci-dessous restent modifiables : ce que tu écris à la main ne sera pas réécrit.")
            : tx("Rattache ta fiche d'établissement pour remplir cette page en trois clics, au lieu de tout saisir.")}
        </p>
      </div>

      {google ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line-4 bg-surface-2 p-3.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-archivo text-[15px] font-bold text-ink">
                {google.name ?? tx("Fiche rattachée")}
              </span>
              <span className="truncate text-[12.5px] text-muted">
                {[
                  google.category,
                  google.address,
                  google.rating != null ? `${google.rating} / 5` : null,
                  google.reviewsCount != null ? `${google.reviewsCount} ${tx("avis")}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {google.mapsUrl ? (
                <Link
                  href={google.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[13px] font-semibold text-brand hover:underline"
                >
                  {tx("Voir sur Google ↗")}
                </Link>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setMsg(null);
                    setMsg(await resyncGoogleListing());
                  })
                }
                className="tap rounded-btn border border-line-4 bg-surface px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink disabled:opacity-60"
              >
                {pending ? tx("Mise à jour…") : tx("Mettre à jour depuis Google")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
              {tx("Remplit")}
            </span>
            {REMPLIT.map((c) => (
              <span
                key={c}
                className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2"
              >
                {c}
              </span>
            ))}
          </div>

          {msg?.ok ? <Alert tone="info">{tx("Coordonnées et horaires mis à jour depuis Google.")}</Alert> : null}
          {msg?.error ? <Alert>{msg.error}</Alert> : null}

          <p className="text-[12px] leading-[1.55] text-muted-2">
            {tx("La mise à jour ne touche que ce que Google sait : adresse, téléphone, horaires, catégorie, note. Tes textes et ta galerie restent tels quels.")}{" "}
            <Link href="/admin/fiche-google" className="text-brand hover:underline">
              {tx("Gérer la fiche")}
            </Link>
          </p>
        </>
      ) : (
        <Link
          href="/admin/fiche-google"
          className="tap inline-flex h-11 w-fit items-center rounded-btn border border-line-4 bg-surface px-5 text-[14px] font-semibold text-ink hover:border-ink"
        >
          {tx("Rattacher ma fiche Google")}
        </Link>
      )}
    </section>
  );
}
