-- Allows the browser (using the public anon key) to write directly to
-- Supabase — there is no separate backend in this deployment.
--
-- Design: anon gets INSERT only. Never SELECT, UPDATE, or DELETE.
--   - INSERT: lets participants submit their own writer profile + samples.
--   - No SELECT: the anon key cannot read back anyone's data — participants
--     and outside observers cannot browse or enumerate the dataset.
--   - No UPDATE/DELETE: submitted data cannot be modified or destroyed via
--     the anon key. (Postgres RLS requires a SELECT/ALL policy purely to
--     make existing rows *visible* to an UPDATE's row scan — a FOR UPDATE
--     policy's USING clause alone never grants that visibility. Since
--     granting SELECT would defeat the "no read" requirement, retries are
--     instead handled application-side: re-submitting after a partial
--     failure treats a unique-constraint conflict on already-written rows
--     as success, and PNGs are re-uploaded under a fresh path each attempt
--     rather than overwritten. See frontend/src/lib/supabaseUpload.ts.)
--
-- The service_role key (Supabase Studio / SQL editor / any future admin
-- tooling) still bypasses RLS entirely for full read/write/delete access.

create policy "anon insert writers" on writers
  for insert to anon
  with check (true);

create policy "anon insert samples" on samples
  for insert to anon
  with check (true);

-- Storage: same insert-only shape, scoped to the handwriting bucket.
create policy "anon insert handwriting objects" on storage.objects
  for insert to anon
  with check (bucket_id = 'handwriting');
