import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — get current user's display_name
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: stats } = await supabase
    .from("user_stats")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    display_name: stats?.display_name || "",
    email: user.email || "",
  });
}

// POST — update display_name
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json();
  const displayName = (body.display_name || "").trim().substring(0, 30);

  if (!displayName) {
    return NextResponse.json({ error: "Nome non valido" }, { status: 400 });
  }

  // Upsert: create stats row if it doesn't exist
  const { data: existing } = await supabase
    .from("user_stats")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_stats")
      .update({ display_name: displayName })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("user_stats")
      .insert({ user_id: user.id, display_name: displayName });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, display_name: displayName });
}
