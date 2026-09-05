import { describe, it, expect } from "vitest";
import { safeLocalPath, safePushEndpoint } from "./safe-url";

describe("un chemin de retour reste dans le site", () => {
  it("accepte un chemin local, avec ou sans paramètres", () => {
    expect(safeLocalPath("/app", "/x")).toBe("/app");
    expect(safeLocalPath("/app/shop?onglet=2#haut", "/x")).toBe("/app/shop?onglet=2#haut");
    expect(safeLocalPath("/", "/x")).toBe("/");
  });

  it("refuse les adresses absolues, même déguisées", () => {
    expect(safeLocalPath("https://evil.com/app", "/x")).toBe("/x");
    expect(safeLocalPath("//evil.com/app", "/x")).toBe("/x");
    expect(safeLocalPath("/\\evil.com", "/x")).toBe("/x");
    expect(safeLocalPath("/https://evil.com", "/x")).toBe("/x");
    expect(safeLocalPath("javascript:alert(1)", "/x")).toBe("/x");
  });

  it("refuse ce qui n'est pas un chemin", () => {
    expect(safeLocalPath("", "/x")).toBe("/x");
    expect(safeLocalPath(null, "/x")).toBe("/x");
    expect(safeLocalPath("app", "/x")).toBe("/x");
    expect(safeLocalPath("/app\r\nSet-Cookie: a=b", "/x")).toBe("/x");
    expect(safeLocalPath("/" + "a".repeat(3000), "/x")).toBe("/x");
  });
});

describe("une adresse de service push", () => {
  it("accepte les services push des navigateurs", () => {
    expect(safePushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe("https://fcm.googleapis.com/fcm/send/abc");
    expect(safePushEndpoint("https://web.push.apple.com/QW9y")).toBe("https://web.push.apple.com/QW9y");
    expect(safePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBeTruthy();
  });

  it("refuse tout ce qui n'est pas un hôte public en HTTPS", () => {
    expect(safePushEndpoint("http://fcm.googleapis.com/x")).toBeNull();
    expect(safePushEndpoint("https://localhost/x")).toBeNull();
    expect(safePushEndpoint("https://10.0.0.5/x")).toBeNull();
    expect(safePushEndpoint("https://[::1]/x")).toBeNull();
    expect(safePushEndpoint("https://metadata.internal/x")).toBeNull();
    expect(safePushEndpoint("https://push/x")).toBeNull();
    expect(safePushEndpoint("https://user:pw@fcm.googleapis.com/x")).toBeNull();
    expect(safePushEndpoint("pas une url")).toBeNull();
    expect(safePushEndpoint(42)).toBeNull();
  });
});
