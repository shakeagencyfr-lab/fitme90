"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { usePhrase } from "@/components/locale-provider";
import { saveSiteSettings, type SiteState } from "@/app/admin/actions";
import { Alert, Button, Card, Field, MonoLabel, TextArea } from "@/components/ui";
import { MAX_SERVICES, type SiteTemplate } from "@/lib/site-templates";
import type { SiteSettings } from "@/lib/site";

/**
 * Réglages du mini-site public.
 *
 * Un seul formulaire, pas cinq cartes qui s'enregistrent séparément : le coach
 * qui ouvre son site règle son adresse, choisit un habillage et écrit ses
 * prestations dans le même mouvement, et il veut voir le résultat une fois,
 * pas cinq.
 *
 * L'adresse est le seul champ qui puisse échouer pour une raison extérieure
 * (elle est peut-être déjà prise), et l'erreur remonte donc en tête plutôt
 * qu'à côté du champ : c'est le formulaire entier qui n'a pas été enregistré.
 */

const HABILLAGES: { key: SiteTemplate; nom: string; desc: string; fond: string; encre: string }[] = [
  { key: "atelier", nom: "Atelier", desc: "Clair et chaleureux, colonnes larges, photo en vis-à-vis.", fond: "#f7f4ee", encre: "#1b1815" },
  { key: "nocturne", nom: "Nocturne", desc: "Sombre, photo plein cadre, sections numérotées.", fond: "#0a0b0d", encre: "#ffffff" },
  { key: "vitrine", nom: "Vitrine", desc: "Blanc et structuré, carte d'informations collante.", fond: "#ffffff", encre: "#17181a" },
];

export function SiteSettingsForm({
  settings,
  host,
  landingSlug,
}: {
  settings: SiteSettings;
  /** Hôte public affiché devant l'adresse (« fitme90.com/web/… »). */
  host: string;
  /** Slug de la landing de vente, proposé comme adresse de départ. */
  landingSlug: string;
}) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveSiteSettings, {} as SiteState);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [slug, setSlug] = useState(settings.webSlug ?? landingSlug);
  const [template, setTemplate] = useState<SiteTemplate>(settings.template);
  const [photos] = useState(settings.photos);

  const heures = settings.openingHours.map((h) => `${h.day} ${h.hours}`).join("\n");
  const url = slug ? `https://${host}/web/${slug}` : null;

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Site enregistré.")}</Alert> : null}

      {/* ─────────────────────────────────────────── ouverture et adresse */}
      <Card as="section" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Adresse du site")}</div>
          <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
            {tx("Ton site de présentation est une page distincte de ta page de vente. Il parle de toi, de ton lieu et de tes prestations, et se termine par une introduction à tes programmes en ligne.")}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input
            type="checkbox"
            name="web_enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 size-4 accent-brand"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">{tx("Publier mon site")}</span>
            <span className="text-[12px] text-muted-2">
              {tx("Décoché, l'adresse répond « page introuvable » : personne ne peut voir une page que tu croyais privée.")}
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Adresse")}</MonoLabel>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] text-muted-2">{host}/web/</span>
            <input
              name="web_slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              maxLength={40}
              placeholder="seb-coaching"
              className="h-11 min-w-[200px] flex-1 rounded-control border border-line-4 bg-surface px-3.5 text-[15px] text-ink outline-none focus:border-ink"
            />
          </div>
          <span className="text-[12px] text-muted-2">
            {tx("Lettres, chiffres et tirets. Elle est indépendante de l'adresse de ta page de vente : tu peux nommer l'une « seb-coaching » et l'autre « transformation ».")}
          </span>
        </label>

        {url ? (
          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5">
            <span className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-body">{url}</span>
            {settings.enabled && settings.webSlug ? (
              <a href={`/web/${settings.webSlug}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-brand hover:underline">
                {tx("Ouvrir ↗")}
              </a>
            ) : (
              <span className="text-[12px] text-muted-2">{tx("Enregistre pour ouvrir")}</span>
            )}
          </div>
        ) : null}
      </Card>

      {/* ──────────────────────────────────────────────────── habillage */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Habillage")}</div>
          <p className="text-[13px] leading-[1.6] text-muted">
            {tx("Tes couleurs, ton logo et tes polices restent ceux de Marque blanche : l'habillage ne change que la mise en page.")}
          </p>
        </div>
        <input type="hidden" name="web_template" value={template} />
        <div className="grid gap-3 sm:grid-cols-3">
          {HABILLAGES.map((h) => {
            const actif = template === h.key;
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => setTemplate(h.key)}
                aria-pressed={actif}
                className={`tap flex flex-col gap-2.5 rounded-card border p-3 text-left transition-colors ${
                  actif ? "border-brand bg-brand/[0.06]" : "border-line-4 hover:border-ink"
                }`}
              >
                {/* Aperçu schématique : trois barres et un bloc. Une vraie
                    capture serait plus jolie et fausse dès la première
                    retouche d'un template. */}
                <span className="flex h-[74px] w-full flex-col gap-1.5 rounded-control p-2.5" style={{ background: h.fond }}>
                  <span className="h-1.5 w-1/3 rounded-full" style={{ background: h.encre, opacity: 0.85 }} />
                  <span className="h-1 w-2/3 rounded-full" style={{ background: h.encre, opacity: 0.35 }} />
                  <span className="mt-auto h-5 w-full rounded" style={{ background: h.encre, opacity: 0.12 }} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-archivo text-[14.5px] font-bold text-ink">{h.nom}</span>
                  <span className="text-[12px] leading-[1.45] text-muted-2">{tx(h.desc)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ────────────────────────────────────────────── contenu du site */}
      <Card as="section" className="flex flex-col gap-5">
        <div className="font-archivo text-[17px] font-bold text-ink">{tx("Ce que raconte la page")}</div>

        <TextArea
          name="web_intro"
          label={tx("Accroche")}
          defaultValue={settings.intro ?? ""}
          maxLength={600}
          placeholder={tx("Deux ou trois phrases sur ce que tu proposes et pour qui.")}
          help={tx("Affichée juste sous ton nom. Laissée vide, c'est l'accroche de ta page de vente qui est reprise.")}
        />

        <div className="flex flex-col gap-3">
          <MonoLabel>{tx("Prestations")}</MonoLabel>
          <p className="-mt-1 text-[12px] text-muted-2">
            {tx("Ce que tu proposes sur place, en trois à six lignes. Un créneau sans titre est ignoré.")}
          </p>
          {Array.from({ length: MAX_SERVICES }, (_, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <input
                name={`service_title_${i}`}
                defaultValue={settings.services[i]?.title ?? ""}
                maxLength={80}
                placeholder={i === 0 ? tx("Séance individuelle") : tx("Titre")}
                className="h-11 w-full rounded-control border border-line-4 bg-surface px-3.5 text-[14.5px] text-ink outline-none focus:border-ink"
              />
              <input
                name={`service_body_${i}`}
                defaultValue={settings.services[i]?.body ?? ""}
                maxLength={400}
                placeholder={tx("En une phrase")}
                className="h-11 w-full rounded-control border border-line-4 bg-surface px-3.5 text-[14.5px] text-ink outline-none focus:border-ink"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ───────────────────────────────────────────── infos pratiques */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Où et quand")}</div>
          <p className="text-[13px] leading-[1.6] text-muted">
            {tx("Renseignés automatiquement si tu as rattaché ta fiche Google. Tu peux les corriger ici, ce sont les tiens.")}
          </p>
        </div>
        <Field name="address" label={tx("Adresse")} defaultValue={settings.address ?? ""} maxLength={240} className="h-11" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="phone" label={tx("Téléphone")} defaultValue={settings.phone ?? ""} maxLength={40} className="h-11" />
          <Field name="website_url" label={tx("Autre site")} defaultValue={settings.websiteUrl ?? ""} maxLength={240} className="h-11" placeholder="https://" />
        </div>
        <TextArea
          name="opening_hours"
          label={tx("Horaires")}
          defaultValue={heures}
          rows={7}
          placeholder={"Lundi 9h-19h\nMardi 9h-19h"}
          help={tx("Une ligne par jour : le premier mot est le jour, le reste est le créneau.")}
        />
      </Card>

      {/* ────────────────────────────────────────────────── galerie */}
      {photos.length > 0 ? (
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-archivo text-[17px] font-bold text-ink">{tx("Galerie")}</div>
            <p className="text-[13px] leading-[1.6] text-muted">
              {tx("Reprises de ta fiche Google et recopiées chez nous. Décoche celles que tu ne veux plus montrer.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {photos.map((src) => (
              <label key={src} className="tap relative flex h-24 w-32 cursor-pointer overflow-hidden rounded-control border border-line-4">
                <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
                <input
                  type="checkbox"
                  name="keep_photo"
                  value={src}
                  defaultChecked
                  className="absolute left-2 top-2 size-4 accent-brand"
                />
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ──────────────────────────────────── section programmes en ligne */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Introduction à tes programmes")}</div>
          <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
            {tx("La dernière section du site présente tes programmes en ligne et renvoie vers ta page de vente. Laisse vide pour utiliser le texte par défaut.")}
          </p>
        </div>
        <Field
          name="web_programs_title"
          label={tx("Titre")}
          defaultValue={settings.programsTitle ?? ""}
          maxLength={120}
          className="h-11"
          placeholder={tx("Le suivi continue chez toi")}
        />
        <TextArea
          name="web_programs_text"
          label={tx("Texte")}
          defaultValue={settings.programsText ?? ""}
          maxLength={800}
          placeholder={tx("Ce que le client obtient une fois rentré chez lui.")}
        />
      </Card>

      <Button loading={saving} className="self-start">{tx("Enregistrer")}</Button>
    </form>
  );
}
