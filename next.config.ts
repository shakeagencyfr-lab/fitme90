import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Origine Supabase dérivée de l'URL publique, pour n'autoriser que ce
// domaine précis dans connect-src / img-src (pas de joker large).
function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "https://*.supabase.co";
  try {
    return new URL(url).origin;
  } catch {
    return "https://*.supabase.co";
  }
}

const sb = supabaseOrigin();
const sbWs = sb.replace(/^https/, "wss");

// CSP restrictive (BUILD_PLAN étape 10). 'unsafe-inline' pour les styles
// est toléré (Tailwind + styles ponctuels) ; en dev on autorise
// 'unsafe-eval' que le HMR de Next exige.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${sb}`,
  `font-src 'self'`,
  `connect-src 'self' ${sb} ${sbWs} https://api.stripe.com`,
  // 'self' est indispensable : le studio marque blanche encadre la vraie page
  // publique (meme origine) dans son apercu live. Sans lui, l'enfant autorise
  // bien le framing (frame-ancestors 'self') mais le PARENT refuse de l'inserer
  // et le navigateur affiche « Ce contenu est bloque ».
  `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`,
  `form-action 'self' https://checkout.stripe.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  },
];

// Widget d'intégration : la page /c/[slug]/embed doit pouvoir être affichée dans
// un iframe sur N'IMPORTE QUEL site de coach. On autorise donc le framing
// (frame-ancestors *) et on n'envoie PAS X-Frame-Options DENY pour cette route.
const embedCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors *");
const embedHeaders = [
  { key: "Content-Security-Policy", value: embedCsp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  },
];

// Landings publiques (coach /c/[slug], revendeur /r/[slug], plateforme /) :
// framables UNIQUEMENT en same-origin, pour l'aperçu live du studio marque
// blanche. Le cross-origin reste bloqué (frame-ancestors 'self' + SAMEORIGIN).
const selfFrameCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
const selfFrameHeaders = securityHeaders.map((h) =>
  h.key === "Content-Security-Policy"
    ? { key: h.key, value: selfFrameCsp }
    : h.key === "X-Frame-Options"
      ? { key: h.key, value: "SAMEORIGIN" }
      : h,
);

const nextConfig: NextConfig = {
  // Les uploads (logos, images d'offres, médias d'exercices) passent par des
  // server actions : la limite par défaut (1 Mo) faisait échouer les photos de
  // téléphone (« Body exceeded 1 MB limit » vu en production sur /admin/offres).
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [
      // La route embed d'abord, avec ses en-têtes permissifs (framable partout).
      { source: "/c/:slug/embed", headers: embedHeaders },
      // Tout le reste garde les en-têtes stricts, SAUF les routes framables
      // same-origin (racine, /c/:slug, /r/:slug) et la route embed : Next.js
      // FUSIONNE les en-têtes de plusieurs `source` qui matchent (il ne les
      // remplace pas), donc si le catch-all les couvrait aussi, le navigateur
      // recevait X-Frame-Options: DENY + SAMEORIGIN et bloquait l'aperçu. On
      // les exclut du catch-all pour qu'un seul jeu d'en-têtes s'applique.
      { source: "/((?!c/[^/]+/embed|c/[^/]+$|r/[^/]+$|revendeurs$|apercu-site$|$).*)", headers: securityHeaders },
      // Landings publiques : framables same-origin (aperçu live du studio).
      // /revendeurs = page de vente revendeurs (aperçu marque blanche plateforme).
      { source: "/c/:slug", headers: selfFrameHeaders },
      { source: "/r/:slug", headers: selfFrameHeaders },
      { source: "/revendeurs", headers: selfFrameHeaders },
      // Aperçu privé du mini-site, affiché dans l'iframe du studio « Mon site ».
      // Sans cette ligne il tombait dans le catch-all, recevait
      // X-Frame-Options: DENY, et le navigateur refusait de l'afficher : le
      // coach voyait un cadre gris à la place de sa page. Le cross-origin
      // reste bloqué (frame-ancestors 'self'), et la route exige de toute
      // façon une session admin.
      { source: "/apercu-site", headers: selfFrameHeaders },
      { source: "/", headers: selfFrameHeaders },
    ];
  },
};

export default nextConfig;
