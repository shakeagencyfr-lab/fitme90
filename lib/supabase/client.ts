import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur. N'utilise que les clés PUBLIQUES
// (URL + clé anon). Jamais la service role ici.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
