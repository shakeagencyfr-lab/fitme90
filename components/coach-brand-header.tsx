import Link from "next/link";
import { brandForSlug } from "@/lib/branding";
import { CoachMark } from "@/components/brand";

// En-tête de marque des pages auth : logo/nom du coach (ou du revendeur) si on
// arrive depuis sa page, sinon FitMe90. `hrefBase` fixe la landing de retour
// ("/c" pour un coach, "/r" pour un revendeur). Rendu au-dessus du formulaire.
export async function CoachBrandHeader({ slug, hrefBase = "/c" }: { slug?: string; hrefBase?: "/c" | "/r" }) {
  const brand = slug ? await brandForSlug(slug) : null;
  const href = brand?.slug ? `${hrefBase}/${brand.slug}` : "/";
  return (
    <div className="mb-6 flex justify-center">
      <Link href={href} aria-label={brand?.name ?? "Accueil"} className="flex items-center">
        <CoachMark brand={brand} size={22} imgClass="h-10" />
      </Link>
    </div>
  );
}
