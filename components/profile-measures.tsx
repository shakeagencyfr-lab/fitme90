"use client";

import { useActionState, useState } from "react";
import { updateMeasures, type ProfilState } from "@/app/app/profil/actions";
import { bmi, bmiBadge, karvonen } from "@/lib/fitness";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";

interface Props {
  age: string;
  weight: string;
  height: string;
  rest: string;
}

const FIELDS: [key: keyof Props, label: string, placeholder: string][] = [
  ["age", "Âge", "34"],
  ["weight", "Poids (kg)", "68"],
  ["height", "Taille (cm)", "170"],
  ["rest", "FC repos", "62"],
];

export function ProfileMeasures({ sex, ...initial }: Props & { sex?: string }) {
  const [state, action, pending] = useActionState(updateMeasures, {} as ProfilState);
  const [vals, setVals] = useState<Props>(initial);

  const n = (s: string) => Number(String(s).replace(",", ".")) || 0;
  const age = n(vals.age) || 34;
  const weight = n(vals.weight) || 68;
  const height = n(vals.height) || 170;
  const rest = n(vals.rest) || 62;
  const female = /^f/i.test(sex ?? "");

  const bmiVal = bmi(weight, height);
  const badge = bmiBadge(bmiVal);
  const { hrMax, zones } = karvonen(age, rest, sex);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Mesures + IMC */}
      <Card className="flex flex-col gap-4">
        <div className="font-archivo font-bold text-[17px] text-ink">Mesures</div>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([key, label, ph]) => (
              <label key={key} className="flex flex-col gap-1.5">
                <MonoLabel>{label}</MonoLabel>
                <input
                  name={key}
                  value={vals[key]}
                  onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
                  inputMode="decimal"
                  placeholder={ph}
                  className="tap w-full rounded-control border border-line-3 bg-surface-2 px-3.5 font-archivo font-semibold text-ink outline-none focus:border-ink"
                />
              </label>
            ))}
          </div>

          <div className="h-px bg-line-2" />

          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <MonoLabel>IMC</MonoLabel>
                <div className="font-archivo font-extrabold text-[42px] leading-none tracking-[-0.03em] text-ink">
                  {bmiVal ? bmiVal.toFixed(1).replace(".", ",") : "·"}
                </div>
              </div>
              <span
                className="rounded-pill px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: badge.bg, color: badge.fg }}
              >
                {badge.label}
              </span>
            </div>
            <div
              className="relative h-2 rounded-[4px]"
              style={{ background: "linear-gradient(90deg,#8FB8E8 0%,#7FBF8A 28%,#E8C05A 55%,#E0551F 100%)" }}
            >
              <div
                className="absolute -top-1 h-4 w-[3px] rounded-[2px] bg-ink"
                style={{ left: `${badge.pos}%` }}
              />
            </div>
          </div>

          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.ok ? <Alert tone="info">Mesures enregistrées.</Alert> : null}
          <Button type="submit" loading={pending} className="self-start h-11">
            Enregistrer
          </Button>
        </form>
      </Card>

      {/* Zones cardiaques Karvonen */}
      <Card className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="font-archivo font-bold text-[17px] text-ink">
            Zones cardiaques, Karvonen
          </div>
          <span className="font-mono text-[11px] text-muted-2">FC max {hrMax}</span>
        </div>
        <div className="flex flex-col gap-2">
          {zones.map((z) => (
            <div
              key={z.id}
              className="flex items-center justify-between gap-3 rounded-control px-3.5 py-3"
              style={{ background: z.bg }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-archivo font-extrabold text-[13px]" style={{ color: z.fg }}>
                  {z.id}
                </span>
                <div className="min-w-0">
                  <div className="font-archivo font-semibold text-[15px] leading-tight text-[#1b1d1f]">
                    {z.name}
                  </div>
                  <div className="truncate text-[12.5px] text-[#5c5a54]">{z.use}</div>
                </div>
              </div>
              <span className="font-archivo font-extrabold text-[16px] tabular-nums shrink-0" style={{ color: z.fg }}>
                {z.range}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted-2">
          Réserve cardiaque (Karvonen) : à partir de ta FC de repos et de ta FC max
          estimée ({female ? "Gulati : 206 − 0,88 × âge" : "220 − âge"}).
        </p>
      </Card>
    </div>
  );
}
