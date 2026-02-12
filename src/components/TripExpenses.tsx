"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";

interface Participant {
  id: string;
  user_id: string;
  role: string;
  status: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface ExpenseSplit {
  id: string;
  user_id: string;
  amount: number;
  paid: boolean;
  user: {
    id: string;
    email: string;
    display_name: string;
  };
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expense_date: string;
  paid_by: string;
  paid_by_user: {
    id: string;
    email: string;
    display_name: string;
  };
  expense_splits: ExpenseSplit[];
}

interface Settlement {
  from_user: { id: string; display_name: string };
  to_user: { id: string; display_name: string };
  amount: number;
}

interface Balance {
  user_id: string;
  user: { id: string; display_name: string; avatar_url: string | null };
  balance: number;
}

const CATEGORIES = [
  { value: "trasporto", label: "🚗 Trasporto", color: "bg-blue-500/15 text-blue-300/80" },
  { value: "alloggio", label: "🏨 Alloggio", color: "bg-purple-500/15 text-purple-300/80" },
  { value: "cibo", label: "🍽️ Cibo", color: "bg-amber-500/15 text-amber-300/80" },
  { value: "attivita", label: "🎯 Attività", color: "bg-emerald-500/15 text-emerald-300/80" },
  { value: "shopping", label: "🛍️ Shopping", color: "bg-pink-500/15 text-pink-300/80" },
  { value: "altro", label: "📦 Altro", color: "bg-white/[0.08] text-white/60" },
];

interface TripExpensesProps {
  tripId: string;
  onClose: () => void;
}

export default function TripExpenses({ tripId, onClose }: TripExpensesProps) {
  const { session, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"expenses" | "balances">("expenses");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add expense form
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("altro");
  const [newPaidBy, setNewPaidBy] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const headers = useCallback(() => {
    if (!session) return {};
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session]);

  const loadParticipants = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/participants`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.participants || []);
        if (!newPaidBy && user) setNewPaidBy(user.id);
      }
    } catch (err) {
      console.error("Error loading participants:", err);
    }
  }, [session, tripId, newPaidBy, user]);

  const loadExpenses = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses || []);
    } catch (err) {
      console.error("Error loading expenses:", err);
    }
  }, [session, tripId]);

  const loadBalances = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/balances`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBalances(data.balances || []);
        setSettlements(data.settlements || []);
      }
    } catch (err) {
      console.error("Error loading balances:", err);
    }
  }, [session, tripId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadParticipants(), loadExpenses(), loadBalances()]);
      setLoading(false);
    };
    load();
  }, [loadParticipants, loadExpenses, loadBalances]);

  const addExpense = async () => {
    if (!newDescription.trim() || !newAmount || !session) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: headers() as Record<string, string>,
        body: JSON.stringify({
          description: newDescription.trim(),
          amount: newAmount,
          category: newCategory,
          paid_by: newPaidBy || user?.id,
          expense_date: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setNewDescription("");
        setNewAmount("");
        setNewCategory("altro");
        setShowAddForm(false);
        await Promise.all([loadExpenses(), loadBalances()]);
      }
    } catch (err) {
      console.error("Error adding expense:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Eliminare questa spesa?") || !session) return;
    try {
      const res = await fetch(
        `/api/trips/${tripId}/expenses?expense_id=${expenseId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        await Promise.all([loadExpenses(), loadBalances()]);
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-3xl glass-dropdown p-8 text-center">
          <div className="animate-spin text-3xl mb-3">💰</div>
          <p className="text-white/60 text-sm">Caricamento spese...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] rounded-3xl glass-dropdown overflow-hidden flex flex-col animate-card-appear">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                💰 Spese condivise
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                {participants.length} partecipant{participants.length === 1 ? "e" : "i"} · Totale:{" "}
                <span className="text-emerald-300/80 font-semibold">€{totalExpenses.toFixed(2)}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white/70 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 rounded-xl bg-white/[0.04]">
            <button
              onClick={() => setActiveTab("expenses")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "expenses"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              📝 Spese
            </button>
            <button
              onClick={() => setActiveTab("balances")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "balances"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              ⚖️ Bilanci
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "expenses" ? (
            <div className="space-y-3">
              {/* Add expense button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full rounded-xl border border-dashed border-white/[0.12] py-3 text-sm text-white/40 hover:border-emerald-500/30 hover:text-emerald-300/70 hover:bg-emerald-500/[0.04] transition-all"
                >
                  + Aggiungi spesa
                </button>
              )}

              {/* Add form */}
              {showAddForm && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-3 animate-fade-in-fast">
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descrizione (es. Cena al ristorante)"
                    className="w-full rounded-lg input-glass px-3 py-2.5 text-sm text-white placeholder-white/25"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg input-glass pl-7 pr-3 py-2.5 text-sm text-white placeholder-white/25"
                      />
                    </div>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="rounded-lg input-glass px-3 py-2.5 text-sm text-white bg-transparent"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-gray-900">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Paid by selector */}
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                      Pagato da
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map((p) => (
                        <button
                          key={p.user_id}
                          onClick={() => setNewPaidBy(p.user_id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            newPaidBy === p.user_id
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                              : "bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08]"
                          }`}
                        >
                          {p.user.display_name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={addExpense}
                      disabled={isAdding || !newDescription.trim() || !newAmount}
                      className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-40"
                    >
                      {isAdding ? "Salvo..." : "✓ Aggiungi"}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="rounded-lg glass-subtle px-4 py-2.5 text-xs text-white/40 hover:bg-white/[0.06] transition-all"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {/* Expense list */}
              {expenses.length === 0 && !showAddForm && (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-2">🧾</span>
                  <p className="text-sm text-white/40">Nessuna spesa ancora</p>
                  <p className="text-xs text-white/25 mt-1">
                    Aggiungi la prima spesa del viaggio
                  </p>
                </div>
              )}

              {expenses.map((expense) => {
                const catInfo = getCategoryInfo(expense.category);
                return (
                  <div
                    key={expense.id}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1.5 truncate">
                          {expense.description}
                        </p>
                        <p className="text-[11px] text-white/35 mt-0.5">
                          Pagato da{" "}
                          <span className="text-white/60 font-medium">
                            {expense.paid_by_user.display_name}
                          </span>
                          {" · "}
                          {new Date(expense.expense_date).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                          €{expense.amount.toFixed(2)}
                        </span>
                        {(expense.paid_by === user?.id) && (
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400/40 hover:text-red-300 hover:bg-red-500/[0.06] transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Splits */}
                    {expense.expense_splits.length > 1 && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] flex flex-wrap gap-1.5">
                        {expense.expense_splits.map((split) => (
                          <span
                            key={split.id}
                            className="text-[10px] bg-white/[0.04] text-white/40 rounded-full px-2 py-0.5"
                          >
                            {split.user.display_name}: €{split.amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* BALANCES TAB */
            <div className="space-y-4">
              {/* Individual balances */}
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2">
                  Bilancio personale
                </p>
                <div className="space-y-2">
                  {balances.map((b) => (
                    <div
                      key={b.user_id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                          {b.user.display_name[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {b.user.display_name}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          b.balance > 0.01
                            ? "text-emerald-400"
                            : b.balance < -0.01
                            ? "text-red-400"
                            : "text-white/40"
                        }`}
                      >
                        {b.balance > 0 ? "+" : ""}€{b.balance.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlements */}
              {settlements.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2">
                    Chi deve cosa a chi
                  </p>
                  <div className="space-y-2">
                    {settlements.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 px-4 py-3"
                      >
                        <div className="flex-1 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-white">
                            {s.from_user.display_name}
                          </span>
                          <svg className="w-4 h-4 text-amber-400/60 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                          <span className="font-semibold text-white">
                            {s.to_user.display_name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-300">
                          €{s.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {balances.length === 0 && settlements.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-2">⚖️</span>
                  <p className="text-sm text-white/40">Nessun bilancio da mostrare</p>
                  <p className="text-xs text-white/25 mt-1">
                    Aggiungi delle spese per vedere i bilanci
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
