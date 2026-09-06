"use client";

import { useMemo, useState } from "react";
import { ModalLayer } from "@/components/modal-layer";
import { MuscleIllustration } from "@/components/muscle-illustration";
import { useLocale, useT } from "@/components/locale-provider";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABEL,
  equipmentPhoto,
  searchEquipment,
  type EquipmentItem,
  type MuscleGroup,
} from "@/lib/equipment-catalog";

/**
 * Le menu où le client CLIQUE ses machines.
 *
 * POURQUOI IL EXISTE. Le matériel se saisissait au clavier. Personne ne sait
 * écrire « pec deck » du premier coup, beaucoup ne connaissent pas le nom de
 * la machine qu'ils utilisent trois fois par semaine, et le générateur
 * recevait donc soit des fautes, soit des vides. Ici on cherche par nom, par
 * groupe musculaire, ou simplement à l'œil : chaque machine a sa photo.
 *
 * La saisie libre reste offerte en dernier recours, pour le matériel exotique
 * qu'aucun catalogue ne couvrira jamais.
 */

function Tuile({
  item,
  choisie,
  onToggle,
}: {
  item: EquipmentItem;
  choisie: boolean;
  onToggle: () => void;
}) {
  const locale = useLocale();
  const photo = equipmentPhoto(item);
  const nom = locale === "en" ? item.name : item.nom;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={choisie}
      className={[
        "tap group flex flex-col overflow-hidden rounded-card border text-left transition-colors",
        choisie ? "border-brand bg-brand/5" : "border-line bg-surface hover:border-ink/40",
      ].join(" ")}
    >
      <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-surface-2 text-muted-2">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          // Pas de photo honnête pour cette machine : plutôt une illustration
          // du groupe travaillé qu'une image d'un autre appareil.
          <MuscleIllustration muscle={item.groupes[0]} className="h-[84%] w-auto py-1.5" />
        )}
        {choisie ? (
          <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : null}
      </div>
      <span className="px-2.5 py-2 font-archivo text-[13px] font-bold leading-tight tracking-[-0.01em] text-ink">
        {nom}
      </span>
    </button>
  );
}

export function EquipmentPicker({
  chosen,
  onToggle,
  onFreeText,
  onClose,
}: {
  /** Clés du catalogue déjà retenues par le client. */
  chosen: ReadonlySet<string>;
  onToggle: (item: EquipmentItem) => void;
  /** Matériel introuvable au catalogue, gardé tel quel. */
  onFreeText: (nom: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [groupe, setGroupe] = useState<MuscleGroup | null>(null);
  const [libre, setLibre] = useState("");

  const resultats = useMemo(() => searchEquipment(q, groupe), [q, groupe]);

  function ajouterLibre() {
    const nom = libre.trim();
    if (!nom) return;
    onFreeText(nom);
    setLibre("");
  }

  return (
    <ModalLayer onClose={onClose} label={t("gym.pickTitle")} closeLabel={t("common.close")}>
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        <div className="flex flex-col gap-3 border-b border-line-2 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-archivo font-extrabold text-[18px] leading-tight tracking-[-0.02em] text-ink">
                {t("gym.pickTitle")}
              </h2>
              <p className="text-[13px] leading-snug text-muted">{t("gym.pickIntro")}</p>
            </div>
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

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("gym.pickSearch")}
            className="tap h-11 w-full rounded-control border border-line-4 bg-surface px-3.5 text-[16px] text-ink placeholder:text-disabled outline-none focus:border-ink"
          />

          {/* Filtres par groupe musculaire : la deuxième façon de chercher,
              pour qui ne connaît pas le nom de sa machine. */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
            <Puce actif={groupe === null} onClick={() => setGroupe(null)} libelle={t("gym.pickAll")} />
            {MUSCLE_GROUPS.map((g) => (
              <Puce
                key={g}
                actif={groupe === g}
                onClick={() => setGroupe(groupe === g ? null : g)}
                libelle={MUSCLE_GROUP_LABEL[g][locale]}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {resultats.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {resultats.map((item) => (
                <Tuile
                  key={item.key}
                  item={item}
                  choisie={chosen.has(item.key)}
                  onToggle={() => onToggle(item)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-card border border-dashed border-line-4 bg-surface-2 px-5 py-6 text-center text-[13.5px] text-muted-2">
              {t("gym.pickNone")}
            </p>
          )}

          {/* Dernier recours : le catalogue ne connaîtra jamais tout. */}
          <div className="mt-5 flex flex-col gap-2 border-t border-line-2 pt-4">
            <span className="text-[13px] text-muted">{t("gym.pickOther")}</span>
            <div className="flex gap-2">
              <input
                value={libre}
                onChange={(e) => setLibre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  ajouterLibre();
                }}
                placeholder={t("gym.addPlaceholder")}
                className="tap h-11 min-w-0 flex-1 rounded-control border border-line-4 bg-surface px-3.5 text-[16px] text-ink placeholder:text-disabled outline-none focus:border-ink"
              />
              <button
                type="button"
                onClick={ajouterLibre}
                className="tap shrink-0 rounded-btn border border-line-4 bg-surface px-4 text-[14px] font-semibold text-ink hover:border-ink"
              >
                {t("gym.add")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-2 px-4 py-3 sm:px-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
            {t("gym.pickCount", { n: chosen.size })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-btn bg-brand px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            {t("gym.pickDone")}
          </button>
        </div>
      </div>
    </ModalLayer>
  );
}

function Puce({ actif, onClick, libelle }: { actif: boolean; onClick: () => void; libelle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={[
        "tap shrink-0 rounded-pill border px-3 py-1.5 text-[12.5px] font-medium",
        actif ? "border-brand bg-brand text-white" : "border-line-3 bg-surface-2 text-muted",
      ].join(" ")}
    >
      {libelle}
    </button>
  );
}
