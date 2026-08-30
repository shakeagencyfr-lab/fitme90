import { redirect } from "next/navigation";

// Le chat VIP est désormais intégré directement dans la fiche du client (pour que
// le coach garde toutes ses infos sous les yeux). On redirige les anciens liens
// (notifications push, favoris) vers la section « Chat VIP » de la fiche.
export default async function AdminChatThreadRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clients/${id}#chat-vip`);
}
