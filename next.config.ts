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
  `frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com`,
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

const nextConfig: NextConfig = {
  async headers() {
    return [
      // La route embed d'abord, avec ses en-têtes permissifs (framable).
      { source: "/c/:slug/embed", headers: embedHeaders },
      // Tout le reste (la route embed exclue) garde les en-têtes stricts.
      { source: "/((?!c/[^/]+/embed).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
