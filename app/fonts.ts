import {
  Inter,
  Sora,
  Manrope,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Bricolage_Grotesque,
  Fraunces,
  Outfit,
} from "next/font/google";

/**
 * Palette typographique de la marque blanche.
 *
 * Les logiciels concurrents laissent taper n'importe quel nom de police Google
 * et la chargent depuis fonts.googleapis.com. Deux raisons de ne pas faire ça :
 * l'IP de chaque visiteur partirait chez Google à chaque page (ce qu'un
 * tribunal allemand a déjà jugé contraire au RGPD), et notre CSP l'interdit
 * (`font-src 'self'`). next/font télécharge donc ces familles AU BUILD et les
 * sert depuis notre domaine : aucune requête sortante, aucun consentement à
 * demander, et le rendu ne dépend pas de la disponibilité d'un tiers.
 *
 * `preload: false` : ces polices ne servent qu'aux tenants qui les choisissent.
 * Les précharger toutes ferait payer huit fichiers à chaque visiteur pour n'en
 * utiliser qu'un. Le navigateur ne télécharge que celle dont un texte a besoin.
 *
 * Archivo, IBM Plex Sans et IBM Plex Mono restent déclarées dans app/layout.tsx :
 * ce sont les polices par défaut, préchargées, et globals.css les rattache aux
 * variables `--font-wl-archivo` / `--font-wl-plex`.
 */

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-inter" });
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-sora" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-manrope" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-jakarta" });
const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-grotesk" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-bricolage" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-fraunces" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-wl-outfit" });

/** Classes à poser sur <html> pour rendre toute la palette disponible. */
export const themeFontVariables = [inter, sora, manrope, jakarta, grotesk, bricolage, fraunces, outfit]
  .map((f) => f.variable)
  .join(" ");
