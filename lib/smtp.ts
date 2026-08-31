import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { whitelabelEnabled } from "@/lib/whitelabel";
import type { EmailMessage } from "@/lib/email";

// SMTP perso du coach (BYO) : les e-mails partent de SON serveur, sous SA marque.
// Réservé aux comptes ayant débloqué la marque blanche. Mot de passe chiffré au
// repos (tenant_secrets, service_role). Envoi via nodemailer (runtime Node).

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SmtpStatus {
  configured: boolean;
  host: string | null;
  from: string | null;
}

/** Config SMTP déchiffrée d'un tenant, ou null si incomplète. */
export async function getTenantSmtp(tenantId: string): Promise<SmtpConfig | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("tenant_id", tenantId)
    .maybeSingle<{
      smtp_host: string | null;
      smtp_port: number | null;
      smtp_user: string | null;
      smtp_pass_enc: string | null;
      smtp_from: string | null;
    }>();
  if (!data?.smtp_host || !data?.smtp_user || !data?.smtp_pass_enc) return null;
  const pass = decryptSecret(data.smtp_pass_enc);
  if (!pass) return null;
  return {
    host: data.smtp_host,
    port: data.smtp_port ?? 587,
    user: data.smtp_user,
    pass,
    from: data.smtp_from || data.smtp_user,
  };
}

/** État affichable (sans secret) de la config SMTP d'un tenant. */
export async function tenantSmtpStatus(tenantId: string): Promise<SmtpStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("smtp_host, smtp_from, smtp_pass_enc")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ smtp_host: string | null; smtp_from: string | null; smtp_pass_enc: string | null }>();
  return {
    configured: !!(data?.smtp_host && data?.smtp_pass_enc),
    host: data?.smtp_host ?? null,
    from: data?.smtp_from ?? null,
  };
}

/** Enregistre (mot de passe chiffré) la config SMTP d'un tenant. */
export async function setTenantSmtp(
  tenantId: string,
  input: { host: string; port: number; user: string; pass: string; from: string },
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenant_secrets").upsert({
    tenant_id: tenantId,
    smtp_host: input.host.trim(),
    smtp_port: input.port,
    smtp_user: input.user.trim(),
    smtp_pass_enc: encryptSecret(input.pass.trim()),
    smtp_from: input.from.trim(),
    updated_at: new Date().toISOString(),
  });
}

/** Supprime la config SMTP d'un tenant (retour à l'envoi par défaut). */
export async function clearTenantSmtp(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("tenant_secrets")
    .update({ smtp_host: null, smtp_port: null, smtp_user: null, smtp_pass_enc: null, smtp_from: null, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
}

function transport(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465, // 465 = TLS implicite ; 587 = STARTTLS
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/** Envoie un e-mail via un SMTP donné. Ne jette pas : renvoie false en cas d'échec. */
export async function sendViaSmtp(cfg: SmtpConfig, msg: EmailMessage): Promise<boolean> {
  const to = msg.to.map((e) => e.trim()).filter(Boolean);
  if (to.length === 0) return false;
  try {
    await transport(cfg).sendMail({
      from: cfg.from,
      to: to.join(", "),
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

/** Teste une config SMTP (connexion + auth) sans envoyer d'e-mail. */
export async function testSmtp(cfg: SmtpConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    await transport(cfg).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : "Connexion refusée").slice(0, 200) };
  }
}

/**
 * SMTP effectif d'un tenant pour l'envoi : uniquement si la marque blanche est
 * débloquée ET la config présente. Sinon null (l'appelant retombe sur Resend).
 */
export async function activeTenantSmtp(tenantId: string | null): Promise<SmtpConfig | null> {
  if (!tenantId) return null;
  if (!(await whitelabelEnabled(tenantId))) return null;
  return getTenantSmtp(tenantId);
}
