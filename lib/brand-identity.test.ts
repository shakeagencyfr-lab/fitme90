import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, type FakeAdmin } from "@/test/fake-supabase";

/**
 * Identité écrite et thème de marque.
 *
 * Ces valeurs sont saisies par un coach et servies à SES clients : les liens
 * partent dans des attributs `href`, les couleurs dans des variables CSS.
 * Un coach malveillant, ou simplement un compte volé, ne doit pas pouvoir s'en
 * servir pour exécuter quoi que ce soit chez ses clients. Les tests portent
 * donc d'abord sur ce qui est refusé, et sur ce qui atteint réellement la base.
 */

const TENANT = "11111111-1111-1111-1111-111111111111";

let fake: FakeAdmin;

beforeEach(() => {
  vi.resetModules();
  fake = fakeAdmin({ tenants: [] });
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
});

const IDENTITY = {
  appName: "", legalName: "", supportEmail: "",
  termsUrl: "", privacyUrl: "", seoTitle: "", seoDescription: "",
};

async function save(patch: Partial<typeof IDENTITY>) {
  const { saveTenantIdentity } = await import("@/lib/branding");
  const res = await saveTenantIdentity(TENANT, { ...IDENTITY, ...patch });
  const write = fake.on("tenants").find((q) => q.filters.some((x) => x.op === "update"));
  const payload = write?.filters.find((x) => x.op === "update")?.value as Record<string, unknown> | undefined;
  return { res, payload, write };
}

describe("liens légaux", () => {
  it("refuse tout ce qui n'est pas http(s), et n'écrit rien", async () => {
    for (const mauvais of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "ftp://x.fr", "pas une url"]) {
      const { res, write } = await save({ termsUrl: mauvais });
      expect(res.ok, mauvais).toBe(false);
      // Un refus ne doit pas enregistrer les AUTRES champs au passage.
      expect(write, mauvais).toBeUndefined();
      vi.resetModules();
      fake = fakeAdmin({ tenants: [] });
      vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
    }
  });

  it("accepte une adresse https et l'enregistre", async () => {
    const { res, payload } = await save({ termsUrl: "https://coach.fr/cgu", privacyUrl: "https://coach.fr/vie-privee" });
    expect(res.ok).toBe(true);
    expect(payload?.terms_url).toBe("https://coach.fr/cgu");
    expect(payload?.privacy_url).toBe("https://coach.fr/vie-privee");
  });

  it("efface le lien quand le champ est vidé", async () => {
    const { res, payload } = await save({ termsUrl: "   " });
    expect(res.ok).toBe(true);
    expect(payload?.terms_url).toBeNull();
  });
});

describe("adresse de support", () => {
  it("refuse une adresse qui n'en est pas une", async () => {
    for (const mauvais of ["pas-une-adresse", "a@b", "a b@c.fr", "a@c.fr, b@d.fr", "<a@c.fr>"]) {
      const { res } = await save({ supportEmail: mauvais });
      expect(res.ok, mauvais).toBe(false);
      vi.resetModules();
      fake = fakeAdmin({ tenants: [] });
      vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
    }
  });

  it("normalise en minuscules", async () => {
    const { payload } = await save({ supportEmail: "  Contact@Coach.FR " });
    expect(payload?.support_email).toBe("contact@coach.fr");
  });
});

describe("textes de marque", () => {
  it("tronque plutôt que de refuser, et vide devient null", async () => {
    const { res, payload } = await save({ appName: "x".repeat(200), legalName: "  " });
    expect(res.ok).toBe(true);
    expect((payload?.app_name as string).length).toBe(60);
    expect(payload?.legal_name).toBeNull();
  });
});

describe("enregistrement du thème", () => {
  it("écrit un thème nettoyé, jamais l'entrée brute", async () => {
    const { saveTenantTheme } = await import("@/lib/branding");
    await saveTenantTheme(TENANT, { primary: "#0891b2", headingFont: "../../etc", inconnu: "<script>" });
    const write = fake.on("tenants").find((q) => q.filters.some((x) => x.op === "update"));
    const payload = write?.filters.find((x) => x.op === "update")?.value as Record<string, unknown>;
    const theme = payload.theme as Record<string, unknown>;
    expect(theme.primary).toBe("#0891b2");
    expect(theme.headingFont).toBe("archivo");
    expect(theme).not.toHaveProperty("inconnu");
  });

  it("recopie la couleur principale dans brand_color", async () => {
    // Le manifest PWA, les e-mails et plusieurs pages lisent cette colonne sans
    // rien savoir du thème. Si elle ne suivait pas, elles afficheraient encore
    // l'ancienne couleur longtemps après le changement.
    const { saveTenantTheme } = await import("@/lib/branding");
    await saveTenantTheme(TENANT, { primary: "#e0457b" });
    const write = fake.on("tenants").find((q) => q.filters.some((x) => x.op === "update"));
    const payload = write?.filters.find((x) => x.op === "update")?.value as Record<string, unknown>;
    expect(payload.brand_color).toBe("#e0457b");
  });

  it("cible bien le tenant demandé", async () => {
    const { saveTenantTheme } = await import("@/lib/branding");
    await saveTenantTheme(TENANT, {});
    const write = fake.on("tenants").find((q) => q.filters.some((x) => x.op === "update"));
    expect(write?.filters.some((x) => x.op === "eq" && x.column === "id" && x.value === TENANT)).toBe(true);
  });
});

describe("images de marque", () => {
  it("refuse un JPG comme favicon ou icône d'application", async () => {
    // Ces deux images sont découpées en rond sur un écran d'accueil : sans
    // canal alpha, le JPG y laisse un carré blanc.
    const { uploadTenantAsset } = await import("@/lib/branding");
    const jpg = new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" });
    expect((await uploadTenantAsset(TENANT, "favicon", jpg)).ok).toBe(false);
    expect((await uploadTenantAsset(TENANT, "app-icon", jpg)).ok).toBe(false);
  });

  it("refuse un format qui n'est pas une image", async () => {
    const { uploadTenantAsset } = await import("@/lib/branding");
    const html = new File([new Uint8Array([1])], "x.html", { type: "text/html" });
    expect((await uploadTenantAsset(TENANT, "logo", html)).ok).toBe(false);
  });
});
