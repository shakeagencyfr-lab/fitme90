import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  ROOT_DOMAIN,
  RESERVED_SUBDOMAINS,
  RESERVED_PATH_SEGMENTS,
  isRewritablePathSegment,
} from "@/lib/config";
import { slugForCustomHost } from "@/lib/custom-domain";

// Next.js 16 : la convention `middleware` est renommée `proxy`.
// Rôles :
//  1) Adresse personnalisée par CHEMIN (actif) : `fitme90.com/<nom>` sert la
//     landing du coach (réécriture vers /c/<nom>). Aucune config requise.
//  2) Sous-domaine coach (optionnel) : `nom.fitme90.com` -> landing. Actif si
//     NEXT_PUBLIC_ROOT_DOMAIN est défini (avec un DNS générique).
//  3) Domaine personnalisé (premium, white label total) : un hôte étranger
//     (ex `www.coach.com`) -> landing du coach. Actif si le coach a renseigné
//     son domaine ET l'a branché côté hébergeur.
//  4) Rafraîchit la session Supabase et protège /app et /api/generate.

function hostOf(request: NextRequest): string {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

/** Sous-domaine coach extrait de l'hôte, ou null (apex, www, réservé, désactivé). */
function coachSubdomain(host: string): string | null {
  if (!ROOT_DOMAIN || !host) return null;
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return null;
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!sub || sub.includes(".")) return null; // uniquement le 1er niveau
  if (RESERVED_SUBDOMAINS.has(sub) || RESERVED_PATH_SEGMENTS.has(sub)) return null;
  return sub;
}

/** Hôte « étranger » = candidat domaine personnalisé (ni racine, ni sous-domaine,
 *  ni prévisualisation). On n'y fait une recherche en base que dans ce cas. */
function isForeignHost(host: string): boolean {
  if (!ROOT_DOMAIN || !host) return false;
  if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".vercel.app")) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const host = hostOf(request);
  const atRoot = path === "/" || path === "";

  // 1) Domaine personnalisé (premium) : la racine sert la landing du coach.
  if (atRoot && isForeignHost(host)) {
    const slug = await slugForCustomHost(host);
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/c/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // 2) Sous-domaine coach : la racine sert sa landing.
  if (atRoot) {
    const sub = coachSubdomain(host);
    if (sub) {
      const url = request.nextUrl.clone();
      url.pathname = `/c/${sub}`;
      return NextResponse.rewrite(url);
    }
  }

  // 3) Adresse personnalisée par chemin : `/<nom>` -> `/c/<nom>` (un seul segment
  //    non réservé ; les liens profonds continuent d'utiliser /c/<nom>/...).
  const seg = path.replace(/^\/+/, "");
  if (seg && !seg.includes("/") && isRewritablePathSegment(seg)) {
    const url = request.nextUrl.clone();
    url.pathname = `/c/${seg}`;
    return NextResponse.rewrite(url);
  }

  // 4) Session/protection : uniquement sur les routes protégées.
  if (path.startsWith("/app") || path.startsWith("/api/generate")) {
    return updateSession(request);
  }

  return NextResponse.next();
}

// Le proxy tourne sur toutes les pages (pour intercepter la racine et les
// adresses personnalisées) SAUF les fichiers statiques et l'optimisation d'images.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|.*\\.[\\w]+$).*)",
    "/",
  ],
};
