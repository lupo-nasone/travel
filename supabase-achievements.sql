-- ══════════════════════════════════════════════════════════════
-- TABELLA: user_achievements — achievement sbloccati dall'utente
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indici
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ══════════════════════════════════════════════════════════════
-- TABELLA: user_stats — contatori per triggerare gli achievement
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_spins INT DEFAULT 0 NOT NULL,
  tourist_spins INT DEFAULT 0 NOT NULL,
  biker_spins INT DEFAULT 0 NOT NULL,
  extreme_spins INT DEFAULT 0 NOT NULL,
  total_saves INT DEFAULT 0 NOT NULL,
  total_itineraries INT DEFAULT 0 NOT NULL,
  max_distance FLOAT DEFAULT 0 NOT NULL,
  used_abroad BOOLEAN DEFAULT FALSE NOT NULL,
  used_tourist BOOLEAN DEFAULT FALSE NOT NULL,
  used_biker BOOLEAN DEFAULT FALSE NOT NULL,
  used_extreme BOOLEAN DEFAULT FALSE NOT NULL,
  used_train BOOLEAN DEFAULT FALSE NOT NULL,
  used_plane BOOLEAN DEFAULT FALSE NOT NULL,
  used_ferry BOOLEAN DEFAULT FALSE NOT NULL,
  used_auto BOOLEAN DEFAULT FALSE NOT NULL,
  used_budget_economico BOOLEAN DEFAULT FALSE NOT NULL,
  used_budget_medio BOOLEAN DEFAULT FALSE NOT NULL,
  used_budget_comfort BOOLEAN DEFAULT FALSE NOT NULL,
  used_budget_lusso BOOLEAN DEFAULT FALSE NOT NULL,
  distinct_days TEXT[] DEFAULT '{}' NOT NULL,  -- array of ISO date strings
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Indice
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_stats(user_id);
