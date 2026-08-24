import { LoginForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";

export const metadata = { title: "Connexion — FitMe90" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const suite = typeof sp.suite === "string" ? sp.suite : undefined;
  const erreur = sp.erreur;
  return (
    <div className="flex flex-col gap-4">
      {erreur === "lien_invalide" ? (
        <Alert>Ce lien a expiré ou a déjà été utilisé. Reconnecte-toi.</Alert>
      ) : null}
      <LoginForm suite={suite} />
    </div>
  );
}
