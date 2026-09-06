// Les circuits écrits par le coach lui-même.
//
// POURQUOI. Le catalogue de lib/circuit-library est celui de la plateforme :
// il est bon, il est relu, mais ce n'est pas LA méthode du coach. Un
// préparateur qui vend son accompagnement veut que ses clients retrouvent SES
// enchaînements, comme il veut ses propres photos sur ses exercices. Le
// configurateur du dashboard écrit ces circuits, et ils rejoignent le
// catalogue pour ses clients à lui, en passant devant les nôtres.
//
// CE QUE LE COACH N'A PAS À FAIRE. Inventer des mouvements : il choisit dans
// la bibliothèque d'exercices, donc chaque exercice de son circuit a déjà sa
// photo et ses consignes. Et fixer une durée : comme les nôtres, son circuit
// est un modèle que le rendu sert à 30, 45, 60 ou 90 minutes.

import { createAdminClient } from "@/lib/supabase/admin";
import { libraryEntry } from "@/lib/exercise-library";
import {
  CIRCUIT_GEARS,
  CIRCUIT_TEMPLATES,
  CIRCUIT_THEMES,
  PATHOLOGIES,
  type CircuitGear,
  type CircuitImpact,
  type CircuitTemplate,
  type CircuitTemplateBlock,
  type CircuitTheme,
  type Pathology,
} from "@/lib/circuit-library";
import type { CircuitLevel } from "@/lib/circuit";

/** Un bloc tel qu'il est stocké : des clés de bibliothèque, rien d'inventé. */
export interface CoachCircuitBlock {
  title: string;
  keys: string[];
  workBias: number;
  restBias: number;
}

export interface CoachCircuit {
  id: string;
  title: string;
  goal: string;
  theme: CircuitTheme;
  gear: CircuitGear;
  levels: CircuitLevel[];
  impact: CircuitImpact;
  avoid: Pathology[];
  safe_for: Pathology[];
  sensation: number | null;
  blocks: CoachCircuitBlock[];
  image_url: string | null;
  enabled: boolean;
}

const LEVELS: readonly CircuitLevel[] = ["debutant", "intermediaire", "avance"] as const;
const IMPACTS: readonly CircuitImpact[] = ["nul", "faible", "fort"] as const;

const asTheme = (v: unknown): CircuitTheme => (CIRCUIT_THEMES.includes(v as CircuitTheme) ? (v as CircuitTheme) : "corps-entier");
const asGear = (v: unknown): CircuitGear => (CIRCUIT_GEARS.includes(v as CircuitGear) ? (v as CircuitGear) : "aucun");
const asImpact = (v: unknown): CircuitImpact => (IMPACTS.includes(v as CircuitImpact) ? (v as CircuitImpact) : "faible");
const asList = <T,>(v: unknown, allowed: readonly T[]): T[] =>
  (Array.isArray(v) ? v : []).filter((x): x is T => allowed.includes(x as T));

/**
 * Un bloc rendu par le formulaire, ramené dans des bornes tenables.
 *
 * Les clés inconnues sont retirées et non corrigées : un exercice qui n'est
 * pas dans la bibliothèque n'a ni photo ni consignes, et le client se
 * retrouverait devant un nom nu au milieu de son chrono.
 */
export function sanitizeCoachBlock(raw: unknown): CoachCircuitBlock | null {
  const b = (raw ?? {}) as Partial<CoachCircuitBlock>;
  const keys = (Array.isArray(b.keys) ? b.keys : [])
    .map((k) => String(k).trim())
    .filter((k) => k && libraryEntry(k, k)?.key === k)
    .slice(0, 10);
  if (keys.length < 2) return null;
  const num = (v: unknown, min: number, max: number): number => {
    const n = typeof v === "number" ? Math.round(v) : parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
  };
  return {
    title: String(b.title ?? "").trim().slice(0, 60) || "Bloc",
    keys: [...new Set(keys)],
    workBias: num(b.workBias, -20, 20),
    restBias: num(b.restBias, -15, 30),
  };
}

/** Un circuit rendu par le formulaire, prêt à enregistrer, ou une erreur lisible. */
export function sanitizeCoachCircuit(raw: unknown): { circuit: Omit<CoachCircuit, "id">; error?: undefined } | { circuit?: undefined; error: string } {
  const c = (raw ?? {}) as Record<string, unknown>;
  const title = String(c.title ?? "").trim().slice(0, 80);
  if (!title) return { error: "Donne un nom à ton circuit." };
  const blocks = (Array.isArray(c.blocks) ? c.blocks : []).map(sanitizeCoachBlock).filter((b): b is CoachCircuitBlock => b !== null);
  if (blocks.length < 2) {
    return { error: "Il faut au moins deux blocs, avec au moins deux mouvements de la bibliothèque dans chacun." };
  }
  const sensationRaw = parseInt(String(c.sensation ?? ""), 10);
  return {
    circuit: {
      title,
      goal: String(c.goal ?? "").trim().slice(0, 300),
      theme: asTheme(c.theme),
      gear: asGear(c.gear),
      levels: asList(c.levels, LEVELS).length ? asList(c.levels, LEVELS) : [...LEVELS],
      impact: asImpact(c.impact),
      avoid: asList(c.avoid, PATHOLOGIES),
      safe_for: asList(c.safe_for, PATHOLOGIES).filter((p) => !asList(c.avoid, PATHOLOGIES).includes(p)),
      sensation: sensationRaw >= 1 && sensationRaw <= 4 ? sensationRaw : null,
      blocks: blocks.slice(0, 5),
      image_url: typeof c.image_url === "string" && c.image_url.trim() ? c.image_url.trim().slice(0, 500) : null,
      enabled: c.enabled !== false,
    },
  };
}

/** Une ligne de la base, ramenée au type du code (la base est du texte libre). */
function fromRow(row: Record<string, unknown>): CoachCircuit {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    goal: String(row.goal ?? ""),
    theme: asTheme(row.theme),
    gear: asGear(row.gear),
    levels: asList(row.levels, LEVELS).length ? asList(row.levels, LEVELS) : [...LEVELS],
    impact: asImpact(row.impact),
    avoid: asList(row.avoid, PATHOLOGIES),
    safe_for: asList(row.safe_for, PATHOLOGIES),
    sensation: typeof row.sensation === "number" ? row.sensation : null,
    blocks: (Array.isArray(row.blocks) ? row.blocks : []).map(sanitizeCoachBlock).filter((b): b is CoachCircuitBlock => b !== null),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    enabled: row.enabled !== false,
  };
}

/**
 * Le circuit du coach, sous la forme d'un modèle du catalogue.
 *
 * Le titre et l'objectif ne sont pas traduits : ce sont les mots du coach,
 * dans sa langue, et les traduire à sa place les trahirait. Le repli des
 * LocalText fait donc voir le même texte à tous ses clients, ce qui est
 * exactement ce qu'il a écrit.
 */
export function templateFromCoachCircuit(c: CoachCircuit): CircuitTemplate {
  const bloc = (b: CoachCircuitBlock): CircuitTemplateBlock => ({
    title: { fr: b.title },
    exercises: b.keys,
    ...(b.workBias ? { workBias: b.workBias } : {}),
    ...(b.restBias ? { restBias: b.restBias } : {}),
  });
  return {
    id: `coach:${c.id}`,
    theme: c.theme,
    gear: c.gear,
    title: { fr: c.title },
    goal: { fr: c.goal },
    levels: c.levels,
    impact: c.impact,
    avoid: c.avoid,
    ...(c.safe_for.length ? { safeFor: c.safe_for } : {}),
    ...(c.sensation ? { sensation: c.sensation } : {}),
    blocks: c.blocks.map(bloc),
    own: true,
  };
}

export async function listCoachCircuits(tenantId: string): Promise<CoachCircuit[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_circuits")
    .select("id, title, goal, theme, gear, levels, impact, avoid, safe_for, sensation, blocks, image_url, enabled")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

/**
 * Le catalogue vu par les clients d'un coach : le sien d'abord, le nôtre
 * ensuite. Un circuit désactivé n'est pas servi, et un circuit sans bloc
 * jouable non plus : le coach l'a peut-être laissé en chantier.
 */
export async function circuitPoolForTenant(tenantId: string | null): Promise<CircuitTemplate[]> {
  if (!tenantId) return [...CIRCUIT_TEMPLATES];
  const mine = await listCoachCircuits(tenantId).catch(() => [] as CoachCircuit[]);
  const siens = mine.filter((c) => c.enabled && c.blocks.length >= 2).map(templateFromCoachCircuit);
  return [...siens, ...CIRCUIT_TEMPLATES];
}

export async function saveCoachCircuit(
  tenantId: string,
  circuit: Omit<CoachCircuit, "id">,
  id?: string | null,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const row = { ...circuit, tenant_id: tenantId, updated_at: new Date().toISOString() };
  const { error } = id
    ? await admin.from("coach_circuits").update(row).eq("tenant_id", tenantId).eq("id", id)
    : await admin.from("coach_circuits").insert(row);
  return error ? { error: "Impossible d'enregistrer le circuit." } : {};
}

export async function deleteCoachCircuit(tenantId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("coach_circuits").delete().eq("tenant_id", tenantId).eq("id", id);
}
