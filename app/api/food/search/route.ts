import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { searchProducts } from "@/lib/open-food-facts";
import { resolveLocale, userLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

// Recherche d'un aliment par son nom, pour ce qui n'a pas de code-barres ou
// quand la caméra n'est pas disponible (ordinateur).
export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.planViewable) return NextResponse.json({ error: "Accès fermé" }, { status: 403 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ products: [] });

  const locale = await resolveLocale(await userLocale(ctx.userId));
  const products = await searchProducts(q, locale);
  return NextResponse.json({ products });
}
