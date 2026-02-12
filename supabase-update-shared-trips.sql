-- =====================================================
-- ESEGUI QUESTO SQL nella Supabase Dashboard:
-- vai su SQL Editor > New Query > incolla e Run
-- =====================================================
-- Aggiorna la policy di SELECT su saved_trips per permettere
-- ai partecipanti di vedere i viaggi condivisi con loro.
-- =====================================================

-- Prima rimuovi la vecchia policy se esiste
DROP POLICY IF EXISTS "Users can view own trips" ON public.saved_trips;

-- Nuova policy: gli utenti possono vedere i propri viaggi
-- E i viaggi in cui sono stati aggiunti come partecipanti
CREATE POLICY "Users can view own and shared trips"
  ON public.saved_trips
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT trip_id FROM trip_participants
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );
