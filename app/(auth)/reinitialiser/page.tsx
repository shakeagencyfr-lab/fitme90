import { NewPasswordForm } from "@/components/auth-forms";
import { CoachBrandHeader } from "@/components/coach-brand-header";

export const metadata = { title: "Nouveau mot de passe, FitMe90" };

export default function ReinitialiserPage() {
  return (
    <>
      <CoachBrandHeader />
      <NewPasswordForm />
    </>
  );
}
