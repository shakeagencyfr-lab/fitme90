"use client";

import { useMemo, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { saveCircuit } from "@/app/admin/actions";
import { EXERCISE_LIBRARY, framesOf, normalizeExerciseName } from "@/lib/exercise-library";
import { maxFillableMinutes } from "@/lib/circuit-library";
import { MuscleIllustration } from "@/components/muscle-illustration";
import { Button, Field, TextArea } from "@/components/ui";

// Configurateur de circuit du coach.
//
// LE PARTI PRIS. Le coach compose ses blocs en piochant dans la bibliothèque
// d'exercices, exactement comme il ajoute un visuel à un mouvement : il ne
// tape aucun nom libre. C'est ce qui garantit que son client verra une photo
// et des consignes sur chaque exercice du chrono, et non un intitulé nu.
//
// CE QU'IL NE RÈGLE PAS. La durée, les tours et l'effort exact : son circuit
// est un MODÈLE, servi à 30, 45, 60 ou 90 minutes selon la séance remplacée,
// avec les tours et l'effort du niveau et du cycle en cours du client. Il peut
// seulement décaler l'effort et le repos d'un bloc, pour dire « celui-là est
// plus court et plus intense ».

export interface BuilderOption {
  key: string;
  label: string;
}

export interface BuilderBlock {
  title: string;
  keys: string[];
  workBias: number;
  restBias: number;
  /** Secondes imposées, ou null pour suivre le niveau et le cycle du client. */
  work: number | null;
  rest: number | null;
}

export interface BuilderCircuit {
  id?: string;
  title: string;
  goal: string;
  theme: string;
  gear: string;
  levels: string[];
  impact: string;
  avoid: string[];
  safe_for: string[];
  sensation: number | null;
  blocks: BuilderBlock[];
  enabled: boolean;
}

const VIDE: BuilderCircuit = {
  title: "",
  goal: "",
  theme: "corps-entier",
  gear: "aucun",
  levels: ["debutant", "intermediaire", "avance"],
  impact: "faible",
  avoid: [],
  safe_for: [],
  sensation: null,
  blocks: [
    { title: "Bloc 1", keys: [], workBias: 0, restBias: 0, work: null, rest: null },
    { title: "Bloc 2", keys: [], workBias: 0, restBias: 0, work: null, rest: null },
  ],
  enabled: true,
};

const NIVEAUX = [
  { key: "debutant", label: "Débutant" },
  { key: "intermediaire", label: "Intermédiaire" },
  { key: "avance", label: "Avancé" },
];

const IMPACTS = [
  { key: "nul", label: "Aucun saut" },
  { key: "faible", label: "Peu d'impact" },
  { key: "fort", label: "Sauts et pliométrie" },
];

const selectCls =
  "tap w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink";

/** Choix d'un mouvement de la bibliothèque, avec recherche et photo. */
function ExercisePicker({ onPick, taken }: { onPick: (key: string) => void; taken: string[] }) {
  const tx = usePhrase();
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const norm = normalizeExerciseName(q);
    if (!norm) return [];
    return EXERCISE_LIBRARY.filter(
      (e) => !taken.includes(e.key) && (normalizeExerciseName(e.name).includes(norm) || e.aliases.some((a) => normalizeExerciseName(a).includes(norm))),
    ).slice(0, 8);
  }, [q, taken]);

  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tx("Chercher un mouvement (pompes, squat, gainage…)")}
        className="tap w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-disabled outline-none focus:border-ink"
      />
      {results.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-card border border-line-2 p-1.5">
          {results.map((e) => {
            const [f] = framesOf(e);
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => {
                  onPick(e.key);
                  setQ("");
                }}
                className="tap flex items-center gap-2.5 rounded-control px-2 py-1.5 text-left hover:bg-surface-2"
              >
                {f ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f} alt="" loading="lazy" className="size-9 shrink-0 rounded-control border border-line-3 object-cover" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line-3 bg-surface-2 text-muted-2">
                    <MuscleIllustration muscle={e.muscle} className="h-[80%] w-auto" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{e.name}</span>
                  <span className="truncate text-[12px] text-muted-2">{e.muscle}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Un temps en secondes, ou « auto ».
 *
 * Vide ne veut pas dire zéro : ça veut dire « suis le niveau du client ». Le
 * champ le dit en toutes lettres plutôt que d'afficher un 0 trompeur.
 */
function SecondsField({
  label,
  value,
  min,
  max,
  onChange,
  autoLabel,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (v: number | null) => void;
  autoLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="relative flex items-center">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={5}
          value={value ?? ""}
          placeholder={autoLabel}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) return onChange(null);
            const n = Math.round(Number(raw));
            onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null);
          }}
          // Les flèches natives du champ nombre viennent se cogner au bouton
          // « Auto » : on les retire, la saisie au clavier suffit.
          className="tap w-full appearance-none rounded-control border border-line-4 bg-surface px-3.5 py-2.5 pr-14 text-[15px] text-ink placeholder:text-disabled outline-none focus:border-ink [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {value !== null ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 rounded-btn px-2 py-1 text-[11.5px] font-semibold text-muted-2 hover:text-ink"
          >
            {autoLabel}
          </button>
        ) : (
          <span className="absolute right-3 text-[12.5px] text-muted-2">s</span>
        )}
      </span>
    </label>
  );
}

export function CircuitBuilder({
  initial,
  themes,
  gears,
  pathologies,
  onDone,
}: {
  initial?: BuilderCircuit;
  themes: BuilderOption[];
  gears: BuilderOption[];
  pathologies: BuilderOption[];
  onDone?: () => void;
}) {
  const tx = usePhrase();
  const [c, setC] = useState<BuilderCircuit>(initial ?? VIDE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "ko"; text: string } | null>(null);

  // Ce que le circuit peut vraiment remplir : le coach doit le savoir pendant
  // qu'il l'écrit, pas quand son client se plaint d'une séance trop courte.
  const plafond = maxFillableMinutes(c.blocks.map((b) => ({ exercises: b.keys.length, workBias: b.workBias, work: b.work })));

  const set = <K extends keyof BuilderCircuit>(k: K, v: BuilderCircuit[K]) => setC((prev) => ({ ...prev, [k]: v }));
  const setBlock = (i: number, patch: Partial<BuilderBlock>) =>
    setC((prev) => ({ ...prev, blocks: prev.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  const toggle = (k: "levels" | "avoid" | "safe_for", value: string) =>
    setC((prev) => {
      const list = prev[k].includes(value) ? prev[k].filter((x) => x !== value) : [...prev[k], value];
      // Une zone ne peut pas être à la fois ménagée et sollicitée : le dernier
      // clic gagne, plutôt que d'enregistrer un circuit qui se contredit.
      if (k === "avoid") return { ...prev, avoid: list, safe_for: prev.safe_for.filter((x) => !list.includes(x)) };
      if (k === "safe_for") return { ...prev, safe_for: list, avoid: prev.avoid.filter((x) => !list.includes(x)) };
      return { ...prev, levels: list };
    });

  async function submit() {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("circuit", JSON.stringify(c));
    if (c.id) fd.set("id", c.id);
    const res = await saveCircuit(fd);
    setBusy(false);
    if (res.error) {
      setMsg({ tone: "ko", text: res.error });
      return;
    }
    setMsg({ tone: "ok", text: tx("Circuit enregistré. Ton Coach IA peut le proposer à tes clients.") });
    if (!c.id) setC(VIDE);
    onDone?.();
  }

  // Une puce sélectionnée porte une COCHE, pas seulement une autre couleur.
  // Avec trois niveaux tous cochés par défaut, la couleur seule ne dit rien :
  // le coach ne sait pas s'il regarde une sélection ou un simple bouton.
  const Chip = ({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`tap flex items-center gap-1.5 rounded-pill border py-1.5 text-[13px] font-semibold ${
        actif ? "border-ink bg-ink pl-2.5 pr-3 text-surface" : "border-line-4 bg-surface px-3 text-muted hover:border-ink/40"
      }`}
    >
      {actif ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12.5l5.5 5.5L20 6.5" />
        </svg>
      ) : null}
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <Field
        label={tx("Nom du circuit")}
        value={c.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder={tx("Le finisher du samedi")}
        className="py-2.5"
      />
      <TextArea
        label={tx("À quoi il sert")}
        value={c.goal}
        onChange={(e) => set("goal", e.target.value)}
        placeholder={tx("Une phrase que ton client lira avant de lancer le chrono.")}
        help={tx("C'est ce que ton Coach IA dira au client quand il proposera ce circuit.")}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-body-2">{tx("Thème")}</span>
          <select value={c.theme} onChange={(e) => set("theme", e.target.value)} className={selectCls}>
            {themes.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-body-2">{tx("Matériel nécessaire")}</span>
          <select value={c.gear} onChange={(e) => set("gear", e.target.value)} className={selectCls}>
            {gears.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </select>
          <span className="text-[12px] text-muted-2">{tx("Le circuit ne sera proposé qu'aux clients qui ont ce matériel.")}</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-body-2">{tx("Pour quels niveaux")}</span>
        <span className="text-[12px] text-muted-2">{tx("Les niveaux cochés recevront ce circuit. Décoche ceux à qui il ne convient pas.")}</span>
        <div className="flex flex-wrap gap-1.5">
          {NIVEAUX.map((n) => (
            <Chip key={n.key} actif={c.levels.includes(n.key)} onClick={() => toggle("levels", n.key)}>
              {tx(n.label)}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-medium text-body-2">{tx("Impact au sol")}</span>
        <select value={c.impact} onChange={(e) => set("impact", e.target.value)} className={selectCls}>
          {IMPACTS.map((i) => (
            <option key={i.key} value={i.key}>{tx(i.label)}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-body-2">{tx("Ne jamais proposer à un client qui a déclaré")}</span>
        <div className="flex flex-wrap gap-1.5">
          {pathologies.map((p) => (
            <Chip key={p.key} actif={c.avoid.includes(p.key)} onClick={() => toggle("avoid", p.key)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-body-2">{tx("Au contraire, écrit pour")}</span>
        <div className="flex flex-wrap gap-1.5">
          {pathologies.map((p) => (
            <Chip key={p.key} actif={c.safe_for.includes(p.key)} onClick={() => toggle("safe_for", p.key)}>
              {p.label}
            </Chip>
          ))}
        </div>
        <span className="text-[12px] text-muted-2">{tx("Ces clients-là le recevront en priorité.")}</span>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-[14px] font-medium text-body-2">{tx("Les blocs")}</span>
        {c.blocks.map((b, i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-card border border-line-2 p-3.5">
            <div className="flex items-center gap-2">
              <input
                value={b.title}
                onChange={(e) => setBlock(i, { title: e.target.value })}
                placeholder={tx("Nom du bloc")}
                className="tap min-w-0 flex-1 rounded-control border border-line-4 bg-surface px-3 py-2 text-[14px] font-semibold text-ink outline-none focus:border-ink"
              />
              {c.blocks.length > 2 ? (
                <button
                  type="button"
                  onClick={() => set("blocks", c.blocks.filter((_, j) => j !== i))}
                  className="tap shrink-0 rounded-btn border border-alert-line bg-alert px-3 py-2 text-[13px] font-semibold text-alert-ink"
                >
                  {tx("Retirer")}
                </button>
              ) : null}
            </div>

            {b.keys.length > 0 ? (
              <div className="flex flex-col gap-1">
                {b.keys.map((k) => {
                  const ex = EXERCISE_LIBRARY.find((e) => e.key === k);
                  const [f] = ex ? framesOf(ex) : [];
                  return (
                    <div key={k} className="flex items-center gap-2.5 rounded-control bg-surface-2 px-2 py-1.5">
                      {f ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f} alt="" loading="lazy" className="size-9 shrink-0 rounded-control border border-line-3 object-cover" />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line-3 bg-surface text-muted-2">
                          <MuscleIllustration muscle={ex?.muscle ?? null} className="h-[80%] w-auto" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-body">{ex?.name ?? k}</span>
                      <button
                        type="button"
                        aria-label={tx("Retirer")}
                        onClick={() => setBlock(i, { keys: b.keys.filter((x) => x !== k) })}
                        className="tap flex size-8 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:text-ink"
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-muted-2">{tx("Deux mouvements au minimum dans un bloc.")}</p>
            )}

            <ExercisePicker taken={b.keys} onPick={(k) => setBlock(i, { keys: [...b.keys, k] })} />

            <div className="grid grid-cols-2 gap-2.5">
              <SecondsField
                label={tx("Effort, en secondes")}
                value={b.work}
                min={15}
                max={120}
                onChange={(v) => setBlock(i, { work: v })}
                autoLabel={tx("Auto")}
              />
              <SecondsField
                label={tx("Repos, en secondes")}
                value={b.rest}
                min={0}
                max={120}
                onChange={(v) => setBlock(i, { rest: v })}
                autoLabel={tx("Auto")}
              />
            </div>
            <p className="text-[12px] text-muted-2">
              {b.work === null && b.rest === null
                ? tx("Laissés en auto, l'effort et le repos suivent le niveau et le cycle du client. Écris un nombre de secondes pour les imposer.")
                : tx("Les secondes que tu écris sont servies telles quelles, quelle que soit la durée de la séance.")}
            </p>
          </div>
        ))}
        {c.blocks.length < 5 ? (
          <button
            type="button"
            onClick={() => set("blocks", [...c.blocks, { title: `${tx("Bloc")} ${c.blocks.length + 1}`, keys: [], workBias: 0, restBias: 0, work: null, rest: null }])}
            className="tap w-fit rounded-btn border border-line-4 bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink hover:border-ink"
          >
            {tx("Ajouter un bloc")}
          </button>
        ) : null}
        <p className="text-[12.5px] text-muted-2">
          {tx("Les blocs servis dépendent de la durée : deux à 30 minutes, tous à 90. Mets les plus importants en premier.")}</p>
        {plafond > 0 ? (
          <p className={`text-[12.5px] ${plafond < 90 ? "text-alert-ink" : "text-muted-2"}`}>
            {plafond < 90
              ? `${tx("En l'état, ce circuit remplit honnêtement")} ${plafond} ${tx("minutes au maximum. Un client qui fait des séances plus longues verra la vraie durée, pas celle qu'il attendait : ajoute un bloc ou des mouvements pour couvrir 90 minutes.")}`
              : tx("Ce circuit peut remplir toutes les durées, jusqu'à 90 minutes.")}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2.5">
        <input type="checkbox" checked={c.enabled} onChange={(e) => set("enabled", e.target.checked)} className="size-4 accent-brand" />
        <span className="text-[14px] text-body-2">{tx("Proposer ce circuit à mes clients")}</span>
      </label>

      {msg ? (
        <p className={`text-[13.5px] font-semibold ${msg.tone === "ok" ? "text-ok" : "text-alert-ink"}`}>{msg.text}</p>
      ) : null}

      <Button type="button" onClick={submit} disabled={busy}>
        {busy ? tx("Enregistrement…") : c.id ? tx("Enregistrer les modifications") : tx("Créer le circuit")}
      </Button>
    </div>
  );
}
