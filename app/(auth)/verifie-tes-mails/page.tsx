import { AuthShell } from "@/components/auth-shell";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Vérifie tes e-mails" };

export default async function VerifieTesMailsPage() {
  const { t } = await getT();
  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <h1 className="font-archivo font-extrabold text-[28px] leading-[1.05] tracking-[-0.03em] text-ink">
          {t("auth.checkMailTitle")}
        </h1>
        <p className="text-[15px] text-muted leading-relaxed">{t("auth.checkMailBody")}</p>
        <Link href="/connexion" className="text-brand font-medium text-[15px]">
          {t("auth.backToLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
