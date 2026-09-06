import { notFound } from "next/navigation";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { bookingSpace, bookingReady, listBlocks, listCalendars, listServices, readBookingSettings } from "@/lib/booking";
import { verifyBookingCheckout } from "@/lib/booking-billing";
import { BookingAdmin } from "@/components/booking-admin";
import { BookingLocked } from "@/components/booking-locked";
import { Alert } from "@/components/ui";

export const metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";

/**
 * L'écran Réservations d'un coach ou d'une salle.
 *
 * Sans le pack : ce qu'il contient, le prix, le bouton (ou à qui le
 * demander). Avec : l'interrupteur, les plannings, les prestations, les
 * règles. Le retour de Stripe après souscription passe par ici aussi : on
 * vérifie la session avant d'ouvrir quoi que ce soit.
 */
export default async function AdminBookingPage({ searchParams }: { searchParams: Promise<{ bk_session_id?: string; bk_erreur?: string; bk_annule?: string }> }) {
  const ctx = await getAdminOrNull();
  if (!ctx) notFound();
  const tenantId = ctx.profile?.tenant_id ?? null;
  const params = await searchParams;
  if (!tenantId) return <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>;

  const node = await tenantNode(tenantId);
  if (node?.kind !== "coach") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">{tx("Réservations")}</h1>
        <Alert tone="info">{tx("La réservation se règle dans l'espace de chaque coach ou salle. Depuis Paliers, tu choisis qui y a droit : inclus dans un palier, ou vendu à part.")}</Alert>
      </div>
    );
  }

  let justPaid = false;
  if (params.bk_session_id) justPaid = await verifyBookingCheckout(tenantId, params.bk_session_id);

  const space = await bookingSpace(tenantId);
  if (!space.access.allowed) {
    return <BookingLocked priceCents={space.access.priceCents} erreur={"bk_erreur" in params} annule={"bk_annule" in params} />;
  }

  const [settings, calendars, blocks, services, ready] = await Promise.all([
    readBookingSettings(tenantId),
    listCalendars(tenantId),
    listBlocks(tenantId),
    listServices(tenantId),
    bookingReady(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {justPaid ? <Alert tone="info">{tx("Pack activé. Tes clients pourront réserver dès que tu auras un planning avec des horaires et une prestation.")}</Alert> : null}
      <BookingAdmin active={space.active} timezone={space.timezone} settings={settings} calendars={calendars} blocks={blocks} services={services} ready={ready} source={space.access.source} />
    </div>
  );
}
