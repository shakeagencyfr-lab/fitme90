import "server-only";
import dns from "node:dns/promises";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugForWhitelabelHost } from "@/lib/whitelabel";

// Domaine personnalisé (marque blanche totale) : le coach branche son propre
// nom de domaine sur sa landing. Résolution par le proxy (racine du domaine
// étranger -> /c/<slug>), vérification DNS côté serveur, et rattachement au
// projet Vercel si un jeton est configuré (sinon, mode manuel : la plateforme
// ajoute le domaine dans Vercel une fois, les DNS du coach font le reste).

export const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";
export const VERCEL_APEX_IP = "76.76.21.21";

/**
 * Slug du coach servi par ce domaine personnalisé, ou null.
 *
 * Le domaine fait partie du pack marque blanche : un compte dont le pack s'est
 * fermé garde son domaine en base (il le retrouvera en revenant), mais le
 * domaine cesse de répondre. C'est la vérification du pack, pas la présence
 * de la ligne, qui ouvre la porte.
 */
export async function slugForCustomHost(host: string): Promise<string | null> {
  const domain = host.split(":")[0].trim().toLowerCase().replace(/\.$/, "");
  if (!domain) return null;
  return slugForWhitelabelHost(domain);
}

/** Normalise une saisie (URL, majuscules, espaces) en nom d'hôte, ou null si invalide. */
export function normalizeDomain(raw: string): string | null {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (d.startsWith("www.")) d = d.slice(4);
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d)) return null;
  return d;
}

/** Le domaine est-il celui de la plateforme (ou un de ses sous-domaines) ? */
export function isPlatformDomain(domain: string): boolean {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "").toLowerCase();
  return [root, site].filter(Boolean).some((h) => domain === h || domain.endsWith(`.${h}`));
}

/** Apex (coaching-tonnom.com) ou sous-domaine (app.coaching-tonnom.com) ? */
export function isApex(domain: string): boolean {
  return domain.split(".").length === 2;
}

export type DnsState = "ok" | "pending" | "unknown";

export interface DnsStatus {
  state: DnsState;
  /** Ce que le DNS renvoie aujourd'hui (pour aider le coach à corriger). */
  found: string | null;
  /** Enregistrement attendu, formulé pour la zone DNS du coach. */
  expected: { type: "CNAME" | "A"; name: string; value: string };
}

/** Interroge le DNS public : le domaine pointe-t-il déjà vers la plateforme ? */
export async function dnsStatus(domain: string): Promise<DnsStatus> {
  const apex = isApex(domain);
  const expected = apex
    ? { type: "A" as const, name: "@", value: VERCEL_APEX_IP }
    : { type: "CNAME" as const, name: domain.split(".")[0], value: VERCEL_CNAME_TARGET };
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase();
  try {
    const cnames = await dns.resolveCname(domain).catch(() => [] as string[]);
    if (cnames.length) {
      const hit = cnames.find((c) => c.endsWith("vercel-dns.com") || (root && c.endsWith(root)));
      return { state: hit ? "ok" : "pending", found: cnames.join(", "), expected };
    }
    const a = await dns.resolve4(domain).catch(() => [] as string[]);
    if (a.length) {
      return { state: a.includes(VERCEL_APEX_IP) ? "ok" : "pending", found: a.join(", "), expected };
    }
    return { state: "pending", found: null, expected };
  } catch {
    return { state: "unknown", found: null, expected };
  }
}

// ---------------------------------------------------------------- Vercel API
// Optionnel : avec VERCEL_TOKEN (+ VERCEL_PROJECT_ID, VERCEL_TEAM_ID), le domaine
// est ajouté au projet automatiquement et le certificat TLS est émis par Vercel.

function vercelEnv() {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return null;
  return { token, project, team };
}

export function vercelAutomationReady(): boolean {
  return vercelEnv() != null;
}

export interface VercelDomainStatus {
  attached: boolean;
  verified: boolean;
  /** Pour les domaines non vérifiés : enregistrement TXT demandé par Vercel. */
  verification?: { type: string; domain: string; value: string }[];
  error?: string;
}

async function vercelFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const env = vercelEnv();
  if (!env) return null;
  const url = new URL(`https://api.vercel.com${path}`);
  if (env.team) url.searchParams.set("teamId", env.team);
  return fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${env.token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}

/** Ajoute le domaine au projet Vercel (idempotent). */
export async function vercelAttachDomain(domain: string): Promise<VercelDomainStatus> {
  const env = vercelEnv();
  if (!env) return { attached: false, verified: false, error: "automation_off" };
  const res = await vercelFetch(`/v10/projects/${env.project}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (!res) return { attached: false, verified: false, error: "automation_off" };
  const body = (await res.json().catch(() => ({}))) as {
    verified?: boolean;
    verification?: { type: string; domain: string; value: string }[];
    error?: { code?: string; message?: string };
  };
  if (res.ok || body.error?.code === "domain_already_in_use_by_project") {
    return { attached: true, verified: !!body.verified, verification: body.verification };
  }
  return { attached: false, verified: false, error: body.error?.message ?? `vercel_${res.status}` };
}

/** État du domaine côté Vercel (rattaché ? vérifié ?). */
export async function vercelDomainStatus(domain: string): Promise<VercelDomainStatus | null> {
  const env = vercelEnv();
  if (!env) return null;
  const res = await vercelFetch(`/v9/projects/${env.project}/domains/${encodeURIComponent(domain)}`);
  if (!res) return null;
  if (res.status === 404) return { attached: false, verified: false };
  const body = (await res.json().catch(() => ({}))) as { verified?: boolean; verification?: { type: string; domain: string; value: string }[] };
  return { attached: res.ok, verified: !!body.verified, verification: body.verification };
}

/** Retire le domaine du projet Vercel (silencieux si absent ou automatisation coupée). */
export async function vercelDetachDomain(domain: string): Promise<void> {
  const env = vercelEnv();
  if (!env) return;
  await vercelFetch(`/v9/projects/${env.project}/domains/${encodeURIComponent(domain)}`, { method: "DELETE" }).catch(() => null);
}

// ---------------------------------------------------------------- Base

export interface CustomDomainInfo {
  domain: string | null;
  dns: DnsStatus | null;
  vercel: VercelDomainStatus | null;
  automation: boolean;
}

/** Tout ce que la carte « Domaine personnalisé » affiche pour un tenant. */
export async function customDomainInfo(domain: string | null): Promise<CustomDomainInfo> {
  const automation = vercelAutomationReady();
  if (!domain) return { domain: null, dns: null, vercel: null, automation };
  const [dnsRes, vercel] = await Promise.all([dnsStatus(domain), automation ? vercelDomainStatus(domain) : Promise.resolve(null)]);
  return { domain, dns: dnsRes, vercel, automation };
}

/** Enregistre (ou retire) le domaine d'un tenant. Renvoie une erreur lisible. */
export async function setTenantCustomDomain(tenantId: string, raw: string): Promise<{ ok: boolean; error?: string; domain?: string | null }> {
  const admin = createAdminClient();
  if (!raw.trim()) {
    const { data: cur } = await admin.from("tenants").select("custom_domain").eq("id", tenantId).maybeSingle<{ custom_domain: string | null }>();
    await admin.from("tenants").update({ custom_domain: null }).eq("id", tenantId);
    if (cur?.custom_domain) await vercelDetachDomain(cur.custom_domain);
    return { ok: true, domain: null };
  }
  const domain = normalizeDomain(raw);
  if (!domain) return { ok: false, error: "Nom de domaine invalide (ex : coaching-tonnom.com)." };
  if (isPlatformDomain(domain)) return { ok: false, error: "Ce domaine appartient à la plateforme. Utilise l'adresse personnalisée ci-dessus." };
  const { data: taken } = await admin
    .from("tenants")
    .select("id")
    .eq("custom_domain", domain)
    .neq("id", tenantId)
    .maybeSingle<{ id: string }>();
  if (taken) return { ok: false, error: "Ce domaine est déjà utilisé par un autre compte." };
  const { error } = await admin.from("tenants").update({ custom_domain: domain }).eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  if (vercelAutomationReady()) {
    const v = await vercelAttachDomain(domain);
    if (!v.attached && v.error && v.error !== "automation_off") {
      return { ok: true, domain, error: `Domaine enregistré, mais Vercel a refusé le rattachement : ${v.error}` };
    }
  }
  return { ok: true, domain };
}
