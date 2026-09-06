"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/components/locale-provider";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";
import { ModalLayer } from "@/components/modal-layer";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { addFoodEntry, deleteFoodEntry, listFoodEntries, updateFoodEntry } from "@/app/app/nutrition/actions";
import {
  defaultGrams,
  groupBySlot,
  macrosFor,
  manualProduct,
  mealSlotLabel,
  ratio,
  slotForHour,
  sumEntries,
  type FoodEntry,
  type FoodProduct,
  type Macros,
} from "@/lib/food-log";
import { grp } from "@/lib/nutrition";
import type { Repas } from "@/lib/recipe-catalog";

// ------------------------------------------------------------------ *
// Le journal du jour : ce que le client a mangé, face à ses besoins.
//
// Trois façons d'ajouter, dans l'ordre où on les propose : scanner un
// code-barres (le geste principal, deux secondes), chercher par nom (pas de
// code, ou depuis un ordinateur), saisir à la main (produit absent de la
// base). Les trois aboutissent à la même feuille : la fiche, une quantité,
// un repas, « Ajouter ».
//
// Les lignes se chargent jour par jour, à la demande : un programme d'un an
// à dix lignes par jour ferait des milliers de lignes, inutiles tant qu'on
// regarde aujourd'hui.
// ------------------------------------------------------------------ */

type Sheet =
  | { kind: "scan" }
  | { kind: "search" }
  | { kind: "manual"; barcode?: string; notice?: string }
  | { kind: "product"; product: FoodProduct }
  | null;

interface Props {
  day: number;
  target: Macros;
  /** Repas de la journée, d'après le questionnaire : les autres restent proposés mais après. */
  slots: readonly Repas[];
  canLog: boolean;
  initialEntries: FoodEntry[];
  initialDay: number;
}

export function FoodJournal({ day, target, slots, canLog, initialEntries, initialDay }: Props) {
  const t = useT();
  const locale = useLocale();
  const [byDay, setByDay] = useState<Record<number, FoodEntry[]>>({ [initialDay]: initialEntries });
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const entries = byDay[day];

  // Un jour jamais vu se charge à la demande ; ses lignes restent en mémoire
  // pour la navigation d'avant en arrière.
  useEffect(() => {
    if (byDay[day]) return;
    let live = true;
    listFoodEntries(day).then((rows) => {
      if (live) setByDay((m) => (m[day] ? m : { ...m, [day]: rows }));
    });
    return () => {
      live = false;
    };
  }, [day, byDay]);

  const list = entries ?? [];
  const tot = sumEntries(list);
  const diff = target.kcal - tot.kcal;

  async function onDetected(code: string) {
    setSheet(null);
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/food/lookup?code=${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setSheet({ kind: "manual", barcode: code, notice: t("nutrition.unknownProduct") });
        return;
      }
      if (!res.ok) throw new Error("lookup");
      const json = (await res.json()) as { product: FoodProduct | null };
      if (!json.product) {
        setSheet({ kind: "manual", barcode: code, notice: t("nutrition.unknownProduct") });
        return;
      }
      setSheet({ kind: "product", product: json.product });
    } catch {
      setErr(t("nutrition.lookupFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function add(product: FoodProduct, grams: number, slot: Repas) {
    setBusy(true);
    setErr("");
    const res = await addFoodEntry({ day, slot, product, grams });
    setBusy(false);
    if (!res.entry) {
      setErr(res.error || t("common.error"));
      return;
    }
    const e = res.entry;
    setByDay((m) => ({ ...m, [day]: [...(m[day] ?? []), e] }));
    setSheet(null);
  }

  async function changeGrams(id: string, grams: number) {
    const before = byDay[day] ?? [];
    setByDay((m) => ({ ...m, [day]: (m[day] ?? []).map((e) => (e.id === id ? { ...e, grams } : e)) }));
    const res = await updateFoodEntry(id, grams);
    if (!res.ok) setByDay((m) => ({ ...m, [day]: before }));
  }

  async function remove(id: string) {
    const before = byDay[day] ?? [];
    setByDay((m) => ({ ...m, [day]: (m[day] ?? []).filter((e) => e.id !== id) }));
    const res = await deleteFoodEntry(id);
    if (!res.ok) setByDay((m) => ({ ...m, [day]: before }));
  }

  const overKcal = tot.kcal > target.kcal;

  return (
    <section className="flex flex-col gap-3" data-tour="journal">
      <div className="flex flex-col gap-1">
        <MonoLabel>{t("nutrition.journal")}</MonoLabel>
        <p className="text-[13px] text-muted">{t("nutrition.journalHint")}</p>
      </div>

      <Card className="flex flex-col gap-4">
        {/* Totaux face à la cible */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="font-archivo font-extrabold text-[30px] leading-none tracking-[-0.03em] text-ink">
              {grp(tot.kcal)}
              <span className="text-[14px] font-semibold text-muted-2"> / {grp(target.kcal)} kcal</span>
            </div>
            <span className={["font-mono text-[11px] uppercase tracking-[0.1em]", overKcal ? "text-alert-ink" : "text-muted-2"].join(" ")}>
              {overKcal ? t("nutrition.over", { n: grp(-diff) }) : t("nutrition.left", { n: grp(diff) })}
            </span>
          </div>
          <Bar value={tot.kcal} target={target.kcal} tone={overKcal ? "over" : "brand"} />
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["Prot.", tot.protein, target.protein],
                ["Gluc.", tot.carbs, target.carbs],
                ["Lip.", tot.fat, target.fat],
              ] as const
            ).map(([label, v, cible]) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2">{label}</span>
                  <span className="font-archivo text-[13px] font-semibold tabular-nums text-ink">
                    {Math.round(v)}
                    <span className="text-muted-2"> / {cible} g</span>
                  </span>
                </div>
                <Bar value={v} target={cible} tone={v > cible * 1.15 ? "over" : "ink"} thin />
              </div>
            ))}
          </div>
        </div>

        {/* Lignes du jour */}
        {entries === undefined ? (
          <p className="text-[13px] text-muted-2">{t("common.loading")}</p>
        ) : list.length === 0 ? (
          <p className="text-[13px] text-muted-2">{t("nutrition.noEntries")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groupBySlot(list).map((g) => (
              <div key={g.slot} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{mealSlotLabel(g.slot, locale)}</span>
                {g.entries.map((e) => (
                  <EntryRow key={e.id} e={e} canLog={canLog} onGrams={(g2) => changeGrams(e.id, g2)} onRemove={() => remove(e.id)} removeLabel={t("nutrition.remove")} />
                ))}
              </div>
            ))}
          </div>
        )}

        {err ? <Alert>{err}</Alert> : null}

        {canLog ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setSheet({ kind: "scan" })} loading={busy} className="h-11 gap-2">
              <BarcodeIcon />
              {t("nutrition.scan")}
            </Button>
            <Button variant="outline" onClick={() => setSheet({ kind: "search" })} disabled={busy} className="h-11">
              {t("nutrition.search")}
            </Button>
            <Button variant="outline" onClick={() => setSheet({ kind: "manual" })} disabled={busy} className="h-11">
              {t("nutrition.manual")}
            </Button>
          </div>
        ) : (
          <p className="text-[12px] text-muted-2">{t("nutrition.readOnly")}</p>
        )}
        {busy && !sheet ? <p className="text-[12px] text-muted-2">{t("nutrition.lookingUp")}</p> : null}
        <p className="text-[11px] text-muted-2">{t("nutrition.offCredit")}</p>
      </Card>

      {sheet?.kind === "scan" ? <BarcodeScanner onDetected={onDetected} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "search" ? <SearchSheet onPick={(p) => setSheet({ kind: "product", product: p })} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "manual" ? (
        <ManualSheet barcode={sheet.barcode} notice={sheet.notice} onNext={(p) => setSheet({ kind: "product", product: p })} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.kind === "product" ? (
        <ProductSheet
          key={sheet.product.barcode ?? sheet.product.name}
          product={sheet.product}
          slots={slots}
          busy={busy}
          onAdd={(grams, slot) => add(sheet.product, grams, slot)}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------ morceaux

function Bar({ value, target, tone, thin }: { value: number; target: number; tone: "brand" | "ink" | "over"; thin?: boolean }) {
  const pct = Math.round(ratio(value, target) * 100);
  const color = tone === "over" ? "bg-alert-ink" : tone === "brand" ? "bg-brand" : "bg-ink";
  return (
    <div className={["w-full overflow-hidden rounded-pill bg-line-2", thin ? "h-1.5" : "h-2.5"].join(" ")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={["h-full rounded-pill transition-[width] duration-500", color].join(" ")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EntryRow({ e, canLog, onGrams, onRemove, removeLabel }: { e: FoodEntry; canLog: boolean; onGrams: (g: number) => void; onRemove: () => void; removeLabel: string }) {
  const [g, setG] = useState(String(e.grams));
  const m = macrosFor(e.per100, e.grams);
  function commit() {
    const n = Math.round(parseFloat(g.replace(",", ".")));
    if (!Number.isFinite(n) || n <= 0 || n === e.grams) {
      setG(String(e.grams));
      return;
    }
    onGrams(Math.min(5000, n));
  }
  return (
    <div className="flex items-center gap-2 border-b border-line-2 py-1.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] text-ink">{e.name}</div>
        {e.brand ? <div className="truncate text-[11.5px] text-muted-2">{e.brand}</div> : null}
      </div>
      <div className="flex items-center gap-1">
        <input
          value={g}
          onChange={(ev) => setG(ev.target.value)}
          onBlur={commit}
          onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
          disabled={!canLog}
          inputMode="numeric"
          aria-label="g"
          className="h-8 w-[58px] rounded-control border border-line-4 bg-surface px-2 text-right text-[16px] tabular-nums text-ink disabled:opacity-60"
        />
        <span className="text-[12px] text-muted-2">g</span>
      </div>
      <span className="w-[62px] text-right font-archivo text-[13px] font-semibold tabular-nums text-ink">{m.kcal} kcal</span>
      {canLog ? (
        <button type="button" onClick={onRemove} aria-label={removeLabel} title={removeLabel} className="tap flex size-8 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function BarcodeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 8v8M10 8v8M13 8v8M17 8v8" />
    </svg>
  );
}

/** Coque commune des feuilles : en-tête, fermeture, contenu défilant. */
function Sheet({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children: ReactNode }) {
  return (
    <ModalLayer onClose={onClose} label={title} closeLabel={closeLabel}>
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        <div className="flex items-center justify-between gap-3 border-b border-line-2 px-5 py-4">
          <h2 className="font-archivo font-extrabold text-[19px] leading-tight tracking-[-0.02em] text-ink">{title}</h2>
          <button onClick={onClose} aria-label={closeLabel} className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </ModalLayer>
  );
}

const inputCls = "h-11 w-full rounded-control border border-line-4 bg-surface px-3 text-[16px] text-ink";

function SearchSheet({ onPick, onClose }: { onPick: (p: FoodProduct) => void; onClose: () => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodProduct[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let live = true;
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(term)}`);
        const json = res.ok ? ((await res.json()) as { products: FoodProduct[] }) : { products: [] };
        if (live) setResults(json.products);
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) setSearching(false);
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [q]);

  return (
    <Sheet title={t("nutrition.searchTitle")} onClose={onClose} closeLabel={t("common.close")}>
      <div className="flex flex-col gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder={t("nutrition.searchPlaceholder")} aria-label={t("nutrition.searchTitle")} className={inputCls} />
        {searching ? <p className="text-[13px] text-muted-2">{t("nutrition.searching")}</p> : null}
        {results && results.length === 0 && !searching ? <p className="text-[13px] text-muted-2">{t("nutrition.noResults")}</p> : null}
        <div className="flex flex-col">
          {(results ?? []).map((p, i) => (
            <button key={`${p.barcode ?? "n"}-${i}`} type="button" onClick={() => onPick(p)} className="tap flex items-center gap-3 border-b border-line-2 py-2.5 text-left last:border-0 hover:bg-surface-2">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="size-11 shrink-0 rounded-control bg-surface-2 object-contain" />
              ) : (
                <div className="size-11 shrink-0 rounded-control bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{p.name}</div>
                <div className="truncate text-[12px] text-muted-2">
                  {p.brand ? `${p.brand} · ` : ""}
                  {p.per100.kcal} kcal {t("nutrition.per100")}
                </div>
              </div>
              {p.nutriscore ? <NutriBadge grade={p.nutriscore} /> : null}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function ManualSheet({ barcode, notice, onNext, onClose }: { barcode?: string; notice?: string; onNext: (p: FoodProduct) => void; onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
  const product = manualProduct({ ...f, barcode });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const num = (k: keyof typeof f, label: string) => (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{label}</span>
      <input value={f[k]} onChange={set(k)} inputMode="decimal" className={inputCls} />
    </label>
  );
  return (
    <Sheet title={t("nutrition.manualTitle")} onClose={onClose} closeLabel={t("common.close")}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (product) onNext(product);
        }}
      >
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{t("nutrition.foodName")}</span>
          <input value={f.name} onChange={set("name")} autoFocus className={inputCls} />
        </label>
        <p className="text-[12px] text-muted-2">{t("nutrition.per100Hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          {num("kcal", "kcal")}
          {num("protein", "Prot. (g)")}
          {num("carbs", "Gluc. (g)")}
          {num("fat", "Lip. (g)")}
        </div>
        <Button type="submit" disabled={!product} className="h-11">
          {t("nutrition.next")}
        </Button>
      </form>
    </Sheet>
  );
}

function ProductSheet({ product, slots, busy, onAdd, onClose }: { product: FoodProduct; slots: readonly Repas[]; busy: boolean; onAdd: (grams: number, slot: Repas) => void; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [grams, setGrams] = useState(String(defaultGrams(product)));
  const [slot, setSlot] = useState<Repas>(() => {
    const guess = slotForHour(new Date().getHours());
    return slots.includes(guess) ? guess : (slots[0] ?? guess);
  });
  const g = Math.round(parseFloat(grams.replace(",", ".")) || 0);
  const m = macrosFor(product.per100, g);
  const chips = [...new Set([product.servingG ?? 0, 50, 100, 150, 200].filter((x) => x > 0))];
  // Les repas du questionnaire d'abord, les autres ensuite : on peut noter un
  // goûter même si le plan n'en prévoit pas.
  const allSlots: Repas[] = [...slots, ...(["petit-dejeuner", "dejeuner", "collation", "diner"] as Repas[]).filter((s) => !slots.includes(s))];

  return (
    <Sheet title={t("nutrition.add")} onClose={onClose} closeLabel={t("common.close")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="size-16 shrink-0 rounded-control bg-surface-2 object-contain" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="font-archivo text-[16px] font-semibold leading-tight text-ink">{product.name}</div>
            {product.brand ? <div className="text-[12.5px] text-muted-2">{product.brand}</div> : null}
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-2">
              <span>
                {product.per100.kcal} kcal · P {product.per100.protein} · G {product.per100.carbs} · L {product.per100.fat} {t("nutrition.per100")}
              </span>
              {product.nutriscore ? <NutriBadge grade={product.nutriscore} /> : null}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{t("nutrition.quantity")}</span>
          <input value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="numeric" autoFocus className={inputCls} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setGrams(String(c))}
              className={["tap rounded-pill border px-3 py-1 text-[12.5px] font-semibold", g === c ? "border-fill bg-fill text-fillfg" : "border-line-4 bg-surface text-body"].join(" ")}
            >
              {c === product.servingG ? `${t("nutrition.portion")} · ${c} g` : `${c} g`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{t("nutrition.meal")}</span>
          <div className="flex flex-wrap gap-1.5">
            {allSlots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={["tap rounded-pill border px-3 py-1 text-[12.5px] font-semibold", slot === s ? "border-brand bg-brand text-white" : "border-line-4 bg-surface text-body"].join(" ")}
              >
                {mealSlotLabel(s, locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-control bg-surface-2 px-3 py-2">
          <span className="font-archivo text-[18px] font-extrabold tabular-nums text-ink">{m.kcal} kcal</span>
          <span className="text-[12.5px] tabular-nums text-muted">
            P {m.protein} g · G {m.carbs} g · L {m.fat} g
          </span>
        </div>

        <Button onClick={() => g > 0 && onAdd(g, slot)} disabled={g <= 0} loading={busy} className="h-11">
          {t("nutrition.add")}
        </Button>
      </div>
    </Sheet>
  );
}

function NutriBadge({ grade }: { grade: string }) {
  const COLORS: Record<string, string> = { a: "#038141", b: "#85BB2F", c: "#FECB02", d: "#EE8100", e: "#E63E11" };
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-extrabold uppercase text-white" style={{ background: COLORS[grade] ?? "#888" }} title="Nutri-Score">
      {grade}
    </span>
  );
}
