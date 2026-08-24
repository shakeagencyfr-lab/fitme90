import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client SERVICE ROLE — contourne le RLS. À n'utiliser QUE dans du code
// serveur de confiance : webhook Stripe (écriture de `paid`), suppression
// réelle de compte (lignes + fichiers du bucket). `server-only` fait
// échouer le build si ce module est importé côté navigateur.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase admin: variables d'environnement manquantes.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
