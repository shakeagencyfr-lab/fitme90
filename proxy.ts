import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 : la convention `middleware` est renommée `proxy`.
// Rafraîchit la session Supabase et protège les routes côté serveur.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Protège l'espace client et la route de génération (la plus coûteuse).
// Le contrôle du paiement et du cycle de vie se fait EN PLUS dans chaque
// route/page, côté serveur.
export const config = {
  matcher: ["/app/:path*", "/api/generate/:path*"],
};
