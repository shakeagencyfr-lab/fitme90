"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { googleImportStep, type GoogleSearchState } from "@/app/admin/actions";
import { Alert, Button, Card } from "@/components/ui";

/**
 * Import d'une fiche Google, en trois écrans.
 *
 * Chercher, choisir, relire. Le troisième est le seul qui compte vraiment :
 * c'est là que le coach voit ce qui va être écrit sur sa page, et décroche ce
 * qu'il ne veut pas. Sans cette étape, l'import serait un bouton qu'on
 * n'oserait pas presser deux fois.
 *
 * Chaque bloc porte donc ce qu'il va faire, en clair, et rien n'est coché
 * d'avance quand cela pourrait remplacer un travail existant.
 */

const vide: GoogleSearchState = {};

export function GoogleImport({ linkedName }: { linkedName: string | null }) {
  // Un seul état pour tout le parcours : c'est ce qui garantit qu'on ne voit
  // jamais l'aperçu d'une recherche précédente au-dessus des résultats de la
  // suivante.
  const [etat, avancer, encours] = useActionState(googleImportStep, vide);
  const { draft, done } = etat;

  if (done) {
    const lignes = [
      done.infos ? "coordonnées, horaires et note" : null,
      done.textes ? "textes de la page" : null,
      done.photo ? "photo de présentation" : null,
      done.avis > 0 ? `${done.avis} avis` : null,
    ].filter(Boolean);
    return (
      <Card className="flex flex-col gap-3">
        <div className="font-archivo text-[17px] font-bold text-ink">Fiche importée</div>
        <p className="text-[14px] leading-[1.6] text-muted">
          {lignes.length > 0
            ? `Repris de Google : ${lignes.join(", ")}. Tout reste modifiable dans Marque blanche.`
            : "Rien n'a été repris : les blocs que tu avais cochés étaient déjà remplis de ton côté."}
        </p>
        <a href="/admin/marque-blanche" className="self-start text-[13.5px] font-semibold text-brand hover:underline">
          Voir ma page
        </a>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* L'erreur est affichée une seule fois, en tête : l'état est unique,
          qu'elle vienne de la recherche, de l'aperçu ou de l'écriture. */}
      {etat.error ? <Alert>{etat.error}</Alert> : null}

      {/* 1. Chercher */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-archivo text-[16px] font-bold text-ink">Trouver mon établissement</div>
          <p className="text-[13px] leading-[1.6] text-muted">
            {linkedName
              ? `Actuellement rattaché à « ${linkedName} ». Une nouvelle recherche remplacera ce rattachement.`
              : "Écris le nom de ta salle ou de ton studio, avec la ville si le nom est courant."}
          </p>
        </div>
        <form action={avancer} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="etape" value="chercher" />
          <input
            name="q"
            required
            minLength={3}
            defaultValue={linkedName ?? ""}
            placeholder="Studio Fitme Paris 11"
            className="h-11 min-w-[240px] flex-1 rounded-control border border-line-4 bg-surface px-3 text-[14.5px] text-ink placeholder:text-muted-2"
          />
          <Button loading={encours} className="h-11">
            Chercher
          </Button>
        </form>
      </Card>

      {/* 2. Choisir */}
      {etat.candidates && etat.candidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="font-archivo text-[15px] font-bold text-ink">
            {etat.candidates.length} fiche{etat.candidates.length > 1 ? "s" : ""} trouvée
            {etat.candidates.length > 1 ? "s" : ""}
          </div>
          {etat.candidates.map((c) => (
            <form key={c.dataId} action={avancer}>
              <input type="hidden" name="etape" value="apercu" />
              <input type="hidden" name="data_id" value={c.dataId} />
              {/* L'appel « détail » n'accepte pas le data_id des appels avis
                  et photos : sans ce champ, chaque fiche choisie échouait. */}
              <input type="hidden" name="place_id" value={c.placeId ?? ""} />
              <button
                type="submit"
                disabled={encours}
                className="tap flex w-full flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left hover:border-ink disabled:opacity-60"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-archivo text-[15px] font-bold text-ink">{c.name}</span>
                  <span className="text-[12.5px] text-muted">
                    {[c.category, c.address].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-2">
                  {c.rating != null ? `${c.rating.toFixed(1)} ★` : ""}
                  {c.reviewsCount != null ? ` (${c.reviewsCount})` : ""}
                </span>
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {/* 3. Relire et appliquer */}
      {draft ? (
        <form action={avancer} className="flex flex-col gap-4">
          <input type="hidden" name="etape" value="appliquer" />
          <input type="hidden" name="import_id" value={etat.importId ?? ""} />
          <Relecture draft={draft} />
          <Button loading={encours} className="self-start">
            Appliquer à ma page
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Les blocs relus par le coach avant écriture. */
function Relecture({ draft }: { draft: NonNullable<GoogleSearchState["draft"]> }) {
  const [photo, setPhoto] = useState<string | null>(draft.photos[0] ?? null);

  const infos = [
    draft.address ? ["Adresse", draft.address] : null,
    draft.phone ? ["Téléphone", draft.phone] : null,
    draft.website ? ["Site", draft.website] : null,
    draft.rating != null ? ["Note", `${draft.rating} sur 5 (${draft.reviewsCount ?? 0} avis)`] : null,
    draft.openingHours.length > 0
      ? ["Horaires", draft.openingHours.map((h) => `${h.day} ${h.hours}`).join(" · ")]
      : null,
  ].filter((x): x is [string, string] => !!x);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="font-archivo text-[19px] font-extrabold tracking-[-0.02em] text-ink">{draft.name}</div>
        <p className="text-[13px] text-muted">Décoche ce que tu ne veux pas reprendre.</p>
      </div>

      {infos.length > 0 ? (
        <Bloc name="infos" titre="Coordonnées et horaires" defaut>
          <dl className="flex flex-col gap-1.5">
            {infos.map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-x-2 text-[13px]">
                <dt className="min-w-[80px] text-muted-2">{k}</dt>
                <dd className="min-w-0 flex-1 break-words text-body">{v}</dd>
              </div>
            ))}
          </dl>
        </Bloc>
      ) : null}

      <Bloc name="textes" titre="Titre, accroche et présentation" defaut>
        <p className="text-[13px] leading-[1.6] text-muted">
          Proposés seulement là où ta page est encore vide. Ce que tu as déjà écrit ne bouge pas.
        </p>
      </Bloc>

      {draft.photos.length > 0 ? (
        <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4">
          <div className="font-archivo text-[14.5px] font-bold text-ink">Photo de présentation</div>
          <p className="text-[12.5px] text-muted">
            Recopiée chez nous : l&apos;adresse Google expire, et elle signalerait à Google chaque visite sur ta
            page. Les vignettes ci-dessous passent déjà par notre serveur.
          </p>
          <div className="flex flex-wrap gap-2">
            <Vignette actif={photo === null} onClick={() => setPhoto(null)} label="Aucune" />
            {draft.photos.slice(0, 8).map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setPhoto(url)}
                aria-pressed={photo === url}
                className={`tap relative h-16 w-24 overflow-hidden rounded-control border-2 ${
                  photo === url ? "border-brand" : "border-line-4"
                }`}
              >
                <Image
                  src={`/api/admin/google-photo?u=${encodeURIComponent(url)}`}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="photo" value={photo ?? ""} />
        </section>
      ) : null}

      {draft.reviews.length > 0 ? (
        <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4">
          <div className="font-archivo text-[14.5px] font-bold text-ink">
            Avis à afficher en témoignages
          </div>
          <p className="text-[12.5px] text-muted">
            Reprendre un avis en cite l&apos;auteur tel que Google l&apos;affiche. Ne garde que ceux que tu assumes de
            republier sur ta page.
          </p>
          <div className="flex flex-col gap-2">
            {draft.reviews.map((r, i) => (
              <label
                key={`${r.author}-${i}`}
                className="flex cursor-pointer items-start gap-3 rounded-control border border-line-4 p-3 hover:border-ink"
              >
                <input type="checkbox" name="avis" value={i} className="mt-1 size-4 accent-[var(--color-brand)]" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-ink">
                    {r.author}
                    {r.rating != null ? ` · ${r.rating}/5` : ""}
                    {r.publishedLabel ? ` · ${r.publishedLabel}` : ""}
                  </span>
                  <span className="text-[13px] leading-[1.55] text-muted">{r.body}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Un bloc facultatif, avec sa case en tête. */
function Bloc({
  name,
  titre,
  defaut,
  children,
}: {
  name: string;
  titre: string;
  defaut?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" name={name} defaultChecked={defaut} className="size-4 accent-[var(--color-brand)]" />
        <span className="font-archivo text-[14.5px] font-bold text-ink">{titre}</span>
      </label>
      {children}
    </section>
  );
}

function Vignette({ actif, onClick, label }: { actif: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`tap h-16 w-24 rounded-control border-2 text-[12px] font-semibold ${
        actif ? "border-brand text-brand" : "border-line-4 text-muted-2"
      }`}
    >
      {label}
    </button>
  );
}
