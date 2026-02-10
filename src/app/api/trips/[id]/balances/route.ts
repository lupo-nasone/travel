import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Calcola bilanci (chi deve cosa a chi)
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

    // Prendi tutti i partecipanti
    const { data: participants } = await supabase
      .from("trip_participants")
      .select("user_id")
      .eq("trip_id", tripId)
      .eq("status", "accepted");

    if (!participants) {
      return NextResponse.json({ balances: [], settlements: [] });
    }

    // Prendi tutte le spese con splits
    const { data: expenses } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_splits (*)
      `)
      .eq("trip_id", tripId);

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ balances: [], settlements: [] });
    }

    // Calcola bilancio netto per ogni utente
    const balances: { [userId: string]: number } = {};
    
    // Inizializza tutti i partecipanti a 0
    participants.forEach((p) => {
      balances[p.user_id] = 0;
    });

    // Calcola chi ha pagato cosa e chi deve cosa
    expenses.forEach((expense: any) => {
      // Chi ha pagato ha +amount
      balances[expense.paid_by] = (balances[expense.paid_by] || 0) + expense.amount;

      // Chi deve pagare ha -amount della sua split
      expense.expense_splits.forEach((split: any) => {
        if (!split.paid) {
          balances[split.user_id] = (balances[split.user_id] || 0) - split.amount;
        }
      });
    });

    // Arricchisci con dati utente
    const enrichedBalances = await Promise.all(
      Object.entries(balances).map(async ([userId, balance]) => {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        return {
          user_id: userId,
          user: {
            id: userId,
            email: userData?.user?.email || "",
            display_name: userData?.user?.user_metadata?.display_name || 
                          userData?.user?.email?.split("@")[0] || "Utente",
            avatar_url: userData?.user?.user_metadata?.avatar_url || null,
          },
          balance: Number(balance.toFixed(2)),
        };
      })
    );

    // Calcola settlements ottimali (algoritmo greedy)
    const settlements = calculateSettlements(enrichedBalances);

    return NextResponse.json({ 
      balances: enrichedBalances,
      settlements 
    });
  } catch (error: any) {
    console.error("Errore GET balances:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Algoritmo per minimizzare il numero di transazioni
function calculateSettlements(balances: any[]) {
  const settlements: any[] = [];
  
  // Separa creditori e debitori
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    
    if (amount > 0.01) {
      settlements.push({
        from_user: debtor.user,
        to_user: creditor.user,
        amount: Number(amount.toFixed(2)),
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return settlements;
}
