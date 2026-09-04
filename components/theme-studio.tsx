"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePhrase } from "@/components/locale-provider";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { saveTheme, type BrandingState } from "@/app/admin/actions";
import { themeProps } from "@/components/tenant-theme";
import {
  BACKGROUNDS,
  BODY_FONTS,
  CARD_STYLES,
  COLOR_PRESETS,
  CORNERS,
  HEADING_FONTS,
  LOGO_MAX,
  LOGO_MIN,
  STYLE_THEMES,
  THEME_FONTS,
  normalizeTheme,
  type BackgroundKey,
  type CardKey,
  type CornerKey,
  type FontKey,
  type TenantTheme,
} from "@/lib/theme";

/**
 * Studio de thème : couleurs, typographies et apparence, avec un aperçu qui
 * réagit à chaque clic.
 *
 * L'aperçu est un vrai fragment d'interface, pas une image : il porte les mêmes
 * variables CSS et les mêmes attributs que les pages réelles, donc ce que le
 * coach voit ici est exactement ce que verront ses clients. Rien n'est
 * enregistré tant qu'il n'a pas cliqué sur « Enregistrer » ; « Annuler » remet
 * l'état d'origine.
 */

interface Props {
  current: TenantTheme;
  /** Logo du tenant, pour juger la taille choisie sur du concret. */
  logoUrl: string | null;
  brandName: string;
  /** Ce que le thème habille, dit en clair selon l'étage. */
  audience: string;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex flex-col gap-0.5">
        <MonoLabel>{title}</MonoLabel>
        {hint ? <span className="text-[12px] leading-[1.5] text-muted-2">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** Bouton d'option : sélectionné = bordure d'encre, comme partout ailleurs. */
function Choice({
  on,
  onClick,
  children,
  title,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={`tap rounded-control border px-3 py-2 text-[13px] transition-colors ${
        on ? "border-ink bg-surface font-semibold text-ink" : "border-line-4 bg-surface-2 text-muted hover:border-line-3 hover:text-body"
      }`}
    >
      {children}
    </button>
  );
}

export function ThemeStudio({ current, logoUrl, brandName, audience }: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveTheme, {} as BrandingState);
  const [t, setT] = useState<TenantTheme>(current);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const set = <K extends keyof TenantTheme>(k: K, v: TenantTheme[K]) => setT((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(t) !== JSON.stringify(current);

  const color = (key: "primary" | "accent" | "success" | "danger", label: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-body">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={t[key]}
          onChange={(e) => set(key, e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-line-4 bg-surface"
          aria-label={label}
        />
        <span className="font-mono text-[12px] text-muted">{t[key]}</span>
      </span>
    </label>
  );

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Thème de marque")}</div>
        <p className="text-[13px] leading-[1.55] text-muted">{audience}</p>
      </div>

      {/* ------------------------------------------------------------ aperçu */}
      {/* `bg-paper` sur ce bloc : c'est lui qui peint le fond, donc c'est lui
          qui doit porter le motif d'arrière-plan. */}
      <div
        className="overflow-hidden rounded-card border border-line bg-paper p-5"
        {...themeProps(t)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-auto max-w-[150px] object-contain" style={{ height: "var(--wl-logo-h)" }} />
            ) : (
              <span className="font-archivo text-[19px] font-extrabold tracking-[-0.02em] text-ink">{brandName}</span>
            )}
          </span>
          <span className="rounded-pill bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
            {tx("Commencer")}
          </span>
        </div>

        <div className="mt-4 rounded-card border border-line bg-surface p-4">
          <div className="font-archivo text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink">
            {tx("Ta séance du jour")}
          </div>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-muted">
            {tx("Voilà à quoi ressemblera ton interface. Titres, texte, boutons, cartes et fond suivent ce thème.")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-btn bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">{tx("Valider")}</span>
            <span className="rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body">{tx("Plus tard")}</span>
            <span className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: `color-mix(in srgb, ${t.success} 16%, transparent)`, color: t.success }}>
              {tx("Payé")}
            </span>
            <span className="rounded-pill px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: `color-mix(in srgb, ${t.danger} 16%, transparent)`, color: t.danger }}>
              {tx("En retard")}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- thèmes tout faits */}
      <Section title={tx("Thèmes")} hint={tx("Un clic pose typographie, couleurs et apparence. Tu peux tout affiner ensuite.")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STYLE_THEMES.map((s) => {
            const on = (Object.keys(s.patch) as (keyof typeof s.patch)[]).every((k) => t[k] === s.patch[k]);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setT((p) => ({ ...p, ...s.patch }))}
                aria-pressed={on}
                className={`tap flex flex-col gap-2 rounded-control border p-3 text-left transition-colors ${
                  on ? "border-ink bg-surface" : "border-line-4 bg-surface-2 hover:border-line-3"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-4 rounded-full" style={{ background: s.patch.primary }} />
                  <span className="size-4 rounded-full" style={{ background: s.patch.accent }} />
                </span>
                <span className="font-archivo text-[14px] font-bold text-ink">{s.label}</span>
                <span className="text-[11.5px] leading-tight text-muted-2">
                  {THEME_FONTS[s.patch.headingFont].label}
                  {s.patch.headingFont !== s.patch.bodyFont ? ` · ${THEME_FONTS[s.patch.bodyFont].label}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ---------------------------------------------------------- couleurs */}
      <Section title={tx("Couleurs")}>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <Choice
              key={p.key}
              on={t.primary === p.primary && t.accent === p.accent}
              onClick={() => setT((s) => ({ ...s, primary: p.primary, accent: p.accent }))}
            >
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 rounded-full" style={{ background: p.primary }} />
                {tx(p.label)}
              </span>
            </Choice>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {color("primary", tx("Principale"))}
          {color("accent", tx("Accentuation"))}
          {color("success", tx("Réussite"))}
          {color("danger", tx("Danger"))}
        </div>
      </Section>

      {/* ----------------------------------------------------------- polices */}
      <Section title={tx("Polices")} hint={tx("Servies depuis notre serveur, jamais depuis Google : rien ne part chez un tiers quand quelqu'un ouvre ta page.")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-body">{tx("Titres")}</span>
            <select
              value={t.headingFont}
              onChange={(e) => set("headingFont", e.target.value as FontKey)}
              className="w-full rounded-control border border-line-4 bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
            >
              {HEADING_FONTS.map((k) => (
                <option key={k} value={k}>{THEME_FONTS[k].label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-body">{tx("Texte courant")}</span>
            <select
              value={t.bodyFont}
              onChange={(e) => set("bodyFont", e.target.value as FontKey)}
              className="w-full rounded-control border border-line-4 bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
            >
              {BODY_FONTS.map((k) => (
                <option key={k} value={k}>{THEME_FONTS[k].label}</option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      {/* --------------------------------------------------------- apparence */}
      <Section title={tx("Apparence")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-body">{tx("Arrière-plan de page")}</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BACKGROUNDS) as BackgroundKey[]).map((k) => (
              <Choice key={k} on={t.background === k} onClick={() => set("background", k)}>
                {tx(BACKGROUNDS[k])}
              </Choice>
            ))}
          </div>
        </div>

        <label className={`flex items-center gap-2.5 ${t.background === "plain" ? "opacity-45" : ""}`}>
          <input
            type="checkbox"
            checked={t.backgroundMotion}
            disabled={t.background === "plain"}
            onChange={(e) => set("backgroundMotion", e.target.checked)}
            className="size-4 accent-brand"
          />
          <span className="text-[13.5px] text-body">{tx("Faire respirer l'arrière-plan")}</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-body">{tx("Style de carte")}</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CARD_STYLES) as CardKey[]).map((k) => (
                <Choice key={k} on={t.card === k} onClick={() => set("card", k)}>{tx(CARD_STYLES[k])}</Choice>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-body">{tx("Coins")}</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CORNERS) as CornerKey[]).map((k) => (
                <Choice key={k} on={t.corners === k} onClick={() => set("corners", k)}>{tx(CORNERS[k])}</Choice>
              ))}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-body">
            {tx("Taille du logo")} <span className="font-mono text-[11.5px] text-muted-2">{t.logoScale} px</span>
          </span>
          <input
            type="range"
            min={LOGO_MIN}
            max={LOGO_MAX}
            step={1}
            value={t.logoScale}
            onChange={(e) => set("logoScale", Number(e.target.value))}
            className="w-full accent-brand sm:max-w-[320px]"
          />
          <span className="text-[12px] text-muted-2">
            {tx("Hauteur du logo dans les menus. Vise une image d'au moins 96 px de haut pour qu'elle reste nette.")}
          </span>
        </label>
      </Section>

      {/* ------------------------------------------------------ enregistrement */}
      <form action={action} className="flex flex-col gap-3 border-t border-line pt-5">
        {/* Un seul champ : le thème complet. Il est revalidé côté serveur, une
            valeur inconnue y retombe sur le défaut. */}
        <input type="hidden" name="theme" value={JSON.stringify(normalizeTheme(t))} />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok && !dirty ? <Alert tone="info">{tx("Thème enregistré.")}</Alert> : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" loading={pending} disabled={!dirty} className="h-11 self-start">
            {tx("Enregistrer")}
          </Button>
          {dirty ? (
            <button
              type="button"
              onClick={() => setT(current)}
              className="tap text-[13.5px] font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {tx("Annuler")}
            </button>
          ) : null}
          <span className="text-[12.5px] text-muted-2">
            {dirty ? tx("Aperçu seulement. Personne ne voit ces changements tant que tu n'as pas enregistré.") : ""}
          </span>
        </div>
      </form>
    </Card>
  );
}
