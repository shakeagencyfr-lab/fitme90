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
    { title: "Bloc 1", keys: [], workBias: 0, restBias: 0 },
    { title: "Bloc 2", keys: [], workBias: 0, restBias: 0 },
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
  const plafond = maxFillableMinutes(c.blocks.map((b) => ({ exercises: b.keys.length, workBias: b.workBias })));

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

  const chip = (actif: boolean) =>
    `tap rounded-pill border px-3 py-1.5 text-[13px] font-semibold ${
      actif ? "border-ink bg-ink text-surface" : "border-line-4 bg-surface text-muted hover:border-ink/40"
    }`;

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
        <div className="flex flex-wrap gap-1.5">
          {NIVEAUX.map((n) => (
            <button key={n.key} type="button" onClick={() => toggle("levels", n.key)} className={chip(c.levels.includes(n.key))}>
              {tx(n.label)}
            </button>
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
            <button key={p.key} type="button" onClick={() => toggle("avoid", p.key)} className={chip(c.avoid.includes(p.key))}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-body-2">{tx("Au contraire, écrit pour")}</span>
        <div className="flex flex-wrap gap-1.5">
          {pathologies.map((p) => (
            <button key={p.key} type="button" onClick={() => toggle("safe_for", p.key)} className={chip(c.safe_for.includes(p.key))}>
              {p.label}
            </button>
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
              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] text-muted">{tx("Effort, en secondes")}</span>
                <select value={b.workBias} onChange={(e) => setBlock(i, { workBias: Number(e.target.value) })} className={selectCls}>
                  <option value={-10}>{tx("Plus court (-10 s)")}</option>
                  <option value={-5}>{tx("Un peu plus court (-5 s)")}</option>
                  <option value={0}>{tx("Comme d'habitude")}</option>
                  <option value={5}>{tx("Un peu plus long (+5 s)")}</option>
                  <option value={10}>{tx("Plus long (+10 s)")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12.5px] text-muted">{tx("Repos, en secondes")}</span>
                <select value={b.restBias} onChange={(e) => setBlock(i, { restBias: Number(e.target.value) })} className={selectCls}>
                  <option value={-5}>{tx("Plus serré (-5 s)")}</option>
                  <option value={0}>{tx("Comme d'habitude")}</option>
                  <option value={5}>{tx("Un peu plus (+5 s)")}</option>
                  <option value={10}>{tx("Plus de repos (+10 s)")}</option>
                </select>
              </label>
            </div>
          </div>
        ))}
        {c.blocks.length < 5 ? (
          <button
            type="button"
            onClick={() => set("blocks", [...c.blocks, { title: `${tx("Bloc")} ${c.blocks.length + 1}`, keys: [], workBias: 0, restBias: 0 }])}
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
