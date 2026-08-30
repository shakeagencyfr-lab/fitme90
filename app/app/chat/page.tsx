import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { clientVipContext, listVipMessages, markThreadRead } from "@/lib/vip";
import { VipChat } from "@/components/vip-chat";

export const metadata = { title: "Chat VIP, FitMe90" };
export const dynamic = "force-dynamic";

export default async function ClientChatPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/chat");

  const vip = await clientVipContext(ctx.userId);
  if (!vip.enabled) redirect("/app");

  const messages = await listVipMessages(ctx.userId);
  // Marque comme lus les messages du coach à l'ouverture.
  await markThreadRead(ctx.userId, "client");

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,32px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Chat VIP
        </h1>
        <p className="text-[14px] text-muted">
          Une ligne directe avec ton coach. Pose tes questions, envoie des photos de tes repas ou de tes séances.
        </p>
      </div>

      <VipChat
        messages={messages}
        me="client"
        emptyHint="Aucun message pour l'instant. Écris à ton coach, il te répondra ici."
      />
    </div>
  );
}
