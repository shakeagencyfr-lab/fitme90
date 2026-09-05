"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { usePhrase } from "@/components/locale-provider";
import { saveSiteSettings, type SiteState } from "@/app/admin/actions";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { MAX_SERVICES, type SiteTemplate } from "@/lib/site-templates";
import { SiteGoogleCard, type GoogleLink } from "@/components/site-google-card";
import type { SiteSettings, SiteService } from "@/lib/site";
import type { SiteDraft } from "@/lib/site-preview";
import type { OpeningDay } from "@/lib/google-import";

/**
 * Le mini CMS de « Mon site ».
 *
 * TOUT EST DANS L'ÉTAT REACT, PAS DANS LE DOM. La version précédente laissait
 * chaque champ se gérer lui-même (`defaultValue`) et lisait le formulaire à
 * l'envoi. C'était plus court, mais cela rendait l'aperçu vivant impossible :
 * personne ne peut montrer une page en train de s'écrire s'il ne sait pas ce
 * qui est écrit. Chaque frappe remonte donc ici, et de là vers l'aperçu.
 *
 * Les champs partent quand même en `<form>` classique, en entrées cachées
 * sérialisées : l'enregistrement reste une action serveur ordinaire, qui
 * fonctionne même si le JavaScript de l'aperçu casse.
 */

const HABILLAGES: { key: SiteTemplate; nom: string; desc: string; fond: string; encre: string }[] = [
  { key: "atelier", nom: "Atelier", desc: "Clair et chaleureux, colonnes larges, photo en vis-à-vis.", fond: "#f7f4ee", encre: "#1b1815" },
  { key: "nocturne", nom: "Nocturne", desc: "Sombre, photo plein cadre, sections numérotées.", fond: "#0a0b0d", encre: "#ffffff" },
  { key: "vitrine", nom: "Vitrine", desc: "Blanc et structuré, carte d'informations collante.", fond: "#ffffff", encre: "#17181a" },
];

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** Les horaires, ramenés à une ligne par jour de la semaine. */
function septJours(hours: OpeningDay[]): OpeningDay[] {
  return JOURS.map((jour) => {
    const trouve = hours.find((h) => h.day.toLowerCase().startsWith(jour.slice(0, 3).toLowerCase()));
    return { day: jour, hours: trouve?.hours ?? "" };
  });
}

export function SiteCms({
  settings,
  host,
  landingSlug,
  google,
  serpReady,
  onDraft,
}: {
  settings: SiteSettings;
  host: string;
  landingSlug: string;
  google: GoogleLink | null;
  serpReady: boolean;
  /** Remonte le brouillon courant au studio, qui le pousse dans l'aperçu. */
  onDraft: (d: SiteDraft) => void;
}) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveSiteSettings, {} as SiteState);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [slug, setSlug] = useState(settings.webSlug ?? landingSlug);
  const [template, setTemplate] = useState<SiteTemplate>(settings.template);
  const [intro, setIntro] = useState(settings.intro ?? "");
  const [services, setServices] = useState<SiteService[]>(
    settings.services.length > 0 ? settings.services : [{ title: "", body: "" }],
  );
  const [photos, setPhotos] = useState(settings.photos);
  const [address, setAddress] = useState(settings.address ?? "");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(settings.websiteUrl ?? "");
  const [hours, setHours] = useState<OpeningDay[]>(septJours(settings.openingHours));
  const [programsTitle, setProgramsTitle] = useState(settings.programsTitle ?? "");
  const [programsText, setProgramsText] = useState(settings.programsText ?? "");

  // Le brouillon complet, recalculé à chaque frappe. C'est lui que l'aperçu
  // affiche : les champs vides y restent vides, pour montrer les textes de
  // repli exactement comme la page publique les montrera.
  useEffect(() => {
    onDraft({
      template,
      intro,
      services: services.filter((s) => s.title.trim()),
      photos,
      programsTitle,
      programsText,
      address,
      phone,
      websiteUrl,
      openingHours: hours.filter((h) => h.hours.trim()),
    });
  }, [onDraft, template, intro, services, photos, programsTitle, programsText, address, phone, websiteUrl, hours]);

  const url = slug ? `https://${host}/web/${slug}` : null;
  const champ =
    "w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-ink";

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Site enregistré.")}</Alert> : null}

      {/* Les valeurs partent en clair : l'action serveur ne connaît que des
          champs de formulaire, elle n'a pas à savoir qu'un aperçu existe. */}
      <input type="hidden" name="web_template" value={template} />
      <input type="hidden" name="opening_hours" value={hours.filter((h) => h.hours.trim()).map((h) => `${h.day} ${h.hours}`).join("\n")} />
      {services.map((s, i) => (
        <input key={`s${i}`} type="hidden" name={`service_title_${i}`} value={s.title} />
      ))}
      {services.map((s, i) => (
        <input key={`b${i}`} type="hidden" name={`service_body_${i}`} value={s.body} />
      ))}
      {photos.map((src) => (
        <input key={src} type="hidden" name="keep_photo" value={src} />
      ))}

      {/* ───────────────────────────────────── publication et adresse */}
      <Card as="section" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Publication")}</div>
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
              {tx("Décoché, l'adresse répond « page introuvable ». L'aperçu à droite continue de fonctionner : tu peux tout préparer avant de publier.")}
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

      {/* ────────────────────────────────────────────── fiche Google */}
      <SiteGoogleCard google={google} serpReady={serpReady} />

      {/* ──────────────────────────────────────────────── habillage */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Habillage")}</div>
          <p className="text-[13px] leading-[1.6] text-muted">
            {tx("Tes couleurs, ton logo et tes polices restent ceux de Marque blanche : l'habillage ne change que la mise en page.")}
          </p>
        </div>
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

      {/* ────────────────────────────────────────── contenu de la page */}
      <Card as="section" className="flex flex-col gap-5">
        <div className="font-archivo text-[17px] font-bold text-ink">{tx("Ce que raconte la page")}</div>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Accroche")}</MonoLabel>
          <textarea
            name="web_intro"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder={tx("Deux ou trois phrases sur ce que tu proposes et pour qui.")}
            className={champ}
          />
          <span className="text-[12px] text-muted-2">
            {tx("Affichée juste sous ton nom. Laissée vide, c'est l'accroche de ta page de vente qui est reprise.")}
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <MonoLabel>{tx("Prestations")}</MonoLabel>
            <span className="font-mono text-[10px] text-muted-2">
              {services.length} / {MAX_SERVICES}
            </span>
          </div>
          <p className="-mt-1 text-[12px] text-muted-2">
            {tx("Ce que tu proposes sur place. Trois suffisent, six est un maximum : au-delà, la page se lit comme un catalogue.")}
          </p>

          {services.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-control border border-line-4 bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={s.title}
                  onChange={(e) =>
                    setServices((v) => v.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                  maxLength={80}
                  placeholder={i === 0 ? tx("Séance individuelle") : tx("Titre")}
                  className={`${champ} flex-1`}
                />
                {/* On peut toujours retirer la dernière : un CMS qui refuse de
                    vider une liste force à laisser une ligne bidon en ligne. */}
                <button
                  type="button"
                  onClick={() => setServices((v) => v.filter((_, j) => j !== i))}
                  aria-label={tx("Retirer cette prestation")}
                  title={tx("Retirer cette prestation")}
                  className="tap flex size-9 shrink-0 items-center justify-center rounded-control border border-line-4 text-muted hover:border-[#C4471A] hover:text-[#C4471A]"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                    <path d="M5 12h14" />
                  </svg>
                </button>
              </div>
              <input
                value={s.body}
                onChange={(e) =>
                  setServices((v) => v.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                }
                maxLength={400}
                placeholder={tx("En une phrase")}
                className={champ}
              />
            </div>
          ))}

          {services.length < MAX_SERVICES ? (
            <button
              type="button"
              onClick={() => setServices((v) => [...v, { title: "", body: "" }])}
              className="tap inline-flex h-10 w-fit items-center gap-1.5 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {tx("Ajouter une prestation")}
            </button>
          ) : null}
        </div>
      </Card>

      {/* ─────────────────────────────────────────── infos pratiques */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Où et quand")}</div>
          <p className="text-[13px] leading-[1.6] text-muted">
            {google
              ? tx("Renseignés depuis ta fiche Google. Tu peux les corriger ici, ce sont les tiens.")
              : tx("Une adresse et des horaires justes valent mieux qu'une belle photo : c'est ce qu'on vérifie avant de se déplacer.")}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Adresse")}</MonoLabel>
          <input name="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={240} className={champ} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Téléphone")}</MonoLabel>
            <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} className={champ} />
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Autre site")}</MonoLabel>
            <input
              name="website_url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              maxLength={240}
              placeholder="https://"
              className={champ}
            />
          </label>
        </div>

        {/* Sept lignes fixes plutôt qu'un bloc de texte libre : personne ne
            devrait avoir à deviner le format attendu, et un jour laissé vide
            veut dire « fermé », ce qui est une information en soi. */}
        <div className="flex flex-col gap-2">
          <MonoLabel>{tx("Horaires")}</MonoLabel>
          {hours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[13px] text-muted">{tx(h.day)}</span>
              <input
                value={h.hours}
                onChange={(e) => setHours((v) => v.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)))}
                maxLength={60}
                placeholder={tx("Fermé")}
                className={champ}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ───────────────────────────────────────────────── galerie */}
      {settings.photos.length > 0 ? (
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-archivo text-[17px] font-bold text-ink">{tx("Galerie")}</div>
            <p className="text-[13px] leading-[1.6] text-muted">
              {tx("Reprises de ta fiche Google et recopiées chez nous. Retire celles qui ne te ressemblent pas : une seule mauvaise photo décrédibilise les autres.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {settings.photos.map((src) => {
              const gardee = photos.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhotos((v) => (gardee ? v.filter((p) => p !== src) : [...v, src]))}
                  aria-pressed={gardee}
                  className={`tap relative h-24 w-32 overflow-hidden rounded-control border-2 transition-colors ${
                    gardee ? "border-brand" : "border-line-4 opacity-40"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="128px" className="object-cover" unoptimized />
                  <span
                    className={`absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      gardee ? "bg-brand text-white" : "bg-black/50 text-white"
                    }`}
                  >
                    {gardee ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* ─────────────────────────────── section programmes en ligne */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo text-[17px] font-bold text-ink">{tx("Introduction à tes programmes")}</div>
          <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
            {tx("La dernière section présente tes programmes en ligne et renvoie vers ta page de vente. Laisse vide pour le texte par défaut.")}
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Titre")}</MonoLabel>
          <input
            name="web_programs_title"
            value={programsTitle}
            onChange={(e) => setProgramsTitle(e.target.value)}
            maxLength={120}
            placeholder={tx("Le suivi continue chez toi")}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Texte")}</MonoLabel>
          <textarea
            name="web_programs_text"
            value={programsText}
            onChange={(e) => setProgramsText(e.target.value)}
            maxLength={800}
            rows={4}
            placeholder={tx("Ce que le client obtient une fois rentré chez lui.")}
            className={champ}
          />
        </label>
      </Card>

      {/* La barre reste sous la main : le CMS est long, et remonter chercher un
          bouton d'enregistrement après chaque retouche est le genre de détail
          qui fait abandonner une page à moitié remplie. */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface/95 p-3 backdrop-blur">
        <Button loading={saving}>{tx("Enregistrer")}</Button>
        <span className="text-[12px] leading-[1.5] text-muted-2">
          {tx("L'aperçu suit ce que tu tapes. L'enregistrement, lui, décide de ce que voient tes visiteurs.")}
        </span>
      </div>
    </form>
  );
}
