import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { isCoachAccount } from "@/lib/admin";
import { brandForUser, parentDashboardBrand, platformBrand } from "@/lib/branding";
import { whitelabelEnabled } from "@/lib/whitelabel";
import { PRODUCT_NAME, iconUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Icon = { src: string; sizes: string; type?: string; purpose?: string };

// Jeu d'icônes My Fitness App par défaut (PNG valides, tailles réelles). Toujours
// présent : c'est ce qui garantit une vraie icône à l'installation (jamais le
// monogramme « lettre » généré par le navigateur faute d'icône exploitable).
const APP_ICONS: Icon[] = [
  { src: iconUrl("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
  { src: iconUrl("/icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
];

// Manifest PWA DYNAMIQUE (marque blanche). Règles :
//  - compte COACH/OWNER (dashboard) → l'outil s'installe à la marque de son parent.
//  - CLIENT d'un coach AVEC le pack marque blanche → nom et icône du coach,
//    MAIS on garde toujours les icônes My Fitness App en repli dans la liste
//    pour qu'une icône valide existe (sinon Chrome affiche un monogramme « V »).
//  - CLIENT d'un coach SANS le pack → la couleur du coach (c'est son socle),
//    mais le nom et l'icône de qui l'héberge : son revendeur, sinon la
//    plateforme. L'application installée à son nom fait partie du pack, et
//    c'est ici que ça se vend ou pas.
//  - pas de session → My Fitness App par défaut.
// Le <link rel="manifest"> est déclaré crossorigin="use-credentials" pour
// transmettre le cookie de session.
export async function GET() {
  let name = `${PRODUCT_NAME} — Sport & Nutrition`;
  let shortName = PRODUCT_NAME;
  let themeColor = "#F4F3F1";
  let icons: Icon[] = APP_ICONS;

  // Icône = le favicon chargé dans la section « Marque blanche » du bon
  // tenant (coach du client, parent du coach, ou plateforme), en 1re position ;
  // les PNG My Fitness App restent en repli pour qu'une icône valide existe
  // toujours (jamais de monogramme généré par le navigateur).
  // L'icône carrée d'application prime sur le favicon : ce dernier est dessiné
  // pour 32 px et ressort flou une fois posé sur un écran d'accueil.
  const withIcon = (appIcon: string | null, favicon: string | null) => {
    const url = appIcon || favicon;
    return url ? [{ src: url, sizes: "any", purpose: "any" }, ...APP_ICONS] : APP_ICONS;
  };
  try {
    const ctx = await getSessionContext();
    if (ctx && !isCoachAccount(ctx)) {
      const coachTenantId = ctx.profile?.tenant_id ?? null;
      const [brand, packed] = await Promise.all([brandForUser(ctx.userId), whitelabelEnabled(coachTenantId)]);
      if (brand?.brandColor) themeColor = brand.brandColor;
      if (brand && packed) {
        name = brand.name;
        shortName = brand.name.slice(0, 24);
        icons = withIcon(brand.appIconUrl, brand.faviconUrl);
      } else {
        const host = (await parentDashboardBrand(coachTenantId)) ?? (await platformBrand());
        if (host?.name) {
          name = host.name;
          shortName = host.name.slice(0, 24);
        }
        icons = withIcon(null, host?.faviconUrl ?? null);
      }
    } else if (ctx) {
      // Un coach/owner installe SON outil, à la marque de son parent.
      const parent = (await parentDashboardBrand(ctx.profile?.tenant_id ?? null)) ?? (await platformBrand());
      if (parent?.name) {
        name = parent.name;
        shortName = parent.name.slice(0, 24);
      }
      if (parent?.brandColor) themeColor = parent.brandColor;
      icons = withIcon(null, parent?.faviconUrl ?? null);
    } else {
      const platform = await platformBrand();
      icons = withIcon(null, platform?.faviconUrl ?? null);
    }
  } catch {
    /* pas de session : manifest My Fitness App par défaut */
  }

  const manifest = {
    name,
    short_name: shortName,
    description: "Programme d'entraînement et accompagnement nutritionnel personnalisés, avec coach IA.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F3F1",
    theme_color: themeColor,
    icons,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
  });
}
