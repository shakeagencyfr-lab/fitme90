import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERSONAL_TABLES, type PersonalTable } from "@/lib/gdpr";

// Ce que l'application détient VRAIMENT sur une personne, en chiffres.
//
// POURQUOI COMPTER, PLUTÔT QUE DE RENVOYER À LA POLITIQUE. La politique de
// confidentialité dit ce qui PEUT être collecté. C'est un texte de catégorie,
// et il se lit comme un texte de loi : à froid, sans savoir ce qu'il recouvre
// pour soi. « 42 séances enregistrées, 11 pesées, 0 photo » ne se lit pas de
// la même façon. C'est la même liste, rendue vérifiable.
//
// LECTURE EN SERVICE_ROLE, STRICTEMENT FILTRÉE. Comme pour l'export : certaines
// lignes parlent de la personne sans lui appartenir (les notes de son coach à
// son sujet, ses rendez-vous), et la RLS les lui refuse à juste titre en
// lecture courante. L'article 15 lui en ouvre pourtant l'accès. On lit donc
// avec la clé de service, mais jamais sur autre chose que son identifiant.

export interface DataHolding {
  entry: PersonalTable;
  /** null quand la table n'existe pas encore dans cette base. */
  rows: number | null;
}

export async function countPersonalRows(userId: string): Promise<DataHolding[]> {
  if (!userId) return [];
  const admin = createAdminClient();
  return Promise.all(
    PERSONAL_TABLES.map(async (entry) => {
      const { count, error } = await admin
        .from(entry.table)
        .select("*", { count: "exact", head: true })
        .eq(entry.column, userId);
      // Une table absente (migration pas encore passée) ne doit pas faire
      // échouer tout l'écran : on le dit, et on continue.
      return { entry, rows: error ? null : (count ?? 0) };
    }),
  );
}
