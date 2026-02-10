-- =============================================
-- SCHEMA DATABASE: AMICIZIE E SPESE CONDIVISE
-- =============================================
-- IMPORTANTE: Eseguire DOPO aver creato la tabella saved_trips
-- (vedi supabase-schema.sql)
-- =============================================

-- Tabella: friendships (richieste di amicizia)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- RLS Policy per friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Tutti possono vedere le proprie richieste (inviate o ricevute)
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Tutti possono inviare richieste di amicizia
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Solo il destinatario può accettare/rifiutare
CREATE POLICY "Users can update received requests"
  ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

-- Gli utenti possono eliminare le proprie richieste
CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =============================================

-- Tabella: trip_participants (partecipanti ai viaggi)
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES saved_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(trip_id, user_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_status ON trip_participants(status);

-- RLS Policy per trip_participants
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere i partecipanti dei viaggi a cui partecipano
CREATE POLICY "Users can view trip participants"
  ON trip_participants FOR SELECT
  USING (
    user_id = auth.uid() 
    OR trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Solo owner/editor possono invitare nuovi partecipanti
CREATE POLICY "Owners and editors can invite participants"
  ON trip_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = trip_participants.trip_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
      AND status = 'accepted'
    )
  );

-- Gli utenti possono accettare/rifiutare inviti
CREATE POLICY "Users can update their participation"
  ON trip_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Solo owner può rimuovere partecipanti
CREATE POLICY "Owners can remove participants"
  ON trip_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = trip_participants.trip_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
    OR user_id = auth.uid() -- Gli utenti possono rimuovere se stessi
  );

-- =============================================

-- Tabella: expenses (spese del viaggio)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES saved_trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'EUR',
  category TEXT CHECK (category IN ('trasporto', 'alloggio', 'cibo', 'attivita', 'shopping', 'altro')),
  paid_by UUID NOT NULL REFERENCES auth.users(id),
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- RLS Policy per expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- I partecipanti del viaggio possono vedere le spese
CREATE POLICY "Trip participants can view expenses"
  ON expenses FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- I partecipanti possono aggiungere spese
CREATE POLICY "Trip participants can add expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    AND created_by = auth.uid()
  );

-- Solo chi ha creato la spesa può modificarla
CREATE POLICY "Users can update their expenses"
  ON expenses FOR UPDATE
  USING (created_by = auth.uid());

-- Solo chi ha creato la spesa o l'owner può eliminarla
CREATE POLICY "Users can delete their expenses"
  ON expenses FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_participants
      WHERE trip_id = expenses.trip_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- =============================================

-- Tabella: expense_splits (come dividere le spese)
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  UNIQUE(expense_id, user_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);

-- RLS Policy per expense_splits
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- I partecipanti possono vedere gli split delle spese del viaggio
CREATE POLICY "Trip participants can view splits"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE trip_id IN (
        SELECT trip_id FROM trip_participants 
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Chi crea la spesa può creare gli split
CREATE POLICY "Expense creators can create splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE id = expense_splits.expense_id
      AND created_by = auth.uid()
    )
  );

-- Chi ha creato la spesa può modificare gli split
CREATE POLICY "Expense creators can update splits"
  ON expense_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE id = expense_splits.expense_id
      AND created_by = auth.uid()
    )
  );

-- Chi ha creato la spesa può eliminare gli split
CREATE POLICY "Expense creators can delete splits"
  ON expense_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE id = expense_splits.expense_id
      AND created_by = auth.uid()
    )
  );

-- =============================================

-- Funzione helper: ottieni profilo utente
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1))::TEXT as display_name,
    COALESCE(au.raw_user_meta_data->>'avatar_url', '')::TEXT as avatar_url
  FROM auth.users au
  WHERE au.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER per aggiornare updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTI E DOCUMENTAZIONE
-- =============================================

COMMENT ON TABLE friendships IS 'Gestione amicizie tra utenti con stati pending/accepted/rejected';
COMMENT ON TABLE trip_participants IS 'Partecipanti ai viaggi con ruoli e stati di accettazione';
COMMENT ON TABLE expenses IS 'Spese sostenute durante i viaggi';
COMMENT ON TABLE expense_splits IS 'Come vengono divise le spese tra i partecipanti';

-- =============================================
-- FINE SCHEMA
-- =============================================
