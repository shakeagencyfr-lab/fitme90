"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/guard";
import {
  clientVipContext,
  insertVipMessage,
  uploadVipImage,
  markThreadRead,
  notifyNewVipMessage,
} from "@/lib/vip";

export interface ChatState {
  ok?: boolean;
  error?: string;
}

/** Le client envoie un message VIP (texte et/ou image) à son coach. */
export async function sendClientVipMessage(_prev: ChatState, formData: FormData): Promise<ChatState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Session expirée." };

  const vip = await clientVipContext(ctx.userId);
  if (!vip.enabled) return { error: "Chat VIP non disponible sur ton offre." };

  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const file = formData.get("image");
  let imageUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    const up = await uploadVipImage(ctx.userId, file);
    if (up.error) return { error: up.error };
    imageUrl = up.url ?? null;
  }

  if (!body && !imageUrl) return { error: "Écris un message ou ajoute une image." };

  const id = await insertVipMessage({
    tenantId: vip.tenantId,
    clientId: ctx.userId,
    sender: "client",
    body: body || null,
    imageUrl,
  });
  if (!id) return { error: "Envoi impossible." };

  // Le client lit son propre fil au passage.
  await markThreadRead(ctx.userId, "client");
  await notifyNewVipMessage({
    tenantId: vip.tenantId,
    clientId: ctx.userId,
    sender: "client",
    clientName: vip.name,
    preview: body || "📷 Photo",
  });

  revalidatePath("/app/chat");
  // Rafraîchit le badge de non-lus (rendu dans le layout /app).
  revalidatePath("/app", "layout");
  return { ok: true };
}

/**
 * Marque le fil du client comme lu (à l'ouverture de la page) et rafraîchit le
 * badge de non-lus du layout. Appelé côté client au montage : le layout partagé
 * n'étant pas re-rendu à la navigation, c'est ce qui fait disparaître la pastille.
 */
export async function markClientVipRead(): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;
  await markThreadRead(ctx.userId, "client");
  revalidatePath("/app", "layout");
}
