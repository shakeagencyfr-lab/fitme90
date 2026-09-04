import { AuthShell } from "@/components/auth-shell";
import { NewPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Nouveau mot de passe" };

export default function ReinitialiserPage() {
  return (
    <AuthShell>
      <NewPasswordForm />
    </AuthShell>
  );
}
