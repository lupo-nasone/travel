import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/data/achievements";
import { RARITY_XP, getLevel } from "@/data/levels";

// GET — classifica globale
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get all user_stats
  const { data: allStats, error: statsError } = await supabase
    .from("user_stats")
    .select("user_id, display_name, total_spins, total_saves");

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  // Get all achievements for all users
  const { data: allAchievements, error: achError } = await supabase
    .from("user_achievements")
    .select("user_id, achievement_id");

  if (achError) {
    return NextResponse.json({ error: achError.message }, { status: 500 });
  }

  // Group achievements by user
  const userAchievements = new Map<string, string[]>();
  for (const row of allAchievements || []) {
    const list = userAchievements.get(row.user_id) || [];
    list.push(row.achievement_id);
    userAchievements.set(row.user_id, list);
  }

  // Build leaderboard
  const leaderboard = (allStats || []).map((stats) => {
    const achievementIds = userAchievements.get(stats.user_id) || [];
    
    // Calculate XP
    let xp = 0;
    for (const achId of achievementIds) {
      const ach = ACHIEVEMENTS.find((a) => a.id === achId);
      if (ach) xp += RARITY_XP[ach.rarity];
    }

    const level = getLevel(xp);
    const displayName = stats.display_name || `Esploratore #${stats.user_id.substring(0, 4)}`;

    return {
      user_id: stats.user_id,
      display_name: displayName,
      achievement_count: achievementIds.length,
      total_spins: stats.total_spins,
      total_saves: stats.total_saves,
      xp,
      level: level.level,
      level_name: level.name,
      level_icon: level.icon,
      is_me: stats.user_id === user.id,
    };
  });

  // Sort by XP desc, then achievement count desc
  leaderboard.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.achievement_count - a.achievement_count;
  });

  // Add rank
  const ranked = leaderboard.map((entry, i) => ({
    ...entry,
    rank: i + 1,
  }));

  return NextResponse.json({ leaderboard: ranked });
}

// POST — aggiorna il display_name dell'utente
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

  const { error } = await supabase
    .from("user_stats")
    .update({ display_name: displayName })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, display_name: displayName });
}
