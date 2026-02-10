import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/data/achievements";

// GET — lista achievement dell'utente + stats
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const [achievementsRes, statsRes] = await Promise.all([
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id),
    supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  return NextResponse.json({
    unlocked: achievementsRes.data || [],
    stats: statsRes.data || null,
  });
}

// POST — aggiorna stats e controlla achievement da sbloccare
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
  const { action, data } = body as {
    action: string;
    data?: Record<string, unknown>;
  };

  // ── 1. Fetch or create stats ──
  let { data: stats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!stats) {
    const { data: newStats } = await supabase
      .from("user_stats")
      .insert({ user_id: user.id })
      .select()
      .single();
    stats = newStats;
  }

  if (!stats) {
    return NextResponse.json({ error: "Errore stats" }, { status: 500 });
  }

  // ── 2. Update stats based on action ──
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const today = new Date().toISOString().split("T")[0];

  switch (action) {
    case "spin": {
      updates.total_spins = stats.total_spins + 1;
      const mode = data?.mode as string;
      const distance = data?.distance as number | undefined;
      const isExtreme = data?.extreme as boolean;
      const allowAbroad = data?.allowAbroad as boolean;

      if (mode === "tourist") updates.tourist_spins = stats.tourist_spins + 1;
      if (mode === "biker") updates.biker_spins = stats.biker_spins + 1;
      if (isExtreme) {
        updates.extreme_spins = stats.extreme_spins + 1;
        updates.used_extreme = true;
      }
      if (mode === "tourist") updates.used_tourist = true;
      if (mode === "biker") updates.used_biker = true;
      if (allowAbroad) updates.used_abroad = true;

      if (distance && distance > stats.max_distance) {
        updates.max_distance = distance;
      }

      // Track distinct days
      const distinctDays = [...(stats.distinct_days || [])];
      if (!distinctDays.includes(today)) {
        distinctDays.push(today);
        updates.distinct_days = distinctDays;
      }

      // Transport
      const transport = data?.transport as string;
      if (transport === "treno") updates.used_train = true;
      if (transport === "aereo") updates.used_plane = true;
      if (transport === "traghetto") updates.used_ferry = true;
      if (transport === "auto") updates.used_auto = true;

      // Budget
      const budget = data?.budget as string;
      if (budget === "economico") updates.used_budget_economico = true;
      if (budget === "medio") updates.used_budget_medio = true;
      if (budget === "comfort") updates.used_budget_comfort = true;
      if (budget === "lusso") updates.used_budget_lusso = true;

      break;
    }
    case "save":
      updates.total_saves = stats.total_saves + 1;
      break;
    case "itinerary": {
      updates.total_itineraries = stats.total_itineraries + 1;
      break;
    }
    case "account_created":
      break;
  }

  // Apply updates
  await supabase
    .from("user_stats")
    .update(updates)
    .eq("user_id", user.id);

  // Merge updates into stats for evaluation
  const mergedStats = { ...stats, ...updates };

  // ── 3. Get already unlocked ──
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", user.id);

  const unlockedIds = new Set((existing || []).map((e) => e.achievement_id));

  // ── 4. Check all achievements ──
  const newlyUnlocked: string[] = [];
  const hour = new Date().getHours();

  const interests = (data?.interests as string[]) || [];
  const tripDays = (data?.tripDays as number) || 1;
  const groupSize = (data?.groupSize as string) || "";

  const checksMap: Record<string, boolean> = {
    first_spin: mergedStats.total_spins >= 1,
    first_itinerary: mergedStats.total_itineraries >= 1,
    first_save: mergedStats.total_saves >= 1,
    account_created: action === "account_created",
    tourist_mode: mergedStats.used_tourist,
    biker_mode: mergedStats.used_biker,
    spin_5: mergedStats.total_spins >= 5,
    abroad_first: mergedStats.used_abroad,
    short_trip: (mergedStats.max_distance > 0 && (data?.distance as number) <= 50) || false,
    weekend_planner: tripDays >= 2 && tripDays <= 3,
    foodie_interest: interests.includes("cibo"),
    nature_lover: interests.includes("natura"),
    culture_vulture: interests.includes("cultura"),
    solo_traveler: groupSize === "solo",
    train_traveler: mergedStats.used_train,

    spin_15: mergedStats.total_spins >= 15,
    save_5: mergedStats.total_saves >= 5,
    long_distance: mergedStats.max_distance > 300,
    extreme_first: mergedStats.used_extreme,
    multi_mode: mergedStats.used_tourist && mergedStats.used_biker,
    budget_traveler: mergedStats.used_budget_economico,
    luxury_traveler: mergedStats.used_budget_lusso,
    week_trip: tripDays >= 7,
    five_interests: interests.length >= 5,
    couple_trip: groupSize === "coppia",
    group_trip: groupSize === "gruppo",
    plane_traveler: mergedStats.used_plane,

    spin_30: mergedStats.total_spins >= 30,
    save_10: mergedStats.total_saves >= 10,
    ultra_distance: mergedStats.max_distance > 1000,
    all_transports:
      mergedStats.used_auto &&
      mergedStats.used_train &&
      mergedStats.used_plane &&
      mergedStats.used_ferry,
    night_explorer: hour >= 0 && hour < 5,
    all_interests: interests.length >= 10,
    extreme_3: mergedStats.extreme_spins >= 3,
    biker_expert: mergedStats.biker_spins >= 10,
    long_itinerary: tripDays >= 10,
    ferry_traveler: mergedStats.used_ferry,

    spin_50: mergedStats.total_spins >= 50,
    save_20: mergedStats.total_saves >= 20,
    extreme_10: mergedStats.extreme_spins >= 10,
    mega_distance: mergedStats.max_distance > 3000,
    biker_20: mergedStats.biker_spins >= 20,
    tourist_20: mergedStats.tourist_spins >= 20,
    all_budgets:
      mergedStats.used_budget_economico &&
      mergedStats.used_budget_medio &&
      mergedStats.used_budget_comfort &&
      mergedStats.used_budget_lusso,
    early_bird: hour >= 5 && hour < 7,

    spin_100: mergedStats.total_spins >= 100,
    save_50: mergedStats.total_saves >= 50,
    completionist: unlockedIds.size + newlyUnlocked.length >= 40,
    extreme_master: mergedStats.extreme_spins >= 25,
    secret_wanderer: (mergedStats.distinct_days || []).length >= 10,
  };

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;
    if (checksMap[achievement.id]) {
      newlyUnlocked.push(achievement.id);
      unlockedIds.add(achievement.id);
    }
  }

  // ── 5. Insert newly unlocked ──
  if (newlyUnlocked.length > 0) {
    await supabase.from("user_achievements").insert(
      newlyUnlocked.map((id) => ({
        user_id: user.id,
        achievement_id: id,
      }))
    );
  }

  // ── 6. Return newly unlocked achievements with full data ──
  const newAchievements = newlyUnlocked
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean);

  return NextResponse.json({
    newlyUnlocked: newAchievements,
    totalUnlocked: unlockedIds.size,
  });
}
