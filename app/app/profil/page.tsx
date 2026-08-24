import Link from "next/link";
import { getSessionContext } from "@/lib/guard";
import { redirect } from "next/navigation";
import { accessLabel } from "@/lib/access";
import { Card, MonoLabel, Stat } from "@/components/ui";
import { PasswordChange, AccountActions } from "@/components/profil-actions";
import { COACH_CREDENTIAL } from "@/lib/config";

export const metadata = { title: "Profil — FitMe90" };

export default async function ProfilPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/profil");

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Profil
      </h1>

      <Card className="flex flex-col gap-3">
        <MonoLabel>Compte</MonoLabel>
        <div className="text-[15px] text-ink">{ctx.email}</div>
        <Stat label="Accès" value={accessLabel(ctx.access)} />
        <p className="text-[12.5px] text-muted-2">
          Programme conçu par un {COACH_CREDENTIAL.toLowerCase()}. Accompagnement
          sportif et de bien-être, sans visée médicale.
        </p>
      </Card>

      <PasswordChange />
      <AccountActions />

      <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-2">
        <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
        <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
        <Link href="/cgv" className="hover:text-ink">CGV</Link>
      </nav>
    </div>
  );
}
