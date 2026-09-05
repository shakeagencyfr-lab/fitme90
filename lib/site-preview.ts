import type { SiteService } from "@/lib/site";
import { asSiteTemplate, type SiteTemplate } from "@/lib/site-templates";
import type { OpeningDay } from "@/lib/google-import";

/**
 * Le brouillon que le studio envoie à son aperçu, et le vocabulaire commun aux
 * deux côtés du postMessage.
 *
 * L'aperçu du mini-site ne pouvait pas se contenter de recharger la page après
 * enregistrement, comme le fait celui de la marque blanche : on n'y règle pas
 * trois couleurs, on y ÉCRIT. Relire son accroche en la tapant est le geste
 * même du travail ; l'enregistrer pour la voir en casserait le rythme.
 *
 * Ce module vit à part des deux composants pour une raison simple : émetteur et
 * récepteur doivent parler la même langue, et une langue définie deux fois
 * finit par diverger sans que rien ne le signale.
 */

export const SITE_PREVIEW_TYPE = "fitme:site-preview" as const;
export const SITE_PREVIEW_READY = "fitme:site-preview-ready" as const;

/** Ce que le coach peut changer sans recharger. */
export interface SiteDraft {
  template: SiteTemplate;
  intro: string;
  services: SiteService[];
  photos: string[];
  programsTitle: string;
  programsText: string;
  address: string;
  phone: string;
  websiteUrl: string;
  openingHours: OpeningDay[];
}

export interface SitePreviewMessage {
  type: typeof SITE_PREVIEW_TYPE;
  draft: SiteDraft;
}

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/**
 * Valide un message reçu et le RECONSTRUIT champ par champ.
 *
 * L'aperçu tourne dans une iframe : le message vient d'une autre fenêtre, donc
 * de l'extérieur, même quand cet extérieur est notre propre studio. On ne fait
 * donc pas confiance à sa forme, on la refait. Un `as SiteDraft` sur l'objet
 * reçu aurait suffi à faire planter le rendu sur un champ absent.
 */
export function readSiteDraft(raw: unknown): SiteDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (m.type !== SITE_PREVIEW_TYPE) return null;
  const d = m.draft;
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;

  const services = Array.isArray(o.services)
    ? o.services
        .map((v) => {
          if (!v || typeof v !== "object") return null;
          const s = v as Record<string, unknown>;
          const title = texte(s.title, 80).trim();
          return title ? { title, body: texte(s.body, 400).trim() } : null;
        })
        .filter((v): v is SiteService => v !== null)
    : [];

  const openingHours = Array.isArray(o.openingHours)
    ? o.openingHours
        .map((v) => {
          if (!v || typeof v !== "object") return null;
          const h = v as Record<string, unknown>;
          const day = texte(h.day, 24).trim();
          const hours = texte(h.hours, 60).trim();
          return day && hours ? { day, hours } : null;
        })
        .filter((v): v is OpeningDay => v !== null)
        .slice(0, 7)
    : [];

  // Seules les adresses https passent, comme sur le chemin public : un aperçu
  // qui accepterait autre chose ne montrerait pas la vraie page.
  const photos = Array.isArray(o.photos)
    ? o.photos.filter((v): v is string => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v))
    : [];

  return {
    template: asSiteTemplate(typeof o.template === "string" ? o.template : null),
    intro: texte(o.intro, 600),
    services,
    photos,
    programsTitle: texte(o.programsTitle, 120),
    programsText: texte(o.programsText, 800),
    address: texte(o.address, 240),
    phone: texte(o.phone, 40),
    websiteUrl: texte(o.websiteUrl, 240),
    openingHours,
  };
}

/** Le message est-il l'annonce « je suis prêt à recevoir » de l'aperçu ? */
export function isSitePreviewReady(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && (raw as Record<string, unknown>).type === SITE_PREVIEW_READY;
}
