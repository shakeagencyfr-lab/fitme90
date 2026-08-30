import Link from "next/link";
import { brandForSlug } from "@/lib/branding";
import { CoachMark } from "@/components/brand";

// En-tête de marque des pages auth : logo/nom du coach si on arrive depuis sa
// page (?c=slug), sinon FitMe90. Rendu au-dessus du formulaire.
export async function CoachBrandHeader({ slug }: { slug?: string }) {
  const brand = slug ? await brandForSlug(slug) : null;
  const href = brand?.slug ? `/c/${brand.slug}` : "/";
  return (
    <div className="mb-6 flex justify-center">
      <Link href={href} aria-label={brand?.name ?? "Accueil"} className="flex items-center">
        <CoachMark brand={brand} size={22} imgClass="h-10" />
      </Link>
    </div>
  );
}
