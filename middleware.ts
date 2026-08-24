import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Protège l'espace client et la route de génération (la plus coûteuse).
// Le contrôle du paiement et du cycle de vie se fait en plus dans chaque
// route/page, côté serveur.
export const config = {
  matcher: ["/app/:path*", "/api/generate/:path*"],
};
