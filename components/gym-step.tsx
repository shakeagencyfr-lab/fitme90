"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage, base64Of } from "@/lib/image";
import { saveEquipment, type EquipItem } from "@/app/salle/actions";
import { Button, Alert, Card, MonoLabel, Field } from "@/components/ui";

const FALLBACK = [
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
];

export function GymStep() {
  const router = useRouter();
  const [items, setItems] = useState<(EquipItem & { on: boolean })[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  function addItems(list: EquipItem[]) {
    setItems((cur) => {
      const names = new Set(cur.map((i) => i.name.toLowerCase()));
      const add = list
        .filter((i) => !names.has(i.name.toLowerCase()))
        .map((i) => ({ ...i, on: true }));
      return [...cur, ...add];
    });
  }

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    if (!files.length) return;
    setAnalyzing(true);
    setError("");
    try {
      const images = await Promise.all(
        files.map(async (f) => {
          const { dataUrl } = await compressImage(f, 900);
          return { data: base64Of(dataUrl), media_type: "image/jpeg" as const };
        }),
      );
      const res = await fetch("/api/analyze-gym", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse indisponible.");
      addItems(
        (data.equipment as { name: string; confidence: string }[]).map((e2) => ({
          name: e2.name,
          confidence: e2.confidence,
          source: "photo" as const,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse indisponible.");
    } finally {
      setAnalyzing(false);
    }
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
    router.push("/generation");
  }

  return (
    <div className="mx-auto flex max-w-[780px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <MonoLabel className="text-brand">Étape 2 · matériel</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Photographie ta salle
        </h1>
        <p className="max-w-[58ch] text-[15.5px] leading-[1.6] text-muted">
          Une à trois photos larges suffisent. Les images sont réduites avant analyse,
          puis le matériel lu sur tes photos s'affiche : tu corriges, et seuls ces
          équipements servent au programme.
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <input type="file" accept="image/*" multiple id="gym-photos" className="hidden" onChange={onPhotos} />
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => document.getElementById("gym-photos")?.click()} loading={analyzing} variant="outline" className="h-12">
          {analyzing ? "Analyse en cours…" : "Analyser mes photos"}
        </Button>
      </div>

      <Card className="flex flex-col gap-3">
        <MonoLabel>Ton matériel</MonoLabel>
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
                {it.confidence ? <span className="opacity-70"> · {it.confidence}</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-2">
            Aucun matériel pour l'instant. Analyse des photos ou ajoute à la main.
          </p>
        )}
        <div className="flex items-end gap-2">
          <Field
            id="manual"
            label="Ajouter à la main"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManual())}
            placeholder="Barre EZ, TRX…"
          />
          <Button onClick={addManual} variant="outline" className="h-11">Ajouter</Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {FALLBACK.map((name) => (
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
        <Button variant="ghost" onClick={validate} className="h-[52px]">Passer</Button>
        <Button onClick={validate} loading={saving} className="h-[52px] flex-1 max-w-[340px]">
          Générer mon programme
        </Button>
      </div>
    </div>
  );
}
