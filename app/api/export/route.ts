import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { CONSENT_LABEL, LEGAL_BASIS_LABEL, PERSONAL_TABLES, SUBPROCESSORS } from "@/lib/gdpr";

export const runtime = "nodejs";

// Export RGPD : tout le dossier de la personne, en JSON (articles 15 et 20).
//
// CE QUI A CHANGÉ. L'export listait neuf tables écrites à la main, sur les
// vingt et une qui contiennent aujourd'hui de la donnée personnelle. Il
// parcourt maintenant le registre de lib/gdpr.ts, et un test échoue si une
// table de données personnelles y manque : l'export ne peut plus prendre du
// retard sur le schéma sans que quelqu'un s'en aperçoive.
//
// POURQUOI LA CLÉ DE SERVICE ET NON LA SESSION. Certaines lignes parlent de
// la personne sans lui appartenir : les notes que son coach a écrites à son
// sujet, ses rendez-vous, les alertes remontées. La RLS les lui refuse, à
// juste titre pour la lecture courante. L'article 15 lui en ouvre pourtant
// l'accès. On lit donc en service_role, mais STRICTEMENT filtré sur son
// identifiant, jamais sur autre chose.

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();

  const donnees: Record<string, unknown> = {};
  const registre: Record<string, unknown>[] = [];

  for (const t of PERSONAL_TABLES) {
    const { data, error } = await admin.from(t.table).select("*").eq(t.column, ctx.userId);
    // Une table absente de cette base (migration pas encore passée) ne doit
    // pas faire échouer tout l'export : on le dit, et on continue.
    donnees[t.table] = error ? { indisponible: error.message } : (data ?? []);
    registre.push({
      table: t.table,
      intitule: t.label,
      finalite: t.purpose,
      base_legale: LEGAL_BASIS_LABEL[t.basis],
      donnees_de_sante: Boolean(t.health),
      duree_de_conservation: t.retention,
      ...(t.survivesDeletion ? { survit_a_la_suppression: true } : {}),
      lignes: Array.isArray(donnees[t.table]) ? (donnees[t.table] as unknown[]).length : null,
    });
  }

  const dump = {
    // Ce que la personne a sous les yeux en ouvrant le fichier : de quoi
    // comprendre ce qu'elle lit, avant les données elles-mêmes.
    a_propos_de_cet_export: {
      genere_le: new Date().toISOString(),
      contenu:
        "L'intégralité des données personnelles détenues sur toi dans l'application, y compris celles écrites par ton coach à ton sujet.",
      droits:
        "Tu peux demander la rectification ou la suppression de ces données depuis ton profil, ou en écrivant à ton coach. Tu peux aussi saisir la CNIL.",
      format: "JSON, lisible par un humain comme par un autre service (article 20, portabilité).",
    },
    compte: { user_id: ctx.userId, email: ctx.email },
    registre_des_traitements: registre,
    sous_traitants: SUBPROCESSORS,
    consentements_possibles: CONSENT_LABEL,
    donnees,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mes-donnees.json"',
      "cache-control": "no-store",
    },
  });
}
