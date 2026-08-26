import type { MetadataRoute } from "next";
import { PRODUCT_NAME } from "@/lib/config";

// Manifest PWA — rend l'app installable (Chrome « Installer », Safari « Sur l'écran
// d'accueil »). Servi sur /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PRODUCT_NAME} — Sport & Nutrition 90 jours`,
    short_name: PRODUCT_NAME,
    description:
      "Programme d'entraînement et accompagnement nutritionnel personnalisés sur 90 jours, avec coach IA.",
    lang: "fr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F3F1",
    theme_color: "#F4F3F1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
