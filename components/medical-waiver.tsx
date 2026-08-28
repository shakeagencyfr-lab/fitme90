"use client";

import { useState } from "react";
import { signMedicalWaiver } from "@/app/questionnaire/actions";
import {
  MEDICAL_WAIVER_TITLE,
  MEDICAL_WAIVER_INTRO,
  MEDICAL_WAIVER_CLAUSES,
  MEDICAL_WAIVER_CONSENT,
} from "@/lib/legal";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

// Décharge médicale (consentement éclairé) : présentée quand une situation de
// santé est déclarée. N'empêche PAS l'accès : l'utilisateur lit, coche, signe
// de son nom, puis poursuit. La signature est mémorisée côté serveur.
export function MedicalWaiver({
  reasons,
  onSigned,
  submitLabel = "Signer et continuer",
}: {
  reasons: string[];
  onSigned: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  async function sign() {
    setError("");
    if (!agreed) return setError("Coche la case pour confirmer ton accord.");
    if (name.trim().length < 2) return setError("Indique ton nom et prénom pour signer.");
    setBusy(true);
    const res = await signMedicalWaiver({ name: name.trim(), reasons });
    setBusy(false);
    if (res.error) return setError(res.error);
    onSigned();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <MonoLabel className="text-brand">Une dernière étape</MonoLabel>
        <h2 className="font-archivo font-extrabold text-[clamp(22px,5vw,30px)] leading-[1.1] tracking-[-0.02em] text-ink">
          {MEDICAL_WAIVER_TITLE}
        </h2>
        <p className="text-[14.5px] leading-[1.6] text-muted">{MEDICAL_WAIVER_INTRO}</p>
      </div>

      {reasons.length ? (
        <Alert>
          <span className="font-semibold">À prendre en compte :</span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13.5px]">
                <span aria-hidden>•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-3 bg-surface-2">
        {MEDICAL_WAIVER_CLAUSES.map((c, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="font-archivo font-semibold text-[14px] text-ink">{c.title}</span>
            <span className="text-[13px] leading-[1.55] text-body">{c.body}</span>
          </div>
        ))}
      </Card>

      <label className="flex items-start gap-3 rounded-control border border-line-3 bg-surface px-3.5 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-[#E0551F]"
        />
        <span className="text-[13.5px] leading-[1.5] text-body">{MEDICAL_WAIVER_CONSENT}</span>
      </label>

      <div className="flex flex-col gap-1.5">
        <MonoLabel>Signature (nom et prénom)</MonoLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton nom et prénom"
          className="tap w-full rounded-btn border border-line-3 bg-surface-2 px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink"
        />
        <span className="text-[12px] text-muted-2">Fait le {today}. Ta signature électronique est horodatée et conservée.</span>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <Button onClick={sign} loading={busy} className="h-[52px]">
        {submitLabel}
      </Button>
    </div>
  );
}
