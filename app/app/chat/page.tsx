import { redirect } from "next/navigation";
import { getT, userLocale } from "@/lib/i18n/server";
import { getSessionContext } from "@/lib/guard";
import { clientVipContext, listVipMessages, markThreadRead } from "@/lib/vip";
import { VipChat } from "@/components/vip-chat";
import { VipReadOnMount } from "@/components/vip-read-on-mount";
import { NotificationSetting } from "@/components/notification-setting";

export const metadata = { title: "Chat VIP" };
export const dynamic = "force-dynamic";

export default async function ClientChatPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/chat");

  const vip = await clientVipContext(ctx.userId);
  if (!vip.enabled) redirect("/app");

  const messages = await listVipMessages(ctx.userId);
  // Marque comme lus les messages du coach à l'ouverture.
  await markThreadRead(ctx.userId, "client");
  const { t } = await getT(await userLocale(ctx.userId));

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {/* Efface la pastille de non-lus dans le layout après lecture. */}
      <VipReadOnMount />
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[clamp(24px,5vw,32px)] leading-[1.05] tracking-[-0.03em] text-ink">{t("chat.title")}</h1>
        <p className="text-[14px] text-muted">
          {t("chat.intro")}
        </p>
      </div>

      <VipChat
        messages={messages}
        me="client"
        emptyHint={t("chat.empty")}
      />

      {/* Active le push pour être prévenu dès que le coach répond. */}
      <NotificationSetting />
    </div>
  );
}
