import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Lista spese del viaggio
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
    // Verifica che l'utente sia partecipante
    const { data: participation } = await supabase
      .from("trip_participants")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (!participation) {
      return NextResponse.json({ error: "Non sei partecipante" }, { status: 403 });
    }

    // Prendi spese con splits
    const { data: expenses, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_splits (
          *
        )
      `)
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false });

    if (error) throw error;

    // Arricchisci con dati utente
    const enrichedExpenses = await Promise.all(
      expenses.map(async (expense) => {
        const { data: paidByUser } = await supabase.auth.admin.getUserById(expense.paid_by);
        
        const enrichedSplits = await Promise.all(
          expense.expense_splits.map(async (split: any) => {
            const { data: splitUser } = await supabase.auth.admin.getUserById(split.user_id);
            return {
              ...split,
              user: {
                id: split.user_id,
                email: splitUser?.user?.email || "",
                display_name: splitUser?.user?.user_metadata?.display_name || 
                              splitUser?.user?.email?.split("@")[0] || "Utente",
              }
            };
          })
        );

        return {
          ...expense,
          paid_by_user: {
            id: expense.paid_by,
            email: paidByUser?.user?.email || "",
            display_name: paidByUser?.user?.user_metadata?.display_name || 
                          paidByUser?.user?.email?.split("@")[0] || "Utente",
          },
          expense_splits: enrichedSplits,
        };
      })
    );

    return NextResponse.json({ expenses: enrichedExpenses });
  } catch (error: any) {
    console.error("Errore GET expenses:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crea nuova spesa
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
    const { 
      description, 
      amount, 
      currency = "EUR",
      category = "altro",
      expense_date = new Date().toISOString(),
      paid_by = user.id,
      splits
    } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: "description e amount richiesti" }, { status: 400 });
    }

    const { data: participation } = await supabase
      .from("trip_participants")
      .select("*")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (!participation) {
      return NextResponse.json({ error: "Non sei partecipante" }, { status: 403 });
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        description,
        amount: parseFloat(amount),
        currency,
        category,
        expense_date,
        paid_by,
        created_by: user.id,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    let splitData;
    if (splits && Array.isArray(splits)) {
      splitData = splits;
    } else {
      const { data: participants } = await supabase
        .from("trip_participants")
        .select("user_id")
        .eq("trip_id", tripId)
        .eq("status", "accepted");

      const splitAmount = parseFloat(amount) / (participants?.length || 1);
      splitData = participants?.map((p: any) => ({
        user_id: p.user_id,
        amount: splitAmount,
      })) || [];
    }

    const splitsToInsert = splitData.map((split: any) => ({
      expense_id: expense.id,
      user_id: split.user_id,
      amount: parseFloat(split.amount),
      paid: split.user_id === paid_by,
    }));

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsToInsert);

    if (splitsError) throw splitsError;

    return NextResponse.json({ expense, message: "Spesa creata" });
  } catch (error: any) {
    console.error("Errore POST expense:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Modifica spesa
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
    const { expense_id, description, amount, category, expense_date } = body;

    if (!expense_id) {
      return NextResponse.json({ error: "expense_id richiesto" }, { status: 400 });
    }

    const { data: expense } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expense_id)
      .eq("trip_id", tripId)
      .single();

    if (!expense) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    const { data: participation } = await supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (expense.paid_by !== user.id && participation?.role !== "owner") {
      return NextResponse.json({ error: "Non hai i permessi" }, { status: 403 });
    }

    const updates: any = {};
    if (description) updates.description = description;
    if (amount) updates.amount = parseFloat(amount);
    if (category) updates.category = category;
    if (expense_date) updates.expense_date = expense_date;

    const { error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", expense_id);

    if (error) throw error;

    return NextResponse.json({ message: "Spesa aggiornata" });
  } catch (error: any) {
    console.error("Errore PUT expense:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Elimina spesa
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
  const expenseId = searchParams.get("expense_id");

  if (!expenseId) {
    return NextResponse.json({ error: "expense_id richiesto" }, { status: 400 });
  }

  try {
    const { data: expense } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("trip_id", tripId)
      .single();

    if (!expense) {
      return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
    }

    const { data: participation } = await supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single();

    if (expense.paid_by !== user.id && participation?.role !== "owner") {
      return NextResponse.json({ error: "Non hai i permessi" }, { status: 403 });
    }

    await supabase.from("expense_splits").delete().eq("expense_id", expenseId);
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

    if (error) throw error;

    return NextResponse.json({ message: "Spesa eliminata" });
  } catch (error: any) {
    console.error("Errore DELETE expense:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
