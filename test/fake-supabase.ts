import { vi } from "vitest";

/**
 * Faux client Supabase qui enregistre ce qu'on lui demande.
 *
 * Il ne simule pas une base : il note la table interrogée et les filtres
 * appliqués, ce qui suffit à vérifier la propriété la plus critique du
 * produit, à savoir qu'aucune lecture ne sort du tenant appelant. Un test qui
 * se contenterait de comparer des résultats passerait sans rien garantir : il
 * suffirait d'oublier un `.eq("tenant_id", …)` pour qu'il continue de passer
 * tout en exposant les clients d'un autre coach.
 */

export interface RecordedFilter {
  op: string;
  column: string;
  value: unknown;
}

export interface RecordedQuery {
  table: string;
  filters: RecordedFilter[];
}

/** Un fichier déposé dans le faux stockage. */
export interface RecordedUpload {
  bucket: string;
  path: string;
  contentType: string | undefined;
  bytes: number;
}

export interface FakeAdmin {
  /** Toutes les requêtes vues depuis la création, dans l'ordre. */
  queries: RecordedQuery[];
  /** Les requêtes portant sur une table donnée. */
  on(table: string): RecordedQuery[];
  /** Les fichiers déposés dans le stockage, dans l'ordre. */
  uploads: RecordedUpload[];
  client: unknown;
}

/**
 * @param rows Lignes à renvoyer, par table. Une table absente renvoie [].
 * @param sequences Réponses SUCCESSIVES pour une table interrogée plusieurs
 *   fois dans le même appel. Certaines fonctions descendent la hiérarchie et
 *   lisent `tenants` deux fois (les enfants, puis leurs propres enfants) : sans
 *   ça, la seconde lecture recevrait les lignes de la première et le test
 *   passerait sur une réalité qui n'existe pas. Une fois la file vidée, on
 *   retombe sur `rows`.
 */
export function fakeAdmin(
  rows: Record<string, unknown[]> = {},
  sequences: Record<string, unknown[][]> = {},
): FakeAdmin {
  const queries: RecordedQuery[] = [];
  const restant: Record<string, unknown[][]> = {};
  for (const [table, list] of Object.entries(sequences)) restant[table] = [...list];

  function builder(table: string) {
    const q: RecordedQuery = { table, filters: [] };
    queries.push(q);
    // Résolu UNE fois par requête, à la première lecture : une même chaîne peut
    // être consommée par `maybeSingle` puis par `then`, sans avancer la file.
    let resolu: unknown[] | null = null;
    const data = () => {
      if (resolu === null) resolu = restant[table]?.shift() ?? rows[table] ?? [];
      return resolu;
    };

    // Chaque méthode renvoie le même objet : la chaîne d'appels se poursuit,
    // et `await` sur la chaîne livre le résultat (thenable).
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (v: unknown) => {
        q.filters.push({ op: "insert", column: "*", value: v });
        return chain;
      },
      update: (v: unknown) => {
        q.filters.push({ op: "update", column: "*", value: v });
        return chain;
      },
      upsert: (v: unknown) => {
        q.filters.push({ op: "upsert", column: "*", value: v });
        return chain;
      },
      delete: () => {
        q.filters.push({ op: "delete", column: "*", value: null });
        return chain;
      },
      eq: (column: string, value: unknown) => {
        q.filters.push({ op: "eq", column, value });
        return chain;
      },
      neq: (column: string, value: unknown) => {
        q.filters.push({ op: "neq", column, value });
        return chain;
      },
      in: (column: string, value: unknown) => {
        q.filters.push({ op: "in", column, value });
        return chain;
      },
      or: (expr: string) => {
        q.filters.push({ op: "or", column: expr, value: expr });
        return chain;
      },
      not: (column: string, _op: string, value: unknown) => {
        q.filters.push({ op: "not", column, value });
        return chain;
      },
      ilike: (column: string, value: unknown) => {
        q.filters.push({ op: "ilike", column, value });
        return chain;
      },
      gte: (column: string, value: unknown) => {
        q.filters.push({ op: "gte", column, value });
        return chain;
      },
      lte: (column: string, value: unknown) => {
        q.filters.push({ op: "lte", column, value });
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      returns: () => chain,
      maybeSingle: async () => ({ data: data()[0] ?? null, error: null }),
      single: async () => ({ data: data()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: data(), error: null, count: data().length }).then(resolve),
    };
    return chain;
  }

  // Stockage : on note ce qui est déposé et on rend une adresse publique
  // prévisible. Assez pour vérifier qu'un fichier part, et sous quel type.
  const uploads: RecordedUpload[] = [];
  const storage = {
    from: (bucket: string) => ({
      upload: async (path: string, body: unknown, opts?: { contentType?: string }) => {
        uploads.push({
          bucket,
          path,
          contentType: opts?.contentType,
          bytes: body instanceof Uint8Array ? body.byteLength : 0,
        });
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://stockage.test/${bucket}/${path}` } }),
    }),
  };

  return {
    queries,
    uploads,
    on: (table: string) => queries.filter((q) => q.table === table),
    client: { from: (table: string) => builder(table), storage },
  };
}

/** Installe le faux client à la place de `createAdminClient`. */
export function mockAdminModule(fake: FakeAdmin) {
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
}

/** Le filtre `eq` posé sur une colonne, ou `undefined` s'il n'y en a pas. */
export function eqValue(q: RecordedQuery, column: string): unknown {
  return q.filters.find((f) => f.op === "eq" && f.column === column)?.value;
}
