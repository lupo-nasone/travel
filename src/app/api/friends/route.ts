import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Lista amici e richieste
export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // 'accepted', 'pending', 'all'

  try {
    let query = supabase
      .from("friendships")
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: friendships, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // Arricchisci con dati utente
    const enrichedFriendships = await Promise.all(
      friendships.map(async (friendship) => {
        const otherUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
        const isSender = friendship.user_id === user.id;

        // Ottieni profilo utente
        const { data: userData } = await supabase.auth.admin.getUserById(otherUserId);

        return {
          ...friendship,
          is_sender: isSender,
          friend: {
            id: otherUserId,
            email: userData?.user?.email || "",
            display_name: userData?.user?.user_metadata?.display_name || 
                          userData?.user?.email?.split("@")[0] || "Utente",
            avatar_url: userData?.user?.user_metadata?.avatar_url || null,
          },
        };
      })
    );

    return NextResponse.json({ friendships: enrichedFriendships });
  } catch (error: any) {
    console.error("Errore GET friends:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Invia richiesta di amicizia
export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { friend_email } = body;

    if (!friend_email) {
      return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
    }

    // Trova l'utente per email
    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) throw searchError;

    const friendUser = users.find((u: any) => u.email?.toLowerCase() === friend_email.toLowerCase());

    if (!friendUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (friendUser.id === user.id) {
      return NextResponse.json({ error: "Non puoi aggiungerti come amico" }, { status: 400 });
    }

    // Verifica se esiste già una richiesta
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Siete già amici" }, { status: 400 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Richiesta già inviata" }, { status: 400 });
      }
    }

    // Crea richiesta
    const { data: friendship, error } = await supabase
      .from("friendships")
      .insert({
        user_id: user.id,
        friend_id: friendUser.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      friendship,
      message: `Richiesta inviata a ${friend_email}` 
    });
  } catch (error: any) {
    console.error("Errore POST friend request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Accetta o rifiuta richiesta
export async function PUT(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { friendship_id, action } = body; // action: 'accept' or 'reject'

    if (!friendship_id || !action) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
    }

    // Verifica che sia il destinatario
    const { data: friendship } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", friendship_id)
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .single();

    if (!friendship) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    const { error } = await supabase
      .from("friendships")
      .update({ status: newStatus })
      .eq("id", friendship_id);

    if (error) throw error;

    return NextResponse.json({ 
      message: action === "accept" ? "Richiesta accettata" : "Richiesta rifiutata",
      status: newStatus 
    });
  } catch (error: any) {
    console.error("Errore PUT friend request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Rimuovi amicizia
export async function DELETE(req: NextRequest) {
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

  try {
    const { searchParams } = new URL(req.url);
    const friendshipId = searchParams.get("id");

    if (!friendshipId) {
      return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
    }

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) throw error;

    return NextResponse.json({ message: "Amicizia rimossa" });
  } catch (error: any) {
    console.error("Errore DELETE friendship:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
