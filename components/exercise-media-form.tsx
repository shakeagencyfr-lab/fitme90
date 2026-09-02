"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveExerciseMedia, type ExerciseMediaState } from "@/app/admin/actions";
import { Button, Alert, Card } from "@/components/ui";

// Formulaire d'ajout / mise à jour d'un média d'exercice par le coach
// (image ou gif + consignes). Prioritaire sur la bibliothèque intégrée.
export function ExerciseMediaForm() {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveExerciseMedia, {} as ExerciseMediaState);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    router.refresh();
    // Différé hors du corps synchrone de l'effet (règle set-state-in-effect).
    const t = setTimeout(() => setPreview(null), 0);
    return () => clearTimeout(t);
  }, [state.ok, router]);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Ajouter un exercice")}</div>
        <p className="text-[13px] leading-[1.6] text-muted">
          {tx("Ton image ou gif et tes consignes s'afficheront à tes clients quand ils cliquent sur cet exercice, à la place de la fiche par défaut. Le nom doit correspondre à celui de tes séances (ex")} <span className="font-mono text-body">{tx("Développé couché")}</span>).
        </p>
      </div>

      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Nom de l'exercice")}</span>
            <input
              name="name"
              required
              maxLength={120}
              placeholder={tx("Développé couché")}
              className="h-11 rounded-control border border-line-4 bg-surface px-3.5 text-[14px] text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Groupe musculaire (optionnel)")}</span>
            <input
              name="muscle"
              maxLength={80}
              placeholder={tx("Pectoraux")}
              className="h-11 rounded-control border border-line-4 bg-surface px-3.5 text-[14px] text-ink outline-none focus:border-ink"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Image ou GIF")}</span>
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
            className="text-[13px] text-body file:mr-3 file:rounded-btn file:border-0 file:bg-fill file:px-3.5 file:py-2 file:text-[13px] file:font-semibold file:text-fillfg"
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={tx("Aperçu")} className="mt-1 max-h-48 w-fit rounded-control border border-line-3 object-contain" />
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Consignes (optionnel)")}</span>
          <textarea
            name="instructions"
            rows={4}
            maxLength={4000}
            placeholder={tx("Étapes d'exécution, conseils de posture, erreurs à éviter…")}
            className="rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
        </label>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Exercice enregistré.")}</Alert> : null}

        <Button type="submit" loading={pending} className="h-11 self-start px-6">
          {tx("Enregistrer l'exercice")}</Button>
      </form>
    </Card>
  );
}
