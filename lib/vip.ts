import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPushToUsers } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { addCoachNotification } from "@/lib/notifications";

// Chat VIP : un fil de discussion par client (client_id), entre le client et son
// coach. Texte et/ou images uniquement. Disponible seulement si l'offre achetée
// par le client a l'option `vip_chat`. Tout l'accès passe par le service_role
// avec contrôles applicatifs (la table vip_messages a RLS sans policy).

export type VipSender = "client" | "coach";

export interface VipMessage {
  id: string;
  sender: VipSender;
  body: string | null;
  image_url: string | null;
  created_at: string;
}

const MSG_COLS = "id, sender, body, image_url, created_at";

export interface ClientVipContext {
  enabled: boolean;
  tenantId: string | null;
  name: string;
  email: string | null;
}

/**
 * Le client a-t-il accès au Chat VIP ? Oui si l'offre qu'il a achetée porte
 * l'option vip_chat. Retourne aussi le tenant et l'identité (pour les notifs).
 */
export async function clientVipContext(userId: string): Promise<ClientVipContext> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, name, email, selected_offer_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; name: string | null; email: string | null; selected_offer_id: string | null }>();

  const base = {
    tenantId: profile?.tenant_id ?? null,
    name: profile?.name || profile?.email || "Client",
    email: profile?.email ?? null,
  };
  if (!profile?.selected_offer_id) return { enabled: false, ...base };

  const { data: offer } = await admin
    .from("offers")
    .select("vip_chat")
    .eq("id", profile.selected_offer_id)
    .maybeSingle<{ vip_chat: boolean }>();

  return { enabled: !!offer?.vip_chat, ...base };
}

const VIP_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const VIP_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo (images uniquement, pas de vidéo)

function vipExt(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("jpeg")) return "jpg";
  return "webp";
}

export interface UploadVipImageResult {
  url?: string;
  error?: string;
}

/**
 * Téléverse une image du chat VIP (bucket public `vip-chat`, chemin en UUID).
 * Refuse tout ce qui n'est pas une image (pas de vidéo / fichier lourd).
 */
export async function uploadVipImage(clientId: string, file: File): Promise<UploadVipImageResult> {
  if (!file || file.size === 0) return { error: "Aucun fichier." };
  if (!VIP_IMAGE_TYPES.has(file.type)) return { error: "Images uniquement (JPG, PNG ou WEBP)." };
  if (file.size > VIP_IMAGE_MAX_BYTES) return { error: "Image trop lourde (5 Mo max)." };

  const admin = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${clientId}/${crypto.randomUUID()}.${vipExt(file.type)}`;
  const { error } = await admin.storage
    .from("vip-chat")
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) return { error: "Téléversement impossible." };
  return { url: admin.storage.from("vip-chat").getPublicUrl(path).data.publicUrl };
}

/** Messages d'un fil, du plus ancien au plus récent. */
export async function listVipMessages(clientId: string): Promise<VipMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vip_messages")
    .select(MSG_COLS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .returns<VipMessage[]>();
  return data ?? [];
}

/** Nombre de messages du coach non lus par le client (badge onglet Chat VIP). */
export async function clientUnreadVipCount(clientId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("vip_messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("sender", "coach")
    .eq("read_by_client", false);
  return count ?? 0;
}

/** Marque comme lus les messages reçus par `reader` dans un fil. */
export async function markThreadRead(clientId: string, reader: VipSender): Promise<void> {
  const admin = createAdminClient();
  const other: VipSender = reader === "coach" ? "client" : "coach";
  const col = reader === "coach" ? "read_by_coach" : "read_by_client";
  await admin
    .from("vip_messages")
    .update({ [col]: true })
    .eq("client_id", clientId)
    .eq("sender", other)
    .eq(col, false);
}

export interface PostVipInput {
  tenantId: string | null;
  clientId: string;
  sender: VipSender;
  body: string | null;
  imageUrl: string | null;
}

/** Enregistre un message et retourne son id, ou null en cas d'échec. */
export async function insertVipMessage(input: PostVipInput): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vip_messages")
    .insert({
      tenant_id: input.tenantId,
      client_id: input.clientId,
      sender: input.sender,
      body: input.body,
      image_url: input.imageUrl,
      read_by_coach: input.sender === "coach",
      read_by_client: input.sender === "client",
    })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return null;
  return data?.id ?? null;
}

export interface VipThread {
  clientId: string;
  name: string;
  email: string | null;
  lastBody: string | null;
  lastImage: boolean;
  lastAt: string | null;
  lastSender: VipSender | null;
  unread: number; // messages du client non lus par le coach
}

/**
 * Fils VIP d'un tenant, pour le dashboard coach. Inclut tout client dont l'offre
 * porte l'option vip_chat (même sans message encore), trié par activité récente.
 */
export async function listCoachVipThreads(tenantId: string): Promise<VipThread[]> {
  const admin = createAdminClient();

  // 1) Offres VIP du tenant.
  const { data: vipOffers } = await admin
    .from("offers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("vip_chat", true)
    .returns<{ id: string }[]>();
  const vipOfferIds = (vipOffers ?? []).map((o) => o.id);

  // 2) Clients rattachés à ces offres.
  const clients = new Map<string, { name: string; email: string | null }>();
  if (vipOfferIds.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .in("selected_offer_id", vipOfferIds)
      .returns<{ id: string; name: string | null; email: string | null }[]>();
    for (const p of profs ?? []) {
      clients.set(p.id, { name: p.name || p.email || "Client", email: p.email });
    }
  }

  // 3) Messages du tenant (récents d'abord) → dernier message + non-lus.
  const { data: msgs } = await admin
    .from("vip_messages")
    .select("client_id, sender, body, image_url, created_at, read_by_coach")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<{ client_id: string; sender: VipSender; body: string | null; image_url: string | null; created_at: string; read_by_coach: boolean }[]>();

  const threads = new Map<string, VipThread>();
  for (const [clientId, info] of clients) {
    threads.set(clientId, {
      clientId,
      name: info.name,
      email: info.email,
      lastBody: null,
      lastImage: false,
      lastAt: null,
      lastSender: null,
      unread: 0,
    });
  }

  for (const m of msgs ?? []) {
    let t = threads.get(m.client_id);
    if (!t) {
      // Client avec messages mais dont l'offre a changé : on l'affiche quand même.
      const info = clients.get(m.client_id);
      t = {
        clientId: m.client_id,
        name: info?.name ?? "Client",
        email: info?.email ?? null,
        lastBody: null,
        lastImage: false,
        lastAt: null,
        lastSender: null,
        unread: 0,
      };
      threads.set(m.client_id, t);
    }
    if (t.lastAt === null) {
      t.lastAt = m.created_at;
      t.lastBody = m.body;
      t.lastImage = !!m.image_url;
      t.lastSender = m.sender;
    }
    if (m.sender === "client" && !m.read_by_coach) t.unread += 1;
  }

  // Résoudre les noms manquants (clients hors offre VIP courante).
  const missing = [...threads.values()].filter((t) => !clients.has(t.clientId)).map((t) => t.clientId);
  if (missing.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", missing)
      .returns<{ id: string; name: string | null; email: string | null }[]>();
    for (const p of profs ?? []) {
      const t = threads.get(p.id);
      if (t) {
        t.name = p.name || p.email || "Client";
        t.email = p.email;
      }
    }
  }

  return [...threads.values()].sort((a, b) => {
    // Non-lus d'abord, puis activité récente, puis nom.
    if (a.unread !== b.unread) return b.unread - a.unread;
    if (a.lastAt && b.lastAt) return a.lastAt < b.lastAt ? 1 : -1;
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Vérifie qu'un client appartient bien au tenant (garde-fou coach). */
export async function clientBelongsToTenant(clientId: string, tenantId: string): Promise<{ name: string; email: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("name, email, tenant_id")
    .eq("id", clientId)
    .maybeSingle<{ name: string | null; email: string | null; tenant_id: string | null }>();
  if (!data || data.tenant_id !== tenantId) return null;
  return { name: data.name || data.email || "Client", email: data.email };
}

/** Emails de notification du coach pour un tenant. */
export async function tenantNotifyEmails(tenantId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("notify_emails")
    .eq("id", tenantId)
    .maybeSingle<{ notify_emails: string[] | null }>();
  return data?.notify_emails ?? [];
}

export async function setTenantNotifyEmails(tenantId: string, emails: string[]): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ notify_emails: emails }).eq("id", tenantId);
}

/** Ids des comptes coach/owner d'un tenant (pour le push ciblé). */
async function tenantCoachUserIds(tenantId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", ["owner", "coach"])
    .returns<{ id: string }[]>();
  return (data ?? []).map((r) => r.id);
}

/**
 * Notifie l'autre partie d'un nouveau message.
 * - message client → coach : push aux comptes coach + e-mails configurés.
 * - message coach → client : push au client.
 * Best-effort : n'interrompt jamais le flux (aucune exception propagée).
 */
export async function notifyNewVipMessage(opts: {
  tenantId: string | null;
  clientId: string;
  sender: VipSender;
  clientName: string;
  preview: string;
}): Promise<void> {
  try {
    if (opts.sender === "client") {
      const tasks: Promise<unknown>[] = [];
      if (opts.tenantId) {
        // Cloche du dashboard coach (fil in-app, en plus du push/e-mail).
        tasks.push(
          addCoachNotification({
            tenantId: opts.tenantId,
            type: "vip_message",
            title: `${opts.clientName} vous a envoyé un message`,
            body: opts.preview,
            url: `/admin/clients/${opts.clientId}#chat-vip`,
            clientId: opts.clientId,
          }),
        );
        const coachIds = await tenantCoachUserIds(opts.tenantId);
        if (coachIds.length) {
          tasks.push(
            broadcastPushToUsers(coachIds, {
              title: `Message VIP de ${opts.clientName}`,
              body: opts.preview,
              url: `/admin/clients/${opts.clientId}#chat-vip`,
              tag: `vip-${opts.clientId}`,
            }),
          );
        }
        const emails = await tenantNotifyEmails(opts.tenantId);
        if (emails.length) {
          tasks.push(
            sendEmail({
              to: emails,
              subject: `Nouveau message VIP de ${opts.clientName}`,
              text: `${opts.clientName} t'a écrit dans le Chat VIP :\n\n« ${opts.preview} »\n\nRéponds depuis ton dashboard.`,
            }),
          );
        }
      }
      await Promise.allSettled(tasks);
    } else {
      await broadcastPushToUsers([opts.clientId], {
        title: "Message de ton coach",
        body: opts.preview,
        url: "/app/chat",
        tag: "vip-coach",
      });
    }
  } catch {
    // notifications best-effort
  }
}
