import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { safeImageUrl } from "@/lib/google-import";
import { readBounded } from "@/lib/bounded-body";

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
 *
 * Les redirections ne sont pas suivies : la liste blanche ne vaut que pour
 * l'adresse demandée, et un saut nous emmènerait hors de son périmètre.
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
    // `redirect: "manual"` : sans ça, la liste blanche de domaines ne couvrait
    // que le PREMIER saut, et une redirection depuis un hôte Google nous
    // faisait chercher l'image ailleurs. Une adresse d'image ne redirige pas.
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store", redirect: "manual" });
    if (!res.ok) return new NextResponse(null, { status: 502 });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) return new NextResponse(null, { status: 415 });

    // Lecture bornée pour de vrai : `res.arrayBuffer()` aurait déjà tout chargé
    // en mémoire avant qu'on puisse refuser.
    const octets = await readBounded(res, MAX_BYTES);
    if (!octets || octets.byteLength === 0) return new NextResponse(null, { status: 502 });

    return new Response(octets as BodyInit, {
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
