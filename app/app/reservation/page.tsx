import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { getT, userLocale } from "@/lib/i18n/server";
import { clientBookingContext, listCalendars, listServices, readBookingSettings } from "@/lib/booking";
import { confirmBookingPayment, listClientBookings } from "@/lib/booking-appointments";
import { readCoachName } from "@/lib/methodology";
import { BookingClient } from "@/components/booking-client";

export const metadata = { title: "Réservation" };
export const dynamic = "force-dynamic";

/**
 * L'onglet Réservation du client : prendre un rendez-vous en présentiel, et
 * voir ceux qu'il a. N'existe que si son coach lui a ouvert la réservation.
 * Le retour de Stripe passe ici : on confirme le paiement AVANT de lire la
 * liste, pour que la page reflète ce qui vient d'être payé.
 */
export default async function ReservationPage({ searchParams }: { searchParams: Promise<{ paye_session_id?: string; paiement_annule?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/reservation");
  const booking = await clientBookingContext(ctx.userId);
  if (!booking.enabled || !booking.tenantId) redirect("/app");
  const sp = await searchParams;

  let notice: "paid" | "payFailed" | "payCancelled" | null = null;
  if (sp.paye_session_id) notice = (await confirmBookingPayment(ctx.userId, sp.paye_session_id)) ? "paid" : "payFailed";
  else if (sp.paiement_annule) notice = "payCancelled";

  const tenantId = booking.tenantId;
  const [{ t, locale }, services, calendars, settings, mine, coachName] = await Promise.all([
    getT(await userLocale(ctx.userId)),
    listServices(tenantId, true),
    listCalendars(tenantId, true),
    readBookingSettings(tenantId),
    listClientBookings(ctx.userId),
    readCoachName(tenantId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,32px)] leading-[1.05] tracking-[-0.03em] text-ink">{t("booking.title")}</h1>
        <p className="text-[14px] text-muted">{t("booking.intro", { coach: coachName })}</p>
      </div>
      <BookingClient
        services={services}
        calendars={calendars.filter((c) => c.hours.length > 0).map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        settings={{ payment: settings.payment, confirmation: settings.confirmation, cancelLimitHours: settings.cancelLimitHours, address: settings.address, instructions: settings.instructions }}
        timezone={booking.timezone}
        locale={locale}
        upcoming={mine.upcoming}
        past={mine.past}
        notice={notice}
        canLog={ctx.access.canLog}
      />
    </div>
  );
}
