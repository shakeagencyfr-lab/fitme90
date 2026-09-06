"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage, base64Of } from "@/lib/image";
import {
  MAX_GYM_PHOTOS,
  GYM_PHOTOS_PER_BATCH,
  GYM_PHOTO_MAX_PX,
  GYM_PHOTO_QUALITY,
} from "@/lib/config";
import { confidenceLabel, equipmentKey } from "@/lib/equipment";
import { equipmentPhoto, matchEquipment, type EquipmentItem } from "@/lib/equipment-catalog";
import { EquipmentPicker } from "@/components/equipment-picker";
import { saveEquipment, type EquipItem } from "@/app/salle/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { useLocale, useT } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

type Ligne = EquipItem & { on: boolean };

/** Le nom d'une machine du catalogue dans la langue du client. */
function nomLocal(item: EquipmentItem, locale: Locale): string {
  return locale === "en" ? item.name : item.nom;
}

export function GymStep({ nextHref = "/generation" }: { nextHref?: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<Ligne[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);

  // Chaque ligne est rattachée au catalogue quand c'est possible : c'est ce
  // qui donne la photo, et ce qui fait qu'une machine vue en photo et la même
  // machine cochée à la main ne font qu'une entrée.
  const resolues = useMemo(
    () => items.map((it) => ({ ligne: it, cat: matchEquipment(it.name) })),
    [items],
  );

  const cochees = useMemo(() => {
    const s = new Set<string>();
    for (const r of resolues) if (r.cat && r.ligne.on) s.add(r.cat.key);
    return s;
  }, [resolues]);

  /**
   * Fusion des sources. Deux photos de la même machine, ou une machine vue en
   * photo puis cochée à la main, ne donnent qu'une ligne : la clé de
   * dédoublonnage passe par le catalogue quand le nom y est reconnu, et
   * retombe sur le texte normalisé sinon.
   */
  function addItems(list: EquipItem[]) {
    setItems((cur) => {
      const cle = (nom: string) => {
        const cat = matchEquipment(nom);
        return cat ? `cat:${cat.key}` : equipmentKey(nom);
      };
      const seen = new Set(cur.map((i) => cle(i.name)));
      const add: Ligne[] = [];
      for (const i of list) {
        const k = cle(i.name);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        // Nom canonique dès qu'il est reconnu : le générateur reçoit alors un
        // vocabulaire fermé au lieu des cinq façons d'écrire « presse ».
        const cat = matchEquipment(i.name);
        add.push({ ...i, name: cat ? nomLocal(cat, locale) : i.name, on: true });
      }
      return [...cur, ...add];
    });
  }

  /**
   * Analyse les photos par LOTS. Trois raisons de ne pas tout envoyer d'un
   * coup : le corps d'une requête serverless est plafonné (15 photos le
   * dépassent), un lot qui échoue ne fait pas perdre les autres, et le modèle
   * regarde mieux 4 photos que 15. Les résultats s'affichent au fil de l'eau.
   */
  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_GYM_PHOTOS);
    if (!files.length) return;
    setAnalyzing(true);
    setError("");
    setProgress({ done: 0, total: files.length });

    const batches: File[][] = [];
    for (let i = 0; i < files.length; i += GYM_PHOTOS_PER_BATCH) {
      batches.push(files.slice(i, i + GYM_PHOTOS_PER_BATCH));
    }

    let failed = 0;
    let analysed = 0;
    for (const batch of batches) {
      try {
        const images = await Promise.all(
          batch.map(async (f) => {
            const { dataUrl } = await compressImage(f, GYM_PHOTO_MAX_PX, GYM_PHOTO_QUALITY);
            return { data: base64Of(dataUrl), media_type: "image/jpeg" as const };
          }),
        );
        const res = await fetch("/api/analyze-gym", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ images }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("gym.analyzeUnavailable"));
        addItems(
          (data.equipment as { name: string; confidence: string }[]).map((e2) => ({
            name: e2.name,
            confidence: e2.confidence,
            source: "photo" as const,
          })),
        );
      } catch {
        failed += 1;
      }
      analysed += batch.length;
      setProgress({ done: analysed, total: files.length });
    }

    // Un lot raté sur cinq n'est pas un échec : on garde ce qui a été trouvé
    // et on dit seulement ce qui manque.
    if (failed === batches.length) setError(t("gym.analyzeUnavailable"));
    else if (failed > 0) setError(t("gym.analyzePartial"));
    setProgress(null);
    setAnalyzing(false);
    // Sans ça, resélectionner les mêmes fichiers ne déclencherait rien.
    e.target.value = "";
  }

  /**
   * Clic sur une tuile du menu. Une machine déjà retenue en sort (c'est un
   * sélecteur : on décoche ce qu'on a coché par erreur) ; une machine
   * décochée à la pastille redevient simplement active.
   */
  function toggleCatalogue(item: EquipmentItem) {
    setItems((cur) => {
      const i = cur.findIndex((l) => matchEquipment(l.name)?.key === item.key);
      if (i < 0) {
        return [...cur, { name: nomLocal(item, locale), source: "manuel", on: true }];
      }
      if (!cur[i].on) return cur.map((l, j) => (j === i ? { ...l, on: true } : l));
      return cur.filter((_, j) => j !== i);
    });
  }

  async function validate() {
    setSaving(true);
    setError("");
    const selected: EquipItem[] = items
      .filter((i) => i.on)
      .map((i) => ({ name: i.name, confidence: i.confidence, source: i.source }));
    const res = await saveEquipment(selected);
    if (res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    router.push(nextHref);
  }

  return (
    <div className="mx-auto flex max-w-[780px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <MonoLabel className="text-brand">{t("gym.step")}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {t("gym.title")}
        </h1>
        <p className="max-w-[58ch] text-[15.5px] leading-[1.6] text-muted">{t("gym.body")}</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <input type="file" accept="image/*" multiple id="gym-photos" className="hidden" onChange={onPhotos} />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => document.getElementById("gym-photos")?.click()} loading={analyzing} variant="outline" className="h-12">
          {analyzing
            ? progress
              ? t("gym.analyzingCount", { done: progress.done, total: progress.total })
              : t("gym.analyzing")
            : t("gym.analyze")}
        </Button>
        <Button onClick={() => setPicker(true)} className="h-12">{t("gym.pick")}</Button>
        <span className="text-[12.5px] text-muted-2">{t("gym.photoHint", { max: MAX_GYM_PHOTOS })}</span>
      </div>

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("gym.yourEquipment")}</MonoLabel>
        {resolues.length ? (
          <div className="flex flex-wrap gap-2">
            {resolues.map(({ ligne, cat }, i) => {
              const photo = cat ? equipmentPhoto(cat) : null;
              return (
                <button
                  key={i}
                  onClick={() => setItems((c) => c.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                  className={[
                    "tap flex items-center gap-2 rounded-pill border py-1 pr-4 text-[14px]",
                    photo ? "pl-1" : "pl-4",
                    ligne.on ? "bg-brand text-white border-brand" : "bg-surface text-muted-2 border-line-4 line-through",
                  ].join(" ")}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      className={["size-7 shrink-0 rounded-full object-cover", ligne.on ? "" : "opacity-50"].join(" ")}
                    />
                  ) : null}
                  <span>
                    {ligne.name}
                    {confidenceLabel(ligne.confidence, locale) ? (
                      <span className="opacity-70"> · {confidenceLabel(ligne.confidence, locale)}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[14px] text-muted-2">{t("gym.empty")}</p>
        )}
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="tap w-fit rounded-btn border border-dashed border-line-4 bg-surface-2 px-4 py-2 text-[13.5px] font-medium text-muted hover:border-ink hover:text-ink"
        >
          + {t("gym.pick")}
        </button>
      </Card>

      {picker ? (
        <EquipmentPicker
          chosen={cochees}
          onToggle={toggleCatalogue}
          onFreeText={(nom) => addItems([{ name: nom, source: "manuel" }])}
          onClose={() => setPicker(false)}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={validate} className="h-[52px]">{t("gym.skip")}</Button>
        <Button onClick={validate} loading={saving} className="h-[52px] flex-1 max-w-[340px]">
          {nextHref === "/app/paiement" ? t("gym.toPayment") : t("gym.generate")}
        </Button>
      </div>
    </div>
  );
}
