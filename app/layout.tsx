import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

// Polices auto-hébergées par next/font (aucun appel à Google au runtime,
// donc rien à autoriser dans la CSP côté font-src).
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FitMe90, Ton programme sport & nutrition sur 90 jours",
  description:
    "Un programme d'entraînement et d'accompagnement nutritionnel personnalisé sur 90 jours, conçu par un coach professionnel diplômé d'État.",
  applicationName: "FitMe90",
  // Le <link rel="manifest"> est rendu manuellement (crossorigin use-credentials)
  // pour servir un manifest en marque blanche selon le coach du client connecté.
  appleWebApp: { capable: true, title: "FitMe90", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// La couleur de thème et la prise en compte de l'encoche sont réglées ici :
// viewport-fit=cover permet aux zones sûres (safe-area-inset) de fonctionner.
export const viewport: Viewport = {
  themeColor: "#F4F3F1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Autorise le zoom (accessibilité) tout en gardant des inputs à 16px.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${archivo.variable} ${plex.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/* Manifest en marque blanche : credentials pour transmettre la session. */}
      <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* Applique le thème avant le premier rendu (évite le flash clair). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
