import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { applyPendingCoachSelection } from "@/lib/tenant";
import { provisionCoachIfPending, provisionResellerIfPending } from "@/lib/coach-onboarding";

// Rattache le nouveau client à son coach + offre (métadonnées d'inscription),
// ou provisionne le tenant d'un nouveau coach, une fois la session établie.
// Best-effort : ne bloque jamais la confirmation.
async function applyCoachSelection(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await provisionResellerIfPending(user.id, user.user_metadata);
    await provisionCoachIfPending(user.id, user.user_metadata);
    await applyPendingCoachSelection(user.id, user.user_metadata);
  } catch {
    /* non bloquant */
  }
}

// Confirmation d'e-mail et récupération de mot de passe.
// Gère les deux formats de lien Supabase :
//   - token_hash + type  (modèles d'e-mail personnalisés, recommandé)
//   - code               (flux PKCE, lien par défaut)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/app";
  const next = nextParam.startsWith("/") ? nextParam : "/app";

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await applyCoachSelection(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await applyCoachSelection(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
}
