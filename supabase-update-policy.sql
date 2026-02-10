-- =====================================================
-- ESEGUI QUESTO SQL nella Supabase Dashboard:
-- vai su SQL Editor > New Query > incolla e Run
-- =====================================================

-- Policy per permettere agli utenti di AGGIORNARE i propri viaggi
-- (necessaria per la funzione "Aggiorna viaggio salvato")
create policy "Users can update own trips"
  on public.saved_trips
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
