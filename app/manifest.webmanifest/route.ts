import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { isCoachAccount } from "@/lib/admin";
import { brandForUser } from "@/lib/branding";
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
//  - compte COACH/OWNER (dashboard) → toujours l'app My Fitness App (icône plateforme).
//  - CLIENT d'un coach → nom/couleur du coach, et son favicon comme icône SI
//    disponible, MAIS on garde toujours les icônes My Fitness App en repli dans la liste
//    pour qu'une icône valide existe (sinon Chrome affiche un monogramme « V »).
//  - pas de session → My Fitness App par défaut.
// Le <link rel="manifest"> est déclaré crossorigin="use-credentials" pour
// transmettre le cookie de session.
export async function GET() {
  let name = `${PRODUCT_NAME} — Sport & Nutrition`;
  let shortName = PRODUCT_NAME;
  let themeColor = "#F4F3F1";
  let icons: Icon[] = APP_ICONS;

  try {
    const ctx = await getSessionContext();
    // Un coach/owner installe SON outil : on garde la marque My Fitness App.
    if (ctx && !isCoachAccount(ctx)) {
      const brand = await brandForUser(ctx.userId);
      if (brand) {
        name = brand.name;
        shortName = brand.name.slice(0, 24);
        if (brand.brandColor) themeColor = brand.brandColor;
        // Favicon du coach en 1re icône (idéalement carré), puis repli My Fitness App :
        // ainsi l'installation a TOUJOURS une icône valide, jamais un monogramme.
        if (brand.faviconUrl) {
          icons = [
            { src: brand.faviconUrl, sizes: "any", purpose: "any" },
            ...APP_ICONS,
          ];
        }
      }
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
