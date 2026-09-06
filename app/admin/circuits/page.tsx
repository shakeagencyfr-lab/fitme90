import { getAdminOrNull } from "@/lib/admin";
import { tx, getRequestLocale } from "@/lib/i18n/request";
import { pick } from "@/lib/i18n";
import {
  CIRCUIT_GEARS,
  CIRCUIT_TEMPLATES,
  CIRCUIT_THEMES,
  GEAR_LABEL,
  PATHOLOGIES,
  PATHOLOGY_LABEL,
  THEME_LABEL,
} from "@/lib/circuit-library";
import { listCoachCircuits } from "@/lib/coach-circuits";
import { libraryEntry } from "@/lib/exercise-library";
import { removeCircuit } from "@/app/admin/actions";
import { CircuitCatalog, type CatalogCircuit } from "@/components/circuit-catalog";
import { CircuitBuilder } from "@/components/circuit-builder";
import { Alert, Card, MonoLabel } from "@/components/ui";

export const metadata = { title: "Circuit training" };

export default async function AdminCircuitsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const loc = getRequestLocale();
  const mine = tenantId ? await listCoachCircuits(tenantId) : [];

  const themes = CIRCUIT_THEMES.map((k) => ({ key: k, label: pick(THEME_LABEL[k], loc) }));
  const gears = CIRCUIT_GEARS.map((k) => ({ key: k, label: pick(GEAR_LABEL[k], loc) }));
  const pathologies = PATHOLOGIES.map((k) => ({ key: k, label: pick(PATHOLOGY_LABEL[k], loc) }));

  // Le catalogue passe au client sous une forme déjà lisible : les libellés
  // sont résolus ici, où la locale de la page est connue.
  const catalogue: CatalogCircuit[] = CIRCUIT_TEMPLATES.map((t) => ({
    id: t.id,
    title: pick(t.title, loc),
    goal: pick(t.goal, loc),
    theme: pick(THEME_LABEL[t.theme], loc),
    themeKey: t.theme,
    gear: pick(GEAR_LABEL[t.gear], loc),
    gearKey: t.gear,
    levels: t.levels,
    impact: t.impact,
    avoid: t.avoid.map((p) => pick(PATHOLOGY_LABEL[p], loc)),
    safeFor: (t.safeFor ?? []).map((p) => pick(PATHOLOGY_LABEL[p], loc)),
    blocks: [...t.blocks, ...(t.finisher ? [t.finisher] : [])].map((b) => ({
      title: pick(b.title, loc),
      exercises: b.exercises.map((e) => {
        const key = typeof e === "string" ? e : e.key;
        return { key, name: libraryEntry(key, key)?.name ?? key };
      }),
    })),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo text-[clamp(26px,5vw,36px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Circuit training")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Un circuit, c'est une séance en blocs chronométrés que le client enchaîne au chrono plein écran, sans charge à noter. Ton Coach IA y puise quand un client demande à remplacer une séance, veut travailler un groupe précis, ou n'a pas son matériel.")} {CIRCUIT_TEMPLATES.length} {tx("circuits sont déjà écrits et disponibles pour tes clients. Tu peux créer les tiens juste en dessous : ils passeront devant les nôtres.")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <MonoLabel>{tx("La bibliothèque de la plateforme")}</MonoLabel>
        <CircuitCatalog circuits={catalogue} themes={themes} gears={gears} />
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <MonoLabel>{tx("Mes circuits")}</MonoLabel>
            {mine.length === 0 ? (
              <Alert tone="info">
                {tx("Tu n'as pas encore créé de circuit. Tes clients reçoivent ceux de la bibliothèque.")}</Alert>
            ) : (
              mine.map((c) => (
                <Card key={c.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-archivo text-[15.5px] font-bold text-ink">{c.title}</span>
                      <span className="text-[12.5px] text-muted-2">
                        {pick(THEME_LABEL[c.theme], loc)} · {pick(GEAR_LABEL[c.gear], loc)} · {c.blocks.length} {tx("blocs")}
                        {c.enabled ? "" : ` · ${tx("désactivé")}`}
                      </span>
                      {c.goal ? <span className="text-[13px] text-muted">{c.goal}</span> : null}
                    </div>
                    <form action={removeCircuit}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="tap shrink-0 rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand"
                      >
                        {tx("Supprimer")}
                      </button>
                    </form>
                  </div>
                  <div className="flex flex-col gap-1">
                    {c.blocks.map((b, i) => (
                      <span key={i} className="text-[12.5px] text-muted">
                        <span className="font-semibold text-body-2">{b.title}</span> :{" "}
                        {b.keys.map((k) => libraryEntry(k, k)?.name ?? k).join(", ")}
                      </span>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3">
            <MonoLabel>{tx("Créer un circuit")}</MonoLabel>
            <CircuitBuilder themes={themes} gears={gears} pathologies={pathologies} />
          </div>
        </>
      )}
    </div>
  );
}
