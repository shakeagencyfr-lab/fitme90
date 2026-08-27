import { NextResponse } from "next/server";
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
