import { notFound } from "next/navigation";
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
import { libraryEntry } from "@/lib/exercise-library";
import { CircuitCatalog, type CatalogCircuit } from "@/components/circuit-catalog";
import { CircuitBuilder } from "@/components/circuit-builder";
import { MonoLabel } from "@/components/ui";

// Bac à sable de l'écran « Circuit training » du dashboard coach, sur le même
// principe que /dev/circuit : le catalogue et le configurateur, sans compte ni
// base, pour les regarder dans un vrai navigateur. L'enregistrement, lui,
// demande un vrai compte. Désactivé sauf si LANDING_PREVIEW=1.
export const dynamic = "force-dynamic";

export default function DevCircuitsPage() {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  const loc = "fr" as const;
  const themes = CIRCUIT_THEMES.map((k) => ({ key: k, label: pick(THEME_LABEL[k], loc) }));
  const gears = CIRCUIT_GEARS.map((k) => ({ key: k, label: pick(GEAR_LABEL[k], loc) }));
  const pathologies = PATHOLOGIES.map((k) => ({ key: k, label: pick(PATHOLOGY_LABEL[k], loc) }));

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
    <div className="mx-auto flex max-w-[1000px] flex-col gap-5 p-4">
      <h1 className="font-archivo text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">Circuit training</h1>
      <MonoLabel>La bibliothèque de la plateforme</MonoLabel>
      <CircuitCatalog circuits={catalogue} themes={themes} gears={gears} />
      <MonoLabel>Créer un circuit</MonoLabel>
      <CircuitBuilder themes={themes} gears={gears} pathologies={pathologies} />
    </div>
  );
}
