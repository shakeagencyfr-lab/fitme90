import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandForUser } from "@/lib/branding";
import { PRODUCT_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Manifest PWA DYNAMIQUE (marque blanche) : quand un client est connecté, l'app
// installée prend le nom, la couleur et l'ICÔNE (favicon) de son coach ; sinon
// on sert le manifest FitMe90 par défaut. Le <link rel="manifest"> est déclaré
// avec crossorigin="use-credentials" pour que le cookie de session soit envoyé.
export async function GET() {
  let name = `${PRODUCT_NAME} — Sport & Nutrition`;
  let shortName = PRODUCT_NAME;
  let themeColor = "#F4F3F1";
  let icons: { src: string; sizes: string; type?: string; purpose?: string }[] = [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const brand = await brandForUser(user.id);
      if (brand) {
        name = brand.name;
        shortName = brand.name.slice(0, 24);
        if (brand.brandColor) themeColor = brand.brandColor;
        // L'icône PWA = le favicon du coach (à défaut, son logo).
        const iconUrl = brand.faviconUrl || brand.logoUrl;
        if (iconUrl) {
          icons = [
            { src: iconUrl, sizes: "192x192", purpose: "any" },
            { src: iconUrl, sizes: "512x512", purpose: "any" },
            { src: iconUrl, sizes: "512x512", purpose: "maskable" },
          ];
        }
      }
    }
  } catch {
    /* pas de session : manifest FitMe90 par défaut */
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
