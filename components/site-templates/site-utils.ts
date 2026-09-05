import type { Locale } from "@/lib/i18n";
import type { Offer } from "@/lib/offers";
import type { PublicSite } from "@/lib/site";

// Petits calculs partagés par les trois habillages du mini-site. Ils vivent
// ici plutôt que recopiés trois fois : une adresse d'itinéraire mal formée
// est un bug qu'on ne veut corriger qu'une fois.

/**
 * Lien d'itinéraire : celui de la fiche Google si elle est rattachée, sinon
 * une recherche Maps sur l'adresse saisie.
 *
 * Rend null quand on n'a ni l'un ni l'autre. Un bouton « Itinéraire » qui
 * ouvre une carte du monde entier vaut moins que pas de bouton du tout.
 */
export function mapsHref(site: PublicSite): string | null {
  if (site.tenant.googleMapsUrl) return site.tenant.googleMapsUrl;
  if (!site.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.tenant.name} ${site.address}`)}`;
}

/**
 * Lien d'appel, ou null.
 *
 * Le numéro affiché garde sa mise en forme lisible (« 04 93 … ») ; seul le
 * lien est réduit aux chiffres et au plus, ce qu'attend `tel:`.
 */
export function telHref(site: PublicSite): string | null {
  const brut = (site.phone ?? "").replace(/[^\d+]/g, "");
  return brut.length >= 6 ? `tel:${brut}` : null;
}

/** « 3 mois » / « Abonnement mensuel », selon la nature de l'offre. */
export function durationLabel(offer: Offer, locale: Locale): string {
  if (offer.billing_type === "subscription") {
    return locale === "en" ? "Monthly subscription" : "Abonnement mensuel";
  }
  const n = offer.duration_months;
  if (locale === "en") return n === 1 ? "1 month" : `${n} months`;
  return `${n} mois`;
}
