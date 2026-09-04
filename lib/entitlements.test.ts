import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, mockAdminModule, eqValue, type FakeAdmin } from "@/test/fake-supabase";

/**
 * Capacité d'un compte : combien il peut en accueillir, et de quoi.
 *
 * La subtilité tient en une phrase : la colonne `client_limit` ne compte pas
 * la même chose selon l'étage. Chez un coach elle plafonne ses clients ; chez
 * un revendeur, qui n'en a aucun en direct, elle plafonne les comptes coach et
 * salle sous sa marque. Confondre les deux donnait une jauge « 0 / 1 » à un
 * revendeur qui avait déjà un coach en activité.
 */

let fake: FakeAdmin;

/** N lignes quelconques : le faux client déduit `count` de leur nombre. */
const nLignes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `x${i}` }));

/**
 * @param limite Limite lue sur le tenant. `undefined` = colonne absente.
 * @param clients Profils clients rattachés.
 * @param comptes Comptes enfants rattachés.
 *
 * Les deux lectures de `tenants` d'un revendeur (sa limite, puis ses enfants)
 * passent par une file : sans elle la seconde recevrait la ligne de la
 * première, et le test validerait une fiction.
 */
async function lib({
  limite,
  clients = 0,
  comptes = 0,
  tenantIntrouvable = false,
}: { limite?: number | null; clients?: number; comptes?: number; tenantIntrouvable?: boolean } = {}) {
  vi.resetModules();
  const ligneTenant = tenantIntrouvable
    ? []
    : [limite === undefined ? { id: "t1" } : { id: "t1", client_limit: limite }];
  fake = fakeAdmin({ profiles: nLignes(clients) }, { tenants: [ligneTenant, nLignes(comptes)] });
  mockAdminModule(fake);
  return import("./entitlements");
}

beforeEach(() => {
  vi.resetModules();
});

describe("capacité d'un coach", () => {
  it("compte ses clients, pas ses comptes enfants", async () => {
    const { tenantCapacity } = await lib({ limite: 10, clients: 3 });
    const cap = await tenantCapacity("t1");
    expect(cap.used).toBe(3);
    expect(cap.limit).toBe(10);
    expect(cap.remaining).toBe(7);
    expect(cap.full).toBe(false);
    // La lecture porte bien sur les profils du tenant, avec le rôle client.
    const q = fake.on("profiles")[0];
    expect(eqValue(q, "tenant_id")).toBe("t1");
    expect(eqValue(q, "role")).toBe("client");
  });

  it("se déclare pleine à égalité, pas seulement au-dessus", async () => {
    const { tenantCapacity } = await lib({ limite: 3, clients: 3 });
    expect((await tenantCapacity("t1")).full).toBe(true);
  });

  it("traite une limite absente comme illimitée", async () => {
    const { tenantCapacity } = await lib({ limite: null, clients: 42 });
    const cap = await tenantCapacity("t1");
    expect(cap.unlimited).toBe(true);
    expect(cap.full).toBe(false);
    expect(cap.remaining).toBeNull();
  });
});

describe("capacité d'un revendeur", () => {
  it("compte ses comptes enfants, pas ses clients en direct", async () => {
    // Le coeur du sujet : un revendeur n'a aucun profil client rattaché.
    // Compter les profils lui donnait « 0 » quoi qu'il arrive.
    const { accountCapacity } = await lib({ limite: 5, comptes: 2 });
    const cap = await accountCapacity("r1");
    expect(cap.used).toBe(2);
    const q = fake.on("tenants").find((x) => eqValue(x, "parent_id") !== undefined);
    expect(q).toBeDefined();
    expect(eqValue(q!, "parent_id")).toBe("r1");
    // Et surtout : aucune lecture des profils.
    expect(fake.on("profiles")).toHaveLength(0);
  });

  it("bloque à égalité", async () => {
    const { accountCapacity } = await lib({ limite: 1, comptes: 1 });
    expect((await accountCapacity("r1")).full).toBe(true);
  });

  it("laisse passer sans limite posée", async () => {
    const { accountCapacity } = await lib({ comptes: 9 });
    const cap = await accountCapacity("r1");
    expect(cap.unlimited).toBe(true);
    expect(cap.full).toBe(false);
  });
});

describe("capacité par slug de revendeur", () => {
  it("n'accepte qu'un tenant de type revendeur", async () => {
    // Sans ce filtre, le slug d'un coach passerait ici et sa limite en clients
    // servirait à plafonner des comptes : deux grandeurs sans rapport.
    const { accountCapacityForResellerSlug } = await lib({ limite: 3 });
    await accountCapacityForResellerSlug("mon-reseau");
    const q = fake.on("tenants")[0];
    expect(eqValue(q, "slug")).toBe("mon-reseau");
    expect(eqValue(q, "kind")).toBe("reseller");
  });

  it("rend null sur un slug inconnu, pour ne rien plafonner", async () => {
    const { accountCapacityForResellerSlug } = await lib({ tenantIntrouvable: true });
    expect(await accountCapacityForResellerSlug("inconnu")).toBeNull();
  });
});
