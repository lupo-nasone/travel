import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — lista viaggi dell'utente
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_trips")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ trips: data });
}

// POST — salva un nuovo viaggio
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

  const {
    destination_name,
    destination_region,
    destination_image,
    destination_lat,
    destination_lng,
    mode,
    distance,
    trip_days,
    destination_data,
    itinerary_data,
    result_data,
  } = body;

  if (!destination_name || !itinerary_data) {
    return NextResponse.json(
      { error: "Dati mancanti" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("saved_trips")
    .insert({
      user_id: user.id,
      destination_name,
      destination_region: destination_region || "",
      destination_image: destination_image || "",
      destination_lat: destination_lat || 0,
      destination_lng: destination_lng || 0,
      mode: mode || "tourist",
      distance: distance || 0,
      trip_days: trip_days || 1,
      destination_data: destination_data || {},
      itinerary_data,
      result_data: result_data || {},
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ trip: data || { id: null } }, { status: 201 });
}

// PUT — aggiorna l'itinerario di un viaggio salvato
export async function PUT(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json();
  const { id, itinerary_data } = body;

  if (!id || !itinerary_data) {
    return NextResponse.json(
      { error: "ID viaggio e dati itinerario richiesti" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("saved_trips")
    .update({ itinerary_data })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Viaggio non trovato" }, { status: 404 });
  }

  return NextResponse.json({ trip: data });
}

// DELETE — elimina un viaggio
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("id");

  if (!tripId) {
    return NextResponse.json(
      { error: "ID viaggio mancante" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("saved_trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
