import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { safeImageUrl } from "@/lib/google-import";

/**
 * Vignette d'une photo de fiche Google, servie depuis chez nous.
 *
 * L'écran d'import doit montrer les photos avant que le coach en choisisse
 * une. Les afficher depuis l'adresse Google poserait deux problèmes : notre
 * politique de sécurité de contenu n'autorise pas ce domaine, et l'élargir
 * pour un écran d'administration serait cher payé ; et chaque ouverture de
 * l'écran signalerait le coach à Google, avant même qu'il ait choisi quoi que
 * ce soit.
 *
 * On relaie donc, en n'acceptant que les domaines d'images Google et que les
 * réponses qui sont vraiment des images. Réservé aux admins : sans cela, ce
 * serait un relais ouvert que n'importe qui pourrait faire pointer ailleurs.
 */

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(req: Request): Promise<Response> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return new NextResponse(null, { status: 403 });

  const url = safeImageUrl(new URL(req.url).searchParams.get("u"));
  if (!url) return new NextResponse(null, { status: 400 });

  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return new NextResponse(null, { status: 502 });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) return new NextResponse(null, { status: 415 });

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return new NextResponse(null, { status: 502 });

    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": type,
        // Le temps de l'écran, pas plus : ces adresses expirent chez Google.
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  } finally {
    clearTimeout(minuterie);
  }
}
