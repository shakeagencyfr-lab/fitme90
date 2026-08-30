import { ResetRequestForm } from "@/components/auth-forms";
import { CoachBrandHeader } from "@/components/coach-brand-header";

export const metadata = { title: "Mot de passe oublié, FitMe90" };

export default function MotDePasseOubliePage() {
  return (
    <>
      <CoachBrandHeader />
      <ResetRequestForm />
    </>
  );
}
