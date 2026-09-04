import { AuthShell } from "@/components/auth-shell";
import { ResetRequestForm } from "@/components/auth-forms";

export const metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <AuthShell>
      <ResetRequestForm />
    </AuthShell>
  );
}
