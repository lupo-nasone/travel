import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Lista partecipanti di un viaggio
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getSupabase();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const { id: tripId } = await params;

  try {
    const { data: participants, error } = await supabase
      .from("trip_participants")
      .select("*")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: false });

    if (error) throw error;

    // Arricchisci con dati utente
    const enrichedParticipants = await Promise.all(
      participants.map(async (participant) => {
        const { data: userData } = await supabase.auth.admin.getUserById(participant.user_id);
        
        return {
          ...participant,
          user: {
            id: participant.user_id,
            email: userData?.user?.email || "",
            display_name: userData?.user?.user_metadata?.display_name || 
                          userData?.user?.email?.split("@")[0] || "Utente",
            avatar_url: userData?.user?.user_metadata?.avatar_url || null,
          },
        };
      })
    );

    return NextResponse.json({ participants: enrichedParticipants });
  } catch (error: any) {
    console.error("Errore GET participants:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Invita utente al viaggio
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getSupabase();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const { id: tripId } = await params;

  try {
    const body = await req.json();
    const { friend_id, role = "viewer" } = body;

    if (!friend_id) {
      return NextResponse.json({ error: "friend_id richiesto" }, { status: 400 });
    }

    // Verifica che l'utente sia owner/editor del viaggio
    const { data: userParticipation } = await supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (!userParticipation || !["owner", "editor"].includes(userParticipation.role)) {
      return NextResponse.json({ error: "Non hai i permessi" }, { status: 403 });
    }

    // Verifica che non sia già partecipante
    const { data: existing } = await supabase
      .from("trip_participants")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", friend_id)
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Già partecipante" }, { status: 400 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Invito già inviato" }, { status: 400 });
      }
    }

    // Crea invito
    const { data: participant, error } = await supabase
      .from("trip_participants")
      .insert({
        trip_id: tripId,
        user_id: friend_id,
        role,
        status: "pending",
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      participant,
      message: "Invito inviato" 
    });
  } catch (error: any) {
    console.error("Errore POST participant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Accetta/rifiuta invito (usato dall'invitato)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getSupabase();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const { id: tripId } = await params;

  try {
    const body = await req.json();
    const { action } = body; // 'accept' or 'decline'

    if (!action) {
      return NextResponse.json({ error: "action richiesta" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    const joinedAt = action === "accept" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("trip_participants")
      .update({ 
        status: newStatus,
        joined_at: joinedAt 
      })
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ 
      message: action === "accept" ? "Invito accettato" : "Invito rifiutato" 
    });
  } catch (error: any) {
    console.error("Errore PUT participant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Rimuovi partecipante
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const supabase = getSupabase();
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Token invalido" }, { status: 401 });
  }

  const { id: tripId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id richiesto" }, { status: 400 });
  }

  try {
    // Verifica permessi (owner o l'utente stesso)
    const { data: userParticipation } = await supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    const isOwner = userParticipation?.role === "owner";
    const isSelf = userId === user.id;

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: "Non hai i permessi" }, { status: 403 });
    }

    const { error } = await supabase
      .from("trip_participants")
      .delete()
      .eq("trip_id", tripId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ message: "Partecipante rimosso" });
  } catch (error: any) {
    console.error("Errore DELETE participant:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
