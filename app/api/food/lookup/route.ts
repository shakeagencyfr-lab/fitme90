import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { lookupBarcode } from "@/lib/open-food-facts";
import { normalizeBarcode } from "@/lib/food-log";
import { resolveLocale, userLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

// La fiche d'un code-barres scanné. Réservé aux clients connectés dont le
// programme est consultable ; le journal lui-même s'écrit par action serveur.
export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.planViewable) return NextResponse.json({ error: "Accès fermé" }, { status: 403 });

  const code = normalizeBarcode(new URL(req.url).searchParams.get("code") ?? "");
  if (!code) return NextResponse.json({ error: "Code invalide" }, { status: 400 });

  const locale = await resolveLocale(await userLocale(ctx.userId));
  const product = await lookupBarcode(code, locale);
  if (!product) return NextResponse.json({ product: null }, { status: 404 });
  return NextResponse.json({ product });
}
