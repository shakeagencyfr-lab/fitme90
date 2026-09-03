"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage, base64Of } from "@/lib/image";
import {
  MAX_GYM_PHOTOS,
  GYM_PHOTOS_PER_BATCH,
  GYM_PHOTO_MAX_PX,
  GYM_PHOTO_QUALITY,
} from "@/lib/config";
import { confidenceLabel, equipmentKey } from "@/lib/equipment";
import { saveEquipment, type EquipItem } from "@/app/salle/actions";
import { Button, Alert, Card, MonoLabel, Field } from "@/components/ui";
import { useLocale, useT } from "@/components/locale-provider";

const FALLBACK: Record<"fr" | "en", string[]> = {
  fr: [
    "Rack à squat + barre olympique",
    "Banc réglable",
    "Haltères",
    "Poulie haute / basse",
    "Presse à cuisses",
    "Tapis de course",
    "Rameur",
    "Kettlebells",
    "Élastiques",
    "Poids du corps uniquement",
  ],
  en: [
    "Squat rack + Olympic bar",
    "Adjustable bench",
    "Dumbbells",
    "Cable machine (high / low)",
    "Leg press",
    "Treadmill",
    "Rowing machine",
    "Kettlebells",
    "Resistance bands",
    "Bodyweight only",
  ],
};

export function GymStep({ nextHref = "/generation" }: { nextHref?: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<(EquipItem & { on: boolean })[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  // Fusion entre lots : « Presse à cuisses » et « presse a cuisses » vues sur
  // deux photos différentes ne doivent donner qu'une seule ligne.
  function addItems(list: EquipItem[]) {
    setItems((cur) => {
      const seen = new Set(cur.map((i) => equipmentKey(i.name)));
      const add: (EquipItem & { on: boolean })[] = [];
      for (const i of list) {
        const key = equipmentKey(i.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        add.push({ ...i, on: true });
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

  function addManual() {
    const name = manual.trim();
    if (!name) return;
    addItems([{ name, source: "manuel" }]);
    setManual("");
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
        <span className="text-[12.5px] text-muted-2">{t("gym.photoHint", { max: MAX_GYM_PHOTOS })}</span>
      </div>

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("gym.yourEquipment")}</MonoLabel>
        {items.length ? (
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => setItems((c) => c.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                className={[
                  "tap rounded-pill border px-4 text-[14px]",
                  it.on ? "bg-brand text-white border-brand" : "bg-surface text-muted-2 border-line-4 line-through",
                ].join(" ")}
              >
                {it.name}
                {confidenceLabel(it.confidence, locale) ? (
                  <span className="opacity-70"> · {confidenceLabel(it.confidence, locale)}</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-2">{t("gym.empty")}</p>
        )}
        <div className="flex items-end gap-2">
          <Field
            id="manual"
            label={t("gym.addManually")}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManual())}
            placeholder={t("gym.addPlaceholder")}
          />
          <Button onClick={addManual} variant="outline" className="h-11">{t("gym.add")}</Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {FALLBACK[locale].map((name) => (
            <button
              key={name}
              onClick={() => addItems([{ name, source: "manuel" }])}
              className="tap rounded-pill border border-line-3 bg-surface-2 px-3 text-[12.5px] text-muted"
            >
              + {name}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={validate} className="h-[52px]">{t("gym.skip")}</Button>
        <Button onClick={validate} loading={saving} className="h-[52px] flex-1 max-w-[340px]">
          {nextHref === "/app/paiement" ? t("gym.toPayment") : t("gym.generate")}
        </Button>
      </div>
    </div>
  );
}
