import { getAdminOrNull } from "@/lib/admin";
import { tx } from "@/lib/i18n/request";
import { listCoachExerciseMedia } from "@/lib/exercise-guide";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { removeExerciseMedia } from "@/app/admin/actions";
import { ExerciseMediaForm } from "@/components/exercise-media-form";
import { ExerciseCatalog } from "@/components/exercise-catalog";
import { Alert, Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Exercices" };

export default async function AdminExercisesPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const media = tenantId ? await listCoachExerciseMedia(tenantId) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Bibliothèque d'exercices")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Quand un client clique sur un exercice de sa séance, une fiche s'ouvre avec une image et les consignes.")} {EXERCISE_LIBRARY.length} {tx("mouvements courants sont déjà illustrés par défaut, et les autres reçoivent des consignes générées automatiquement. Ici, tu peux ajouter TES propres visuels et consignes pour n'importe quel exercice (ils remplacent la fiche par défaut).")}</p>
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          <ExerciseMediaForm />

          <div className="flex flex-col gap-3">
            <MonoLabel>{tx("Mes exercices personnalisés")}</MonoLabel>
            {media.length === 0 ? (
              <Alert tone="info">
                {tx("Aucun exercice personnalisé pour l'instant. Tes clients voient la bibliothèque par défaut.")}</Alert>
            ) : (
              media.map((m) => (
                <Card key={m.id} className="flex items-center gap-3.5">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" className="size-16 shrink-0 rounded-control border border-line-3 object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-control bg-surface-2 text-muted-2">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                        <path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-archivo font-bold text-[15.5px] text-ink">{m.name}</span>
                    {m.muscle ? <span className="text-[12.5px] text-muted-2">{m.muscle}</span> : null}
                    {m.instructions ? <span className="truncate text-[12.5px] text-muted">{m.instructions}</span> : null}
                  </div>
                  <form action={removeExerciseMedia}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="tap shrink-0 rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand"
                    >
                      {tx("Supprimer")}</button>
                  </form>
                </Card>
              ))
            )}
          </div>

          <div className="border-t border-line pt-5">
            <ExerciseCatalog />
          </div>
        </>
      )}
    </div>
  );
}
