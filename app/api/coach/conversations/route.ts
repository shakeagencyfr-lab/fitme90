import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export const runtime = "nodejs";

// Liste des conversations du client (plus récentes d'abord).
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_conversations")
    .select("id, title, updated_at")
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ conversations: data ?? [] });
}

// Crée une nouvelle conversation vide (le titre sera déduit du premier message).
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_conversations")
    .insert({ user_id: ctx.userId, title: "Nouvelle conversation" })
    .select("id, title, updated_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  return NextResponse.json({ conversation: data });
}

// Renomme une conversation (organisation des fils).
const patchSchema = z.object({ id: z.string().uuid(), title: z.string().min(1).max(80) });
export async function PATCH(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase
    .from("coach_conversations")
    .update({ title: body.title.trim() })
    .eq("id", body.id)
    .eq("user_id", ctx.userId);
  return NextResponse.json({ ok: true });
}

// Supprime une conversation (les messages sont supprimés en cascade).
const delSchema = z.object({ id: z.string().uuid() });
export async function DELETE(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let body: z.infer<typeof delSchema>;
  try {
    body = delSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase.from("coach_conversations").delete().eq("id", body.id).eq("user_id", ctx.userId);
  return NextResponse.json({ ok: true });
}
