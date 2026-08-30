import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROOT_DOMAIN, RESERVED_SUBDOMAINS } from "@/lib/config";

// Next.js 16 : la convention `middleware` est renommée `proxy`.
// Deux rôles :
//  1) Marque blanche par SOUS-DOMAINE : `coach.fitme90.com` sert la landing du
//     coach (réécriture vers /c/[slug|sous-domaine]). Inactif tant que
//     NEXT_PUBLIC_ROOT_DOMAIN n'est pas défini (rien n'est réécrit).
//  2) Rafraîchit la session Supabase et protège les routes serveur (/app, /api/generate).

/** Sous-domaine coach extrait de l'hôte, ou null (apex, www, réservé, désactivé). */
function coachSubdomain(host: string | null): string | null {
  if (!ROOT_DOMAIN || !host) return null;
  const h = host.split(":")[0].toLowerCase(); // retire le port éventuel
  if (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`) return null;
  if (!h.endsWith(`.${ROOT_DOMAIN}`)) return null; // domaine de prévisualisation, etc.
  const sub = h.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!sub || sub.includes(".")) return null; // uniquement le 1er niveau
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sub = coachSubdomain(request.headers.get("host"));

  // Sous-domaine coach : la RACINE sert sa landing. Les autres chemins
  // (/connexion, /inscription, /app, /c/...) passent normalement sur le même
  // hôte, avec le branding porté par ?c=slug déjà en place.
  if (sub && (path === "/" || path === "")) {
    const url = request.nextUrl.clone();
    url.pathname = `/c/${sub}`;
    return NextResponse.rewrite(url);
  }

  // Session/protection : uniquement sur les routes protégées (pas de coût réseau
  // sur les pages publiques).
  if (path.startsWith("/app") || path.startsWith("/api/generate")) {
    return updateSession(request);
  }

  return NextResponse.next();
}

// Le proxy tourne sur toutes les pages (pour intercepter la racine des
// sous-domaines) SAUF les fichiers statiques et l'optimisation d'images.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|.*\\.[\\w]+$).*)",
    "/",
  ],
};
