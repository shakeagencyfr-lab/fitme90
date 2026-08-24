import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase pour composants serveur et routes API. Lit/écrit la
// session dans les cookies httpOnly. `cookies()` est asynchrone (Next 15+).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Dans un composant serveur (rendu), l'écriture de cookies lève :
          // la session est alors rafraîchie par le middleware. On ignore.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* appelé depuis un Server Component — sans effet, ok */
          }
        },
      },
    },
  );
}
