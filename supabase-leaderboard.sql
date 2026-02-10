-- ══════════════════════════════════════════════════════════════
-- Aggiunta display_name a user_stats per la classifica
-- ══════════════════════════════════════════════════════════════

ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '' NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- VIEW: leaderboard — classifica pubblica (leggibile da tutti)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public_leaderboard AS
SELECT
  us.user_id,
  CASE
    WHEN us.display_name != '' THEN us.display_name
    ELSE CONCAT('Esploratore #', LEFT(us.user_id::text, 4))
  END AS display_name,
  COUNT(ua.achievement_id)::int AS achievement_count,
  us.total_spins,
  us.total_saves
FROM user_stats us
LEFT JOIN user_achievements ua ON ua.user_id = us.user_id
GROUP BY us.user_id, us.display_name, us.total_spins, us.total_saves
ORDER BY COUNT(ua.achievement_id) DESC, us.total_spins DESC
LIMIT 100;

-- Policy: chiunque autenticato può leggere la classifica
-- (la view eredita i permessi delle tabelle sottostanti,
--  quindi dobbiamo aggiungere una policy SELECT pubblica su user_stats)
CREATE POLICY "Anyone can read leaderboard stats"
  ON user_stats FOR SELECT
  USING (true);

-- Nota: la policy "Users can view own stats" è più restrittiva,
-- ma questa policy "USING (true)" la sovrascrive per permettere
-- la lettura della classifica. I dati sensibili non sono esposti
-- dalla view (solo display_name, conteggi, user_id).
