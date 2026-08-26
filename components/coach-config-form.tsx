"use client";

import { useActionState, useState } from "react";
import { saveCoachConfig, type ConfigState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

interface Props {
  initialMode: "auto" | "custom";
  initialCustom: string;
}

export function CoachConfigForm({ initialMode, initialCustom }: Props) {
  const [state, action, pending] = useActionState(saveCoachConfig, {} as ConfigState);
  const [mode, setMode] = useState<"auto" | "custom">(initialMode);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">Mode de génération</div>
          <p className="text-[13px] text-muted">
            Comment l&apos;IA construit les programmes des clients.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {(
            [
              ["auto", "Laisser l'IA décider", "L'IA applique la méthodologie evidence-based de référence."],
              ["custom", "Personnaliser avec ma méthode", "L'IA suit TES consignes ci-dessous (prioritaires) en plus de la base."],
            ] as const
          ).map(([val, title, desc]) => (
            <label
              key={val}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-control border p-3.5 transition-colors",
                mode === val ? "border-brand bg-alert" : "border-line-4 bg-surface hover:border-ink",
              ].join(" ")}
            >
              <input
                type="radio"
                name="mode"
                value={val}
                checked={mode === val}
                onChange={() => setMode(val)}
                className="mt-1"
                style={{ accentColor: "#e0551f" }}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-[15px] text-ink">{title}</span>
                <span className="text-[13px] text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Ma méthodologie (utilisée en mode personnalisé)</MonoLabel>
          <textarea
            name="custom_methodology"
            defaultValue={initialCustom}
            rows={12}
            maxLength={8000}
            placeholder="Ex : Toujours full-body 3× pour les débutants. Squat et soulevé de terre au cœur du cycle 2. Éviter le développé militaire debout pour les épaules fragiles. Repos 90 s en hypertrophie. Déficit max −20 %…"
            className="w-full rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            Écris tes règles comme à un assistant coach. 8000 caractères max.
          </span>
        </label>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Configuration enregistrée. Elle s&apos;applique aux prochaines générations.</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          Enregistrer la configuration
        </Button>
      </form>
    </Card>
  );
}
