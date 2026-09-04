import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serpApiEnabled } from "@/lib/serpapi";
import { GoogleImport } from "@/components/google-import";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Fiche Google, Admin My Fitness App" };
export const dynamic = "force-dynamic";

/**
 * Import de la fiche d'établissement Google.
 *
 * Un coach qui ouvre son tableau de bord pour la première fois a une page
 * vide et pas envie de la remplir. Sa fiche Google, elle, existe déjà : nom,
 * adresse, horaires, photos, avis. La reprendre en trois clics lui donne une
 * page présentable avant d'avoir écrit une ligne.
 */
export default async function FicheGooglePage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <Titre />
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: t }, { count: temoignages }] = await Promise.all([
    admin
      .from("tenants")
      .select("name, google_place_id, google_maps_url, google_rating, google_reviews_count, address")
      .eq("id", tenantId)
      .maybeSingle<{
        name: string | null;
        google_place_id: string | null;
        google_maps_url: string | null;
        google_rating: number | null;
        google_reviews_count: number | null;
        address: string | null;
      }>(),
    admin
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("source", "google"),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Titre />

      {!serpApiEnabled() ? (
        <Alert tone="info">
          {tx("L'import Google n'est pas configuré sur cette installation. Il faut une clé SerpApi dans les variables d'environnement.")}
        </Alert>
      ) : (
        <>
          {t?.google_place_id ? (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                  {tx("Fiche rattachée")}
                </span>
                <span className="font-archivo text-[16px] font-bold text-ink">{t.name}</span>
                <span className="text-[13px] text-muted">
                  {[
                    t.address,
                    t.google_rating != null ? `${t.google_rating} / 5` : null,
                    t.google_reviews_count != null ? `${t.google_reviews_count} ${tx("avis")}` : null,
                    temoignages ? `${temoignages} ${tx("repris en témoignages")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {t.google_maps_url ? (
                <Link
                  href={t.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[13.5px] font-semibold text-brand hover:underline"
                >
                  {tx("Voir sur Google ↗")}
                </Link>
              ) : null}
            </Card>
          ) : null}

          <GoogleImport linkedName={t?.google_place_id ? (t?.name ?? null) : null} />
        </>
      )}
    </div>
  );
}

function Titre() {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {tx("Fiche Google")}
      </h1>
      <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
        {tx("Reprends ce que ta fiche d'établissement dit déjà : adresse, horaires, photos, avis. Tu relis tout avant que quoi que ce soit soit écrit, et rien de ce que tu as rédigé n'est remplacé.")}
      </p>
    </div>
  );
}
