import Link from "next/link";

export const metadata = { title: "Vérifie tes e-mails" };

export default function VerifieTesMailsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-archivo font-extrabold text-[28px] leading-[1.05] tracking-[-0.03em] text-ink">
        Vérifie tes e-mails
      </h1>
      <p className="text-[15px] text-muted leading-relaxed">
        On vient de t'envoyer un lien de confirmation. Ouvre-le pour activer ton
        compte, puis reviens te connecter. Pense à regarder tes courriers
        indésirables.
      </p>
      <Link href="/connexion" className="text-brand font-medium text-[15px]">
        Retour à la connexion
      </Link>
    </div>
  );
}
