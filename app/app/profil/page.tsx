import Link from "next/link";
import { getSessionContext } from "@/lib/guard";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accessLabel } from "@/lib/access";
import { Card, MonoLabel, Stat } from "@/components/ui";
import { PasswordChange, AccountActions } from "@/components/profil-actions";
import { ProfileMeasures } from "@/components/profile-measures";
import { StartDateSetting } from "@/components/start-date-setting";
import { NotificationSetting } from "@/components/notification-setting";
import { ThemeToggle } from "@/components/theme-toggle";
import { RestartOnboarding } from "@/components/onboarding-tour";
import { SubscriptionCard } from "@/components/subscription-card";
import { isAdminEmail } from "@/lib/admin";
import { COACH_CREDENTIAL } from "@/lib/config";
import { LangSwitch } from "@/components/lang-switch";
import { getT, userLocale } from "@/lib/i18n/server";

export const metadata = { title: "Profil" };

export default async function ProfilPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/profil");

  const supabase = await createClient();
  const [{ data: prof }, { data: lastWeight }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, age, height_cm, rest_hr, start_date, sex, subscription_id, subscription_interval, subscription_current_period_end, subscription_cancel_at_period_end")
      .eq("id", ctx.userId)
      .maybeSingle<{
        name: string | null;
        age: number | null;
        height_cm: number | null;
        rest_hr: number | null;
        start_date: string | null;
        sex: string | null;
        subscription_id: string | null;
        subscription_interval: string | null;
        subscription_current_period_end: string | null;
        subscription_cancel_at_period_end: boolean | null;
      }>(),
    supabase
      .from("weights")
      .select("kg")
      .eq("user_id", ctx.userId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ kg: number }>(),
  ]);
  const str = (v: number | null | undefined) => (v != null ? String(v) : "");
  const { locale, t } = await getT(await userLocale(ctx.userId));

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {prof?.name?.trim() || t("nav.profile")}
        </h1>
        {prof?.name?.trim() ? <MonoLabel>{t("profile.title")}</MonoLabel> : null}
      </div>

      <ProfileMeasures
        age={str(prof?.age)}
        weight={str(lastWeight?.kg)}
        height={str(prof?.height_cm)}
        rest={str(prof?.rest_hr)}
        sex={prof?.sex ?? ""}
      />

      {["scheduled", "active", "grace"].includes(ctx.access.phase) ? (
        <StartDateSetting current={prof?.start_date ?? ""} />
      ) : null}

      {prof?.subscription_id ? (
        <SubscriptionCard
          interval={prof.subscription_interval}
          periodEnd={prof.subscription_current_period_end}
          cancelAtPeriodEnd={!!prof.subscription_cancel_at_period_end}
        />
      ) : null}

      <NotificationSetting />

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("profile.account")}</MonoLabel>
        <div className="text-[15px] text-ink">{ctx.email}</div>
        <Stat label={t("profile.access")} value={accessLabel(ctx.access, locale)} />
        <p className="text-[12.5px] text-muted-2">{t("profile.designedBy", { credential: COACH_CREDENTIAL.toLowerCase() })}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <MonoLabel>{t("common.language")}</MonoLabel>
        <LangSwitch className="self-start" />
        <p className="text-[12.5px] text-muted-2">{t("profile.languageHint")}</p>
        <div className="h-px bg-line-2" />
        <MonoLabel>{t("profile.appearance")}</MonoLabel>
        <ThemeToggle className="self-start" />
        <div className="h-px bg-line-2" />
        <MonoLabel>{t("profile.onboarding")}</MonoLabel>
        <RestartOnboarding className="self-start" />
      </Card>

      {isAdminEmail(ctx.email) ? (
        <Card className="flex flex-col gap-2">
          <MonoLabel className="text-brand">Espace coach</MonoLabel>
          <Link href="/admin" className="font-archivo font-semibold text-[16px] text-ink hover:text-brand">
            Ouvrir le dashboard admin →
          </Link>
          <p className="text-[12.5px] text-muted-2">Clients inscrits et configuration de l&apos;IA de génération.</p>
        </Card>
      ) : null}

      <PasswordChange />
      <AccountActions />

      <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-2">
        <Link href="/mentions-legales" className="hover:text-ink">{t("profile.legal")}</Link>
        <Link href="/confidentialite" className="hover:text-ink">{t("profile.privacy")}</Link>
        <Link href="/cgv" className="hover:text-ink">CGV</Link>
      </nav>
    </div>
  );
}
