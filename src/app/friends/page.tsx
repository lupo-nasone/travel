"use client";

import { useState, useEffect, useCallback } from "react";
import { User, UserPlus, Check, X, Loader2, Search, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface Friend {
  id: string;
  status: string;
  is_sender: boolean;
  friend: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function FriendsPage() {
  const { user, session, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"friends" | "pending" | "search">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingSent, setPendingSent] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadFriends = useCallback(async () => {
    if (!session) return;
    
    try {
      setLoading(true);

      // Carica amici accettati
      const resFriends = await fetch("/api/friends?status=accepted", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const dataFriends = await resFriends.json();
      setFriends(dataFriends.friendships || []);

      // Carica richieste pendenti
      const resPending = await fetch("/api/friends?status=pending", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const dataPending = await resPending.json();
      const pending = dataPending.friendships || [];
      
      setPendingSent(pending.filter((f: Friend) => f.is_sender));
      setPendingReceived(pending.filter((f: Friend) => !f.is_sender));
    } catch (error) {
      console.error("Errore caricamento amici:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading && user && session) {
      loadFriends();
    }
  }, [authLoading, user, session, loadFriends]);

  const sendFriendRequest = async () => {
    if (!searchEmail.trim() || !session) return;

    try {
      setSendingRequest(true);
      setMessage(null);

      const res = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ friend_email: searchEmail.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Richiesta inviata!" });
        setSearchEmail("");
        await loadFriends();
      } else {
        setMessage({ type: "error", text: data.error || "Errore" });
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      setMessage({ type: "error", text: "Errore di rete" });
    } finally {
      setSendingRequest(false);
    }
  };

  const respondToRequest = async (friendshipId: string, action: "accept" | "reject") => {
    if (!session) return;
    
    try {
      const res = await fetch("/api/friends", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ friendship_id: friendshipId, action })
      });

      if (res.ok) {
        await loadFriends();
        setMessage({ 
          type: "success", 
          text: action === "accept" ? "Richiesta accettata!" : "Richiesta rifiutata" 
        });
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Errore" });
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Rimuovere questo amico?") || !session) return;

    try {
      const res = await fetch(`/api/friends?friendship_id=${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        await loadFriends();
        setMessage({ type: "success", text: "Amico rimosso" });
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Errore" });
    }
  };

  // Mostra loader durante l'autenticazione
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Mostra messaggio se non autenticato
  if (!user || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Devi effettuare il login per vedere questa pagina</p>
          <Link href="/" className="text-blue-600 hover:underline">Torna alla home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            👥 I Miei Amici
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci le tue amicizie e invita persone ai tuoi viaggi
          </p>
        </div>

        {/* Messaggi */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === "success" 
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" 
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("friends")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "friends"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Users className="inline-block w-4 h-4 mr-2" />
            Amici ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <UserPlus className="inline-block w-4 h-4 mr-2" />
            Richieste ({pendingReceived.length})
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "search"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Search className="inline-block w-4 h-4 mr-2" />
            Aggiungi
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Tab Amici */}
              {activeTab === "friends" && (
                <div className="space-y-4">
                  {friends.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Nessun amico ancora. Usa la tab &quot;Aggiungi&quot; per inviare richieste!
                    </p>
                  ) : (
                    friends.map((friendship) => {
                      if (!friendship.friend) {
                        console.error("Missing friend data:", friendship);
                        return null;
                      }
                      return (
                      <div
                        key={friendship.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {friendship.friend.avatar_url ? (
                            <img
                              src={friendship.friend.avatar_url}
                              alt={friendship.friend.display_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {friendship.friend.display_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {friendship.friend.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFriend(friendship.id)}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        >
                          Rimuovi
                        </button>
                      </div>
                    )})
                  )}
                </div>
              )}

              {/* Tab Richieste */}
              {activeTab === "pending" && (
                <div className="space-y-6">
                  {/* Richieste ricevute */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Richieste Ricevute
                    </h3>
                    {pendingReceived.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Nessuna richiesta ricevuta
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendingReceived.map((friendship) => {
                          if (!friendship.friend) {
                            console.error("Missing friend data:", friendship);
                            return null;
                          }
                          return (
                          <div
                            key={friendship.id}
                            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {friendship.friend.avatar_url ? (
                                <img
                                  src={friendship.friend.avatar_url}
                                  alt={friendship.friend.display_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {friendship.friend.display_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {friendship.friend.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => respondToRequest(friendship.id, "accept")}
                                className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
                                title="Accetta"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => respondToRequest(friendship.id, "reject")}
                                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                                title="Rifiuta"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>

                  {/* Richieste inviate */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Richieste Inviate
                    </h3>
                    {pendingSent.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Nessuna richiesta inviata
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendingSent.map((friendship) => {
                          if (!friendship.friend) {
                            console.error("Missing friend data:", friendship);
                            return null;
                          }
                          return (
                          <div
                            key={friendship.id}
                            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                          >
                            <div className="flex items-center gap-3">
                              {friendship.friend.avatar_url ? (
                                <img
                                  src={friendship.friend.avatar_url}
                                  alt={friendship.friend.display_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {friendship.friend.display_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  In attesa di risposta...
                                </p>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Aggiungi */}
              {activeTab === "search" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Aggiungi Amico
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
                      placeholder="Inserisci email dell'utente..."
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendFriendRequest}
                      disabled={sendingRequest || !searchEmail.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {sendingRequest ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      Invia Richiesta
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    L&apos;utente riceverà una richiesta di amicizia e potrà accettarla o rifiutarla.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
